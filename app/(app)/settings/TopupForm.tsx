'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/lib/primitives';

export function TopupForm() {
  const router = useRouter();
  const [amount, setAmount] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function topup() {
    setError(null);
    setBusy(true);
    const r = await fetch('/api/credits/topup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount_usd: amount }),
    });
    setBusy(false);
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setError(d.detail || d.error || `HTTP ${r.status}`);
      return;
    }
    router.refresh();
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
      <span style={{ fontSize: 12, color: 'var(--text-3)' }}>$</span>
      <input
        className="sx-input"
        type="number"
        min={1}
        max={1000}
        step={1}
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        style={{ width: 90 }}
      />
      <Button kind="primary" size="sm" onClick={topup} disabled={busy || amount <= 0}>
        {busy ? 'Adding…' : 'Add credits (dev)'}
      </Button>
      {error && <span style={{ fontSize: 11, color: '#FF6E63' }}>{error}</span>}
    </div>
  );
}
