// Server-side helpers for getting the current user + their default org.
// Returns null if the session is missing — let callers redirect.

import 'server-only';
import { getSupabaseServer } from '@/lib/supabase/server';

export type SessionUser = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  default_org_id: string | null;
};

export type SessionOrg = {
  id: string;
  name: string;
  plan: string;
  followers_count: number;
  role: 'owner' | 'admin' | 'member';
  brain_md: string;
};

export type Session = {
  user: SessionUser;
  org: SessionOrg;
  /** Cached current credit balance in USD. */
  balance_usd: number;
};

export async function getCurrentSession(): Promise<Session | null> {
  const supabase = await getSupabaseServer();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url, default_org_id')
    .eq('id', authUser.id)
    .single();

  if (!profile) return null;

  // The handle_new_user trigger sets default_org_id; if missing for some reason,
  // pick any membership.
  let orgId = profile.default_org_id;
  if (!orgId) {
    const { data: anyMembership } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', profile.id)
      .limit(1)
      .single();
    orgId = anyMembership?.org_id ?? null;
  }
  if (!orgId) return null;

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, plan, followers_count, brain_md')
    .eq('id', orgId)
    .single();
  if (!org) return null;

  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', profile.id)
    .single();

  const { data: balance } = await supabase
    .from('credit_balances')
    .select('balance_usd')
    .eq('org_id', orgId)
    .maybeSingle();

  return {
    user: {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      default_org_id: profile.default_org_id,
    },
    org: {
      id: org.id,
      name: org.name,
      plan: org.plan,
      followers_count: org.followers_count,
      role: (membership?.role as Session['org']['role']) ?? 'member',
      brain_md: org.brain_md ?? '',
    },
    balance_usd: Number(balance?.balance_usd ?? 0),
  };
}
