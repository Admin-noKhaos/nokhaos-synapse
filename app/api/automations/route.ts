// CRUD for automations / flows.
//   POST   /api/automations            create new (body: { name, graph?, template? })
//   GET    /api/automations            list (returns summaries)
//
// Single-resource ops live at /api/automations/[id]/route.ts

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { autoReplyTemplate, EMPTY_GRAPH, type FlowGraph } from '@/lib/flow/types';
import { listAutomations } from '@/lib/data/automations';

const CreateBody = z.object({
  name: z.string().min(1).max(120),
  template: z.enum(['auto_reply', 'blank']).default('blank'),
});

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: z.infer<typeof CreateBody>;
  try {
    body = CreateBody.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: 'bad_request', detail: String(e) }, { status: 400 });
  }

  const graph: FlowGraph = body.template === 'auto_reply' ? autoReplyTemplate() : EMPTY_GRAPH;
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from('automations')
    .insert({
      org_id: session.org.id,
      name: body.name,
      graph,
      status: 'draft',
      created_by: session.user.id,
    })
    .select('id')
    .single();
  if (error) return NextResponse.json({ error: 'insert_failed', detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const items = await listAutomations(session.org.id);
  return NextResponse.json({ items });
}
