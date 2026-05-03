// Worker env validation. Independent from the Next.js env so the worker can
// be deployed in isolation (Render).

const need = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Worker env missing: ${k}`);
  return v;
};

export const ENV = {
  SUPABASE_URL: need('NEXT_PUBLIC_SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: need('SUPABASE_SERVICE_ROLE_KEY'),
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
  META_APP_SECRET: process.env.META_APP_SECRET ?? '',
  META_GRAPH_VERSION: process.env.META_GRAPH_VERSION ?? 'v21.0',
  CREDIT_MARKUP: Number(process.env.CREDIT_MARKUP ?? 2.0),
  POLL_INTERVAL_MS: Number(process.env.POLL_INTERVAL_MS ?? 2000),
  PORT: Number(process.env.PORT ?? 8080),
};
