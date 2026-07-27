// Scheduled follow-up runner.
//
// The `follow_up` flow action schedules rows in scheduled_followups (one per
// delay, e.g. +2h/+6h/+12h). This loop fires each one when due — but ONLY if the
// lead still hasn't replied since the message we're following up on. The moment
// they reply, the whole sequence is cancelled. Messages are static (variants) or
// AI-generated grounded in the master doc + conversation.

import { db } from './db.js';
import { ENV } from './env.js';
import { workerCall } from './anthropic.js';
import { sanitizeReply } from './runAutomation.js';
import { recordSendOutcome } from './tokenHealth.js';

type FollowupRow = {
  id: string; org_id: string; conversation_id: string; account_id: string | null;
  lead_ig_user_id: string; sequence_id: string; step: number;
  reference_at: string; mode: string; goal: string | null;
  variants: string[] | null; use_master_doc: boolean;
  cancel_on_reply: boolean;
};

function log(...args: unknown[]) { console.log('[followup]', ...args); }

let running = false;

export async function runDueFollowups(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const { data: rows, error } = await db
      .from('scheduled_followups')
      .select('id, org_id, conversation_id, account_id, lead_ig_user_id, sequence_id, step, reference_at, mode, goal, variants, use_master_doc, cancel_on_reply')
      .eq('status', 'pending')
      .lte('due_at', new Date().toISOString())
      .order('due_at', { ascending: true })
      .limit(20);
    if (error) { log('query failed', error.message); return; }
    for (const row of (rows ?? []) as FollowupRow[]) {
      try { await processFollowup(row); } catch (e) { log('process error', e instanceof Error ? e.message : String(e)); }
    }
  } finally {
    running = false;
  }
}

async function processFollowup(row: FollowupRow): Promise<void> {
  const isRetry = row.mode === 'retry';

  // For ordinary follow-up nudges: if the lead replied since the reference point,
  // cancel the sequence. Retry-sends opt out via cancel_on_reply=false because the
  // payload they're delivering (the link they asked for) is still wanted.
  if (row.cancel_on_reply !== false) {
    const { count } = await db
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', row.conversation_id)
      .eq('sender', 'them')
      .gt('sent_at', row.reference_at);
    if ((count ?? 0) > 0) {
      await db.from('scheduled_followups').update({ status: 'cancelled' })
        .eq('sequence_id', row.sequence_id).eq('status', 'pending');
      log(`seq ${row.sequence_id.slice(0, 8)}: lead replied — sequence cancelled`);
      return;
    }
  }

  const { data: acct } = await db
    .from('meta_accounts')
    .select('ig_user_id, page_id, platform, access_token, username')
    .eq('id', row.account_id ?? '')
    .maybeSingle();
  // Facebook pages send through page_id; Instagram through ig_user_id.
  const hostId = acct?.platform === 'facebook' ? acct.page_id : acct?.ig_user_id;
  if (!acct?.access_token || !hostId) {
    await db.from('scheduled_followups').update({ status: 'cancelled' }).eq('id', row.id);
    log(`row ${row.id.slice(0, 8)}: no connected account — cancelled`);
    return;
  }

  // Pick the text. Retry-sends use the stored variant verbatim (the original link).
  const text = isRetry && row.variants?.length
    ? (row.variants[0] ?? '').trim()
    : row.mode === 'static' && row.variants?.length
      ? row.variants[Math.floor(Math.random() * row.variants.length)].trim()
      : await generateFollowup(row, acct.username ?? null);
  if (!text) { await mark(row.id, 'cancelled'); return; }

  const host = acct.platform === 'facebook' ? 'graph.facebook.com' : 'graph.instagram.com';
  const ok = await sendDm(host, hostId, acct.access_token, row.lead_ig_user_id, text, row.account_id ?? undefined);
  if (ok) {
    await db.from('messages').insert({
      org_id: row.org_id, conversation_id: row.conversation_id,
      sender: 'us', text, sent_at: new Date().toISOString(),
      ai_meta: isRetry
        ? { auto: true, automation: true, retry: true, step: row.step }
        : { auto: true, followup: true, step: row.step },
    });
    await db.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', row.conversation_id);
    await mark(row.id, 'sent');
    if (isRetry) {
      // The link landed — cancel the rest of the retry waves.
      await db.from('scheduled_followups')
        .update({ status: 'cancelled' })
        .eq('sequence_id', row.sequence_id)
        .eq('status', 'pending');
      log(`retry step ${row.step} delivered for conv ${row.conversation_id.slice(0, 8)} — remaining waves cancelled`);
    } else {
      log(`sent follow-up step ${row.step} for conv ${row.conversation_id.slice(0, 8)}`);
    }
  } else {
    // For ordinary follow-ups: mark this attempt failed and stop. For retry-sends:
    // keep the row failed but the rest of the sequence stays pending — a later wave
    // may succeed once the inbox lock lapses.
    await mark(row.id, 'failed');
    log(`${isRetry ? 'retry' : 'follow-up'} send failed for conv ${row.conversation_id.slice(0, 8)} step ${row.step}`);
  }
}

async function mark(id: string, status: string) {
  await db.from('scheduled_followups').update({ status }).eq('id', id);
}

async function generateFollowup(row: FollowupRow, username: string | null): Promise<string> {
  if (!ENV.ANTHROPIC_API_KEY) return '';
  const { data: msgs } = await db
    .from('messages')
    .select('sender, text')
    .eq('conversation_id', row.conversation_id)
    .order('sent_at', { ascending: true })
    .limit(20);
  const transcript = (msgs ?? []).map((m) => `${m.sender === 'them' ? 'CUSTOMER' : 'BRAND'}: ${m.text ?? ''}`).join('\n');

  let brainBlock = '';
  if (row.use_master_doc) {
    const { data: org } = await db.from('organizations').select('brain_md').eq('id', row.org_id).single();
    const brain = ((org?.brain_md as string | undefined) ?? '').trim();
    if (brain) brainBlock = `\n\nMASTER DOC (authoritative — follow these rules):\n${brain}\n`;
  }

  try {
    const r = await workerCall({
      orgId: row.org_id,
      purpose: 'reply',
      relatedId: row.conversation_id,
      cacheSystem: true,
      system:
        `You are Synapse, replying as @${username ?? 'brand'} on Instagram. ` +
        `This is a FOLLOW-UP message because the person went quiet. ${row.goal || 'Send a short, friendly nudge to re-engage.'} ` +
        `Keep it to 1-2 sentences. Do not repeat your previous messages. Output ONLY the message text, no quotes, no markdown.` +
        brainBlock,
      userMessage: `Recent conversation:\n${transcript}\n\nWrite the follow-up message:`,
      maxTokens: 200,
      temperature: 0.7,
    });
    return sanitizeReply(r.text.trim());
  } catch (e) {
    log('generate failed', e instanceof Error ? e.message : String(e));
    return '';
  }
}

async function sendDm(host: string, hostId: string, token: string, recipientId: string, text: string, accountId?: string): Promise<boolean> {
  try {
    const url = `https://${host}/${ENV.META_GRAPH_VERSION}/${hostId}/messages`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }),
    });
    if (!r.ok) {
      const errText = await r.text();
      log('send failed', r.status, errText.slice(0, 160));
      if (accountId) await recordSendOutcome(accountId, false, errText);
      return false;
    }
    if (accountId) await recordSendOutcome(accountId, true);
    return true;
  } catch (e) {
    log('send error', e instanceof Error ? e.message : String(e));
    return false;
  }
}
