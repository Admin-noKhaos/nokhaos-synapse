// AI Test Chat endpoint. Conversational playground that:
//   - Uses the org's brain_md as context (so replies match what real DMs would get)
//   - Charges credits like every other AI call
//   - After each turn, asks Claude to emit a structured "doc update suggestion"
//     if the conversation revealed something not yet in the brain doc.
//
// Returns: { reply: string, suggestion: { rationale, patch } | null, new_balance_usd }

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/auth';
import { meteredCall, InsufficientCreditsError } from '@/lib/anthropic';
import { anthropicConfigured } from '@/lib/env';

const Body = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(8000),
  })).min(1).max(40),
});

const PlaygroundResponseSchema = z.object({
  reply: z.string().min(1).max(2000),
  suggestion: z.object({
    rationale: z.string().min(1).max(400),
    patch: z.string().min(1).max(2000),
  }).nullable(),
});

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!anthropicConfigured()) return NextResponse.json({ error: 'anthropic_not_configured' }, { status: 503 });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: 'bad_request', detail: String(e) }, { status: 400 });
  }

  const brain = session.org.brain_md.trim();
  const brainBlock = brain
    ? `MASTER DOC (authoritative — follow these rules):\n${brain}`
    : 'MASTER DOC: (empty — the user has not yet written one. Be helpful but flag when you need info that should live there.)';

  const system = [
    `You are Synapse, the AI agent that handles Instagram DMs for @${session.org.name}. This is the TEST CHAT — the user is testing how you'd respond.`,
    `You play the role of the brand's AI assistant. Reply concisely (1-3 sentences max).`,
    `Output STRICT JSON with exactly this shape (no markdown fences, no prose outside JSON):`,
    `{`,
    `  "reply": "the message text you'd send back",`,
    `  "suggestion": {`,
    `    "rationale": "1 short sentence: what's missing from the master doc that this conversation revealed",`,
    `    "patch": "markdown text to APPEND to the master doc (a heading + a few lines, or a bullet)"`,
    `  } or null`,
    `}`,
    ``,
    `Set "suggestion" to non-null ONLY when:`,
    `- The user asked something that's NOT covered by the master doc, AND`,
    `- The answer would be useful for future similar DMs.`,
    `Otherwise return "suggestion": null.`,
    ``,
    brainBlock,
  ].join('\n');

  try {
    const result = await meteredCall({
      orgId: session.org.id,
      purpose: 'reply',
      cacheSystem: true,
      system,
      messages: body.messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: 800,
      temperature: 0.6,
    });

    const cleaned = result.text.trim().replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '');
    let parsed: z.infer<typeof PlaygroundResponseSchema>;
    try {
      parsed = PlaygroundResponseSchema.parse(JSON.parse(cleaned));
    } catch (e) {
      // If the model didn't return valid JSON, treat the whole text as the reply.
      return NextResponse.json({
        reply: result.text.trim(),
        suggestion: null,
        new_balance_usd: result.new_balance_usd,
        cost_usd: result.cost.charged_usd,
        parse_error: String(e),
      });
    }

    return NextResponse.json({
      ...parsed,
      new_balance_usd: result.new_balance_usd,
      cost_usd: result.cost.charged_usd,
    });
  } catch (e) {
    if (e instanceof InsufficientCreditsError) {
      return NextResponse.json({ error: 'insufficient_credits', balance_usd: e.balance_usd }, { status: 402 });
    }
    return NextResponse.json({ error: 'ai_failed', detail: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
