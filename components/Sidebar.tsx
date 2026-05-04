'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { I } from '@/lib/icons';
import { Avatar } from '@/lib/primitives';

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
};

const PRIMARY: NavItem[] = [
  { href: '/dashboard',  label: 'Neural',         icon: <I.Sparkle   size={17} /> },
  { href: '/flow',       label: 'Flow Builder',   icon: <I.Branch    size={17} /> },
  { href: '/inbox',      label: 'Inbox',          icon: <I.Inbox     size={17} /> },
  { href: '/approval',   label: 'Approval Queue', icon: <I.Check     size={17} /> },
  { href: '/stories',    label: 'Story Replies',  icon: <I.Heart     size={17} /> },
  { href: '/contacts',   label: 'Contacts',       icon: <I.Layers    size={17} /> },
  { href: '/broadcasts', label: 'Broadcasts',     icon: <I.Megaphone size={17} /> },
  { href: '/ab',         label: 'A/B Tests',      icon: <I.Bolt      size={17} /> },
  { href: '/analytics',  label: 'Analytics',      icon: <I.Chart     size={17} /> },
];

const SECONDARY: NavItem[] = [
  { href: '/audiences',  label: 'Audiences',   icon: <I.Funnel    size={17} /> },
  { href: '/links',      label: 'Smart Links', icon: <I.Link      size={17} /> },
  { href: '/templates',  label: 'Templates',   icon: <I.Doc       size={17} /> },
  { href: '/schedule',   label: 'Schedule',    icon: <I.Calendar  size={17} /> },
  { href: '/brain',      label: 'Master doc',  icon: <I.Brain     size={17} /> },
  { href: '/playground', label: 'AI test',     icon: <I.Sparkle   size={17} /> },
  { href: '/mobile',     label: 'Mobile',      icon: <I.Phone     size={17} /> },
  { href: '/settings',   label: 'Settings',    icon: <I.Settings  size={17} /> },
];

export function Sidebar({
  orgName,
  plan,
  onWorkspaceClick,
  approvalBadge,
  inboxBadge,
}: {
  orgName: string;
  plan: string;
  onWorkspaceClick?: () => void;
  approvalBadge?: number;
  inboxBadge?: number;
}) {
  const pathname = usePathname();

  return (
    <aside className="sx-sidebar">
      <style>{`
        .sx-sidebar {
          width: 232px; flex-shrink: 0;
          height: 100vh;
          background: rgba(10, 10, 12, 0.72);
          backdrop-filter: blur(40px) saturate(180%);
          -webkit-backdrop-filter: blur(40px) saturate(180%);
          border-right: 0.5px solid var(--hairline);
          display: flex; flex-direction: column;
          padding: 14px 12px;
          position: relative;
          z-index: 10;
        }
        html[data-theme='light'] .sx-sidebar { background: rgba(248,248,250,0.78); }
        .sx-brand { display: flex; align-items: center; gap: 10px; padding: 6px 8px 14px; }
        .sx-brand-mark {
          width: 28px; height: 28px;
          border-radius: 8px;
          background: var(--grad-accent);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 1px 0 rgba(255,255,255,0.30) inset, 0 4px 14px rgba(var(--accent-rgb), 0.30);
          color: #003318;
        }
        .sx-brand-name { font-size: 14px; font-weight: 600; letter-spacing: -0.01em; }
        .sx-brand-org  { font-size: 11px; color: var(--text-3); margin-top: 1px; }
        .sx-nav { display: flex; flex-direction: column; gap: 1px; flex-shrink: 0; }
        .sx-nav-scroll { flex: 1; overflow-y: auto; }
        .sx-nav-scroll::-webkit-scrollbar { width: 4px; }
        .sx-nav-label {
          font-size: 10.5px; font-weight: 600;
          color: var(--text-3); letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 14px 10px 4px;
        }
        .sx-nav-item {
          display: flex; align-items: center; gap: 10px;
          height: 30px; padding: 0 10px;
          border-radius: 7px;
          color: var(--text-2);
          font-size: 12.5px; font-weight: 500;
          letter-spacing: -0.005em;
          cursor: pointer;
          transition: background 100ms var(--ease), color 100ms var(--ease);
          border: 0; background: transparent;
          width: 100%; text-align: left; text-decoration: none;
        }
        .sx-nav-item:hover { background: rgba(255,255,255,0.05); color: var(--text); }
        html[data-theme='light'] .sx-nav-item:hover { background: rgba(0,0,0,0.04); }
        .sx-nav-item.active {
          background: rgba(255,255,255,0.07);
          color: var(--text);
          box-shadow: 0 0.5px 0 rgba(255,255,255,0.06) inset;
        }
        html[data-theme='light'] .sx-nav-item.active { background: rgba(0,0,0,0.06); }
        .sx-nav-item.active .sx-nav-icon { color: var(--accent-1); }
        .sx-nav-icon { display: inline-flex; color: var(--text-3); transition: color 100ms; }
        .sx-nav-item:hover .sx-nav-icon { color: var(--text); }
        .sx-nav-badge {
          margin-left: auto;
          min-width: 18px; height: 18px; padding: 0 5px;
          border-radius: 9px;
          background: var(--accent-1); color: #003318;
          font-size: 10.5px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          font-variant-numeric: tabular-nums;
        }
        .sx-workspace {
          margin-top: auto;
          display: flex; align-items: center; gap: 10px;
          padding: 10px;
          border-radius: 10px;
          background: rgba(255,255,255,0.04);
          border: 0.5px solid var(--hairline);
          cursor: pointer; flex-shrink: 0;
        }
        html[data-theme='light'] .sx-workspace { background: rgba(0,0,0,0.04); }
        .sx-workspace:hover { background: rgba(255,255,255,0.06); }
        html[data-theme='light'] .sx-workspace:hover { background: rgba(0,0,0,0.06); }
        .sx-ws-name { font-size: 12px; font-weight: 600; }
        .sx-ws-plan { font-size: 10.5px; color: var(--text-3); }
      `}</style>

      <div className="sx-brand">
        <div className="sx-brand-mark">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="18" r="2"/>
            <path d="M7.6 8 10.5 16M16.4 8 13.5 16M8 6h8"/>
          </svg>
        </div>
        <div>
          <div className="sx-brand-name">Synapse</div>
          <div className="sx-brand-org">noKhaos · Production</div>
        </div>
      </div>

      <div className="sx-nav-scroll">
        <nav className="sx-nav">
          {PRIMARY.map((it) => {
            const badge = it.href === '/inbox' ? inboxBadge : it.href === '/approval' ? approvalBadge : it.badge;
            return (
              <Link
                key={it.href}
                href={it.href}
                className={'sx-nav-item' + (pathname?.startsWith(it.href) ? ' active' : '')}
              >
                <span className="sx-nav-icon">{it.icon}</span>
                <span>{it.label}</span>
                {badge ? <span className="sx-nav-badge">{badge}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className="sx-nav-label">Workspace</div>
        <nav className="sx-nav">
          {SECONDARY.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={'sx-nav-item' + (pathname?.startsWith(it.href) ? ' active' : '')}
            >
              <span className="sx-nav-icon">{it.icon}</span>
              <span>{it.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      <div className="sx-workspace" onClick={onWorkspaceClick}>
        <Avatar name={orgName} size={28} color="linear-gradient(135deg, #FF9F0A, #FF453A)" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sx-ws-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {orgName}
          </div>
          <div className="sx-ws-plan">{plan}</div>
        </div>
        <I.More size={16} style={{ color: 'var(--text-3)' }} />
      </div>
    </aside>
  );
}
