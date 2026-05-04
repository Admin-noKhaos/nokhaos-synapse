'use client';

import { Avatar, Pill, Button } from '@/lib/primitives';
import { I } from '@/lib/icons';

export function AccountSwitcher({ open, onClose, orgName, plan }: { open: boolean; onClose: () => void; orgName: string; plan: string }) {
  if (!open) return null;
  return (
    <>
      <style>{`
        .sx-acc-bg { position:fixed; inset:0; z-index:140; }
        .sx-acc-popover {
          position:fixed; left:18px; bottom:72px; width:300px; z-index:141;
          background: rgba(20,20,24,0.96); backdrop-filter: blur(40px) saturate(180%);
          border: 0.5px solid var(--hairline); border-radius: 12px;
          box-shadow: 0 16px 40px rgba(0,0,0,0.5);
          padding: 8px;
        }
        html[data-theme='light'] .sx-acc-popover { background: rgba(248,248,250,0.96); }
        .sx-acc-row { display:flex; align-items:center; gap: 10px; padding: 8px 10px; border-radius: 8px; cursor: pointer; }
        .sx-acc-row:hover { background: rgba(255,255,255,0.05); }
        html[data-theme='light'] .sx-acc-row:hover { background: rgba(0,0,0,0.04); }
        .sx-acc-row.active { background: rgba(var(--accent-rgb), 0.10); }
        .sx-acc-name { font-size: 12.5px; font-weight: 600; }
        .sx-acc-plan { font-size: 10.5px; color: var(--text-3); }
      `}</style>
      <div className="sx-acc-bg" onClick={onClose} />
      <div className="sx-acc-popover" onClick={(e) => e.stopPropagation()}>
        <div className="sx-acc-row active">
          <Avatar name={orgName} size={28} color="linear-gradient(135deg, #FF9F0A, #FF453A)" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sx-acc-name">{orgName}</div>
            <div className="sx-acc-plan">{plan}</div>
          </div>
          <Pill tone="green" dot>active</Pill>
        </div>
        <div style={{ height: 1, background: 'var(--hairline)', margin: '6px 0' }} />
        <div style={{ padding: '8px 10px', fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
          Workspaces
        </div>
        <div style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-3)' }}>
          Multi-workspace coming soon. For now, every signup creates one personal workspace.
        </div>
        <div style={{ padding: '4px 0' }}>
          <Button kind="ghost" size="sm" style={{ width: '100%', justifyContent: 'flex-start' }}>
            <I.Plus size={13} /> Create new workspace
          </Button>
        </div>
      </div>
    </>
  );
}
