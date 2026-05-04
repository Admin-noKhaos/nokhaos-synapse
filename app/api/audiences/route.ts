// Auto-build an audience segment from existing leads matching a simple criterion.
// Body shapes:
//   { template: 'high_intent' }    — leads with score >= 70
//   { template: 'objections' }     — leads with intent:objection tag
//   { template: 'all_leads' }      — every lead
//   { name, color, leads_filter: { score_gte?, sentiment?, tag? } }   — custom

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';

const Body = z.object({
  template: z.enum(['high_intent', 'objections', 'cold_lapsed', 'all_leads']).optional(),
  name: z.string().min(1).max(120).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

const TEMPLATES: Record<string, {
  name: string; color: string;
  filter: { score_gte?: number; sentiment?: string; tag?: string };
}> = {
  high_intent:  { name: 'High intent (score \u2265 70)', color: '#34E08A', filter: { score_gte: 70 } },
  objections:   { name: 'Active objections',          color: '#FFB340', filter: { tag: 'intent:objection' } },
  cold_lapsed:  { name: 'Cold leads',                 color: '#5AB0FF', filter: { sentiment: 'cold' } },
  all_leads:    { name: 'Everyone',                   color: '#DDA0FF', filter: {} },
};

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: 'bad_request', detail: String(e) }, { status: 400 });
  }

  const tpl = body.template ? TEMPLATES[body.template] : null;
  if (!tpl) return NextResponse.json({ error: 'template_required' }, { status: 400 });

  const supabase = await getSupabaseServer();

  // Find matching leads
  let q = supabase.from('leads').select('id, score').eq('org_id', session.org.id);
  if (tpl.filter.score_gte !== undefined) q = q.gte('score', tpl.filter.score_gte);
  if (tpl.filter.sentiment) q = q.eq('sentiment', tpl.filter.sentiment);
  if (tpl.filter.tag) q = q.contains('tags', [tpl.filter.tag]);

  const { data: leads, error: leadsErr } = await q.limit(5000);
  if (leadsErr) return NextResponse.json({ error: 'leads_query_failed', detail: leadsErr.message }, { status: 500 });

  const leadIds = (leads ?? []).map((l) => l.id);
  const avgScore = leads && leads.length
    ? leads.reduce((a, l) => a + Number(l.score ?? 0), 0) / leads.length
    : 0;

  // Create the audience
  const criteria = Object.entries(tpl.filter).map(([k, v]) => ({ label: `${k}: ${v}` }));
  const { data: audience, error: audErr } = await supabase
    .from('audiences')
    .insert({
      org_id: session.org.id,
      name: body.name ?? tpl.name,
      color: body.color ?? tpl.color,
      criteria,
      size: leadIds.length,
      avg_score: avgScore.toFixed(2),
      auto: true,
    })
    .select('id')
    .single();
  if (audErr) return NextResponse.json({ error: 'insert_failed', detail: audErr.message }, { status: 500 });

  // Bulk insert membership rows
  if (leadIds.length > 0) {
    const rows = leadIds.map((lid) => ({ audience_id: audience.id, lead_id: lid }));
    const { error: memErr } = await supabase.from('audience_members').upsert(rows, { onConflict: 'audience_id,lead_id' });
    if (memErr) console.error('audience_members upsert', memErr);
  }

  return NextResponse.json({ ok: true, id: audience.id, size: leadIds.length });
}
