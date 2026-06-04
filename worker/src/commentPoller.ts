// Comment polling backstop.
//
// Instagram's `comments` webhook is not 100% reliable — some posts silently
// never fire webhooks (confirmed in production: identical posts, one delivers,
// one delivers nothing). This poller closes that gap: every few minutes it reads
// recent posts' comments via the Graph API and feeds any keyword comment the
// webhook missed through the exact same handler (handleEvent), which dedups
// against already-processed comments and runs the normal reply + DM flow.

import { db } from './db.js';
import { ENV } from './env.js';
import { handleEvent, type Normalized } from './processWebhook.js';

type Account = { id: string; org_id: string; ig_user_id: string | null; access_token: string };
type IgComment = { id: string; text?: string; timestamp?: string; from?: { id?: string; username?: string } };
type IgMedia = { id: string; media_product_type?: string; timestamp?: string; comments_count?: number };

const G = () => `https://graph.instagram.com/${ENV.META_GRAPH_VERSION}`;

function log(...args: unknown[]) { console.log('[comment-poll]', ...args); }

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Whole-word keyword match (matches runAutomation's keyword logic).
function matchesAnyKeyword(text: string | undefined, terms: string[]): boolean {
  if (terms.length === 0) return false;
  const t = (text ?? '').toLowerCase();
  return terms.some((term) => new RegExp(`\\b${escapeRegex(term)}\\b`).test(t));
}

// Collect all comment-keyword trigger terms across the org's live automations.
async function keywordsForOrg(orgId: string): Promise<string[]> {
  const { data } = await db.from('automations').select('graph').eq('org_id', orgId).eq('status', 'live');
  const terms = new Set<string>();
  for (const a of data ?? []) {
    const nodes = ((a.graph as { nodes?: Array<{ kind?: string; type?: string; config?: { contains?: string } }> })?.nodes) ?? [];
    for (const n of nodes) {
      if (n.kind === 'trigger' && n.type === 'comment_keyword' && n.config?.contains) {
        for (const part of n.config.contains.split(',')) {
          const k = part.trim().toLowerCase();
          if (k) terms.add(k);
        }
      }
    }
  }
  return [...terms];
}

async function igGet<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) { log('graph GET failed', r.status, (await r.text()).slice(0, 160)); return null; }
    return await r.json() as T;
  } catch (e) {
    log('graph GET error', e instanceof Error ? e.message : String(e));
    return null;
  }
}

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

let running = false;

export async function pollComments(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const { data: accounts, error } = await db
      .from('meta_accounts')
      .select('id, org_id, ig_user_id, access_token')
      .eq('status', 'active')
      .not('ig_user_id', 'is', null);
    if (error) { log('load accounts failed', error.message); return; }

    const cutoffMs = Date.now() - ENV.COMMENT_POLL_LOOKBACK_HOURS * 3_600_000;
    let handledThisCycle = 0;

    for (const acct of (accounts ?? []) as Account[]) {
      if (handledThisCycle >= ENV.COMMENT_POLL_MAX_PER_CYCLE) break;
      const igId = acct.ig_user_id!;
      const terms = await keywordsForOrg(acct.org_id);
      if (terms.length === 0) continue; // no comment automations → nothing to poll

      const mediaResp = await igGet<{ data?: IgMedia[] }>(
        `${G()}/${igId}/media?fields=id,media_product_type,timestamp,comments_count&limit=${ENV.COMMENT_POLL_MEDIA_LIMIT}&access_token=${acct.access_token}`,
      );
      const media = (mediaResp?.data ?? []).filter((m) => (m.comments_count ?? 0) > 0);

      // Gather candidate comments across this account's recent media.
      const candidates: Array<{ c: IgComment; mediaType?: string }> = [];
      for (const m of media) {
        if (candidates.length >= ENV.COMMENT_POLL_MAX_PER_CYCLE * 3) break;
        const commentsResp = await igGet<{ data?: IgComment[] }>(
          `${G()}/${m.id}/comments?fields=id,text,timestamp,from&limit=50&access_token=${acct.access_token}`,
        );
        for (const c of commentsResp?.data ?? []) {
          if (!c.id || !c.from?.id) continue;
          if (c.from.id === igId) continue;                                  // skip the account's own replies
          if (c.timestamp && Date.parse(c.timestamp) < cutoffMs) continue;   // too old
          if (!matchesAnyKeyword(c.text, terms)) continue;                   // not a keyword comment
          candidates.push({ c, mediaType: m.media_product_type });
        }
      }
      if (candidates.length === 0) continue;

      // Dedup: drop comments we've already ingested (webhook or a prior poll).
      const ids = candidates.map((x) => x.c.id);
      const { data: existing } = await db
        .from('messages')
        .select('ig_message_id')
        .eq('org_id', acct.org_id)
        .in('ig_message_id', ids);
      const seen = new Set((existing ?? []).map((r) => r.ig_message_id as string));

      const fresh = candidates.filter((x) => !seen.has(x.c.id));
      if (fresh.length > 0) log(`@${igId}: ${fresh.length} missed keyword comment(s) to backfill`);

      for (const { c, mediaType } of fresh) {
        if (handledThisCycle >= ENV.COMMENT_POLL_MAX_PER_CYCLE) break;
        const ev: Normalized = {
          kind: 'comment', shape: 'changes', pageOrAccountId: igId,
          userId: c.from!.id!, recipientId: igId,
          text: c.text ?? '', mid: c.id, commentId: c.id,
          commentMediaType: mediaType, username: c.from!.username,
          timestamp: c.timestamp ? Date.parse(c.timestamp) : Date.now(),
        };
        try {
          await handleEvent(ev);
          handledThisCycle++;
          await sleep(1200); // pace sends to avoid Instagram spam-flagging / rate limits
        } catch (e) {
          log('handleEvent failed for comment', c.id, e instanceof Error ? e.message : String(e));
        }
      }
    }

    if (handledThisCycle > 0) log(`cycle complete — backfilled ${handledThisCycle} comment(s)`);
  } finally {
    running = false;
  }
}
