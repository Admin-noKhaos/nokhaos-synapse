'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { I } from '@/lib/icons';
import { Avatar, Button, Pill } from '@/lib/primitives';
import type { Conversation, Message, Sentiment } from '@/lib/data/queries';

const SENTIMENT_LABEL: Record<Sentiment | 'unscored', string> = {
  hot: 'Hot lead',
  warm: 'Warm',
  cold: 'Cold',
  unscored: 'Unscored',
};

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function timeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function InboxClient({
  conversations,
  selectedId,
  messages,
  filter,
}: {
  conversations: Conversation[];
  selectedId: string;
  messages: Message[];
  filter: 'all' | 'hot' | 'warm' | 'cold';
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [draft, setDraft] = useState('');
  const [pending, startTransition] = useTransition();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  const conv = conversations.find((c) => c.id === selectedId) ?? conversations[0];
  const filtered = filter === 'all'
    ? conversations
    : conversations.filter((c) => c.lead?.sentiment === filter);

  function selectConv(id: string) {
    const sp = new URLSearchParams(params.toString());
    sp.set('c', id);
    startTransition(() => router.push(`/inbox?${sp.toString()}`));
  }

  function setFilter(f: typeof filter) {
    const sp = new URLSearchParams(params.toString());
    sp.set('filter', f);
    startTransition(() => router.push(`/inbox?${sp.toString()}`));
  }

  async function suggestReply(goal: string) {
    setAiBusy(true);
    setError(null);
    try {
      const r = await fetch('/api/ai/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: conv.id, goal }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error === 'insufficient_credits' ? 'Out of credits — top up in Settings.' : data.error || 'AI failed');
        return;
      }
      setDraft(data.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAiBusy(false);
    }
  }

  async function send() {
    if (!draft.trim()) return;
    setSending(true);
    setError(null);
    try {
      const r = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: conv.id, text: draft.trim() }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || `HTTP ${r.status}`);
        return;
      }
      setDraft('');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="sx-ix sx-fade-in">
      <style>{`
        .sx-ix { display:grid; grid-template-columns: 360px 1fr 320px; height: calc(100vh - 56px); }
        .sx-ix-list, .sx-ix-side { border-right: 0.5px solid var(--hairline); overflow-y: auto; }
        .sx-ix-side { border-right: 0; border-left: 0.5px solid var(--hairline); padding: 18px 18px 28px; }
        .sx-ix-list-hd {
          padding: 14px 16px 8px;
          position: sticky; top: 0;
          background: rgba(10,10,12,0.7);
          backdrop-filter: blur(20px);
          z-index: 2;
          border-bottom: 0.5px solid var(--hairline);
        }
        .sx-ix-filter { display:flex; gap: 6px; margin-top: 10px; }
        .sx-ix-filter-btn {
          padding: 4px 10px; border-radius: 999px;
          font-size: 11.5px; font-weight: 500;
          background: transparent; border: 0.5px solid var(--hairline);
          color: var(--text-2); cursor: pointer;
        }
        .sx-ix-filter-btn.active { background: var(--accent-1); color: #003318; border-color: transparent; }
        .sx-ix-item {
          display:grid; grid-template-columns: 36px 1fr auto;
          gap: 10px;
          padding: 12px 16px;
          border-bottom: 0.5px solid var(--hairline);
          cursor: pointer;
          transition: background 100ms;
          position: relative;
        }
        .sx-ix-item:hover { background: rgba(255,255,255,0.03); }
        .sx-ix-item.active { background: rgba(52,224,138,0.06); }
        .sx-ix-item.active::before { content:''; position:absolute; left:0; top:0; bottom:0; width: 2px; background: var(--accent-1); }
        .sx-ix-item-name { font-size: 13px; font-weight: 600; }
        .sx-ix-item-handle { font-size: 11.5px; color: var(--text-3); }
        .sx-ix-item-snip {
          font-size: 12px; color: var(--text-2);
          margin-top: 4px;
          overflow: hidden; text-overflow: ellipsis;
          display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical;
        }
        .sx-ix-score {
          font-size: 11px; font-weight: 700;
          font-variant-numeric: tabular-nums;
          padding: 2px 7px; border-radius: 5px;
          background: rgba(255,255,255,0.06);
          color: var(--text-2);
        }
        .sx-ix-score.hot { background: rgba(255,69,58,0.18); color: #FF6E63; }
        .sx-ix-score.warm { background: rgba(255,159,10,0.18); color: #FFB340; }
        .sx-ix-score.cold { background: rgba(10,132,255,0.18); color: #5AB0FF; }
        .sx-ix-thread { display:flex; flex-direction:column; height: 100%; }
        .sx-ix-thread-hd {
          display:flex; align-items:center; gap: 12px;
          padding: 14px 20px;
          border-bottom: 0.5px solid var(--hairline);
          background: rgba(10,10,12,0.55);
          backdrop-filter: blur(20px);
        }
        .sx-ix-thread-bd { flex: 1; overflow-y: auto; padding: 24px 32px 16px; display: flex; flex-direction: column; gap: 14px; }
        .sx-ix-msg { max-width: 70%; padding: 10px 13px; border-radius: 16px; font-size: 13px; line-height: 1.4; }
        .sx-ix-msg.them { align-self: flex-start; background: var(--surface-2); border: 0.5px solid var(--hairline); border-bottom-left-radius: 5px; }
        .sx-ix-msg.us, .sx-ix-msg.ai {
          align-self: flex-end;
          background: var(--grad-accent);
          color: #003318;
          border-bottom-right-radius: 5px;
          font-weight: 500;
          box-shadow: 0 4px 14px rgba(0,194,107,0.20);
        }
        .sx-ix-msg-meta { font-size: 10px; color: var(--text-3); margin-top: 4px; padding: 0 4px; }
        .sx-ix-composer { padding: 14px 20px 16px; border-top: 0.5px solid var(--hairline); background: rgba(10,10,12,0.55); }
        .sx-ix-suggest { display:flex; gap: 6px; margin-bottom: 10px; flex-wrap: wrap; }
        .sx-ix-suggest-btn {
          font-size: 11.5px;
          padding: 5px 10px;
          border-radius: 999px;
          background: rgba(52,224,138,0.10);
          border: 0.5px solid rgba(52,224,138,0.25);
          color: #5DEFA5;
          cursor: pointer;
          display:flex; align-items:center; gap:5px;
        }
        .sx-ix-suggest-btn:hover { background: rgba(52,224,138,0.18); }
        .sx-ix-suggest-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .sx-ix-input-row {
          display:flex; align-items:flex-end; gap: 8px;
          background: var(--surface-1);
          border: 0.5px solid var(--hairline);
          border-radius: 12px;
          padding: 10px 12px;
        }
        .sx-ix-input-row textarea {
          flex: 1; resize: none;
          border: 0; background: transparent; outline: none;
          color: var(--text);
          font: inherit; font-size: 13px;
          min-height: 22px; max-height: 120px;
          font-family: inherit;
        }
        .sx-side-section { padding: 14px 0; border-bottom: 0.5px solid var(--hairline); }
        .sx-side-section:first-child { padding-top: 4px; }
        .sx-side-section:last-child { border-bottom: 0; }
        .sx-side-row { display:flex; justify-content:space-between; align-items:center; font-size: 12px; padding: 4px 0; }
        .sx-side-row .k { color: var(--text-3); }
        .sx-nba { background: rgba(52,224,138,0.06); border: 0.5px solid rgba(52,224,138,0.22); border-radius: 10px; padding: 12px; }
        .sx-nba-label {
          display:flex; align-items:center; gap:6px;
          font-size: 10.5px; font-weight: 600;
          color: #5DEFA5; letter-spacing: 0.06em; text-transform: uppercase;
          margin-bottom: 6px;
        }
        .sx-nba-text { font-size: 12.5px; line-height: 1.4; }
        .sx-nba-action { margin-top: 10px; display:flex; gap: 6px; }
        .sx-score-bar { position: relative; height: 6px; border-radius: 3px; background: rgba(255,255,255,0.06); overflow: hidden; }
        .sx-score-bar-fill { position:absolute; left:0; top:0; bottom:0; background: var(--grad-accent); border-radius: 3px; box-shadow: 0 0 8px rgba(52,224,138,0.4); }
        .err { font-size: 11.5px; color: #FF6E63; margin-bottom: 6px; }
      `}</style>

      <div className="sx-ix-list">
        <div className="sx-ix-list-hd">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Inbox</div>
            <Button kind="ghost" size="sm" icon={<I.Filter size={13} />} />
          </div>
          <div className="sx-ix-filter">
            {([
              { id: 'all',  l: 'All',  n: conversations.length },
              { id: 'hot',  l: 'Hot',  n: conversations.filter((c) => c.lead?.sentiment === 'hot').length },
              { id: 'warm', l: 'Warm', n: conversations.filter((c) => c.lead?.sentiment === 'warm').length },
              { id: 'cold', l: 'Cold', n: conversations.filter((c) => c.lead?.sentiment === 'cold').length },
            ] as const).map((f) => (
              <button key={f.id} className={'sx-ix-filter-btn' + (filter === f.id ? ' active' : '')} onClick={() => setFilter(f.id)}>
                {f.l} <span style={{ opacity: 0.6, marginLeft: 3 }}>{f.n}</span>
              </button>
            ))}
          </div>
        </div>
        {filtered.map((c) => {
          const name = c.lead?.display_name || c.lead?.username || '@' + (c.lead?.username ?? 'unknown');
          const sentiment = c.lead?.sentiment ?? null;
          return (
            <div key={c.id} className={'sx-ix-item' + (selectedId === c.id ? ' active' : '')} onClick={() => selectConv(c.id)}>
              <Avatar name={name} size={36} online={c.unread_count > 0} />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="sx-ix-item-name">{name}</span>
                  {c.unread_count > 0 && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-1)' }} />}
                </div>
                <div className="sx-ix-item-handle">@{c.lead?.username ?? '—'} · {relativeTime(c.last_message_at)}</div>
                <div className="sx-ix-item-snip">{c.latest_message?.text ?? '—'}</div>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                {c.lead && <div className={'sx-ix-score ' + (sentiment ?? '')}>{Math.round(c.lead.score)}</div>}
                {c.channel === 'comment' && <I.Reply size={11} style={{ color: 'var(--text-3)' }} />}
              </div>
            </div>
          );
        })}
      </div>

      <div className="sx-ix-thread">
        <div className="sx-ix-thread-hd">
          <Avatar name={conv.lead?.display_name || conv.lead?.username || '?'} size={36} online />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{conv.lead?.display_name || conv.lead?.username || '—'}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>@{conv.lead?.username ?? '—'} · {conv.lead?.funnel_label ?? 'No funnel'}</div>
          </div>
          {conv.lead?.sentiment && <Pill tone={conv.lead.sentiment} dot>{SENTIMENT_LABEL[conv.lead.sentiment]}</Pill>}
          <Button kind="ghost" size="sm" icon={<I.More size={14} />} />
        </div>

        <div className="sx-ix-thread-bd">
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 12, padding: 24 }}>No messages yet</div>
          ) : messages.map((m) => (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.sender === 'them' ? 'flex-start' : 'flex-end' }}>
              <div className={'sx-ix-msg ' + m.sender}>{m.text}</div>
              <div className="sx-ix-msg-meta">
                {timeOnly(m.sent_at)} {m.sender === 'ai' && <span style={{ color: '#5DEFA5' }}>· Synapse</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="sx-ix-composer">
          <div style={{ fontSize: 10.5, fontWeight: 600, color: '#5DEFA5', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
            <I.Sparkle size={11} /> Synapse suggests
          </div>
          <div className="sx-ix-suggest">
            <button className="sx-ix-suggest-btn" disabled={aiBusy} onClick={() => suggestReply('Reply concisely and helpfully to the last customer message.')}>
              <I.Reply size={11} /> {aiBusy ? 'Drafting…' : 'Draft a reply'}
            </button>
            <button className="sx-ix-suggest-btn" disabled={aiBusy} onClick={() => suggestReply('Confirm program details and offer a clear next step.')}>
              <I.Sparkle size={11} /> Confirm details
            </button>
            <button className="sx-ix-suggest-btn" disabled={aiBusy} onClick={() => suggestReply('Counter the customer\'s objection in a warm, direct tone.')}>
              <I.Tag size={11} /> Counter objection
            </button>
          </div>
          {error && <div className="err">{error}</div>}
          <div className="sx-ix-input-row">
            <textarea
              placeholder="Reply, or let Synapse handle it…"
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(); }}
            />
            <Button kind="ghost" size="sm" icon={<I.Image size={14} />} />
            <Button kind="primary" size="sm" icon={<I.Send size={13} />} disabled={!draft.trim() || sending} onClick={send}>
              {sending ? 'Sending…' : 'Send'}
            </Button>
          </div>
        </div>
      </div>

      <div className="sx-ix-side">
        <div className="sx-side-section">
          <div className="sx-section-title">Lead Score</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6, marginBottom: 8 }}>
            <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums' }}>
              {conv.lead ? Math.round(conv.lead.score) : '—'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>/ 100</div>
          </div>
          <div className="sx-score-bar"><div className="sx-score-bar-fill" style={{ width: `${conv.lead?.score ?? 0}%` }} /></div>
        </div>

        {conv.next_action && (
          <div className="sx-side-section">
            <div className="sx-section-title">Next Best Action</div>
            <div className="sx-nba" style={{ marginTop: 6 }}>
              <div className="sx-nba-label"><I.Sparkle size={11} /> Synapse</div>
              <div className="sx-nba-text">{conv.next_action}</div>
            </div>
          </div>
        )}

        {conv.lead?.tags && conv.lead.tags.length > 0 && (
          <div className="sx-side-section">
            <div className="sx-section-title">Tags</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
              {conv.lead.tags.map((t) => <Pill key={t}>{t}</Pill>)}
            </div>
          </div>
        )}

        <div className="sx-side-section">
          <div className="sx-section-title">Profile</div>
          <div style={{ marginTop: 6 }}>
            <div className="sx-side-row"><span className="k">Username</span><span>@{conv.lead?.username ?? '—'}</span></div>
            <div className="sx-side-row"><span className="k">Sentiment</span><span>{conv.lead?.sentiment ?? '—'}</span></div>
            <div className="sx-side-row"><span className="k">First contact</span><span>{conv.lead?.first_contact_at ? relativeTime(conv.lead.first_contact_at) + ' ago' : '—'}</span></div>
            <div className="sx-side-row"><span className="k">Channel</span><span>{conv.channel.toUpperCase()}</span></div>
          </div>
        </div>

        {conv.lead?.ai_notes && (
          <div className="sx-side-section">
            <div className="sx-section-title">AI Notes</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5, marginTop: 6 }}>
              {conv.lead.ai_notes}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
