'use client';

import { useState } from 'react';
import { I } from '@/lib/icons';
import { Button, Pill } from '@/lib/primitives';

type Node = {
  id: string;
  x: number;
  y: number;
  kind: 'trigger' | 'ai' | 'condition' | 'action';
  title: string;
  sub: string;
  meta: string;
};

const NODES: Node[] = [
  { id: 'n1', x:  60, y: 100, kind: 'trigger',   title: 'New DM received',         sub: 'Trigger', meta: 'Instagram · @atelier.maud' },
  { id: 'n2', x: 300, y:  40, kind: 'ai',        title: 'Classify intent',         sub: 'AI · classify', meta: 'Outputs: purchase · objection · question · spam' },
  { id: 'n3', x: 580, y:   0, kind: 'condition', title: 'If intent = purchase',    sub: 'Branch', meta: '94% confidence threshold' },
  { id: 'n4', x: 580, y: 130, kind: 'condition', title: 'If intent = objection',   sub: 'Branch', meta: 'Detects: price · diet · shipping' },
  { id: 'n5', x: 860, y:   0, kind: 'action',    title: 'Send funnel link',        sub: 'Action', meta: 'Auto-personalized · Tier 2' },
  { id: 'n6', x: 860, y: 130, kind: 'ai',        title: 'Counter objection',       sub: 'AI · reply', meta: 'Brand voice · Atelier Maud' },
  { id: 'n7', x: 580, y: 260, kind: 'condition', title: 'Else',                    sub: 'Fallback', meta: 'Hand to human after 3 turns' },
  { id: 'n8', x: 860, y: 260, kind: 'action',    title: 'Tag + notify',            sub: 'Action', meta: 'Slack #cs-priority' },
];

const EDGES: [string, string][] = [
  ['n1', 'n2'], ['n2', 'n3'], ['n2', 'n4'], ['n2', 'n7'],
  ['n3', 'n5'], ['n4', 'n6'], ['n7', 'n8'],
];

