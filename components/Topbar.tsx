'use client';

import { I } from '@/lib/icons';
import { Avatar, Button } from '@/lib/primitives';

export function Topbar({
  title,
  subtitle,
  userName,
  right,
}: {
  title: string;
  subtitle?: string;
  userName?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="sx-topbar">
      <style>{`
        .sx-topbar {
          height: 56px;
          display: flex; align-items: center; gap: 16px;
          padding: 0 24px;
          border-bottom: 0.5px solid var(--hairline);
          background: rgba(10, 10, 12, 0.55);
          backdrop-filter: blur(30px) saturate(180%);
          -webkit-backdrop-filter: blur(30px) saturate(180%);
          flex-shrink: 0;
          position: sticky; top: 0; z-index: 20;
        }
        .sx-topbar-title { font-size: 14.5px; font-weight: 600; letter-spacing: -0.01em; }
        .sx-topbar-sub   { font-size: 11.5px; color: var(--text-3); margin-top: 1px; }
        .sx-search {
          display: flex; align-items: center; gap: 8px;
          height: 32px; padding: 0 12px;
          border-radius: 8px;
          background: rgba(255,255,255,0.04);
          border: 0.5px solid var(--hairline);
          color: var(--text-2);
          font-size: 12.5px;
          width: 320px; max-width: 40vw;
          cursor: text;
        }
        .sx-search:focus-within {
          border-color: rgba(52,224,138,0.4);
          background: rgba(255,255,255,0.06);
        }
        .sx-search input {
          background: transparent; border: 0; outline: none;
          color: var(--text); font-size: 12.5px; flex: 1;
          font-family: inherit;
        }
        .sx-search input::placeholder { color: var(--text-3); }
        .sx-search-kbd {
          font-family: var(--font-mono); font-size: 10.5px;
          color: var(--text-3);
          background: rgba(255,255,255,0.05);
          border: 0.5px solid var(--hairline);
          border-radius: 4px;
          padding: 1px 5px;
        }
      `}</style>

      <div>
        <div className="sx-topbar-title">{title}</div>
        {subtitle && <div className="sx-topbar-sub">{subtitle}</div>}
      </div>

      <div style={{ flex: 1 }} />

      <label className="sx-search">
        <I.Search size={14} style={{ color: 'var(--text-3)' }} />
        <input placeholder="Search conversations, contacts, flows…" />
        <span className="sx-search-kbd">⌘K</span>
      </label>

      {right}

      <Button kind="ghost" icon={<I.Bell size={16} />} aria-label="Notifications" />
      <Avatar name={userName || 'You'} size={28} online />
    </header>
  );
}
