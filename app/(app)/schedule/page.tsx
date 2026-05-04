import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { ScheduleClient, type CalendarEvent } from './ScheduleClient';

export default async function SchedulePage() {
  const session = await getCurrentSession();
  if (!session) redirect('/login');

  const supabase = await getSupabaseServer();
  // Pull scheduled broadcasts in the next 7 days
  const since = new Date();
  const until = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const { data: broadcasts } = await supabase
    .from('broadcasts').select('id, name, scheduled_at, status, recipients_count')
    .eq('org_id', session.org.id)
    .gte('scheduled_at', since.toISOString()).lte('scheduled_at', until.toISOString())
    .order('scheduled_at', { ascending: true });

  const events: CalendarEvent[] = (broadcasts ?? []).filter((b) => b.scheduled_at).map((b) => ({
    id: b.id, kind: 'broadcast' as const, name: b.name, when: b.scheduled_at!,
    meta: `${b.recipients_count.toLocaleString()} recipients · ${b.status}`,
  }));

  return <ScheduleClient events={events} />;
}
