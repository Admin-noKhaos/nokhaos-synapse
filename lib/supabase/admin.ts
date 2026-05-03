// Service-role Supabase client. Bypasses RLS.
// NEVER import this from a client component or expose it to the browser.

import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ENV } from '@/lib/env';

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  if (!ENV.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Get it from the Supabase dashboard ' +
        '(Project Settings → API → service_role secret) and add it to .env.local.',
    );
  }
  cached = createClient(ENV.NEXT_PUBLIC_SUPABASE_URL, ENV.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
