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

  // Reply 200 fast — worker picks up unprocessed rows and runs the actual logic.
  // (Meta retries non-2xx responses.)
  return NextResponse.json({ received: true });
}
