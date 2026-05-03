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
  /** Diagnostic: what shape this came from. */
  shape: 'changes' | 'messaging';
};

type ChangeValue = {
  sender?: Sender; recipient?: Sender; message?: IgMessage; timestamp?: string | number;
};
type Change = { field?: string; value?: ChangeValue };
type Messaging = {
  sender?: Sender; recipient?: Sender; message?: IgMessage; timestamp?: number;
  message_edit?: { mid?: string; num_edit?: number };
  reaction?: unknown;
  read?: unknown;
};
type Entry = { id?: string; time?: number; changes?: Change[]; messaging?: Messaging[] };
type Payload = { object?: string; entry?: Entry[] };

function log(...args: unknown[]) {
  console.log('[webhook]', ...args);
}

function normalizeEvents(payload: Payload): { events: Normalized[]; skipped: string[] } {
  const events: Normalized[] = [];
  const skipped: string[] = [];
  const entries = payload?.entry ?? [];
  for (const entry of entries) {
    const accountId = entry.id ?? '';
    if (Array.isArray(entry.changes)) {
      for (const ch of entry.changes) {
        if (ch.field !== 'messages') {
          skipped.push(`changes.field=${ch.field}`);
          continue;
        }
        const v = ch.value ?? {};
        if (!v.message?.text) {
          skipped.push('changes.no_text');
          continue;
        }
        if (!v.sender?.id) {
          skipped.push('changes.no_sender');
          continue;
        }
        events.push({
          shape: 'changes',
          pageOrAccountId: accountId,
          sender: v.sender,
          recipient: v.recipient ?? {},
          message: v.message,
          timestamp: Number(v.timestamp ?? Date.now()),
        });
      }
    }
    if (Array.isArray(entry.messaging)) {
      for (const ev of entry.messaging) {
        if (ev.message_edit) { skipped.push('messaging.message_edit'); continue; }
        if (ev.reaction)    { skipped.push('messaging.reaction'); continue; }
        if (ev.read)        { skipped.push('messaging.read'); continue; }
        if (!ev.message?.text) { skipped.push('messaging.no_text'); continue; }
        if (ev.message.is_echo) { skipped.push('messaging.echo'); continue; }
        if (!ev.sender?.id) { skipped.push('messaging.no_sender'); continue; }
        events.push({
          shape: 'messaging',
          pageOrAccountId: accountId,
          sender: ev.sender,
          recipient: ev.recipient ?? {},
          message: ev.message,
          timestamp: Number(ev.timestamp ?? Date.now()),
        });
      }
    }
  }
  return { events, skipped };
}

