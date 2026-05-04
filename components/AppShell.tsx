'use client';

// Client-side shell that owns the overlays (CommandPalette, ContactDrawer,
// NotificationsPopover, AccountSwitcher, WhatsNew) so they can be opened from
// any page via shared state + global keyboard shortcuts.

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { NavProgress } from '@/components/NavProgress';
import { CommandPalette } from '@/components/CommandPalette';
import { ContactDrawer, type DrawerContact } from '@/components/ContactDrawer';
import { NotificationsPopover } from '@/components/NotificationsPopover';
import { AccountSwitcher } from '@/components/AccountSwitcher';
import { WhatsNew } from '@/components/WhatsNew';

const TITLES: Record<string, { t: string; s: string }> = {
  '/dashboard':  { t: 'Neural',              s: 'Live overview' },
  '/flow':       { t: 'Flow Builder',        s: 'Design AI conversation flows' },
  '/inbox':      { t: 'Inbox Intelligence',  s: 'AI-routed conversations' },
  '/approval':   { t: 'Approval Queue',      s: 'Drafts awaiting review' },
  '/stories':    { t: 'Story Replies',       s: 'IG-native interactions' },
  '/contacts':   { t: 'Contacts',            s: 'Every profile that has engaged' },
  '/broadcasts': { t: 'Broadcasts',          s: 'Mass DM campaigns' },
  '/ab':         { t: 'A/B Tests',           s: 'Split-test broadcasts and replies' },
  '/analytics':  { t: 'Analytics Vault',     s: 'Last 30 days' },
  '/audiences':  { t: 'Audiences',           s: 'AI-built segments' },
  '/links':      { t: 'Smart Links',         s: 'AI-routed funnel links' },
  '/templates':  { t: 'Templates',           s: 'Saved AI replies' },
  '/schedule':   { t: 'Schedule',            s: 'Upcoming sends + flows' },
  '/brain':      { t: 'Master doc',          s: 'Single source of truth for the AI' },
  '/playground': { t: 'AI test',             s: 'Chat with your agent' },
  '/mobile':     { t: 'Mobile',              s: 'iOS companion preview' },
  '/settings':   { t: 'Settings',            s: 'Workspace, integrations, billing' },
};

export function AppShell({
  children,
  orgName,
  plan,
  userName,
  approvalBadge,
  inboxBadge,
}: {
  children: React.ReactNode;
  orgName: string;
  plan: string;
  userName: string;
  approvalBadge?: number;
  inboxBadge?: number;
}) {
  const pathname = usePathname() || '/dashboard';
  const router = useRouter();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [acctOpen, setAcctOpen] = useState(false);
  const [drawer, setDrawer] = useState<DrawerContact | null>(null);

  const closeAll = useCallback(() => {
    setCmdOpen(false); setBellOpen(false); setHelpOpen(false); setAcctOpen(false); setDrawer(null);
  }, []);

  // Global shortcuts: ⌘K, ⌘1-9, Esc, ⌘/
  useEffect(() => {
    const SCREENS = ['/dashboard', '/flow', '/inbox', '/approval', '/stories', '/contacts', '/broadcasts', '/ab', '/analytics'];
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen((v) => !v);
        return;
      }
      if (meta && /^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        const target = SCREENS[idx];
        if (target) { e.preventDefault(); router.push(target); }
        return;
      }
      if (meta && e.key === '/') {
        e.preventDefault();
        setHelpOpen((v) => !v);
        return;
      }
      if (e.key === 'Escape') {
        closeAll();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router, closeAll]);

  // Expose contact drawer globally so any client component can call window.openContact(c)
  useEffect(() => {
    interface WindowWithDrawer extends Window { openContact?: (c: DrawerContact) => void }
    (window as WindowWithDrawer).openContact = (c) => setDrawer(c);
    return () => { delete (window as WindowWithDrawer).openContact; };
  }, []);

  const meta = Object.entries(TITLES).find(([k]) => pathname.startsWith(k))?.[1] ?? TITLES['/dashboard'];

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <NavProgress />
      <Sidebar
        orgName={orgName}
        plan={plan}
        approvalBadge={approvalBadge}
        inboxBadge={inboxBadge}
        onWorkspaceClick={() => setAcctOpen(true)}
      />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <Topbar
          title={meta.t}
          subtitle={meta.s}
          userName={userName}
          onCmdK={() => setCmdOpen(true)}
          onBell={() => setBellOpen((v) => !v)}
          onHelp={() => setHelpOpen(true)}
        />
        <div style={{ flex: 1, overflow: 'auto' }}>{children}</div>
      </main>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <NotificationsPopover open={bellOpen} onClose={() => setBellOpen(false)} />
      <AccountSwitcher open={acctOpen} onClose={() => setAcctOpen(false)} orgName={orgName} plan={plan} />
      <WhatsNew open={helpOpen} onClose={() => setHelpOpen(false)} />
      <ContactDrawer open={!!drawer} contact={drawer} onClose={() => setDrawer(null)} />
    </div>
  );
}
