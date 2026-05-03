'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { I } from '@/lib/icons';
import { Button, Pill } from '@/lib/primitives';
import {
  type Automation, type AutomationSummary,
} from '@/lib/data/automations';
import {
  type FlowGraph, type FlowNode, type FlowEdge,
  defaultNode, newId,
} from '@/lib/flow/types';

const PALETTE = [
  { kind: 'trigger', items: [
    { type: 'new_dm', label: 'New DM', icon: <I.Inbox size={14} />, color: '#FFB340' },
    { type: 'comment_keyword', label: 'Comment with keyword', icon: <I.Reply size={14} />, color: '#FFB340' },
    { type: 'story_reply', label: 'Story reply', icon: <I.Heart size={14} />, color: '#FFB340' },
  ]},
  { kind: 'ai', items: [
    { type: 'classify_intent', label: 'Classify intent', icon: <I.Brain size={14} />, color: '#5DEFA5' },
    { type: 'generate_reply', label: 'Generate reply', icon: <I.Sparkle size={14} />, color: '#5DEFA5' },
    { type: 'score_lead', label: 'Score lead', icon: <I.Sparkle size={14} />, color: '#5DEFA5' },
    { type: 'tag', label: 'Auto-tag', icon: <I.Tag size={14} />, color: '#5DEFA5' },
  ]},
  { kind: 'condition', items: [
    { type: 'if_intent', label: 'If intent =', icon: <I.Branch size={14} />, color: '#5AB0FF' },
    { type: 'if_score_gt', label: 'If lead score >', icon: <I.Branch size={14} />, color: '#5AB0FF' },
    { type: 'if_contains', label: 'If text contains', icon: <I.Filter size={14} />, color: '#5AB0FF' },
    { type: 'else', label: 'Else', icon: <I.Branch size={14} />, color: '#5AB0FF' },
  ]},
  { kind: 'action', items: [
    { type: 'send_dm', label: 'Send DM', icon: <I.Send size={14} />, color: '#DDA0FF' },
    { type: 'send_link', label: 'Send funnel link', icon: <I.Link size={14} />, color: '#DDA0FF' },
    { type: 'add_tag', label: 'Tag lead', icon: <I.Tag size={14} />, color: '#DDA0FF' },
    { type: 'handoff_human', label: 'Notify human', icon: <I.Bell size={14} />, color: '#DDA0FF' },
  ]},
] as const;

const NODE_W = 220;
const NODE_H = 60; // approximate; used for edge anchors

export function FlowEditor({ list, selected }: { list: AutomationSummary[]; selected: Automation | null }) {
  if (!selected) {
    return <FlowList list={list} selectedId={null} />;
  }
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)' }}>
      <FlowList list={list} selectedId={selected.id} />
      <FlowCanvasContainer key={selected.id} automation={selected} />
    </div>
  );
}

