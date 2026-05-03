# noKhaos Synapse

> AI-powered Instagram automation and conversion engine. The "nervous system" of a brand's social presence — handling DM flows, lead qualification, funnel routing, and analytics.

Apple-style dark UI · vibrant green accent · live AI throughout.

---

## Stack

| Layer       | Tech                                                              |
|-------------|-------------------------------------------------------------------|
| Frontend    | Next.js 15 (App Router) + React 19 + TypeScript + Tailwind        |
| Auth + DB   | Supabase (Postgres 17 + Auth + RLS) — `eu-west-1`                |
| AI          | Anthropic Claude (Sonnet 4.6 default) with token-metered credits  |
| Integration | Meta Graph API v21 (Instagram Business Messaging)                 |
| Hosting     | Vercel (web) · Render (worker) · Supabase (DB)                    |

```
┌──────────────┐     OAuth      ┌────────────┐
│   Vercel     │ ─────────────► │   Meta     │
│  (Next.js)   │ ◄───webhook────│ Graph API  │
└──────┬───────┘                └────────────┘
       │            ┌──────────────┐
       │            │   Render     │
       │            │  (Worker)    │
       │            └──────┬───────┘
       │                   │
       └─────────► Supabase Postgres ◄────┘
                  (RLS + ledger + queue)
```

---

## Local setup

```bash
git clone <this-repo>
cd nokhaos-synapse
npm install
cp .env.example .env.local   # then paste your keys
npm run dev
```

You'll need at least:

- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY` (from your Supabase dashboard → Project Settings → API)
- `ANTHROPIC_API_KEY` (from [console.anthropic.com](https://console.anthropic.com))
- `META_APP_ID` + `META_APP_SECRET` + `META_VERIFY_TOKEN` (after following [docs/meta-app-setup.md](docs/meta-app-setup.md))

---

## Project layout

```
.
├── app/                    Next.js App Router
│   ├── (app)/              Authenticated app shell
│   │   ├── dashboard/      Neural dashboard
│   │   ├── flow/           Visual flow builder
│   │   ├── inbox/          Inbox Intelligence (DMs)
│   │   ├── analytics/      Analytics Vault
│   │   ├── audiences/      AI-built segments
│   │   ├── links/          Smart Links (AI-routed short URLs)
│   │   └── settings/       Workspace, Meta connect, credits
│   ├── login/  signup/     Auth pages
│   ├── auth/callback/      Email confirm callback
│   ├── api/
│   │   ├── auth/           Auth helper routes
│   │   ├── meta/oauth/     Start OAuth + handle callback
│   │   ├── meta/webhook/   Receive Meta webhook events
│   │   ├── ai/reply/       Generate an AI reply (charges credits)
│   │   ├── credits/topup/  Manual top-up (replace with Stripe)
│   │   └── health/         Liveness probe
│   └── l/[slug]/           Smart-link redirect (public)
├── components/             Sidebar, Topbar, TopbarRouter
├── lib/
│   ├── icons.tsx  primitives.tsx  sample-data.ts
│   ├── auth.ts             getCurrentSession()
│   ├── env.ts              Zod-validated env
│   ├── anthropic.ts        Metered Claude wrapper
│   ├── ai/dm-agent.ts      Classify intent · generate reply
│   ├── meta/               Meta Graph API helpers
│   └── supabase/           server / browser / admin clients
├── worker/                 Render worker (webhook processor)
│   ├── src/
│   │   ├── index.ts        Polls webhook_events, runs AI, http /health
│   │   ├── processWebhook.ts
│   │   ├── anthropic.ts    Mirror of metered call wrapper
│   │   └── db.ts env.ts
│   └── package.json
├── supabase/migrations/    (Schema is also captured in MCP — see Provisioning below)
├── docs/meta-app-setup.md  Step-by-step Meta App + permissions
├── render.yaml             Render Blueprint for the worker
├── middleware.ts           Auth guard
└── README.md  .env.example .gitignore
```

---

## Credit system

- Every Claude call goes through `meteredCall()` which:
  1. Pre-checks `credit_balances.balance_usd > 0` for the org
  2. Runs the Anthropic call
  3. Computes the **real Anthropic cost** from token usage (input / output / cache read / cache write)
  4. Multiplies by `CREDIT_MARKUP` (default `2.0`)
  5. Records an `ai_calls` row + atomic ledger entry via the `spend_credits` RPC
- **Atomic spend** is a Postgres function (`SECURITY DEFINER`) that updates the balance + writes the ledger row in a single transaction. Insufficient balance raises before the call is made.
- New users get `SIGNUP_FREE_CREDITS_USD` (default `$5`) on first login.
- Top-ups are currently a dev-only endpoint (`/api/credits/topup`) — wire to Stripe before going live.

---

## Provisioning (one-off)

This repo was bootstrapped against:

- **Supabase project**: `nokhaos-synapse` (id `vixqkgfjlnnaoafztwqf`, region `eu-west-1`)
- **Schema migrations**: applied via Supabase MCP — `init_schema` and `rls_policies`. To re-apply on a fresh project, the SQL is in this README under "Schema source" and can be pasted into the Supabase SQL editor.

To deploy elsewhere:

```bash
# Supabase
supabase projects create nokhaos-synapse --region eu-west-1 --org <your-org>
# then run the two migrations against the new project (use the SQL editor or `supabase db push`)

# Vercel
vercel --prod                            # links + deploys

# Render (worker)
# Push to GitHub, then Blueprint deploy from the dashboard pointed at this repo (uses render.yaml)
```

---

## Roadmap

- [ ] Stripe-backed credit top-ups (replace `/api/credits/topup`)
- [ ] Send AI replies automatically (currently saved as suggestions for human review)
- [ ] Real audience builder (currently sample data)
- [ ] Smart-link short domain (currently `/l/<slug>`)
- [ ] Long-lived token refresh job (60-day Meta tokens)
- [ ] App Review submission for production-mode Meta App
