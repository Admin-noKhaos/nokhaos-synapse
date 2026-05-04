import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// Marks an AI-drafted message as no-longer-suggested. We don't delete it —
// keeps the audit trail.
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const admin = getSupabaseAdmin();
  // Read existing ai_meta, drop suggested flag
  const { data } = await admin.from('messages').select('ai_meta').eq('id', id).eq('org_id', session.org.id).single();
  const meta = (data?.ai_meta as Record<string, unknown> | null) ?? {};
  const newMeta = { ...meta, suggested: false, dismissed: true, dismissed_at: new Date().toISOString() };
  const { error } = await admin.from('messages').update({ ai_meta: newMeta }).eq('id', id).eq('org_id', session.org.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
