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
  type FlowGraph, type FlowNode, type FlowEdge, type FlowButton,
  defaultNode, newId,
} from '@/lib/flow/types';

const PALETTE = [
  { kind: 'trigger', items: [
    { type: 'new_dm', label: 'New DM', icon: <I.Inbox size={14} />, color: '#FFB340' },
    { type: 'comment_keyword', label: 'Comment with keyword', icon: <I.Reply size={14} />, color: '#FFB340' },
    { type: 'button_click', label: 'Button tapped', icon: <I.Bolt size={14} />, color: '#FFB340' },
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
    { type: 'if_first_contact', label: 'If first message', icon: <I.Branch size={14} />, color: '#5AB0FF' },
    { type: 'if_returning', label: 'If returning lead', icon: <I.Branch size={14} />, color: '#5AB0FF' },
    { type: 'else', label: 'Else', icon: <I.Branch size={14} />, color: '#5AB0FF' },
  ]},
  { kind: 'action', items: [
    { type: 'send_dm', label: 'Send DM', icon: <I.Send size={14} />, color: '#DDA0FF' },
    { type: 'send_buttons', label: 'Send DM with buttons', icon: <I.Bolt size={14} />, color: '#DDA0FF' },
    { type: 'reply_comment', label: 'Reply to comment', icon: <I.Reply size={14} />, color: '#DDA0FF' },
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
      {pendingEdge && <Pill tone="warm">drop on a node to connect · esc to cancel</Pill>}
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
  // Live cursor position (in canvas coords) while drag-connecting; used to draw
  // the temporary preview line from the source port to the cursor.
  const [edgeDragXY, setEdgeDragXY] = useState<{ x: number; y: number } | null>(null);

  function onNodePointerDown(e: React.PointerEvent, id: string) {
    if (e.button !== 0) return;
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    target.setPointerCapture(e.pointerId);
    dragRef.current = { id, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
    onSelect(id);
  }
  function onNodePointerMove(e: React.PointerEvent) {
    if (!dragRef.current || !ref.current) return;
    const canvasRect = ref.current.getBoundingClientRect();
    const x = e.clientX - canvasRect.left + ref.current.scrollLeft - dragRef.current.offsetX;
    const y = e.clientY - canvasRect.top + ref.current.scrollTop - dragRef.current.offsetY;
    onMove(dragRef.current.id, { x: Math.max(0, x), y: Math.max(0, y) });
  }
  function onNodePointerUp(e: React.PointerEvent) {
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

  // ── Drag-to-connect: pointerdown on the port, drag onto another node, release.
  function onPortPointerDown(e: React.PointerEvent, sourceId: string) {
    e.stopPropagation();
    e.preventDefault();
    if (e.button !== 0) return;
    onStartEdge(sourceId);
    // Track cursor in canvas coords
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setEdgeDragXY({
        x: e.clientX - r.left + ref.current.scrollLeft,
        y: e.clientY - r.top + ref.current.scrollTop,
      });
    }
    // Capture pointer to keep events flowing during the drag, even off-port.
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPortPointerMove(e: React.PointerEvent) {
    if (!pendingEdgeFrom || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setEdgeDragXY({
      x: e.clientX - r.left + ref.current.scrollLeft,
      y: e.clientY - r.top + ref.current.scrollTop,
    });
  }
  function onPortPointerUp(e: React.PointerEvent) {
    if (!pendingEdgeFrom) return;
    // Find a node under the release point.
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    let target: HTMLElement | null = el;
    while (target && !target.dataset.nodeId) target = target.parentElement;
    if (target?.dataset.nodeId && target.dataset.nodeId !== pendingEdgeFrom) {
      onCompleteEdge(target.dataset.nodeId);
    } else {
      onStartEdge(pendingEdgeFrom); // toggle off (clears pendingEdgeFrom)
    }
    setEdgeDragXY(null);
    if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
  }

  // Escape key cancels a pending edge drag.
  useEffect(() => {
    if (!pendingEdgeFrom) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        onStartEdge(pendingEdgeFrom);
        setEdgeDragXY(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pendingEdgeFrom, onStartEdge]);

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
          {/* In-progress edge preview while dragging from a port */}
          {pendingEdgeFrom && edgeDragXY && (() => {
            const src = graph.nodes.find((n) => n.id === pendingEdgeFrom);
            if (!src) return null;
            const x1 = src.position.x + NODE_W;
            const y1 = src.position.y + 30;
            const x2 = edgeDragXY.x;
            const y2 = edgeDragXY.y;
            const cx = (x1 + x2) / 2;
            const path = `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
            return (
              <path d={path} fill="none" stroke="rgba(255,159,10,0.8)" strokeWidth="2" strokeDasharray="4 4" />
            );
          })()}
        </svg>

        {/* Nodes */}
        {graph.nodes.map((n) => {
          const colorByKind = { trigger: '#FFB340', ai: '#5DEFA5', condition: '#5AB0FF', action: '#DDA0FF' }[n.kind];
          const isSelected = selectedId === n.id;
          const isPendingFrom = pendingEdgeFrom === n.id;
          return (
            <div
              key={n.id}
              data-node-id={n.id}
              onPointerDown={(e) => onNodePointerDown(e, n.id)}
              onPointerMove={onNodePointerMove}
              onPointerUp={onNodePointerUp}
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

              {/* Connect-out port — drag onto another node to wire them */}
              <div
                role="button"
                aria-label="Drag to connect"
                title="Drag to another node to connect"
                onPointerDown={(e) => onPortPointerDown(e, n.id)}
                onPointerMove={onPortPointerMove}
                onPointerUp={onPortPointerUp}
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute', right: -14, top: '50%', transform: 'translateY(-50%)',
                  width: 28, height: 28, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: pendingEdgeFrom ? 'crosshair' : 'pointer',
                  zIndex: 4,
                  touchAction: 'none',
                }}
              >
                <div
                  style={{
                    width: isPendingFrom ? 18 : 14,
                    height: isPendingFrom ? 18 : 14,
                    borderRadius: '50%',
                    background: isPendingFrom ? '#FFB340' : 'rgba(52,224,138,0.18)',
                    border: '2px solid ' + (isPendingFrom ? '#FFB340' : 'rgba(52,224,138,0.7)'),
                    transition: 'all 120ms var(--ease)',
                    boxShadow: isPendingFrom ? '0 0 12px rgba(255,159,10,0.6)' : 'none',
                  }}
                />
              </div>
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
    if (n.type === 'comment_keyword') {
      const m = (n.config.media as string) ?? 'any';
      const scope = m === 'reel' ? ' (reels)' : m === 'post' ? ' (posts)' : '';
      return (n.config.contains ? `comment contains "${n.config.contains}"` : 'any comment') + scope;
    }
    if (n.type === 'button_click') return n.config.payload ? `button payload = ${n.config.payload}` : 'any button tap';
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
    if (n.type === 'if_first_contact') return 'lead’s first ever message';
    if (n.type === 'if_returning') return 'lead has messaged before';
    return 'fallback';
  }
  if (n.kind === 'action') {
    if (n.type === 'send_dm') {
      const vs = (n.config.variants ?? []) as string[];
      if (vs.length) return `${vs.length} message${vs.length > 1 ? 's' : ''} (rotates)`;
      return n.config.text ? '"' + n.config.text.slice(0, 60) + (n.config.text.length > 60 ? '…' : '') + '"' : 'use AI-generated text';
    }
    if (n.type === 'reply_comment') {
      const vs = (n.config.variants ?? []) as string[];
      return vs.length ? `${vs.length} public repl${vs.length > 1 ? 'ies' : 'y'} (rotates)` : 'no replies set';
    }
    if (n.type === 'send_buttons') {
      const btns = (n.config.buttons ?? []) as FlowButton[];
      return btns.length ? `buttons: ${btns.map((b) => b.title).join(', ')}` : 'no buttons set';
    }
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

      {node.kind === 'trigger' && (node.type === 'comment_keyword' || node.type === 'story_reply') && (
        <Field label="Keywords (comma-separated)">
          <input className="sx-input" placeholder="e.g. START, VIDEO, TRAINING" value={node.config.contains ?? ''}
                 onChange={(e) => patch({ contains: e.target.value })} />
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.5 }}>
            {node.type === 'comment_keyword'
              ? 'Fires when a comment on a post or reel contains any of these words.'
              : 'Fires when a story reply contains any of these words.'}
            {' '}Case-insensitive. Separate multiple with commas. Leave blank to match all.
          </div>
        </Field>
      )}

      {node.kind === 'trigger' && node.type === 'comment_keyword' && (
        <Field label="Media type">
          <select className="sx-input" value={(node.config.media as string) ?? 'any'} onChange={(e) => patch({ media: e.target.value })}>
            <option value="any">Posts and reels</option>
            <option value="post">Posts only</option>
            <option value="reel">Reels only</option>
          </select>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.5 }}>
            Split posts vs reels into separate triggers if you want to send a different link for each.
          </div>
        </Field>
      )}

      {node.kind === 'trigger' && node.type === 'button_click' && (
        <Field label="Button payload">
          <input className="sx-input" placeholder="e.g. SEND_LINK" value={node.config.payload ?? ''}
                 onChange={(e) => patch({ payload: e.target.value })} />
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.5 }}>
            Fires when the lead taps a button carrying this payload. Match it to the payload set on a “Send DM with buttons” action upstream.
          </div>
        </Field>
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
          <Field label="Master doc">
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--surface-2)', border: '0.5px solid var(--hairline)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={node.config.use_master_doc !== false}
                onChange={(e) => patch({ use_master_doc: e.target.checked })}
                style={{ marginTop: 2 }}
              />
              <span style={{ fontSize: 12, lineHeight: 1.5 }}>
                <span style={{ fontWeight: 600 }}>Include master doc</span>
                <span style={{ display: 'block', color: 'var(--text-3)', fontSize: 11, marginTop: 2 }}>
                  Your full brand context (voice, products, FAQs, do&apos;s &amp; don&apos;ts) injected into this reply&apos;s system prompt. Recommended.
                </span>
              </span>
            </label>
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
        <>
          <Field label="Message variations (rotate, up to 5)">
            <VariantsEditor
              variants={(node.config.variants ?? []) as string[]}
              onChange={(variants) => patch({ variants })}
              placeholder="Hey! Here's your link 👇"
              max={5}
            />
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8, lineHeight: 1.5 }}>
              Add 2 or more and the bot rotates randomly each send (looks natural, avoids spam flags). Leave empty to use the single reply text below.
            </div>
          </Field>
          <Field label="Reply text (used if no variations, blank = AI-generated)">
            <textarea className="sx-input" style={{ height: 80, paddingTop: 8 }} placeholder="Hi {{name}}! …"
                      value={node.config.text ?? ''} onChange={(e) => patch({ text: e.target.value })} />
          </Field>
        </>
      )}
      {node.kind === 'action' && node.type === 'reply_comment' && (
        <Field label="Public reply variations (rotate, up to 5)">
          <VariantsEditor
            variants={(node.config.variants ?? []) as string[]}
            onChange={(variants) => patch({ variants })}
            placeholder="Just sent it to your DMs!"
            max={5}
          />
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8, lineHeight: 1.5 }}>
            Posts a public reply on the comment (one variation chosen at random). If the commenter doesn’t follow the account, “(check your message requests)” is added automatically so they find the DM.
          </div>
        </Field>
      )}
      {node.kind === 'action' && node.type === 'send_buttons' && (
        <>
          <Field label="Message text">
            <textarea className="sx-input" style={{ height: 90, paddingTop: 8 }} placeholder="Click below and I'll send you the link."
                      value={node.config.text ?? ''} onChange={(e) => patch({ text: e.target.value })} />
          </Field>
          <Field label="Buttons">
            <ButtonsEditor
              buttons={(node.config.buttons ?? []) as FlowButton[]}
              onChange={(buttons) => patch({ buttons })}
            />
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8, lineHeight: 1.5 }}>
              Each button shows as a tappable reply. Tapping it sends the label back as the lead’s message and fires a “Button tapped” trigger with the payload.
            </div>
          </Field>
        </>
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

// Auto-derive a stable payload from a button label (e.g. "Send Link" → "SEND_LINK").
function payloadFromTitle(title: string): string {
  return title.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'BUTTON';
}

function VariantsEditor({ variants, onChange, placeholder, max = 5 }: { variants: string[]; onChange: (v: string[]) => void; placeholder?: string; max?: number }) {
  function update(i: number, value: string) {
    onChange(variants.map((v, idx) => (idx === i ? value : v)));
  }
  function remove(i: number) {
    onChange(variants.filter((_, idx) => idx !== i));
  }
  function add() {
    if (variants.length >= max) return;
    onChange([...variants, '']);
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {variants.map((v, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 600, marginTop: 9, width: 16, flexShrink: 0 }}>{i + 1}</span>
          <textarea className="sx-input" style={{ height: 54, paddingTop: 8, flex: 1 }} placeholder={placeholder}
                    value={v} onChange={(e) => update(i, e.target.value)} />
          <button onClick={() => remove(i)} title="Remove" style={{ background: 'transparent', border: 0, color: 'var(--text-3)', cursor: 'pointer', padding: 2, marginTop: 7 }}>
            <I.X size={12} />
          </button>
        </div>
      ))}
      {variants.length < max && (
        <Button kind="default" size="sm" onClick={add} style={{ justifyContent: 'center' }}>
          <I.Plus size={12} /> Add variation ({variants.length}/{max})
        </Button>
      )}
    </div>
  );
}

function ButtonsEditor({ buttons, onChange }: { buttons: FlowButton[]; onChange: (b: FlowButton[]) => void }) {
  function update(i: number, patch: Partial<FlowButton>) {
    onChange(buttons.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }
  function remove(i: number) {
    onChange(buttons.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...buttons, { title: 'Send Link', payload: 'SEND_LINK' }]);
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {buttons.map((b, i) => (
        <div key={i} style={{ border: '0.5px solid var(--hairline)', borderRadius: 8, padding: 10, background: 'var(--surface-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.04em' }}>BUTTON {i + 1}</span>
            <div style={{ flex: 1 }} />
            <button onClick={() => remove(i)} title="Remove button"
                    style={{ background: 'transparent', border: 0, color: 'var(--text-3)', cursor: 'pointer', padding: 2 }}>
              <I.X size={12} />
            </button>
          </div>
          <input className="sx-input" placeholder="Label, e.g. Send Link" value={b.title}
                 onChange={(e) => {
                   const title = e.target.value;
                   // Keep payload in sync until the user customises it away from the auto value.
                   const autoPrev = payloadFromTitle(b.title);
                   const keepAuto = !b.payload || b.payload === autoPrev;
                   update(i, keepAuto ? { title, payload: payloadFromTitle(title) } : { title });
                 }} />
          <input className="sx-input" style={{ marginTop: 6 }} placeholder="Payload, e.g. SEND_LINK" value={b.payload}
                 onChange={(e) => update(i, { payload: e.target.value })} />
        </div>
      ))}
      <Button kind="default" size="sm" onClick={add} style={{ justifyContent: 'center' }}>
        <I.Plus size={12} /> Add button
      </Button>
    </div>
  );
}
