// Meta webhook receiver. GET = subscription handshake. POST = event delivery.
// We persist raw payloads immediately and let the Render worker process them
// asynchronously — this keeps webhook responses fast (<1s, as Meta requires).

import { NextResponse, type NextRequest } from 'next/server';
import { handleSubscriptionHandshake, verifyMetaSignature } from '@/lib/meta/webhook';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const result = handleSubscriptionHandshake(new URL(req.url).searchParams);
  if (result.ok) return new NextResponse(result.challenge, { status: 200 });
  return new NextResponse(`bad handshake: ${result.reason}`, { status: 403 });
}

// Kronos runs its own automations off the same Meta app, but the app has ONE
// webhook callback — this one. Relay every signature-valid payload so both
// products see every event. The shared secret header is how Kronos trusts the
// copy: IG-Login deliveries are signed with OUR Instagram app secret, which
// Kronos doesn't hold, so it can't re-verify the Meta signature itself.
// Best-effort with a hard timeout — a slow or down Kronos must never delay the
// 200 Meta is waiting on for long enough to trigger its retry ladder.
async function forwardToKronos(raw: string, sig: string | null): Promise<void> {
  const url = process.env.KRONOS_FORWARD_URL;
  const secret = process.env.KRONOS_FORWARD_SECRET;
  if (!url || !secret) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forward-secret': secret,
        ...(sig ? { 'x-hub-signature-256': sig } : {}),
      },
      body: raw,
      signal: AbortSignal.timeout(3000),
    });
  } catch (e) {
    console.error('[webhook] kronos forward failed', e instanceof Error ? e.message : String(e));
  }
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get('x-hub-signature-256');
  const valid = verifyMetaSignature(raw, sig);

  let payload: unknown = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = { _parse_error: true, raw };
  }

  // Always persist (even invalid sigs) so we have a forensic trail.
  const admin = getSupabaseAdmin();
  await admin.from('webhook_events').insert({
    source: 'meta',
    event_type: typeof payload === 'object' && payload && 'object' in payload ? String((payload as { object: unknown }).object) : null,
    payload: payload as Record<string, unknown>,
    signature_valid: valid,
  });

  // Only verified payloads are relayed — Kronos treats the forward secret as
  // proof of authenticity, so nothing unverified may ride it.
  if (valid) await forwardToKronos(raw, sig);

  // Reply 200 fast — worker picks up unprocessed rows and runs the actual logic.
  // (Meta retries non-2xx responses.)
  return NextResponse.json({ received: true });
}
