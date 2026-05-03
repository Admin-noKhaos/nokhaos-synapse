'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/lib/primitives';
import { I } from '@/lib/icons';

export function DisconnectButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function disconnect() {
    if (!confirm('Disconnect this Instagram account? You can re-connect anytime. Existing leads and conversations stay.')) return;
    setBusy(true);
    const r = await fetch('/api/meta/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setBusy(false);
    if (r.ok) router.refresh();
    else {
      const d = await r.json().catch(() => ({}));
      alert(d.detail || d.error || 'Disconnect failed');
    }
  }

  return (
    <Button kind="ghost" size="sm" onClick={disconnect} disabled={busy} title="Disconnect" aria-label="Disconnect">
      <I.X size={13} />
    </Button>
  );
}
