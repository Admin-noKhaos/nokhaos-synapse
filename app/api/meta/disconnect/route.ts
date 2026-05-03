// Disconnect a Meta account: revoke the IG webhook subscription, delete the
// meta_account row. The user can re-connect to mint a fresh token (e.g. after
// switching IG account type from Creator to Business).

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { ENV } from '@/lib/env';

const Body = z.object({ id: z.string().uuid() });

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: 'bad_request', detail: String(e) }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  // Verify the account belongs to the caller's org
  const { data: account } = await admin
    .from('meta_accounts')
    .select('id, ig_user_id, access_token')
    .eq('id', body.id)
    .eq('org_id', session.org.id)
    .single();
  if (!account) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Best-effort: tell Meta we're unsubscribing the page from webhooks
  if (account.ig_user_id && account.access_token) {
    try {
      const url = new URL(`https://graph.instagram.com/${ENV.META_GRAPH_VERSION}/${account.ig_user_id}/subscribed_apps`);
      url.searchParams.set('access_token', account.access_token);
      await fetch(url, { method: 'DELETE' });
    } catch {
      // non-fatal — the row is going away anyway
    }
  }

  // Delete the row (cascades won't touch leads/conversations because
  // meta_account_id is set to null on delete by the FK)
  const { error } = await admin.from('meta_accounts').delete().eq('id', body.id);
  if (error) return NextResponse.json({ error: 'delete_failed', detail: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
