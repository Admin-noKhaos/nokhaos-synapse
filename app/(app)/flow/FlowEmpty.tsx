'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { I } from '@/lib/icons';
import { Card, CardBody, Button, Pill } from '@/lib/primitives';

export function FlowEmpty() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function create(template: 'auto_reply' | 'blank', name: string) {
    setBusy(template);
    setError(null);
    try {
      const r = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template, name }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.detail || d.error || `HTTP ${r.status}`);
        return;
      }
      router.push(`/flow?id=${d.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ padding: '64px 24px', maxWidth: 760, margin: '0 auto' }}>
      <style>{`
        .empty-hero { text-align: center; margin-bottom: 24px; }
        .empty-icon { width: 56px; height: 56px; border-radius: 14px; background: var(--grad-accent-soft); color: var(--accent-1); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        .empty-h { font-size: 24px; font-weight: 600; letter-spacing: -0.02em; margin: 0 0 6px; }
        .empty-sub { color: var(--text-2); font-size: 13px; margin: 0 auto; max-width: 500px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .tile { padding: 22px 22px 18px; cursor: pointer; }
        .tile:hover { background: var(--surface-2); }
        .tile-icon { width: 36px; height: 36px; border-radius: 10px; background: rgba(52,224,138,0.10); color: var(--accent-1); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px; }
        .tile-name { font-size: 15px; font-weight: 600; letter-spacing: -0.01em; margin-bottom: 4px; }
        .tile-desc { font-size: 12.5px; color: var(--text-2); line-height: 1.5; }
        .tile-foot { display: flex; align-items: center; gap: 6px; margin-top: 14px; font-size: 11.5px; color: var(--text-3); }
        @media (max-width: 700px){ .grid{grid-template-columns:1fr} }
      `}</style>

      <div className="empty-hero">
        <div className="empty-icon"><I.Branch size={28} /></div>
        <h1 className="empty-h">Build your first flow</h1>
        <p className="empty-sub">A flow is a visual program that runs on every inbound DM. Triggers fire it, AI nodes classify and generate, conditions branch, actions reply or hand off.</p>
      </div>

      {error && <div style={{ background: 'rgba(255,69,58,0.12)', border: '0.5px solid rgba(255,69,58,0.4)', color: '#FF6E63', padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: 12 }}>{error}</div>}

      <div className="grid">
        <Card className="tile" onClick={() => !busy && create('auto_reply', 'Auto-reply to DMs')}>
          <CardBody>
            <div className="tile-icon"><I.Sparkle size={18} /></div>
            <div className="tile-name">Auto-reply to DMs</div>
            <div className="tile-desc">Trigger on every new DM → classify intent → if it's a purchase intent, generate a reply and send. Otherwise, hand off to a human.</div>
            <div className="tile-foot"><Pill tone="green">Recommended</Pill> 7 nodes · ready to publish</div>
            {busy === 'auto_reply' && <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-3)' }}>Creating…</div>}
          </CardBody>
        </Card>

        <Card className="tile" onClick={() => !busy && create('blank', 'Untitled flow')}>
          <CardBody>
            <div className="tile-icon"><I.Plus size={18} /></div>
            <div className="tile-name">Blank canvas</div>
            <div className="tile-desc">Start from scratch. Add a trigger, then chain AI / condition / action nodes from the left palette.</div>
            <div className="tile-foot">0 nodes</div>
            {busy === 'blank' && <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-3)' }}>Creating…</div>}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
