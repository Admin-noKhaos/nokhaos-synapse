// Per-automation operations: PUT (save graph + name), PATCH (status), DELETE.

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';

const SaveBody = z.object({
  name: z.string().min(1).max(120).optional(),
  graph: z
    .object({
      nodes: z.array(z.unknown()),
      edges: z.array(z.unknown()),
    })
    .optional(),
});

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;

  let body: z.infer<typeof SaveBody>;
  try {
    body = SaveBody.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: 'bad_request', detail: String(e) }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  const update: Record<string, unknown> = {};
  if (body.name !== undefined) update.name = body.name;
  if (body.graph !== undefined) update.graph = body.graph;
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true, noop: true });
  }

  const { error } = await supabase
    .from('automations')
    .update(update)
    .eq('org_id', session.org.id)
    .eq('id', id);
  if (error) return NextResponse.json({ error: 'update_failed', detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

const StatusBody = z.object({ status: z.enum(['draft', 'live', 'paused']) });

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;

  let body: z.infer<typeof StatusBody>;
  try {
    body = StatusBody.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: 'bad_request', detail: String(e) }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  const update: Record<string, unknown> = { status: body.status };
  if (body.status === 'live') update.last_published_at = new Date().toISOString();

  const { error } = await supabase
    .from('automations')
    .update(update)
    .eq('org_id', session.org.id)
    .eq('id', id);
  if (error) return NextResponse.json({ error: 'patch_failed', detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const supabase = await getSupabaseServer();
  const { error } = await supabase
    .from('automations')
    .delete()
    .eq('org_id', session.org.id)
    .eq('id', id);
  if (error) return NextResponse.json({ error: 'delete_failed', detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
