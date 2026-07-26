// Flow execution engine. Loads any live automation for the org and walks its
// graph in response to a new inbound message.
//
// Runtime model:
//   - We BFS from each matching trigger node
//   - AI nodes update a shared run context (intent, score, generated reply text)
//   - Condition nodes evaluate against the context and either pass or short-circuit
//   - Action nodes have side effects (send DM via Meta, tag lead, set funnel,
//     mark conversation for human handoff)

import { randomUUID } from 'node:crypto';
import { db } from './db.js';
import { ENV } from './env.js';
import { workerCall } from './anthropic.js';

type FlowNode = {
  id: string;
  kind: 'trigger' | 'ai' | 'condition' | 'action';
  type: string;
  position: { x: number; y: number };
  label: string;
  config: Record<string, unknown>;
};
type FlowEdge = { id: string; source: string; target: string; branch?: string };
type FlowGraph = { nodes: FlowNode[]; edges: FlowEdge[] };

/** What kind of inbound event kicked off this run. Triggers match against it. */
type EventKind = 'dm' | 'comment' | 'postback';

type RunContext = {
  orgId: string;
  conversationId: string;
  accountId: string;
  accountIgUserId: string;
  accountToken: string;
  accountUsername: string | null;
  /** 'instagram' (Instagram Login) or 'facebook' (Facebook Page connect). Decides
   *  which Graph host + id we send through. Defaults to instagram. */
  accountPlatform?: string;
  /** Facebook Page id — present for platform 'facebook'; send target host id. */
  accountPageId?: string | null;
  leadIgUserId: string;
  messageText: string;
  transcript: string;
  /** Org's master doc — appended to every AI system prompt. */
  brainMd: string;

  /** Inbound event kind. 'dm' = a normal DM, 'comment' = a post/reel comment,
   *  'postback' = the lead tapped a button we sent. Defaults to 'dm'. */
  eventKind: EventKind;
  /** For 'postback' events: the payload of the button the lead tapped. */
  postbackPayload?: string;
  /** For 'comment' events: the comment id, used to send the first reply as a
   *  private reply (recipient: { comment_id }), and to post a public comment reply. */
  commentId?: string;
  /** For 'comment' events: the media type the comment is on (FEED | REELS | ...). */
  commentMediaType?: string;
  /** For 'comment' events: the id of the post/reel the comment is on (for linking). */
  commentMediaId?: string;
  /** The commenter's / lead's handle, when known (for moderation display). */
  leadUsername?: string | null;

  // Filled by the moderate_comment AI node.
  commentSentiment?: 'positive' | 'negative' | 'neutral';
  commentLanguage?: string;
  commentTranslation?: string;
  commentReason?: string;
  /** True when the inbound DM is a reply to one of the account's stories. */
  isStoryReply?: boolean;
  /** Whether the lead follows the business. Undefined = unknown. Used to decide
   *  whether to add a "check your message requests" note on public comment replies. */
  userFollowsBusiness?: boolean;
  /** True when this is the lead's very first interaction (no prior messages).
   *  Lets a flow branch: first-timers get the full keyword flow, returning
   *  leads get a normal AI reply instead of re-running it. */
  isFirstContact: boolean;

  // Send bookkeeping: whether a DM was attempted this run and whether it landed.
  // A public comment reply ("check your DMs") is skipped if the DM didn't send.
  dmAttempted?: boolean;
  dmOk?: boolean;

  // Filled by AI/condition nodes
  intent?: string;
  intentConfidence?: number;
  sentiment?: 'hot' | 'warm' | 'cold';
  leadScore?: number;
  generatedReply?: string;
};

export async function runAutomationForMessage(
  input: Omit<RunContext, 'intent' | 'sentiment' | 'leadScore' | 'generatedReply' | 'intentConfidence' | 'eventKind' | 'isFirstContact'> & {
    brainMd?: string;
    eventKind?: EventKind;
    isFirstContact?: boolean;
    isStoryReply?: boolean;
    userFollowsBusiness?: boolean;
    commentMediaType?: string;
  },
) {
  // Pull all live automations for the org. We run *all* of them in series.
  const { data: automations, error } = await db
    .from('automations')
    .select('id, name, graph')
    .eq('org_id', input.orgId)
    .eq('status', 'live');
  if (error) {
    console.error('load automations failed', error);
    return;
  }
  if (!automations || automations.length === 0) return;

  const brainMd = input.brainMd ?? '';
  const eventKind: EventKind = input.eventKind ?? 'dm';
  const isFirstContact = input.isFirstContact ?? false;
  for (const a of automations) {
    const graph = (a.graph as FlowGraph) ?? { nodes: [], edges: [] };
    if (!graph.nodes?.length) continue;
    try {
      await runGraph(graph, { ...input, brainMd, eventKind, isFirstContact } as RunContext, a.id, a.name);
    } catch (e) {
      console.error(`automation ${a.id} (${a.name}) failed`, e);
    }
  }
}

async function runGraph(graph: FlowGraph, ctx: RunContext, automationId: string, automationName: string) {
  // Find trigger nodes that match this event (kind + filters).
  const triggers = graph.nodes.filter((n) => n.kind === 'trigger' && triggerMatchesEvent(n, ctx));
  if (triggers.length === 0) return;

  for (const trigger of triggers) {
    await traverse(graph, trigger.id, ctx, new Set(), automationId, automationName);
  }
}

