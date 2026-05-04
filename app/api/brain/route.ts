// Save / read the org's master doc (brain_md). Editable by org admins+.

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';

const Body = z.object({ brain_md: z.string().max(200_000) });

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json({ brain_md: session.org.brain_md });
}

export async function PUT(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (session.org.role !== 'owner' && session.org.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: 'bad_request', detail: String(e) }, { status: 400 });
  }
  const supabase = await getSupabaseServer();
  const { error } = await supabase
    .from('organizations')
    .update({ brain_md: body.brain_md, updated_at: new Date().toISOString() })
    .eq('id', session.org.id);
  if (error) return NextResponse.json({ error: 'save_failed', detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, length: body.brain_md.length });
}
