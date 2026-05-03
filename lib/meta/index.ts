// Instagram Graph API helpers — uses the new Instagram Login flow (NOT Facebook Login).
// Docs: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login
//
// Auth flow:
//   1. Redirect user to https://www.instagram.com/oauth/authorize with scopes
//   2. Instagram redirects back with ?code=...
//   3. Exchange short-lived token via POST api.instagram.com/oauth/access_token
//   4. Exchange short → long-lived (60 days) via graph.instagram.com/access_token
//   5. Fetch user info via graph.instagram.com/v23.0/me
//   6. Subscribe IG account to webhooks via POST graph.instagram.com/{user_id}/subscribed_apps
//
// Required scopes (Use Cases system):
//   - instagram_business_basic
//   - instagram_business_manage_messages

import 'server-only';
import { ENV, metaConfigured } from '@/lib/env';

const REQUIRED_SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_messages',
];

const IG_GRAPH = () => `https://graph.instagram.com/${ENV.META_GRAPH_VERSION}`;

export function metaOAuthUrl(state: string): string {
  if (!metaConfigured()) {
    throw new Error('Meta App not configured. See docs/meta-app-setup.md.');
  }
  const redirectUri = `${ENV.NEXT_PUBLIC_APP_URL}/api/meta/oauth/callback`;
  const params = new URLSearchParams({
    enable_fb_login: '0',
    force_authentication: '1',
    client_id: ENV.META_APP_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: REQUIRED_SCOPES.join(','),
    state,
  });
  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

export type ShortTokenResp = { access_token: string; user_id: string | number; permissions?: string };

export async function exchangeCodeForShortToken(code: string): Promise<ShortTokenResp> {
  const redirectUri = `${ENV.NEXT_PUBLIC_APP_URL}/api/meta/oauth/callback`;
  const body = new URLSearchParams({
    client_id: ENV.META_APP_ID!,
    client_secret: ENV.META_APP_SECRET!,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code,
  });
  const r = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!r.ok) throw new Error(`exchange code failed: ${r.status} ${await r.text()}`);
  return r.json();
}

export type LongTokenResp = { access_token: string; expires_in: number; token_type: string };

export async function exchangeForLongLivedToken(shortToken: string): Promise<LongTokenResp> {
  const url = new URL('https://graph.instagram.com/access_token');
  url.searchParams.set('grant_type', 'ig_exchange_token');
  url.searchParams.set('client_secret', ENV.META_APP_SECRET!);
  url.searchParams.set('access_token', shortToken);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`long-lived exchange failed: ${r.status} ${await r.text()}`);
  return r.json();
}

export type IgUser = {
  user_id: string;
  username: string;
  account_type?: 'BUSINESS' | 'CREATOR' | 'MEDIA_CREATOR' | 'PERSONAL';
  followers_count?: number;
  profile_picture_url?: string;
  name?: string;
};

export async function getInstagramUser(accessToken: string): Promise<IgUser> {
  const url = new URL(`${IG_GRAPH()}/me`);
  url.searchParams.set('fields', 'user_id,username,account_type,followers_count,profile_picture_url,name');
  url.searchParams.set('access_token', accessToken);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`get IG user failed: ${r.status} ${await r.text()}`);
  const json = await r.json();
  return { ...json, user_id: String(json.user_id ?? json.id) };
}

export async function subscribeIgWebhooks(igUserId: string, accessToken: string): Promise<void> {
  const url = new URL(`${IG_GRAPH()}/${igUserId}/subscribed_apps`);
  url.searchParams.set('subscribed_fields', 'messages,messaging_postbacks,message_reactions');
  url.searchParams.set('access_token', accessToken);
  const r = await fetch(url, { method: 'POST' });
  if (!r.ok) throw new Error(`subscribe webhooks failed: ${r.status} ${await r.text()}`);
}

// Send an Instagram DM via the IG Graph API.
// Reference: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api
export async function sendInstagramMessage(args: {
  igUserId: string;
  accessToken: string;
  recipientIgId: string;
  text: string;
}): Promise<{ message_id?: string; recipient_id?: string }> {
  const url = `${IG_GRAPH()}/${args.igUserId}/messages`;
  const body = {
    recipient: { id: args.recipientIgId },
    message: { text: args.text },
  };
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${args.accessToken}` },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`send message failed: ${r.status} ${await r.text()}`);
  return r.json();
}