// Keyword filter. `contains` may be a single term or comma-separated terms
// ("START, VIDEO, TRAINING") — matches if ANY term appears as a WHOLE WORD
// (case-insensitive), so "AI" matches "AI" but not "again" or "email".
// Punctuation around the word is fine (word boundaries). Empty = match all.
function keywordMatches(node: FlowNode, text: string): boolean {
  const raw = (node.config.contains as string | undefined)?.trim();
  if (!raw) return true; // empty = match all
  return keywordListMatches(raw, text);
}

// True if ANY comma-separated term in `raw` appears as a whole word in `text`.
// Empty/undefined `raw` returns false (nothing to match).
function keywordListMatches(raw: string | undefined, text: string): boolean {
  const terms = (raw ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (terms.length === 0) return false;
  const t = (text ?? '').toLowerCase();
  return terms.some((term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`).test(t);
  });
}

// Optional per-trigger platform filter: skip the trigger when its config.platform
// is set to a specific platform ('instagram' | 'facebook') and doesn't match the
// current event's account. Undefined / 'any' = fire on either platform.
function platformMatches(node: FlowNode, ctx: RunContext): boolean {
  const want = (node.config.platform as string | undefined)?.toLowerCase();
  if (!want || want === 'any') return true;
  const actual = (ctx.accountPlatform ?? 'instagram').toLowerCase();
  return want === actual;
}

function triggerMatchesEvent(node: FlowNode, ctx: RunContext): boolean {
  if (!platformMatches(node, ctx)) return false;
  switch (node.type) {
    case 'new_dm':
      // from_handles filter — would need lead username; skip for v1
      return ctx.eventKind === 'dm' && keywordMatches(node, ctx.messageText);
    case 'comment_keyword': {
      if (ctx.eventKind !== 'comment' || !keywordMatches(node, ctx.messageText)) return false;
      // Exclude keywords: skip comments already handled by a keyword flow.
      if (keywordListMatches(node.config.exclude as string | undefined, ctx.messageText)) return false;
      const media = (node.config.media as string | undefined) ?? 'any';
      if (media === 'any') return true;
      const isReel = (ctx.commentMediaType ?? '').toUpperCase() === 'REELS';
      return media === 'reel' ? isReel : !isReel; // 'post' = anything that is not a reel
    }
    case 'button_click': {
      if (ctx.eventKind !== 'postback') return false;
      const want = (node.config.payload as string | undefined)?.trim();
      // No payload configured → match any button tap. Otherwise exact match.
      return !want || want === (ctx.postbackPayload ?? '').trim();
    }
    case 'story_reply':
      // Story replies arrive as DMs flagged with isStoryReply.
      return ctx.eventKind === 'dm' && ctx.isStoryReply === true && keywordMatches(node, ctx.messageText);
    default:
      return false;
  }
}

async function traverse(graph: FlowGraph, startId: string, ctx: RunContext, visited: Set<string>, automationId: string, automationName: string) {
  if (visited.has(startId)) return;
  visited.add(startId);

  const node = graph.nodes.find((n) => n.id === startId);
  if (!node) return;

  // Execute the node. Some nodes are decision points and may say "stop".
  let proceed = true;
  let preferredBranch: string | null = null;
  try {
    const result = await executeNode(node, ctx);
    proceed = result.proceed;
    preferredBranch = result.branch ?? null;
  } catch (e) {
    console.error(`node ${node.id} (${node.kind}/${node.type}) failed`, e);
    return;
  }
  if (!proceed) return;

  // Walk children. If preferredBranch is set, only follow edges with matching branch label
  // (and edges with no branch label as fallback).
  const out = graph.edges.filter((e) => e.source === startId);
  const filtered = preferredBranch
    ? out.filter((e) => !e.branch || e.branch === preferredBranch)
    : out;

  for (const edge of filtered) {
    await traverse(graph, edge.target, ctx, visited, automationId, automationName);
  }
}

async function executeNode(node: FlowNode, ctx: RunContext): Promise<{ proceed: boolean; branch?: string }> {
  if (node.kind === 'trigger') return { proceed: true };

  if (node.kind === 'ai') {
    if (node.type === 'classify_intent') {
      return aiClassify(node, ctx);
    }
    if (node.type === 'generate_reply') {
      return aiGenerateReply(node, ctx);
    }
    if (node.type === 'moderate_comment') {
      return aiModerateComment(node, ctx);
    }
    if (node.type === 'score_lead') {
      // score is already produced by the upstream classify (we re-use)
      return { proceed: true };
    }
    if (node.type === 'tag') {
      // best-effort auto-tag based on intent already present
      if (ctx.intent) await appendTag(ctx, ctx.intent);
      return { proceed: true };
    }
    return { proceed: true };
  }

  if (node.kind === 'condition') {
    return evaluateCondition(node, ctx);
  }

  if (node.kind === 'action') {
    if (node.type === 'send_dm') return actionSendDm(node, ctx);
    if (node.type === 'send_buttons') return actionSendButtons(node, ctx);
    if (node.type === 'send_link_button') return actionSendLinkButton(node, ctx);
    if (node.type === 'reply_comment') return actionReplyComment(node, ctx);
    if (node.type === 'flag_comment') return actionFlagComment(node, ctx);
    if (node.type === 'follow_up') return actionFollowUp(node, ctx);
    if (node.type === 'send_link') return actionSendLink(node, ctx);
    if (node.type === 'add_tag') return actionAddTag(node, ctx);
    if (node.type === 'set_funnel') return actionSetFunnel(node, ctx);
    if (node.type === 'handoff_human') return actionHandoff(node, ctx);
  }

  return { proceed: true };
}

// Hard voice rules enforced in code (models ignore soft rules in a long doc):
//  - em/en dash: spaced → sentence break, inline → hyphen (no commas introduced)
//  - "bro" / "bruh" → gender-neutral term
//  - capitalize the first letter of the message
// Keep in sync with lib/text.ts sanitizeReply.
const NEUTRAL_TERM = 'friend';
export function sanitizeReply(s: string): string {
  let out = s
    .replace(/\s*[—–]\s*/g, (m) => (/\s/.test(m) ? '. ' : '-'))
    .replace(/\bbro\b/gi, NEUTRAL_TERM)
    .replace(/\bbruh\b/gi, NEUTRAL_TERM)
    .replace(/\.\s*\.\s*/g, '. ')
    .trim();
  const i = out.search(/[A-Za-z]/);
  if (i >= 0 && out[i] >= 'a' && out[i] <= 'z') {
    out = out.slice(0, i) + out[i].toUpperCase() + out.slice(i + 1);
  }
  return out;
}

// ─── AI nodes ────────────────────────────────────────────────────────────────

async function aiClassify(node: FlowNode, ctx: RunContext): Promise<{ proceed: boolean }> {
  const classes = (node.config.classes as string[] | undefined) ?? ['purchase', 'objection', 'question', 'spam'];
  const minConf = (node.config.confidence as number | undefined) ?? 0.7;
  const brainBlock = ctx.brainMd.trim() ? `\n\nMASTER DOC (authoritative — follow these rules):\n${ctx.brainMd.trim()}\n` : '';

  const r = await workerCall({
    orgId: ctx.orgId,
    purpose: 'classify',
    relatedId: ctx.conversationId,
    cacheSystem: true,
    system:
      `Classify Instagram DM intent for @${ctx.accountUsername ?? 'brand'}. ` +
      `Return STRICT JSON: {"intent":<one of: ${classes.join(' | ')} | other>,"confidence":0-1,"sentiment":"hot"|"warm"|"cold","lead_score":0-100}. No markdown, no prose.${brainBlock}`,
    userMessage: ctx.transcript,
    maxTokens: 150,
    temperature: 0.1,
  });
  const cleaned = r.text.trim().replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '');
  try {
    const p = JSON.parse(cleaned) as { intent?: string; confidence?: number; sentiment?: 'hot' | 'warm' | 'cold'; lead_score?: number };
    ctx.intent = p.intent;
    ctx.intentConfidence = p.confidence;
    ctx.sentiment = p.sentiment;
    ctx.leadScore = p.lead_score;
    if ((p.confidence ?? 0) < minConf) {
      // low-confidence: still proceed, but downstream conditions can drop it
    }
  } catch (e) {
    console.error('classify parse failed', e, cleaned);
  }
  return { proceed: true };
}

// Word-set (Jaccard) similarity, used as a backstop against the bot sending the
// same question/message twice. URLs and punctuation are ignored.
function normalizeForCompare(s: string): string {
  return s.toLowerCase().replace(/https?:\/\/\S+/g, ' ').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function jaccardSimilarity(a: string, b: string): number {
  const A = new Set(normalizeForCompare(a).split(' ').filter(Boolean));
  const B = new Set(normalizeForCompare(b).split(' ').filter(Boolean));
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter);
}
const REPEAT_THRESHOLD = 0.6;

async function aiGenerateReply(node: FlowNode, ctx: RunContext): Promise<{ proceed: boolean }> {
  const goal = (node.config.goal as string | undefined) ?? 'Reply concisely with a single clear next step.';
  const voice = (node.config.voice as string | undefined) ?? 'warm, direct';
  const extra = (node.config.system_prompt as string | undefined) ?? '';
  // Master doc is included by default; opt-out by setting use_master_doc:false on the node
  const useMasterDoc = node.config.use_master_doc !== false;
  const brainBlock = useMasterDoc && ctx.brainMd.trim() ? `\n\nMASTER DOC (authoritative — follow these rules):\n${ctx.brainMd.trim()}\n` : '';

  // Recent outbound messages (newest first) — used to reject near-duplicate replies.
  const { data: recentUs } = await db
    .from('messages')
    .select('text')
    .eq('conversation_id', ctx.conversationId)
    .eq('sender', 'us')
    .order('sent_at', { ascending: false })
    .limit(5);
  const priorBot = (recentUs ?? []).map((m) => m.text as string).filter(Boolean);

  // Reply in the commenter's language when moderate_comment detected a non-English one.
  const langLine = ctx.commentLanguage && ctx.commentLanguage.toLowerCase() !== 'english'
    ? ` Reply in the same language as the person you are replying to (${ctx.commentLanguage}).`
    : '';
  const channel = ctx.accountPlatform === 'facebook' ? 'Facebook' : 'Instagram';

  // Generate, and if the result is too similar to something we already sent, retry
  // with an explicit anti-repeat instruction and higher temperature (up to 3 tries).
  let reply = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    const antiRepeat = attempt === 0 ? '' :
      `\nIMPORTANT: Your previous draft was too similar to a message you already sent. Do NOT repeat yourself and do NOT re-ask a question you already asked. Acknowledge their latest message in a few words, then move the conversation forward with something new.`;
    const r = await workerCall({
      orgId: ctx.orgId,
      purpose: 'reply',
      relatedId: ctx.conversationId,
      cacheSystem: true,
      system:
        `You are Synapse, replying as @${ctx.accountUsername ?? 'brand'} on ${channel}. ` +
        `Voice: ${voice}. Goal: ${goal}.${langLine} Output ONLY the reply text, 1-3 sentences max, no quotes, no markdown. ` +
        (extra ? `\n${extra}` : '') + antiRepeat +
        brainBlock,
      userMessage: `Recent conversation:\n${ctx.transcript}\n\nWrite the next reply as the brand:`,
      maxTokens: 200,
      temperature: attempt === 0 ? 0.7 : 0.9,
    });
    reply = sanitizeReply(r.text.trim());
    const dup = priorBot.some((p) => jaccardSimilarity(reply, p) >= REPEAT_THRESHOLD);
    if (!dup) break;
    console.warn(`generate_reply: near-duplicate of a prior message (attempt ${attempt + 1}/3), regenerating`);
  }
  ctx.generatedReply = reply;
  return { proceed: true };
}

// Read a single public comment: detect language, translate to English, and
// classify sentiment as positive / negative / neutral. Stores results on ctx for
// downstream if_sentiment branching, language-aware replies, and moderation flags.
async function aiModerateComment(_node: FlowNode, ctx: RunContext): Promise<{ proceed: boolean }> {
  const text = (ctx.messageText ?? '').trim();
  ctx.commentSentiment = 'neutral'; // safe default: no reply, no flag
  if (!text || !ENV.ANTHROPIC_API_KEY) return { proceed: true };
  try {
    const r = await workerCall({
      orgId: ctx.orgId,
      purpose: 'classify',
      relatedId: ctx.conversationId,
      cacheSystem: true,
      system:
        `You analyze ONE public comment left on a social media post. The comment may be in any language. ` +
        `Return STRICT JSON only: {"language":"<English name of the comment's language>","translation":"<comment translated to English>","sentiment":"positive"|"negative"|"neutral","reason":"<short reason>"}. ` +
        `"positive" = genuinely kind, supportive, appreciative, or thoughtful. ` +
        `"negative" = insulting, hateful, abusive, trolling, scam/spam, or hostile. ` +
        `"neutral" = everything else (questions, plain statements, emojis, tags, vague). ` +
        `No markdown, no text outside the JSON.`,
      userMessage: `Comment:\n${text}`,
      maxTokens: 300,
      temperature: 0.1,
    });
    const cleaned = r.text.trim().replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '');
    const parsed = JSON.parse(cleaned) as { language?: string; translation?: string; sentiment?: string; reason?: string };
    ctx.commentLanguage = parsed.language ?? 'English';
    ctx.commentTranslation = parsed.translation ?? text;
    ctx.commentReason = parsed.reason ?? '';
    const s = (parsed.sentiment ?? 'neutral').toLowerCase();
    ctx.commentSentiment = s === 'positive' || s === 'negative' ? s : 'neutral';
    console.log(`moderate_comment: sentiment=${ctx.commentSentiment} lang=${ctx.commentLanguage}`);
  } catch (e) {
    console.error('moderate_comment failed', e instanceof Error ? e.message : String(e));
  }
  return { proceed: true };
}

// ─── Condition nodes ─────────────────────────────────────────────────────────

async function evaluateCondition(node: FlowNode, ctx: RunContext): Promise<{ proceed: boolean; branch?: string }> {
  if (node.type === 'if_intent') {
    const target = (node.config.intent as string | undefined)?.trim().toLowerCase();
    const matches = !!target && ctx.intent?.toLowerCase() === target;
    return { proceed: matches };
  }
  if (node.type === 'if_score_gt') {
    const threshold = (node.config.threshold as number | undefined) ?? 70;
    const score = ctx.leadScore ?? 0;
    return { proceed: score > threshold };
  }
  if (node.type === 'if_contains') {
    const needle = (node.config.contains as string | undefined)?.toLowerCase();
    return { proceed: !!needle && ctx.messageText.toLowerCase().includes(needle) };
  }
  if (node.type === 'if_first_contact') {
    return { proceed: ctx.isFirstContact === true };
  }
  if (node.type === 'if_returning') {
    return { proceed: ctx.isFirstContact === false };
  }
  if (node.type === 'if_sentiment') {
    const target = (node.config.sentiment as string | undefined)?.trim().toLowerCase();
    return { proceed: !!target && ctx.commentSentiment === target };
  }
  if (node.type === 'else') {
    // "else" always continues — graph authors put it on a parallel branch from
    // a classifier so it acts as the fallback when no other condition matches.
    return { proceed: true };
  }
  return { proceed: true };
}

// ─── Action nodes ────────────────────────────────────────────────────────────

type IgQuickReply = { content_type: 'text'; title: string; payload: string };
type IgWebUrlButton = { type: 'web_url'; url: string; title: string };
type IgGenericElement = {
  title: string;
  subtitle?: string;
  image_url?: string;
  default_action?: { type: 'web_url'; url: string };
  buttons?: IgWebUrlButton[];
};
type IgTemplateAttachment = {
  type: 'template';
  payload: { template_type: 'generic'; elements: IgGenericElement[] };
};
type IgMessagePayload = {
  text?: string;
  quick_replies?: IgQuickReply[];
  attachment?: IgTemplateAttachment;
};

// Send a message object to the lead via the Meta API and persist it as an 'us'
// message. When this run was triggered by a comment, the first message is sent
// as a private reply (recipient: { comment_id }); otherwise it goes to the
// lead's IG-scoped id.
// Take over the conversation thread from the Instagram inbox / another app, so we
// can send. Needed when a message arrived via the handover-protocol standby channel
// (we're not the thread owner). Best-effort: returns true if control was taken.
// Base Graph URL for sending. Facebook Page connections send through
// graph.facebook.com/{page_id}; Instagram Login through graph.instagram.com/{ig_user_id}.
function sendBase(ctx: RunContext): string {
  if (ctx.accountPlatform === 'facebook' && ctx.accountPageId) {
    return `https://graph.facebook.com/${ENV.META_GRAPH_VERSION}/${ctx.accountPageId}`;
  }
  return `https://graph.instagram.com/${ENV.META_GRAPH_VERSION}/${ctx.accountIgUserId}`;
}

// Look up the Facebook Page in the same org whose linked IG matches this account.
// take_thread_control is a Page-only endpoint that must be called against
// graph.facebook.com with a Page token — calling it via graph.instagram.com with
// the IG-Login token fails with error_subcode 33 ("does not support this operation").
async function getPageForLinkedIg(ctx: RunContext): Promise<{ pageId: string; token: string } | null> {
  if (ctx.accountPlatform === 'facebook' && ctx.accountPageId) {
    return { pageId: ctx.accountPageId, token: ctx.accountToken };
  }
  if (!ctx.accountUsername) return null;
  const { data, error } = await db
    .from('meta_accounts')
    .select('page_id, access_token, meta')
    .eq('org_id', ctx.orgId)
    .eq('platform', 'facebook')
    .not('page_id', 'is', null)
    .ilike('meta->>ig_username', ctx.accountUsername)
    .limit(1)
    .maybeSingle();
  if (error) { console.error('linked page lookup error', error.message); return null; }
  if (!data?.page_id || !data.access_token) return null;
  return { pageId: data.page_id, token: data.access_token };
}

async function takeThreadControl(ctx: RunContext): Promise<boolean> {
  try {
    const page = await getPageForLinkedIg(ctx);
    if (!page) {
      console.warn(`take_thread_control: no linked Facebook Page for @${ctx.accountUsername ?? '?'} — connect the Page to unlock handover`);
      return false;
    }
    const url = `https://graph.facebook.com/${ENV.META_GRAPH_VERSION}/${page.pageId}/take_thread_control?access_token=${encodeURIComponent(page.token)}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { id: ctx.leadIgUserId } }),
    });
    if (!r.ok) {
      console.error('take_thread_control failed', r.status, await r.text());
      return false;
    }
    console.log('took thread control for', ctx.leadIgUserId);
    return true;
  } catch (e) {
    console.error('take_thread_control error', e);
    return false;
  }
}

// Rewrite UTM/tracking params in outbound text when sending via Facebook so
// instagram-tagged links report as facebook-tagged. Flows author links once with
// `el=instagram-*` / `utm_source=instagram-*`; for FB sends we swap "instagram"
// to "facebook" so the destination's analytics sees the right channel.
//
// FB collapses post + reel into a single `feed` webhook, so the worker can't
// tell from the event whether the parent media is a post or a reel. As a
// pragmatic proxy we use the inbound keyword: if the comment text contains
// "VIDEO" (whole word, case-insensitive), treat it as a reel — rewriting any
// `-post` UTM tag to `-reel`. Other keywords keep the default (post).
function adaptLinkPlatform(text: string, ctx: RunContext): string {
  if (ctx.accountPlatform !== 'facebook' || !text) return text;
  let out = text
    .replace(/(\bel=)instagram-/g, '$1facebook-')
    .replace(/(\butm_source=)instagram-/g, '$1facebook-')
    .replace(/(\butm_medium=)instagram\b/g, '$1facebook');
  if (/\bvideo\b/i.test(ctx.messageText ?? '')) {
    out = out
      .replace(/(\bel=)facebook-post\b/g, '$1facebook-reel')
      .replace(/(\butm_source=)facebook-post\b/g, '$1facebook-reel');
  }
  return out;
}

async function sendIgMessage(ctx: RunContext, message: IgMessagePayload, persistText: string): Promise<void> {
  ctx.dmAttempted = true;
  ctx.dmOk = false;
  // Platform-aware UTM rewriting: instagram-tagged links → facebook-tagged
  // when sending via the FB Page connection. Applies to plain-text links AND
  // template attachment button URLs (send_link_button).
  if (message.text) message = { ...message, text: adaptLinkPlatform(message.text, ctx) };
  if (message.attachment) {
    const els = message.attachment.payload.elements.map((el) => ({
      ...el,
      default_action: el.default_action
        ? { ...el.default_action, url: adaptLinkPlatform(el.default_action.url, ctx) }
        : el.default_action,
      buttons: el.buttons?.map((b) => ({ ...b, url: adaptLinkPlatform(b.url, ctx) })),
    }));
    message = { ...message, attachment: { ...message.attachment, payload: { ...message.attachment.payload, elements: els } } };
  }
  persistText = adaptLinkPlatform(persistText, ctx);
  const recipient = ctx.eventKind === 'comment' && ctx.commentId
    ? { comment_id: ctx.commentId }
    : { id: ctx.leadIgUserId };
  const url = `${sendBase(ctx)}/messages`;
  const post = () => fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ctx.accountToken}` },
    body: JSON.stringify({ recipient, message }),
  });
  try {
    let r = await post();
    if (!r.ok) {
      const errText = await r.text();
      // Handover protocol: we're not the thread owner. Take control and retry once.
      // (Only possible for id-recipients, not comment_id private replies.)
      const isLockError =
        errText.includes('2534037') ||
        errText.includes('2534048') ||
        errText.toLowerCase().includes('not the thread owner');
      if ('id' in recipient && isLockError) {
        console.warn('send blocked (not thread owner) — attempting take_thread_control');
        if (await takeThreadControl(ctx)) {
          r = await post();
        }
      }
      if (!r.ok) {
        console.error('send message meta call failed', r.status, r.ok ? '' : errText);
        // Lock-bound failure for a direct DM (not a comment private reply): schedule
        // retries. Most inbox locks self-release within 24h; one of the retries lands.
        if ('id' in recipient && isLockError && persistText.trim()) {
          await scheduleSendRetry(ctx, persistText);
        }
        return;
      }
    }
    ctx.dmOk = true;
    const j = await r.json() as { message_id?: string };

    await db.from('messages').insert({
      org_id: ctx.orgId,
      conversation_id: ctx.conversationId,
      ig_message_id: j.message_id ?? null,
      sender: 'us',
      text: persistText,
      sent_at: new Date().toISOString(),
      ai_meta: { auto: true, automation: true, ...(message.quick_replies ? { buttons: message.quick_replies.map((q) => q.title) } : {}) },
    });
    await db.from('conversations').update({
      last_message_at: new Date().toISOString(),
      next_action: null,
      unread_count: 0,
    }).eq('id', ctx.conversationId);
  } catch (e) {
    console.error('send message failed', e);
  }
}

