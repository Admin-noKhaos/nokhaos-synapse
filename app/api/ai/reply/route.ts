// On-demand AI reply generator. Used by the Inbox composer's "Synapse suggests" buttons.
// Returns 402 (Payment Required) if the org is out of credits.

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { generateReply } from '@/lib/ai/dm-agent';
import { InsufficientCreditsError } from '@/lib/anthropic';
import { anthropicConfigured } from '@/lib/env';

const Body = z.object({
  conversationId: z.string().uuid(),
  goal: z.string().min(3).max(500),
});

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!anthropicConfigured()) {
    return NextResponse.json({ error: 'anthropic_not_configured' }, { status: 503 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: 'bad_request', detail: String(e) }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  const { data: messages } = await supabase
    .from('messages')
    .select('sender, text')
    .eq('conversation_id', body.conversationId)
    .order('sent_at', { ascending: true })
    .limit(20);

  const recent = (messages ?? []).map((m) => ({
    from: m.sender === 'them' ? 'them' : m.sender === 'ai' ? 'ai' : 'us',
    text: m.text ?? '',
  })) as { from: 'them' | 'us' | 'ai'; text: string }[];

  // Pull a short brand context from the org row (later: brand voice profile table)
  const brandContext = `Brand: ${session.org.name}. Audience: Instagram followers (${session.org.followers_count.toLocaleString()}). Voice: warm, direct, never pushy.`;

  try {
    const result = await generateReply({
      orgId: session.org.id,
      conversationId: body.conversationId,
      brandContext,
      recentMessages: recent,
      goal: body.goal,
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof InsufficientCreditsError) {
      return NextResponse.json({ error: 'insufficient_credits', balance_usd: e.balance_usd }, { status: 402 });
    }
    return NextResponse.json({ error: 'ai_failed', detail: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
