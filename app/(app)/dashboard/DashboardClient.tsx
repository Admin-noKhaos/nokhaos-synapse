'use client';

import { useMemo } from 'react';
import { I } from '@/lib/icons';
import { Card, CardHeader, CardBody, KPI, Pill, Button } from '@/lib/primitives';
import type { DashboardKpis } from '@/lib/data/queries';

export function DashboardClient({ data, orgName, balanceUsd }: { data: DashboardKpis; orgName: string; balanceUsd: number }) {
  const totalReplies = data.msgs_24h_in + data.msgs_24h_out;
  const replyRate = data.msgs_24h_in > 0 ? Math.min(100, (data.msgs_24h_out / data.msgs_24h_in) * 100) : 0;

  const kpis = [
    { label: 'Active Conversations', value: data.active_conversations.toLocaleString(), sub: 'open threads', delta: '', dir: 'flat' as const },
    { label: 'Messages · 24h', value: totalReplies.toLocaleString(), sub: `${data.msgs_24h_in} in · ${data.msgs_24h_out} out`, delta: '', dir: 'flat' as const },
    { label: 'Avg. Lead Score', value: data.avg_lead_score ? data.avg_lead_score.toFixed(1) : '—', sub: `${data.total_leads} total leads`, delta: '', dir: 'flat' as const },
    { label: 'Credits', value: '$' + balanceUsd.toFixed(2), sub: 'usable AI calls', delta: '', dir: 'flat' as const },
  ];

  const empty = data.active_conversations === 0 && totalReplies === 0 && data.total_leads === 0;

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
          align-items: center; gap: 12px; padding: 8px 0;
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
        .sx-suggest-icon { width: 28px; height: 28px; border-radius: 7px; background: rgba(52,224,138,0.10); color: var(--accent-1); display:flex; align-items:center; justify-content:center; flex-shrink: 0; }
        .sx-suggest-text { font-size: 12.5px; line-height: 1.4; color: var(--text); }
        .sx-suggest-meta { font-size: 11px; color: var(--text-3); margin-top: 2px; }
        .empty-card { padding: 24px; text-align: center; color: var(--text-3); font-size: 12.5px; }
        @media (max-width: 1200px){ .sx-kpi-grid{grid-template-columns:repeat(2,1fr)} .sx-hero-grid{grid-template-columns:1fr} .sx-row-grid{grid-template-columns:1fr 1fr} }
      `}</style>

      <div className="sx-page-hd">
        <div>
          <h1 className="sx-page-h1">Neural</h1>
          <p className="sx-page-sub">
            {empty ? (
              <>No activity yet. Connect Instagram and start receiving DMs to populate this view.</>
            ) : (
              <>Synapse is handling <span style={{ color: 'var(--accent-1)' }}>{data.active_conversations.toLocaleString()} active conversations</span> for {orgName}.</>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button kind="default" size="sm" icon={<I.Filter size={14} />}>Last 24h</Button>
          <Button kind="primary" size="sm" icon={<I.Plus size={14} />}>New flow</Button>
        </div>
      </div>

      <div className="sx-kpi-grid">
        {kpis.map((k, i) => (
          <Card key={i}>
            <CardBody style={{ padding: '18px' }}>
              <KPI label={k.label} value={k.value} sub={k.sub} />
              <div style={{ marginTop: 12 }}>
                <Sparkline accent={i === 0 || i === 3} data={i === 1 ? data.hourly_activity : undefined} />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="sx-hero-grid">
        <Card>
          <CardHeader
            title="Conversation Velocity"
            sub="Inbound + outbound · last 24h, hourly"
            right={
              <div style={{ display: 'flex', gap: 6 }}>
                <Pill tone="green" dot>Live</Pill>
                <Button kind="ghost" size="sm" icon={<I.More size={14} />} />
              </div>
            }
          />
          <CardBody>
            {totalReplies === 0 ? (
              <div className="empty-card">No messages in the last 24 hours.</div>
            ) : (
              <ActivityChart data={data.hourly_activity} />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Neural Map" sub="AI-assisted conversations active" right={<Pill tone="green" dot>Active</Pill>} />
          <CardBody style={{ padding: 0 }}>
            <NeuralGraph nodeCount={Math.min(15, Math.max(5, data.total_leads))} />
          </CardBody>
        </Card>
      </div>

      <div className="sx-row-grid">
        <Card>
          <CardHeader title="Funnel Velocity" sub="Leads grouped by funnel" right={<Button kind="ghost" size="sm">View all</Button>} />
          <CardBody>
            {data.funnels.length === 0 ? (
              <div className="empty-card">No funnel labels assigned yet.</div>
            ) : data.funnels.map((f) => {
              const max = Math.max(...data.funnels.map((x) => x.value));
              return (
                <div key={f.name} className="sx-funnel-row">
                  <div>
                    <div className="sx-funnel-name">{f.name}</div>
                    <div className="sx-funnel-bar" style={{ marginTop: 6 }}>
                      <div className="sx-funnel-bar-fill" style={{ width: `${(f.value / max) * 100}%` }} />
                    </div>
                  </div>
                  <div className="sx-funnel-num">{f.value}</div>
                  <div className="sx-funnel-conv">{f.conv.toFixed(1)}%</div>
                </div>
              );
            })}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Next Best Actions" sub="Highest-score leads" right={<Pill tone="green">{data.next_actions.length} items</Pill>} />
          <CardBody>
            {data.next_actions.length === 0 ? (
              <div className="empty-card">As leads come in, the highest-score ones will surface here.</div>
            ) : data.next_actions.map((s) => (
              <div key={s.id} className="sx-suggest-item">
                <div className="sx-suggest-icon"><I.Sparkle size={14} /></div>
                <div style={{ flex: 1 }}>
                  <div className="sx-suggest-text">{s.text}</div>
                  <div className="sx-suggest-meta">{s.meta}</div>
                </div>
                <Button kind="ghost" size="sm" icon={<I.ArrowRight size={14} />} />
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Reply Rate · 24h" sub="Outbound / inbound ratio" right={<Button kind="ghost" size="sm" icon={<I.More size={14} />} />} />
          <CardBody>
            {data.msgs_24h_in === 0 ? (
              <div className="empty-card">No inbound DMs in 24h.</div>
            ) : (
              <div style={{ paddingTop: 8 }}>
                <div style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                  {replyRate.toFixed(0)}<span style={{ fontSize: 18, color: 'var(--text-3)', marginLeft: 2 }}>%</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                  {data.msgs_24h_out.toLocaleString()} replies sent / {data.msgs_24h_in.toLocaleString()} inbound
                </div>
                <div style={{ marginTop: 18, height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, replyRate)}%`, background: 'var(--grad-accent)' }} />
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

