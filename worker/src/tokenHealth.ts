// Token health monitor.
//
// Meta tokens die silently (password changes, security checkpoints, session
// revocations) — and a dead token means every DM fails until someone notices
// and reconnects. On 2026-07-27 that took 80 minutes on a live account. This
// module catches it in ~2 and emails an alert with the reconnect link.
//
// Two detection layers, because a token can pass /me yet fail sends:
//  1. Validity ping (this file's loop): GET /me per account. Catches hard
//     token death (OAuth code 190, "session malformed", etc.).
//  2. Send-failure tracking (called from sendIgMessage & followupRunner):
//     3 consecutive auth-like send failures with no success in between →
//     account marked unhealthy. Catches the "disabled messaging" mode where
//     reads still work.
//
// Alerts email ENV.ALERT_EMAIL via Resend's HTTP API (no SDK), at most one
// per account per hour. Recovery flips health_status back to 'ok' and a
// recovery email confirms it.

import { db } from './db.js';
import { ENV } from './env.js';

type Account = {
  id: string; org_id: string; platform: string | null;
  ig_user_id: string | null; page_id: string | null;
  username: string | null; page_name: string | null;
  access_token: string;
  consecutive_send_failures: number;
  health_status: string;
  last_health_alert_at: string | null;
};

function log(...args: unknown[]) { console.log('[token-health]', ...args); }

// Substrings that identify an auth/permission-level failure (vs a per-recipient
// issue like a thread lock or messaging window).
const AUTH_ERROR_MARKERS = [
  'session key is malformed',
  'error validating access token',
  'access token could not be decrypted',
  'the access token is invalid',
  'has disabled access to instagram direct messaging',
  '"code":190',
  'code: 190',
];

export function looksLikeAuthError(errText: string): boolean {
  const t = errText.toLowerCase();
  return AUTH_ERROR_MARKERS.some((m) => t.includes(m));
}

const FAILURE_THRESHOLD = 3;

// Called by send paths after every DM attempt. Success resets the counter and
// (if the account was flagged) sends a recovery email. Auth-like failures
// increment it; at the threshold the account is flagged + alert email sent.
export async function recordSendOutcome(accountId: string, ok: boolean, errText?: string): Promise<void> {
  try {
    if (ok) {
      const { data } = await db
        .from('meta_accounts')
        .select('id, org_id, platform, ig_user_id, page_id, username, page_name, access_token, consecutive_send_failures, health_status, last_health_alert_at')
        .eq('id', accountId).maybeSingle();
      if (!data) return;
      const acct = data as Account;
      if (acct.consecutive_send_failures > 0 || acct.health_status !== 'ok') {
        await db.from('meta_accounts').update({
          consecutive_send_failures: 0, health_status: 'ok', last_send_ok_at: new Date().toISOString(),
        }).eq('id', accountId);
        if (acct.health_status !== 'ok') {
          log(`account @${acct.username ?? acct.page_name} recovered`);
          await sendAlertEmail(acct, 'recovered');
        }
      } else {
        await db.from('meta_accounts').update({ last_send_ok_at: new Date().toISOString() }).eq('id', accountId);
      }
      return;
    }

    // Failure: only count auth-like errors — thread locks etc. are per-recipient.
    if (!errText || !looksLikeAuthError(errText)) return;
    const { data } = await db
      .from('meta_accounts')
      .select('id, org_id, platform, ig_user_id, page_id, username, page_name, access_token, consecutive_send_failures, health_status, last_health_alert_at')
      .eq('id', accountId).maybeSingle();
    if (!data) return;
    const acct = data as Account;
    const failures = (acct.consecutive_send_failures ?? 0) + 1;
    const nowUnhealthy = failures >= FAILURE_THRESHOLD && acct.health_status === 'ok';
    await db.from('meta_accounts').update({
      consecutive_send_failures: failures,
      ...(nowUnhealthy ? { health_status: 'sends_failing' } : {}),
    }).eq('id', accountId);
    if (nowUnhealthy) {
      log(`account @${acct.username ?? acct.page_name}: ${failures} consecutive auth-like send failures — alerting`);
      await maybeAlert({ ...acct, health_status: 'sends_failing' }, `${failures} consecutive DM sends failed with an auth error`);
    }
  } catch (e) {
    log('recordSendOutcome error', e instanceof Error ? e.message : String(e));
  }
}

