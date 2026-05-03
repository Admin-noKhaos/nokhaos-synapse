// Meta sends a signed POST here when a user removes our app from their Facebook
// account (App Settings → Apps and Websites → Remove). We must:
//   1. Verify the HMAC signature using the App Secret
//   2. Revoke the user's access token + flag the meta_account row as 'revoked'
//   3. Return JSON: { url, confirmation_code } so Meta can show a status link
//
// Reference: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback/

import { NextResponse, type NextRequest } from 'next/server';
import { createHmac, randomBytes } from 'node:crypto';
import { ENV } from '@/lib/env';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

function base64urlDecode(b64url: string): Buffer {
  const pad = '='.repeat((4 - (b64url.length % 4)) % 4);
  return Buffer.from((b64url + pad).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function parseSignedRequest(signedRequest: string, appSecret: string):
  | { ok: true; payload: { user_id?: string; algorithm?: string; issued_at?: number } }
  | { ok: false; reason: string } {
  const [encodedSig, encodedPayload] = signedRequest.split('.', 2);
  if (!encodedSig || !encodedPayload) return { ok: false, reason: 'malformed' };

  const expected = createHmac('sha256', appSecret).update(encodedPayload, 'utf8').digest();
  const provided = base64urlDecode(encodedSig);
  if (expected.length !== provided.length) return { ok: false, reason: 'sig_length' };
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) mismatch |= expected[i] ^ provided[i];
  if (mismatch !== 0) return { ok: false, reason: 'sig_mismatch' };

  try {
    const payload = JSON.parse(base64urlDecode(encodedPayload).toString('utf8'));
    return { ok: true, payload };
  } catch {
    return { ok: false, reason: 'payload_parse' };
  }
}

export async function POST(req: NextRequest) {
  if (!ENV.META_APP_SECRET) {
    return NextResponse.json({ error: 'meta_not_configured' }, { status: 503 });
  }

  // Meta sends signed_request as form-encoded body
  let signedRequest: string | null = null;
  const contentType = req.headers.get('content-type') ?? '';
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const form = await req.formData();
    signedRequest = String(form.get('signed_request') ?? '');
  } else if (contentType.includes('application/json')) {
    const body = await req.json().catch(() => ({}));
    signedRequest = body?.signed_request ?? null;
  } else {
    // Some Meta retries omit content-type; try formData first then text fallback.
    const text = await req.text();
    const params = new URLSearchParams(text);
    signedRequest = params.get('signed_request');
  }

  if (!signedRequest) {
    return NextResponse.json({ error: 'missing_signed_request' }, { status: 400 });
  }

  const parsed = parseSignedRequest(signedRequest, ENV.META_APP_SECRET);
  if (!parsed.ok) {
    return NextResponse.json({ error: 'bad_signature', reason: parsed.reason }, { status: 401 });
  }

  const fbUserId = parsed.payload.user_id;
  // Generate a unique confirmation code so the user (or Meta) can check status later.
  const confirmationCode = randomBytes(12).toString('hex');

  // Persist the deletion request + immediately revoke any tokens we have for this user.
  // We match by the FB user_id either at the page connector level or just record an audit.
  try {
    const admin = getSupabaseAdmin();
    await admin.from('webhook_events').insert({
      source: 'meta_deauth',
      event_type: 'data_deletion_request',
      payload: { fb_user_id: fbUserId, confirmation_code: confirmationCode, issued_at: parsed.payload.issued_at },
      signature_valid: true,
    });
    // We don't currently store the raw FB user_id (we store the page+IG ids).
    // The Render worker handles actual deletion async by reading webhook_events.
    // For accounts where we can resolve the user, mark meta_accounts revoked:
    if (fbUserId) {
      await admin
        .from('meta_accounts')
        .update({ status: 'revoked', access_token: '', webhook_subscribed: false })
        .eq('meta->>fb_user_id', fbUserId);
    }
  } catch (e) {
    console.error('deauth processing failed', e);
    // Still return success to Meta — they retry on non-2xx and we already logged
  }

  // Meta expects this exact response shape.
  return NextResponse.json({
    url: `${ENV.NEXT_PUBLIC_APP_URL}/data-deletion/status/${confirmationCode}`,
    confirmation_code: confirmationCode,
  });
}

// Meta sometimes verifies the URL with a GET — return a friendly page so the
// validator sees a 200.
export async function GET() {
  return NextResponse.json({
    ok: true,
    info: 'POST a signed_request here to request data deletion. See /data-deletion for human instructions.',
  });
}
