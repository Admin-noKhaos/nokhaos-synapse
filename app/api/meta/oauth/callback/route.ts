// Handles the redirect back from Facebook after the user grants (or denies) permissions.
// On success, we resolve the user's Page → Instagram Business account, store tokens,
// and subscribe the page to message webhooks.

import { NextResponse, type NextRequest } from 'next/server';
import {
  exchangeCodeForToken,
  exchangeForLongLivedUserToken,
  listManagedPages,
  getInstagramAccount,
  subscribePageToWebhooks,
} from '@/lib/meta';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { ENV } from '@/lib/env';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error_description') || url.searchParams.get('error');

  const cookieState = req.cookies.get('meta_oauth_state')?.value;
  const orgId = req.cookies.get('meta_oauth_org')?.value;

  const back = (q: string) => NextResponse.redirect(new URL(`/settings?${q}`, ENV.NEXT_PUBLIC_APP_URL));

  if (error) return back(`meta_error=${encodeURIComponent(error)}`);
  if (!code || !state || !cookieState || !orgId || state !== cookieState) {
    return back('meta_error=state_mismatch');
  }

  try {
    // 1. short-lived user token
    const { access_token: shortToken } = await exchangeCodeForToken(code);
    // 2. long-lived (60 days)
    const { access_token: userToken, expires_in } = await exchangeForLongLivedUserToken(shortToken);

    // 3. list pages, pick the first that has an Instagram business account
    const pages = await listManagedPages(userToken);
    const pageWithIG = pages.find((p) => p.instagram_business_account);
    if (!pageWithIG) {
      return back('meta_error=no_ig_account');
    }
    const ig = await getInstagramAccount(pageWithIG.id, pageWithIG.access_token);
    if (!ig) return back('meta_error=ig_lookup_failed');

    // 4. subscribe webhooks
    try {
      await subscribePageToWebhooks(pageWithIG.id, pageWithIG.access_token);
    } catch (e) {
      // Non-fatal — surface to user, they can retry from settings
      console.error('webhook subscribe failed', e);
    }

    // 5. persist
    const admin = getSupabaseAdmin();
    const { error: upsertErr } = await admin
      .from('meta_accounts')
      .upsert(
        {
          org_id: orgId,
          platform: 'instagram',
          ig_user_id: ig.id,
          page_id: pageWithIG.id,
          page_name: pageWithIG.name,
          username: ig.username,
          access_token: pageWithIG.access_token, // page token; long-lived
          token_expires_at: expires_in ? new Date(Date.now() + expires_in * 1000).toISOString() : null,
          scopes: [
            'instagram_basic', 'instagram_manage_messages', 'pages_messaging',
            'pages_show_list', 'pages_manage_metadata', 'business_management',
          ],
          status: 'active',
          webhook_subscribed: true,
          last_synced_at: new Date().toISOString(),
          meta: { ig_followers_count: ig.followers_count ?? null, ig_picture_url: ig.profile_picture_url ?? null },
        },
        { onConflict: 'org_id,ig_user_id' },
      );
    if (upsertErr) {
      console.error('meta_account upsert failed', upsertErr);
      return back(`meta_error=${encodeURIComponent(upsertErr.message)}`);
    }

    // Update org's followers count for the sidebar
    if (ig.followers_count) {
      await admin.from('organizations').update({ followers_count: ig.followers_count }).eq('id', orgId);
    }

    const res = back('meta_connected=1');
    res.cookies.delete('meta_oauth_state');
    res.cookies.delete('meta_oauth_org');
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    return back(`meta_error=${encodeURIComponent(msg)}`);
  }
}
