'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { I } from '@/lib/icons';
import { Card, CardHeader, CardBody, Button, Pill } from '@/lib/primitives';

type Template = { id: string; name: string; category: string | null; body: string; ai_generated: boolean; uses_count: number; created_at: string };

export function TemplatesClient({ templates }: { templates: Template[] }) {
  const [openCreate, setOpenCreate] = useState(false);
  const [copy, setCopy] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const cats = Array.from(new Set(templates.map((t) => t.category).filter(Boolean))) as string[];
  const filtered = filter === 'all' ? templates : templates.filter((t) => t.category === filter);

  return (
    <div className="sx-page sx-fade-in">
      <style>{`
        .sx-page { padding: 24px 28px 60px; max-width: 1280px; margin: 0 auto; }
        .sx-page-hd { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom: 22px; gap: 24px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
        .tpl-card { padding: 18px; cursor: pointer; transition: background 120ms; }
        .tpl-card:hover { background: var(--surface-2); }
        .tpl-name { font-size: 14px; font-weight: 600; letter-spacing: -0.01em; }
        .tpl-body { font-size: 12.5px; color: var(--text-2); line-height: 1.55; margin-top: 8px; max-height: 80px; overflow: hidden; }
        .tpl-foot { display: flex; align-items: center; gap: 6px; margin-top: 12px; font-size: 11px; color: var(--text-3); }
        .empty { padding: 60px; text-align: center; color: var(--text-3); }
        .empty h3 { color: var(--text); font-size: 16px; font-weight: 600; margin: 0 0 8px; }
        .filter-row { display: flex; gap: 6px; align-items: center; margin-bottom: 14px; flex-wrap: wrap; }
        .chip { padding: 4px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 500; cursor: pointer; border: 0.5px solid var(--hairline); background: transparent; color: var(--text-2); }
        .chip.active { background: var(--accent-1); color: #003318; border-color: transparent; }
      `}</style>

      <div className="sx-page-hd">
        <div>
          <h1 className="sx-page-h1">Templates</h1>
          <p className="sx-page-sub">Saved replies + snippets. Click a card to copy. Use them in flows or paste into the inbox composer.</p>
        </div>
        <Button kind="primary" size="sm" icon={<I.Plus size={14} />} onClick={() => setOpenCreate(true)}>New template</Button>
      </div>

      {cats.length > 0 && (
        <div className="filter-row">
          <button className={'chip' + (filter === 'all' ? ' active' : '')} onClick={() => setFilter('all')}>All ({templates.length})</button>
          {cats.map((c) => <button key={c} className={'chip' + (filter === c ? ' active' : '')} onClick={() => setFilter(c)}>{c}</button>)}
        </div>
      )}

      {templates.length === 0 ? (
        <Card>
          <CardBody>
            <div className="empty">
              <h3>No templates yet</h3>
              <div style={{ marginBottom: 14 }}>Save your best AI-drafted replies as templates. Reuse them in flows or paste into any conversation.</div>
              <Button kind="primary" size="sm" onClick={() => setOpenCreate(true)}><I.Plus size={13} /> Create template</Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="grid">
          {filtered.map((t) => (
            <Card key={t.id}>
              <div className="tpl-card" onClick={async () => {
                try { await navigator.clipboard.writeText(t.body); setCopy(t.id); setTimeout(() => setCopy(null), 1500); } catch {}
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div className="tpl-name">{t.name}</div>
                  {t.ai_generated && <Pill tone="green"><I.Sparkle size={10} /> AI</Pill>}
                </div>
                {t.category && <Pill>{t.category}</Pill>}
                <div className="tpl-body">&quot;{t.body}&quot;</div>
                <div className="tpl-foot">
                  <span>{copy === t.id ? '✓ Copied' : 'Click to copy'}</span>
                  <span style={{ marginLeft: 'auto' }}>used {t.uses_count}×</span>
                  <DeleteButton id={t.id} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {openCreate && <CreateModal onClose={() => setOpenCreate(false)} />}
    </div>
  );
}

function DeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={async (e) => {
        e.stopPropagation();
        if (!confirm('Delete template?')) return;
        setBusy(true);
        await fetch(`/api/templates/${id}`, { method: 'DELETE' });
        router.refresh();
        setBusy(false);
      }}
      disabled={busy}
      style={{ background: 'transparent', border: 0, color: 'var(--text-3)', cursor: 'pointer', padding: 2 }}
      title="Delete"
    >
      <I.X size={11} />
    </button>
  );
}

function CreateModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function create() {
    setBusy(true); setError(null);
    const r = await fetch('/api/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, category: category || undefined, body }) });
    setBusy(false);
    if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.detail || d.error || `HTTP ${r.status}`); return; }
    onClose(); router.refresh();
  }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 460, maxWidth: '100%', background: 'rgba(20,20,24,0.95)', backdropFilter: 'blur(40px) saturate(180%)', border: '0.5px solid rgba(255,255,255,0.10)', borderRadius: 16, padding: 24, boxShadow: '0 8px 28px rgba(0,0,0,0.5)' }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>New template</div>
        <Field label="Name"><input className="sx-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Vegan SKU + 20% code" /></Field>
        <Field label="Category (optional)"><input className="sx-input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Pricing, Objections, FAQ…" /></Field>
        <Field label="Body"><textarea className="sx-input" style={{ height: 120, paddingTop: 8 }} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Yes \u2014 Vanilla and Cacao SKUs are 100% plant. Want a first-order code?" /></Field>
        {error && <div style={{ fontSize: 12, color: '#FF6E63', marginBottom: 10 }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button kind="ghost" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button kind="primary" size="sm" disabled={busy || !name || !body} onClick={create}>{busy ? 'Saving…' : 'Save'}</Button>
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
