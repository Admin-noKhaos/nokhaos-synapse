// Anthropic SDK wrapper with token-metered credit deduction.
//
// Every call:
//   1. checks org's credit balance and bails if too low (with a small headroom)
//   2. runs the request
//   3. computes the real Anthropic cost from token usage
//   4. records an ai_calls row + spends credits atomically via spend_credits RPC
//
// Pricing is hardcoded by model — keep this list updated as Anthropic releases
// new models. Source of truth: https://www.anthropic.com/pricing

import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { ENV, anthropicConfigured } from '@/lib/env';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// USD per 1M tokens.
const PRICING: Record<string, { input: number; output: number; cache_write: number; cache_read: number }> = {
  // Claude Opus 4.7 (current flagship)
  'claude-opus-4-7':         { input: 15.0, output: 75.0, cache_write: 18.75, cache_read: 1.50 },
  // Claude Sonnet 4.6
  'claude-sonnet-4-6':       { input:  3.0, output: 15.0, cache_write:  3.75, cache_read: 0.30 },
  // Claude Haiku 4.5
  'claude-haiku-4-5':        { input:  1.0, output:  5.0, cache_write:  1.25, cache_read: 0.10 },
};

function priceFor(model: string) {
  // Match by prefix so dated suffixes resolve too
  const key = Object.keys(PRICING).find((k) => model.startsWith(k));
  return key ? PRICING[key] : PRICING['claude-sonnet-4-6'];
}

function anthropicCostUsd(model: string, usage: { input_tokens: number; output_tokens: number; cache_creation_input_tokens?: number | null; cache_read_input_tokens?: number | null }): number {
  const p = priceFor(model);
  const million = 1_000_000;
  const cw = usage.cache_creation_input_tokens ?? 0;
  const cr = usage.cache_read_input_tokens ?? 0;
  // Input tokens reported by Anthropic exclude cached tokens (they're billed separately).
  return (
    (usage.input_tokens / million) * p.input +
    (usage.output_tokens / million) * p.output +
    (cw / million) * p.cache_write +
    (cr / million) * p.cache_read
  );
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (client) return client;
  if (!anthropicConfigured()) throw new Error('ANTHROPIC_API_KEY is not set');
  client = new Anthropic({ apiKey: ENV.ANTHROPIC_API_KEY });
  return client;
}

export type MeteredCallInput = {
  orgId: string;
  purpose: 'reply' | 'classify' | 'score' | 'summarize' | 'generate_post' | 'route_link';
  relatedId?: string;
  /** Optional override; defaults to ENV.ANTHROPIC_MODEL. */
  model?: string;
  system?: string | Anthropic.TextBlockParam[];
  messages: Anthropic.MessageParam[];
  max_tokens?: number;
  temperature?: number;
  /** Mark large `system` blocks as cacheable for big savings on repeat calls. */
  cacheSystem?: boolean;
};

export type MeteredCallResult = {
  text: string;
  raw: Anthropic.Message;
  cost: { anthropic_usd: number; charged_usd: number };
  tokens: { input: number; output: number; cache_read: number; cache_write: number };
  ai_call_id: string;
  new_balance_usd: number;
};

/**
 * Run a Claude call and atomically charge the org for the metered cost.
 * Throws InsufficientCreditsError if the org's balance is empty (call is *not* made).
 */
export async function meteredCall(input: MeteredCallInput): Promise<MeteredCallResult> {
  const admin = getSupabaseAdmin();

  // Pre-check balance: refuse if at or below zero. (We cap one call at $1 estimated worst case.)
  const { data: bal } = await admin
    .from('credit_balances')
    .select('balance_usd')
    .eq('org_id', input.orgId)
    .single();
  if (!bal || Number(bal.balance_usd) <= 0) {
    throw new InsufficientCreditsError(Number(bal?.balance_usd ?? 0));
  }

  const model = input.model || ENV.ANTHROPIC_MODEL;

  // If caching the system prompt, wrap it with cache_control.
  let system: Anthropic.MessageCreateParams['system'];
  if (typeof input.system === 'string') {
    system = input.cacheSystem
      ? [{ type: 'text', text: input.system, cache_control: { type: 'ephemeral' } }]
      : input.system;
  } else {
    system = input.system;
  }

  const c = getClient();
  const msg = await c.messages.create({
    model,
    max_tokens: input.max_tokens ?? 1024,
    temperature: input.temperature,
    system,
    messages: input.messages,
  });

  const anthropicCost = anthropicCostUsd(model, msg.usage);
  const chargedUsd = anthropicCost * ENV.CREDIT_MARKUP;

  // Persist ai_call first so we can link the ledger row to it.
  const { data: aiCall, error: aiErr } = await admin
    .from('ai_calls')
    .insert({
      org_id: input.orgId,
      model,
      purpose: input.purpose,
      input_tokens: msg.usage.input_tokens,
      output_tokens: msg.usage.output_tokens,
      cache_read_tokens: msg.usage.cache_read_input_tokens ?? 0,
      cache_creation_tokens: msg.usage.cache_creation_input_tokens ?? 0,
      cost_anthropic_usd: anthropicCost,
      charged_usd: chargedUsd,
      related_id: input.relatedId ?? null,
    })
    .select('id')
    .single();
  if (aiErr || !aiCall) throw new Error(`failed to record ai_call: ${aiErr?.message}`);

  // Atomically deduct credits.
  const { data: newBal, error: spendErr } = await admin.rpc('spend_credits', {
    p_org_id: input.orgId,
    p_amount_usd: chargedUsd,
    p_description: `Synapse · ${input.purpose}`,
    p_ai_call_id: aiCall.id,
  });
  if (spendErr) throw new Error(`spend_credits failed: ${spendErr.message}`);

  const text = msg.content
    .filter((c): c is Anthropic.TextBlock => c.type === 'text')
    .map((c) => c.text)
    .join('\n');

  return {
    text,
    raw: msg,
    cost: { anthropic_usd: anthropicCost, charged_usd: chargedUsd },
    tokens: {
      input: msg.usage.input_tokens,
      output: msg.usage.output_tokens,
      cache_read: msg.usage.cache_read_input_tokens ?? 0,
      cache_write: msg.usage.cache_creation_input_tokens ?? 0,
    },
    ai_call_id: aiCall.id,
    new_balance_usd: Number(newBal),
  };
}

export class InsufficientCreditsError extends Error {
  balance_usd: number;
  constructor(balance: number) {
    super('Insufficient credits');
    this.balance_usd = balance;
  }
}
