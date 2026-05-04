import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';

const Body = z.object({
  name: z.string().min(1).max(120),
  category: z.string().max(60).optional(),
  body: z.string().min(1).max(2000),
});

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  let parsed: z.infer<typeof Body>;
  try { parsed = Body.parse(await req.json()); } catch (e) { return NextResponse.json({ error: 'bad_request', detail: String(e) }, { status: 400 }); }
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from('templates')
    .insert({ org_id: session.org.id, name: parsed.name, category: parsed.category ?? null, body: parsed.body, created_by: session.user.id })
    .select('id').single();
  if (error) return NextResponse.json({ error: 'insert_failed', detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}
