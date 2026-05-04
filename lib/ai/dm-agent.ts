// AI logic for inbound DM handling: classify intent → score lead → generate reply.
// Each step calls Claude through the metered wrapper so credits are tracked.

import 'server-only';
import { z } from 'zod';
import { meteredCall } from '@/lib/anthropic';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/** Fetch the org's master doc (brain_md). Empty string if none set. */
async function getOrgBrain(orgId: string): Promise<string> {
  try {
    const admin = getSupabaseAdmin();
    const { data } = await admin
      .from('organizations')
      .select('brain_md')
      .eq('id', orgId)
      .single();
    return (data?.brain_md as string | undefined) ?? '';
  } catch {
    return '';
  }
}

const SYSTEM_BASE = `You are Synapse, an AI agent that handles Instagram DMs for small businesses to convert leads into customers.
You think like a thoughtful sales-engineer who genuinely cares about the customer outcome.
You write in the brand's voice — concise, warm, direct, never pushy.
You always answer the *actual* question first, then offer a single next step.
You never invent product details. If you don't know, say so and ask.
You output JSON when asked. You never include markdown code fences in JSON output.`;

const IntentSchema = z.object({
  intent: z.enum(['purchase', 'objection', 'question', 'support', 'spam', 'other']),
  confidence: z.number().min(0).max(1),
  topic: z.string().nullable(),
  objection_type: z.enum(['price', 'diet', 'shipping', 'time', 'fit', 'other']).nullable(),
  sentiment: z.enum(['hot', 'warm', 'cold']),
  lead_score: z.number().int().min(0).max(100),
  reasoning: z.string(),
});
export type IntentClassification = z.infer<typeof IntentSchema>;

export async function classifyDM(args: {
  orgId: string;
  conversationId: string;
  brandContext: string;        // short brand description, products, voice
  recentMessages: { from: 'them' | 'us' | 'ai'; text: string }[];
}): Promise<{ result: IntentClassification; cost_usd: number; new_balance_usd: number }> {
  const transcript = args.recentMessages
    .slice(-12)
    .map((m) => `${m.from === 'them' ? 'CUSTOMER' : 'BRAND'}: ${m.text}`)
    .join('\n');

  const brain = await getOrgBrain(args.orgId);
  const brainBlock = brain.trim() ? `\n\nMASTER DOC (authoritative — follow these rules):\n${brain.trim()}\n` : '';

  const { text, cost, new_balance_usd } = await meteredCall({
    orgId: args.orgId,
    purpose: 'classify',
    relatedId: args.conversationId,
    cacheSystem: true,
    system: `${SYSTEM_BASE}

BRAND CONTEXT:
${args.brandContext}${brainBlock}

TASK: Classify the customer's intent and score them as a lead. Return JSON only with this exact shape:
{
  "intent": "purchase" | "objection" | "question" | "support" | "spam" | "other",
  "confidence": 0.0–1.0,
  "topic": string or null,
  "objection_type": "price" | "diet" | "shipping" | "time" | "fit" | "other" | null,
  "sentiment": "hot" | "warm" | "cold",
  "lead_score": 0–100,
  "reasoning": "1-2 sentences"
}`,
    messages: [{ role: 'user', content: `Conversation transcript:\n\n${transcript}` }],
    temperature: 0.2,
    max_tokens: 400,
  });

  const cleaned = text.trim().replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '');
  const result = IntentSchema.parse(JSON.parse(cleaned));
  return { result, cost_usd: cost.charged_usd, new_balance_usd };
}

export async function generateReply(args: {
  orgId: string;
  conversationId: string;
  brandContext: string;
  recentMessages: { from: 'them' | 'us' | 'ai'; text: string }[];
  goal: string; // e.g. "Send funnel link to /plan/half-mar"
}): Promise<{ text: string; cost_usd: number; new_balance_usd: number }> {
  const transcript = args.recentMessages
    .slice(-12)
    .map((m) => `${m.from === 'them' ? 'CUSTOMER' : 'BRAND'}: ${m.text}`)
    .join('\n');

  const brain = await getOrgBrain(args.orgId);
  const brainBlock = brain.trim() ? `\n\nMASTER DOC (authoritative — follow these rules):\n${brain.trim()}\n` : '';

  const { text, cost, new_balance_usd } = await meteredCall({
    orgId: args.orgId,
    purpose: 'reply',
    relatedId: args.conversationId,
    cacheSystem: true,
    system: `${SYSTEM_BASE}

BRAND CONTEXT:
${args.brandContext}${brainBlock}`,
    messages: [
      {
        role: 'user',
        content:
          `Conversation transcript:\n\n${transcript}\n\n` +
          `Your goal: ${args.goal}\n\n` +
          `Write a single Instagram DM reply (1-3 sentences max). No greetings unless this is the first message. ` +
          `End with a single clear next step. Output ONLY the message text — no quotes, no JSON, no markdown.`,
      },
    ],
    temperature: 0.7,
    max_tokens: 220,
  });

  return { text: text.trim(), cost_usd: cost.charged_usd, new_balance_usd };
}
