'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { I } from '@/lib/icons';
import { Button, Pill, Avatar } from '@/lib/primitives';

type Msg = { role: 'user' | 'assistant'; content: string };
type Suggestion = { rationale: string; patch: string };

export function Playground({ orgName, initialBrain }: { orgName: string; initialBrain: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [brain, setBrain] = useState(initialBrain);
  const [applyBusy, setApplyBusy] = useState(false);
  const [applyToast, setApplyToast] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll the chat to the bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  async function send() {
    const text = draft.trim();
    if (!text || busy) return;
    setError(null);
    setSuggestion(null);
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setDraft('');
    setBusy(true);
    try {
      const r = await fetch('/api/ai/playground', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const d = await r.json();
      if (!r.ok) {
        if (d.error === 'insufficient_credits') {
          setError('Out of credits — top up in Settings.');
        } else {
          setError(d.detail || d.error || `HTTP ${r.status}`);
        }
        return;
      }
      setMessages([...next, { role: 'assistant', content: d.reply }]);
      if (d.suggestion) setSuggestion(d.suggestion);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function applySuggestion() {
    if (!suggestion) return;
    setApplyBusy(true);
    try {
      const newBrain = (brain.trim() ? brain.trim() + '\n\n' : '') + suggestion.patch.trim() + '\n';
      const r = await fetch('/api/brain', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brain_md: newBrain }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setError(d.detail || d.error || 'Save failed');
        return;
      }
      setBrain(newBrain);
      setSuggestion(null);
      setApplyToast('Added to master doc');
      setTimeout(() => setApplyToast(null), 2200);
    } finally {
      setApplyBusy(false);
    }
  }

  function reset() {
    setMessages([]);
    setSuggestion(null);
    setError(null);
  }

  return (
    <div className="pg sx-fade-in">
      <style>{`
        .pg { display: grid; grid-template-columns: 1fr 360px; height: calc(100vh - 56px); }
        .pg-main { display: flex; flex-direction: column; overflow: hidden; }
        .pg-side {
          border-left: 0.5px solid var(--hairline);
          background: rgba(10,10,12,0.5);
          backdrop-filter: blur(20px);
          padding: 18px 16px;
          overflow-y: auto;
        }
        .pg-hd {
          padding: 14px 20px;
          border-bottom: 0.5px solid var(--hairline);
          background: rgba(10,10,12,0.55); backdrop-filter: blur(20px);
          display: flex; align-items: center; gap: 12px; flex-shrink: 0;
        }
        .pg-bd { flex: 1; overflow-y: auto; padding: 28px 32px 16px; display: flex; flex-direction: column; gap: 14px; }
        .pg-msg { max-width: 70%; padding: 10px 14px; border-radius: 18px; font-size: 13.5px; line-height: 1.5; white-space: pre-wrap; }
        .pg-msg.user {
          align-self: flex-end;
          background: rgba(255,255,255,0.06);
          border: 0.5px solid var(--hairline);
          border-bottom-right-radius: 5px;
        }
        .pg-msg.assistant {
          align-self: flex-start;
          background: var(--grad-accent);
          color: #003318;
          border-bottom-left-radius: 5px;
          font-weight: 500;
          box-shadow: 0 4px 14px rgba(0,194,107,0.20);
        }
        .pg-empty {
          margin: auto; text-align: center; color: var(--text-3); font-size: 13px;
        }
        .pg-empty h3 { color: var(--text); font-size: 16px; font-weight: 600; margin: 0 0 8px; letter-spacing: -0.01em; }
        .pg-foot { padding: 14px 20px 16px; border-top: 0.5px solid var(--hairline); background: rgba(10,10,12,0.55); }
        .pg-input-row {
          display: flex; align-items: flex-end; gap: 8px;
          background: var(--surface-1);
          border: 0.5px solid var(--hairline);
          border-radius: 14px;
          padding: 10px 12px;
        }
        .pg-input-row textarea {
          flex: 1; resize: none;
          border: 0; background: transparent; outline: none;
          color: var(--text); font: inherit; font-size: 14px;
          min-height: 22px; max-height: 160px; font-family: inherit;
        }
        .sug {
          background: rgba(255,159,10,0.06);
          border: 0.5px solid rgba(255,159,10,0.3);
          border-radius: 12px;
          padding: 14px;
          margin-top: 14px;
        }
        .sug-label {
          font-size: 10.5px; font-weight: 600;
          color: #FFB340; letter-spacing: 0.06em; text-transform: uppercase;
          margin-bottom: 8px; display: flex; align-items: center; gap: 6px;
        }
        .sug-rationale { font-size: 13px; line-height: 1.45; color: var(--text); }
        .sug-patch {
          margin-top: 10px;
          background: rgba(0,0,0,0.3);
          border: 0.5px solid var(--hairline);
          border-radius: 8px;
          padding: 10px 12px;
          font-family: var(--font-mono);
          font-size: 11.5px; line-height: 1.5;
          color: var(--text-2);
          white-space: pre-wrap; max-height: 200px; overflow-y: auto;
        }
        .toast {
          position: absolute; bottom: 84px; left: 50%; transform: translateX(-50%);
          background: rgba(52,224,138,0.18);
          border: 0.5px solid rgba(52,224,138,0.5);
          color: #5DEFA5;
          font-size: 12px;
          padding: 6px 12px; border-radius: 999px;
          pointer-events: none;
        }
        .err {
          background: rgba(255,69,58,0.12);
          border: 0.5px solid rgba(255,69,58,0.4);
          color: #FF6E63;
          padding: 8px 12px; border-radius: 8px;
          font-size: 12px; margin-bottom: 10px;
        }
        @media (max-width: 1024px) { .pg { grid-template-columns: 1fr; } .pg-side { display: none; } }
      `}</style>

      <div className="pg-main">
        <div className="pg-hd">
          <Avatar name={orgName} size={32} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>AI test chat</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>Same agent your DMs use · grounded in your master doc</div>
          </div>
          <Pill tone="green" dot>{messages.length} turns</Pill>
          <Button kind="ghost" size="sm" onClick={reset} disabled={busy || !messages.length}>
            <I.X size={12} /> Reset
          </Button>
        </div>

        <div className="pg-bd" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="pg-empty">
              <h3>Talk to your agent</h3>
              <div>Type the kind of DM a real customer would send.<br/>The AI replies grounded in your master doc — and flags missing context as you go.</div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={'pg-msg ' + m.role}>{m.content}</div>
          ))}
          {busy && <div className="pg-msg assistant" style={{ opacity: 0.6 }}>thinking…</div>}
        </div>

        <div className="pg-foot" style={{ position: 'relative' }}>
          {applyToast && <div className="toast">{applyToast}</div>}
          {error && <div className="err">{error}</div>}
          <div className="pg-input-row">
            <textarea
              placeholder='e.g. "hi! is the half-marathon plan still available?"'
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            />
            <Button kind="primary" size="sm" icon={<I.Send size={13} />} disabled={!draft.trim() || busy} onClick={send}>
              {busy ? '…' : 'Send'}
            </Button>
          </div>
        </div>
      </div>

      <aside className="pg-side">
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Master doc</div>
        <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 14 }}>
          {brain.trim() ? brain.trim().split(/\s+/).length + ' words · grounding every reply' : 'empty — every reply will flag missing info'}
        </div>
        <Link href="/brain" style={{ textDecoration: 'none' }}>
          <Button kind="default" size="sm" style={{ width: '100%', justifyContent: 'center' }}>
            <I.Brain size={13} /> Edit master doc
          </Button>
        </Link>

        {suggestion && (
          <div className="sug">
            <div className="sug-label"><I.Sparkle size={11} /> AI suggests adding to your master doc</div>
            <div className="sug-rationale">{suggestion.rationale}</div>
            <div className="sug-patch">{suggestion.patch}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Button kind="primary" size="sm" disabled={applyBusy} onClick={applySuggestion} style={{ flex: 1, justifyContent: 'center' }}>
                {applyBusy ? 'Applying…' : 'Apply'}
              </Button>
              <Button kind="ghost" size="sm" onClick={() => setSuggestion(null)} disabled={applyBusy}>Dismiss</Button>
            </div>
          </div>
        )}

        {!suggestion && messages.length > 0 && !busy && (
          <div style={{ marginTop: 18, fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.5 }}>
            No new doc updates suggested. Keep going — when you ask something the doc doesn't cover well, the AI will surface a patch here.
          </div>
        )}
      </aside>
    </div>
  );
}
