// Manual credit top-up (development / testing). In production, replace with a Stripe-backed flow.

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { serviceRoleConfigured } from '@/lib/env';

const Body = z.object({ amount_usd: z.number().positive().max(1000) });

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!serviceRoleConfigured()) return NextResponse.json({ error: 'service_role_missing' }, { status: 503 });
  if (session.org.role !== 'owner' && session.org.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: 'bad_request', detail: String(e) }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc('grant_credits', {
    p_org_id: session.org.id,
    p_amount_usd: body.amount_usd,
    p_kind: 'topup',
    p_description: 'Manual top-up (dev)',
  });
  if (error) return NextResponse.json({ error: 'topup_failed', detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, balance_usd: Number(data) });
}
