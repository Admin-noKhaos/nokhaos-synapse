// Meta Graph API helpers (Instagram Business + Facebook Pages).
// Docs: https://developers.facebook.com/docs/instagram-platform
//
// Auth flow (Instagram Business via Facebook Login):
//   1. Redirect user to https://www.facebook.com/{ver}/dialog/oauth with our app_id + scopes
//   2. Facebook redirects back to our callback with ?code=...
//   3. Exchange short-lived user token via /oauth/access_token
//   4. Exchange short-lived → long-lived (60 days)
//   5. Get pages with /me/accounts → pick page → get page access token
//   6. Get the connected Instagram Business account: /{page_id}?fields=instagram_business_account
//   7. Subscribe page to webhooks: POST /{page_id}/subscribed_apps
//
// Required scopes:
//   - instagram_basic
//   - instagram_manage_messages
//   - pages_messaging
//   - pages_show_list
//   - pages_manage_metadata
//   - business_management

import 'server-only';
import { ENV, metaConfigured } from '@/lib/env';

// Scope names changed when Meta moved Instagram to the "Use Cases" system.
// The legacy `instagram_basic` / `instagram_manage_messages` are rejected for
// apps that enabled the new "Manage messaging on Instagram" use case.
// New names use the `instagram_business_*` prefix.
const REQUIRED_SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_messages',
  'pages_show_list',
  'pages_manage_metadata',
  'business_management',
];

export function metaOAuthUrl(state: string): string {
  if (!metaConfigured()) {
    throw new Error('Meta App not configured. See docs/meta-app-setup.md.');
  }
  const redirectUri = `${ENV.NEXT_PUBLIC_APP_URL}/api/meta/oauth/callback`;
  const params = new URLSearchParams({
    client_id: ENV.META_APP_ID!,
    redirect_uri: redirectUri,
    scope: REQUIRED_SCOPES.join(','),
    response_type: 'code',
    state,
  });
  return `https://www.facebook.com/${ENV.META_GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
}

const GRAPH = () => `https://graph.facebook.com/${ENV.META_GRAPH_VERSION}`;

type ExchangeResp = { access_token: string; expires_in?: number; token_type?: string };

export async function exchangeCodeForToken(code: string): Promise<ExchangeResp> {
  const redirectUri = `${ENV.NEXT_PUBLIC_APP_URL}/api/meta/oauth/callback`;
  const url = new URL(`${GRAPH()}/oauth/access_token`);
  url.searchParams.set('client_id', ENV.META_APP_ID!);
  url.searchParams.set('client_secret', ENV.META_APP_SECRET!);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('code', code);
  const r = await fetch(url, { method: 'GET' });
  if (!r.ok) throw new Error(`exchange code failed: ${r.status} ${await r.text()}`);
  return r.json();
}

export async function exchangeForLongLivedUserToken(shortLived: string): Promise<ExchangeResp> {
  const url = new URL(`${GRAPH()}/oauth/access_token`);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', ENV.META_APP_ID!);
  url.searchParams.set('client_secret', ENV.META_APP_SECRET!);
  url.searchParams.set('fb_exchange_token', shortLived);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`long-lived exchange failed: ${r.status} ${await r.text()}`);
  return r.json();
}

export type MetaPage = {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  instagram_business_account?: { id: string };
};

export async function listManagedPages(userToken: string): Promise<MetaPage[]> {
  const url = new URL(`${GRAPH()}/me/accounts`);
  url.searchParams.set('fields', 'id,name,access_token,category,instagram_business_account');
  url.searchParams.set('access_token', userToken);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`list pages failed: ${r.status} ${await r.text()}`);
  const json = await r.json();
  return json.data ?? [];
}

export async function getInstagramAccount(pageId: string, pageToken: string): Promise<{ id: string; username: string; followers_count?: number; profile_picture_url?: string } | null> {
  const url = new URL(`${GRAPH()}/${pageId}`);
  url.searchParams.set('fields', 'instagram_business_account{id,username,followers_count,profile_picture_url}');
  url.searchParams.set('access_token', pageToken);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`get IG account failed: ${r.status} ${await r.text()}`);
  const json = await r.json();
  return json.instagram_business_account ?? null;
}

export async function subscribePageToWebhooks(pageId: string, pageToken: string): Promise<void> {
  const url = new URL(`${GRAPH()}/${pageId}/subscribed_apps`);
  url.searchParams.set('subscribed_fields', 'messages,messaging_postbacks,messaging_seen,message_reactions');
  url.searchParams.set('access_token', pageToken);
  const r = await fetch(url, { method: 'POST' });
  if (!r.ok) throw new Error(`subscribe webhooks failed: ${r.status} ${await r.text()}`);
}

// Send an Instagram DM via the Page Messages API.
// Reference: https://developers.facebook.com/docs/messenger-platform/instagram/features/send-message
export async function sendInstagramMessage(args: {
  pageId: string;
  pageToken: string;
  recipientIgId: string;
  text: string;
}): Promise<{ message_id?: string; recipient_id?: string }> {
  const url = new URL(`${GRAPH()}/${args.pageId}/messages`);
  url.searchParams.set('access_token', args.pageToken);
  const body = {
    recipient: { id: args.recipientIgId },
    messaging_type: 'RESPONSE',
    message: { text: args.text },
  };
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`send message failed: ${r.status} ${await r.text()}`);
  return r.json();
}
