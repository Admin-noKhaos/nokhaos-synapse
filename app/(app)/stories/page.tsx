import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { StoryRepliesClient } from './StoryRepliesClient';

export default async function StoryRepliesPage() {
  const session = await getCurrentSession();
  if (!session) redirect('/login');

  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('conversations')
    .select(`id, last_message_at, channel, lead:leads(username, display_name, score, sentiment)`)
    .eq('org_id', session.org.id)
    .eq('channel', 'story_reply')
    .order('last_message_at', { ascending: false })
    .limit(50);

  type Row = { id: string; last_message_at: string | null; lead: Array<{ username: string | null; display_name: string | null; score: number; sentiment: 'hot' | 'warm' | 'cold' | null }> | { username: string | null; display_name: string | null; score: number; sentiment: 'hot' | 'warm' | 'cold' | null } | null };
  const replies = (data ?? []).map((r) => {
    const row = r as unknown as Row;
    const lead = (Array.isArray(row.lead) ? row.lead[0] : row.lead) ?? null;
    return {
      id: r.id,
      name: lead?.display_name || lead?.username || 'Unknown',
      handle: '@' + (lead?.username ?? '—'),
      score: Math.round(Number(lead?.score ?? 0)),
      sentiment: lead?.sentiment ?? null,
      when: r.last_message_at,
    };
  });

  return <StoryRepliesClient replies={replies} />;
}
