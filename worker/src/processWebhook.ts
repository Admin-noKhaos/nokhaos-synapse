// Handle a single webhook_events row. Supports both Instagram webhook formats:
//
//   1. Instagram Login flow (current — what Meta sends now):
//      { object: "instagram", entry: [{ id, time, changes: [{ field: "messages",
//        value: { sender, recipient, message: { mid, text }, timestamp } }] }] }
//
//   2. Legacy Messenger format (older Facebook Login flow):
//      { object: "instagram", entry: [{ id, messaging: [{ sender, recipient, message }] }] }
//
// We normalise both to a single shape and process them identically.

import { db } from './db.js';
import { ENV } from './env.js';
import { workerCall } from './anthropic.js';

type Sender = { id?: string };
type IgMessage = { mid?: string; text?: string; is_echo?: boolean; attachments?: unknown[] };
type Normalized = {
  pageOrAccountId: string;
  sender: Sender;
  recipient: Sender;
  message: IgMessage;
  timestamp: number;
};

type ChangeValue = {
  sender?: Sender; recipient?: Sender; message?: IgMessage; timestamp?: string | number;
};
type Change = { field?: string; value?: ChangeValue };
type Messaging = { sender?: Sender; recipient?: Sender; message?: IgMessage; timestamp?: number };
type Entry = { id?: string; time?: number; changes?: Change[]; messaging?: Messaging[] };
type Payload = { object?: string; entry?: Entry[] };

function normalizeEvents(payload: Payload): Normalized[] {
  const out: Normalized[] = [];
  const entries = payload?.entry ?? [];
  for (const entry of entries) {
    const accountId = entry.id ?? '';
    // Format 1: changes[]
    if (Array.isArray(entry.changes)) {
      for (const ch of entry.changes) {
        if (ch.field !== 'messages') continue;
        const v = ch.value ?? {};
        if (!v.message?.text || !v.sender?.id) continue;
        out.push({
          pageOrAccountId: accountId,
          sender: v.sender,
          recipient: v.recipient ?? {},
          message: v.message,
          timestamp: Number(v.timestamp ?? Date.now()),
        });
      }
    }
    // Format 2: messaging[]
    if (Array.isArray(entry.messaging)) {
      for (const ev of entry.messaging) {
        if (!ev.message?.text || ev.message.is_echo || !ev.sender?.id) continue;
        out.push({
          pageOrAccountId: accountId,
          sender: ev.sender,
          recipient: ev.recipient ?? {},
          message: ev.message,
          timestamp: Number(ev.timestamp ?? Date.now()),
        });
      }
    }
  }
  return out;
}

export async function processWebhookEvent(row: { id: string; payload: Payload }): Promise<void> {
  const events = normalizeEvents(row.payload);
  if (events.length === 0) {
    await markProcessed(row.id, null);
    return;
  }

  for (const ev of events) {
    try {
      await handleIgMessage(ev);
    } catch (e) {
      console.error('handleIgMessage failed', e);
      await markProcessed(row.id, e instanceof Error ? e.message : String(e));
      return;
    }
  }
  await markProcessed(row.id, null);
}

async function markProcessed(id: string, error: string | null) {
  await db.from('webhook_events').update({ processed_at: new Date().toISOString(), error }).eq('id', id);
}

