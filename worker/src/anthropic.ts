// Mirror of the web app's metered-call wrapper, adapted for the worker.
// The schema's spend_credits RPC handles atomicity, so this is safe to share.

import Anthropic from '@anthropic-ai/sdk';
import { ENV } from './env.js';
import { db } from './db.js';

const PRICING: Record<string, { input: number; output: number; cache_write: number; cache_read: number }> = {
  'claude-opus-4-7':   { input: 15.0, output: 75.0, cache_write: 18.75, cache_read: 1.50 },
  'claude-sonnet-4-6': { input:  3.0, output: 15.0, cache_write:  3.75, cache_read: 0.30 },
  'claude-haiku-4-5':  { input:  1.0, output:  5.0, cache_write:  1.25, cache_read: 0.10 },
};

const priceFor = (m: string) => PRICING[Object.keys(PRICING).find((k) => m.startsWith(k)) ?? ''] ?? PRICING['claude-sonnet-4-6'];

const client = ENV.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ENV.ANTHROPIC_API_KEY }) : null;

export type WorkerCallInput = {
  orgId: string;
  purpose: 'reply' | 'classify' | 'score';
  relatedId?: string;
  system: string;
  userMessage: string;
  cacheSystem?: boolean;
  maxTokens?: number;
  temperature?: number;
};

export async function workerCall(input: WorkerCallInput): Promise<{ text: string; charged_usd: number }> {
  if (!client) throw new Error('ANTHROPIC_API_KEY not configured');

  const { data: bal } = await db.from('credit_balances').select('balance_usd').eq('org_id', input.orgId).single();
  if (!bal || Number(bal.balance_usd) <= 0) throw new Error('insufficient_credits');

  const model = ENV.ANTHROPIC_MODEL;
  const system = input.cacheSystem
    ? [{ type: 'text' as const, text: input.system, cache_control: { type: 'ephemeral' as const } }]
    : input.system;

  const msg = await client.messages.create({
    model,
    max_tokens: input.maxTokens ?? 400,
    temperature: input.temperature,
    system,
    messages: [{ role: 'user', content: input.userMessage }],
  });

  const p = priceFor(model);
  const cost =
    (msg.usage.input_tokens / 1e6) * p.input +
    (msg.usage.output_tokens / 1e6) * p.output +
    ((msg.usage.cache_creation_input_tokens ?? 0) / 1e6) * p.cache_write +
    ((msg.usage.cache_read_input_tokens ?? 0) / 1e6) * p.cache_read;
  const charged = cost * ENV.CREDIT_MARKUP;

  const { data: aiCall } = await db
    .from('ai_calls')
    .insert({
      org_id: input.orgId,
      model,
      purpose: input.purpose,
      input_tokens: msg.usage.input_tokens,
      output_tokens: msg.usage.output_tokens,
      cache_read_tokens: msg.usage.cache_read_input_tokens ?? 0,
      cache_creation_tokens: msg.usage.cache_creation_input_tokens ?? 0,
      cost_anthropic_usd: cost,
      charged_usd: charged,
      related_id: input.relatedId ?? null,
    })
    .select('id')
    .single();

  await db.rpc('spend_credits', {
    p_org_id: input.orgId,
    p_amount_usd: charged,
    p_description: `Synapse · ${input.purpose}`,
    p_ai_call_id: aiCall?.id ?? null,
  });

  const text = msg.content.filter((c) => c.type === 'text').map((c) => (c as { text: string }).text).join('\n');
  return { text, charged_usd: charged };
}
