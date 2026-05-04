'use client';

import { useEffect } from 'react';
import { I } from '@/lib/icons';
import { Avatar, Button, Pill } from '@/lib/primitives';

export type DrawerContact = {
  id: string;
  name: string;
  handle: string;
  score: number;
  sentiment: 'hot' | 'warm' | 'cold' | null;
  funnel?: string | null;
  followers?: string;
  region?: string;
  touch?: number;
  ai_notes?: string | null;
  scoreHistory?: number[];
};

export function ContactDrawer({ open, onClose, contact }: { open: boolean; onClose: () => void; contact: DrawerContact | null }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!contact) return null;

  const W = 200, H = 44;
  const hist = contact.scoreHistory ?? [38, 42, 51, 58, 64, 71, 86, contact.score];
  const xs = hist.map((_, i) => (i * W) / (hist.length - 1));
  const ys = hist.map((v) => H - ((v - 20) / (100 - 20)) * H);
  const pts = xs.map((x, i) => `${x},${ys[i]}`).join(' ');

  return (
    <>
      <style>{`
        .sx-cd-backdrop { position:fixed; inset:0; z-index:150; background: rgba(0,0,0,0.45); backdrop-filter: blur(6px); opacity: 0; pointer-events: none; transition: opacity 200ms var(--ease); }
        .sx-cd-backdrop.open { opacity:1; pointer-events:auto; }
        .sx-cd {
          position:fixed; right:0; top:0; bottom:0;
          width: 480px; max-width: 92vw; z-index:151;
          background: rgba(20,20,24,0.94);
          backdrop-filter: blur(40px) saturate(180%);
          border-left: 0.5px solid var(--hairline);
          box-shadow: -20px 0 60px rgba(0,0,0,0.4);
          display:flex; flex-direction:column;
          transform: translateX(100%);
          transition: transform 320ms var(--ease);
          overflow: hidden;
        }
        html[data-theme='light'] .sx-cd { background: rgba(248,248,250,0.94); }
        .sx-cd.open { transform: translateX(0); }
        .sx-cd-hd { padding: 22px 24px 18px; border-bottom: 0.5px solid var(--hairline); display:flex; gap:14px; align-items:flex-start; }
        .sx-cd-body { flex:1; overflow-y:auto; padding: 20px 24px; }
        .sx-cd-stat-grid { display:grid; grid-template-columns: repeat(3, 1fr); gap:10px; margin-top: 14px; }
        .sx-cd-stat { padding: 10px 12px; background: var(--surface-2); border: 0.5px solid var(--hairline); border-radius: 8px; }
        .sx-cd-stat .l { font-size: 10.5px; color: var(--text-3); }
        .sx-cd-stat .v { font-size: 16px; font-weight: 600; letter-spacing:-0.01em; margin-top:2px; }
      `}</style>

      <div className={'sx-cd-backdrop' + (open ? ' open' : '')} onClick={onClose} />
      <aside className={'sx-cd' + (open ? ' open' : '')} role="dialog" aria-label="Contact details">
        <div className="sx-cd-hd">
          <Avatar name={contact.name} size={48} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>{contact.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{contact.handle} {contact.region ? `· ${contact.region}` : ''} {contact.followers ? `· ${contact.followers} followers` : ''}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {contact.sentiment && <Pill tone={contact.sentiment} dot>{contact.sentiment}</Pill>}
              <Pill>Score {contact.score}</Pill>
              {contact.funnel && <Pill><I.Branch size={10} /> {contact.funnel}</Pill>}
            </div>
          </div>
          <Button kind="ghost" icon={<I.X size={16} />} onClick={onClose} />
        </div>

        <div className="sx-cd-body">
          <div className="sx-section-title">Score history</div>
          <div style={{ padding: '12px 14px', background: 'var(--surface-2)', border: '0.5px solid var(--hairline)', borderRadius: 10, marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>{contact.score}</div>
              <div style={{ fontSize: 11.5, color: 'var(--accent-light)' }}>+{Math.max(0, contact.score - hist[0])} vs. earlier</div>
            </div>
            <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
              <defs>
                <linearGradient id="cd-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(var(--accent-rgb))" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="rgb(var(--accent-rgb))" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polyline points={`0,${H} ${pts} ${W},${H}`} fill="url(#cd-grad)" stroke="none" />
              <polyline points={pts} fill="none" stroke="rgb(var(--accent-rgb))" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="2.5" fill="rgb(var(--accent-rgb))" />
            </svg>
          </div>

          <div className="sx-cd-stat-grid">
            <div className="sx-cd-stat"><div className="l">Touches</div><div className="v">{contact.touch ?? '—'}</div></div>
            <div className="sx-cd-stat"><div className="l">Sentiment</div><div className="v" style={{ textTransform: 'capitalize' }}>{contact.sentiment ?? '—'}</div></div>
            <div className="sx-cd-stat"><div className="l">Funnel</div><div className="v" style={{ fontSize: 13 }}>{contact.funnel ?? '—'}</div></div>
          </div>

          {contact.ai_notes && (
            <>
              <div className="sx-section-title" style={{ marginTop: 22 }}>AI notes</div>
              <div style={{ marginTop: 8, fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-2)', padding: '12px 14px', background: 'var(--surface-2)', border: '0.5px solid var(--hairline)', borderRadius: 10 }}>
                {contact.ai_notes}
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 20, paddingTop: 18, borderTop: '0.5px solid var(--hairline)' }}>
            <Button kind="primary" size="sm" icon={<I.Inbox size={13} />} style={{ flex: 1, justifyContent: 'center' }}>
              Open conversation
            </Button>
            <Button kind="default" size="sm" icon={<I.Branch size={13} />}>Add to flow</Button>
          </div>
        </div>
      </aside>
    </>
  );
}
