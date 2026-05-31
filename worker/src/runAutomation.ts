// Flow execution engine. Loads any live automation for the org and walks its
// graph in response to a new inbound message.
//
// Runtime model:
//   - We BFS from each matching trigger node
//   - AI nodes update a shared run context (intent, score, generated reply text)
//   - Condition nodes evaluate against the context and either pass or short-circuit
//   - Action nodes have side effects (send DM via Meta, tag lead, set funnel,
//     mark conversation for human handoff)

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
   *  private reply (recipient: { comment_id }). */
  commentId?: string;

  // Filled by AI/condition nodes
  intent?: string;
  intentConfidence?: number;
  sentiment?: 'hot' | 'warm' | 'cold';
  leadScore?: number;
  generatedReply?: string;
};

export async function runAutomationForMessage(
  input: Omit<RunContext, 'intent' | 'sentiment' | 'leadScore' | 'generatedReply' | 'intentConfidence' | 'eventKind'> & {
    brainMd?: string;
    eventKind?: EventKind;
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
  for (const a of automations) {
    const graph = (a.graph as FlowGraph) ?? { nodes: [], edges: [] };
    if (!graph.nodes?.length) continue;
    try {
      await runGraph(graph, { ...input, brainMd, eventKind } as RunContext, a.id, a.name);
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

function triggerMatchesEvent(node: FlowNode, ctx: RunContext): boolean {
  const contains = (node.config.contains as string | undefined)?.trim();
  const textMatch = !contains || ctx.messageText.toLowerCase().includes(contains.toLowerCase());

  switch (node.type) {
    case 'new_dm':
      // from_handles filter — would need lead username; skip for v1
      return ctx.eventKind === 'dm' && textMatch;
    case 'comment_keyword':
      return ctx.eventKind === 'comment' && textMatch;
    case 'button_click': {
      if (ctx.eventKind !== 'postback') return false;
      const want = (node.config.payload as string | undefined)?.trim();
      // No payload configured → match any button tap. Otherwise exact match.
      return !want || want === (ctx.postbackPayload ?? '').trim();
    }
    case 'story_reply':
      // Story replies arrive as DMs; treat like a DM trigger for now.
      return ctx.eventKind === 'dm' && textMatch;
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
    if (node.type === 'send_link') return actionSendLink(node, ctx);
    if (node.type === 'add_tag') return actionAddTag(node, ctx);
    if (node.type === 'set_funnel') return actionSetFunnel(node, ctx);
    if (node.type === 'handoff_human') return actionHandoff(node, ctx);
  }

  return { proceed: true };
}

// Strip em/en dashes from AI output. Models reach for "—" constantly and a soft
// "no em dashes" rule in the master doc isn't reliable, so we enforce it in code:
// a spaced dash (" — ") becomes a comma, an inline one ("word—word") a hyphen.
function stripEmDashes(s: string): string {
  return s
    .replace(/ *[—–] */g, (m) => (/ /.test(m) ? ', ' : '-'))
    .replace(/,\s*,/g, ',');
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

async function aiGenerateReply(node: FlowNode, ctx: RunContext): Promise<{ proceed: boolean }> {
  const goal = (node.config.goal as string | undefined) ?? 'Reply concisely with a single clear next step.';
  const voice = (node.config.voice as string | undefined) ?? 'warm, direct';
  const extra = (node.config.system_prompt as string | undefined) ?? '';
  // Master doc is included by default; opt-out by setting use_master_doc:false on the node
  const useMasterDoc = node.config.use_master_doc !== false;
  const brainBlock = useMasterDoc && ctx.brainMd.trim() ? `\n\nMASTER DOC (authoritative — follow these rules):\n${ctx.brainMd.trim()}\n` : '';

  const r = await workerCall({
    orgId: ctx.orgId,
    purpose: 'reply',
    relatedId: ctx.conversationId,
    cacheSystem: true,
    system:
      `You are Synapse, replying as @${ctx.accountUsername ?? 'brand'} on Instagram. ` +
      `Voice: ${voice}. Goal: ${goal}. Output ONLY the reply text, 1-3 sentences max, no quotes, no markdown. ` +
      (extra ? `\n${extra}` : '') +
      brainBlock,
    userMessage: `Recent conversation:\n${ctx.transcript}\n\nWrite the next reply as the brand:`,
    maxTokens: 200,
    temperature: 0.7,
  });
  ctx.generatedReply = stripEmDashes(r.text.trim());
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
  if (node.type === 'else') {
    // "else" always continues — graph authors put it on a parallel branch from
    // a classifier so it acts as the fallback when no other condition matches.
    return { proceed: true };
  }
  return { proceed: true };
}

// ─── Action nodes ────────────────────────────────────────────────────────────

type IgQuickReply = { content_type: 'text'; title: string; payload: string };
type IgMessagePayload = { text?: string; quick_replies?: IgQuickReply[] };

// Send a message object to the lead via the Meta API and persist it as an 'us'
// message. When this run was triggered by a comment, the first message is sent
// as a private reply (recipient: { comment_id }); otherwise it goes to the
// lead's IG-scoped id.
async function sendIgMessage(ctx: RunContext, message: IgMessagePayload, persistText: string): Promise<void> {
  const recipient = ctx.eventKind === 'comment' && ctx.commentId
    ? { comment_id: ctx.commentId }
    : { id: ctx.leadIgUserId };
  try {
    const url = `https://graph.instagram.com/${ENV.META_GRAPH_VERSION}/${ctx.accountIgUserId}/messages`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ctx.accountToken}` },
      body: JSON.stringify({ recipient, message }),
    });
    if (!r.ok) {
      console.error('send message meta call failed', r.status, await r.text());
      return;
    }
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

async function actionSendDm(node: FlowNode, ctx: RunContext): Promise<{ proceed: boolean }> {
  const staticText = (node.config.text as string | undefined)?.trim();
  const text = staticText || ctx.generatedReply;
  if (!text) {
    console.warn('send_dm: no text to send (no generated reply, no static text)');
    return { proceed: true };
  }
  await sendIgMessage(ctx, { text }, text);
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
