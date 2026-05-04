import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { TemplatesClient } from './TemplatesClient';

export default async function TemplatesPage() {
  const session = await getCurrentSession();
  if (!session) redirect('/login');
  const supabase = await getSupabaseServer();
  const { data } = await supabase.from('templates').select('id, name, category, body, ai_generated, uses_count, created_at')
    .eq('org_id', session.org.id).order('created_at', { ascending: false });
  return <TemplatesClient templates={data ?? []} />;
}