export default function FlowBuilderPage() {
  const [selected, setSelected] = useState('n2');
  const sel = NODES.find((n) => n.id === selected)!;
  return (
    <div className="sx-fb sx-fade-in">
      <style>{`
        .sx-fb { display:grid; grid-template-columns: 240px 1fr 280px; height: calc(100vh - 56px); }
        .sx-fb-left, .sx-fb-right {
          border-right: 0.5px solid var(--hairline);
          background: rgba(10,10,12,0.5);
          backdrop-filter: blur(20px);
          padding: 18px 16px;
          overflow-y: auto;
        }
        .sx-fb-right { border-right: 0; border-left: 0.5px solid var(--hairline); }
        .sx-fb-canvas {
          position: relative; overflow: auto;
          background:
            radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0) 0 0 / 24px 24px,
            #07070a;
        }
        .sx-fb-node {
          position: absolute;
          width: 220px;
          background: rgba(23,23,27,0.92);
          backdrop-filter: blur(20px);
          border: 0.5px solid var(--hairline);
          border-radius: 12px;
          padding: 12px 13px;
          cursor: pointer;
          transition: border-color 120ms var(--ease), transform 120ms var(--ease), box-shadow 120ms var(--ease);
          z-index: 2;
        }
        .sx-fb-node:hover { border-color: rgba(255,255,255,0.18); }
        .sx-fb-node.selected {
          border-color: rgba(52,224,138,0.6);
          box-shadow: 0 0 0 3px rgba(52,224,138,0.10), 0 12px 32px rgba(0,0,0,0.5);
        }
        .sx-fb-node-hd { display:flex; align-items:center; gap:8px; margin-bottom: 6px; }
        .sx-fb-node-icon {
          width: 22px; height: 22px; border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .sx-fb-node-icon.trigger   { background: rgba(255,159,10,0.16);  color: #FFB340; }
        .sx-fb-node-icon.ai        { background: rgba(52,224,138,0.16);  color: #5DEFA5; }
        .sx-fb-node-icon.condition { background: rgba(10,132,255,0.16);  color: #5AB0FF; }
        .sx-fb-node-icon.action    { background: rgba(191, 90, 242, 0.16); color: #DDA0FF; }
        .sx-fb-node-kind {
          font-size: 10px; font-weight: 600;
          color: var(--text-3); letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .sx-fb-node-title { font-size: 12.5px; font-weight: 600; }
        .sx-fb-node-meta { font-size: 11px; color: var(--text-3); margin-top: 4px; line-height: 1.4; }
        .sx-fb-port {
          position: absolute; right: -5px; top: 50%; transform: translateY(-50%);
          width: 10px; height: 10px; border-radius: 50%;
          background: var(--surface-3);
          border: 1.5px solid rgba(52,224,138,0.6);
        }
        .sx-fb-palette-item {
          display: flex; align-items: center; gap: 9px;
          padding: 8px 10px;
          border-radius: 8px;
          background: rgba(255,255,255,0.03);
          border: 0.5px solid var(--hairline);
          margin-bottom: 6px;
          cursor: grab;
          font-size: 12px;
          transition: background 120ms;
        }
        .sx-fb-palette-item:hover { background: rgba(255,255,255,0.07); }
        .sx-fb-prop-row { padding: 10px 0; border-bottom: 0.5px solid var(--hairline); }
        .sx-fb-prop-row:last-child { border-bottom: 0; }
        .sx-fb-prop-label { font-size: 11px; color: var(--text-3); margin-bottom: 6px; font-weight: 500; }
        .sx-fb-prop-value { font-size: 12.5px; }
      `}</style>

      <div className="sx-fb-left">
        <div className="sx-section-title">Triggers</div>
        {[
          { i: <I.Inbox size={14}/>, l: 'New DM received',       c: '#FFB340' },
          { i: <I.Heart size={14}/>, l: 'Story reply',           c: '#FFB340' },
          { i: <I.Reply size={14}/>, l: 'Comment with keyword',  c: '#FFB340' },
        ].map((p, i) => (
          <div key={i} className="sx-fb-palette-item">
            <span style={{ color: p.c }}>{p.i}</span><span>{p.l}</span>
          </div>
        ))}
        <div className="sx-section-title" style={{ marginTop: 14 }}>AI</div>
        {[
          { i: <I.Brain size={14}/>,   l: 'Classify intent' },
          { i: <I.Sparkle size={14}/>, l: 'Score lead' },
          { i: <I.Reply size={14}/>,   l: 'Generate reply' },
          { i: <I.Tag size={14}/>,     l: 'Auto-tag' },
        ].map((p, i) => (
          <div key={i} className="sx-fb-palette-item">
            <span style={{ color: '#5DEFA5' }}>{p.i}</span><span>{p.l}</span>
          </div>
        ))}
        <div className="sx-section-title" style={{ marginTop: 14 }}>Logic</div>
        {[
          { i: <I.Branch size={14}/>, l: 'If / else branch' },
          { i: <I.Filter size={14}/>, l: 'Filter' },
          { i: <I.Bolt size={14}/>,   l: 'Wait / delay' },
        ].map((p, i) => (
          <div key={i} className="sx-fb-palette-item">
            <span style={{ color: '#5AB0FF' }}>{p.i}</span><span>{p.l}</span>
          </div>
        ))}
        <div className="sx-section-title" style={{ marginTop: 14 }}>Actions</div>
        {[
          { i: <I.Send size={14}/>, l: 'Send DM' },
          { i: <I.Link size={14}/>, l: 'Send funnel link' },
          { i: <I.Bell size={14}/>, l: 'Notify human' },
        ].map((p, i) => (
          <div key={i} className="sx-fb-palette-item">
            <span style={{ color: '#DDA0FF' }}>{p.i}</span><span>{p.l}</span>
          </div>
        ))}
      </div>

      <div className="sx-fb-canvas">
        <div style={{
          position: 'sticky', top: 0, zIndex: 5,
          padding: '10px 14px',
          background: 'rgba(7,7,10,0.65)',
          backdropFilter: 'blur(20px)',
          borderBottom: '0.5px solid var(--hairline)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Coaching · Tier 2 Funnel</div>
          <Pill tone="green" dot>Live</Pill>
          <Pill>v 4.2</Pill>
          <div style={{ flex: 1 }} />
          <Button kind="ghost" size="sm" icon={<I.Play size={13} />}>Test</Button>
          <Button kind="default" size="sm">Save draft</Button>
          <Button kind="primary" size="sm">Publish</Button>
        </div>

        <div style={{ position: 'relative', width: 1200, height: 480, padding: 24 }}>
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
            <defs>
              <linearGradient id="fb-edge" x1="0" x2="1">
                <stop offset="0" stopColor="rgba(77,255,158,0.5)" />
                <stop offset="1" stopColor="rgba(77,255,158,0.2)" />
              </linearGradient>
              <marker id="fb-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0 0 L6 3 L0 6 Z" fill="rgba(77,255,158,0.4)" />
              </marker>
            </defs>
            {EDGES.map(([a, b], i) => {
              const A = NODES.find((n) => n.id === a);
              const B = NODES.find((n) => n.id === b);
              if (!A || !B) return null;
              const x1 = A.x + 220 + 24, y1 = A.y + 30 + 24;
              const x2 = B.x + 24, y2 = B.y + 30 + 24;
              const cx = (x1 + x2) / 2;
              const path = `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
              return (
                <g key={i}>
                  <path d={path} fill="none" stroke="url(#fb-edge)" strokeWidth="1.5" markerEnd="url(#fb-arrow)" />
                  <circle r="2" fill="#4DFF9E">
                    <animateMotion dur={2 + i * 0.4 + 's'} repeatCount="indefinite" path={path} />
                  </circle>
                </g>
              );
            })}
          </svg>
          {NODES.map((n) => (
            <div
              key={n.id}
              className={'sx-fb-node' + (selected === n.id ? ' selected' : '')}
              style={{ left: n.x + 24, top: n.y + 24 }}
              onClick={() => setSelected(n.id)}
            >
              <div className="sx-fb-node-hd">
                <div className={'sx-fb-node-icon ' + n.kind}>
                  {n.kind === 'trigger'   && <I.Bolt    size={12} />}
                  {n.kind === 'ai'        && <I.Sparkle size={12} />}
                  {n.kind === 'condition' && <I.Branch  size={12} />}
                  {n.kind === 'action'    && <I.Send    size={12} />}
                </div>
                <div className="sx-fb-node-kind">{n.sub}</div>
              </div>
              <div className="sx-fb-node-title">{n.title}</div>
              <div className="sx-fb-node-meta">{n.meta}</div>
              <div className="sx-fb-port" />
            </div>
          ))}
        </div>
      </div>

      <div className="sx-fb-right">
        <div className="sx-section-title">Selected node</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div className={'sx-fb-node-icon ' + sel.kind} style={{ width: 32, height: 32, borderRadius: 8 }}>
            {sel.kind === 'ai'        && <I.Sparkle size={16} />}
            {sel.kind === 'trigger'   && <I.Bolt    size={16} />}
            {sel.kind === 'condition' && <I.Branch  size={16} />}
            {sel.kind === 'action'    && <I.Send    size={16} />}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{sel.title}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{sel.sub}</div>
          </div>
        </div>

        <div className="sx-fb-prop-row">
          <div className="sx-fb-prop-label">Model</div>
          <div className="sx-fb-prop-value">claude-sonnet-4-6</div>
        </div>
        <div className="sx-fb-prop-row">
          <div className="sx-fb-prop-label">Confidence threshold</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input className="sx-input" defaultValue="0.94" style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>min</span>
          </div>
        </div>
        <div className="sx-fb-prop-row">
          <div className="sx-fb-prop-label">Output classes</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
            {['purchase', 'objection', 'question', 'spam'].map((c) => (
              <Pill key={c} tone="green">{c}</Pill>
            ))}
          </div>
        </div>
        <div className="sx-fb-prop-row">
          <div className="sx-fb-prop-label">Brand voice</div>
          <div className="sx-fb-prop-value">Atelier Maud · Warm, direct</div>
        </div>
        <div className="sx-fb-prop-row">
          <div className="sx-fb-prop-label">Last 24h</div>
          <div style={{ display: 'flex', gap: 14, marginTop: 4 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>342</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>classified</div>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: '#5DEFA5' }}>96.1%</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>accuracy</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, display: 'flex', gap: 6 }}>
          <Button kind="default" size="sm" style={{ flex: 1 }}>Test node</Button>
          <Button kind="ghost" size="sm" icon={<I.More size={14} />} />
        </div>
      </div>
    </div>
  );
}
