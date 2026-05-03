// Server-side data queries used by the app's pages. Each query is scoped to the
// caller's org via RLS — getSupabaseServer() carries the user's auth cookie, so
// the org_member policy filters automatically.
//
// All queries return plain serializable data so they can be passed from server
// components to client components without prop-drilling Supabase types.

import 'server-only';
import { getSupabaseServer } from '@/lib/supabase/server';

export type Sentiment = 'hot' | 'warm' | 'cold';

export type Conversation = {
  id: string;
  channel: 'dm' | 'comment' | 'story_reply';
  status: string;
  next_action: string | null;
  unread_count: number;
  last_message_at: string | null;
  funnel_label: string | null;
  lead: {
    id: string;
    username: string | null;
    display_name: string | null;
    score: number;
    sentiment: Sentiment | null;
    tags: string[];
    funnel_label: string | null;
    ai_notes: string | null;
    profile: Record<string, unknown>;
    first_contact_at: string | null;
  } | null;
  latest_message: { text: string | null; sender: 'them' | 'us' | 'ai' } | null;
};

export type Message = {
  id: string;
  sender: 'them' | 'us' | 'ai';
  text: string | null;
  sent_at: string;
  ai_meta: Record<string, unknown> | null;
};

// ─── Inbox ───────────────────────────────────────────────────────────────────

