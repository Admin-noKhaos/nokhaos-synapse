'use client';

import { useState } from 'react';
import { I } from '@/lib/icons';
import { Card, CardHeader, CardBody, KPI, Pill, Button } from '@/lib/primitives';

const SEGMENTS = [
  { id: 's1', name: 'Half-Marathon Hopefuls',     size: 1284, growth: '+18%', criteria: ['Engaged with running content', 'Intent: training plan', 'Not yet purchased'], avgScore: 76, color: '#34E08A', spark: [40, 42, 48, 50, 56, 62, 70, 76, 82, 88, 94, 102] },
  { id: 's2', name: 'Vegan Supplement Curious',    size:  892, growth: '+11%', criteria: ['Asked about ingredients', 'Diet: plant-based', 'High DM frequency'],         avgScore: 68, color: '#5DEFA5', spark: [60, 62, 64, 66, 68, 70, 71, 73, 78, 82, 86, 88] },
  { id: 's3', name: 'Cohort Aug · On the Fence',   size:  217, growth: '+38%', criteria: ['Visited cohort link', 'Objection: price', 'Compared to peers'],              avgScore: 81, color: '#5AB0FF', spark: [20, 24, 28, 32, 40, 48, 60, 78, 96, 120, 168, 217] },
  { id: 's4', name: 'Returning · 90-day Lapsed',   size:  584, growth: '−8%',  criteria: ['Purchased > 90 days ago', 'No recent engagement', 'Opens stories'],          avgScore: 42, color: '#FFB340', spark: [780, 720, 690, 650, 640, 630, 620, 610, 600, 595, 590, 584] },
  { id: 's5', name: 'EU Catalog Requesters',       size:  156, growth: '+22%', criteria: ['Asked about shipping', 'Region: EU', 'Browsed ceramics catalog'],            avgScore: 64, color: '#DDA0FF', spark: [80, 88, 92, 100, 108, 116, 124, 132, 140, 148, 152, 156] },
  { id: 's6', name: 'Studio Beta Waitlist',        size:   84, growth: '+44%', criteria: ['Asked about beta access', 'Creator profile', 'Active last 7 days'],          avgScore: 91, color: '#FF6E63', spark: [10, 14, 22, 28, 34, 42, 50, 58, 66, 72, 78, 84] },
];

