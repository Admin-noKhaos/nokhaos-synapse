import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ENV } from './env.js';

export const db: SupabaseClient = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
