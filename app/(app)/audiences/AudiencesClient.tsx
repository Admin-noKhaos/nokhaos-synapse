'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { I } from '@/lib/icons';
import { Card, CardHeader, CardBody, KPI, Pill, Button } from '@/lib/primitives';
import type { AudienceSummary } from '@/lib/data/audiences';

const TEMPLATES = [
  { id: 'high_intent', name: 'High intent (score \u2265 70)', desc: 'Leads ready to buy', color: '#34E08A', icon: <I.Sparkle size={14} /> },
  { id: 'objections',  name: 'Active objections',          desc: 'Leads with intent:objection', color: '#FFB340', icon: <I.Branch size={14} /> },
  { id: 'cold_lapsed', name: 'Cold leads',                 desc: 'Sentiment = cold',           color: '#5AB0FF', icon: <I.Tag size={14} /> },
  { id: 'all_leads',   name: 'Everyone',                   desc: 'All leads in your workspace', color: '#DDA0FF', icon: <I.Layers size={14} /> },
] as const;

export function AudiencesClient({ audiences }: { audiences: AudienceSummary[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(audiences[0]?.id ?? null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function build(template: string) {
    setBusy(template);
    setError(null);
    try {
      const r = await fetch('/api/audiences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.detail || d.error || `HTTP ${r.status}`);
        return;
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const seg = audiences.find((s) => s.id === selected) ?? audiences[0] ?? null;
  const totalReach = audiences.reduce((a, s) => a + s.size, 0);
  const avgScore = audiences.length
    ? audiences.reduce((a, s) => a + (s.avg_score ?? 0), 0) / audiences.length
    : 0;

  return (
    <div className="sx-page sx-fade-in">
      <style>{`
        .sx-page { padding: 24px 28px 60px; max-width: 1480px; margin: 0 auto; }
        .sx-page-hd { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom: 22px; gap: 24px; }
        .sx-kpi-grid { display:grid; grid-template-columns:repeat(4, 1fr); gap: 12px; }
        .sx-au-grid { display:grid; grid-template-columns: 1.4fr 1fr; gap: 12px; margin-top: 12px; }
        .sx-au-list-row {
          display:grid; grid-template-columns: 28px 1fr 80px 80px;
          gap: 12px; align-items:center;
          padding: 12px 14px;
          border-bottom: 0.5px solid var(--hairline);
          cursor: pointer;
          border-left: 2px solid transparent;
        }
        .sx-au-list-row:last-child { border-bottom: 0; }
        .sx-au-list-row:hover { background: rgba(255,255,255,0.03); }
        .sx-au-list-row.active { background: rgba(52,224,138,0.05); border-left-color: var(--accent-1); }
        .sx-au-dot { width: 8px; height: 8px; border-radius: 50%; }
        .sx-au-name { font-size: 13px; font-weight: 600; }
        .sx-au-crit { font-size: 11px; color: var(--text-3); margin-top: 2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .sx-au-num { font-variant-numeric: tabular-nums; font-size: 13px; font-weight: 500; text-align: right; }
        .sx-au-crit-pill {
          display:inline-flex; padding: 3px 8px; border-radius: 4px;
          background: rgba(255,255,255,0.04); border: 0.5px solid var(--hairline);
          font-size: 11.5px; color: var(--text-2);
          margin: 0 4px 4px 0;
        }
        .empty { padding: 28px; text-align: center; color: var(--text-3); font-size: 12.5px; }
        .empty-grid { display:grid; grid-template-columns:repeat(2,1fr); gap: 10px; margin-top: 16px; }
        .tpl { padding: 14px 14px 12px; border-radius: 10px; border: 0.5px solid var(--hairline); background: var(--surface-2); cursor: pointer; text-align: left; }
        .tpl:hover { background: var(--surface-3); }
        .tpl-icon { width: 28px; height: 28px; border-radius: 7px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 8px; }
        .tpl-name { font-size: 13px; font-weight: 600; margin-bottom: 2px; }
        .tpl-desc { font-size: 11.5px; color: var(--text-3); }
        .err { background: rgba(255,69,58,0.12); border: 0.5px solid rgba(255,69,58,0.4); color: #FF6E63; padding: 8px 12px; border-radius: 8px; font-size: 12px; margin-bottom: 12px; }
        @media (max-width: 1200px){ .sx-kpi-grid{grid-template-columns:repeat(2,1fr)} .sx-au-grid{grid-template-columns:1fr} .empty-grid{grid-template-columns:1fr} }
      `}</style>

      <div className="sx-page-hd">
        <div>
          <h1 className="sx-page-h1">Audiences</h1>
          <p className="sx-page-sub">Segments built from your real leads. Use them to target broadcasts and route flows.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button kind="default" size="sm" icon={<I.Filter size={14} />}>All sources</Button>
        </div>
      </div>

      <div className="sx-kpi-grid">
        <Card><CardBody style={{ padding: '18px' }}>
          <KPI label="Segments" value={audiences.length.toString()} sub={audiences.length === 0 ? 'none yet' : 'across your workspace'} />
        </CardBody></Card>
        <Card><CardBody style={{ padding: '18px' }}>
          <KPI label="Total reach" value={totalReach.toLocaleString()} sub="leads across all segments" />
        </CardBody></Card>
        <Card><CardBody style={{ padding: '18px' }}>
          <KPI label="Avg. lead score" value={avgScore ? avgScore.toFixed(1) : '—'} sub="across segments" />
        </CardBody></Card>
        <Card><CardBody style={{ padding: '18px' }}>
          <KPI label="Auto-built" value={audiences.filter((a) => a.auto).length.toString()} sub="generated from templates" />
        </CardBody></Card>
      </div>

      {error && <div className="err" style={{ marginTop: 12 }}>{error}</div>}

      {audiences.length === 0 ? (
        <Card style={{ marginTop: 16 }}>
          <CardHeader title="Build your first segment" sub="Pick a template — Synapse populates it from your real leads instantly." />
          <CardBody>
            <div className="empty-grid">
              {TEMPLATES.map((t) => (
                <button key={t.id} className="tpl" onClick={() => build(t.id)} disabled={busy !== null}>
                  <div className="tpl-icon" style={{ background: t.color + '26', color: t.color }}>{t.icon}</div>
                  <div className="tpl-name">{t.name}</div>
                  <div className="tpl-desc">{t.desc}{busy === t.id ? ' · building…' : ''}</div>
                </button>
              ))}
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="sx-au-grid">
          <Card>
            <CardHeader title="Segments" sub={`${audiences.length} active`} right={
              <Button kind="ghost" size="sm" disabled={busy !== null} onClick={() => build('high_intent')}>
                <I.Plus size={13} /> Auto-build
              </Button>
            } />
            <CardBody style={{ padding: '4px 0 0' }}>
              {audiences.map((s) => (
                <div key={s.id} className={'sx-au-list-row' + (selected === s.id ? ' active' : '')} onClick={() => setSelected(s.id)}>
                  <div className="sx-au-dot" style={{ background: s.color || '#34E08A', boxShadow: `0 0 8px ${s.color || '#34E08A'}` }} />
                  <div style={{ minWidth: 0 }}>
                    <div className="sx-au-name">{s.name}</div>
                    <div className="sx-au-crit">{s.criteria.map((c) => c.label).join(' · ') || 'no criteria'}</div>
                  </div>
                  <div className="sx-au-num">{s.size.toLocaleString()}</div>
                  <div style={{ textAlign: 'right' }}>
                    {s.auto ? <Pill tone="green">auto</Pill> : <Pill>manual</Pill>}
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={seg?.name ?? '—'}
                        sub={seg ? `${seg.size.toLocaleString()} profiles · score avg ${seg.avg_score?.toFixed(1) ?? '—'}` : ''}
                        right={seg?.auto ? <Pill tone="green" dot>auto-updating</Pill> : null} />
            <CardBody>
              <div className="sx-section-title">Criteria</div>
              <div style={{ marginTop: 6, marginBottom: 14 }}>
                {(seg?.criteria ?? []).length === 0 && <span className="sx-au-crit-pill">no filters</span>}
                {seg?.criteria.map((c, i) => <span key={i} className="sx-au-crit-pill">{c.label}</span>)}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Button kind="default" size="sm" disabled>Send broadcast (soon)</Button>
                <Button kind="default" size="sm" disabled>Build flow (soon)</Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
