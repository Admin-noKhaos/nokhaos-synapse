// Initiates the Facebook Login for Business flow (connects a Facebook Page +
// its linked Instagram account). Separate from /api/meta/oauth, which uses the
// Instagram Login flow. Stores a one-time state cookie for CSRF protection.

import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { fbOAuthUrl } from '@/lib/meta/facebook';
import { fbConfigured } from '@/lib/env';
import { getCurrentSession } from '@/lib/auth';

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL!));
  if (!fbConfigured()) {
    return NextResponse.redirect(new URL('/settings?meta_error=fb_not_configured', process.env.NEXT_PUBLIC_APP_URL!));
  }

  const state = randomBytes(16).toString('hex');
  const url = fbOAuthUrl(state);
  const res = NextResponse.redirect(url);
  res.cookies.set('fb_oauth_state', state, {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 600,
  });
  res.cookies.set('fb_oauth_org', session.org.id, {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 600,
  });
  return res;
}