let running = false;

// Validity ping loop — catches hard token death even with no send traffic.
export async function checkTokenHealth(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const { data: accounts, error } = await db
      .from('meta_accounts')
      .select('id, org_id, platform, ig_user_id, page_id, username, page_name, access_token, consecutive_send_failures, health_status, last_health_alert_at')
      .eq('status', 'active');
    if (error) { log('load accounts failed', error.message); return; }

    for (const acct of (accounts ?? []) as Account[]) {
      const isFb = acct.platform === 'facebook';
      const host = isFb ? 'graph.facebook.com' : 'graph.instagram.com';
      try {
        const r = await fetch(`https://${host}/${ENV.META_GRAPH_VERSION}/me?access_token=${encodeURIComponent(acct.access_token)}`);
        const body = await r.text();
        if (r.ok) {
          if (acct.health_status === 'token_dead') {
            await db.from('meta_accounts').update({ health_status: 'ok', consecutive_send_failures: 0 }).eq('id', acct.id);
            log(`token for @${acct.username ?? acct.page_name} valid again`);
            await sendAlertEmail(acct, 'recovered');
          }
          continue;
        }
        if (looksLikeAuthError(body) || body.includes('"code":190')) {
          if (acct.health_status !== 'token_dead') {
            await db.from('meta_accounts').update({ health_status: 'token_dead' }).eq('id', acct.id);
            log(`token DEAD for @${acct.username ?? acct.page_name}: ${body.slice(0, 120)}`);
          }
          await maybeAlert({ ...acct, health_status: 'token_dead' }, 'the access token is invalid (validity ping failed)');
        }
      } catch {
        // Network blips aren't token problems — skip.
      }
    }
  } finally {
    running = false;
  }
}

// Alert at most once per account per hour.
async function maybeAlert(acct: Account, reason: string): Promise<void> {
  const last = acct.last_health_alert_at ? Date.parse(acct.last_health_alert_at) : 0;
  if (Date.now() - last < 3_600_000) return;
  await db.from('meta_accounts').update({ last_health_alert_at: new Date().toISOString() }).eq('id', acct.id);
  await sendAlertEmail(acct, 'down', reason);
}

async function sendAlertEmail(acct: Account, kind: 'down' | 'recovered', reason?: string): Promise<void> {
  if (!ENV.RESEND_API_KEY) { log('RESEND_API_KEY not set — skipping email alert'); return; }
  const name = acct.username ? `@${acct.username}` : (acct.page_name ?? acct.id);
  const platform = acct.platform === 'facebook' ? 'Facebook Page' : 'Instagram';
  const subject = kind === 'down'
    ? `⚠️ Synapse: ${name} (${platform}) can't send messages`
    : `✅ Synapse: ${name} (${platform}) is sending again`;
  const html = kind === 'down'
    ? `<p><b>${name}</b> (${platform}) stopped sending messages.</p>
       <p>Reason: ${reason ?? 'unknown'}.</p>
       <p>Until it's fixed, leads are not receiving automated replies on this account.</p>
       <p><b>Fix:</b> open <a href="${ENV.APP_URL}/settings">Synapse → Settings → Connections</a> and reconnect the account (takes ~30 seconds).</p>`
    : `<p><b>${name}</b> (${platform}) recovered — messages are sending again. No action needed.</p>`;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ENV.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'Synapse Alerts <onboarding@resend.dev>',
        to: [ENV.ALERT_EMAIL],
        subject,
        html,
      }),
    });
    if (!r.ok) log('alert email failed', r.status, (await r.text()).slice(0, 200));
    else log(`alert email sent (${kind}) for ${name}`);
  } catch (e) {
    log('alert email error', e instanceof Error ? e.message : String(e));
  }
}
