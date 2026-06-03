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
type IgReplyTo = { story?: { id?: string; url?: string }; mid?: string };
type IgMessage = { mid?: string; text?: string; is_echo?: boolean; attachments?: unknown[]; quick_reply?: IgQuickReply; reply_to?: IgReplyTo };
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
  commentMediaType?: string; // FEED | REELS | ... for comment events
  isStoryReply?: boolean; // DM that is a reply to one of our stories
  username?: string;     // commenter username when provided
  timestamp: number;
  /** Diagnostic: what shape this came from. 'standby' = handover protocol secondary
   *  delivery (we process it the same as 'messaging'). */
  shape: 'changes' | 'messaging' | 'standby';
};

type CommentFrom = { id?: string; username?: string };
type ChangeValue = {
  sender?: Sender; recipient?: Sender; message?: IgMessage; postback?: IgPostback; timestamp?: string | number;
  // comments shape
  id?: string; text?: string; from?: CommentFrom; media?: { id?: string; media_product_type?: string }; parent_id?: string;
};
type Change = { field?: string; value?: ChangeValue };
type Messaging = {
  sender?: Sender; recipient?: Sender; message?: IgMessage; postback?: IgPostback; timestamp?: number;
  message_edit?: { mid?: string; num_edit?: number };
  reaction?: unknown;
  read?: unknown;
};
type Entry = { id?: string; time?: number; changes?: Change[]; messaging?: Messaging[]; standby?: Messaging[] };
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
            commentMediaType: v.media?.media_product_type,
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
          isStoryReply: !!v.message.reply_to?.story,
          timestamp: toMs(v.timestamp ?? entryTime),
        });
      }
    }
    // 'messaging' = we are the primary receiver. 'standby' = handover-protocol
    // secondary delivery (another app / the IG inbox held the thread). We process
    // both identically so DMs and story replies fire even when delivered via standby.
    if (Array.isArray(entry.messaging)) collectMessaging(entry.messaging, accountId, 'messaging', events, skipped);
    if (Array.isArray(entry.standby)) collectMessaging(entry.standby, accountId, 'standby', events, skipped);
  }
  return { events, skipped };
}

function collectMessaging(list: Messaging[], accountId: string, shape: 'messaging' | 'standby', events: Normalized[], skipped: string[]) {
  for (const ev of list) {
    if (ev.message_edit) { skipped.push(`${shape}.message_edit`); continue; }
    if (ev.reaction)    { skipped.push(`${shape}.reaction`); continue; }
    if (ev.read)        { skipped.push(`${shape}.read`); continue; }
    if (!ev.sender?.id) { skipped.push(`${shape}.no_sender`); continue; }

    // Button tap (postback)
    if (ev.postback) {
      events.push({
        kind: 'postback', shape, pageOrAccountId: accountId,
        userId: ev.sender.id, recipientId: ev.recipient?.id ?? '',
        text: ev.postback.title ?? '', mid: ev.postback.mid,
        postbackPayload: ev.postback.payload ?? '',
        timestamp: toMs(ev.timestamp ?? Date.now()),
      });
      continue;
    }

    if (ev.message?.is_echo) { skipped.push(`${shape}.echo`); continue; }
    // Tapped quick-reply → button tap (carries quick_reply.payload).
    if (ev.message?.quick_reply?.payload) {
      events.push({
        kind: 'postback', shape, pageOrAccountId: accountId,
        userId: ev.sender.id, recipientId: ev.recipient?.id ?? '',
        text: ev.message.text ?? '', mid: ev.message.mid,
        postbackPayload: ev.message.quick_reply.payload,
        timestamp: toMs(ev.timestamp ?? Date.now()),
      });
      continue;
    }
    if (!ev.message?.text) { skipped.push(`${shape}.no_text`); continue; }
    events.push({
      kind: 'dm', shape, pageOrAccountId: accountId,
      userId: ev.sender.id, recipientId: ev.recipient?.id ?? '',
      text: ev.message.text, mid: ev.message.mid,
      isStoryReply: !!ev.message.reply_to?.story,
      timestamp: toMs(ev.timestamp ?? Date.now()),
    });
  }
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
  let leadUsername: string | null = (lead.username as string | null) ?? ev.username ?? null;

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
          leadUsername = profile.username;
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

  // ─── Tester command channel ────────────────────────────────────────────────
  // Whitelisted tester accounts can drive the bot from inside Instagram with DM
  // commands (/reset, /teach, /undo, /help). These are control messages: we run
  // the command, confirm via DM, and skip normal storage + AI handling entirely.
  const command = ev.kind === 'dm' ? parseCommand(ev.text) : null;
  if (command) {
    const tester = await isWhitelistedTester(account.org_id, senderIgId, leadUsername);
    if (tester) {
      log(`tester command from @${leadUsername ?? senderIgId}: ${command.kind}`);
      await handleTesterCommand(command, {
        orgId: account.org_id,
        accountIgUserId: account.ig_user_id ?? '',
        accountToken: account.access_token,
        conversationId: conv.id,
        leadId: lead.id,
        recipientIgId: senderIgId,
        who: leadUsername ?? senderIgId,
      });
      return; // control message handled — do not store or run automations
    }
    log('command-like message from non-tester — handling as a normal message');
  }

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

  // For comment events, find out if the commenter follows the business. This decides
  // whether a public comment reply should add a "check your message requests" note.
  let userFollowsBusiness: boolean | undefined = undefined;
  if (ev.kind === 'comment' && account.access_token) {
    try {
      const url = new URL(`https://graph.instagram.com/${ENV.META_GRAPH_VERSION}/${senderIgId}`);
      url.searchParams.set('fields', 'is_user_follow_business');
      url.searchParams.set('access_token', account.access_token);
      const r = await fetch(url);
      if (r.ok) {
        const j = await r.json() as { is_user_follow_business?: boolean };
        userFollowsBusiness = j.is_user_follow_business;
        log(`follows_business=${userFollowsBusiness}`);
      }
    } catch (e) {
      log('follow-status fetch failed', e instanceof Error ? e.message : String(e));
    }
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
      commentMediaType: ev.commentMediaType,
      isFirstContact,
      isStoryReply: ev.isStoryReply,
      userFollowsBusiness,
    });
    log('automation run complete');
  } catch (e) {
    log('runAutomationForMessage failed', e instanceof Error ? e.message : String(e));
  }
}

