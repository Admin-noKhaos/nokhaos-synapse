import 'server-only';
import { getSupabaseServer } from '@/lib/supabase/server';

export type SmartLinkSummary = {
  id: string;
  slug: string;
  title: string;
  destination_url: string;
  status: 'live' | 'paused' | 'beta' | 'draft';
  ai_enabled: boolean;
  click_count: number;
  created_at: string;
};

export async function listSmartLinks(orgId: string): Promise<SmartLinkSummary[]> {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from('smart_links')
    .select('id, slug, title, destination_url, status, ai_enabled, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('listSmartLinks', error);
    return [];
  }
  // Fetch click counts in a second round trip (cheap; just counts)
  const ids = (data ?? []).map((l) => l.id);
  const counts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: clickRows } = await supabase
      .from('smart_link_clicks')
      .select('link_id')
      .in('link_id', ids);
    for (const r of clickRows ?? []) {
      counts.set(r.link_id, (counts.get(r.link_id) ?? 0) + 1);
    }
  }
  return (data ?? []).map((l) => ({
    id: l.id,
    slug: l.slug,
    title: l.title,
    destination_url: l.destination_url,
    status: l.status as SmartLinkSummary['status'],
    ai_enabled: !!l.ai_enabled,
    click_count: counts.get(l.id) ?? 0,
    created_at: l.created_at,
  }));
}
