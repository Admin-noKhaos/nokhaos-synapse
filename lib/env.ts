// Env validation. Throws clearly if a required var is missing at startup.
// Server-only — never imported from client components.

import { z } from 'zod';

const PublicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
});

const ServerSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_PROJECT_ID: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-6'),
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_VERIFY_TOKEN: z.string().optional(),
  META_GRAPH_VERSION: z.string().default('v21.0'),
  CREDIT_MARKUP: z.coerce.number().default(2.0),
  SIGNUP_FREE_CREDITS_USD: z.coerce.number().default(5),
  WORKER_INTERNAL_TOKEN: z.string().optional(),
  WORKER_URL: z.string().url().optional(),
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
