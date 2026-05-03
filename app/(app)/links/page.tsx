'use client';

import { useEffect, useMemo, useState } from 'react';
import { I } from '@/lib/icons';
import { Card, CardHeader, CardBody, KPI, Pill, Button } from '@/lib/primitives';

const LINKS = [
  { id: 'l1', slug: 'syn.link/half-mar',     title: 'Half-Marathon Plan',   destination: 'Coaching · Tier 2 → Checkout', clicks: 2847, cvr: 11.4, revenue: '$8,210',  status: 'Live',   ai: true,  sources: [{ l: 'DM', v: 64 }, { l: 'Story', v: 21 }, { l: 'Bio', v: 11 }, { l: 'Comment', v: 4 }] },
  { id: 'l2', slug: 'syn.link/vegan-trial',  title: 'Vegan Protein · Trial', destination: 'Supplements · Trial → Cart',   clicks: 1932, cvr:  9.1, revenue: '$4,894',  status: 'Live',   ai: true,  sources: [{ l: 'DM', v: 58 }, { l: 'Story', v: 24 }, { l: 'Bio', v: 14 }, { l: 'Comment', v: 4 }] },
  { id: 'l3', slug: 'syn.link/cohort-aug',   title: 'Cohort · August',       destination: 'Cohort enrollment',             clicks: 1284, cvr: 14.8, revenue: '$28,800', status: 'Live',   ai: true,  sources: [{ l: 'DM', v: 71 }, { l: 'Story', v: 14 }, { l: 'Bio', v: 13 }, { l: 'Comment', v: 2 }] },
  { id: 'l4', slug: 'syn.link/eu-catalog',   title: 'EU Ceramics Catalog',   destination: 'Catalog (EU shipping)',         clicks:  642, cvr:  6.2, revenue: '$3,120',  status: 'Live',   ai: false, sources: [{ l: 'DM', v: 42 }, { l: 'Story', v: 34 }, { l: 'Bio', v: 20 }, { l: 'Comment', v: 4 }] },
  { id: 'l5', slug: 'syn.link/studio-beta',  title: 'Studio Beta Access',    destination: 'Beta signup → Notion',          clicks:  318, cvr: 22.0, revenue: '—',       status: 'Beta',   ai: true,  sources: [{ l: 'DM', v: 48 }, { l: 'Story', v: 18 }, { l: 'Bio', v: 30 }, { l: 'Comment', v: 4 }] },
  { id: 'l6', slug: 'syn.link/winback',      title: 'Win-back · 90 day',     destination: 'Returning customer offer',      clicks:  412, cvr:  4.1, revenue: '$682',    status: 'Paused', ai: true,  sources: [{ l: 'DM', v: 55 }, { l: 'Story', v: 25 }, { l: 'Bio', v: 16 }, { l: 'Comment', v: 4 }] },
];

