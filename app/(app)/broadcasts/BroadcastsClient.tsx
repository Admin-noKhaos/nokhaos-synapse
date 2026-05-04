'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { I } from '@/lib/icons';
import { Card, CardHeader, CardBody, KPI, Button, Pill } from '@/lib/primitives';

type Broadcast = {
  id: string;
  name: string;
  message: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'failed';
  scheduled_at: string | null;
  sent_at: string | null;
  recipients_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  audience_id: string | null;
  created_at: string;
};

export function BroadcastsClient({ broadcasts, audiences }: { broadcasts: Broadcast[]; audiences: { id: string; name: string; size: number }[] }) {
  const [openCreate, setOpenCreate] = useState(false);
  const totalSent = broadcasts.reduce((a, b) => a + b.delivered_count, 0);
  const totalOpens = broadcasts.reduce((a, b) => a + b.opened_count, 0);

  return (
    <div className="sx-page sx-fade-in">
      <style>{`
        .sx-page { padding: 24px 28px 60px; max-width: 1480px; margin: 0 auto; }
        .sx-page-hd { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom: 22px; gap: 24px; }
        .sx-kpi-grid { display:grid; grid-template-columns:repeat(4, 1fr); gap: 12px; }
        .b-row { display:grid; grid-template-columns: 1fr 100px 110px 100px 80px; gap: 12px; align-items:center; padding: 12px 14px; border-bottom: 0.5px solid var(--hairline); }
        .b-row:last-child { border-bottom: 0; }
        .b-name { font-size: 13px; font-weight: 600; }
        .b-msg { font-size: 11.5px; color: var(--text-3); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
        .empty { padding: 40px; text-align: center; color: var(--text-3); }
        .empty h3 { color: var(--text); font-size: 16px; font-weight: 600; margin: 0 0 8px; }
      `}</style>

      <div className="sx-page-hd">
        <div>
          <h1 className="sx-page-h1">Broadcasts</h1>
          <p className="sx-page-sub">Mass DMs to a selected audience. Schedule, send, track open + click rates.</p>
        </div>
        <Button kind="primary" size="sm" icon={<I.Plus size={14} />} onClick={() => setOpenCreate(true)}>New broadcast</Button>
      </div>

      <div className="sx-kpi-grid">
        <Card><CardBody style={{ padding: '20px' }}><KPI label="Campaigns" value={broadcasts.length.toString()} sub="all time" /></CardBody></Card>
        <Card><CardBody style={{ padding: '20px' }}><KPI label="Scheduled" value={broadcasts.filter((b) => b.status === 'scheduled').length.toString()} sub="upcoming" /></CardBody></Card>
        <Card><CardBody style={{ padding: '20px' }}><KPI label="Delivered" value={totalSent.toLocaleString()} sub="messages sent" /></CardBody></Card>
        <Card><CardBody style={{ padding: '20px' }}><KPI label="Opens" value={totalOpens.toLocaleString()} sub={totalSent ? `${Math.round((totalOpens / totalSent) * 100)}% rate` : 'no sends yet'} /></CardBody></Card>
      </div>

      <Card style={{ marginTop: 12 }}>
        <CardHeader title="Campaigns" sub={`${broadcasts.length} total`} />
        <CardBody style={{ padding: '4px 0 0' }}>
          {broadcasts.length === 0 ? (
            <div className="empty">
              <h3>No broadcasts yet</h3>
              <div style={{ marginBottom: 14 }}>Send a mass DM to one of your audiences. Drafts let you compose now and send later.</div>
              <Button kind="primary" size="sm" onClick={() => setOpenCreate(true)}><I.Plus size={13} /> Create your first broadcast</Button>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 110px 100px 80px', gap: 12, padding: '8px 14px', fontSize: 10.5, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.04em', textTransform: 'uppercase', borderBottom: '0.5px solid var(--hairline)' }}>
                <div>Campaign</div><div style={{ textAlign: 'right' }}>Recipients</div><div>Status</div><div style={{ textAlign: 'right' }}>Opens</div><div></div>
              </div>
              {broadcasts.map((b) => (
                <BroadcastRow key={b.id} b={b} />
              ))}
            </>
          )}
        </CardBody>
      </Card>

      {openCreate && <CreateModal audiences={audiences} onClose={() => setOpenCreate(false)} />}
    </div>
  );
}

function BroadcastRow({ b }: { b: Broadcast }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function del() {
    if (!confirm(`Delete "${b.name}"?`)) return;
    setBusy(true);
    const r = await fetch(`/api/broadcasts/${b.id}`, { method: 'DELETE' });
    setBusy(false);
    if (r.ok) router.refresh();
  }
  return (
    <div className="b-row">
      <div style={{ minWidth: 0 }}>
        <div className="b-name">{b.name}</div>
        <div className="b-msg">{b.message}</div>
      </div>
      <div style={{ textAlign: 'right', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{b.recipients_count.toLocaleString()}</div>
      <div>
        <Pill tone={b.status === 'sent' || b.status === 'sending' ? 'green' : b.status === 'failed' ? 'hot' : b.status === 'scheduled' ? 'warm' : 'cold'}
              dot={b.status === 'sending' || b.status === 'sent'}>{b.status}</Pill>
      </div>
      <div style={{ textAlign: 'right', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{b.opened_count.toLocaleString()}</div>
      <div style={{ textAlign: 'right' }}>
        <Button kind="ghost" size="sm" disabled={busy} onClick={del} title="Delete"><I.X size={13} /></Button>
      </div>
    </div>
  );
}

function CreateModal({ audiences, onClose }: { audiences: { id: string; name: string; size: number }[]; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [audienceId, setAudienceId] = useState<string>('');
  const [scheduled, setScheduled] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true); setError(null);
    const body: Record<string, unknown> = { name, message };
    if (audienceId) body.audience_id = audienceId;
    if (scheduled) body.scheduled_at = new Date(scheduled).toISOString();
    const r = await fetch('/api/broadcasts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setBusy(false);
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setError(d.detail || d.error || `HTTP ${r.status}`);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 520, maxWidth: '100%', background: 'rgba(20,20,24,0.95)', backdropFilter: 'blur(40px) saturate(180%)', border: '0.5px solid rgba(255,255,255,0.10)', borderRadius: 16, padding: 24, boxShadow: '0 8px 28px rgba(0,0,0,0.5)' }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>New broadcast</div>
        <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 18 }}>Compose a mass DM. Schedule it for later, or save as a draft and send later from the list.</div>
        <Field label="Name (internal)"><input className="sx-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="August cohort · early-bird" /></Field>
        <Field label="Audience">
          <select className="sx-input" value={audienceId} onChange={(e) => setAudienceId(e.target.value)}>
            <option value="">— No audience (just save as draft) —</option>
            {audiences.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.size.toLocaleString()})</option>)}
          </select>
        </Field>
        <Field label="Message">
          <textarea className="sx-input" style={{ height: 100, paddingTop: 8 }} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Hi {{first_name}}! Doors are open for the August cohort…" />
        </Field>
        <Field label="Schedule for later (optional)">
          <input className="sx-input" type="datetime-local" value={scheduled} onChange={(e) => setScheduled(e.target.value)} />
        </Field>
        {error && <div style={{ fontSize: 12, color: '#FF6E63', marginBottom: 10 }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
          <Button kind="ghost" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button kind="primary" size="sm" disabled={busy || !name || !message} onClick={create}>{busy ? 'Saving…' : (scheduled ? 'Schedule' : 'Save draft')}</Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}
