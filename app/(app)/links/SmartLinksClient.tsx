'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { I } from '@/lib/icons';
import { Card, CardHeader, CardBody, KPI, Pill, Button } from '@/lib/primitives';
import type { SmartLinkSummary } from '@/lib/data/smart-links';

export function SmartLinksClient({ links, appUrl }: { links: SmartLinkSummary[]; appUrl: string }) {
  const [openCreate, setOpenCreate] = useState(false);

  const totalClicks = links.reduce((a, l) => a + l.click_count, 0);
  const liveCount = links.filter((l) => l.status === 'live').length;
  const aiCount = links.filter((l) => l.ai_enabled).length;

  return (
    <div className="sx-page sx-fade-in">
      <style>{`
        .sx-page { padding: 24px 28px 60px; max-width: 1480px; margin: 0 auto; }
        .sx-page-hd { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom: 22px; gap: 24px; }
        .sx-kpi-grid { display:grid; grid-template-columns:repeat(4, 1fr); gap: 12px; }
        .sl-row {
          display:grid; grid-template-columns: 1fr 100px 110px 90px 60px;
          gap: 12px; align-items:center;
          padding: 12px 14px;
          border-bottom: 0.5px solid var(--hairline);
        }
        .sl-row:last-child { border-bottom: 0; }
        .sl-title { font-size: 13px; font-weight: 600; display:flex; align-items:center; gap:6px; }
        .sl-slug { font-family: var(--font-mono); font-size: 11px; color: var(--text-3); margin-top: 2px; display:flex; align-items:center; gap: 6px; word-break: break-all; }
        .sl-num { font-variant-numeric: tabular-nums; text-align: right; font-size: 13px; }
        .empty { padding: 36px; text-align: center; color: var(--text-3); font-size: 13px; }
        .empty h3 { color: var(--text); font-size: 15px; font-weight: 600; margin: 0 0 6px; }
        @media (max-width: 1200px){ .sx-kpi-grid{grid-template-columns:repeat(2,1fr)} }
      `}</style>

      <div className="sx-page-hd">
        <div>
          <h1 className="sx-page-h1">Smart Links</h1>
          <p className="sx-page-sub">
            Short links served from <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>synapse.nokhaos.com/l/&lt;slug&gt;</code> — every click is logged + attributed.
          </p>
        </div>
        <Button kind="primary" size="sm" icon={<I.Plus size={14} />} onClick={() => setOpenCreate(true)}>New link</Button>
      </div>

      <div className="sx-kpi-grid">
        <Card><CardBody style={{ padding: '18px' }}><KPI label="Total links" value={links.length.toString()} sub={`${liveCount} live`} /></CardBody></Card>
        <Card><CardBody style={{ padding: '18px' }}><KPI label="Total clicks" value={totalClicks.toLocaleString()} sub="all time" /></CardBody></Card>
        <Card><CardBody style={{ padding: '18px' }}><KPI label="AI-routed" value={aiCount.toString()} sub="rules-based" /></CardBody></Card>
        <Card><CardBody style={{ padding: '18px' }}><KPI label="Avg. CTR" value="—" sub="needs lead-attribution" /></CardBody></Card>
      </div>

      <Card style={{ marginTop: 12 }}>
        <CardHeader title="Links" sub={`${links.length} configured`} />
        <CardBody style={{ padding: '4px 0 0' }}>
          {links.length === 0 ? (
            <div className="empty">
              <h3>No smart links yet</h3>
              <div style={{ marginBottom: 14 }}>Create your first short link — paste it in your IG bio or send via DM.</div>
              <Button kind="primary" size="sm" onClick={() => setOpenCreate(true)}><I.Plus size={13} /> Create link</Button>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 110px 90px 60px', gap: 12, padding: '8px 14px', fontSize: 10.5, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.04em', textTransform: 'uppercase', borderBottom: '0.5px solid var(--hairline)' }}>
                <div>Link</div>
                <div style={{ textAlign: 'right' }}>Clicks</div>
                <div>Status</div>
                <div>AI</div>
                <div></div>
              </div>
              {links.map((l) => (
                <LinkRow key={l.id} link={l} appUrl={appUrl} />
              ))}
            </>
          )}
        </CardBody>
      </Card>

      {openCreate && <CreateLinkModal appUrl={appUrl} onClose={() => setOpenCreate(false)} />}
    </div>
  );
}

function LinkRow({ link, appUrl }: { link: SmartLinkSummary; appUrl: string }) {
  const router = useRouter();
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [busy, setBusy] = useState(false);
  const fullUrl = `${appUrl || 'https://synapse.nokhaos.com'}/l/${link.slug}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 1500);
    } catch {
      // fallback: select + execCommand omitted for brevity
    }
  }

  async function del() {
    if (!confirm(`Delete /l/${link.slug}?`)) return;
    setBusy(true);
    const r = await fetch(`/api/smart-links/${link.id}`, { method: 'DELETE' });
    setBusy(false);
    if (r.ok) router.refresh();
  }

  return (
    <div className="sl-row">
      <div style={{ minWidth: 0 }}>
        <div className="sl-title">{link.title}</div>
        <div className="sl-slug">
          <I.Link size={11} /> {fullUrl}
        </div>
      </div>
      <div className="sl-num">{link.click_count.toLocaleString()}</div>
      <div>
        <Pill tone={link.status === 'live' ? 'green' : link.status === 'paused' ? 'cold' : undefined} dot={link.status === 'live'}>{link.status}</Pill>
      </div>
      <div>{link.ai_enabled && <Pill tone="green"><I.Sparkle size={9} /> AI</Pill>}</div>
      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
        <Button kind="ghost" size="sm" onClick={copy} title="Copy link">
          {copyState === 'copied' ? <I.Check size={13} /> : <I.Link size={13} />}
        </Button>
        <Button kind="ghost" size="sm" onClick={del} disabled={busy} title="Delete">
          <I.X size={13} />
        </Button>
      </div>
    </div>
  );
}

function CreateLinkModal({ appUrl, onClose }: { appUrl: string; onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('https://');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fill slug from title
  function setT(v: string) {
    setTitle(v);
    if (!slug) {
      setSlug(v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40));
    }
  }

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch('/api/smart-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, slug, destination_url: destinationUrl, ai_enabled: true }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error === 'slug_taken' ? `Slug "/${slug}" is already taken.` : d.detail || d.error || `HTTP ${r.status}`);
        return;
      }
      onClose();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 460, maxWidth: '100%', background: 'rgba(20,20,24,0.95)', backdropFilter: 'blur(40px) saturate(180%)', border: '0.5px solid rgba(255,255,255,0.10)', borderRadius: 16, padding: 24, boxShadow: '0 8px 28px rgba(0,0,0,0.5)' }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>New smart link</div>
        <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 18 }}>
          Pick a slug — visitors hit <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{appUrl || 'https://synapse.nokhaos.com'}/l/&lt;slug&gt;</code> and get redirected to your destination URL. Every click is logged.
        </div>
        <Field label="Title">
          <input className="sx-input" value={title} onChange={(e) => setT(e.target.value)} placeholder="Half-marathon plan" />
        </Field>
        <Field label="Slug">
          <input className="sx-input" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="half-mar" />
        </Field>
        <Field label="Destination URL">
          <input className="sx-input" type="url" value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} placeholder="https://example.com/checkout" />
        </Field>
        {error && <div style={{ fontSize: 12, color: '#FF6E63', marginBottom: 10 }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
          <Button kind="ghost" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button kind="primary" size="sm" disabled={busy || !title || !slug || !destinationUrl} onClick={create}>{busy ? 'Creating…' : 'Create'}</Button>
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