export default function AudiencesPage() {
  const [selected, setSelected] = useState(SEGMENTS[0].id);
  const seg = SEGMENTS.find((s) => s.id === selected)!;

  return (
    <div className="sx-page sx-fade-in">
      <style>{`
        .sx-page { padding: 24px 28px 60px; max-width: 1480px; margin: 0 auto; }
        .sx-page-hd { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom: 22px; gap: 24px; }
        .sx-kpi-grid { display:grid; grid-template-columns:repeat(4, 1fr); gap: 12px; }
        .sx-au-grid { display:grid; grid-template-columns: 1.4fr 1fr; gap: 12px; margin-top: 12px; }
        .sx-au-list-row {
          display:grid; grid-template-columns: 28px 1fr 100px 80px 80px;
          gap: 12px; align-items:center;
          padding: 12px 14px;
          border-bottom: 0.5px solid var(--hairline);
          cursor: pointer;
          transition: background 100ms;
          border-left: 2px solid transparent;
        }
        .sx-au-list-row:last-child { border-bottom: 0; }
        .sx-au-list-row:hover { background: rgba(255,255,255,0.03); }
        .sx-au-list-row.active { background: rgba(52,224,138,0.05); border-left-color: var(--accent-1); }
        .sx-au-dot { width: 8px; height: 8px; border-radius: 50%; }
        .sx-au-name { font-size: 13px; font-weight: 600; }
        .sx-au-crit { font-size: 11px; color: var(--text-3); margin-top: 2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .sx-au-num { font-variant-numeric: tabular-nums; font-size: 13px; font-weight: 500; text-align: right; }
        .sx-au-growth-up   { color: #5DEFA5; font-size: 11.5px; text-align: right; font-variant-numeric: tabular-nums; }
        .sx-au-growth-down { color: #FF6E63; font-size: 11.5px; text-align: right; font-variant-numeric: tabular-nums; }
        .sx-au-crit-pill {
          display:inline-flex; padding: 3px 8px; border-radius: 4px;
          background: rgba(255,255,255,0.04);
          border: 0.5px solid var(--hairline);
          font-size: 11.5px; color: var(--text-2);
          margin: 0 4px 4px 0;
        }
        .sx-au-overlap-row { display:flex; align-items:center; gap: 10px; padding: 9px 0; border-bottom: 0.5px solid var(--hairline); font-size: 12.5px; }
        .sx-au-overlap-row:last-child { border-bottom: 0; }
        .sx-au-overlap-bar { flex: 1; height: 5px; background: rgba(255,255,255,0.06); border-radius: 3px; overflow: hidden; }
        .sx-au-overlap-bar > div { height: 100%; background: var(--grad-accent); border-radius: 3px; }
        @media (max-width: 1200px){ .sx-kpi-grid{grid-template-columns:repeat(2,1fr)} .sx-au-grid{grid-template-columns:1fr} }
      `}</style>

      <div className="sx-page-hd">
        <div>
          <h1 className="sx-page-h1">Audiences</h1>
          <p className="sx-page-sub">AI-built segments from DM behavior, intent signals, and funnel touchpoints.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button kind="default" size="sm" icon={<I.Filter size={14} />}>All sources</Button>
          <Button kind="primary" size="sm" icon={<I.Plus size={14} />}>New segment</Button>
        </div>
      </div>

      <div className="sx-kpi-grid">
        {[
          { label: 'Segments',         value: '24',                delta: '+3',    dir: 'up' as const, sub: 'this month' },
          { label: 'Total Reach',      value: '47.2', unit: 'k',    delta: '+5.8%', dir: 'up' as const, sub: 'unique profiles' },
          { label: 'Avg. Lead Score',  value: '68.4',                delta: '+2.1',  dir: 'up' as const, sub: 'across all segments' },
          { label: 'Auto-Built Today', value: '3',                   delta: '+1',    dir: 'up' as const, sub: 'by Synapse' },
        ].map((k, i) => (
          <Card key={i}>
            <CardBody style={{ padding: '18px' }}>
              <KPI {...k} deltaDir={k.dir} />
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="sx-au-grid">
        <Card>
          <CardHeader title="Segments" sub={`${SEGMENTS.length} active`} right={<Button kind="ghost" size="sm" icon={<I.More size={14} />} />} />
          <CardBody style={{ padding: '4px 0 0' }}>
            {SEGMENTS.map((s) => (
              <div key={s.id} className={'sx-au-list-row' + (selected === s.id ? ' active' : '')} onClick={() => setSelected(s.id)}>
                <div className="sx-au-dot" style={{ background: s.color, boxShadow: `0 0 8px ${s.color}` }} />
                <div style={{ minWidth: 0 }}>
                  <div className="sx-au-name">{s.name}</div>
                  <div className="sx-au-crit">{s.criteria.join(' · ')}</div>
                </div>
                <div style={{ height: 24 }}>
                  <MiniSpark values={s.spark} color={s.color} />
                </div>
                <div className="sx-au-num">{s.size.toLocaleString()}</div>
                <div className={s.growth.includes('−') ? 'sx-au-growth-down' : 'sx-au-growth-up'}>{s.growth}</div>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={seg.name} sub={`${seg.size.toLocaleString()} profiles · score avg ${seg.avgScore}`} right={<Pill tone="green" dot>Auto-updating</Pill>} />
          <CardBody>
            <div className="sx-section-title">Criteria</div>
            <div style={{ marginTop: 6, marginBottom: 14 }}>
              {seg.criteria.map((c) => (
                <span key={c} className="sx-au-crit-pill">{c}</span>
              ))}
              <span className="sx-au-crit-pill" style={{ cursor: 'pointer' }}><I.Plus size={10} /> Add</span>
            </div>

            <div className="sx-section-title">Score distribution</div>
            <div style={{ marginTop: 8, marginBottom: 14 }}>
              <ScoreDistribution avg={seg.avgScore} />
            </div>

            <div className="sx-section-title">Overlap with</div>
            <div style={{ marginTop: 8 }}>
              {[
                { l: 'Half-Marathon Hopefuls',     v: 28 },
                { l: 'Vegan Supplement Curious',    v: 14 },
                { l: 'EU Catalog Requesters',       v:  6 },
              ].map((r) => (
                <div key={r.l} className="sx-au-overlap-row">
                  <span style={{ flex: '0 0 45%' }}>{r.l}</span>
                  <div className="sx-au-overlap-bar"><div style={{ width: `${r.v * 2}%` }} /></div>
                  <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-2)', flex: '0 0 36px', textAlign: 'right' }}>{r.v}%</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 18, display: 'flex', gap: 6 }}>
              <Button kind="primary" size="sm" icon={<I.Branch size={13} />}>Build flow</Button>
              <Button kind="default" size="sm" icon={<I.Send size={13} />}>Send broadcast</Button>
              <Button kind="ghost"   size="sm" icon={<I.More size={14} />} />
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function MiniSpark({ values, color }: { values: number[]; color: string }) {
  const W = 80, H = 24;
  const max = Math.max(...values), min = Math.min(...values);
  const norm = (v: number) => H - 2 - ((v - min) / Math.max(1, max - min)) * (H - 4);
  const path = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i / (values.length - 1)) * W} ${norm(v)}`).join(' ');
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <path d={path} fill="none" stroke={color} strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function ScoreDistribution({ avg }: { avg: number }) {
  const buckets = Array.from({ length: 20 }, (_, i) => {
    const x = i * 5 + 2.5;
    const sigma = 18;
    const peak = Math.exp(-Math.pow((x - avg) / sigma, 2));
    const det = ((i * 13) % 9) / 30 + 0.85;
    return peak * det;
  });
  const max = Math.max(...buckets);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 60 }}>
      {buckets.map((v, i) => {
        const inAvg = i * 5 + 2.5 >= avg - 5 && i * 5 + 2.5 <= avg + 5;
        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${(v / max) * 100}%`,
              minHeight: 2,
              background: inAvg ? 'var(--grad-accent)' : 'rgba(255,255,255,0.18)',
              borderRadius: 2,
            }}
          />
        );
      })}
    </div>
  );
}