export default function SmartLinksPage() {
  const [selected, setSelected] = useState(LINKS[0].id);
  const link = LINKS.find((l) => l.id === selected)!;
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setPulse((p) => p + 1), 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="sx-page sx-fade-in">
      <style>{`
        .sx-page { padding: 24px 28px 60px; max-width: 1480px; margin: 0 auto; }
        .sx-page-hd { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom: 22px; gap: 24px; }
        .sx-kpi-grid { display:grid; grid-template-columns:repeat(4, 1fr); gap: 12px; }
        .sx-sl-grid { display:grid; grid-template-columns: 1.55fr 1fr; gap: 12px; margin-top: 12px; }
        .sx-sl-row {
          display:grid; grid-template-columns: 1fr 90px 70px 100px 90px;
          gap: 12px; align-items:center;
          padding: 12px 14px;
          border-bottom: 0.5px solid var(--hairline);
          cursor: pointer;
          border-left: 2px solid transparent;
        }
        .sx-sl-row:last-child { border-bottom: 0; }
        .sx-sl-row:hover { background: rgba(255,255,255,0.03); }
        .sx-sl-row.active { background: rgba(52,224,138,0.05); border-left-color: var(--accent-1); }
        .sx-sl-title { font-size: 13px; font-weight: 600; display:flex; align-items:center; gap:6px; }
        .sx-sl-slug { font-family: var(--font-mono); font-size: 11px; color: var(--text-3); margin-top: 2px; display:flex; align-items:center; gap: 6px; }
        .sx-sl-num { font-variant-numeric: tabular-nums; text-align: right; font-size: 13px; }
        .sx-sl-cvr { color: #5DEFA5; }
        .sx-sl-qr {
          width: 124px; height: 124px;
          background: #fff;
          border-radius: 10px;
          padding: 10px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .sx-sl-live-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--accent-1);
          box-shadow: 0 0 8px var(--accent-1);
          animation: sx-pulse-glow 1.4s ease-in-out infinite;
        }
        .sx-sl-source-row { display:flex; align-items:center; gap:10px; padding: 7px 0; border-bottom: 0.5px solid var(--hairline); font-size: 12.5px; }
        .sx-sl-source-row:last-child { border-bottom: 0; }
        .sx-sl-source-bar { flex:1; height:5px; border-radius: 3px; background: rgba(255,255,255,0.06); overflow: hidden; }
        .sx-sl-source-bar > div { height: 100%; border-radius: 3px; background: var(--grad-accent); }
        .sx-sl-rule {
          display:flex; align-items:flex-start; gap:10px;
          padding: 10px 12px;
          border-radius: 10px;
          background: rgba(255,255,255,0.03);
          border: 0.5px solid var(--hairline);
          margin-bottom: 6px;
          font-size: 12.5px;
        }
        .sx-sl-rule-icon {
          width: 24px; height: 24px; border-radius: 6px;
          background: rgba(52,224,138,0.14); color: #5DEFA5;
          display:flex; align-items:center; justify-content:center; flex-shrink:0;
        }
        .sx-sl-rule code {
          font-family: var(--font-mono);
          background: rgba(52,224,138,0.10);
          color: #5DEFA5;
          padding: 1px 5px;
          border-radius: 3px;
          font-size: 11px;
        }
        @media (max-width: 1200px){ .sx-kpi-grid{grid-template-columns:repeat(2,1fr)} .sx-sl-grid{grid-template-columns:1fr} }
      `}</style>

      <div className="sx-page-hd">
        <div>
          <h1 className="sx-page-h1">Smart Links</h1>
          <p className="sx-page-sub">Short links that adapt destination by visitor profile, intent, and funnel stage.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button kind="default" size="sm" icon={<I.Filter size={14} />}>All</Button>
          <Button kind="primary" size="sm" icon={<I.Plus size={14} />}>New link</Button>
        </div>
      </div>

      <div className="sx-kpi-grid">
        {[
          { label: 'Active Links', value: '18',                delta: '+4',     dir: 'up' as const, sub: 'across 6 funnels' },
          { label: 'Clicks · 24h', value: '7,435',             delta: '+24%',   dir: 'up' as const, sub: 'vs. yesterday' },
          { label: 'Avg. CVR',     value: '10.8', unit: '%',   delta: '+1.6pt', dir: 'up' as const, sub: 'across all links' },
          { label: 'AI-Routed',    value: '92',   unit: '%',   delta: '+5pt',   dir: 'up' as const, sub: 'of total clicks' },
        ].map((k, i) => (
          <Card key={i}>
            <CardBody style={{ padding: '18px' }}>
              <KPI {...k} deltaDir={k.dir} />
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="sx-sl-grid">
        <Card>
          <CardHeader
            title="Links"
            sub={`${LINKS.length} configured`}
            right={
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, color: 'var(--text-3)' }}>
                <span className="sx-sl-live-dot" /> Live counter
              </div>
            }
          />
          <CardBody style={{ padding: '4px 0 0' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 90px 70px 100px 90px',
              gap: 12, padding: '8px 14px',
              fontSize: 10.5, fontWeight: 600, color: 'var(--text-3)',
              letterSpacing: '0.04em', textTransform: 'uppercase',
              borderBottom: '0.5px solid var(--hairline)',
            }}>
              <div>Link</div>
              <div style={{ textAlign: 'right' }}>Clicks</div>
              <div style={{ textAlign: 'right' }}>CVR</div>
              <div style={{ textAlign: 'right' }}>Revenue</div>
              <div style={{ textAlign: 'right' }}>Status</div>
            </div>
            {LINKS.map((l) => {
              const live = l.id === selected;
              const liveBoost = live ? pulse : 0;
              return (
                <div key={l.id} className={'sx-sl-row' + (selected === l.id ? ' active' : '')} onClick={() => setSelected(l.id)}>
                  <div style={{ minWidth: 0 }}>
                    <div className="sx-sl-title">
                      {l.title}
                      {l.ai && <Pill tone="green" style={{ fontSize: 10, height: 18, padding: '0 6px' }}><I.Sparkle size={9} /> AI</Pill>}
                    </div>
                    <div className="sx-sl-slug"><I.Link size={11} /> {l.slug}</div>
                  </div>
                  <div className="sx-sl-num">
                    {(l.clicks + liveBoost).toLocaleString()}
                    {live && <span className="sx-sl-live-dot" style={{ display: 'inline-block', marginLeft: 6, verticalAlign: 'middle' }} />}
                  </div>
                  <div className="sx-sl-num sx-sl-cvr">{l.cvr}%</div>
                  <div className="sx-sl-num">{l.revenue}</div>
                  <div style={{ textAlign: 'right' }}>
                    <Pill tone={l.status === 'Live' ? 'green' : l.status === 'Paused' ? 'cold' : undefined} dot={l.status === 'Live'}>{l.status}</Pill>
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={link.title} sub={link.destination} right={<Pill tone="green" dot>{link.status}</Pill>} />
          <CardBody>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
              <div className="sx-sl-qr"><FakeQR /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Short link</div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 13,
                  background: 'var(--surface-2)', border: '0.5px solid var(--hairline)',
                  borderRadius: 8, padding: '8px 10px',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.slug}</span>
                  <Button kind="ghost" size="sm">Copy</Button>
                </div>
                <div style={{ display: 'flex', gap: 14, marginTop: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Clicks · 24h</div>
                    <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{link.clicks.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>CVR</div>
                    <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: '#5DEFA5' }}>{link.cvr}%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Revenue</div>
                    <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>{link.revenue}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sx-section-title">AI routing</div>
            <div style={{ marginTop: 8, marginBottom: 14 }}>
              <div className="sx-sl-rule">
                <div className="sx-sl-rule-icon"><I.Branch size={12} /></div>
                <div>If profile matches <code>Half-Marathon Hopefuls</code> → send to <code>/plan/half-mar</code></div>
              </div>
              <div className="sx-sl-rule">
                <div className="sx-sl-rule-icon"><I.Globe size={12} /></div>
                <div>If region <code>EU</code> → use localized checkout</div>
              </div>
              <div className="sx-sl-rule">
                <div className="sx-sl-rule-icon"><I.Sparkle size={12} /></div>
                <div>If lead score &gt; <code>80</code> → skip nurture, jump to checkout</div>
              </div>
              <div className="sx-sl-rule" style={{ borderStyle: 'dashed', cursor: 'pointer', color: 'var(--text-3)' }}>
                <div className="sx-sl-rule-icon"><I.Plus size={12} /></div>
                <div>Add routing rule</div>
              </div>
            </div>

            <div className="sx-section-title">Click sources</div>
            <div style={{ marginTop: 8 }}>
              {link.sources.map((s) => (
                <div key={s.l} className="sx-sl-source-row">
                  <span style={{ flex: '0 0 80px' }}>{s.l}</span>
                  <div className="sx-sl-source-bar"><div style={{ width: `${s.v}%` }} /></div>
                  <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-2)', flex: '0 0 36px', textAlign: 'right' }}>{s.v}%</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function FakeQR() {
  const N = 17;
  const cells = useMemo(() => {
    const grid: number[][] = [];
    let seed = 7;
    const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let y = 0; y < N; y++) {
      const row: number[] = [];
      for (let x = 0; x < N; x++) row.push(rand() > 0.5 ? 1 : 0);
      grid.push(row);
    }
    const stamp = (gx: number, gy: number) => {
      for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
        const onBorder = x === 0 || x === 6 || y === 0 || y === 6;
        const onCenter = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        grid[gy + y][gx + x] = onBorder || onCenter ? 1 : 0;
      }
    };
    stamp(0, 0); stamp(N - 7, 0); stamp(0, N - 7);
    return grid;
  }, []);
  const size = 100;
  const cs = size / N;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {cells.flatMap((row, y) =>
        row.map((v, x) => (v ? <rect key={`${x}-${y}`} x={x * cs} y={y * cs} width={cs} height={cs} fill="#000" /> : null)),
      )}
    </svg>
  );
}
