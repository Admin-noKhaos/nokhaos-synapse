// Handles the redirect back from Instagram after the user grants (or denies) permissions.
// Uses the Instagram Login flow (graph.instagram.com), NOT Facebook Login.

import { NextResponse, type NextRequest } from 'next/server';
import {
  exchangeCodeForShortToken,
  exchangeForLongLivedToken,
  getInstagramUser,
  subscribeIgWebhooks,
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
    // 1. short-lived token + IG user_id
    const { access_token: shortToken } = await exchangeCodeForShortToken(code);
    // 2. long-lived (60 days)
    const { access_token: longToken, expires_in } = await exchangeForLongLivedToken(shortToken);
    // 3. fetch user info
    const ig = await getInstagramUser(longToken);

    // 4. subscribe webhooks (non-fatal)
    let webhookOk = false;
    try {
      await subscribeIgWebhooks(ig.user_id, longToken);
      webhookOk = true;
    } catch (e) {
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
          ig_user_id: ig.user_id,
          page_id: null,
          page_name: null,
          username: ig.username,
          access_token: longToken,
          token_expires_at: expires_in ? new Date(Date.now() + expires_in * 1000).toISOString() : null,
          scopes: ['instagram_business_basic', 'instagram_business_manage_messages'],
          status: 'active',
          webhook_subscribed: webhookOk,
          last_synced_at: new Date().toISOString(),
          meta: {
            account_type: ig.account_type ?? null,
            ig_followers_count: ig.followers_count ?? null,
            ig_picture_url: ig.profile_picture_url ?? null,
            display_name: ig.name ?? null,
          },
        },
        { onConflict: 'org_id,ig_user_id' },
      );
    if (upsertErr) {
      console.error('meta_account upsert failed', upsertErr);
      return back(`meta_error=${encodeURIComponent(upsertErr.message)}`);
    }

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