// Schedule retries of a failed-due-to-thread-lock send. Most inbox locks
// self-release within 24h (handover protocol auto-timeout). Step intervals:
// +15m, +1h, +6h, +24h. cancel_on_reply=false so the lead replying mid-window
// doesn't kill the retry — they still need the link they originally asked for.
// Replaces any pending retries for the same conversation.
const RETRY_DELAYS_MINUTES = [15, 60, 360, 1440];

async function scheduleSendRetry(ctx: RunContext, persistText: string): Promise<void> {
  try {
    // Drop any prior pending retries for this conversation — keyword sends are
    // idempotent (always the same link), so we don't want two waves stacking up.
    await db.from('scheduled_followups')
      .update({ status: 'cancelled' })
      .eq('conversation_id', ctx.conversationId)
      .eq('mode', 'retry')
      .eq('status', 'pending');

    const sequenceId = randomUUID();
    const referenceAt = new Date().toISOString();
    const rows = RETRY_DELAYS_MINUTES.map((mins, idx) => ({
      org_id: ctx.orgId,
      conversation_id: ctx.conversationId,
      account_id: ctx.accountId,
      lead_ig_user_id: ctx.leadIgUserId,
      sequence_id: sequenceId,
      step: idx + 1,
      reference_at: referenceAt,
      due_at: new Date(Date.now() + mins * 60_000).toISOString(),
      mode: 'retry',
      goal: null as string | null,
      variants: [persistText],
      use_master_doc: false,
      cancel_on_reply: false,
      status: 'pending',
    }));
    const { error } = await db.from('scheduled_followups').insert(rows);
    if (error) console.error('scheduleSendRetry insert error', error.message);
    else console.log(`scheduled ${rows.length} send retries for conv ${ctx.conversationId.slice(0, 8)} (lock recovery)`);
  } catch (e) {
    console.error('scheduleSendRetry threw', e instanceof Error ? e.message : String(e));
  }
}

