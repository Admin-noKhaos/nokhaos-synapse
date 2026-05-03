'use client';

import { useState } from 'react';
import { I } from '@/lib/icons';
import { Avatar, Button, Pill } from '@/lib/primitives';
import { SAMPLE_CONVERSATIONS, type Sentiment } from '@/lib/sample-data';

export default function InboxPage() {
  const [selected, setSelected] = useState(SAMPLE_CONVERSATIONS[0].id);
  const [filter, setFilter] = useState<'all' | Sentiment>('all');
  const conv = SAMPLE_CONVERSATIONS.find((c) => c.id === selected)!;
  const filtered = filter === 'all' ? SAMPLE_CONVERSATIONS : SAMPLE_CONVERSATIONS.filter((c) => c.sentiment === filter);

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
        .sx-ix-msg.ai {
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
      `}</style>

      <div className="sx-ix-list">
        <div className="sx-ix-list-hd">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Inbox</div>
            <Button kind="ghost" size="sm" icon={<I.Filter size={13} />} />
          </div>
          <div className="sx-ix-filter">
            {([
              { id: 'all',  l: 'All',  n: SAMPLE_CONVERSATIONS.length },
              { id: 'hot',  l: 'Hot',  n: SAMPLE_CONVERSATIONS.filter((c) => c.sentiment === 'hot').length },
              { id: 'warm', l: 'Warm', n: SAMPLE_CONVERSATIONS.filter((c) => c.sentiment === 'warm').length },
              { id: 'cold', l: 'Cold', n: SAMPLE_CONVERSATIONS.filter((c) => c.sentiment === 'cold').length },
            ] as const).map((f) => (
              <button key={f.id} className={'sx-ix-filter-btn' + (filter === f.id ? ' active' : '')} onClick={() => setFilter(f.id)}>
                {f.l} <span style={{ opacity: 0.6, marginLeft: 3 }}>{f.n}</span>
              </button>
            ))}
          </div>
        </div>
        {filtered.map((c) => (
          <div key={c.id} className={'sx-ix-item' + (selected === c.id ? ' active' : '')} onClick={() => setSelected(c.id)}>
            <Avatar name={c.name} size={36} online={c.unread} />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="sx-ix-item-name">{c.name}</span>
                {c.unread && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-1)' }} />}
              </div>
              <div className="sx-ix-item-handle">{c.handle} · {c.lastReplied}</div>
              <div className="sx-ix-item-snip">{c.snippet}</div>
            </div>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <div className={'sx-ix-score ' + c.sentiment}>{c.score}</div>
              {c.channel === 'Comment' && <I.Reply size={11} style={{ color: 'var(--text-3)' }} />}
            </div>
          </div>
        ))}
      </div>

      <div className="sx-ix-thread">
        <div className="sx-ix-thread-hd">
          <Avatar name={conv.name} size={36} online />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{conv.name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{conv.handle} · {conv.funnel}</div>
          </div>
          <Pill tone={conv.sentiment} dot>
            {conv.sentiment === 'hot' ? 'Hot lead' : conv.sentiment === 'warm' ? 'Warm' : 'Cold'}
          </Pill>
          <Button kind="ghost" size="sm" icon={<I.More size={14} />} />
        </div>

        <div className="sx-ix-thread-bd">
          <div style={{ textAlign: 'center', fontSize: 10.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Today
          </div>
          {conv.transcript.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.from === 'ai' ? 'flex-end' : 'flex-start' }}>
              <div className={'sx-ix-msg ' + m.from}>{m.text}</div>
              <div className="sx-ix-msg-meta">
                {m.t} {m.auto && <span style={{ color: '#5DEFA5' }}>· Synapse</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="sx-ix-composer">
          <div style={{ fontSize: 10.5, fontWeight: 600, color: '#5DEFA5', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
            <I.Sparkle size={11} /> Synapse suggests
          </div>
          <div className="sx-ix-suggest">
            <button className="sx-ix-suggest-btn"><I.Link size={11} /> Send Half-Marathon plan link</button>
            <button className="sx-ix-suggest-btn"><I.Reply size={11} /> Confirm program details</button>
            <button className="sx-ix-suggest-btn"><I.Tag size={11} /> Tag as ready-to-buy</button>
          </div>
          <div className="sx-ix-input-row">
            <textarea placeholder="Reply, or let Synapse handle it…" rows={1} defaultValue="" />
            <Button kind="ghost" size="sm" icon={<I.Image size={14} />} />
            <Button kind="primary" size="sm" icon={<I.Send size={13} />}>Send</Button>
          </div>
        </div>
      </div>

      <div className="sx-ix-side">
        <div className="sx-side-section">
          <div className="sx-section-title">Lead Score</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6, marginBottom: 8 }}>
            <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums' }}>{conv.score}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>/ 100</div>
            <div style={{ flex: 1 }} />
            <Pill tone="green" dot>↑ +8 today</Pill>
          </div>
          <div className="sx-score-bar"><div className="sx-score-bar-fill" style={{ width: `${conv.score}%` }} /></div>
        </div>

        <div className="sx-side-section">
          <div className="sx-section-title">Next Best Action</div>
          <div className="sx-nba" style={{ marginTop: 6 }}>
            <div className="sx-nba-label"><I.Sparkle size={11} /> Synapse</div>
            <div className="sx-nba-text">{conv.nextAction}</div>
            <div className="sx-nba-action">
              <Button kind="primary" size="sm" style={{ flex: 1 }}>Approve & send</Button>
              <Button kind="ghost" size="sm" icon={<I.X size={13} />} />
            </div>
          </div>
        </div>

        <div className="sx-side-section">
          <div className="sx-section-title">Tags</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
            {conv.tags.map((t) => <Pill key={t}>{t}</Pill>)}
            <Pill style={{ cursor: 'pointer' }}><I.Plus size={10} /> Add</Pill>
          </div>
        </div>

        <div className="sx-side-section">
          <div className="sx-section-title">Profile</div>
          <div style={{ marginTop: 6 }}>
            <div className="sx-side-row"><span className="k">Followers</span><span>4.8k</span></div>
            <div className="sx-side-row"><span className="k">Engagement</span><span>6.2%</span></div>
            <div className="sx-side-row"><span className="k">First contact</span><span>14 days ago</span></div>
            <div className="sx-side-row"><span className="k">Touchpoints</span><span>7</span></div>
            <div className="sx-side-row"><span className="k">Funnel stage</span><span>Consideration</span></div>
          </div>
        </div>

        <div className="sx-side-section">
          <div className="sx-section-title">AI Notes</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5, marginTop: 6 }}>
            Engaged with 3 reels on negative-split training. High intent for half-marathon content. Has not asked about price — likely to convert without discount.
          </div>
        </div>
      </div>
    </div>
  );
}
