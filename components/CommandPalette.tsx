'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { I } from '@/lib/icons';
import { ACCENTS, type AccentKey } from '@/lib/theme';
import { useTheme } from '@/components/ThemeProvider';

type Item = { kind: string; group: string; label: string; hint?: string; icon: React.ReactNode; on: () => void };

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { setAccent, toggleMode } = useTheme();
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setQ(''); setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const allItems: Item[] = useMemo(() => {
    const navigate = (href: string) => () => { router.push(href); onClose(); };
    const navItems: [string, string, string, React.ReactNode][] = [
      ['/dashboard',  'Neural',         'Live overview',                    <I.Sparkle   key="0" size={14} />],
      ['/flow',       'Flow Builder',   'Design AI flows',                  <I.Branch    key="1" size={14} />],
      ['/inbox',      'Inbox',          'AI-routed conversations',          <I.Inbox     key="2" size={14} />],
      ['/approval',   'Approval Queue', 'Drafts awaiting review',           <I.Check     key="3" size={14} />],
      ['/stories',    'Story Replies',  'IG-native interactions',           <I.Heart     key="4" size={14} />],
      ['/contacts',   'Contacts',       'All engaged profiles',             <I.Layers    key="5" size={14} />],
      ['/broadcasts', 'Broadcasts',     'Scheduled mass DMs',               <I.Megaphone key="6" size={14} />],
      ['/ab',         'A/B Tests',      'Split-tests',                       <I.Bolt      key="7" size={14} />],
      ['/analytics',  'Analytics',      'Revenue + AI usage',                <I.Chart     key="8" size={14} />],
      ['/audiences',  'Audiences',      'AI-built segments',                 <I.Funnel    key="9" size={14} />],
      ['/links',      'Smart Links',    'AI-routed short links',             <I.Link      key="10" size={14} />],
      ['/templates',  'Templates',      'Saved replies',                     <I.Doc       key="11" size={14} />],
      ['/schedule',   'Schedule',       'Week view',                         <I.Calendar  key="12" size={14} />],
      ['/brain',      'Master doc',     'Brand voice + context',             <I.Brain     key="13" size={14} />],
      ['/playground', 'AI test',        'Chat with your agent',              <I.Sparkle   key="14" size={14} />],
      ['/settings',   'Settings',       'Workspace + integrations',          <I.Settings  key="15" size={14} />],
      ['/mobile',     'Mobile',         'iOS preview',                       <I.Phone     key="16" size={14} />],
    ];
    const items: Item[] = navItems.map(([href, label, hint, icon]) => ({
      kind: 'nav', group: 'Go to', label, hint, icon, on: navigate(href),
    }));

    // Quick actions
    items.push(
      { kind: 'act', group: 'Create', label: 'New broadcast',  hint: 'Send a mass DM',     icon: <I.Megaphone size={14} />, on: navigate('/broadcasts') },
      { kind: 'act', group: 'Create', label: 'New flow',       hint: 'Open Flow Builder',   icon: <I.Branch size={14} />,   on: navigate('/flow') },
      { kind: 'act', group: 'Create', label: 'New template',   hint: 'Saved reply',         icon: <I.Doc size={14} />,      on: navigate('/templates') },
      { kind: 'act', group: 'Create', label: 'New audience',   hint: 'AI-built segment',    icon: <I.Funnel size={14} />,   on: navigate('/audiences') },
      { kind: 'act', group: 'Create', label: 'New smart link', hint: 'Routed short link',   icon: <I.Link size={14} />,     on: navigate('/links') },
    );

    // Theme actions
    items.push({ kind: 'act', group: 'Theme', label: 'Toggle dark / light', hint: 'Switch appearance', icon: <I.Sun size={14} />, on: () => { toggleMode(); onClose(); } });
    (Object.keys(ACCENTS) as AccentKey[]).forEach((k) => {
      const a = ACCENTS[k];
      items.push({
        kind: 'theme', group: 'Switch accent', label: `Accent · ${a.label}`, hint: 'Theme color',
        icon: <span style={{ width: 14, height: 14, borderRadius: '50%', background: a.grad, display: 'inline-block' }} />,
        on: () => { setAccent(k); onClose(); },
      });
    });

    return items;
  }, [router, onClose, setAccent, toggleMode]);

  const items = useMemo(() => {
    if (!q.trim()) return allItems.slice(0, 30);
    const ql = q.toLowerCase();
    const score = (text: string) => {
      const t = text.toLowerCase();
      if (t.startsWith(ql)) return 3;
      if (t.includes(' ' + ql)) return 2;
      if (t.includes(ql)) return 1;
      return 0;
    };
    return allItems
      .map((it) => ({ it, s: score(it.label) * 2 + score(it.hint ?? '') }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 30)
      .map((x) => x.it);
  }, [q, allItems]);

  useEffect(() => { setIdx(0); }, [q]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(items.length - 1, i + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
      else if (e.key === 'Enter') { e.preventDefault(); items[idx]?.on(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, items, idx]);

  const grouped = useMemo(() => {
    const g: Record<string, (Item & { i: number })[]> = {};
    items.forEach((it, i) => { (g[it.group] = g[it.group] || []).push({ ...it, i }); });
    return g;
  }, [items]);

  if (!open) return null;

  return (
    <div className="sx-cmdk-backdrop sx-fade-in" onClick={onClose}>
      <style>{`
        .sx-cmdk-backdrop {
          position:fixed; inset:0; z-index:200;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(20px);
          display:flex; justify-content:center;
          padding-top: 14vh;
        }
        .sx-cmdk {
          width: 640px; max-width: 92vw; max-height: 70vh;
          background: rgba(22,22,26,0.92);
          backdrop-filter: blur(40px) saturate(180%);
          border: 0.5px solid rgba(255,255,255,0.10);
          border-radius: 14px;
          box-shadow: 0 30px 80px rgba(0,0,0,0.6);
          display: flex; flex-direction: column;
          overflow: hidden;
        }
        html[data-theme='light'] .sx-cmdk { background: rgba(248,248,250,0.94); border-color: var(--hairline); }
        .sx-cmdk-input-row { display:flex; align-items:center; gap:10px; padding: 14px 18px; border-bottom: 0.5px solid var(--hairline); }
        .sx-cmdk-input { flex: 1; background: transparent; border: 0; outline: 0; color: var(--text); font: inherit; font-size: 16px; letter-spacing: -0.01em; font-family: inherit; }
        .sx-cmdk-input::placeholder { color: var(--text-3); }
        .sx-cmdk-list { flex: 1; overflow-y: auto; padding: 8px 0; }
        .sx-cmdk-group { padding: 6px 18px 4px; font-size: 10.5px; color: var(--text-3); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
        .sx-cmdk-item { display:flex; align-items:center; gap: 10px; padding: 9px 18px; cursor:pointer; font-size: 13px; }
        .sx-cmdk-item.active { background: rgba(var(--accent-rgb), 0.14); }
        html[data-theme='light'] .sx-cmdk-item.active { background: rgba(var(--accent-rgb), 0.10); }
        .sx-cmdk-item .icon { width: 22px; height: 22px; border-radius:5px; background: rgba(255,255,255,0.06); display:flex; align-items:center; justify-content:center; color: var(--text-2); flex-shrink:0; }
        html[data-theme='light'] .sx-cmdk-item .icon { background: rgba(0,0,0,0.05); }
        .sx-cmdk-item.active .icon { background: rgba(var(--accent-rgb), 0.20); color: var(--accent-light); }
        .sx-cmdk-item .hint { color: var(--text-3); font-size: 11.5px; margin-left: auto; padding-left: 10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width: 240px; }
        .sx-cmdk-ft { padding: 8px 16px; border-top: 0.5px solid var(--hairline); display:flex; gap: 14px; font-size: 10.5px; color: var(--text-3); }
        .sx-cmdk-kbd { font-family: var(--font-mono); font-size: 10px; background: rgba(255,255,255,0.05); border: 0.5px solid var(--hairline); border-radius: 3px; padding: 1px 4px; color: var(--text-2); }
        html[data-theme='light'] .sx-cmdk-kbd { background: rgba(0,0,0,0.06); }
        .sx-cmdk-empty { padding: 40px 18px; text-align:center; color: var(--text-3); font-size: 13px; }
      `}</style>
      <div className="sx-cmdk" onClick={(e) => e.stopPropagation()}>
        <div className="sx-cmdk-input-row">
          <I.Search size={16} style={{ color: 'var(--text-3)' }} />
          <input
            ref={inputRef}
            className="sx-cmdk-input"
            placeholder="Type a command, screen, or action…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <span className="sx-cmdk-kbd">esc</span>
        </div>
        <div className="sx-cmdk-list">
          {items.length === 0 ? (
            <div className="sx-cmdk-empty">No matches for &ldquo;{q}&rdquo;</div>
          ) : Object.entries(grouped).map(([gname, list]) => (
            <div key={gname}>
              <div className="sx-cmdk-group">{gname}</div>
              {list.map((it) => (
                <div
                  key={it.label}
                  className={'sx-cmdk-item' + (it.i === idx ? ' active' : '')}
                  onMouseEnter={() => setIdx(it.i)}
                  onClick={() => it.on()}
                >
                  <span className="icon">{it.icon}</span>
                  <span style={{ fontWeight: 500 }}>{it.label}</span>
                  {it.hint && <span className="hint">{it.hint}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="sx-cmdk-ft">
          <span><span className="sx-cmdk-kbd">↑</span> <span className="sx-cmdk-kbd">↓</span> navigate</span>
          <span><span className="sx-cmdk-kbd">↵</span> select</span>
          <span><span className="sx-cmdk-kbd">esc</span> close</span>
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
            <I.Sparkle size={11} style={{ color: 'var(--accent-1)' }} /> Powered by Synapse
          </span>
        </div>
      </div>
    </div>
  );
}
