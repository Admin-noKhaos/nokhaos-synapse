// Moderation actions on a flagged comment: delete it on the platform, or dismiss.
// Org-scoped. Delete calls the Graph API with the connected account's token.

import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { ENV } from '@/lib/env';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const action = body?.action as string | undefined;
  if (action !== 'delete' && action !== 'dismiss') {
    return NextResponse.json({ error: 'bad_action' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: row, error } = await admin
    .from('flagged_comments')
    .select('id, comment_id, platform, meta_account_id')
    .eq('org_id', session.org.id)
    .eq('id', id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (action === 'delete') {
    // Fetch the connected account's token to delete the comment on the platform.
    const { data: acct } = await admin
      .from('meta_accounts')
      .select('access_token, platform')
      .eq('id', row.meta_account_id ?? '')
      .maybeSingle();
    if (!acct?.access_token) {
      return NextResponse.json({ error: 'no_token', detail: 'No connected account token to delete with.' }, { status: 400 });
    }
    const host = (row.platform === 'facebook' || acct.platform === 'facebook') ? 'graph.facebook.com' : 'graph.instagram.com';
    const url = `https://${host}/${ENV.META_GRAPH_VERSION}/${row.comment_id}?access_token=${encodeURIComponent(acct.access_token)}`;
    const r = await fetch(url, { method: 'DELETE' });
    if (!r.ok) {
      const detail = (await r.text()).slice(0, 240);
      return NextResponse.json({ error: 'delete_failed', detail }, { status: 502 });
    }
  }

  const { error: upErr } = await admin
    .from('flagged_comments')
    .update({
      status: action === 'delete' ? 'deleted' : 'dismissed',
      handled_at: new Date().toISOString(),
      handled_by: session.user.id,
    })
    .eq('org_id', session.org.id)
    .eq('id', id);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