// ─── Tester command channel ──────────────────────────────────────────────────

type TesterCommand =
  | { kind: 'reset' }
  | { kind: 'teach'; arg: string }
  | { kind: 'undo' }
  | { kind: 'help' }
  | { kind: 'unknown'; name: string };

// Parse a leading-slash command, e.g. "/teach be more casual". Returns null for
// anything that is not a command so normal handling proceeds.
function parseCommand(text: string | undefined): TesterCommand | null {
  const t = (text ?? '').trim();
  if (!t.startsWith('/')) return null;
  const m = t.match(/^\/(\w+)\s*([\s\S]*)$/);
  if (!m) return null;
  const name = m[1].toLowerCase();
  const arg = m[2].trim();
  if (['reset', 'restart', 'clear'].includes(name)) return { kind: 'reset' };
  if (['teach', 'style', 'info', 'update', 'remember'].includes(name)) return { kind: 'teach', arg };
  if (['undo', 'revert'].includes(name)) return { kind: 'undo' };
  if (['help', 'commands', 'cmds'].includes(name)) return { kind: 'help' };
  return { kind: 'unknown', name };
}

async function isWhitelistedTester(orgId: string, igUserId: string, username: string | null): Promise<boolean> {
  const ors = [`ig_user_id.eq.${igUserId}`];
  if (username) ors.push(`username.ilike.${username}`);
  const { data, error } = await db
    .from('automation_testers')
    .select('id')
    .eq('org_id', orgId)
    .or(ors.join(','))
    .limit(1);
  if (error) { log('tester lookup failed', error.message); return false; }
  return !!(data && data.length);
}

