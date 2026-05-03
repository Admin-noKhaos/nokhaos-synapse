// Server-side queries for automations / flows.

import 'server-only';
import { getSupabaseServer } from '@/lib/supabase/server';
import type { FlowGraph } from '@/lib/flow/types';

export type AutomationSummary = {
  id: string;
  name: string;
  slug: string | null;
  status: 'draft' | 'live' | 'paused';
  version: number;
  last_published_at: string | null;
  created_at: string;
  updated_at: string;
  node_count: number;
};

export type Automation = AutomationSummary & {
  graph: FlowGraph;
};

export async function listAutomations(orgId: string): Promise<AutomationSummary[]> {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from('automations')
    .select('id, name, slug, status, version, last_published_at, created_at, updated_at, graph')
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false });
  if (error) {
    console.error('listAutomations failed', error);
    return [];
  }
  return (data ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    slug: a.slug,
    status: a.status,
    version: a.version,
    last_published_at: a.last_published_at,
    created_at: a.created_at,
    updated_at: a.updated_at,
    node_count: ((a.graph as FlowGraph)?.nodes?.length ?? 0),
  }));
}

export async function getAutomation(orgId: string, id: string): Promise<Automation | null> {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from('automations')
    .select('id, name, slug, status, version, last_published_at, created_at, updated_at, graph')
    .eq('org_id', orgId)
    .eq('id', id)
    .single();
  if (error || !data) return null;
  const graph = (data.graph as FlowGraph) ?? { nodes: [], edges: [] };
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    status: data.status,
    version: data.version,
    last_published_at: data.last_published_at,
    created_at: data.created_at,
    updated_at: data.updated_at,
    graph,
    node_count: graph.nodes?.length ?? 0,
  };
}
