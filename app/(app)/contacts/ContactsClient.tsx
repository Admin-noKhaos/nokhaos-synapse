'use client';

import { useMemo, useState } from 'react';
import { I } from '@/lib/icons';
import { Avatar, Card, CardBody, KPI, Button, Pill } from '@/lib/primitives';
import type { Contact } from '@/lib/data/contacts';
import type { DrawerContact } from '@/components/ContactDrawer';

declare global {
  interface Window { openContact?: (c: DrawerContact) => void }
}

export function ContactsClient({ contacts }: { contacts: Contact[] }) {
  const [filter, setFilter] = useState<'all' | 'hot' | 'warm' | 'cold'>('all');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(contacts[0]?.id ?? null);

  const filtered = useMemo(() => {
    return contacts
      .filter((c) => filter === 'all' || c.sentiment === filter)
      .filter((c) => !q || (c.name + c.handle).toLowerCase().includes(q.toLowerCase()));
  }, [contacts, filter, q]);

  const c = filtered.find((x) => x.id === sel) ?? filtered[0] ?? null;

  const totals = useMemo(() => ({
    total: contacts.length,
    hot: contacts.filter((c) => c.sentiment === 'hot').length,
    avgScore: contacts.length ? contacts.reduce((a, c) => a + c.score, 0) / contacts.length : 0,
    customers: contacts.filter((c) => c.score >= 80).length,
  }), [contacts]);

  function openDrawer(contact: Contact) {
    if (typeof window !== 'undefined' && window.openContact) {
      window.openContact({
        id: contact.id,
        name: contact.name,
        handle: contact.handle,
        score: contact.score,
        sentiment: contact.sentiment,
        funnel: contact.funnel,
        followers: contact.followers !== '—' ? contact.followers : undefined,
        region: contact.region !== '—' ? contact.region : undefined,
        touch: contact.touch,
        ai_notes: contact.ai_notes,
      });
    }
  }

  return (
    <div className="sx-page sx-fade-in">
      <style>{`
        .sx-page { padding: 24px 28px 60px; max-width: 1480px; margin: 0 auto; }
        .sx-page-hd { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom: 22px; gap: 24px; }
        .sx-kpi-grid { display:grid; grid-template-columns:repeat(4, 1fr); gap: 12px; }
        .sx-ct-grid { display:grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-top: 24px; align-items:flex-start; }
        .sx-ct-toolbar { display:flex; gap:8px; align-items:center; padding: 14px 20px; border-bottom: 0.5px solid var(--hairline); flex-wrap: wrap; }
        .sx-ct-search { flex:1; max-width: 320px; display:flex; align-items:center; gap:8px; height: 30px; padding: 0 10px; border-radius: 8px; background: rgba(255,255,255,0.04); border: 0.5px solid var(--hairline); }
        html[data-theme='light'] .sx-ct-search { background: rgba(0,0,0,0.04); }
        .sx-ct-search input { flex:1; background:transparent; border:0; outline:0; color:var(--text); font:inherit; font-size:12.5px; font-family: inherit; }
        .sx-ct-search input::placeholder { color: var(--text-3); }
        .sx-ct-table { width:100%; border-collapse: collapse; font-size: 12.5px; }
        .sx-ct-table th { text-align:left; font-weight:500; color:var(--text-3); font-size:10.5px; letter-spacing:0.04em; text-transform:uppercase; padding: 10px 14px; border-bottom: 0.5px solid var(--hairline); }
        .sx-ct-table td { padding: 12px 14px; border-bottom: 0.5px solid var(--hairline); }
        .sx-ct-table tr { cursor:pointer; }
        .sx-ct-table tr:hover td { background: rgba(255,255,255,0.03); }
        html[data-theme='light'] .sx-ct-table tr:hover td { background: rgba(0,0,0,0.03); }
        .sx-ct-table tr.active td { background: rgba(var(--accent-rgb), 0.06); }
        .sx-ct-name-cell { display:flex; align-items:center; gap:10px; }
        .sx-ct-name { font-weight:600; }
        .sx-ct-handle { font-size:11px; color:var(--text-3); }
        .sx-ct-score-pill { display:inline-block; padding: 2px 7px; border-radius:5px; font-weight:700; font-variant-numeric:tabular-nums; font-size:11px; }
        .sx-ct-score-pill.hot { background: rgba(255,69,58,0.18); color: #FF6E63; }
        .sx-ct-score-pill.warm { background: rgba(255,159,10,0.18); color: #FFB340; }
        .sx-ct-score-pill.cold { background: rgba(10,132,255,0.18); color: #5AB0FF; }
        .sx-ct-side-row { display:flex; justify-content:space-between; padding: 7px 0; font-size:12.5px; }
        .sx-ct-side-row .k { color: var(--text-3); }
        .sx-ct-section { padding: 14px 0; border-bottom: 0.5px solid var(--hairline); }
        .sx-ct-section:last-child { border-bottom: 0; }
        .empty { padding: 40px; text-align:center; color: var(--text-3); font-size: 12.5px; }
        @media (max-width: 1200px){ .sx-kpi-grid{grid-template-columns:repeat(2,1fr)} .sx-ct-grid{grid-template-columns:1fr} }
      `}</style>

      <div className="sx-page-hd">
        <div>
          <h1 className="sx-page-h1">Contacts</h1>
          <p className="sx-page-sub">Every Instagram profile that has engaged with you. Click a row for the full timeline.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button kind="default" size="sm" icon={<I.Filter size={14} />}>Export CSV</Button>
        </div>
      </div>

      <div className="sx-kpi-grid">
        <Card><CardBody style={{ padding: '20px' }}><KPI label="Total contacts" value={totals.total.toLocaleString()} sub="all time" /></CardBody></Card>
        <Card><CardBody style={{ padding: '20px' }}><KPI label="Hot leads" value={totals.hot.toLocaleString()} sub="sentiment = hot" /></CardBody></Card>
        <Card><CardBody style={{ padding: '20px' }}><KPI label="Avg. lead score" value={totals.avgScore ? totals.avgScore.toFixed(1) : '—'} sub="across all" /></CardBody></Card>
        <Card><CardBody style={{ padding: '20px' }}><KPI label="High-value" value={totals.customers.toLocaleString()} sub="score \u2265 80" /></CardBody></Card>
      </div>

      <div className="sx-ct-grid">
        <Card>
          <div className="sx-ct-toolbar">
            <label className="sx-ct-search">
              <I.Search size={13} style={{ color: 'var(--text-3)' }} />
              <input placeholder="Search contacts…" value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              {([
                { id: 'all', l: 'All' },
                { id: 'hot', l: 'Hot' },
                { id: 'warm', l: 'Warm' },
                { id: 'cold', l: 'Cold' },
              ] as const).map((f) => (
                <button key={f.id} onClick={() => setFilter(f.id)} style={{
                  padding: '4px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 500,
                  background: filter === f.id ? 'var(--accent-1)' : 'transparent',
                  color: filter === f.id ? '#003318' : 'var(--text-2)',
                  border: filter === f.id ? '0' : '0.5px solid var(--hairline)',
                  cursor: 'pointer',
                }}>{f.l}</button>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{filtered.length} of {contacts.length}</span>
          </div>
          {filtered.length === 0 ? (
            <div className="empty">No contacts yet. Once leads come in via Inbox, they appear here.</div>
          ) : (
            <table className="sx-ct-table">
              <thead>
                <tr>
                  <th>Contact</th><th>Score</th><th>Funnel</th><th>Followers</th><th>Touch</th><th>Last</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className={sel === c.id ? 'active' : ''} onClick={() => { setSel(c.id); openDrawer(c); }}>
                    <td>
                      <div className="sx-ct-name-cell">
                        <Avatar name={c.name} size={32} />
                        <div>
                          <div className="sx-ct-name">{c.name}</div>
                          <div className="sx-ct-handle">{c.handle}{c.region !== '—' ? ' · ' + c.region : ''}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={'sx-ct-score-pill ' + (c.sentiment ?? '')}>{c.score}</span></td>
                    <td style={{ color: 'var(--text-2)' }}>{c.funnel ?? '—'}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{c.followers}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{c.touch}</td>
                    <td style={{ color: 'var(--text-3)' }}>{c.last}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {c && (
          <Card>
            <CardBody>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                <Avatar name={c.name} size={56} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.handle}</div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                    {c.sentiment && <Pill tone={c.sentiment} dot>{c.sentiment}</Pill>}
                    <Pill>Score {c.score}</Pill>
                  </div>
                </div>
              </div>
              <div className="sx-ct-section">
                <div className="sx-section-title">Profile</div>
                <div style={{ marginTop: 8 }}>
                  <div className="sx-ct-side-row"><span className="k">Funnel</span><span>{c.funnel ?? '—'}</span></div>
                  <div className="sx-ct-side-row"><span className="k">Touchpoints</span><span>{c.touch}</span></div>
                  <div className="sx-ct-side-row"><span className="k">Region</span><span>{c.region}</span></div>
                  <div className="sx-ct-side-row"><span className="k">Last seen</span><span>{c.last}</span></div>
                </div>
              </div>
              {c.ai_notes && (
                <div className="sx-ct-section">
                  <div className="sx-section-title">AI notes</div>
                  <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5 }}>{c.ai_notes}</div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
                <Button kind="primary" size="sm" icon={<I.Eye size={13} />} style={{ flex: 1, justifyContent: 'center' }} onClick={() => openDrawer(c)}>
                  View profile
                </Button>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
