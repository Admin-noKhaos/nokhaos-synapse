// Env validation. Tolerant at boot — required keys are *checked at use time*
// (e.g. anthropicConfigured(), serviceRoleConfigured()) so missing optional
// integrations don't crash the whole app.

import { z } from 'zod';

const optStr = z
  .preprocess((v) => (typeof v === 'string' && v === '' ? undefined : v), z.string().optional());

const optUrl = z
  .preprocess((v) => (typeof v === 'string' && v === '' ? undefined : v), z.string().url().optional());

const PublicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
});

const ServerSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: optStr,
  SUPABASE_PROJECT_ID: optStr,
  ANTHROPIC_API_KEY: optStr,
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-6'),
  META_APP_ID: optStr,
  META_APP_SECRET: optStr,
  META_VERIFY_TOKEN: optStr,
  META_GRAPH_VERSION: z.string().default('v21.0'),
  CREDIT_MARKUP: z.coerce.number().default(2.0),
  SIGNUP_FREE_CREDITS_USD: z.coerce.number().default(5),
  WORKER_INTERNAL_TOKEN: optStr,
  WORKER_URL: optUrl,
});

export const PUBLIC_ENV = PublicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

export const ENV = {
  ...PUBLIC_ENV,
  ...ServerSchema.parse(process.env),
};

export function metaConfigured(): boolean {
  return !!(ENV.META_APP_ID && ENV.META_APP_SECRET && ENV.META_VERIFY_TOKEN);
}

export function anthropicConfigured(): boolean {
  return !!ENV.ANTHROPIC_API_KEY;
}

export function serviceRoleConfigured(): boolean {
  return !!ENV.SUPABASE_SERVICE_ROLE_KEY;
}
