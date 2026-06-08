import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { ModerationClient } from './ModerationClient';

export const dynamic = 'force-dynamic';

export default async function ModerationPage() {
  const session = await getCurrentSession();
  if (!session) redirect('/login');

  // flagged_comments is RLS-locked → read with the service-role client, scoped to org.
  const admin = getSupabaseAdmin();
  const { data: rows } = await admin
    .from('flagged_comments')
    .select('id, platform, comment_id, media_id, author_username, author_id, text, translation, language, sentiment, reason, status, created_at, handled_at')
    .eq('org_id', session.org.id)
    .order('created_at', { ascending: false })
    .limit(200);

  const items = (rows ?? []).map((r) => ({
    id: r.id,
    platform: r.platform as string,
    comment_id: r.comment_id as string,
    media_id: (r.media_id as string | null) ?? null,
    author_username: (r.author_username as string | null) ?? null,
    author_id: (r.author_id as string | null) ?? null,
    text: (r.text as string | null) ?? '',
    translation: (r.translation as string | null) ?? null,
    language: (r.language as string | null) ?? null,
    sentiment: (r.sentiment as string | null) ?? 'negative',
    reason: (r.reason as string | null) ?? null,
    status: r.status as string,
    created_at: r.created_at as string,
  }));

  return <ModerationClient items={items} />;
}
