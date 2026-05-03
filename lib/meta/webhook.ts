// Verify Meta webhook signatures (X-Hub-Signature-256: sha256=<hex>).
import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { ENV } from '@/lib/env';

export function verifyMetaSignature(rawBody: string, headerSignature: string | null): boolean {
  if (!headerSignature || !ENV.META_APP_SECRET) return false;
  const expected = 'sha256=' + createHmac('sha256', ENV.META_APP_SECRET).update(rawBody, 'utf8').digest('hex');
  const a = Buffer.from(headerSignature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
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
