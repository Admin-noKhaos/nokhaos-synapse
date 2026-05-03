'use client';

import { useMemo } from 'react';
import { I } from '@/lib/icons';
import { Card, CardHeader, CardBody, KPI, Pill, Button } from '@/lib/primitives';
import { ACTIVITY_24H, FUNNELS, KPI_DATA } from '@/lib/sample-data';

export default function DashboardPage() {
  return (
    <div className="sx-page sx-fade-in">
      <style>{`
        .sx-page { padding: 24px 28px 60px; max-width: 1480px; margin: 0 auto; }
        .sx-page-hd { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom: 22px; gap: 24px; }
        .sx-kpi-grid { display:grid; grid-template-columns:repeat(4, 1fr); gap: 12px; }
        .sx-hero-grid { display:grid; grid-template-columns: 1.55fr 1fr; gap: 12px; margin-top: 12px; }
        .sx-row-grid  { display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 12px; }
        .sx-funnel-row {
          display:grid; grid-template-columns: 1fr 60px 80px;
          align-items: center; gap: 12px;
          padding: 8px 0;
          border-bottom: 0.5px solid var(--hairline);
        }
        .sx-funnel-row:last-child { border-bottom: 0; }
        .sx-funnel-name { font-size: 12.5px; font-weight: 500; }
        .sx-funnel-bar { position:relative; height: 18px; background: rgba(255,255,255,0.04); border-radius: 4px; overflow: hidden; }
        .sx-funnel-bar-fill { position:absolute; left:0; top:0; bottom:0; background: var(--grad-accent); border-radius: 4px; box-shadow: 0 0 12px rgba(52,224,138,0.35); }
        .sx-funnel-num { font-variant-numeric: tabular-nums; font-size: 12px; color: var(--text-2); text-align: right; }
        .sx-funnel-conv { font-variant-numeric: tabular-nums; font-size: 12px; color: var(--accent-1); text-align: right; font-weight: 500; }
        .sx-suggest-item { display:flex; gap: 10px; padding: 10px 0; border-bottom: 0.5px solid var(--hairline); }
        .sx-suggest-item:last-child { border-bottom: 0; }
        .sx-suggest-icon {
          width: 28px; height: 28px; border-radius: 7px;
          background: rgba(52,224,138,0.10);
          color: var(--accent-1);
          display:flex; align-items:center; justify-content:center;
          flex-shrink: 0;
        }
        .sx-suggest-text { font-size: 12.5px; line-height: 1.4; color: var(--text); }
        .sx-suggest-meta { font-size: 11px; color: var(--text-3); margin-top: 2px; }
        @media (max-width: 1200px){
          .sx-kpi-grid{grid-template-columns:repeat(2,1fr)}
          .sx-hero-grid{grid-template-columns:1fr}
          .sx-row-grid{grid-template-columns:1fr 1fr}
        }
      `}</style>

      <div className="sx-page-hd">
        <div>
          <h1 className="sx-page-h1">Neural</h1>
          <p className="sx-page-sub">
            Synapse is handling{' '}
            <span style={{ color: 'var(--accent-1)' }}>1,284 active conversations</span> across 5 funnels.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button kind="default" size="sm" icon={<I.Filter size={14} />}>Last 7 days</Button>
          <Button kind="primary" size="sm" icon={<I.Plus size={14} />}>New flow</Button>
        </div>
      </div>

      <div className="sx-kpi-grid">
        {KPI_DATA.map((k, i) => (
          <Card key={i}>
            <CardBody style={{ padding: '18px' }}>
              <KPI label={k.label} value={k.value} unit={k.unit} delta={k.delta} deltaDir={k.dir} sub={k.sub} />
              <div style={{ marginTop: 12 }}>
                <Sparkline accent={i === 0 || i === 3} seed={i} />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="sx-hero-grid">
        <Card>
          <CardHeader
            title="Conversation Velocity"
            sub="DM volume, replies, conversions · last 24h"
            right={
              <div style={{ display: 'flex', gap: 6 }}>
                <Pill tone="green" dot>Live</Pill>
                <Button kind="ghost" size="sm" icon={<I.More size={14} />} />
              </div>
            }
          />
          <CardBody>
            <ActivityChart data={ACTIVITY_24H} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Neural Map"
            sub="Real-time AI routing across funnels"
            right={<Pill tone="green" dot>Active</Pill>}
          />
          <CardBody style={{ padding: 0 }}>
            <NeuralGraph />
          </CardBody>
        </Card>
      </div>

      <div className="sx-row-grid">
        <Card>
          <CardHeader title="Funnel Velocity" sub="Conversions in flight" right={<Button kind="ghost" size="sm">View all</Button>} />
          <CardBody>
            {FUNNELS.map((f) => {
              const max = Math.max(...FUNNELS.map((x) => x.value));
              return (
                <div key={f.name} className="sx-funnel-row">
                  <div>
                    <div className="sx-funnel-name">{f.name}</div>
                    <div className="sx-funnel-bar" style={{ marginTop: 6 }}>
                      <div className="sx-funnel-bar-fill" style={{ width: `${(f.value / max) * 100}%` }} />
                    </div>
                  </div>
                  <div className="sx-funnel-num">{f.value}</div>
                  <div className="sx-funnel-conv">{f.conv}%</div>
                </div>
              );
            })}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Next Best Actions" sub="Suggested by Synapse" right={<Pill tone="green">6 pending</Pill>} />
          <CardBody>
            {[
              { i: <I.Send size={14} />,   t: 'Reply to Maeve Halloran with the Half-Marathon plan',     m: 'Lead score 94 · 2m' },
              { i: <I.Tag size={14} />,    t: 'Tag 12 new conversations as "objection:price"',           m: 'Cohort · Aug' },
              { i: <I.Bolt size={14} />,   t: 'Increase send rate on "Supplements · Trial" flow',        m: '+18% projected lift' },
              { i: <I.Branch size={14} />, t: 'Branch flow "Coaching · Tier 2" for non-runners',         m: '47% of recent leads' },
            ].map((s, i) => (
              <div key={i} className="sx-suggest-item">
                <div className="sx-suggest-icon">{s.i}</div>
                <div style={{ flex: 1 }}>
                  <div className="sx-suggest-text">{s.t}</div>
                  <div className="sx-suggest-meta">{s.m}</div>
                </div>
                <Button kind="ghost" size="sm" icon={<I.ArrowRight size={14} />} />
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Conversion Heatmap" sub="DM → purchase · 7 days × 24h" right={<Button kind="ghost" size="sm" icon={<I.More size={14} />} />} />
          <CardBody>
            <Heatmap />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Sparkline({ accent, seed }: { accent?: boolean; seed: number }) {
  const points = useMemo(
    () =>
      Array.from(
        { length: 28 },
        (_, i) => 40 + 20 * Math.sin(i * 0.5 + seed) + 14 * Math.cos(i * 0.3 + seed) + ((i * 7 + seed * 13) % 11) - 5,
      ),
    [seed],
  );
  const W = 220, H = 40;
  const max = Math.max(...points), min = Math.min(...points);
  const norm = (v: number) => H - ((v - min) / (max - min)) * H;
  const path = points.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i / (points.length - 1)) * W} ${norm(v)}`).join(' ');
  const fill = `${path} L ${W} ${H} L 0 ${H} Z`;
  const color = accent ? '#34E08A' : 'rgba(255,255,255,0.55)';
  const gid = 'spark-' + (accent ? 'a' : 'b') + '-' + seed;
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#${gid})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function ActivityChart({ data }: { data: number[] }) {
  const W = 700, H = 220;
  const padL = 36, padR = 12, padT = 16, padB = 28;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const max = Math.max(...data) * 1.15;
  const xAt = (i: number) => padL + (i / (data.length - 1)) * innerW;
  const yAt = (v: number) => padT + innerH - (v / max) * innerH;
  const line = data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i)} ${yAt(v)}`).join(' ');
  const area = `${line} L ${xAt(data.length - 1)} ${padT + innerH} L ${padL} ${padT + innerH} Z`;
  const ticks = [0, 6, 12, 18, 23];
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="actFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#34E08A" stopOpacity="0.32" />
          <stop offset="1" stopColor="#34E08A" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="actLine" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#4DFF9E" />
          <stop offset="1" stopColor="#00C26B" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((p, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={padT + innerH * (1 - p)} y2={padT + innerH * (1 - p)} stroke="rgba(255,255,255,0.05)" strokeDasharray="2 4" />
          <text x={padL - 8} y={padT + innerH * (1 - p) + 4} textAnchor="end" fill="rgba(235,235,245,0.36)" fontSize="10">
            {Math.round(max * p)}
          </text>
        </g>
      ))}
      {ticks.map((h) => (
        <text key={h} x={xAt(h)} y={H - 8} textAnchor="middle" fill="rgba(235,235,245,0.36)" fontSize="10">
          {String(h).padStart(2, '0')}:00
        </text>
      ))}
      <path d={area} fill="url(#actFill)" />
      <path d={line} fill="none" stroke="url(#actLine)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1={xAt(14)} x2={xAt(14)} y1={padT} y2={padT + innerH} stroke="rgba(52,224,138,0.4)" strokeDasharray="2 3" />
      <circle cx={xAt(14)} cy={yAt(data[14])} r="4" fill="#4DFF9E" stroke="#001a0d" strokeWidth="1.5" />
      <circle cx={xAt(14)} cy={yAt(data[14])} r="9" fill="none" stroke="rgba(77,255,158,0.4)">
        <animate attributeName="r" from="6" to="14" dur="1.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.6" to="0" dur="1.6s" repeatCount="indefinite" />
      </circle>
      <text x={xAt(14)} y={yAt(data[14]) - 14} textAnchor="middle" fill="#5DEFA5" fontSize="10.5" fontWeight="600">
        now · {data[14]}/min
      </text>
    </svg>
  );
}

function NeuralGraph() {
  const W = 480, H = 360;
  const cx = W / 2, cy = H / 2;
  const layers = [
    { count: 1, r: 0 },
    { count: 5, r: 70 },
    { count: 9, r: 140 },
  ];
  const nodes: { x: number; y: number; layer: number }[] = [];
  layers.forEach((L, li) => {
    for (let i = 0; i < L.count; i++) {
      const a = (i / L.count) * Math.PI * 2 - Math.PI / 2 + (li === 1 ? 0.2 : 0);
      nodes.push({ x: cx + Math.cos(a) * L.r, y: cy + Math.sin(a) * L.r, layer: li });
    }
  });
  const edges: [(typeof nodes)[0], (typeof nodes)[0]][] = [];
  nodes.filter((n) => n.layer === 1).forEach((n) => edges.push([nodes[0], n]));
  const l1 = nodes.filter((n) => n.layer === 1);
  const l2 = nodes.filter((n) => n.layer === 2);
  l2.forEach((n, i) => {
    edges.push([l1[i % l1.length], n]);
    if (i % 2 === 0) edges.push([l1[(i + 1) % l1.length], n]);
  });
  return (
    <div style={{ position: 'relative', width: '100%', height: H, overflow: 'hidden', borderRadius: '0 0 14px 14px' }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="ng-glow" cx="50%" cy="50%">
            <stop offset="0" stopColor="#34E08A" stopOpacity="0.22" />
            <stop offset="1" stopColor="#34E08A" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ng-edge" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#4DFF9E" stopOpacity="0.6" />
            <stop offset="1" stopColor="#4DFF9E" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cy} r={170} fill="url(#ng-glow)" />
        {edges.map(([a, b], i) => (
          <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(77,255,158,0.18)" strokeWidth="0.75" />
        ))}
        {edges.slice(0, 6).map(([a, b], i) => (
          <circle key={'p' + i} r="2" fill="#4DFF9E">
            <animate attributeName="cx" values={`${a.x};${b.x}`} dur={2 + i * 0.3 + 's'} repeatCount="indefinite" />
            <animate attributeName="cy" values={`${a.y};${b.y}`} dur={2 + i * 0.3 + 's'} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;1;0" dur={2 + i * 0.3 + 's'} repeatCount="indefinite" />
          </circle>
        ))}
        {nodes.map((n, i) => {
          const r = n.layer === 0 ? 14 : n.layer === 1 ? 7 : 4;
          const fill = n.layer === 0 ? 'url(#ng-edge)' : n.layer === 1 ? '#34E08A' : 'rgba(255,255,255,0.6)';
          return (
            <g key={i}>
              {n.layer === 0 ? (
                <>
                  <circle cx={n.x} cy={n.y} r="22" fill="none" stroke="rgba(52,224,138,0.4)">
                    <animate attributeName="r" from="14" to="34" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={n.x} cy={n.y} r={r} fill="#34E08A" style={{ filter: 'drop-shadow(0 0 12px rgba(52,224,138,0.7))' }} />
                  <circle cx={n.x} cy={n.y} r={r - 4} fill="#001a0d" />
                </>
              ) : (
                <circle cx={n.x} cy={n.y} r={r} fill={fill} />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Heatmap() {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const cells = useMemo(() => {
    const data: number[][] = [];
    for (let d = 0; d < 7; d++) {
      const row: number[] = [];
      for (let h = 0; h < 24; h++) {
        const morning = Math.exp(-Math.pow((h - 9) / 3, 2));
        const evening = Math.exp(-Math.pow((h - 20) / 2.5, 2));
        const weekday = d < 5 ? 1 : 0.5;
        const det = (Math.sin(d * 1.7 + h * 0.31) + Math.cos(h * 0.17)) * 0.15 + 0.85;
        const v = (morning * 0.6 + evening * 1.0) * weekday * det;
        row.push(Math.min(1, v));
      }
      data.push(row);
    }
    return data;
  }, []);
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '14px 1fr', gap: 4 }}>
        <div />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: 2, fontSize: 9, color: 'var(--text-3)', marginBottom: 4 }}>
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} style={{ textAlign: 'center' }}>{i % 6 === 0 ? i : ''}</div>
          ))}
        </div>
        {cells.map((row, d) => (
          <FragmentRow key={d} day={days[d]} row={row} />
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, fontSize: 10.5, color: 'var(--text-3)' }}>
        <span>Less</span>
        <div style={{ display: 'flex', gap: 2 }}>
          {[0.1, 0.3, 0.5, 0.75, 0.95].map((v) => (
            <div key={v} style={{ width: 14, height: 14, borderRadius: 2, background: `rgba(52,224,138,${0.12 + v * 0.78})` }} />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

function FragmentRow({ day, row }: { day: string; row: number[] }) {
  return (
    <>
      <div style={{ fontSize: 10, color: 'var(--text-3)', alignSelf: 'center' }}>{day}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: 2 }}>
        {row.map((v, h) => (
          <div
            key={h}
            style={{
              aspectRatio: '1',
              borderRadius: 2,
              background: v < 0.05 ? 'rgba(255,255,255,0.04)' : `rgba(52,224,138,${0.12 + v * 0.78})`,
              boxShadow: v > 0.7 ? `0 0 6px rgba(52,224,138,${v * 0.5})` : 'none',
            }}
          />
        ))}
      </div>
    </>
  );
}
