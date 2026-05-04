import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { BroadcastsClient } from './BroadcastsClient';

export default async function BroadcastsPage() {
  const session = await getCurrentSession();
  if (!session) redirect('/login');
  const supabase = await getSupabaseServer();
  const [{ data: broadcasts }, { data: audiences }] = await Promise.all([
    supabase.from('broadcasts').select('id, name, message, status, scheduled_at, sent_at, recipients_count, delivered_count, opened_count, clicked_count, audience_id, created_at').eq('org_id', session.org.id).order('created_at', { ascending: false }),
    supabase.from('audiences').select('id, name, size').eq('org_id', session.org.id).order('size', { ascending: false }),
  ]);

  return <BroadcastsClient broadcasts={broadcasts ?? []} audiences={(audiences ?? []).map((a) => ({ id: a.id, name: a.name, size: a.size ?? 0 }))} />;
}
