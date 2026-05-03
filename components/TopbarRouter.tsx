'use client';

import { usePathname } from 'next/navigation';
import { Topbar } from '@/components/Topbar';

const TITLES: Record<string, { t: string; s: string }> = {
  '/dashboard': { t: 'Neural',              s: 'Live overview' },
  '/flow':      { t: 'Flow Builder',        s: 'Design AI conversation flows' },
  '/inbox':     { t: 'Inbox Intelligence',  s: 'AI-routed conversations' },
  '/analytics': { t: 'Analytics Vault',     s: 'Last 30 days' },
  '/audiences': { t: 'Audiences',           s: 'AI-built segments' },
  '/links':     { t: 'Smart Links',         s: 'AI-routed funnel links' },
  '/settings':  { t: 'Settings',            s: 'Workspace, integrations, billing' },
};

export function TopbarRouter({ userName }: { userName?: string }) {
  const path = usePathname() || '/dashboard';
  const match = Object.keys(TITLES).find((k) => path.startsWith(k));
  const meta = (match && TITLES[match]) || TITLES['/dashboard'];
  return <Topbar title={meta.t} subtitle={meta.s} userName={userName} />;
}
