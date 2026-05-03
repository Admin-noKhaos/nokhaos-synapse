'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/lib/primitives';
import { I } from '@/lib/icons';

export function SignOutButton() {
  const router = useRouter();
  async function out() {
    await fetch('/api/auth/signout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }
  return (
    <Button kind="ghost" size="sm" icon={<I.LogOut size={13} />} onClick={out}>
      Sign out
    </Button>
  );
}
