// Server-side Supabase client (App Router).
// Uses the user's session cookie via the @supabase/ssr helpers.

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_ENV } from '@/lib/env';

export async function getSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    PUBLIC_ENV.NEXT_PUBLIC_SUPABASE_URL,
    PUBLIC_ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(toSet: { name: string; value: string; options?: Parameters<typeof cookieStore.set>[2] }[]) {
          try {
            for (const { name, value, options } of toSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // setAll inside a Server Component is a no-op (only middleware can write).
          }
        },
      },
    },
  );
}
