import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { BrainEditor } from './BrainEditor';

export default async function BrainPage() {
  const session = await getCurrentSession();
  if (!session) redirect('/login');

  // Change history (admin client — table is RLS-locked to service role).
  const admin = getSupabaseAdmin();
  const { data: history } = await admin
    .from('brain_md_history')
    .select('id, changed_by, source, note, created_at, brain_md')
    .eq('org_id', session.org.id)
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <BrainEditor
      initial={session.org.brain_md}
      orgName={session.org.name}
      history={(history ?? []).map((h) => ({
        id: h.id,
        changed_by: h.changed_by,
        source: h.source,
        note: h.note,
        created_at: h.created_at,
        chars: (h.brain_md as string | null)?.length ?? 0,
      }))}
    />
  );
}
