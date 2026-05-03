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

  // Filled by AI/condition nodes
  intent?: string;
  intentConfidence?: number;
  sentiment?: 'hot' | 'warm' | 'cold';
  leadScore?: number;
  generatedReply?: string;
};

export async function runAutomationForMessage(input: Omit<RunContext, 'intent' | 'sentiment' | 'leadScore' | 'generatedReply' | 'intentConfidence'>) {
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

  for (const a of automations) {
    const graph = (a.graph as FlowGraph) ?? { nodes: [], edges: [] };
    if (!graph.nodes?.length) continue;
    try {
      await runGraph(graph, { ...input } as RunContext, a.id, a.name);
    } catch (e) {
      console.error(`automation ${a.id} (${a.name}) failed`, e);
    }
  }
}

async function runGraph(graph: FlowGraph, ctx: RunContext, automationId: string, automationName: string) {
  // Find trigger nodes whose filter matches this message.
  const triggers = graph.nodes.filter((n) => n.kind === 'trigger' && n.type === 'new_dm' && triggerMatches(n, ctx));
  if (triggers.length === 0) return;

  for (const trigger of triggers) {
    await traverse(graph, trigger.id, ctx, new Set(), automationId, automationName);
  }
}

function triggerMatches(node: FlowNode, ctx: RunContext): boolean {
  const contains = (node.config.contains as string | undefined)?.trim();
  if (contains && !ctx.messageText.toLowerCase().includes(contains.toLowerCase())) return false;
  // from_handles filter — would need lead username; skip for v1
  return true;
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
    if (node.type === 'send_link') return actionSendLink(node, ctx);
    if (node.type === 'add_tag') return actionAddTag(node, ctx);
    if (node.type === 'set_funnel') return actionSetFunnel(node, ctx);
    if (node.type === 'handoff_human') return actionHandoff(node, ctx);
  }

  return { proceed: true };
}

// ─── AI nodes ────────────────────────────────────────────────────────────────

async function aiClassify(node: FlowNode, ctx: RunContext): Promise<{ proceed: boolean }> {
  const classes = (node.config.classes as string[] | undefined) ?? ['purchase', 'objection', 'question', 'spam'];
  const minConf = (node.config.confidence as number | undefined) ?? 0.7;

  const r = await workerCall({
    orgId: ctx.orgId,
    purpose: 'classify',
    relatedId: ctx.conversationId,
    cacheSystem: true,
    system:
      `Classify Instagram DM intent for @${ctx.accountUsername ?? 'brand'}. ` +
      `Return STRICT JSON: {"intent":<one of: ${classes.join(' | ')} | other>,"confidence":0-1,"sentiment":"hot"|"warm"|"cold","lead_score":0-100}. No markdown, no prose.`,
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

  const r = await workerCall({
    orgId: ctx.orgId,
    purpose: 'reply',
    relatedId: ctx.conversationId,
    cacheSystem: true,
    system:
      `You are Synapse, replying as @${ctx.accountUsername ?? 'brand'} on Instagram. ` +
      `Voice: ${voice}. Goal: ${goal}. Output ONLY the reply text, 1-3 sentences max, no quotes, no markdown. ` +
      (extra ? `\n${extra}` : ''),
    userMessage: `Recent conversation:\n${ctx.transcript}\n\nWrite the next reply as the brand:`,
    maxTokens: 200,
    temperature: 0.7,
  });
  ctx.generatedReply = r.text.trim();
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

async function actionSendDm(node: FlowNode, ctx: RunContext): Promise<{ proceed: boolean }> {
  const staticText = (node.config.text as string | undefined)?.trim();
  const text = staticText || ctx.generatedReply;
  if (!text) {
    console.warn('send_dm: no text to send (no generated reply, no static text)');
    return { proceed: true };
  }

  // Send via Meta API
  try {
    const url = `https://graph.instagram.com/${ENV.META_GRAPH_VERSION}/${ctx.accountIgUserId}/messages`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ctx.accountToken}` },
      body: JSON.stringify({
        recipient: { id: ctx.leadIgUserId },
        message: { text },
      }),
    });
    if (!r.ok) {
      console.error('send_dm meta call failed', r.status, await r.text());
      return { proceed: true };
    }
    const j = await r.json() as { message_id?: string };

    // Persist as 'us' message
    await db.from('messages').insert({
      org_id: ctx.orgId,
      conversation_id: ctx.conversationId,
      ig_message_id: j.message_id ?? null,
      sender: 'us',
      text,
      sent_at: new Date().toISOString(),
      ai_meta: { auto: true, automation: true },
    });
    await db.from('conversations').update({
      last_message_at: new Date().toISOString(),
      next_action: null,
      unread_count: 0,
    }).eq('id', ctx.conversationId);
  } catch (e) {
    console.error('send_dm failed', e);
  }
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
  return actionSendDm({ ...node, config: { text } } as FlowNode, ctx);
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
