// Handle a single webhook_events row. Currently supports Instagram messaging events.
//
// Meta payload shape (simplified):
// {
//   "object": "instagram",
//   "entry": [
//     {
//       "id": "<page_id>",
//       "time": ...,
//       "messaging": [{
//         "sender": { "id": "<ig_user_id>" },
//         "recipient": { "id": "<ig_business_id>" },
//         "timestamp": ...,
//         "message": { "mid": "...", "text": "..." }
//       }]
//     }
//   ]
// }

import { db } from './db.js';
import { ENV } from './env.js';
import { workerCall } from './anthropic.js';

type IgMessagingEvent = {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: { mid?: string; text?: string; is_echo?: boolean };
};

type Entry = { id?: string; messaging?: IgMessagingEvent[] };
type Payload = { object?: string; entry?: Entry[] };

export async function processWebhookEvent(row: { id: string; payload: Payload }): Promise<void> {
  const p = row.payload;
  if (!p?.entry?.length) {
    await markProcessed(row.id, null);
    return;
  }

  for (const entry of p.entry) {
    if (!entry.messaging) continue;
    for (const ev of entry.messaging) {
      try {
        await handleIgMessage(entry.id ?? '', ev);
      } catch (e) {
        console.error('handleIgMessage failed', e);
        await markProcessed(row.id, e instanceof Error ? e.message : String(e));
        return;
      }
    }
  }
  await markProcessed(row.id, null);
}

async function markProcessed(id: string, error: string | null) {
  await db.from('webhook_events').update({ processed_at: new Date().toISOString(), error }).eq('id', id);
}

async function handleIgMessage(pageId: string, ev: IgMessagingEvent) {
  if (!ev.message?.text || ev.message.is_echo) return;

  // Find the meta_account by page_id (or by recipient ig business id)
  const { data: account } = await db
    .from('meta_accounts')
    .select('id, org_id, ig_user_id, page_id, access_token, username')
    .or(`page_id.eq.${pageId},ig_user_id.eq.${ev.recipient?.id ?? ''}`)
    .limit(1)
    .single();

  if (!account) {
    console.warn('no meta_account matched for page', pageId);
    return;
  }

  const senderIgId = ev.sender?.id;
  if (!senderIgId) return;

  // Upsert the lead
  const { data: lead } = await db
    .from('leads')
    .upsert(
      { org_id: account.org_id, meta_account_id: account.id, ig_user_id: senderIgId, last_active_at: new Date().toISOString() },
      { onConflict: 'org_id,ig_user_id' },
    )
    .select('id, score, sentiment')
    .single();

  // Upsert the conversation by (meta_account_id, thread_id). Meta's IG messaging
  // doesn't expose a thread_id, but we can derive one from sender+recipient.
  const threadId = `${pageId}:${senderIgId}`;
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
        last_message_at: new Date(ev.timestamp ?? Date.now()).toISOString(),
      },
      { onConflict: 'meta_account_id,ig_thread_id' },
    )
    .select('id')
    .single();

  if (!conv) return;

  // Persist the inbound message
  await db.from('messages').insert({
    org_id: account.org_id,
    conversation_id: conv.id,
    ig_message_id: ev.message.mid ?? null,
    sender: 'them',
    text: ev.message.text,
    sent_at: new Date(ev.timestamp ?? Date.now()).toISOString(),
  });

  // Bump unread count
  await db.rpc('increment_unread', { p_conv_id: conv.id }).then(
    () => null,
    // RPC may not exist (it doesn't yet) — fall back to a direct UPDATE
    async () => {
      await db.from('conversations').update({ unread_count: (await getUnread(conv.id)) + 1 }).eq('id', conv.id);
    },
  );

  // Fire-and-forget AI classify + reply (only if Anthropic configured)
  if (ENV.ANTHROPIC_API_KEY) {
    try {
      const { data: msgs } = await db
        .from('messages')
        .select('sender, text')
        .eq('conversation_id', conv.id)
        .order('sent_at', { ascending: true })
        .limit(20);

      const transcript = (msgs ?? [])
        .map((m) => `${m.sender === 'them' ? 'CUSTOMER' : 'BRAND'}: ${m.text ?? ''}`)
        .join('\n');

      const reply = await workerCall({
        orgId: account.org_id,
        purpose: 'reply',
        relatedId: conv.id,
        cacheSystem: true,
        system:
          `You are Synapse, an AI agent that handles Instagram DMs for @${account.username ?? 'brand'}. ` +
          `Reply concisely (1-3 sentences), end with a single clear next step. Do not invent product details.`,
        userMessage: `Conversation transcript:\n\n${transcript}\n\nWrite the next reply as the brand.`,
        maxTokens: 200,
        temperature: 0.7,
      });

      // Save the AI reply (but DON'T send to Meta yet — leave that to the user to approve,
      // or wire send_dm here for full automation). For now, persist as 'ai' suggestion.
      await db.from('messages').insert({
        org_id: account.org_id,
        conversation_id: conv.id,
        sender: 'ai',
        text: reply.text,
        ai_meta: { suggested: true, charged_usd: reply.charged_usd },
        sent_at: new Date().toISOString(),
      });

      await db.from('conversations').update({ next_action: 'AI suggested a reply — review in Inbox' }).eq('id', conv.id);
    } catch (e) {
      console.error('AI reply failed', e);
    }
  }
}

async function getUnread(convId: string): Promise<number> {
  const { data } = await db.from('conversations').select('unread_count').eq('id', convId).single();
  return Number(data?.unread_count ?? 0);
}
