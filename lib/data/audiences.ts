import 'server-only';
import { getSupabaseServer } from '@/lib/supabase/server';

export type AudienceSummary = {
  id: string;
  name: string;
  color: string | null;
  criteria: { label: string }[];
  size: number;
  growth_pct: number | null;
  avg_score: number | null;
  auto: boolean;
  updated_at: string;
};

export async function listAudiences(orgId: string): Promise<AudienceSummary[]> {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from('audiences')
    .select('id, name, color, criteria, size, growth_pct, avg_score, auto, updated_at')
    .eq('org_id', orgId)
    .order('size', { ascending: false });
  if (error) {
    console.error('listAudiences', error);
    return [];
  }
  return (data ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    color: a.color,
    criteria: Array.isArray(a.criteria) ? (a.criteria as { label: string }[]) : [],
    size: a.size ?? 0,
    growth_pct: a.growth_pct === null ? null : Number(a.growth_pct),
    avg_score: a.avg_score === null ? null : Number(a.avg_score),
    auto: !!a.auto,
    updated_at: a.updated_at,
  }));
}
