import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AppShell } from '@/components/AppShell';
import { getSupabaseServer } from '@/lib/supabase/server';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session) redirect('/login');

  // Cheap badge counts so the sidebar shows live numbers
  const supabase = await getSupabaseServer();
  const [{ count: inboxUnread }, { count: approvalCount }] = await Promise.all([
    supabase.from('conversations').select('id', { count: 'exact', head: true })
      .eq('org_id', session.org.id).gt('unread_count', 0),
    supabase.from('messages').select('id', { count: 'exact', head: true })
      .eq('org_id', session.org.id).eq('sender', 'ai').contains('ai_meta', { suggested: true }),
  ]);

  return (
    <ThemeProvider>
      <AppShell
        orgName={session.org.name}
        plan={`${session.org.plan} · ${session.org.followers_count.toLocaleString()} followers`}
        userName={session.user.full_name || session.user.email}
        inboxBadge={inboxUnread ?? undefined}
        approvalBadge={approvalCount ?? undefined}
      >
        {children}
      </AppShell>
    </ThemeProvider>
  );
}