export async function getConversations(orgId: string): Promise<Conversation[]> {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id, channel, status, next_action, unread_count, last_message_at,
      lead:leads(id, username, display_name, score, sentiment, tags, funnel_label, ai_notes, profile, first_contact_at)
    `)
    .eq('org_id', orgId)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(50);
  if (error) {
    console.error('getConversations failed', error);
    return [];
  }

  // Fetch latest message per conversation in a second round trip.
  const ids = (data ?? []).map((c) => c.id);
  if (ids.length === 0) return [];
  const { data: latest } = await supabase
    .from('messages')
    .select('conversation_id, text, sender, sent_at')
    .in('conversation_id', ids)
    .order('sent_at', { ascending: false });
  const latestByConv = new Map<string, { text: string | null; sender: 'them' | 'us' | 'ai' }>();
  for (const m of latest ?? []) {
    if (!latestByConv.has(m.conversation_id)) {
      latestByConv.set(m.conversation_id, { text: m.text, sender: m.sender });
    }
  }

  return (data ?? []).map((c) => {
    // Supabase returns the joined `lead` as an array even for one-to-one joins.
    const leadRow = Array.isArray(c.lead) ? c.lead[0] : c.lead;
    const lead = (leadRow as unknown) as Conversation['lead'];
    return {
      id: c.id,
      channel: c.channel,
      status: c.status,
      next_action: c.next_action,
      unread_count: c.unread_count ?? 0,
      last_message_at: c.last_message_at,
      funnel_label: lead?.funnel_label ?? null,
      lead,
      latest_message: latestByConv.get(c.id) ?? null,
    };
  });
}

export async function getMessages(conversationId: string, orgId: string): Promise<Message[]> {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender, text, sent_at, ai_meta')
    .eq('org_id', orgId)
    .eq('conversation_id', conversationId)
    .order('sent_at', { ascending: true })
    .limit(100);
  if (error) {
    console.error('getMessages failed', error);
    return [];
  }
  return (data ?? []) as Message[];
}

// ─── Dashboard KPIs ──────────────────────────────────────────────────────────

export type DashboardKpis = {
  active_conversations: number;
  msgs_24h_in: number;
  msgs_24h_out: number;
  avg_lead_score: number;
  total_leads: number;
  hourly_activity: number[];        // 24-element array
  funnels: { name: string; value: number; conv: number }[];
  next_actions: { id: string; text: string; meta: string }[];
};

export async function getDashboardData(orgId: string): Promise<DashboardKpis> {
  const supabase = await getSupabaseServer();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [convsRes, msgsInRes, msgsOutRes, leadsRes, msgs24hRes, recentLeads] = await Promise.all([
    supabase.from('conversations').select('id', { count: 'exact', head: true })
      .eq('org_id', orgId).eq('status', 'open'),
    supabase.from('messages').select('id', { count: 'exact', head: true })
      .eq('org_id', orgId).eq('sender', 'them').gte('sent_at', since24h),
    supabase.from('messages').select('id', { count: 'exact', head: true })
      .eq('org_id', orgId).in('sender', ['us', 'ai']).gte('sent_at', since24h),
    supabase.from('leads').select('score, sentiment, funnel_label, last_active_at').eq('org_id', orgId),
    supabase.from('messages').select('sent_at, sender').eq('org_id', orgId).gte('sent_at', since24h),
    supabase.from('leads').select('id, display_name, username, score, sentiment, ai_notes, last_active_at')
      .eq('org_id', orgId).order('score', { ascending: false }).limit(4),
  ]);

  const leads = leadsRes.data ?? [];
  const avgScore = leads.length ? leads.reduce((a, l) => a + Number(l.score ?? 0), 0) / leads.length : 0;

  // Bucket messages into 24 hourly buckets ending now.
  const buckets = new Array(24).fill(0);
  const nowHour = new Date();
  for (const m of msgs24hRes.data ?? []) {
    const t = new Date(m.sent_at);
    const hoursAgo = Math.floor((nowHour.getTime() - t.getTime()) / (60 * 60 * 1000));
    const idx = 23 - hoursAgo;
    if (idx >= 0 && idx < 24) buckets[idx]++;
  }

  // Funnel breakdown
  const funnelMap = new Map<string, { value: number; conv: number; count: number }>();
  for (const l of leads) {
    const name = l.funnel_label || '—';
    const cur = funnelMap.get(name) ?? { value: 0, conv: 0, count: 0 };
    cur.value++;
    cur.conv += Number(l.score ?? 0);
    cur.count++;
    funnelMap.set(name, cur);
  }
  const funnels = Array.from(funnelMap.entries())
    .map(([name, v]) => ({ name, value: v.value, conv: v.count ? v.conv / v.count / 10 : 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const next_actions = (recentLeads.data ?? []).map((l) => ({
    id: l.id,
    text: l.ai_notes || `Reply to ${l.display_name || l.username || 'lead'}`,
    meta: `Lead score ${Math.round(Number(l.score ?? 0))} · ${l.sentiment ?? 'unscored'}`,
  }));

  return {
    active_conversations: convsRes.count ?? 0,
    msgs_24h_in: msgsInRes.count ?? 0,
    msgs_24h_out: msgsOutRes.count ?? 0,
    avg_lead_score: avgScore,
    total_leads: leads.length,
    hourly_activity: buckets,
    funnels,
    next_actions,
  };
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export type AnalyticsData = {
  ai_spend_30d_usd: number;
  ai_calls_30d: number;
  total_messages_30d: number;
  avg_charged_per_call: number;
  ai_call_breakdown: { purpose: string; calls: number; cost_usd: number }[];
  recent_credit_ledger: {
    id: string; kind: string; amount_usd: number; description: string | null; created_at: string;
  }[];
  daily_messages: { day: string; in: number; out: number }[]; // last 14 days
};

export async function getAnalyticsData(orgId: string): Promise<AnalyticsData> {
  const supabase = await getSupabaseServer();
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const since14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const [aiCallsRes, msgsRes, ledgerRes, dailyMsgsRes] = await Promise.all([
    supabase.from('ai_calls').select('purpose, charged_usd, cost_anthropic_usd').eq('org_id', orgId).gte('created_at', since30d),
    supabase.from('messages').select('id', { count: 'exact', head: true }).eq('org_id', orgId).gte('sent_at', since30d),
    supabase.from('credit_ledger').select('id, kind, amount_usd, description, created_at').eq('org_id', orgId).order('created_at', { ascending: false }).limit(10),
    supabase.from('messages').select('sent_at, sender').eq('org_id', orgId).gte('sent_at', since14d),
  ]);

  const aiCalls = aiCallsRes.data ?? [];
  const ai_spend_30d_usd = aiCalls.reduce((a, c) => a + Number(c.charged_usd ?? 0), 0);
  const ai_calls_30d = aiCalls.length;
  const avg = ai_calls_30d ? ai_spend_30d_usd / ai_calls_30d : 0;

  const breakdownMap = new Map<string, { calls: number; cost_usd: number }>();
  for (const c of aiCalls) {
    const cur = breakdownMap.get(c.purpose) ?? { calls: 0, cost_usd: 0 };
    cur.calls++;
    cur.cost_usd += Number(c.charged_usd ?? 0);
    breakdownMap.set(c.purpose, cur);
  }
  const ai_call_breakdown = Array.from(breakdownMap.entries())
    .map(([purpose, v]) => ({ purpose, ...v }))
    .sort((a, b) => b.calls - a.calls);

  // Daily message buckets for last 14 days
  const dayMap = new Map<string, { in: number; out: number }>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, { in: 0, out: 0 });
  }
  for (const m of dailyMsgsRes.data ?? []) {
    const key = new Date(m.sent_at).toISOString().slice(0, 10);
    const cur = dayMap.get(key);
    if (cur) {
      if (m.sender === 'them') cur.in++;
      else cur.out++;
    }
  }
  const daily_messages = Array.from(dayMap.entries()).map(([day, v]) => ({ day, ...v }));

  return {
    ai_spend_30d_usd,
    ai_calls_30d,
    total_messages_30d: msgsRes.count ?? 0,
    avg_charged_per_call: avg,
    ai_call_breakdown,
    recent_credit_ledger: (ledgerRes.data ?? []).map((r) => ({
      ...r, amount_usd: Number(r.amount_usd ?? 0),
    })),
    daily_messages,
  };
}

// ─── Misc helpers ────────────────────────────────────────────────────────────

export async function hasAnyMetaAccount(orgId: string): Promise<boolean> {
  const supabase = await getSupabaseServer();
  const { count } = await supabase
    .from('meta_accounts')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('status', 'active');
  return (count ?? 0) > 0;
}
