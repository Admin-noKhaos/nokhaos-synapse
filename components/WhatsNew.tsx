'use client';

import { I } from '@/lib/icons';
import { Button, Pill } from '@/lib/primitives';

const ENTRIES = [
  {
    title: 'Master doc + AI test chat',
    pill: 'NEW',
    when: 'May 2026',
    body: 'A single source of truth for your AI. Chat with the same agent your DMs use, and have it suggest updates as you go. Find both in the sidebar.',
    icon: <I.Brain size={14} />,
  },
  {
    title: 'Drag-to-connect Flow Builder',
    pill: 'IMPROVED',
    when: 'May 2026',
    body: 'Pull from a node\'s right port and drop on another to connect them. Esc cancels. Bigger hit targets.',
    icon: <I.Branch size={14} />,
  },
  {
    title: 'Audiences + Smart Links live',
    pill: 'NEW',
    when: 'May 2026',
    body: 'Auto-build segments from real leads. Create short links served from synapse.nokhaos.com/l/<slug> with click tracking.',
    icon: <I.Funnel size={14} />,
  },
  {
    title: 'Light mode + 8 accent themes',
    pill: 'NEW',
    when: 'May 2026',
    body: 'Toggle in the topbar. Pick from Green / Aqua / Violet / Sunset / Magenta / Sky / Citron / Graphite in Settings → Appearance.',
    icon: <I.Sun size={14} />,
  },
];

export function WhatsNew({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 130,
      background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <style>{`
        .sx-wn { width: 540px; max-width: 100%; max-height: 80vh; overflow-y: auto;
          background: rgba(20,20,24,0.96); backdrop-filter: blur(40px) saturate(180%);
          border: 0.5px solid var(--hairline); border-radius: 16px; padding: 28px; }
        html[data-theme='light'] .sx-wn { background: rgba(248,248,250,0.96); }
        .sx-wn-row { display:flex; gap:14px; padding: 14px 0; border-bottom: 0.5px solid var(--hairline); }
        .sx-wn-row:last-child { border-bottom: 0; }
        .sx-wn-icon { width: 32px; height: 32px; border-radius: 8px; background: rgba(var(--accent-rgb),0.12); color: var(--accent-light); display:flex; align-items:center; justify-content:center; flex-shrink: 0; }
      `}</style>
      <div className="sx-wn" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>What&rsquo;s new</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 4 }}>The latest features in Synapse.</div>
          </div>
          <div style={{ flex: 1 }} />
          <Button kind="ghost" icon={<I.X size={14} />} onClick={onClose} aria-label="Close" />
        </div>
        {ENTRIES.map((e, i) => (
          <div key={i} className="sx-wn-row">
            <div className="sx-wn-icon">{e.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{e.title}</div>
                <Pill tone={e.pill === 'NEW' ? 'green' : 'warm'}>{e.pill}</Pill>
                <div style={{ flex: 1 }} />
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{e.when}</div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{e.body}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
