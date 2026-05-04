import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { I } from '@/lib/icons';
import { Card, CardHeader, CardBody, KPI, Pill, Button } from '@/lib/primitives';

export default async function ABTestsPage() {
  const session = await getCurrentSession();
  if (!session) redirect('/login');

  // Stub UI for now — real A/B engine is a follow-up.
  return (
    <div className="sx-page sx-fade-in">
      <style>{`
        .sx-page { padding: 24px 28px 60px; max-width: 1280px; margin: 0 auto; }
        .sx-page-hd { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom: 22px; gap: 24px; }
        .sx-kpi-grid { display:grid; grid-template-columns:repeat(4, 1fr); gap: 12px; }
        .row { padding: 16px; border-bottom: 0.5px solid var(--hairline); }
        .row:last-child { border-bottom: 0; }
        .name { font-size: 13.5px; font-weight: 600; }
        .vbody { padding: 10px 12px; background: var(--surface-2); border: 0.5px solid var(--hairline); border-radius: 8px; font-size: 12px; color: var(--text-2); margin-top: 6px; line-height: 1.5; min-height: 56px; }
        .vstat { display: flex; gap: 14px; margin-top: 8px; font-size: 11px; color: var(--text-3); font-variant-numeric: tabular-nums; }
        .vstat b { color: var(--text); font-weight: 600; }
        .empty { padding: 60px; text-align: center; color: var(--text-3); }
        .empty h3 { color: var(--text); font-size: 16px; font-weight: 600; margin: 0 0 8px; }
      `}</style>

      <div className="sx-page-hd">
        <div>
          <h1 className="sx-page-h1">A/B Tests</h1>
          <p className="sx-page-sub">Split-test broadcast copy, AI reply variants, and smart link routes. Synapse picks the winner automatically.</p>
        </div>
        <Button kind="primary" size="sm" disabled icon={<I.Plus size={14} />}>New test (soon)</Button>
      </div>

      <div className="sx-kpi-grid">
        <Card><CardBody style={{ padding: '20px' }}><KPI label="Active tests" value="0" sub="needs first test" /></CardBody></Card>
        <Card><CardBody style={{ padding: '20px' }}><KPI label="Avg. lift" value="—" /></CardBody></Card>
        <Card><CardBody style={{ padding: '20px' }}><KPI label="Confidence \u2265 95%" value="0" /></CardBody></Card>
        <Card><CardBody style={{ padding: '20px' }}><KPI label="Variants tested" value="0" /></CardBody></Card>
      </div>

      <Card style={{ marginTop: 12 }}>
        <CardHeader title="Tests" sub="0 configured" />
        <CardBody>
          <div className="empty">
            <I.Bolt size={28} style={{ display: 'inline-block', marginBottom: 12, opacity: 0.5 }} />
            <h3>Coming soon</h3>
            <div>Split-test broadcasts and reply copy. We&apos;ll route a fraction of your audience to each variant and pick the winner once we hit statistical significance.</div>
            <div style={{ marginTop: 14 }}>
              <Pill tone="warm">In development</Pill>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
