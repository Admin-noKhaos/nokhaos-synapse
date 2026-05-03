// Smart link redirect — resolves a slug → destination, optionally routed by AI rules,
// records the click, then 302s. Public; no auth required.
//
// Routing rules (jsonb) shape:
//   [{ "match": { "audience": "Half-Marathon Hopefuls" }, "url": "https://example.com/plan" },
//    { "match": { "country": "FR" }, "url": "https://example.com/eu" }]
// The first rule whose match shape matches the request wins; otherwise the destination_url is used.

import { NextResponse, type NextRequest } from 'next/server';
import { createHash } from 'node:crypto';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { serviceRoleConfigured } from '@/lib/env';

type Rule = { match: Record<string, string>; url: string };

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!serviceRoleConfigured()) {
    return new NextResponse('service unavailable', { status: 503 });
  }

  const admin = getSupabaseAdmin();
  const { data: link } = await admin
    .from('smart_links')
    .select('id, org_id, destination_url, status, ai_enabled, routing_rules')
    .eq('slug', slug)
    .maybeSingle();

  if (!link || link.status !== 'live' && link.status !== 'beta') {
    return new NextResponse('not found', { status: 404 });
  }

  // Tiny rule engine. For now matches on country header (Vercel sets x-vercel-ip-country)
  // and audience name (planned: caller must pass ?aud=).
  const country = req.headers.get('x-vercel-ip-country') ?? null;
  const audience = req.nextUrl.searchParams.get('aud');

  let routedTo = link.destination_url;
  if (link.ai_enabled && Array.isArray(link.routing_rules)) {
    for (const r of link.routing_rules as Rule[]) {
      if (!r?.match || !r?.url) continue;
      const ok = Object.entries(r.match).every(([k, v]) => {
        if (k === 'country') return country === v;
        if (k === 'audience') return audience === v;
        return false;
      });
      if (ok) { routedTo = r.url; break; }
    }
  }

  // Hash the IP so we don't store raw PII.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? '';
  const ipHash = ip ? createHash('sha256').update(ip).digest('hex') : null;

  await admin.from('smart_link_clicks').insert({
    link_id: link.id,
    org_id: link.org_id,
    ip_hash: ipHash,
    ua: req.headers.get('user-agent'),
    country,
    source: req.headers.get('referer') ?? null,
    routed_to: routedTo,
  });

  return NextResponse.redirect(routedTo, 302);
}
