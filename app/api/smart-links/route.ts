// Create + list smart links. Each link gets a unique slug — the public
// /l/[slug] route serves it.

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';

const Body = z.object({
  title: z.string().min(1).max(120),
  slug: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/, 'lowercase, digits, hyphens only'),
  destination_url: z.string().url().max(2000),
  ai_enabled: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: 'bad_request', detail: String(e) }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from('smart_links')
    .insert({
      org_id: session.org.id,
      created_by: session.user.id,
      slug: body.slug,
      title: body.title,
      destination_url: body.destination_url,
      ai_enabled: body.ai_enabled,
      status: 'live',
      routing_rules: [],
    })
    .select('id, slug')
    .single();
  if (error) {
    if (String(error.message).includes('duplicate')) {
      return NextResponse.json({ error: 'slug_taken' }, { status: 409 });
    }
    return NextResponse.json({ error: 'insert_failed', detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data.id, slug: data.slug });
}
