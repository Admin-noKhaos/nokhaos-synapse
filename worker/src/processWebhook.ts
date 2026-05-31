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
type IgQuickReply = { payload?: string };
type IgMessage = { mid?: string; text?: string; is_echo?: boolean; attachments?: unknown[]; quick_reply?: IgQuickReply };
type IgPostback = { mid?: string; title?: string; payload?: string };

/** A single inbound event normalised across Instagram's webhook shapes.
 *  kind 'dm' = a direct message, 'comment' = a post/reel comment,
 *  'postback' = the lead tapped a button we sent. */
type Normalized = {
  kind: 'dm' | 'comment' | 'postback';
  pageOrAccountId: string;
  userId: string;        // the lead: DM/postback sender id, or commenter from.id
  recipientId: string;
  text: string;          // DM/comment text, or the tapped button's title
  mid?: string;          // message id / comment id — used for dedupe
  postbackPayload?: string;
  commentId?: string;
  username?: string;     // commenter username when provided
  timestamp: number;
  /** Diagnostic: what shape this came from. */
  shape: 'changes' | 'messaging';
};

type CommentFrom = { id?: string; username?: string };
type ChangeValue = {
  sender?: Sender; recipient?: Sender; message?: IgMessage; postback?: IgPostback; timestamp?: string | number;
  // comments shape
  id?: string; text?: string; from?: CommentFrom; media?: { id?: string }; parent_id?: string;
};
type Change = { field?: string; value?: ChangeValue };
type Messaging = {
  sender?: Sender; recipient?: Sender; message?: IgMessage; postback?: IgPostback; timestamp?: number;
  message_edit?: { mid?: string; num_edit?: number };
  reaction?: unknown;
  read?: unknown;
};
type Entry = { id?: string; time?: number; changes?: Change[]; messaging?: Messaging[] };
type Payload = { object?: string; entry?: Entry[] };

function log(...args: unknown[]) {
  console.log('[webhook]', ...args);
}

// Normalise a webhook timestamp to milliseconds. Instagram delivers `entry.time`
// (and comment timestamps) in epoch SECONDS, while messaging events use ms.
// Anything below ~1e12 is treated as seconds and scaled up.
function toMs(t: string | number | undefined): number {
  const n = Number(t) || 0;
  return n > 0 && n < 1e12 ? n * 1000 : n;
}

