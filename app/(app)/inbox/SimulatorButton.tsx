'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/lib/primitives';
import { I } from '@/lib/icons';

export function SimulatorButton({ compact }: { compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [handle, setHandle] = useState('test_lead');
  const [text, setText] = useState('hi! is the half-marathon plan still available?');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch('/api/dev/simulate-dm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_handle: handle, text }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.detail || d.error || `HTTP ${r.status}`);
        return;
      }
      setOpen(false);
      setText('');
      // Worker polls every 2s — give it a beat then refresh
      setTimeout(() => router.refresh(), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button kind={compact ? 'ghost' : 'default'} size="sm" icon={<I.Bolt size={13} />} onClick={() => setOpen(true)}>
        {compact ? '' : 'Simulate inbound DM'}
      </Button>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={() => !busy && setOpen(false)}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 420, maxWidth: '100%',
          background: 'rgba(20,20,24,0.95)',
          backdropFilter: 'blur(40px) saturate(180%)',
          border: '0.5px solid rgba(255,255,255,0.10)',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Simulate inbound DM</div>
        <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 16 }}>
          Bypasses Meta. Drops a synthetic webhook event into the queue; the worker processes it like a real DM (lead created, classified by AI, automations fire).
        </div>

        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>From handle</label>
        <input className="sx-input" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="test_lead" style={{ marginBottom: 12 }} />

        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Message text</label>
        <textarea
          className="sx-input"
          style={{ height: 70, paddingTop: 8 }}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="hi! is the half-marathon plan still available?"
        />

        {error && <div style={{ marginTop: 10, fontSize: 12, color: '#FF6E63' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button kind="ghost" size="sm" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button kind="primary" size="sm" disabled={busy || !text.trim() || !handle.trim()} onClick={send}>
            {busy ? 'Sending…' : 'Simulate DM'}
          </Button>
        </div>
      </div>
    </div>
  );
}
