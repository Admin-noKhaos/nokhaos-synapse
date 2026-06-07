// Facebook Page integration — uses Facebook Login for Business (graph.facebook.com),
// NOT the Instagram Login flow in ./index.ts.
//
// Why this exists: the Instagram Login flow makes Synapse a *secondary* receiver on
// any IG account whose Page messaging is owned by another app (the "not the thread
// owner" / 2534037 failures). Connecting the Facebook Page directly with a Page
// access token makes Synapse the owner, and also unlocks Facebook Page DMs + comments.
//
// Auth flow:
//   1. Redirect to https://www.facebook.com/{v}/dialog/oauth with Page scopes
//   2. FB redirects back with ?code=...
//   3. Exchange code -> short-lived USER token (graph.facebook.com/oauth/access_token)
//   4. Exchange short -> long-lived USER token (grant_type=fb_exchange_token)
//   5. GET /me/accounts -> each Page + its long-lived Page token + linked IG account
//   6. POST /{page-id}/subscribed_apps to subscribe the Page to webhooks
//
// IMPORTANT: client_id/secret here are the PARENT Meta app credentials
// (META_FB_APP_ID / META_FB_APP_SECRET), which differ from the Instagram app
// id/secret used by ./index.ts.

import 'server-only';
import { ENV, fbConfigured } from '@/lib/env';

const FB_GRAPH = () => `https://graph.facebook.com/${ENV.META_GRAPH_VERSION}`;

// Page scopes. These map to the "Manage everything on your Page" + Messenger
// use cases in the Meta dashboard.
const REQUIRED_FB_SCOPES = [
  'pages_show_list',
  'pages_messaging',
  'pages_manage_metadata',
  'pages_read_engagement',
  'business_management',
  'instagram_basic',
  'instagram_manage_messages',
  'instagram_manage_comments',
];

function fbRedirectUri(): string {
  return `${ENV.NEXT_PUBLIC_APP_URL}/api/meta/fb/oauth/callback`;
}

export function fbOAuthUrl(state: string): string {
  if (!fbConfigured()) {
    throw new Error('Facebook app not configured (META_FB_APP_ID / META_FB_APP_SECRET). See docs/facebook-app-setup.md.');
  }
  const params = new URLSearchParams({
    client_id: ENV.META_FB_APP_ID!,
    redirect_uri: fbRedirectUri(),
    response_type: 'code',
    scope: REQUIRED_FB_SCOPES.join(','),
    state,
  });
  return `https://www.facebook.com/${ENV.META_GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
}

export async function exchangeFbCode(code: string): Promise<{ access_token: string; expires_in?: number }> {
  const url = new URL(`${FB_GRAPH()}/oauth/access_token`);
  url.searchParams.set('client_id', ENV.META_FB_APP_ID!);
  url.searchParams.set('client_secret', ENV.META_FB_APP_SECRET!);
  url.searchParams.set('redirect_uri', fbRedirectUri());
  url.searchParams.set('code', code);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fb code exchange failed: ${r.status} ${await r.text()}`);
  return r.json();
}

export async function exchangeFbLongLivedUserToken(shortToken: string): Promise<{ access_token: string; expires_in?: number }> {
  const url = new URL(`${FB_GRAPH()}/oauth/access_token`);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', ENV.META_FB_APP_ID!);
  url.searchParams.set('client_secret', ENV.META_FB_APP_SECRET!);
  url.searchParams.set('fb_exchange_token', shortToken);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fb long-lived exchange failed: ${r.status} ${await r.text()}`);
  return r.json();
}

export type FbPage = {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: {
    id: string;
    username?: string;
    profile_picture_url?: string;
    followers_count?: number;
  };
};

// List the Pages the user granted, each with its long-lived Page token (long-lived
// because we exchanged the user token first) and the linked IG business account.
export async function getFbPages(userToken: string): Promise<FbPage[]> {
  const url = new URL(`${FB_GRAPH()}/me/accounts`);
  url.searchParams.set(
    'fields',
    'id,name,access_token,instagram_business_account{id,username,profile_picture_url,followers_count}',
  );
  url.searchParams.set('limit', '100');
  url.searchParams.set('access_token', userToken);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fb /me/accounts failed: ${r.status} ${await r.text()}`);
  const json = (await r.json()) as { data?: FbPage[] };
  return json.data ?? [];
}

// Fields we subscribe each connected Page to. `messages`/`messaging_postbacks`
// power DM automations; `feed` delivers Facebook post comments.
export const PAGE_WEBHOOK_FIELDS = 'messages,messaging_postbacks,messaging_optins,message_reactions,feed';

export async function subscribePageWebhooks(pageId: string, pageToken: string): Promise<void> {
  const url = new URL(`${FB_GRAPH()}/${pageId}/subscribed_apps`);
  url.searchParams.set('subscribed_fields', PAGE_WEBHOOK_FIELDS);
  url.searchParams.set('access_token', pageToken);
  const r = await fetch(url, { method: 'POST' });
  if (!r.ok) throw new Error(`subscribe page webhooks failed: ${r.status} ${await r.text()}`);
}

// Send a Facebook Page message (Messenger) on behalf of the Page.
export async function sendFacebookMessage(args: {
  pageId: string;
  pageToken: string;
  recipientPsid: string;
  text: string;
}): Promise<{ message_id?: string; recipient_id?: string }> {
  const url = `${FB_GRAPH()}/${args.pageId}/messages`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${args.pageToken}` },
    body: JSON.stringify({ recipient: { id: args.recipientPsid }, message: { text: args.text } }),
  });
  if (!r.ok) throw new Error(`fb send message failed: ${r.status} ${await r.text()}`);
  return r.json();
}
