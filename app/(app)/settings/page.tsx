import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';
import { Card, CardHeader, CardBody, Pill, Button, Avatar } from '@/lib/primitives';
import { I } from '@/lib/icons';
import { metaConfigured, anthropicConfigured, serviceRoleConfigured } from '@/lib/env';
import { TopupForm } from './TopupForm';
import { SignOutButton } from './SignOutButton';
import { DisconnectButton } from './DisconnectButton';

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getCurrentSession();
  if (!session) redirect('/login');
  const params = await searchParams;

  const supabase = await getSupabaseServer();
  const { data: metaAccounts } = await supabase
    .from('meta_accounts')
    .select('id, username, page_name, status, webhook_subscribed, connected_at, meta')
    .eq('org_id', session.org.id)
    .order('connected_at', { ascending: false });

  const { data: recentLedger } = await supabase
    .from('credit_ledger')
    .select('id, kind, amount_usd, description, created_at')
    .eq('org_id', session.org.id)
    .order('created_at', { ascending: false })
    .limit(8);

  return (
    <div className="sx-page sx-fade-in">
      <style>{`
        .sx-page { padding: 24px 28px 60px; max-width: 980px; margin: 0 auto; }
        .sx-page-hd { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom: 22px; gap: 24px; }
        .grid-2 { display:grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
        .row { display:flex; align-items:center; gap: 10px; padding: 10px 0; border-bottom: 0.5px solid var(--hairline); }
        .row:last-child { border-bottom: 0; }
        .row .k { color: var(--text-3); font-size: 12px; flex: 1; }
        .row .v { font-size: 12.5px; }
        .balance-num { font-size: 36px; font-weight: 600; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
        .alert {
          padding: 10px 12px; border-radius: 10px; margin-bottom: 12px;
          font-size: 12.5px; display: flex; align-items: center; gap: 10px;
        }
        .alert.success { background: rgba(52,224,138,0.10); border: 0.5px solid rgba(52,224,138,0.30); color: #5DEFA5; }
        .alert.error   { background: rgba(255,69,58,0.12); border: 0.5px solid rgba(255,69,58,0.4); color: #FF6E63; }
        .alert.warn    { background: rgba(255,159,10,0.10); border: 0.5px solid rgba(255,159,10,0.30); color: #FFB340; }
        @media (max-width: 900px){ .grid-2{grid-template-columns:1fr} }
      `}</style>

      <div className="sx-page-hd">
        <div>
          <h1 className="sx-page-h1">Settings</h1>
          <p className="sx-page-sub">Workspace, integrations, and billing.</p>
        </div>
        <SignOutButton />
      </div>

      {params.meta_connected === '1' && (
        <div className="alert success"><I.Check size={14}/> Instagram account connected.</div>
      )}
      {params.meta_error && (
        <div className="alert error"><I.X size={14}/> Meta connection failed: {params.meta_error}</div>
      )}

      <Card>
        <CardHeader title="Profile" sub="Your account info" />
        <CardBody>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
            <Avatar name={session.user.full_name || session.user.email} size={48} online />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{session.user.full_name || '—'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{session.user.email}</div>
            </div>
          </div>
          <div className="row"><span className="k">Workspace</span><span className="v">{session.org.name}</span></div>
          <div className="row"><span className="k">Plan</span><span className="v"><Pill tone="green">{session.org.plan}</Pill></span></div>
          <div className="row"><span className="k">Role</span><span className="v">{session.org.role}</span></div>
        </CardBody>
      </Card>

      <div className="grid-2">
        <Card>
          <CardHeader
            title="Instagram"
            sub="Connect your Instagram Business account via Facebook"
            right={metaAccounts && metaAccounts.length ? <Pill tone="green" dot>Connected</Pill> : <Pill tone="cold">Not connected</Pill>}
          />
          <CardBody>
            {!metaConfigured() ? (
              <div className="alert warn">
                <I.Bolt size={14} />
                Meta App not configured. Follow <a href="/docs/meta-app-setup" style={{ color: 'inherit', textDecoration: 'underline' }}>docs/meta-app-setup.md</a>, then add <code>META_APP_ID</code>, <code>META_APP_SECRET</code>, and <code>META_VERIFY_TOKEN</code> to your env.
              </div>
            ) : metaAccounts && metaAccounts.length ? (
              <>
                {metaAccounts.map((a) => {
                  const accountType = (a.meta as { account_type?: string } | null)?.account_type ?? null;
                  return (
                    <div key={a.id} className="row">
                      <Avatar name={a.username || a.page_name || 'IG'} size={32} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>@{a.username || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                          {accountType ?? a.page_name ?? '—'} · webhooks {a.webhook_subscribed ? 'on' : 'off'}
                        </div>
                      </div>
                      <Pill tone={a.status === 'active' ? 'green' : 'warm'} dot={a.status === 'active'}>{a.status}</Pill>
                      <DisconnectButton id={a.id} />
                    </div>
                  );
                })}
                <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                  <a href="/api/meta/oauth"><Button kind="default" size="sm" icon={<I.Plus size={13} />} type="button">Connect another</Button></a>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 0 }}>
                  Synapse needs to read your Instagram DMs and send replies. We use Meta's official Instagram Messaging API — your account stays in your control and you can disconnect anytime.
                </p>
                <a href="/api/meta/oauth"><Button kind="primary" size="sm" icon={<I.Sparkle size={13} />} type="button">Connect Instagram</Button></a>
              </>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Credits" sub="Pay-as-you-go AI usage" right={<Pill>1$ = ~330 AI replies</Pill>} />
          <CardBody>
            <div className="balance-num">${session.balance_usd.toFixed(2)}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 4 }}>current balance</div>
            <TopupForm />
            {!anthropicConfigured() && (
              <div className="alert warn" style={{ marginTop: 10 }}>
                <I.Bolt size={14} />
                ANTHROPIC_API_KEY not set — AI calls will fail.
              </div>
            )}
            {!serviceRoleConfigured() && (
              <div className="alert error" style={{ marginTop: 10 }}>
                <I.X size={14} />
                SUPABASE_SERVICE_ROLE_KEY missing — top-ups and AI won't work.
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card style={{ marginTop: 12 }}>
        <CardHeader title="Recent transactions" sub="Last 8 entries on the credit ledger" />
        <CardBody>
          {(recentLedger ?? []).length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '12px 0' }}>No transactions yet.</div>
          ) : (
            recentLedger!.map((row) => (
              <div key={row.id} className="row">
                <span className="k" style={{ flex: 'none', width: 80 }}>{row.kind}</span>
                <span style={{ flex: 1, fontSize: 12.5 }}>{row.description ?? '—'}</span>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{new Date(row.created_at).toLocaleString()}</span>
                <span className="v" style={{ fontVariantNumeric: 'tabular-nums', color: Number(row.amount_usd) < 0 ? '#FF6E63' : '#5DEFA5', fontWeight: 600, minWidth: 70, textAlign: 'right' }}>
                  {Number(row.amount_usd) >= 0 ? '+' : ''}${Number(row.amount_usd).toFixed(4)}
                </span>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}
