'use client';

import { I } from '@/lib/icons';
import { Pill } from '@/lib/primitives';

const SAMPLE = [
  { id: '1', when: 'now',     title: 'Hot lead spike',           body: '4 new leads scored ≥ 80 in the last hour',    icon: <I.Sparkle size={13}/>, tone: 'green' as const },
  { id: '2', when: '12m',     title: 'Auto-reply sent',          body: 'Flow "Auto-reply (test)" → @ashwin_dsilva_28', icon: <I.Send size={13}/>,    tone: 'green' as const },
  { id: '3', when: '1h',      title: 'Approval awaiting',        body: '6 AI drafts need review',                       icon: <I.Check size={13}/>,   tone: 'warm' as const },
  { id: '4', when: '3h',      title: 'Story-reply spike',        body: '+18% over yesterday',                            icon: <I.Heart size={13}/>,   tone: 'green' as const },
  { id: '5', when: 'yesterday', title: 'Credit balance low',     body: '$2.41 remaining',                                icon: <I.Coin size={13}/>,    tone: 'warm' as const },
];

export function NotificationsPopover({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <>
      <style>{`
        .sx-np-bg { position:fixed; inset:0; z-index:120; }
        .sx-np {
          position:fixed; top:64px; right:18px; width:380px; max-height:70vh; z-index:121;
          background: rgba(20,20,24,0.96); backdrop-filter: blur(40px) saturate(180%);
          border: 0.5px solid var(--hairline); border-radius: 14px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.5);
          overflow: hidden; display: flex; flex-direction: column;
        }
        html[data-theme='light'] .sx-np { background: rgba(248,248,250,0.96); }
        .sx-np-hd { padding: 14px 18px; border-bottom: 0.5px solid var(--hairline); display:flex; align-items:center; gap:8px; }
        .sx-np-list { overflow-y: auto; flex: 1; }
        .sx-np-item { display:grid; grid-template-columns: 28px 1fr auto; gap: 10px; padding: 12px 18px; border-bottom: 0.5px solid var(--hairline); }
        .sx-np-item:last-child { border-bottom: 0; }
        .sx-np-icon { width: 28px; height: 28px; border-radius: 7px; display:flex; align-items:center; justify-content:center; background: rgba(var(--accent-rgb),0.10); color: var(--accent-light); }
        .sx-np-title { font-size: 12.5px; font-weight: 600; }
        .sx-np-body { font-size: 11.5px; color: var(--text-2); margin-top: 2px; }
        .sx-np-when { font-size: 10.5px; color: var(--text-3); }
        .sx-np-ft { padding: 10px 18px; border-top: 0.5px solid var(--hairline); font-size: 11.5px; color: var(--text-3); display: flex; justify-content: space-between; }
      `}</style>
      <div className="sx-np-bg" onClick={onClose} />
      <div className="sx-np" onClick={(e) => e.stopPropagation()}>
        <div className="sx-np-hd">
          <div style={{ fontSize: 13, fontWeight: 600 }}>Notifications</div>
          <Pill tone="green" dot>{SAMPLE.length}</Pill>
        </div>
        <div className="sx-np-list">
          {SAMPLE.map((n) => (
            <div key={n.id} className="sx-np-item">
              <div className="sx-np-icon">{n.icon}</div>
              <div>
                <div className="sx-np-title">{n.title}</div>
                <div className="sx-np-body">{n.body}</div>
              </div>
              <div className="sx-np-when">{n.when}</div>
            </div>
          ))}
        </div>
        <div className="sx-np-ft">
          <span>Mark all as read</span>
          <span>Settings</span>
        </div>
      </div>
    </>
  );
}
