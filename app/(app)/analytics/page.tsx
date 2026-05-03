'use client';

import { useMemo } from 'react';
import { I } from '@/lib/icons';
import { Card, CardHeader, CardBody, KPI, Pill, Button } from '@/lib/primitives';

export default function AnalyticsPage() {
  return (
    <div className="sx-page sx-fade-in">
      <style>{`
        .sx-page { padding: 24px 28px 60px; max-width: 1480px; margin: 0 auto; }
        .sx-page-hd { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom: 22px; gap: 24px; }
        .sx-kpi-grid { display:grid; grid-template-columns:repeat(4, 1fr); gap: 12px; }
        .sx-an-grid { display:grid; grid-template-columns: 2fr 1fr; gap: 12px; margin-top: 12px; }
        .sx-an-row3 { display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 12px; }
        .sx-an-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
        .sx-an-table th {
          text-align: left; font-weight: 500; color: var(--text-3);
          font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase;
          padding: 8px 8px 8px 0; border-bottom: 0.5px solid var(--hairline);
        }
        .sx-an-table td { padding: 11px 8px 11px 0; border-bottom: 0.5px solid var(--hairline); font-variant-numeric: tabular-nums; }
        .sx-an-table tr:last-child td { border-bottom: 0; }
        .sx-an-table .pos { color: #5DEFA5; }
        .sx-an-table .neg { color: #FF6E63; }
        @media (max-width: 1200px){ .sx-kpi-grid{grid-template-columns:repeat(2,1fr)} .sx-an-grid{grid-template-columns:1fr} .sx-an-row3{grid-template-columns:1fr} }
      `}</style>

      <div className="sx-page-hd">
        <div>
          <h1 className="sx-page-h1">Analytics Vault</h1>
          <p className="sx-page-sub">Reporting on DM volume, response, and funnel ROI.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button kind="default" size="sm" icon={<I.Filter size={14} />}>Last 30 days</Button>
          <Button kind="default" size="sm">Export</Button>
        </div>
      </div>

      <div className="sx-kpi-grid">
        {[
          { label: 'Revenue Attributed', value: '$284.9', unit: 'k', delta: '+22.4%', dir: 'up' as const, sub: 'vs. prev. period' },
          { label: 'DM Volume',          value: '48,221',            delta: '+9.8%',  dir: 'up' as const, sub: 'sent · received' },
          { label: 'Avg. AI Confidence', value: '94.2', unit: '%',   delta: '+1.4pt', dir: 'up' as const, sub: 'all flows' },
          { label: 'Cost per Conversion', value: '$3.84',            delta: '−$0.92', dir: 'up' as const, sub: 'vs. prev. period' },
        ].map((k, i) => (
          <Card key={i}>
            <CardBody style={{ padding: '18px' }}>
              <KPI {...k} deltaDir={k.dir} />
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="sx-an-grid">
        <Card>
          <CardHeader title="Revenue Attribution" sub="Funnel link clicks → completed orders" right={<Pill tone="green">All funnels</Pill>} />
          <CardBody><RevenueChart /></CardBody>
        </Card>

        <Card>
          <CardHeader title="Channel Mix" sub="Where conversions originate" />
          <CardBody>
            <ChannelDonut />
            <div style={{ marginTop: 14 }}>
              {[
                { l: 'Instagram DM', v: 62, c: '#34E08A' },
                { l: 'Story Reply',  v: 18, c: '#5AB0FF' },
                { l: 'Comment Reply', v: 14, c: '#FFB340' },
                { l: 'Live Q&A',     v: 6, c: '#DDA0FF' },
              ].map((r) => (
                <div key={r.l} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '0.5px solid var(--hairline)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: r.c }} />
                  <span style={{ fontSize: 12.5, flex: 1 }}>{r.l}</span>
                  <span style={{ fontSize: 12.5, fontVariantNumeric: 'tabular-nums', color: 'var(--text-2)' }}>{r.v}%</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="sx-an-row3">
        <Card>
          <CardHeader title="Response Time" sub="P50 · P95" />
          <CardBody>
            <div style={{ display: 'flex', gap: 18, padding: '4px 0 12px' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>P50</div>
                <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>14<span style={{ fontSize: 14, color: 'var(--text-3)', marginLeft: 2 }}>s</span></div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>P95</div>
                <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>2.4<span style={{ fontSize: 14, color: 'var(--text-3)', marginLeft: 2 }}>m</span></div>
              </div>
            </div>
            <BarChart values={[18, 15, 14, 16, 12, 11, 9, 10, 12, 14, 11, 10]} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="AI Confidence" sub="By output class" />
          <CardBody>
            {[
              { l: 'Purchase intent', v: 96.8 },
              { l: 'Objection',       v: 91.2 },
              { l: 'Shipping query',  v: 98.4 },
              { l: 'Brand sentiment', v: 89.6 },
              { l: 'Spam',            v: 99.7 },
            ].map((r) => (
              <div key={r.l} style={{ padding: '7px 0', borderBottom: '0.5px solid var(--hairline)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span>{r.l}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', color: '#5DEFA5' }}>{r.v}%</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${r.v}%`, background: 'var(--grad-accent)', borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Top-Converting Replies" sub="By open → click rate" />
          <CardBody>
            {[
              { q: 'Want me to send the breakdown?',                 c: 64.2 },
              { q: 'I can share the 12-week plan if helpful.',        c: 58.9 },
              { q: 'Your size + a 20% code?',                          c: 51.6 },
              { q: 'Free trial for 14 days?',                          c: 47.3 },
            ].map((r, i) => (
              <div key={i} style={{ padding: '9px 0', borderBottom: '0.5px solid var(--hairline)' }}>
                <div style={{ fontSize: 12.5, marginBottom: 4 }}>"{r.q}"</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Click-through</span>
                  <span style={{ color: '#5DEFA5', fontVariantNumeric: 'tabular-nums' }}>{r.c}%</span>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <div style={{ marginTop: 12 }}>
        <Card>
          <CardHeader title="Funnel ROI" sub="30-day attribution window" right={<Button kind="ghost" size="sm" icon={<I.More size={14} />} />} />
          <CardBody>
            <table className="sx-an-table">
              <thead>
                <tr>
                  <th>Funnel</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Volume</th>
                  <th style={{ textAlign: 'right' }}>Conv. rate</th>
                  <th style={{ textAlign: 'right' }}>Revenue</th>
                  <th style={{ textAlign: 'right' }}>ROAS</th>
                  <th style={{ textAlign: 'right' }}>Δ</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { n: 'Coaching · Tier 2',     s: 'Live',   v: '1,284', c: '11.4%', r: '$84,210', roas: '8.1x', d: '+22%' },
                  { n: 'Supplements · Trial',   s: 'Live',   v: '  892', c: ' 9.1%', r: '$48,940', roas: '5.4x', d: '+11%' },
                  { n: 'Ceramics · Catalog',    s: 'Live',   v: '  584', c: ' 6.2%', r: '$31,205', roas: '3.8x', d: ' +4%' },
                  { n: 'Cohort · Aug',          s: 'Live',   v: '  217', c: '14.8%', r: '$92,800', roas: '9.6x', d: '+38%' },
                  { n: 'Studio · Beta',         s: 'Beta',   v: '   84', c: '22.0%', r: '$ 9,940', roas: '2.2x', d: '  —' },
                  { n: 'Returning · Win-back',  s: 'Paused', v: '  156', c: ' 4.1%', r: '$ 6,820', roas: '1.4x', d: ' −8%' },
                ].map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{r.n}</td>
                    <td>
                      <Pill tone={r.s === 'Live' ? 'green' : r.s === 'Paused' ? 'cold' : undefined} dot={r.s === 'Live'}>{r.s}</Pill>
                    </td>
                    <td style={{ textAlign: 'right' }}>{r.v}</td>
                    <td style={{ textAlign: 'right' }}>{r.c}</td>
                    <td style={{ textAlign: 'right' }}>{r.r}</td>
                    <td style={{ textAlign: 'right', color: '#5DEFA5', fontWeight: 500 }}>{r.roas}</td>
                    <td className={r.d.includes('−') ? 'neg' : 'pos'} style={{ textAlign: 'right' }}>{r.d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function RevenueChart() {
  const W = 700, H = 220;
  const padL = 36, padR = 12, padT = 16, padB = 28;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const data = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({
      direct: 12 + ((i * 13) % 14) + i * 1.4,
      story:  6 + ((i * 7) % 8) + i * 0.4,
      comment: 4 + ((i * 5) % 6) + i * 0.3,
    })),
    [],
  );
  const totals = data.map((d) => d.direct + d.story + d.comment);
  const max = Math.max(...totals) * 1.1;
  const bw = (innerW / data.length) * 0.6;
  const gap = innerW / data.length;
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      {[0, 0.5, 1].map((p, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={padT + innerH * (1 - p)} y2={padT + innerH * (1 - p)} stroke="rgba(255,255,255,0.05)" />
          <text x={padL - 8} y={padT + innerH * (1 - p) + 4} textAnchor="end" fill="rgba(235,235,245,0.36)" fontSize="10">${Math.round(max * p)}k</text>
        </g>
      ))}
      {data.map((d, i) => {
        const x = padL + i * gap + (gap - bw) / 2;
        const total = d.direct + d.story + d.comment;
        const h = (total / max) * innerH;
        const y = padT + innerH - h;
        const hD = (d.direct / max) * innerH;
        const hS = (d.story / max) * innerH;
        const hC = (d.comment / max) * innerH;
        return (
          <g key={i}>
            <rect x={x} y={y + hS + hC} width={bw} height={hD} fill="#34E08A" rx="2" />
            <rect x={x} y={y + hC}      width={bw} height={hS} fill="#5AB0FF" rx="2" />
            <rect x={x} y={y}           width={bw} height={hC} fill="#FFB340" rx="2" />
            {i % 2 === 0 && (
              <text x={x + bw / 2} y={H - 8} textAnchor="middle" fill="rgba(235,235,245,0.36)" fontSize="10">W{i + 1}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function ChannelDonut() {
  const segs = [
    { v: 62, c: '#34E08A' },
    { v: 18, c: '#5AB0FF' },
    { v: 14, c: '#FFB340' },
    { v: 6,  c: '#DDA0FF' },
  ];
  const total = segs.reduce((a, b) => a + b.v, 0);
  let acc = 0;
  const R = 56, r = 38, cx = 80, cy = 80;
  const arcs = segs.map((s, i) => {
    const a0 = (acc / total) * Math.PI * 2 - Math.PI / 2;
    acc += s.v;
    const a1 = (acc / total) * Math.PI * 2 - Math.PI / 2;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
    const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
    const xi1 = cx + r * Math.cos(a1), yi1 = cy + r * Math.sin(a1);
    const xi0 = cx + r * Math.cos(a0), yi0 = cy + r * Math.sin(a0);
    return <path key={i} d={`M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${r} ${r} 0 ${large} 0 ${xi0} ${yi0} Z`} fill={s.c} />;
  });
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <svg width="160" height="160" viewBox="0 0 160 160">
        {arcs}
        <text x="80" y="76" textAnchor="middle" fontSize="22" fontWeight="600" fill="#fff" letterSpacing="-0.02em">62%</text>
        <text x="80" y="94" textAnchor="middle" fontSize="10" fill="rgba(235,235,245,0.5)">DM converts</text>
      </svg>
    </div>
  );
}

function BarChart({ values }: { values: number[] }) {
  const W = 220, H = 70;
  const max = Math.max(...values);
  const bw = (W / values.length) * 0.6;
  const gap = W / values.length;
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      {values.map((v, i) => {
        const h = (v / max) * (H - 6);
        return <rect key={i} x={i * gap + (gap - bw) / 2} y={H - h - 2} width={bw} height={h} rx="2" fill={i === values.length - 1 ? '#34E08A' : 'rgba(255,255,255,0.18)'} />;
      })}
    </svg>
  );
}
