// Smart YouTube redirect: a normal https link (accepted by Meta card buttons)
// that bounces the visitor into the YouTube app when possible, with a clean
// web fallback when not.
//
//   /yt/<videoId>            → app via deep link, else youtu.be/<videoId>
//   /yt/<videoId>?si=...     → query params are forwarded to the fallback URL
//
// Per-platform strategy:
//  - Android: 302 to an intent:// URL targeting the YouTube app, with
//    S.browser_fallback_url so Chrome falls back to the web player itself.
//  - iOS: tiny HTML page that tries vnd.youtube:// and falls back to youtu.be
//    after a beat (custom-scheme redirects can't be done via 302 on iOS).
//  - Everything else (desktop): plain 302 to youtu.be.

import { type NextRequest, NextResponse } from 'next/server';

const VIDEO_ID_RE = /^[\w-]{6,20}$/;

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!VIDEO_ID_RE.test(id)) {
    return NextResponse.redirect('https://www.youtube.com', 302);
  }

  const qs = req.nextUrl.searchParams.toString();
  const webUrl = `https://youtu.be/${id}${qs ? `?${qs}` : ''}`;
  const ua = req.headers.get('user-agent') ?? '';

  if (/android/i.test(ua)) {
    const intentUrl =
      `intent://www.youtube.com/watch?v=${id}#Intent;package=com.google.android.youtube;scheme=https;` +
      `S.browser_fallback_url=${encodeURIComponent(webUrl)};end`;
    return NextResponse.redirect(intentUrl, 302);
  }

  if (/iphone|ipad|ipod/i.test(ua)) {
    const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Opening YouTube…</title>
<style>body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#000;color:#fff}a{color:#3ea6ff}</style>
</head><body>
<p>Opening YouTube… <a href="${webUrl}">tap here</a> if nothing happens.</p>
<script>
  location.href = 'vnd.youtube://${id}';
  setTimeout(function () { location.replace(${JSON.stringify(webUrl)}); }, 1500);
</script>
</body></html>`;
    return new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  return NextResponse.redirect(webUrl, 302);
}
