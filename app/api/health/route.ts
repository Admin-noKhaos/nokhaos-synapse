// Liveness check used by Vercel + Render health probes.

import { NextResponse } from 'next/server';
import { metaConfigured, anthropicConfigured, serviceRoleConfigured } from '@/lib/env';

export async function GET() {
  return NextResponse.json({
    ok: true,
    ts: new Date().toISOString(),
    integrations: {
      supabase_service_role: serviceRoleConfigured(),
      anthropic: anthropicConfigured(),
      meta: metaConfigured(),
    },
  });
}
