import 'server-only';
import { getSupabaseServer } from '@/lib/supabase/server';

export type Contact = {
  id: string;
  name: string;
  handle: string;
  region: string;
  followers: string;
  score: number;
  sentiment: 'hot' | 'warm' | 'cold' | null;
  funnel: string | null;
  last: string;
  touch: number;
  ai_notes: string | null;
};

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export async function listContacts(orgId: string): Promise<Contact[]> {
  const supabase = await getSupabaseServer();
  const { data: leads } = await supabase
    .from('leads')
    .select('id, ig_user_id, username, display_name, score, sentiment, funnel_label, ai_notes, profile, last_active_at, tags')
    .eq('org_id', orgId)
    .order('score', { ascending: false })
    .limit(500);

  const ids = (leads ?? []).map((l) => l.id);
  const touchByLead = new Map<string, number>();
  if (ids.length > 0) {
    const { data: convs } = await supabase
      .from('conversations')
      .select('lead_id, unread_count')
      .in('lead_id', ids);
    for (const c of convs ?? []) {
      if (!c.lead_id) continue;
      touchByLead.set(c.lead_id, (touchByLead.get(c.lead_id) ?? 0) + 1);
    }
  }

  return (leads ?? []).map((l) => {
    const profile = (l.profile as { followers_count?: number; region?: string } | null) ?? null;
    return {
      id: l.id,
      name: l.display_name || l.username || 'Unknown',
      handle: '@' + (l.username ?? '—'),
      region: profile?.region ?? '—',
      followers: profile?.followers_count ? profile.followers_count.toLocaleString() : '—',
      score: Math.round(Number(l.score ?? 0)),
      sentiment: (l.sentiment as Contact['sentiment']) ?? null,
      funnel: l.funnel_label ?? null,
      last: relativeTime(l.last_active_at),
      touch: touchByLead.get(l.id) ?? 0,
      ai_notes: l.ai_notes ?? null,
    };
  });
}