export async function processWebhookEvent(row: { id: string; payload: Payload }): Promise<void> {
  const { events, skipped } = normalizeEvents(row.payload);
  log(`row ${row.id.slice(0, 8)}: extracted ${events.length} events, skipped:`, skipped);
  if (events.length === 0) {
    await markProcessed(row.id, skipped.length ? `no_actionable_events:${skipped.join(',')}` : null);
    return;
  }

  for (const ev of events) {
    try {
      await handleIgMessage(ev);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      log(`row ${row.id.slice(0, 8)}: handleIgMessage error:`, msg);
      await markProcessed(row.id, msg);
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

  log(`handleIgMessage: shape=${ev.shape} accountId=${accountId} sender=${senderIgId} recipient=${recipientId} text="${(ev.message.text ?? '').slice(0, 60)}"`);

  // Match the meta_account by entry.id or recipient.id
  const candidates: string[] = [];
  if (accountId) candidates.push(accountId);
  if (recipientId && recipientId !== accountId) candidates.push(recipientId);

  // Two queries: try ig_user_id match first, then page_id
  let account: {
    id: string; org_id: string; ig_user_id: string | null; page_id: string | null;
    access_token: string; username: string | null;
  } | null = null;
  for (const cand of candidates) {
    const { data, error } = await db
      .from('meta_accounts')
      .select('id, org_id, ig_user_id, page_id, access_token, username')
      .or(`ig_user_id.eq.${cand},page_id.eq.${cand}`)
      .maybeSingle();
    if (error) {
      log('meta_accounts query error', error.message);
      continue;
    }
    if (data) { account = data; break; }
  }

  if (!account) {
    log(`no meta_account matched candidates=${candidates.join(',')} — skipping`);
    return;
  }

  log(`matched meta_account ${account.id.slice(0, 8)} (ig=${account.ig_user_id}, @${account.username})`);

  // Skip echoes of our own outbound messages
  if (senderIgId === account.ig_user_id) {
    log('sender is the connected account itself — echo, skipping');
    return;
  }

  // Upsert lead
  const { data: lead, error: leadErr } = await db
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
    .select('id, score, sentiment, ig_user_id, username')
    .single();
  if (leadErr || !lead) {
    log('lead upsert failed', leadErr?.message);
    throw new Error(`lead upsert failed: ${leadErr?.message}`);
  }
  log(`lead ${lead.id.slice(0, 8)} (@${lead.username ?? 'unknown'})`);

  // Upsert conversation
  const threadId = `${account.id}:${senderIgId}`;
  const { data: conv, error: convErr } = await db
    .from('conversations')
    .upsert(
      {
        org_id: account.org_id,
        meta_account_id: account.id,
        lead_id: lead.id,
        ig_thread_id: threadId,
        channel: 'dm',
        status: 'open',
        last_message_at: new Date(ev.timestamp).toISOString(),
      },
      { onConflict: 'meta_account_id,ig_thread_id' },
    )
    .select('id, unread_count')
    .single();
  if (convErr || !conv) {
    log('conversation upsert failed', convErr?.message);
    throw new Error(`conversation upsert failed: ${convErr?.message}`);
  }
  log(`conversation ${conv.id.slice(0, 8)}`);

  // Insert message
  const { error: msgErr } = await db.from('messages').insert({
    org_id: account.org_id,
    conversation_id: conv.id,
    ig_message_id: ev.message.mid ?? null,
    sender: 'them',
    text: ev.message.text,
    sent_at: new Date(ev.timestamp).toISOString(),
  });
  if (msgErr) {
    if (String(msgErr.message).toLowerCase().includes('duplicate')) {
      log('duplicate message — skipping');
      return;
    }
    log('message insert failed', msgErr.message);
    throw new Error(`message insert failed: ${msgErr.message}`);
  }
  log(`message inserted`);

  // Bump unread
  await db.from('conversations').update({ unread_count: (conv.unread_count ?? 0) + 1 }).eq('id', conv.id);

  // ─── AI: classify ─────────────────────────────────────────────────────────
  if (!ENV.ANTHROPIC_API_KEY) {
    log('ANTHROPIC_API_KEY not set — skipping AI');
    return;
  }

  const { data: msgs } = await db
    .from('messages')
    .select('sender, text')
    .eq('conversation_id', conv.id)
    .order('sent_at', { ascending: true })
    .limit(20);
  const transcript = (msgs ?? [])
    .map((m) => `${m.sender === 'them' ? 'CUSTOMER' : 'BRAND'}: ${m.text ?? ''}`)
    .join('\n');

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
    try { parsed = JSON.parse(cleaned); } catch (e) { log('classify parse failed', e); }
    if (parsed) {
      await db.from('leads').update({
        score: parsed.lead_score ?? 0,
        sentiment: (parsed.sentiment as 'hot' | 'warm' | 'cold') ?? null,
        ai_notes: parsed.reasoning ?? null,
        tags: parsed.intent ? [`intent:${parsed.intent}`] : [],
      }).eq('id', lead.id);
      log(`classified: intent=${parsed.intent} sentiment=${parsed.sentiment} score=${parsed.lead_score}`);
    }
  } catch (e) {
    log('classify failed', e instanceof Error ? e.message : String(e));
  }

  // ─── Run live automations ────────────────────────────────────────────────
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
    log('automation run complete');
  } catch (e) {
    log('runAutomationForMessage failed', e instanceof Error ? e.message : String(e));
  }
}
