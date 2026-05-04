import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';

const Body = z.object({
  name: z.string().min(1).max(120),
  message: z.string().min(1).max(2000),
  audience_id: z.string().uuid().nullable().optional(),
  scheduled_at: z.string().datetime().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  let body: z.infer<typeof Body>;
  try { body = Body.parse(await req.json()); } catch (e) { return NextResponse.json({ error: 'bad_request', detail: String(e) }, { status: 400 }); }

  const supabase = await getSupabaseServer();
  const status = body.scheduled_at ? 'scheduled' : 'draft';

  // Pre-count recipients if audience selected
  let recipientsCount = 0;
  if (body.audience_id) {
    const { count } = await supabase.from('audience_members').select('lead_id', { count: 'exact', head: true }).eq('audience_id', body.audience_id);
    recipientsCount = count ?? 0;
  }

  const { data, error } = await supabase
    .from('broadcasts')
    .insert({
      org_id: session.org.id, name: body.name, message: body.message,
      audience_id: body.audience_id ?? null, scheduled_at: body.scheduled_at ?? null,
      status, recipients_count: recipientsCount, created_by: session.user.id,
    })
    .select('id').single();
  if (error) return NextResponse.json({ error: 'insert_failed', detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}
