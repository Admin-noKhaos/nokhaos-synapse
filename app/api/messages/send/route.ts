// Send a real Instagram DM via the Meta API + persist as a 'us' message.

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sendInstagramMessage } from '@/lib/meta';
import { metaConfigured } from '@/lib/env';

const Body = z.object({
  conversationId: z.string().uuid(),
  text: z.string().min(1).max(2000),
});

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!metaConfigured()) return NextResponse.json({ error: 'meta_not_configured' }, { status: 503 });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: 'bad_request', detail: String(e) }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  const { data: conv } = await supabase
    .from('conversations')
    .select(`
      id, org_id, ig_thread_id, channel,
      lead:leads(ig_user_id, username),
      meta_account:meta_accounts(id, ig_user_id, access_token, status)
    `)
    .eq('id', body.conversationId)
    .single();

  if (!conv) return NextResponse.json({ error: 'conversation_not_found' }, { status: 404 });

  type Lead = { ig_user_id?: string | null; username?: string | null } | null;
  type Acct = { id: string; ig_user_id: string | null; access_token: string; status: string } | null;
  const lead = ((Array.isArray(conv.lead) ? conv.lead[0] : conv.lead) as unknown) as Lead;
  const acct = ((Array.isArray(conv.meta_account) ? conv.meta_account[0] : conv.meta_account) as unknown) as Acct;

  if (!acct || acct.status !== 'active' || !acct.ig_user_id) {
    return NextResponse.json({ error: 'meta_account_not_active' }, { status: 400 });
  }
  if (!lead?.ig_user_id) {
    return NextResponse.json({ error: 'no_recipient' }, { status: 400 });
  }

  let igMessageId: string | undefined;
  try {
    const res = await sendInstagramMessage({
      igUserId: acct.ig_user_id,
      accessToken: acct.access_token,
      recipientIgId: lead.ig_user_id,
      text: body.text,
    });
    igMessageId = res.message_id;
  } catch (e) {
    return NextResponse.json({ error: 'send_failed', detail: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }

  // Persist with admin client (RLS already validated org membership above via the read).
  const admin = getSupabaseAdmin();
  await admin.from('messages').insert({
    org_id: session.org.id,
    conversation_id: body.conversationId,
    ig_message_id: igMessageId,
    sender: 'us',
    text: body.text,
    sent_at: new Date().toISOString(),
  });
  await admin
    .from('conversations')
    .update({ last_message_at: new Date().toISOString(), unread_count: 0, next_action: null })
    .eq('id', body.conversationId);

  return NextResponse.json({ ok: true, ig_message_id: igMessageId });
}
