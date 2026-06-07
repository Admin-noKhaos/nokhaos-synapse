// Redirect target for the Facebook Login for Business flow. Exchanges the code,
// lists the user's Pages, subscribes each to webhooks, and upserts a meta_account
// row per Page (platform 'facebook', storing the long-lived Page token + linked IG).

import { NextResponse, type NextRequest } from 'next/server';
import {
  exchangeFbCode,
  exchangeFbLongLivedUserToken,
  getFbPages,
  subscribePageWebhooks,
  type FbPage,
} from '@/lib/meta/facebook';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { ENV } from '@/lib/env';

const FB_SCOPES = [
  'pages_show_list', 'pages_messaging', 'pages_manage_metadata', 'pages_read_engagement',
  'business_management', 'instagram_basic', 'instagram_manage_messages', 'instagram_manage_comments',
];

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error_description') || url.searchParams.get('error');

  const cookieState = req.cookies.get('fb_oauth_state')?.value;
  const orgId = req.cookies.get('fb_oauth_org')?.value;

  const back = (q: string) => NextResponse.redirect(new URL(`/settings?${q}`, ENV.NEXT_PUBLIC_APP_URL));

  if (error) return back(`meta_error=${encodeURIComponent(error)}`);
  if (!code || !state || !cookieState || !orgId || state !== cookieState) {
    return back('meta_error=state_mismatch');
  }

  try {
    const { access_token: shortUserToken } = await exchangeFbCode(code);
    const { access_token: longUserToken } = await exchangeFbLongLivedUserToken(shortUserToken);
    const pages = await getFbPages(longUserToken);

    if (pages.length === 0) return back('meta_error=no_pages');

    const admin = getSupabaseAdmin();
    let connected = 0;

    for (const page of pages) {
      let webhookOk = false;
      try {
        await subscribePageWebhooks(page.id, page.access_token);
        webhookOk = true;
      } catch (e) {
        console.error(`page ${page.id} webhook subscribe failed`, e);
      }

      const ok = await upsertPage(admin, orgId, page, webhookOk);
      if (ok) connected++;
    }

    const res = back(`meta_connected=fb&pages=${connected}`);
    res.cookies.delete('fb_oauth_state');
    res.cookies.delete('fb_oauth_org');
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    return back(`meta_error=${encodeURIComponent(msg)}`);
  }
}

// Upsert a Page connection. The only unique constraint is (org_id, ig_user_id),
// so: if the Page has a linked IG account, upsert on that key — which also
// *upgrades* an existing Instagram-Login row to a Page token (thread ownership).
// If the Page has no linked IG, match manually on (org_id, page_id).
async function upsertPage(
  admin: ReturnType<typeof getSupabaseAdmin>,
  orgId: string,
  page: FbPage,
  webhookOk: boolean,
): Promise<boolean> {
  const ig = page.instagram_business_account;
  const row = {
    org_id: orgId,
    platform: 'facebook' as const,
    ig_user_id: ig?.id ?? null,
    page_id: page.id,
    page_name: page.name,
    username: ig?.username ?? page.name,
    access_token: page.access_token,
    token_expires_at: null, // Page tokens from a long-lived user token don't expire
    scopes: FB_SCOPES,
    status: 'active' as const,
    webhook_subscribed: webhookOk,
    last_synced_at: new Date().toISOString(),
    meta: {
      connection: 'facebook_login',
      ig_username: ig?.username ?? null,
      ig_picture_url: ig?.profile_picture_url ?? null,
      ig_followers_count: ig?.followers_count ?? null,
    },
  };

  if (ig?.id) {
    const { error } = await admin.from('meta_accounts').upsert(row, { onConflict: 'org_id,ig_user_id' });
    if (error) { console.error('fb page upsert (by ig) failed', error.message); return false; }
    if (ig.followers_count) {
      await admin.from('organizations').update({ followers_count: ig.followers_count }).eq('id', orgId);
    }
    return true;
  }

  // No linked IG: match on (org_id, page_id) by hand.
  const { data: existing } = await admin
    .from('meta_accounts')
    .select('id')
    .eq('org_id', orgId)
    .eq('page_id', page.id)
    .maybeSingle();
  if (existing?.id) {
    const { error } = await admin.from('meta_accounts').update(row).eq('id', existing.id);
    if (error) { console.error('fb page update failed', error.message); return false; }
  } else {
    const { error } = await admin.from('meta_accounts').insert(row);
    if (error) { console.error('fb page insert failed', error.message); return false; }
  }
  return true;
}
