import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { ApprovalQueueClient, type DraftRow } from './ApprovalQueueClient';

export default async function ApprovalQueuePage() {
  const session = await getCurrentSession();
  if (!session) redirect('/login');

  // "Draft" = an AI-suggested message (sender='ai') the worker created but the user hasn't approved/sent yet.
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('messages')
    .select(`id, text, sent_at, ai_meta,
             conversation:conversations(id, lead:leads(id, username, display_name, score, sentiment, ai_notes))`)
    .eq('org_id', session.org.id)
    .eq('sender', 'ai')
    .contains('ai_meta', { suggested: true })
    .order('sent_at', { ascending: false })
    .limit(100);

  type RawConv = { id: string; lead: Array<{ id: string; username: string | null; display_name: string | null; score: number; sentiment: 'hot' | 'warm' | 'cold' | null; ai_notes: string | null }> | { id: string; username: string | null; display_name: string | null; score: number; sentiment: 'hot' | 'warm' | 'cold' | null; ai_notes: string | null } | null };

  const drafts: DraftRow[] = (data ?? []).map((r) => {
    const conv = (Array.isArray(r.conversation) ? r.conversation[0] : r.conversation) as unknown as RawConv | null;
    const leadRaw = conv?.lead;
    const lead = (Array.isArray(leadRaw) ? leadRaw[0] : leadRaw) ?? null;
    return {
      id: r.id,
      text: r.text ?? '',
      sent_at: r.sent_at,
      conversation_id: conv?.id ?? '',
      lead_name: lead?.display_name || lead?.username || 'Unknown',
      lead_handle: '@' + (lead?.username ?? '—'),
      lead_score: Math.round(Number(lead?.score ?? 0)),
      lead_sentiment: lead?.sentiment ?? null,
      ai_notes: lead?.ai_notes ?? null,
      confidence: Number((r.ai_meta as { charged_usd?: number; confidence?: number } | null)?.confidence ?? 0.9),
    };
  });

  return <ApprovalQueueClient drafts={drafts} />;
}
