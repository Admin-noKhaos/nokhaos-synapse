'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { I } from '@/lib/icons';
import { Avatar, Card, CardHeader, CardBody, Button, Pill } from '@/lib/primitives';
import { ACCENTS, type AccentKey } from '@/lib/theme';
import { useTheme } from '@/components/ThemeProvider';

type Tab = 'account' | 'voice' | 'connections' | 'billing' | 'appearance' | 'team';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'account',     label: 'Account',     icon: <I.Settings size={14} /> },
  { id: 'voice',       label: 'Brand voice', icon: <I.Brain    size={14} /> },
  { id: 'connections', label: 'Connections', icon: <I.Link     size={14} /> },
  { id: 'billing',     label: 'Billing',     icon: <I.Coin     size={14} /> },
  { id: 'appearance',  label: 'Appearance',  icon: <I.Sun      size={14} /> },
  { id: 'team',        label: 'Team',        icon: <I.Layers   size={14} /> },
];

export function SettingsClient(props: {
  initialTab: string;
  meta_connected_flash: boolean;
  meta_error: string | null;
  session: {
    userName: string; userEmail: string;
    orgName: string; orgPlan: string; orgRole: string; followers: number;
    balanceUsd: number; brain: string;
  };
  flags: { meta: boolean; anthropic: boolean; service_role: boolean };
  metaAccounts: { id: string; username: string | null; page_name: string | null; status: string; webhook_subscribed: boolean; account_type: string | null }[];
  ledger: { id: string; kind: string; amount_usd: number; description: string | null; created_at: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = (TABS.find((t) => t.id === props.initialTab)?.id ?? 'account') as Tab;
  const [tab, setTab] = useState<Tab>(initial);

  useEffect(() => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set('tab', tab);
    router.replace(`/settings?${sp.toString()}`, { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <div className="sx-page sx-fade-in">
      <style>{`
        .sx-page { padding: 24px 28px 60px; max-width: 1200px; margin: 0 auto; }
        .sx-page-hd { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom: 22px; gap: 24px; }
        .stg-grid { display:grid; grid-template-columns: 200px 1fr; gap: 24px; }
        .stg-tabs { display: flex; flex-direction: column; gap: 2px; position: sticky; top: 24px; align-self: flex-start; }
        .stg-tab { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 8px; border: 0; background: transparent; cursor: pointer; color: var(--text-2); font-size: 13px; text-align: left; }
        .stg-tab:hover { background: rgba(255,255,255,0.04); color: var(--text); }
        html[data-theme='light'] .stg-tab:hover { background: rgba(0,0,0,0.04); }
        .stg-tab.active { background: rgba(var(--accent-rgb), 0.10); color: var(--text); }
        .stg-tab.active .stg-tab-icon { color: var(--accent-1); }
        .stg-tab-icon { color: var(--text-3); display: inline-flex; }
        .alert { padding: 10px 12px; border-radius: 10px; margin-bottom: 12px; font-size: 12.5px; display: flex; align-items: center; gap: 10px; }
        .alert.success { background: rgba(52,224,138,0.10); border: 0.5px solid rgba(52,224,138,0.30); color: #5DEFA5; }
        .alert.error { background: rgba(255,69,58,0.12); border: 0.5px solid rgba(255,69,58,0.4); color: #FF6E63; }
        .alert.warn  { background: rgba(255,159,10,0.10); border: 0.5px solid rgba(255,159,10,0.30); color: #FFB340; }
        .row { display:flex; align-items:center; gap: 10px; padding: 10px 0; border-bottom: 0.5px solid var(--hairline); }
        .row:last-child { border-bottom: 0; }
        .row .k { color: var(--text-3); font-size: 12px; flex: 1; }
        .row .v { font-size: 12.5px; }
        .swatch-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 8px; }
        .swatch { aspect-ratio: 1; border-radius: 14px; cursor: pointer; border: 2px solid transparent; position: relative; transition: transform 120ms var(--ease); }
        .swatch:hover { transform: scale(1.04); }
        .swatch.active { border-color: var(--accent-light); box-shadow: 0 0 0 4px rgba(var(--accent-rgb), 0.2); }
        .swatch .name { position: absolute; bottom: 8px; left: 0; right: 0; text-align: center; font-size: 11px; font-weight: 600; color: rgba(0,0,0,0.7); text-shadow: 0 1px 0 rgba(255,255,255,0.3); }
        @media (max-width: 800px) { .stg-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div className="sx-page-hd">
        <div>
          <h1 className="sx-page-h1">Settings</h1>
          <p className="sx-page-sub">{props.session.orgName} · {props.session.orgPlan}</p>
        </div>
      </div>

      {props.meta_connected_flash && <div className="alert success"><I.Check size={14} /> Instagram connected.</div>}
      {props.meta_error && <div className="alert error"><I.X size={14} /> Meta: {props.meta_error}</div>}

      <div className="stg-grid">
        <div className="stg-tabs">
          {TABS.map((t) => (
            <button key={t.id} className={'stg-tab' + (tab === t.id ? ' active' : '')} onClick={() => setTab(t.id)}>
              <span className="stg-tab-icon">{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        <div>
          {tab === 'account' && <AccountTab session={props.session} />}
          {tab === 'voice' && <VoiceTab brain={props.session.brain} />}
          {tab === 'connections' && <ConnectionsTab metaAccounts={props.metaAccounts} flags={props.flags} />}
          {tab === 'billing' && <BillingTab balanceUsd={props.session.balanceUsd} ledger={props.ledger} role={props.session.orgRole} flags={props.flags} />}
          {tab === 'appearance' && <AppearanceTab />}
          {tab === 'team' && <TeamTab orgName={props.session.orgName} />}
        </div>
      </div>
    </div>
  );
}

function AccountTab({ session }: { session: { userName: string; userEmail: string; orgName: string; orgPlan: string; orgRole: string; followers: number } }) {
  return (
    <Card>
      <CardHeader title="Profile" sub="Your account info" />
      <CardBody>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
          <Avatar name={session.userName} size={48} online />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{session.userName}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{session.userEmail}</div>
          </div>
        </div>
        <div className="row"><span className="k">Workspace</span><span className="v">{session.orgName}</span></div>
        <div className="row"><span className="k">Plan</span><span className="v"><Pill tone="green">{session.orgPlan}</Pill></span></div>
        <div className="row"><span className="k">Role</span><span className="v" style={{ textTransform: 'capitalize' }}>{session.orgRole}</span></div>
        <div className="row"><span className="k">IG followers</span><span className="v">{session.followers.toLocaleString()}</span></div>
        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
          <Button kind="ghost" size="sm" onClick={async () => { await fetch('/api/auth/signout', { method: 'POST' }); window.location.href = '/login'; }}>
            <I.LogOut size={13} /> Sign out
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function VoiceTab({ brain }: { brain: string }) {
  return (
    <Card>
      <CardHeader title="Brand voice" sub="The master doc that grounds every AI reply" />
      <CardBody>
        <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 14 }}>
          The master doc is the single source of truth for your AI agent. Everything in there — voice, products, pricing, common objections, do&apos;s &amp; don&apos;ts — gets injected into every AI call as context.
        </div>
        <div className="row">
          <span className="k">Length</span><span className="v">{brain.trim().split(/\s+/).filter(Boolean).length.toLocaleString()} words</span>
        </div>
        <div className="row">
          <span className="k">Last updated</span><span className="v">{brain ? 'recently' : 'never'}</span>
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <Link href="/brain" style={{ textDecoration: 'none' }}>
            <Button kind="primary" size="sm" icon={<I.Brain size={13} />}>Edit master doc</Button>
          </Link>
          <Link href="/playground" style={{ textDecoration: 'none' }}>
            <Button kind="default" size="sm" icon={<I.Sparkle size={13} />}>Open AI test chat</Button>
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}

function ConnectionsTab({ metaAccounts, flags }: { metaAccounts: { id: string; username: string | null; page_name: string | null; status: string; webhook_subscribed: boolean; account_type: string | null }[]; flags: { meta: boolean; anthropic: boolean } }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function disconnect(id: string) {
    if (!confirm('Disconnect this Instagram account?')) return;
    setBusy(id);
    const r = await fetch('/api/meta/disconnect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setBusy(null);
    if (r.ok) router.refresh();
  }

  return (
    <>
      <Card>
        <CardHeader title="Instagram" sub="Connected accounts via Instagram Login" right={metaAccounts.length ? <Pill tone="green" dot>{metaAccounts.length} connected</Pill> : <Pill tone="cold">Not connected</Pill>} />
        <CardBody>
          {!flags.meta && <div className="alert warn"><I.Bolt size={14} />Meta App not configured. See <code>docs/meta-app-setup.md</code>.</div>}
          {metaAccounts.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 12.5 }}>
              <Link href="/api/meta/oauth"><Button kind="primary" size="sm" icon={<I.Sparkle size={13} />} type="button">Connect Instagram</Button></Link>
            </div>
          ) : (
            <>
              {metaAccounts.map((a) => (
                <div key={a.id} className="row">
                  <Avatar name={a.username || 'IG'} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>@{a.username ?? '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{a.account_type ?? a.page_name ?? '—'} · webhooks {a.webhook_subscribed ? 'on' : 'off'}</div>
                  </div>
                  <Pill tone={a.status === 'active' ? 'green' : 'warm'} dot={a.status === 'active'}>{a.status}</Pill>
                  <Button kind="ghost" size="sm" disabled={busy === a.id} onClick={() => disconnect(a.id)} title="Disconnect"><I.X size={13} /></Button>
                </div>
              ))}
              <div style={{ marginTop: 12 }}>
                <Link href="/api/meta/oauth"><Button kind="default" size="sm" icon={<I.Plus size={13} />} type="button">Connect another</Button></Link>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <CardHeader title="AI provider" sub="Anthropic Claude" right={<Pill tone={flags.anthropic ? 'green' : 'cold'} dot={flags.anthropic}>{flags.anthropic ? 'configured' : 'missing key'}</Pill>} />
        <CardBody>
          <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5 }}>
            Synapse uses Anthropic&apos;s Claude models for every AI call (classify, reply, playground). Token usage is metered and charged from your credit balance.
          </div>
        </CardBody>
      </Card>
    </>
  );
}

function BillingTab({ balanceUsd, ledger, role, flags }: { balanceUsd: number; ledger: { id: string; kind: string; amount_usd: number; description: string | null; created_at: string }[]; role: string; flags: { service_role: boolean } }) {
  const router = useRouter();
  const [amount, setAmount] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function topup() {
    setBusy(true); setError(null);
    const r = await fetch('/api/credits/topup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount_usd: amount }),
    });
    setBusy(false);
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setError(d.detail || d.error || `HTTP ${r.status}`);
      return;
    }
    router.refresh();
  }

  return (
    <>
      <Card>
        <CardHeader title="Credits" sub="Pay-as-you-go AI usage" />
        <CardBody>
          <div style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
            ${balanceUsd.toFixed(2)}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 4 }}>current balance</div>
          {role === 'owner' || role === 'admin' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>$</span>
              <input className="sx-input" type="number" min={1} max={1000} step={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} style={{ width: 90 }} />
              <Button kind="primary" size="sm" onClick={topup} disabled={busy || amount <= 0}>{busy ? 'Adding…' : 'Add credits'}</Button>
              {error && <span style={{ fontSize: 11, color: '#FF6E63' }}>{error}</span>}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 12 }}>Only owners and admins can top up.</div>
          )}
          {!flags.service_role && (
            <div className="alert error" style={{ marginTop: 12 }}><I.X size={14} />SUPABASE_SERVICE_ROLE_KEY not set in env — top-ups will fail.</div>
          )}
        </CardBody>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <CardHeader title="Recent transactions" sub="Last 10 entries on the credit ledger" />
        <CardBody>
          {ledger.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '12px 0' }}>No transactions yet.</div>
          ) : (
            ledger.map((row) => (
              <div key={row.id} className="row">
                <span className="k" style={{ flex: 'none', width: 80 }}>{row.kind}</span>
                <span style={{ flex: 1, fontSize: 12.5 }}>{row.description ?? '—'}</span>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{new Date(row.created_at).toLocaleString()}</span>
                <span className="v" style={{ fontVariantNumeric: 'tabular-nums', color: row.amount_usd < 0 ? '#FF6E63' : '#5DEFA5', fontWeight: 600, minWidth: 70, textAlign: 'right' }}>
                  {row.amount_usd >= 0 ? '+' : ''}${row.amount_usd.toFixed(4)}
                </span>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </>
  );
}

function AppearanceTab() {
  const { prefs, setAccent, setMode } = useTheme();
  return (
    <>
      <Card>
        <CardHeader title="Theme" sub="Dark or light mode" />
        <CardBody>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setMode('dark')} style={{
              flex: 1, padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
              background: prefs.mode === 'dark' ? 'rgba(var(--accent-rgb),0.10)' : 'var(--surface-2)',
              border: '0.5px solid ' + (prefs.mode === 'dark' ? 'rgba(var(--accent-rgb),0.4)' : 'var(--hairline)'),
              color: 'var(--text)', textAlign: 'left',
            }}>
              <I.Moon size={18} /><div style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>Dark</div>
            </button>
            <button onClick={() => setMode('light')} style={{
              flex: 1, padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
              background: prefs.mode === 'light' ? 'rgba(var(--accent-rgb),0.10)' : 'var(--surface-2)',
              border: '0.5px solid ' + (prefs.mode === 'light' ? 'rgba(var(--accent-rgb),0.4)' : 'var(--hairline)'),
              color: 'var(--text)', textAlign: 'left',
            }}>
              <I.Sun size={18} /><div style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>Light</div>
            </button>
          </div>
        </CardBody>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <CardHeader title="Accent color" sub="Threads through every surface — sidebar, charts, glows, gradients" />
        <CardBody>
          <div className="swatch-grid">
            {(Object.keys(ACCENTS) as AccentKey[]).map((k) => {
              const a = ACCENTS[k];
              return (
                <button
                  key={k}
                  className={'swatch' + (prefs.accent === k ? ' active' : '')}
                  style={{ background: a.grad }}
                  onClick={() => setAccent(k)}
                  aria-label={a.label}
                  title={a.label}
                >
                  <span className="name">{a.label}</span>
                </button>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </>
  );
}

function TeamTab({ orgName }: { orgName: string }) {
  return (
    <Card>
      <CardHeader title="Team" sub="Invite teammates to this workspace" right={<Pill>1 member</Pill>} />
      <CardBody>
        <div className="row">
          <Avatar name="You" size={32} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>You</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Owner of {orgName}</div>
          </div>
          <Pill tone="green">owner</Pill>
        </div>
        <div style={{ marginTop: 14, padding: 14, background: 'var(--surface-2)', border: '0.5px solid var(--hairline)', borderRadius: 10, fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5 }}>
          Multi-seat invitations + role-based permissions (owner / admin / agent / viewer) coming soon.
        </div>
      </CardBody>
    </Card>
  );
}
