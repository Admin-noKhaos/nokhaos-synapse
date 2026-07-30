import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC_PATHS = ['/login', '/signup', '/auth/callback', '/api/meta/webhook', '/api/meta/oauth/callback', '/api/meta/deauth', '/l', '/yt', '/api/health', '/privacy', '/terms', '/data-deletion'];
// note: /api/dev/simulate-dm requires auth (uses session); intentionally NOT public.

// Link domains: client-branded hosts that only serve the smart-redirect routes.
// Any other path on these hosts forwards to the client's main site so nobody
// lands on the Synapse login page from a client's domain.
const LINK_HOSTS: Record<string, string> = {
  'go.noproductbusiness.com': 'https://www.noproductbusiness.com',
};

export async function middleware(req: NextRequest) {
  const host = (req.headers.get('host') ?? '').toLowerCase().split(':')[0];
  const linkFallback = LINK_HOSTS[host];
  if (linkFallback && !req.nextUrl.pathname.startsWith('/yt')) {
    return NextResponse.redirect(linkFallback, 302);
  }

  const res = NextResponse.next({ request: req });

  // Refresh the auth cookie on every request — keeps sessions alive in server components.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(toSet: { name: string; value: string; options?: Parameters<typeof res.cookies.set>[2] }[]) {
          for (const { name, value, options } of toSet) {
            res.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  const path = req.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + '/'));

  if (!user && !isPublic && path !== '/') {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  // Run on everything except _next assets, public files, and the favicon.
  matcher: ['/((?!_next/static|_next/image|favicon.svg|.*\\.svg).*)'],
};