function FlowList({ list, selectedId }: { list: AutomationSummary[]; selectedId: string | null }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function createNew(template: 'auto_reply' | 'blank') {
    setCreating(true);
    const r = await fetch('/api/automations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template, name: template === 'auto_reply' ? 'Auto-reply to DMs' : 'Untitled flow' }),
    });
    const d = await r.json();
    setCreating(false);
    if (r.ok) {
      router.push(`/flow?id=${d.id}`);
      router.refresh();
    }
  }

  return (
    <aside style={{
      width: 240, flexShrink: 0,
      borderRight: '0.5px solid var(--hairline)',
      background: 'rgba(10,10,12,0.5)',
      backdropFilter: 'blur(20px)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 14px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Flows</div>
        <Button kind="ghost" size="sm" icon={<I.Plus size={13} />} disabled={creating} onClick={() => createNew('blank')} />
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {list.map((a) => (
          <Link
            key={a.id}
            href={`/flow?id=${a.id}`}
            style={{
              display: 'block', textDecoration: 'none', color: 'inherit',
              padding: '10px 14px',
              borderBottom: '0.5px solid var(--hairline)',
              background: a.id === selectedId ? 'rgba(52,224,138,0.06)' : 'transparent',
              borderLeft: a.id === selectedId ? '2px solid var(--accent-1)' : '2px solid transparent',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
              <Pill tone={a.status === 'live' ? 'green' : a.status === 'paused' ? 'cold' : undefined} dot={a.status === 'live'}>{a.status}</Pill>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{a.node_count} nodes · v{a.version}</div>
          </Link>
        ))}
      </div>
    </aside>
  );
}

function FlowCanvasContainer({ automation }: { automation: Automation }) {
  const router = useRouter();
  const [name, setName] = useState(automation.name);
  const [graph, setGraph] = useState<FlowGraph>(automation.graph);
  const [selectedId, setSelectedId] = useState<string | null>(graph.nodes[0]?.id ?? null);
  const [status, setStatus] = useState(automation.status);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingEdgeFrom, setPendingEdgeFrom] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mark dirty when graph or name changes
  useEffect(() => { setDirty(true); }, [graph]);

  const updateNode = useCallback((id: string, updater: (n: FlowNode) => FlowNode) => {
    setGraph((g) => ({ ...g, nodes: g.nodes.map((n) => (n.id === id ? updater(n) : n)) }));
  }, []);

  const deleteNode = useCallback((id: string) => {
    setGraph((g) => ({
      nodes: g.nodes.filter((n) => n.id !== id),
      edges: g.edges.filter((e) => e.source !== id && e.target !== id),
    }));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

  const addNodeOfType = useCallback((kind: string, type: string) => {
    const node = defaultNode(kind as 'trigger' | 'ai' | 'condition' | 'action', type, { x: 100, y: 100 });
    setGraph((g) => ({ ...g, nodes: [...g.nodes, node] }));
    setSelectedId(node.id);
  }, []);

  const startEdge = useCallback((nodeId: string) => {
    setPendingEdgeFrom((cur) => (cur === nodeId ? null : nodeId));
  }, []);

  const completeEdge = useCallback((targetId: string) => {
    if (!pendingEdgeFrom || pendingEdgeFrom === targetId) {
      setPendingEdgeFrom(null);
      return;
    }
    setGraph((g) => {
      // Avoid duplicates
      const exists = g.edges.some((e) => e.source === pendingEdgeFrom && e.target === targetId);
      if (exists) return g;
      const edge: FlowEdge = { id: newId('e'), source: pendingEdgeFrom, target: targetId };
      return { ...g, edges: [...g.edges, edge] };
    });
    setPendingEdgeFrom(null);
  }, [pendingEdgeFrom]);

  const deleteEdge = useCallback((id: string) => {
    setGraph((g) => ({ ...g, edges: g.edges.filter((e) => e.id !== id) }));
  }, []);

  async function save(opts: { publish?: boolean; pause?: boolean } = {}) {
    setSaving(true);
    setError(null);
    try {
      const r1 = await fetch(`/api/automations/${automation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, graph }),
      });
      if (!r1.ok) {
        const d = await r1.json();
        setError(d.detail || d.error || `HTTP ${r1.status}`);
        return;
      }
      if (opts.publish || opts.pause) {
        const newStatus = opts.publish ? 'live' : 'paused';
        const r2 = await fetch(`/api/automations/${automation.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!r2.ok) {
          const d = await r2.json();
          setError(d.detail || d.error || `HTTP ${r2.status}`);
          return;
        }
        setStatus(newStatus);
      }
      setDirty(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  const selected = graph.nodes.find((n) => n.id === selectedId) ?? null;

  return (
    <main style={{ flex: 1, display: 'grid', gridTemplateColumns: '220px 1fr 280px', overflow: 'hidden' }}>
      {/* Top bar (full width via absolute trick) — we'll just put it in the canvas column header */}
      <Palette onPick={addNodeOfType} />

      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        <Topbar
          name={name} setName={(v) => { setName(v); setDirty(true); }}
          status={status}
          dirty={dirty}
          saving={saving}
          onSave={() => save()}
          onPublish={() => save({ publish: true })}
          onPause={() => save({ pause: true })}
          error={error}
          pendingEdge={!!pendingEdgeFrom}
        />
        <Canvas
          graph={graph}
          selectedId={selectedId}
          pendingEdgeFrom={pendingEdgeFrom}
          onSelect={setSelectedId}
          onMove={(id, pos) => updateNode(id, (n) => ({ ...n, position: pos }) as FlowNode)}
          onStartEdge={startEdge}
          onCompleteEdge={completeEdge}
          onDeleteEdge={deleteEdge}
          onDeleteNode={deleteNode}
        />
      </div>

      <Properties node={selected} onUpdate={updateNode} onDelete={selected ? () => deleteNode(selected.id) : undefined} />
    </main>
  );
}

// ─── Palette ─────────────────────────────────────────────────────────────────

function Palette({ onPick }: { onPick: (kind: string, type: string) => void }) {
  return (
    <aside style={{
      borderRight: '0.5px solid var(--hairline)',
      background: 'rgba(10,10,12,0.5)',
      backdropFilter: 'blur(20px)',
      padding: '14px 14px 24px',
      overflowY: 'auto',
    }}>
      {PALETTE.map((section) => (
        <div key={section.kind} style={{ marginBottom: 14 }}>
          <div className="sx-section-title" style={{ marginBottom: 6 }}>{section.kind}</div>
          {section.items.map((p) => (
            <div
              key={p.type}
              onClick={() => onPick(section.kind, p.type)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 9px',
                borderRadius: 7,
                background: 'rgba(255,255,255,0.03)',
                border: '0.5px solid var(--hairline)',
                marginBottom: 5,
                cursor: 'pointer',
                fontSize: 11.5,
                userSelect: 'none',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            >
              <span style={{ color: p.color }}>{p.icon}</span>
              <span>{p.label}</span>
            </div>
          ))}
        </div>
      ))}
    </aside>
  );
}

// ─── Topbar ──────────────────────────────────────────────────────────────────

function Topbar({
  name, setName, status, dirty, saving, onSave, onPublish, onPause, error, pendingEdge,
}: {
  name: string; setName: (v: string) => void;
  status: 'draft' | 'live' | 'paused';
  dirty: boolean; saving: boolean;
  onSave: () => void; onPublish: () => void; onPause: () => void;
  error: string | null;
  pendingEdge: boolean;
}) {
  return (
    <div style={{
      padding: '10px 14px',
      background: 'rgba(7,7,10,0.65)',
      backdropFilter: 'blur(20px)',
      borderBottom: '0.5px solid var(--hairline)',
      display: 'flex', alignItems: 'center', gap: 12,
      flexShrink: 0,
    }}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{
          background: 'transparent', border: 0, outline: 0,
          color: 'var(--text)', fontSize: 14, fontWeight: 600,
          minWidth: 200, fontFamily: 'inherit',
        }}
      />
      <Pill tone={status === 'live' ? 'green' : status === 'paused' ? 'cold' : undefined} dot={status === 'live'}>{status}</Pill>
      {pendingEdge && <Pill tone="warm">click target node to connect</Pill>}
      {error && <span style={{ fontSize: 11, color: '#FF6E63' }}>{error}</span>}
      <div style={{ flex: 1 }} />
      <Button kind="default" size="sm" disabled={saving || !dirty} onClick={onSave}>
        {dirty ? (saving ? 'Saving…' : 'Save draft') : 'Saved'}
      </Button>
      {status === 'live' ? (
        <Button kind="default" size="sm" disabled={saving} onClick={onPause}><I.Pause size={12} /> Pause</Button>
      ) : (
        <Button kind="primary" size="sm" disabled={saving} onClick={onPublish}><I.Play size={12} /> Publish</Button>
      )}
    </div>
  );
}

// ─── Canvas ──────────────────────────────────────────────────────────────────

function Canvas({
  graph, selectedId, pendingEdgeFrom,
  onSelect, onMove, onStartEdge, onCompleteEdge, onDeleteEdge, onDeleteNode,
}: {
  graph: FlowGraph;
  selectedId: string | null;
  pendingEdgeFrom: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, pos: { x: number; y: number }) => void;
  onStartEdge: (id: string) => void;
  onCompleteEdge: (id: string) => void;
  onDeleteEdge: (id: string) => void;
  onDeleteNode: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  function onPointerDown(e: React.PointerEvent, id: string) {
    if (e.button !== 0) return;
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    target.setPointerCapture(e.pointerId);
    dragRef.current = { id, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
    onSelect(id);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current || !ref.current) return;
    const canvasRect = ref.current.getBoundingClientRect();
    const x = e.clientX - canvasRect.left + ref.current.scrollLeft - dragRef.current.offsetX;
    const y = e.clientY - canvasRect.top + ref.current.scrollTop - dragRef.current.offsetY;
    onMove(dragRef.current.id, { x: Math.max(0, x), y: Math.max(0, y) });
  }
  function onPointerUp(e: React.PointerEvent) {
    const target = e.currentTarget as HTMLElement;
    if (target.hasPointerCapture(e.pointerId)) target.releasePointerCapture(e.pointerId);
    dragRef.current = null;
  }

  function clickNode(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (pendingEdgeFrom && pendingEdgeFrom !== id) {
      onCompleteEdge(id);
      return;
    }
    onSelect(id);
  }

  // Compute canvas bounds from node positions
  const maxX = Math.max(1200, ...graph.nodes.map((n) => n.position.x + NODE_W + 80));
  const maxY = Math.max(500, ...graph.nodes.map((n) => n.position.y + NODE_H + 80));

  return (
    <div
      ref={ref}
      onClick={() => onSelect(null)}
      style={{
        flex: 1, position: 'relative', overflow: 'auto',
        background: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0) 0 0 / 24px 24px, #07070a',
        cursor: pendingEdgeFrom ? 'crosshair' : 'default',
      }}
    >
      <div style={{ position: 'relative', width: maxX, height: maxY }}>
        {/* Edges */}
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
          {graph.edges.map((e) => {
            const A = graph.nodes.find((n) => n.id === e.source);
            const B = graph.nodes.find((n) => n.id === e.target);
            if (!A || !B) return null;
            const x1 = A.position.x + NODE_W;
            const y1 = A.position.y + 30;
            const x2 = B.position.x;
            const y2 = B.position.y + 30;
            const cx = (x1 + x2) / 2;
            const path = `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
            return (
              <g key={e.id}>
                <path d={path} fill="none" stroke="url(#fb-edge)" strokeWidth="1.5" markerEnd="url(#fb-arrow)" />
                <path
                  d={path}
                  fill="none" stroke="transparent" strokeWidth="14"
                  style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                  onClick={(ev) => { ev.stopPropagation(); onDeleteEdge(e.id); }}
                />
                <circle r="2" fill="#4DFF9E">
                  <animateMotion dur="2s" repeatCount="indefinite" path={path} />
                </circle>
              </g>
            );
          })}
        </svg>

        {/* Nodes */}
        {graph.nodes.map((n) => {
          const colorByKind = { trigger: '#FFB340', ai: '#5DEFA5', condition: '#5AB0FF', action: '#DDA0FF' }[n.kind];
          const isSelected = selectedId === n.id;
          const isPendingFrom = pendingEdgeFrom === n.id;
          return (
            <div
              key={n.id}
              onPointerDown={(e) => onPointerDown(e, n.id)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onClick={(e) => clickNode(e, n.id)}
              style={{
                position: 'absolute',
                left: n.position.x, top: n.position.y,
                width: NODE_W,
                background: 'rgba(23,23,27,0.92)',
                backdropFilter: 'blur(20px)',
                border: '0.5px solid ' + (isSelected ? 'rgba(52,224,138,0.6)' : isPendingFrom ? 'rgba(255,159,10,0.6)' : 'var(--hairline)'),
                borderRadius: 12,
                padding: '12px 13px',
                cursor: 'grab',
                touchAction: 'none',
                zIndex: 2,
                boxShadow: isSelected ? '0 0 0 3px rgba(52,224,138,0.10), 0 12px 32px rgba(0,0,0,0.5)' : 'none',
                userSelect: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 6,
                  background: `${colorByKind}26`, color: colorByKind,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {n.kind === 'trigger' && <I.Bolt size={12} />}
                  {n.kind === 'ai' && <I.Sparkle size={12} />}
                  {n.kind === 'condition' && <I.Branch size={12} />}
                  {n.kind === 'action' && <I.Send size={12} />}
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', flex: 1 }}>{n.kind}</div>
                {isSelected && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteNode(n.id); }}
                    title="Delete node"
                    style={{ background: 'transparent', border: 0, color: 'var(--text-3)', cursor: 'pointer', padding: 2 }}
                  >
                    <I.X size={12} />
                  </button>
                )}
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>{n.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{summarize(n)}</div>

              {/* Connect-out port */}
              <button
                onClick={(e) => { e.stopPropagation(); onStartEdge(n.id); }}
                title="Drag to connect"
                style={{
                  position: 'absolute', right: -7, top: '50%', transform: 'translateY(-50%)',
                  width: 14, height: 14, borderRadius: 7,
                  background: isPendingFrom ? '#FFB340' : 'var(--surface-3)',
                  border: '1.5px solid ' + (isPendingFrom ? '#FFB340' : 'rgba(52,224,138,0.6)'),
                  cursor: 'pointer', padding: 0, zIndex: 3,
                }}
              />
            </div>
          );
        })}

        {graph.nodes.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 13 }}>
            Pick a node from the left to get started.
          </div>
        )}
      </div>
    </div>
  );
}

function summarize(n: FlowNode): string {
  if (n.kind === 'trigger') {
    if (n.type === 'new_dm') return n.config.contains ? `text contains "${n.config.contains}"` : 'matches every inbound DM';
    return n.label;
  }
  if (n.kind === 'ai') {
    if (n.type === 'classify_intent') return `classes: ${(n.config.classes ?? []).join(', ') || '—'}`;
    if (n.type === 'generate_reply') return n.config.goal ?? 'reply concisely';
    return n.label;
  }
  if (n.kind === 'condition') {
    if (n.type === 'if_intent') return `intent = ${n.config.intent ?? '?'}`;
    if (n.type === 'if_score_gt') return `score > ${n.config.threshold ?? '?'}`;
    if (n.type === 'if_contains') return `text contains "${n.config.contains ?? ''}"`;
    return 'fallback';
  }
  if (n.kind === 'action') {
    if (n.type === 'send_dm') return n.config.text ? '"' + n.config.text.slice(0, 60) + (n.config.text.length > 60 ? '…' : '') + '"' : 'use AI-generated text';
    if (n.type === 'add_tag') return `tag: ${n.config.tag ?? '—'}`;
    if (n.type === 'send_link') return `slug: ${n.config.link_slug ?? '—'}`;
    if (n.type === 'handoff_human') return n.config.notify ?? 'mark for human review';
    return n.label;
  }
  return '';
}

// ─── Properties panel ────────────────────────────────────────────────────────

function Properties({
  node, onUpdate, onDelete,
}: {
  node: FlowNode | null;
  onUpdate: (id: string, updater: (n: FlowNode) => FlowNode) => void;
  onDelete?: () => void;
}) {
  if (!node) {
    return (
      <aside style={{
        borderLeft: '0.5px solid var(--hairline)',
        background: 'rgba(10,10,12,0.5)',
        backdropFilter: 'blur(20px)',
        padding: '18px 16px',
        overflowY: 'auto',
      }}>
        <div className="sx-section-title">Properties</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 14 }}>
          Select a node to edit its config. Click a node's right port (the small green circle), then click another node, to connect them.
        </div>
      </aside>
    );
  }

  function patch<P extends Record<string, unknown>>(p: P) {
    onUpdate(node!.id, (n) => ({ ...n, config: { ...n.config, ...p } } as FlowNode));
  }

  return (
    <aside style={{
      borderLeft: '0.5px solid var(--hairline)',
      background: 'rgba(10,10,12,0.5)',
      backdropFilter: 'blur(20px)',
      padding: '18px 16px',
      overflowY: 'auto',
    }}>
      <div className="sx-section-title">Selected node</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0 18px' }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{node.label}</div>
        <Pill>{node.kind}</Pill>
      </div>

      <Field label="Label">
        <input className="sx-input" value={node.label} onChange={(e) => onUpdate(node.id, (n) => ({ ...n, label: e.target.value }) as FlowNode)} />
      </Field>

      {node.kind === 'trigger' && node.type === 'new_dm' && (
        <>
          <Field label="Contains (optional)">
            <input className="sx-input" placeholder="any keyword e.g. 'plan'" value={node.config.contains ?? ''}
                   onChange={(e) => patch({ contains: e.target.value })} />
          </Field>
          <Field label="From handles (comma-separated, optional)">
            <input className="sx-input" placeholder="@maeve.runs, @julianwest" value={node.config.from_handles ?? ''}
                   onChange={(e) => patch({ from_handles: e.target.value })} />
          </Field>
        </>
      )}

      {node.kind === 'ai' && node.type === 'classify_intent' && (
        <>
          <Field label="Confidence threshold (0-1)">
            <input className="sx-input" type="number" min={0} max={1} step={0.05} value={node.config.confidence ?? 0.85}
                   onChange={(e) => patch({ confidence: Number(e.target.value) })} />
          </Field>
          <Field label="Output classes (comma-separated)">
            <input className="sx-input" value={(node.config.classes ?? []).join(', ')}
                   onChange={(e) => patch({ classes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
          </Field>
        </>
      )}
      {node.kind === 'ai' && node.type === 'generate_reply' && (
        <>
          <Field label="Goal">
            <textarea className="sx-input" style={{ height: 70, paddingTop: 8 }} value={node.config.goal ?? ''}
                      onChange={(e) => patch({ goal: e.target.value })} />
          </Field>
          <Field label="Voice">
            <input className="sx-input" placeholder="warm, direct, no fluff" value={node.config.voice ?? ''}
                   onChange={(e) => patch({ voice: e.target.value })} />
          </Field>
          <Field label="Extra system prompt (optional)">
            <textarea className="sx-input" style={{ height: 60, paddingTop: 8 }} value={node.config.system_prompt ?? ''}
                      onChange={(e) => patch({ system_prompt: e.target.value })} />
          </Field>
        </>
      )}

      {node.kind === 'condition' && node.type === 'if_intent' && (
        <Field label="Match intent">
          <input className="sx-input" value={node.config.intent ?? ''} onChange={(e) => patch({ intent: e.target.value })} />
        </Field>
      )}
      {node.kind === 'condition' && node.type === 'if_score_gt' && (
        <Field label="Score threshold (0-100)">
          <input className="sx-input" type="number" min={0} max={100} value={node.config.threshold ?? 70}
                 onChange={(e) => patch({ threshold: Number(e.target.value) })} />
        </Field>
      )}
      {node.kind === 'condition' && node.type === 'if_contains' && (
        <Field label="Text contains">
          <input className="sx-input" value={node.config.contains ?? ''} onChange={(e) => patch({ contains: e.target.value })} />
        </Field>
      )}

      {node.kind === 'action' && node.type === 'send_dm' && (
        <Field label="Reply text (leave blank to use AI-generated)">
          <textarea className="sx-input" style={{ height: 100, paddingTop: 8 }} placeholder="Hi {{name}}! …"
                    value={node.config.text ?? ''} onChange={(e) => patch({ text: e.target.value })} />
        </Field>
      )}
      {node.kind === 'action' && node.type === 'send_link' && (
        <Field label="Smart link slug">
          <input className="sx-input" placeholder="syn.link/half-mar" value={node.config.link_slug ?? ''}
                 onChange={(e) => patch({ link_slug: e.target.value })} />
        </Field>
      )}
      {node.kind === 'action' && node.type === 'add_tag' && (
        <Field label="Tag value">
          <input className="sx-input" placeholder="interested" value={node.config.tag ?? ''}
                 onChange={(e) => patch({ tag: e.target.value })} />
        </Field>
      )}
      {node.kind === 'action' && node.type === 'set_funnel' && (
        <Field label="Funnel name">
          <input className="sx-input" placeholder="Coaching · Tier 2" value={node.config.funnel ?? ''}
                 onChange={(e) => patch({ funnel: e.target.value })} />
        </Field>
      )}
      {node.kind === 'action' && node.type === 'handoff_human' && (
        <Field label="Notify (Slack channel / email)">
          <input className="sx-input" placeholder="#cs-priority" value={node.config.notify ?? ''}
                 onChange={(e) => patch({ notify: e.target.value })} />
        </Field>
      )}

      {onDelete && (
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: '0.5px solid var(--hairline)' }}>
          <Button kind="ghost" size="sm" onClick={onDelete}>
            <I.X size={12} /> Delete node
          </Button>
        </div>
      )}
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '10px 0', borderBottom: '0.5px solid var(--hairline)' }}>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6, fontWeight: 500 }}>{label}</div>
      {children}
    </div>
  );
}
