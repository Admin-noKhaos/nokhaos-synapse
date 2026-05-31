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
  // 'opening' = the user's first message is the trigger keyword (e.g. START); the agent
  // delivers the link from the master doc. 'reply' = normal ongoing conversation turn.
  phase: z.enum(['opening', 'reply']).default('reply'),
  // Only meaningful on the opening turn. 'auto_followup' = the agent proactively follows up
  // right after the link (setter behaviour). 'wait' = the agent sends the link then waits.
  scenario: z.enum(['auto_followup', 'wait']).optional(),
});

const PlaygroundResponseSchema = z.object({
  reply: z.string().min(1).max(2000),
  // A proactive second message the agent sends right after the link. Only populated on the
  // opening turn of the 'auto_followup' scenario; null otherwise.
  followup: z.string().min(1).max(2000).nullable(),
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

  const wantsFollowup = body.phase === 'opening' && body.scenario === 'auto_followup';

  // Phase-specific guidance. On the opening turn the user's first message is the trigger
  // keyword (e.g. they commented "START" on a post), so the agent hands over the link from
  // the master doc rather than answering a question.
  const phaseLines = body.phase === 'opening'
    ? [
        `OPENING TURN: The user's first message is a trigger keyword (e.g. "START" or "WEBINAR") that they commented on a post or sent as a DM. They are NOT asking a question — they want the resource it unlocks.`,
        `Your "reply" must be a short, warm opening DM that hands over the relevant LINK from the master doc — the offer/registration/resource URL this keyword is meant to deliver. Pull the actual link (or link description) from the master doc; do not invent a URL. 1-2 sentences.`,
        wantsFollowup
          ? `Also set "followup" to a single short proactive message you'd send NEXT, as the setter, to move the lead forward — confirm they grabbed it, ask one qualifying question, or nudge toward booking. 1 sentence.`
          : `Set "followup" to null — you send the link and then wait for the user to respond.`,
      ]
    : [
        `Reply concisely (1-3 sentences max) as the brand's AI assistant. Set "followup" to null.`,
      ];

  const system = [
    `You are Synapse, the AI agent that handles Instagram DMs for @${session.org.name}. This is a DM SETTER — the TEST CHAT lets the user preview how you'd run the keyword → link → follow-up flow.`,
    ...phaseLines,
    `Output STRICT JSON with exactly this shape (no markdown fences, no prose outside JSON):`,
    `{`,
    `  "reply": "the message text you'd send back",`,
    `  "followup": "a second message you'd send right after, or null",`,
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
        followup: null,
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