function normalizeEvents(payload: Payload): { events: Normalized[]; skipped: string[] } {
  const events: Normalized[] = [];
  const skipped: string[] = [];
  const entries = payload?.entry ?? [];
  for (const entry of entries) {
    const accountId = entry.id ?? '';
    const entryTime = Number(entry.time ?? Date.now());
    if (Array.isArray(entry.changes)) {
      for (const ch of entry.changes) {
        const v = ch.value ?? {};

        // ── Comment on a post/reel ──────────────────────────────────────────
        if (ch.field === 'comments') {
          if (!v.text) { skipped.push('comments.no_text'); continue; }
          if (!v.from?.id) { skipped.push('comments.no_from'); continue; }
          events.push({
            kind: 'comment', shape: 'changes', pageOrAccountId: accountId,
            userId: v.from.id, recipientId: accountId, text: v.text,
            mid: v.id, commentId: v.id, username: v.from.username,
            timestamp: toMs(v.timestamp ?? entryTime),
          });
          continue;
        }

        // ── Button tap (postback) delivered as a change ─────────────────────
        if (ch.field === 'messaging_postbacks' || v.postback) {
          if (!v.sender?.id) { skipped.push('postback.no_sender'); continue; }
          events.push({
            kind: 'postback', shape: 'changes', pageOrAccountId: accountId,
            userId: v.sender.id, recipientId: v.recipient?.id ?? accountId,
            text: v.postback?.title ?? '', mid: v.postback?.mid,
            postbackPayload: v.postback?.payload ?? '',
            timestamp: toMs(v.timestamp ?? entryTime),
          });
          continue;
        }

        // ── Direct message ──────────────────────────────────────────────────
        if (ch.field !== 'messages') { skipped.push(`changes.field=${ch.field}`); continue; }
        if (!v.sender?.id) { skipped.push('changes.no_sender'); continue; }
        // A tapped quick-reply arrives as a normal message carrying quick_reply.payload —
        // treat it as a button tap so `button_click` triggers fire.
        if (v.message?.quick_reply?.payload) {
          events.push({
            kind: 'postback', shape: 'changes', pageOrAccountId: accountId,
            userId: v.sender.id, recipientId: v.recipient?.id ?? '',
            text: v.message.text ?? '', mid: v.message.mid,
            postbackPayload: v.message.quick_reply.payload,
            timestamp: toMs(v.timestamp ?? entryTime),
          });
          continue;
        }
        if (!v.message?.text) { skipped.push('changes.no_text'); continue; }
        events.push({
          kind: 'dm', shape: 'changes', pageOrAccountId: accountId,
          userId: v.sender.id, recipientId: v.recipient?.id ?? '',
          text: v.message.text, mid: v.message.mid,
          timestamp: toMs(v.timestamp ?? entryTime),
        });
      }
    }
    if (Array.isArray(entry.messaging)) {
      for (const ev of entry.messaging) {
        if (ev.message_edit) { skipped.push('messaging.message_edit'); continue; }
        if (ev.reaction)    { skipped.push('messaging.reaction'); continue; }
        if (ev.read)        { skipped.push('messaging.read'); continue; }
        if (!ev.sender?.id) { skipped.push('messaging.no_sender'); continue; }

        // Button tap (postback)
        if (ev.postback) {
          events.push({
            kind: 'postback', shape: 'messaging', pageOrAccountId: accountId,
            userId: ev.sender.id, recipientId: ev.recipient?.id ?? '',
            text: ev.postback.title ?? '', mid: ev.postback.mid,
            postbackPayload: ev.postback.payload ?? '',
            timestamp: toMs(ev.timestamp ?? Date.now()),
          });
          continue;
        }

        if (ev.message?.is_echo) { skipped.push('messaging.echo'); continue; }
        // Tapped quick-reply → button tap (carries quick_reply.payload).
        if (ev.message?.quick_reply?.payload) {
          events.push({
            kind: 'postback', shape: 'messaging', pageOrAccountId: accountId,
            userId: ev.sender.id, recipientId: ev.recipient?.id ?? '',
            text: ev.message.text ?? '', mid: ev.message.mid,
            postbackPayload: ev.message.quick_reply.payload,
            timestamp: toMs(ev.timestamp ?? Date.now()),
          });
          continue;
        }
        if (!ev.message?.text) { skipped.push('messaging.no_text'); continue; }
        events.push({
          kind: 'dm', shape: 'messaging', pageOrAccountId: accountId,
          userId: ev.sender.id, recipientId: ev.recipient?.id ?? '',
          text: ev.message.text, mid: ev.message.mid,
          timestamp: toMs(ev.timestamp ?? Date.now()),
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
      await handleEvent(ev);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      log(`row ${row.id.slice(0, 8)}: handleEvent error:`, msg);
      await markProcessed(row.id, msg);
      return;
    }
  }
  await markProcessed(row.id, null);
}

async function markProcessed(id: string, error: string | null) {
  await db.from('webhook_events').update({ processed_at: new Date().toISOString(), error }).eq('id', id);
}

async function handleEvent(ev: Normalized) {
  const senderIgId = ev.userId;
  const recipientId = ev.recipientId;
  const accountId = ev.pageOrAccountId;

  log(`handleEvent: kind=${ev.kind} shape=${ev.shape} accountId=${accountId} sender=${senderIgId} recipient=${recipientId} text="${(ev.text ?? '').slice(0, 60)}"${ev.postbackPayload ? ` payload=${ev.postbackPayload}` : ''}`);

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
        // Comment webhooks include the commenter's handle — capture it directly.
        ...(ev.username ? { username: ev.username } : {}),
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

  // Backfill username/display_name/profile_pic from IG Graph if missing.
  // Best-effort — failures don't break the pipeline.
  if (!lead.username && account.access_token) {
    try {
      const url = new URL(`https://graph.instagram.com/${ENV.META_GRAPH_VERSION}/${senderIgId}`);
      url.searchParams.set('fields', 'username,name,profile_pic,is_verified_user');
      url.searchParams.set('access_token', account.access_token);
      const r = await fetch(url);
      if (r.ok) {
        const profile = await r.json() as { username?: string; name?: string; profile_pic?: string; is_verified_user?: boolean };
        if (profile.username) {
          await db.from('leads').update({
            username: profile.username,
            display_name: profile.name ?? profile.username,
            profile: { profile_pic: profile.profile_pic ?? null, verified: !!profile.is_verified_user },
          }).eq('id', lead.id);
          log(`profile filled: @${profile.username} (${profile.name})`);
        }
      } else {
        log(`profile fetch ${r.status} ${(await r.text()).slice(0, 200)}`);
      }
    } catch (e) {
      log('profile fetch failed', e instanceof Error ? e.message : String(e));
    }
  }

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

  // First contact = no prior messages in this conversation (measured BEFORE we
  // insert the current inbound). Lets flows branch first-timers vs returning leads.
  const { count: priorMsgCount } = await db
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conv.id);
  const isFirstContact = (priorMsgCount ?? 0) === 0;
  log(`first_contact=${isFirstContact} (prior messages=${priorMsgCount ?? 0})`);

  // Insert message (the comment text / DM text / tapped button title)
  const inboundMeta =
    ev.kind === 'comment' ? { comment: true, comment_id: ev.commentId ?? null }
    : ev.kind === 'postback' ? { postback: true, payload: ev.postbackPayload ?? null }
    : null;
  const { error: msgErr } = await db.from('messages').insert({
    org_id: account.org_id,
    conversation_id: conv.id,
    ig_message_id: ev.mid ?? null,
    sender: 'them',
    text: ev.text,
    sent_at: new Date(ev.timestamp).toISOString(),
    ...(inboundMeta ? { ai_meta: inboundMeta } : {}),
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

  // Build transcript + master doc — used by classify and by AI nodes in flows.
  const { data: msgs } = await db
    .from('messages')
    .select('sender, text')
    .eq('conversation_id', conv.id)
    .order('sent_at', { ascending: true })
    .limit(20);
  const transcript = (msgs ?? [])
    .map((m) => `${m.sender === 'them' ? 'CUSTOMER' : 'BRAND'}: ${m.text ?? ''}`)
    .join('\n');

  // Fetch the org's master doc once and reuse for both classify + flow run.
  const { data: orgRow } = await db.from('organizations').select('brain_md').eq('id', account.org_id).single();
  const brainMd = (orgRow?.brain_md as string | undefined) ?? '';
  const brainBlock = brainMd.trim() ? `\n\nMASTER DOC (authoritative — follow these rules):\n${brainMd.trim()}\n` : '';

  // When the lead turns abusive we hand the conversation to a human and suppress
  // the auto-reply (set during classify below).
  let handoff = false;

  // ─── AI: classify (DM events only — comments/button taps are deterministic) ─
  if (ev.kind === 'dm' && ENV.ANTHROPIC_API_KEY) try {
    const classify = await workerCall({
      orgId: account.org_id,
      purpose: 'classify',
      relatedId: conv.id,
      cacheSystem: true,
      system:
        `You are Synapse, a sales-AI for an Instagram business (@${account.username ?? 'brand'}). ` +
        `Return STRICT JSON only with shape: {"intent":"purchase"|"objection"|"question"|"support"|"spam"|"other","sentiment":"hot"|"warm"|"cold","lead_score":0-100,"abusive":true|false,"reasoning":"1 sentence"}. ` +
        `Set "abusive" to true ONLY when the latest customer message is insulting you, swearing at you, trolling, or clearly acting in bad faith. Skepticism, objections, or politely saying it sounds like a scam are NOT abusive. ` +
        `No markdown. No prose outside JSON.${brainBlock}`,
      userMessage: `Conversation transcript:\n\n${transcript}`,
      maxTokens: 200,
      temperature: 0.2,
    });
    const cleaned = classify.text.trim().replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '');
    let parsed: { intent?: string; sentiment?: string; lead_score?: number; reasoning?: string; abusive?: boolean } | null = null;
    try { parsed = JSON.parse(cleaned); } catch (e) { log('classify parse failed', e); }
    if (parsed) {
      await db.from('leads').update({
        score: parsed.lead_score ?? 0,
        sentiment: (parsed.sentiment as 'hot' | 'warm' | 'cold') ?? null,
        ai_notes: parsed.reasoning ?? null,
        tags: parsed.intent ? [`intent:${parsed.intent}`] : [],
      }).eq('id', lead.id);
      log(`classified: intent=${parsed.intent} sentiment=${parsed.sentiment} score=${parsed.lead_score} abusive=${parsed.abusive === true}`);

      if (parsed.abusive === true) {
        handoff = true;
        await db.from('conversations').update({
          status: 'handed_off',
          next_action: 'Hostile lead — handed to a human',
        }).eq('id', conv.id);
        log('hostile message detected — handed off to human, suppressing auto-reply');
      }
    }
  } catch (e) {
    log('classify failed', e instanceof Error ? e.message : String(e));
  }

  // ─── Run live automations (skipped once handed off to a human) ─────────────
  if (handoff) {
    log('conversation handed off — skipping automations / auto-reply');
  } else try {
    const { runAutomationForMessage } = await import('./runAutomation.js');
    await runAutomationForMessage({
      orgId: account.org_id,
      conversationId: conv.id,
      accountId: account.id,
      accountIgUserId: account.ig_user_id ?? '',
      accountToken: account.access_token,
      accountUsername: account.username ?? null,
      leadIgUserId: senderIgId,
      messageText: ev.text ?? '',
      transcript,
      brainMd,
      eventKind: ev.kind,
      postbackPayload: ev.postbackPayload,
      commentId: ev.commentId,
      isFirstContact,
    });
    log('automation run complete');
  } catch (e) {
    log('runAutomationForMessage failed', e instanceof Error ? e.message : String(e));
  }
}
