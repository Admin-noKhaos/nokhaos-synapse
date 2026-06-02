// Remove a tester from the whitelist. Org-scoped; owner/admin only.

import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (session.org.role !== 'owner' && session.org.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { id } = await ctx.params;
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from('automation_testers')
    .delete()
    .eq('org_id', session.org.id)
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
