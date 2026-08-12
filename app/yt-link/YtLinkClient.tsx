'use client';

import { useMemo, useState } from 'react';

const LINK_HOST = 'https://go.noproductbusiness.com';

/** Pull the video id out of any common YouTube URL shape, or a bare id. */
function extractVideoId(raw: string): string | null {
  const input = raw.trim();
  if (!input) return null;
  const isId = (s: string) => /^[\w-]{9,15}$/.test(s);

  // Bare id pasted straight in.
  if (isId(input) && !input.includes('/') && !input.includes('.')) return input;

  let u: URL;
  try {
    u = new URL(input.startsWith('http') ? input : `https://${input}`);
  } catch {
    return null;
  }

  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  const parts = u.pathname.split('/').filter(Boolean);

  if (host === 'youtu.be') return isId(parts[0] ?? '') ? parts[0] : null;

  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    const v = u.searchParams.get('v');
    if (v && isId(v)) return v;
    if (parts.length >= 2 && ['shorts', 'embed', 'live', 'v'].includes(parts[0]) && isId(parts[1])) {
      return parts[1];
    }
  }

  // Already one of our smart links — let them re-paste it harmlessly.
  if (parts[0] === 'yt' && isId(parts[1] ?? '')) return parts[1];

  return null;
}

export function YtLinkClient() {
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);

  const videoId = useMemo(() => extractVideoId(input), [input]);
  const smartLink = videoId ? `${LINK_HOST}/yt/${videoId}` : '';
  const dirty = input.trim().length > 0;
  const invalid = dirty && !videoId;

  async function copy() {
    if (!smartLink) return;
    try {
      await navigator.clipboard.writeText(smartLink);
    } catch {
      // Clipboard API can be blocked; fall back to a temporary selection.
      const el = document.createElement('textarea');
      el.value = smartLink;
      document.body.appendChild(el);
      el.select();
      try { document.execCommand('copy'); } catch { /* nothing else to try */ }
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main className="wrap">
      <div className="grid-bg" aria-hidden="true" />

      <header className="head">
        <div className="eyebrow">noProductBusiness · internal tool</div>
        <h1>
          Link<span className="accent">Forge</span>
        </h1>
        <p className="sub">
          Turn a YouTube link into one that opens the <strong>YouTube app</strong> when someone taps it
          from Instagram or Facebook.
        </p>
      </header>

      <section className="step">
        <div className="step-label">01 / Paste the YouTube link</div>
        <input
          className={'field' + (invalid ? ' bad' : '') + (videoId ? ' good' : '')}
          value={input}
          onChange={(e) => { setInput(e.target.value); setCopied(false); }}
          placeholder="https://www.youtube.com/watch?v=..."
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoFocus
        />
        {invalid && <div className="err">That doesn&apos;t look like a YouTube link. Paste the full URL from the address bar or the Share button.</div>}
      </section>

      <section className={'result' + (videoId ? ' on' : '')} aria-live="polite">
        {videoId && (
          <>
            <div className="step-label">02 / Copy your link</div>

            <div className="readout">
              <code>{smartLink}</code>
              <button className={'copy' + (copied ? ' done' : '')} onClick={copy} type="button">
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div className="preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                alt="Video thumbnail"
                width={160}
                height={90}
              />
              <div className="preview-meta">
                <div className="pid">{videoId}</div>
                <a href={smartLink} target="_blank" rel="noreferrer" className="test">
                  Test it →
                </a>
              </div>
            </div>
          </>
        )}
      </section>

      <footer className="foot">
        Works on iPhone and Android. On desktop it opens youtube.com as normal.
      </footer>

      <style jsx>{`
        .wrap {
          position: relative;
          min-height: 100dvh;
          padding: clamp(28px, 7vw, 76px) clamp(20px, 6vw, 56px) 48px;
          max-width: 760px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: clamp(28px, 5vw, 44px);
        }
        .grid-bg {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background-image:
            linear-gradient(var(--line) 1px, transparent 1px),
            linear-gradient(90deg, var(--line) 1px, transparent 1px);
          background-size: 46px 46px;
          opacity: 0.28;
          mask-image: radial-gradient(ellipse 90% 60% at 50% 0%, #000 20%, transparent 78%);
          -webkit-mask-image: radial-gradient(ellipse 90% 60% at 50% 0%, #000 20%, transparent 78%);
        }

        .head { animation: rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .eyebrow {
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--dim);
          margin-bottom: 14px;
        }
        h1 {
          font-family: var(--display);
          font-size: clamp(52px, 13vw, 104px);
          line-height: 0.84;
          letter-spacing: -0.015em;
          text-transform: uppercase;
          margin: 0 0 18px;
          color: var(--ink);
        }
        .accent { color: var(--go); }
        .sub {
          margin: 0;
          max-width: 46ch;
          color: var(--dim);
          font-size: 14px;
          line-height: 1.65;
        }
        .sub strong { color: var(--ink); font-weight: 500; }

        .step { animation: rise 0.5s 0.08s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .step-label {
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--dim);
          margin-bottom: 12px;
        }

        .field {
          width: 100%;
          background: var(--panel);
          border: 1px solid var(--line);
          border-left: 3px solid var(--line);
          color: var(--ink);
          font-family: inherit;
          font-size: 15px;
          padding: 18px 18px;
          outline: none;
          transition: border-color 160ms ease, background 160ms ease;
        }
        .field::placeholder { color: #4a4a55; }
        .field:focus { border-color: #3a3a46; border-left-color: var(--dim); background: #16161b; }
        .field.good { border-left-color: var(--go); }
        .field.bad { border-left-color: var(--warn); }

        .err {
          margin-top: 12px;
          color: var(--warn);
          font-size: 13px;
          line-height: 1.55;
        }

        .result {
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 260ms ease, transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
          pointer-events: none;
        }
        .result.on { opacity: 1; transform: none; pointer-events: auto; }

        .readout {
          display: flex;
          align-items: stretch;
          border: 1px solid var(--line);
          border-left: 3px solid var(--go);
          background: var(--panel);
        }
        .readout code {
          flex: 1;
          min-width: 0;
          padding: 18px;
          font-size: 14px;
          color: var(--go);
          overflow-x: auto;
          white-space: nowrap;
          font-family: inherit;
        }
        .copy {
          flex-shrink: 0;
          border: 0;
          border-left: 1px solid var(--line);
          background: transparent;
          color: var(--ink);
          font-family: inherit;
          font-size: 12px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          padding: 0 24px;
          cursor: pointer;
          transition: background 140ms ease, color 140ms ease;
        }
        .copy:hover { background: #1d1d23; }
        .copy.done { color: var(--go); }

        .preview {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: 18px;
        }
        .preview img {
          border: 1px solid var(--line);
          display: block;
          width: 128px;
          height: auto;
        }
        .preview-meta { min-width: 0; }
        .pid {
          font-size: 12px;
          color: var(--dim);
          letter-spacing: 0.06em;
          margin-bottom: 8px;
          word-break: break-all;
        }
        .test {
          font-size: 12px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ink);
          text-decoration: none;
          border-bottom: 1px solid var(--line);
          padding-bottom: 2px;
          transition: color 140ms ease, border-color 140ms ease;
        }
        .test:hover { color: var(--go); border-color: var(--go); }

        .foot {
          margin-top: auto;
          padding-top: 24px;
          font-size: 12px;
          color: #55555f;
          line-height: 1.6;
          animation: rise 0.5s 0.16s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        @keyframes rise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .head, .step, .foot, .result { animation: none; transition: none; }
        }
      `}</style>
    </main>
  );
}
