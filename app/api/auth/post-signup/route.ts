// Grant free credits on first sign-up (when email confirmation is disabled and the
// signup returns an immediate session).

import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { ENV, serviceRoleConfigured } from '@/lib/env';

export async function POST() {
  if (!serviceRoleConfigured()) {
    return NextResponse.json({ ok: false, error: 'service_role_missing' }, { status: 503 });
  }
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const admin = getSupabaseAdmin();
  const { data: profile } = await admin
    .from('profiles')
    .select('default_org_id')
    .eq('id', user.id)
    .single();
  if (!profile?.default_org_id) return NextResponse.json({ ok: false }, { status: 404 });

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

  return NextResponse.json({ ok: true });
}
