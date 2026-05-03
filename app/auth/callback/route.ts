// Email-confirmation callback. Exchanges the code for a session, then redirects.

import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { ENV, serviceRoleConfigured } from '@/lib/env';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/dashboard';

  if (code) {
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin));
    }
    if (data.user && serviceRoleConfigured()) {
      // First-time login: grant free credits if balance is zero.
      const admin = getSupabaseAdmin();
      const { data: profile } = await admin
        .from('profiles')
        .select('default_org_id')
        .eq('id', data.user.id)
        .single();
      if (profile?.default_org_id) {
        const { data: bal } = await admin
          .from('credit_balances')
          .select('balance_usd')
          .eq('org_id', profile.default_org_id)
          .maybeSingle();
        if (!bal || Number(bal.balance_usd) === 0) {
          await admin.rpc('grant_credits', {
            p_org_id: profile.default_org_id,
            p_amount_usd: ENV.SIGNUP_FREE_CREDITS_USD,
            p_kind: 'grant',
            p_description: 'Welcome bonus',
          });
        }
      }
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
