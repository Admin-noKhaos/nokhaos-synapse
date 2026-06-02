// Manage the whitelist of Instagram accounts allowed to drive the bot via DM
// commands (/reset, /teach, /undo). Org-scoped; owner/admin only.

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const Body = z.object({
  username: z.string().trim().max(100).optional(),
  ig_user_id: z.string().trim().max(64).optional(),
  label: z.string().trim().max(120).optional(),
}).refine((b) => !!(b.username || b.ig_user_id), { message: 'username or ig_user_id required' });

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('automation_testers')
    .select('id, ig_user_id, username, label, created_at')
    .eq('org_id', session.org.id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ testers: data ?? [] });
}

export async function POST(req: NextRequest) {
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
  // Normalise: strip a leading @ and lowercase usernames.
  const username = body.username ? body.username.replace(/^@+/, '').toLowerCase() : null;
  const ig_user_id = body.ig_user_id || null;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('automation_testers')
    .insert({ org_id: session.org.id, username, ig_user_id, label: body.label || null })
    .select('id')
    .single();
  if (error) {
    const dup = error.message.toLowerCase().includes('duplicate') || error.code === '23505';
    return NextResponse.json({ error: dup ? 'already_added' : 'insert_failed', detail: error.message }, { status: dup ? 409 : 500 });
  }
  return NextResponse.json({ ok: true, id: data.id });
}
