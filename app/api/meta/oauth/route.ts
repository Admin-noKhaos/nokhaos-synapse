// Initiates the Meta OAuth flow. Stores a one-time state in a cookie for CSRF protection.

import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { metaOAuthUrl } from '@/lib/meta';
import { metaConfigured } from '@/lib/env';
import { getCurrentSession } from '@/lib/auth';

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL!));
  if (!metaConfigured()) {
    return NextResponse.redirect(new URL('/settings?meta_error=not_configured', process.env.NEXT_PUBLIC_APP_URL!));
  }

  const state = randomBytes(16).toString('hex');
  const url = metaOAuthUrl(state);
  const res = NextResponse.redirect(url);
  // 10 min one-time state cookie
  res.cookies.set('meta_oauth_state', state, {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 600,
  });
  res.cookies.set('meta_oauth_org', session.org.id, {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 600,
  });
  return res;
}
