'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { I } from '@/lib/icons';
import { Card, CardHeader, CardBody, Button, Pill } from '@/lib/primitives';

type HistoryEntry = { id: string; changed_by: string | null; source: string | null; note: string | null; created_at: string; chars: number };

const PLACEHOLDER = `# Brand voice
- Warm, direct, no fluff. Two sentences max per reply when possible.
- Never say "I'm an AI". You speak as the team.

# Products
- Coaching · Tier 2: 12-week half-marathon plan, $89/mo, includes weekly check-ins.
- Supplements · Trial: 30-day vegan protein, $39, free shipping in EU.

# Common objections
- "Too expensive" → Mention the payment plan (3 × $30) and the 14-day money-back guarantee.
- "Is it vegan" → Yes for Vanilla and Cacao SKUs only. Whey is dairy.

# Do's & Don'ts
- DO ask one clarifying question if the goal is unclear.
- DON'T promise specific outcomes ("you will lose X kg").
- DON'T offer discounts not on this list.

# FAQ
- Shipping: 3-5 days EU, 7-12 days rest of world.
- Refunds: 14 days, no questions asked.
`;

export function BrainEditor({ initial, orgName, history = [] }: { initial: string; orgName: string; history?: HistoryEntry[] }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [reverting, setReverting] = useState<string | null>(null);

  async function revert(id: string) {
    if (!confirm('Revert the master doc to this version? Your current version is snapshotted first, so this is undoable.')) return;
    setReverting(id);
    setError(null);
    try {
      const r = await fetch('/api/brain/history', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d.detail || d.error || `HTTP ${r.status}`); return; }
      router.refresh();
      // Pull the reverted doc into the editor without a full reload.
      const g = await fetch('/api/brain').then((x) => x.json()).catch(() => null);
      if (g?.brain_md != null) { setValue(g.brain_md); setSaved(g.brain_md); }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setReverting(null);
    }
  }

  const dirty = value !== saved;
  const wordCount = value.trim().split(/\s+/).filter(Boolean).length;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (dirty && !busy) save();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch('/api/brain', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brain_md: value }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.detail || d.error || `HTTP ${r.status}`);
        return;
      }
      setSaved(value);
      setSavedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sx-page sx-fade-in">
      <style>{`
        .sx-page { padding: 24px 28px 60px; max-width: 1100px; margin: 0 auto; }
        .sx-page-hd { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom: 22px; gap: 24px; }
        .grid { display:grid; grid-template-columns: 2.2fr 1fr; gap: 12px; }
        textarea.brain {
          width: 100%; min-height: 70vh;
          background: var(--surface-1);
          border: 0.5px solid var(--hairline);
          border-radius: 12px;
          padding: 18px;
          font-family: var(--font-mono);
          font-size: 13px; line-height: 1.55;
          color: var(--text);
          outline: none;
          resize: vertical;
        }
        textarea.brain:focus { border-color: rgba(52,224,138,0.45); }
        .meta { font-size: 11.5px; color: var(--text-3); margin-top: 8px; }
        .err { background: rgba(255,69,58,0.12); border: 0.5px solid rgba(255,69,58,0.4); color: #FF6E63; padding: 8px 12px; border-radius: 8px; font-size: 12px; margin-bottom: 12px; }
        .info-row { display:flex; align-items:center; gap:8px; padding: 8px 0; font-size: 12.5px; }
        .info-row .k { color: var(--text-3); }
        @media (max-width: 900px){ .grid{grid-template-columns:1fr} }
      `}</style>

      <div className="sx-page-hd">
        <div>
          <h1 className="sx-page-h1">Master doc</h1>
          <p className="sx-page-sub">
            One source of truth that every AI call uses. Brand voice, products, objections, do's & don'ts — anything you'd tell a new hire on day one.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {savedAt && !dirty && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Saved {timeAgo(savedAt)}</span>}
          <Pill tone={dirty ? 'warm' : 'green'} dot={!dirty}>
            {dirty ? 'unsaved' : 'in sync'}
          </Pill>
          <Button kind="primary" size="sm" disabled={!dirty || busy} onClick={save}>
            {busy ? 'Saving…' : dirty ? 'Save (⌘S)' : 'Saved'}
          </Button>
        </div>
      </div>

      {error && <div className="err">{error}</div>}

      <div className="grid">
        <div>
          <textarea
            className="brain"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={PLACEHOLDER}
            spellCheck={false}
          />
          <div className="meta">
            {wordCount.toLocaleString()} words · {value.length.toLocaleString()} chars · markdown
          </div>
        </div>
        <Card>
          <CardHeader title="How this is used" sub={`Plumbed into every AI call for ${orgName}`} />
          <CardBody>
            <div className="info-row">
              <I.Sparkle size={13} style={{ color: 'var(--accent-1)' }} />
              <span><strong>Inbox classify</strong> — appended to system prompt</span>
            </div>
            <div className="info-row">
              <I.Reply size={13} style={{ color: 'var(--accent-1)' }} />
              <span><strong>Auto-reply flows</strong> — appended to system prompt</span>
            </div>
            <div className="info-row">
              <I.Brain size={13} style={{ color: 'var(--accent-1)' }} />
              <span><strong>AI test chat</strong> — full doc as context</span>
            </div>
            <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
              Tip: keep it under ~2000 words so prompt-cache hit rate stays high. Use the <a href="/playground" style={{ color: 'var(--accent-1)' }}>AI test chat</a> to validate before publishing flows.
            </div>
          </CardBody>
        </Card>

        <Card style={{ marginTop: 12 }}>
          <CardHeader title="Change history" sub="App edits and tester /teach changes" right={<Pill>{history.length}</Pill>} />
          <CardBody>
            {history.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '6px 0' }}>No changes recorded yet.</div>
            ) : (
              history.map((h) => (
                <div key={h.id} className="info-row" style={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, borderBottom: '0.5px solid var(--hairline)' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12, color: 'var(--text)' }}>
                      {h.note ? h.note : sourceLabel(h.source)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                      {sourceLabel(h.source)} · {h.changed_by ? `${h.changed_by} · ` : ''}{timeAgo(new Date(h.created_at))}
                    </div>
                  </div>
                  <Button kind="ghost" size="sm" disabled={reverting === h.id} onClick={() => revert(h.id)} title="Restore this version">
                    {reverting === h.id ? '…' : 'Restore'}
                  </Button>
                </div>
              ))
            )}
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>
              Each entry is the doc as it was before that change. Restoring snapshots your current version first, so it&apos;s always reversible.
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function sourceLabel(s: string | null): string {
  if (s === 'tester_dm') return 'Tester /teach';
  if (s === 'app_edit') return 'Editor save';
  if (s === 'app_revert') return 'Revert';
  return s ?? 'change';
}

function timeAgo(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return d.toLocaleTimeString();
}
