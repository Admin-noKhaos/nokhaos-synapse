// Master-doc version history + revert. Each entry is the doc as it was BEFORE a
// change (written by app edits and tester /teach commands). Org-scoped, admin only.

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('brain_md_history')
    .select('id, changed_by, source, note, created_at, brain_md')
    .eq('org_id', session.org.id)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Don't ship the full doc for every row — just a length + the id to revert with.
  const history = (data ?? []).map((h) => ({
    id: h.id,
    changed_by: h.changed_by,
    source: h.source,
    note: h.note,
    created_at: h.created_at,
    chars: (h.brain_md as string | null)?.length ?? 0,
  }));
  return NextResponse.json({ history });
}

const RevertBody = z.object({ id: z.string().uuid() });

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (session.org.role !== 'owner' && session.org.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  let body: z.infer<typeof RevertBody>;
  try {
    body = RevertBody.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: 'bad_request', detail: String(e) }, { status: 400 });
  }
  const admin = getSupabaseAdmin();
  const { data: snap, error: findErr } = await admin
    .from('brain_md_history')
    .select('brain_md')
    .eq('org_id', session.org.id)
    .eq('id', body.id)
    .maybeSingle();
  if (findErr) return NextResponse.json({ error: findErr.message }, { status: 500 });
  if (!snap) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Snapshot the current doc before reverting, so a revert is itself revertible.
  if (session.org.brain_md && session.org.brain_md !== snap.brain_md) {
    await admin.from('brain_md_history').insert({
      org_id: session.org.id,
      brain_md: session.org.brain_md,
      changed_by: session.user.email,
      source: 'app_revert',
      note: null,
    });
  }
  const supabase = await getSupabaseServer();
  const { error } = await supabase
    .from('organizations')
    .update({ brain_md: snap.brain_md as string, updated_at: new Date().toISOString() })
    .eq('id', session.org.id);
  if (error) return NextResponse.json({ error: 'revert_failed', detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
