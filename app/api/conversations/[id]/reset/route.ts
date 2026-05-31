// Reset a conversation to a clean slate — deletes all of its messages and
// clears the conversation counters. Intended for testing automations against a
// real lead without spinning up a fresh Instagram account each time.

import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const orgId = session.org.id;

  // Verify the conversation belongs to this org (RLS-scoped read) before mutating.
  const supabase = await getSupabaseServer();
  const { data: conv, error: findErr } = await supabase
    .from('conversations')
    .select('id, lead_id')
    .eq('org_id', orgId)
    .eq('id', id)
    .maybeSingle();
  if (findErr) return NextResponse.json({ error: findErr.message }, { status: 500 });
  if (!conv) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const admin = getSupabaseAdmin();

  // Wipe messages for this conversation.
  const { error: delErr } = await admin
    .from('messages')
    .delete()
    .eq('org_id', orgId)
    .eq('conversation_id', id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  // Reset the conversation counters so it reads as a fresh thread.
  const { error: convErr } = await admin
    .from('conversations')
    .update({ unread_count: 0, last_message_at: null, next_action: null, status: 'open' })
    .eq('org_id', orgId)
    .eq('id', id);
  if (convErr) return NextResponse.json({ error: convErr.message }, { status: 500 });

  // Clear the lead's AI classification so the next inbound starts clean too.
  if (conv.lead_id) {
    await admin
      .from('leads')
      .update({ score: null, sentiment: null, ai_notes: null, tags: [] })
      .eq('org_id', orgId)
      .eq('id', conv.lead_id);
  }

  return NextResponse.json({ ok: true });
}
