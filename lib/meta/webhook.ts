// Verify Meta webhook signatures (X-Hub-Signature-256: sha256=<hex>).
import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { ENV } from '@/lib/env';

export function verifyMetaSignature(rawBody: string, headerSignature: string | null): boolean {
  if (!headerSignature) return false;
  // Instagram Login webhooks are signed with the Instagram app secret; Facebook
  // Page webhooks with the parent app secret. Accept either so both validate.
  const secrets = [ENV.META_APP_SECRET, ENV.META_FB_APP_SECRET].filter(Boolean) as string[];
  const a = Buffer.from(headerSignature);
  for (const secret of secrets) {
    const expected = 'sha256=' + createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
    const b = Buffer.from(expected);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}

// Meta sends a GET handshake when you subscribe. Reply with hub.challenge if hub.verify_token matches.
export function handleSubscriptionHandshake(searchParams: URLSearchParams): { ok: true; challenge: string } | { ok: false; reason: string } {
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  if (mode !== 'subscribe') return { ok: false, reason: 'mode' };
  if (!ENV.META_VERIFY_TOKEN || token !== ENV.META_VERIFY_TOKEN) return { ok: false, reason: 'token' };
  if (!challenge) return { ok: false, reason: 'challenge' };
  return { ok: true, challenge };
}
