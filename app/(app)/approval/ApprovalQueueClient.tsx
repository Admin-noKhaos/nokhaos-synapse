'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { I } from '@/lib/icons';
import { Avatar, Card, CardBody, Button, Pill } from '@/lib/primitives';

export type DraftRow = {
  id: string;
  text: string;
  sent_at: string;
  conversation_id: string;
  lead_name: string;
  lead_handle: string;
  lead_score: number;
  lead_sentiment: 'hot' | 'warm' | 'cold' | null;
  ai_notes: string | null;
  confidence: number;
};

export function ApprovalQueueClient({ drafts }: { drafts: DraftRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(drafts[0]?.id ?? null);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const draft = drafts.find((d) => d.id === selected) ?? drafts[0] ?? null;

  function getText(d: DraftRow) {
    return edited[d.id] ?? d.text;
  }

  async function approve(d: DraftRow) {
    setBusy(d.id); setError(null);
    try {
      const r = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: d.conversation_id, text: getText(d) }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.detail || data.error || `HTTP ${r.status}`);
        return;
      }
      // Remove the suggestion mark on the original draft message
      await fetch(`/api/approval/${d.id}/dismiss`, { method: 'POST' }).catch(() => null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function dismiss(d: DraftRow) {
    setBusy(d.id);
    try {
      await fetch(`/api/approval/${d.id}/dismiss`, { method: 'POST' });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="sx-page sx-fade-in">
      <style>{`
        .sx-page { padding: 24px 28px 60px; max-width: 1480px; margin: 0 auto; }
        .sx-page-hd { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom: 22px; gap: 24px; }
        .sx-aq-grid { display:grid; grid-template-columns: 1fr 1.4fr; gap: 16px; margin-top: 12px; align-items: flex-start; }
        .sx-aq-row { padding: 12px 16px; border-bottom: 0.5px solid var(--hairline); cursor: pointer; display: grid; grid-template-columns: 36px 1fr auto; gap: 10px; align-items: center; }
        .sx-aq-row:hover { background: rgba(255,255,255,0.03); }
        html[data-theme='light'] .sx-aq-row:hover { background: rgba(0,0,0,0.03); }
        .sx-aq-row.active { background: rgba(var(--accent-rgb), 0.06); }
        .sx-aq-name { font-size: 13px; font-weight: 600; }
        .sx-aq-snippet { font-size: 12px; color: var(--text-2); margin-top: 4px; line-height: 1.4; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sx-aq-edit { width: 100%; min-height: 100px; max-height: 240px; resize: vertical; padding: 12px 14px; border-radius: 10px; background: var(--surface-2); border: 0.5px solid var(--hairline); color: var(--text); font: inherit; font-size: 13px; line-height: 1.5; outline: 0; font-family: inherit; }
        .sx-aq-edit:focus { border-color: rgba(var(--accent-rgb), 0.5); }
        .empty { padding: 60px 24px; text-align: center; color: var(--text-3); }
        .empty h3 { font-size: 16px; font-weight: 600; color: var(--text); margin: 0 0 8px; }
        .err { background: rgba(255,69,58,0.12); border: 0.5px solid rgba(255,69,58,0.4); color: #FF6E63; padding: 8px 12px; border-radius: 8px; font-size: 12px; margin-bottom: 12px; }
        @media (max-width: 1100px){ .sx-aq-grid{grid-template-columns:1fr} }
      `}</style>

      <div className="sx-page-hd">
        <div>
          <h1 className="sx-page-h1">Approval Queue</h1>
          <p className="sx-page-sub">AI-drafted replies waiting for your review. Edit, approve, or dismiss.</p>
        </div>
        <Pill tone={drafts.length > 0 ? 'warm' : 'green'}>{drafts.length} pending</Pill>
      </div>

      {error && <div className="err">{error}</div>}

      {drafts.length === 0 ? (
        <Card>
          <CardBody>
            <div className="empty">
              <h3>You&rsquo;re all caught up</h3>
              <div>Nothing waiting for your review. AI-drafted replies appear here when a flow runs but auto-send is off.</div>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="sx-aq-grid">
          <Card>
            {drafts.map((d) => (
              <div key={d.id} className={'sx-aq-row' + (selected === d.id ? ' active' : '')} onClick={() => setSelected(d.id)}>
                <Avatar name={d.lead_name} size={36} />
                <div style={{ minWidth: 0 }}>
                  <div className="sx-aq-name">{d.lead_name}</div>
                  <div className="sx-aq-snippet">{d.text}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  {d.lead_sentiment && <Pill tone={d.lead_sentiment} dot>{d.lead_score}</Pill>}
                  <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{(d.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </Card>

          {draft && (
            <Card>
              <CardBody>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <Avatar name={draft.lead_name} size={40} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{draft.lead_name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{draft.lead_handle} · score {draft.lead_score}</div>
                  </div>
                  <Pill tone="green"><I.Sparkle size={11} /> AI draft</Pill>
                </div>

                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Drafted reply</div>
                <textarea
                  className="sx-aq-edit"
                  value={getText(draft)}
                  onChange={(e) => setEdited((p) => ({ ...p, [draft.id]: e.target.value }))}
                />
                {draft.ai_notes && (
                  <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--surface-2)', border: '0.5px solid var(--hairline)', borderRadius: 8 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--accent-light)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4, display: 'flex', gap: 5, alignItems: 'center' }}>
                      <I.Sparkle size={11} /> Why this reply
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{draft.ai_notes}</div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
                  <Button kind="ghost" size="sm" disabled={busy === draft.id} onClick={() => dismiss(draft)}>
                    <I.X size={13} /> Dismiss
                  </Button>
                  <Button kind="primary" size="sm" disabled={busy === draft.id} onClick={() => approve(draft)}>
                    <I.Send size={13} /> {busy === draft.id ? 'Sending…' : 'Approve & send'}
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
