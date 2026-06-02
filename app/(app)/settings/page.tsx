import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { metaConfigured, anthropicConfigured, serviceRoleConfigured } from '@/lib/env';
import { SettingsClient } from './SettingsClient';

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await getCurrentSession();
  if (!session) redirect('/login');
  const params = await searchParams;

  const supabase = await getSupabaseServer();
  const { data: metaAccounts } = await supabase
    .from('meta_accounts')
    .select('id, username, page_name, status, webhook_subscribed, connected_at, meta')
    .eq('org_id', session.org.id)
    .order('connected_at', { ascending: false });

  const { data: ledger } = await supabase
    .from('credit_ledger')
    .select('id, kind, amount_usd, description, created_at')
    .eq('org_id', session.org.id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Tester whitelist (admin client — table is RLS-locked to service role).
  const admin = getSupabaseAdmin();
  const { data: testers } = await admin
    .from('automation_testers')
    .select('id, ig_user_id, username, label, created_at')
    .eq('org_id', session.org.id)
    .order('created_at', { ascending: false });

  return (
    <SettingsClient
      initialTab={params.tab ?? 'account'}
      meta_connected_flash={params.meta_connected === '1'}
      meta_error={params.meta_error ?? null}
      session={{
        userName: session.user.full_name || session.user.email,
        userEmail: session.user.email,
        orgName: session.org.name,
        orgPlan: session.org.plan,
        orgRole: session.org.role,
        followers: session.org.followers_count,
        balanceUsd: session.balance_usd,
        brain: session.org.brain_md,
      }}
      flags={{ meta: metaConfigured(), anthropic: anthropicConfigured(), service_role: serviceRoleConfigured() }}
      metaAccounts={(metaAccounts ?? []).map((a) => ({
        id: a.id,
        username: a.username,
        page_name: a.page_name,
        status: a.status,
        webhook_subscribed: a.webhook_subscribed,
        account_type: (a.meta as { account_type?: string } | null)?.account_type ?? null,
      }))}
      ledger={(ledger ?? []).map((r) => ({
        id: r.id, kind: r.kind, amount_usd: Number(r.amount_usd),
        description: r.description, created_at: r.created_at,
      }))}
      testers={(testers ?? []).map((t) => ({
        id: t.id, ig_user_id: t.ig_user_id, username: t.username, label: t.label, created_at: t.created_at,
      }))}
      dmTarget={(metaAccounts ?? [])[0]?.username ?? null}
    />
  );
}