// ─── Inline charts (kept simple — same look as the prototype) ───────────────

function Sparkline({ accent, data }: { accent?: boolean; data?: number[] }) {
  const points = useMemo(() => {
    if (data && data.length === 24 && data.some((v) => v > 0)) return data;
    // tiny synthetic curve so empty cards still look alive
    return Array.from({ length: 24 }, (_, i) => 8 + 4 * Math.sin(i * 0.5) + 2 * Math.cos(i * 0.3));
  }, [data]);
  const W = 220, H = 40;
  const max = Math.max(...points, 1);
  const min = Math.min(...points);
  const norm = (v: number) => H - ((v - min) / Math.max(1, max - min)) * H;
  const path = points.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i / (points.length - 1)) * W} ${norm(v)}`).join(' ');
  const fill = `${path} L ${W} ${H} L 0 ${H} Z`;
  const color = accent ? '#34E08A' : 'rgba(255,255,255,0.55)';
  const gid = 'spark-' + (accent ? 'a' : 'b');
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
  const max = Math.max(...data, 1) * 1.15;
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
          <text x={padL - 8} y={padT + innerH * (1 - p) + 4} textAnchor="end" fill="rgba(235,235,245,0.36)" fontSize="10">{Math.round(max * p)}</text>
        </g>
      ))}
      {ticks.map((h) => {
        const label = `${(((new Date().getHours() - 23 + h + 24) % 24)).toString().padStart(2, '0')}:00`;
        return (
          <text key={h} x={xAt(h)} y={H - 8} textAnchor="middle" fill="rgba(235,235,245,0.36)" fontSize="10">{label}</text>
        );
      })}
      <path d={area} fill="url(#actFill)" />
      <path d={line} fill="none" stroke="url(#actLine)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx={xAt(data.length - 1)} cy={yAt(data[data.length - 1])} r="4" fill="#4DFF9E" stroke="#001a0d" strokeWidth="1.5" />
    </svg>
  );
}

function NeuralGraph({ nodeCount }: { nodeCount: number }) {
  const W = 480, H = 360;
  const cx = W / 2, cy = H / 2;
  const layers = [
    { count: 1, r: 0 },
    { count: Math.min(5, Math.max(3, Math.ceil(nodeCount / 3))), r: 70 },
    { count: nodeCount, r: 140 },
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
  l2.forEach((n, i) => edges.push([l1[i % l1.length], n]));
  return (
    <div style={{ position: 'relative', width: '100%', height: H, overflow: 'hidden', borderRadius: '0 0 14px 14px' }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="ng-glow" cx="50%" cy="50%">
            <stop offset="0" stopColor="#34E08A" stopOpacity="0.22" />
            <stop offset="1" stopColor="#34E08A" stopOpacity="0" />
          </radialGradient>
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
          const fill = n.layer === 0 ? '#34E08A' : n.layer === 1 ? '#34E08A' : 'rgba(255,255,255,0.6)';
          return (
            <g key={i}>
              {n.layer === 0 ? (
                <>
                  <circle cx={n.x} cy={n.y} r="22" fill="none" stroke="rgba(52,224,138,0.4)">
                    <animate attributeName="r" from="14" to="34" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={n.x} cy={n.y} r={r} fill={fill} style={{ filter: 'drop-shadow(0 0 12px rgba(52,224,138,0.7))' }} />
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
