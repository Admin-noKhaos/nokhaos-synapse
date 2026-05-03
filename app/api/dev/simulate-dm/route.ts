// Simulate an inbound Instagram DM — bypasses Meta's webhook delivery for
// development & testing. Constructs a payload identical in shape to what
// Meta sends, drops it into webhook_events with signature_valid=true, and
// lets the Render worker pick it up like any other event.
//
// Useful when:
//   - The Meta App is in Development mode and won't deliver real DMs reliably
//   - You're testing flow logic and don't want to actually send DMs back
//   - You're debugging the worker without involving Instagram
//
// Auth: requires a logged-in session — the recipient is the caller's first
// connected meta_account.

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { getCurrentSession } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const Body = z.object({
  from_handle: z.string().min(1).max(64).optional(),
  from_id: z.string().min(1).max(64).optional(),
  text: z.string().min(1).max(2000),
});

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: 'bad_request', detail: String(e) }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  // Find the org's first active meta_account — that's the recipient.
  const { data: account } = await admin
    .from('meta_accounts')
    .select('ig_user_id')
    .eq('org_id', session.org.id)
    .eq('status', 'active')
    .order('connected_at', { ascending: false })
    .limit(1)
    .single();

  if (!account?.ig_user_id) {
    return NextResponse.json({ error: 'no_meta_account', detail: 'Connect Instagram in Settings first.' }, { status: 400 });
  }

  // Stable synthetic sender_id derived from the handle, so re-sending from the
  // same simulated user collapses to the same lead/conversation.
  const handle = (body.from_handle ?? 'sim_user').replace(/^@/, '').toLowerCase();
  const senderId =
    body.from_id ??
    'sim_' + createHash('sha256').update(`${session.org.id}:${handle}`).digest('hex').slice(0, 16);

  // Build a payload that exactly mimics the Instagram Login flow webhook shape.
  const ts = Math.floor(Date.now() / 1000);
  const mid = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const payload = {
    object: 'instagram',
    entry: [
      {
        id: account.ig_user_id,
        time: ts,
        changes: [
          {
            field: 'messages',
            value: {
              sender: { id: senderId },
              recipient: { id: account.ig_user_id },
              timestamp: String(ts),
              message: { mid, text: body.text },
            },
          },
        ],
      },
    ],
  };

  const { error } = await admin.from('webhook_events').insert({
    source: 'meta_simulator',
    event_type: 'instagram',
    payload,
    signature_valid: true, // simulator is trusted; lets the worker pick it up
  });
  if (error) return NextResponse.json({ error: 'insert_failed', detail: error.message }, { status: 500 });

  // Pre-create / update the lead's username so the inbox shows a friendly name
  // (the worker only knows the IG user_id; usernames usually come from a
  // separate Graph API call which we skip for simulated leads).
  await admin
    .from('leads')
    .upsert(
      { org_id: session.org.id, ig_user_id: senderId, username: handle, display_name: handle },
      { onConflict: 'org_id,ig_user_id' },
    );

  return NextResponse.json({
    ok: true,
    poll_seconds: 2,
    note: 'The worker polls every 2s. Refresh /inbox shortly.',
    sender_id: senderId,
  });
}