async function handleIgMessage(ev: Normalized) {
  const senderIgId = ev.sender.id!;
  const recipientId = ev.recipient.id ?? '';
  const accountId = ev.pageOrAccountId;

  // Match the meta_account by either entry.id (which is the IG user id in IG Login flow,
  // or page id in legacy flow), or by recipient.id which is always the IG business id.
  const { data: account, error: accountErr } = await db
    .from('meta_accounts')
    .select('id, org_id, ig_user_id, page_id, access_token, username')
    .or(`ig_user_id.eq.${accountId},page_id.eq.${accountId},ig_user_id.eq.${recipientId}`)
    .limit(1)
    .single();

  if (accountErr || !account) {
    console.warn('no meta_account matched for accountId', accountId, 'recipientId', recipientId);
    return;
  }

  // Skip echoes of our own outbound messages: when *we* send a DM via the API,
  // the recipient is the customer, sender is the IG business id (account.ig_user_id).
  if (senderIgId === account.ig_user_id) return;

  // Upsert the lead
  const { data: lead } = await db
    .from('leads')
    .upsert(
      {
        org_id: account.org_id,
        meta_account_id: account.id,
        ig_user_id: senderIgId,
        last_active_at: new Date().toISOString(),
      },
      { onConflict: 'org_id,ig_user_id' },
    )
    .select('id, score, sentiment, ig_user_id')
    .single();

  // Upsert the conversation by (meta_account_id, thread_id)
  const threadId = `${account.id}:${senderIgId}`;
  const { data: conv } = await db
    .from('conversations')
    .upsert(
      {
        org_id: account.org_id,
        meta_account_id: account.id,
        lead_id: lead?.id,
        ig_thread_id: threadId,
        channel: 'dm',
        status: 'open',
        last_message_at: new Date(ev.timestamp).toISOString(),
      },
      { onConflict: 'meta_account_id,ig_thread_id' },
    )
    .select('id, unread_count')
    .single();

  if (!conv) return;

  // Persist the inbound message
  const { error: msgErr } = await db.from('messages').insert({
    org_id: account.org_id,
    conversation_id: conv.id,
    ig_message_id: ev.message.mid ?? null,
    sender: 'them',
    text: ev.message.text,
    sent_at: new Date(ev.timestamp).toISOString(),
  });
  if (msgErr) {
    // Likely duplicate mid (we got the same event twice); ignore.
    if (!String(msgErr.message).includes('duplicate')) {
      console.error('insert message failed', msgErr);
    }
    return;
  }

  // Bump unread count
  await db.from('conversations').update({ unread_count: (conv.unread_count ?? 0) + 1 }).eq('id', conv.id);

  // ─── AI handling: classify, then run any live automation ───
  if (!ENV.ANTHROPIC_API_KEY) return;

  // Pull the recent conversation transcript for context
  const { data: msgs } = await db
    .from('messages')
    .select('sender, text')
    .eq('conversation_id', conv.id)
    .order('sent_at', { ascending: true })
    .limit(20);
  const transcript = (msgs ?? [])
    .map((m) => `${m.sender === 'them' ? 'CUSTOMER' : 'BRAND'}: ${m.text ?? ''}`)
    .join('\n');

  // Always: classify intent + score lead so the inbox is informative
  try {
    const classify = await workerCall({
      orgId: account.org_id,
      purpose: 'classify',
      relatedId: conv.id,
      cacheSystem: true,
      system:
        `You are Synapse, a sales-AI for an Instagram business (@${account.username ?? 'brand'}). ` +
        `Return STRICT JSON only with shape: {"intent":"purchase"|"objection"|"question"|"support"|"spam"|"other","sentiment":"hot"|"warm"|"cold","lead_score":0-100,"reasoning":"1 sentence"}. ` +
        `No markdown. No prose outside JSON.`,
      userMessage: `Conversation transcript:\n\n${transcript}`,
      maxTokens: 200,
      temperature: 0.2,
    });
    const cleaned = classify.text.trim().replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '');
    let parsed: { intent?: string; sentiment?: string; lead_score?: number; reasoning?: string } | null = null;
    try { parsed = JSON.parse(cleaned); } catch { /* ignore */ }
    if (parsed) {
      await db.from('leads').update({
        score: parsed.lead_score ?? 0,
        sentiment: (parsed.sentiment as 'hot' | 'warm' | 'cold') ?? null,
        ai_notes: parsed.reasoning ?? null,
        tags: parsed.intent ? [`intent:${parsed.intent}`] : [],
      }).eq('id', lead?.id ?? '');
    }
  } catch (e) {
    console.error('classify failed', e);
  }

  // Run the first live automation, if any
  try {
    const { runAutomationForMessage } = await import('./runAutomation.js');
    await runAutomationForMessage({
      orgId: account.org_id,
      conversationId: conv.id,
      accountId: account.id,
      accountIgUserId: account.ig_user_id ?? '',
      accountToken: account.access_token,
      accountUsername: account.username ?? null,
      leadIgUserId: senderIgId,
      messageText: ev.message.text ?? '',
      transcript,
    });
  } catch (e) {
    console.error('runAutomationForMessage failed', e);
  }
}
