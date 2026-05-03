import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { getAnalyticsData } from '@/lib/data/queries';
import { I } from '@/lib/icons';
import { Card, CardHeader, CardBody, KPI, Pill, Button } from '@/lib/primitives';

export default async function AnalyticsPage() {
  const session = await getCurrentSession();
  if (!session) redirect('/login');
  const data = await getAnalyticsData(session.org.id);

  const empty = data.ai_calls_30d === 0 && data.total_messages_30d === 0;
  const maxDay = Math.max(...data.daily_messages.map((d) => d.in + d.out), 1);

  return (
    <div className="sx-page sx-fade-in">
      <style>{`
        .sx-page { padding: 24px 28px 60px; max-width: 1480px; margin: 0 auto; }
        .sx-page-hd { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom: 22px; gap: 24px; }
        .sx-kpi-grid { display:grid; grid-template-columns:repeat(4, 1fr); gap: 12px; }
        .sx-an-grid { display:grid; grid-template-columns: 2fr 1fr; gap: 12px; margin-top: 12px; }
        .sx-an-row3 { display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 12px; }
        .sx-an-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
        .sx-an-table th { text-align: left; font-weight: 500; color: var(--text-3); font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase; padding: 8px 8px 8px 0; border-bottom: 0.5px solid var(--hairline); }
        .sx-an-table td { padding: 11px 8px 11px 0; border-bottom: 0.5px solid var(--hairline); font-variant-numeric: tabular-nums; }
        .sx-an-table tr:last-child td { border-bottom: 0; }
        .empty-card { padding: 24px; text-align: center; color: var(--text-3); font-size: 12.5px; }
        @media (max-width: 1200px){ .sx-kpi-grid{grid-template-columns:repeat(2,1fr)} .sx-an-grid{grid-template-columns:1fr} .sx-an-row3{grid-template-columns:1fr} }
      `}</style>

      <div className="sx-page-hd">
        <div>
          <h1 className="sx-page-h1">Analytics Vault</h1>
          <p className="sx-page-sub">{empty ? 'No activity in the last 30 days yet.' : 'Last 30 days of messaging + AI activity.'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button kind="default" size="sm" icon={<I.Filter size={14} />}>Last 30 days</Button>
          <Button kind="default" size="sm">Export</Button>
        </div>
      </div>

      <div className="sx-kpi-grid">
        <Card><CardBody style={{ padding: '18px' }}>
          <KPI label="AI Spend · 30d" value={'$' + data.ai_spend_30d_usd.toFixed(2)} sub="charged to credits" />
        </CardBody></Card>
        <Card><CardBody style={{ padding: '18px' }}>
          <KPI label="AI Calls · 30d" value={data.ai_calls_30d.toLocaleString()} sub={data.ai_calls_30d ? `avg $${data.avg_charged_per_call.toFixed(4)}/call` : 'no calls yet'} />
        </CardBody></Card>
        <Card><CardBody style={{ padding: '18px' }}>
          <KPI label="Messages · 30d" value={data.total_messages_30d.toLocaleString()} sub="all directions" />
        </CardBody></Card>
        <Card><CardBody style={{ padding: '18px' }}>
          <KPI label="Top Purpose" value={data.ai_call_breakdown[0]?.purpose ?? '—'} sub={data.ai_call_breakdown[0] ? `${data.ai_call_breakdown[0].calls} calls` : 'no AI activity'} />
        </CardBody></Card>
      </div>

      <div className="sx-an-grid">
        <Card>
          <CardHeader title="Messages · 14 day trend" sub="Inbound vs outbound" right={<Pill tone="green">All channels</Pill>} />
          <CardBody>
            {data.total_messages_30d === 0 ? (
              <div className="empty-card">Once messages start flowing, you'll see daily trend here.</div>
            ) : (
              <svg width="100%" height="220" viewBox="0 0 700 220">
                {data.daily_messages.map((d, i) => {
                  const total = d.in + d.out;
                  const x = 36 + (i / 13) * (700 - 48);
                  const bw = ((700 - 48) / 14) * 0.6;
                  const h = (total / maxDay) * 170;
                  const y = 200 - h;
                  const hOut = (d.out / maxDay) * 170;
                  return (
                    <g key={i}>
                      <rect x={x - bw / 2} y={y + (h - hOut)} width={bw} height={hOut} fill="#34E08A" rx="2" />
                      <rect x={x - bw / 2} y={y} width={bw} height={h - hOut} fill="#5AB0FF" rx="2" />
                    </g>
                  );
                })}
                <line x1="36" x2="700" y1="200" y2="200" stroke="rgba(255,255,255,0.06)" />
              </svg>
            )}
            <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 11, color: 'var(--text-3)' }}>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#5AB0FF', borderRadius: 2, marginRight: 6 }} />Inbound</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#34E08A', borderRadius: 2, marginRight: 6 }} />Outbound</span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="AI Call Mix" sub="By purpose · 30d" />
          <CardBody>
            {data.ai_call_breakdown.length === 0 ? (
              <div className="empty-card">No AI calls yet. Use the Inbox to draft an AI reply.</div>
            ) : data.ai_call_breakdown.map((b) => {
              const max = Math.max(...data.ai_call_breakdown.map((x) => x.calls));
              return (
                <div key={b.purpose} style={{ padding: '7px 0', borderBottom: '0.5px solid var(--hairline)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ textTransform: 'capitalize' }}>{b.purpose}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-2)' }}>{b.calls} · ${b.cost_usd.toFixed(3)}</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${(b.calls / max) * 100}%`, background: 'var(--grad-accent)', borderRadius: 2 }} />
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>
      </div>

      <Card style={{ marginTop: 12 }}>
        <CardHeader title="Recent ledger" sub="Last 10 transactions" />
        <CardBody>
          {data.recent_credit_ledger.length === 0 ? (
            <div className="empty-card">No transactions yet.</div>
          ) : (
            <table className="sx-an-table">
              <thead>
                <tr>
                  <th>Kind</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'right' }}>When</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_credit_ledger.map((row) => (
                  <tr key={row.id}>
                    <td>{row.kind}</td>
                    <td>{row.description ?? '—'}</td>
                    <td style={{ textAlign: 'right', color: row.amount_usd < 0 ? '#FF6E63' : '#5DEFA5', fontWeight: 600 }}>
                      {row.amount_usd >= 0 ? '+' : ''}${row.amount_usd.toFixed(4)}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-3)' }}>{new Date(row.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