// Send a plain DM (control confirmation). Not stored as a conversation message.
async function sendTesterDm(accountIgUserId: string, accountToken: string, recipientIgId: string, text: string): Promise<void> {
  try {
    const url = `https://graph.instagram.com/${ENV.META_GRAPH_VERSION}/${accountIgUserId}/messages`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accountToken}` },
      body: JSON.stringify({ recipient: { id: recipientIgId }, message: { text } }),
    });
    if (!r.ok) log('tester DM send failed', r.status, (await r.text()).slice(0, 200));
  } catch (e) {
    log('tester DM send error', e instanceof Error ? e.message : String(e));
  }
}

// Turn a free-form tester instruction into a single concise rule for the master doc.
async function distillTweak(orgId: string, instruction: string): Promise<string> {
  const r = await workerCall({
    orgId,
    purpose: 'reply',
    cacheSystem: false,
    system:
      `You convert a tester instruction into ONE concise rule for a brand's Instagram DM AI. ` +
      `Output ONLY the rule as a single short imperative line. No quotes, no preamble, no markdown, no em dashes. ` +
      `If it is about tone or wording, phrase it as a style rule. If it is a fact, price, link, or detail, phrase it as a fact the AI can state.`,
    userMessage: `Tester instruction: ${instruction}\n\nWrite the single rule:`,
    maxTokens: 120,
    temperature: 0.2,
  });
  return r.text.trim().replace(/^["'\s-]+/, '').replace(/\s+/g, ' ').trim();
}

const TWEAKS_HEADER = '=== LIVE TESTER TWEAKS (highest priority, newest first) ===';
const TWEAKS_FOOTER = '=== END LIVE TESTER TWEAKS ===';

// Insert a new rule at the top of the tester-tweaks block, creating the block at
// the very top of the doc if it does not exist yet.
function appendTweak(brain: string, rule: string, who: string): string {
  const bullet = `- ${rule} (via @${who})`;
  if (brain.includes(TWEAKS_HEADER)) {
    return brain.replace(`${TWEAKS_HEADER}\n`, `${TWEAKS_HEADER}\n${bullet}\n`);
  }
  return `${TWEAKS_HEADER}\n${bullet}\n${TWEAKS_FOOTER}\n\n${brain}`;
}

type CommandCtx = {
  orgId: string;
  accountIgUserId: string;
  accountToken: string;
  conversationId: string;
  leadId: string;
  recipientIgId: string;
  who: string;
};

async function handleTesterCommand(cmd: TesterCommand, ctx: CommandCtx): Promise<void> {
  const reply = (text: string) => sendTesterDm(ctx.accountIgUserId, ctx.accountToken, ctx.recipientIgId, text);

  if (cmd.kind === 'reset') {
    await db.from('messages').delete().eq('org_id', ctx.orgId).eq('conversation_id', ctx.conversationId);
    await db.from('conversations').update({
      unread_count: 0, last_message_at: null, next_action: null, status: 'open',
    }).eq('id', ctx.conversationId);
    await db.from('leads').update({ score: null, sentiment: null, ai_notes: null, tags: [] }).eq('id', ctx.leadId);
    log(`tester reset conversation ${ctx.conversationId.slice(0, 8)}`);
    await reply('Chat reset. Send the keyword or a new message to start fresh.');
    return;
  }

  if (cmd.kind === 'teach') {
    if (!cmd.arg) {
      await reply('Tell me what to change after the command. Example: /teach be more casual and never mention price first.');
      return;
    }
    const { data: orgRow } = await db.from('organizations').select('brain_md').eq('id', ctx.orgId).single();
    const current = (orgRow?.brain_md as string | undefined) ?? '';
    let rule: string;
    try {
      rule = await distillTweak(ctx.orgId, cmd.arg);
    } catch (e) {
      log('distillTweak failed', e instanceof Error ? e.message : String(e));
      rule = cmd.arg.replace(/\s+/g, ' ').trim(); // fall back to the raw instruction
    }
    if (!rule) { await reply('Could not turn that into a rule. Try rephrasing.'); return; }
    // Snapshot the doc BEFORE the change so /undo and the UI can revert.
    await db.from('brain_md_history').insert({
      org_id: ctx.orgId, brain_md: current, changed_by: ctx.who, source: 'tester_dm', note: rule,
    });
    const next = appendTweak(current, rule, ctx.who);
    const { error } = await db.from('organizations').update({ brain_md: next, updated_at: new Date().toISOString() }).eq('id', ctx.orgId);
    if (error) { log('teach update failed', error.message); await reply('Something went wrong saving that. Try again.'); return; }
    log(`tester taught rule: ${rule}`);
    await reply(`Added to the brain:\n"${rule}"\n\nIt applies from your next message. Send /undo to revert.`);
    return;
  }

  if (cmd.kind === 'undo') {
    const { data: hist } = await db
      .from('brain_md_history')
      .select('id, brain_md')
      .eq('org_id', ctx.orgId)
      .order('created_at', { ascending: false })
      .limit(1);
    if (!hist || hist.length === 0) { await reply('Nothing to undo.'); return; }
    const snap = hist[0] as { id: string; brain_md: string };
    await db.from('organizations').update({ brain_md: snap.brain_md, updated_at: new Date().toISOString() }).eq('id', ctx.orgId);
    await db.from('brain_md_history').delete().eq('id', snap.id);
    log('tester undo: reverted last brain change');
    await reply('Reverted the last brain change.');
    return;
  }

  if (cmd.kind === 'help') {
    await reply([
      'Tester commands:',
      '/reset  - wipe this chat and start fresh',
      '/teach <change>  - update the master doc (style or info)',
      '/undo  - revert the last /teach',
      '/help  - show this list',
    ].join('\n'));
    return;
  }

  await reply(`Unknown command "/${cmd.name}". Send /help to see what I can do.`);
}