// Pick a message to send: a random variant if any are configured (anti-spam
// rotation), otherwise the single static text.
function pickVariant(config: Record<string, unknown>): string {
  const variants = Array.isArray(config.variants)
    ? (config.variants as unknown[]).filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    : [];
  if (variants.length > 0) return variants[Math.floor(Math.random() * variants.length)].trim();
  return ((config.text as string | undefined) ?? '').trim();
}

async function actionSendDm(node: FlowNode, ctx: RunContext): Promise<{ proceed: boolean }> {
  const text = pickVariant(node.config) || ctx.generatedReply;
  if (!text) {
    console.warn('send_dm: no text to send (no variants, no static text, no generated reply)');
    return { proceed: true };
  }
  await sendIgMessage(ctx, { text }, text);
  return { proceed: true };
}

// Post a PUBLIC reply to the comment that triggered this run (visible on the
// post/reel), distinct from the private DM. If the lead does not follow the
// business, append a "check your message requests" note so they find the DM.
async function actionReplyComment(node: FlowNode, ctx: RunContext): Promise<{ proceed: boolean }> {
  if (!ctx.commentId) {
    console.warn('reply_comment: no comment id on this event — skipping');
    return { proceed: true };
  }
  // Don't post a public "check your DMs" reply if we tried to DM and it failed —
  // otherwise we tell people to check a DM that never arrived.
  if (ctx.dmAttempted && ctx.dmOk === false) {
    console.warn('reply_comment: skipped — the DM did not send, so no public reply');
    return { proceed: true };
  }
  let text = pickVariant(node.config) || ctx.generatedReply || '';
  if (!text) return { proceed: true };
  // Only nudge them to their DMs if this run actually sent one (e.g. the WEBINAR
  // flow). A standalone comment reply with no DM should not say "check your DMs".
  if (ctx.dmAttempted && ctx.userFollowsBusiness === false) text = `${text} (check your message requests)`;
  try {
    // IG public comment replies: POST /{comment-id}/replies. Facebook: POST /{comment-id}/comments.
    const url = ctx.accountPlatform === 'facebook'
      ? `https://graph.facebook.com/${ENV.META_GRAPH_VERSION}/${ctx.commentId}/comments`
      : `https://graph.instagram.com/${ENV.META_GRAPH_VERSION}/${ctx.commentId}/replies`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ctx.accountToken}` },
      body: JSON.stringify({ message: text }),
    });
    if (!r.ok) console.error('reply_comment meta call failed', r.status, await r.text());
  } catch (e) {
    console.error('reply_comment failed', e);
  }
  return { proceed: true };
}

// Flag a comment for human moderation (the negative branch). Upserts a row into
// flagged_comments that the Moderation page reads; idempotent per (org, comment).
async function actionFlagComment(_node: FlowNode, ctx: RunContext): Promise<{ proceed: boolean }> {
  if (!ctx.commentId) {
    console.warn('flag_comment: no comment id on this event — skipping');
    return { proceed: true };
  }
  const { error } = await db.from('flagged_comments').upsert(
    {
      org_id: ctx.orgId,
      meta_account_id: ctx.accountId,
      platform: ctx.accountPlatform ?? 'instagram',
      comment_id: ctx.commentId,
      media_id: ctx.commentMediaId ?? null,
      author_id: ctx.leadIgUserId,
      author_username: ctx.leadUsername ?? null,
      text: ctx.messageText ?? '',
      translation: ctx.commentTranslation ?? null,
      language: ctx.commentLanguage ?? null,
      sentiment: ctx.commentSentiment ?? 'negative',
      reason: ctx.commentReason ?? null,
      status: 'pending',
    },
    { onConflict: 'org_id,comment_id' },
  );
  if (error) console.error('flag_comment insert failed', error.message);
  else console.log(`flag_comment: flagged ${ctx.commentId} for moderation`);
  return { proceed: true };
}

// Send a DM with tappable buttons. Instagram renders these as quick replies:
// tapping one posts the button title back as the lead's message and delivers
// `payload` to us as a postback, which a `button_click` trigger can pick up.
async function actionSendButtons(node: FlowNode, ctx: RunContext): Promise<{ proceed: boolean }> {
  const text = (node.config.text as string | undefined)?.trim() || ctx.generatedReply;
  if (!text) {
    console.warn('send_buttons: no text to send');
    return { proceed: true };
  }
  const rawButtons = Array.isArray(node.config.buttons) ? (node.config.buttons as Array<{ title?: string; payload?: string }>) : [];
  const quick_replies: IgQuickReply[] = rawButtons
    .map((b) => ({ title: (b.title ?? '').trim(), payload: (b.payload ?? b.title ?? '').trim() }))
    .filter((b) => b.title)
    .slice(0, 13) // Instagram allows up to 13 quick replies
    .map((b) => ({ content_type: 'text' as const, title: b.title, payload: b.payload }));

  if (quick_replies.length === 0) {
    // No valid buttons — fall back to a plain DM so the message still goes out.
    await sendIgMessage(ctx, { text }, text);
    return { proceed: true };
  }
  await sendIgMessage(ctx, { text, quick_replies }, text);
  return { proceed: true };
}

// Send a rich message card with a single URL button. Uses Meta's generic template
// which is supported on both Instagram and Facebook Messenger. Because
// comment-triggered private replies (recipient: { comment_id }) don't support
// templates on IG, we fall back to a plain-text send in that case.
async function actionSendLinkButton(node: FlowNode, ctx: RunContext): Promise<{ proceed: boolean }> {
  const cfg = node.config as Record<string, unknown>;
  const url = ((cfg.link_url as string | undefined) ?? '').trim();
  if (!url) {
    console.warn('send_link_button: no link_url configured');
    return { proceed: true };
  }
  const rawTitle = pickVariant(cfg) || ((cfg.text as string | undefined) ?? '').trim() || 'Watch the video';
  const title = rawTitle.slice(0, 80); // Meta title limit ~80 chars
  const buttonLabel = (((cfg.button_label as string | undefined) ?? 'Open link').trim() || 'Open link').slice(0, 20);
  const subtitleRaw = ((cfg.subtitle as string | undefined) ?? '').trim();
  const subtitle = subtitleRaw ? subtitleRaw.slice(0, 80) : undefined;
  const imageUrl = ((cfg.image_url as string | undefined) ?? '').trim() || undefined;

  // For comment private replies, Meta rejects template attachments. Fall back to
  // a plain-text DM containing the title + URL (still tappable, IG auto-linkifies).
  if (ctx.eventKind === 'comment' && ctx.commentId) {
    const plain = subtitle ? `${title}\n\n${subtitle}\n\n${url}` : `${title}\n\n${url}`;
    await sendIgMessage(ctx, { text: plain }, plain);
    return { proceed: true };
  }

  const attachment: IgTemplateAttachment = {
    type: 'template',
    payload: {
      template_type: 'generic',
      elements: [{
        title,
        ...(subtitle ? { subtitle } : {}),
        ...(imageUrl ? { image_url: imageUrl } : {}),
        default_action: { type: 'web_url', url },
        buttons: [{ type: 'web_url', url, title: buttonLabel }],
      }],
    },
  };
  const persistText = subtitle ? `${title} — ${subtitle} (${url})` : `${title} (${url})`;
  await sendIgMessage(ctx, { attachment }, persistText);
  return { proceed: true };
}

async function actionSendLink(node: FlowNode, ctx: RunContext): Promise<{ proceed: boolean }> {
  const slug = (node.config.link_slug as string | undefined)?.trim();
  if (!slug) return { proceed: true };
  // Sending a link is just sending a DM with a URL.
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://synapse.nokhaos.com';
  const text = ctx.generatedReply
    ? `${ctx.generatedReply} ${baseUrl}/l/${slug}`
    : `${baseUrl}/l/${slug}`;
  await sendIgMessage(ctx, { text }, text);
  return { proceed: true };
}

// Schedule a sequence of timed follow-up nudges. Each fires later ONLY if the
// lead hasn't replied since now (the followupRunner enforces that at send time).
// Re-running this (e.g. the lead replied, flow ran again) cancels the old pending
// sequence first, so the clock resets to the latest message.
async function actionFollowUp(node: FlowNode, ctx: RunContext): Promise<{ proceed: boolean }> {
  const delays = Array.isArray(node.config.delays_hours)
    ? (node.config.delays_hours as unknown[]).map(Number).filter((h) => Number.isFinite(h) && h > 0)
    : [];
  if (delays.length === 0) return { proceed: true };

  const variants = Array.isArray(node.config.variants)
    ? (node.config.variants as unknown[]).filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    : [];
  const mode = variants.length > 0 ? 'static' : 'ai';
  const goal = (node.config.goal as string | undefined) ?? '';
  const useMasterDoc = node.config.use_master_doc !== false;

  // Cancel any still-pending follow-ups for this conversation (reset the clock).
  await db.from('scheduled_followups')
    .update({ status: 'cancelled' })
    .eq('conversation_id', ctx.conversationId)
    .eq('status', 'pending');

  const now = Date.now();
  const sequenceId = randomUUID();
  const rows = delays.map((h, i) => ({
    org_id: ctx.orgId,
    conversation_id: ctx.conversationId,
    account_id: ctx.accountId,
    lead_ig_user_id: ctx.leadIgUserId,
    sequence_id: sequenceId,
    step: i,
    due_at: new Date(now + h * 3_600_000).toISOString(),
    reference_at: new Date(now).toISOString(),
    mode,
    goal: goal || null,
    variants: variants.length ? variants : null,
    use_master_doc: useMasterDoc,
    status: 'pending',
  }));
  const { error } = await db.from('scheduled_followups').insert(rows);
  if (error) console.error('follow_up: schedule failed', error.message);
  else console.log(`follow_up: scheduled ${rows.length} nudge(s) at +${delays.join('h, +')}h`);
  return { proceed: true };
}

async function actionAddTag(node: FlowNode, ctx: RunContext): Promise<{ proceed: boolean }> {
  const tag = (node.config.tag as string | undefined)?.trim();
  if (!tag) return { proceed: true };
  await appendTag(ctx, tag);
  return { proceed: true };
}

async function actionSetFunnel(node: FlowNode, ctx: RunContext): Promise<{ proceed: boolean }> {
  const funnel = (node.config.funnel as string | undefined)?.trim();
  if (!funnel) return { proceed: true };
  // Resolve lead by ig_user_id
  const { data: lead } = await db
    .from('leads')
    .select('id')
    .eq('org_id', ctx.orgId)
    .eq('ig_user_id', ctx.leadIgUserId)
    .maybeSingle();
  if (lead) await db.from('leads').update({ funnel_label: funnel }).eq('id', lead.id);
  return { proceed: true };
}

async function actionHandoff(node: FlowNode, ctx: RunContext): Promise<{ proceed: boolean }> {
  const note = (node.config.notify as string | undefined) ?? 'Needs human review';
  await db.from('conversations').update({
    status: 'handed_off',
    next_action: note,
  }).eq('id', ctx.conversationId);
  return { proceed: true };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function appendTag(ctx: RunContext, tag: string) {
  const { data: lead } = await db
    .from('leads')
    .select('id, tags')
    .eq('org_id', ctx.orgId)
    .eq('ig_user_id', ctx.leadIgUserId)
    .maybeSingle();
  if (!lead) return;
  const tags = Array.isArray(lead.tags) ? lead.tags : [];
  if (!tags.includes(tag)) tags.push(tag);
  await db.from('leads').update({ tags }).eq('id', lead.id);
}
