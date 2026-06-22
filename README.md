# FlowDeck — Lead Intake Command Center

A visually polished, **live** dashboard wired to a real **n8n** automation workflow.
New leads flow through n8n (validate → score → route), get POSTed to the dashboard,
and appear in real time: KPI counters, charts, a streaming activity feed, and an
automation execution monitor.

> Built for the *Senior Automation* assessment. **Mock / test data only** — no real
> people, no real emails or messages are ever sent.

- **Live demo:** `https://<your-app>.vercel.app` _(add after deploy)_
- **Workflow export:** [`n8n/lead-intake-workflow.json`](n8n/lead-intake-workflow.json)
- **Stack:** Next.js 14 (App Router) · TypeScript · Tailwind + shadcn/ui · Recharts · GSAP · Upstash Redis · n8n

---

## What it does

FlowDeck monitors a **lead-intake automation pipeline**. Each incoming lead is scored
0–100 and classified **Hot / Warm / Cold**, then routed to the right destination
(Senior AE / SDR queue / Nurture). The dashboard surfaces both the **business view**
(volume, scoring, routing, pipeline value) and the **automation health view**
(execution success rate, run latency, error log) — the two things an automation
engineer actually needs to see.

The dashboard is **provably connected to the workflow**, not a static mockup:
the n8n workflow's final node POSTs real payloads to `POST /api/ingest`, and the UI
reflects them within ~2.5s.

---

## Architecture

```
                 ┌─────────────────────────── n8n (real workflow) ──────────────────────────┐
   external      │  Webhook (POST /lead-intake) ─┐                                           │
   lead ───────► │                               ├─► Score & Route (Code) ─► HTTP Request ───┼──┐
                 │  Schedule (every 1m) ─► Gen ───┘            │              POST /api/ingest │  │
                 │                                             └─► Switch ─► Senior AE / SDR /  │  │
                 │                                                          Nurture (mocked)   │  │
                 └───────────────────────────────────────────────────────────────────────────┘  │
                                                                                                  │  x-ingest-token
                 ┌──────────────────────── Next.js on Vercel ──────────────────────────────┐     │
                 │   /api/ingest  ─►  enrich + store  ─►  Upstash Redis  ◄─ /api/snapshot   │ ◄───┘
                 │        ▲                                                      │           │
                 │        │ (same code path)                                     ▼           │
                 │   /api/simulate  ── built-in traffic generator         Dashboard UI       │
                 │                                                        (polls every 2.5s) │
                 └─────────────────────────────────────────────────────────────────────────┘
```

**Key design decision — the deployed URL is never empty.** Real n8n runs on demand
(locally or hosted), but the dashboard also has a built-in **simulator** that uses the
*exact same* enrich + store path as the real ingest endpoint. So an evaluator opening
the live URL always sees moving, near-live data — and in the demo video the real n8n
workflow is triggered to show an actual event landing within seconds.

The scoring logic lives in one place conceptually and is mirrored byte-for-byte in two
runtimes: [`lib/scoring.ts`](lib/scoring.ts) (dashboard) and the **Score & Route** Code
node in the n8n workflow. They always agree.

---

## Run locally

```bash
npm install
cp .env.example .env.local      # the defaults work out of the box
npm run dev                     # http://localhost:3000
```

On first load the dashboard auto-seeds a believable 24h history, then "Live" mode
streams a new lead every few seconds. No database or n8n needed for local dev — it
falls back to an in-memory store.

Optional CLI traffic:

```bash
npm run seed                    # back-fill 48 leads across 24h (via /api/simulate)
npm run simulate                # POST raw leads to /api/ingest every 4s, like n8n does
EVERY_MS=1500 npm run simulate  # faster
```

---

## The n8n workflow

**Import:** n8n → *Workflows* → *Import from File* → select
[`n8n/lead-intake-workflow.json`](n8n/lead-intake-workflow.json).

**Set two variables** (n8n → *Settings* → *Variables*, or env on the n8n host):

| Variable | Value |
| --- | --- |
| `DASHBOARD_URL` | `https://<your-app>.vercel.app` (or `http://localhost:3000`) — no trailing slash |
| `INGEST_TOKEN` | must match the dashboard's `INGEST_TOKEN` |

**The flow:**

1. **Webhook (`POST /lead-intake`)** — external entry point for a real lead, **and**
2. **Schedule (every 1 min)** → **Generate Lead (mock)** — autonomous demo traffic.
3. **Score & Route Lead** (Code) — scores 0–100, sets tier + routing + estimated value
   (identical rules to the dashboard).
4. **POST to Dashboard** (HTTP Request) — `POST {{DASHBOARD_URL}}/api/ingest` with the
   `x-ingest-token` header. **This is the live connection.**
5. **Route by Tier** (Switch) → **Senior AE / SDR Queue / Nurture** — routing branch.
   These destinations are **No-Op nodes** (mocked): per the brief, no real CRM writes,
   emails, or messages are sent. In production these would be CRM / Slack / email nodes.

> n8n is a stateful long-running server, so it cannot run on Vercel. For the demo, run
> it locally (`docker run -it --rm -p 5678:5678 n8nio/n8n`) or host it on n8n.cloud /
> Railway. Only the dashboard is deployed to Vercel.

**Run it without n8n** (to prove the ingest path):

```bash
TARGET=https://<your-app>.vercel.app INGEST_TOKEN=<token> npm run simulate
```

---

## Deploy to Vercel

1. **Upstash Redis** (required on Vercel — serverless is stateless):
   [upstash.com](https://upstash.com) → *Create Redis Database* → copy the
   **REST URL** and **REST Token**.
2. Push this repo to GitHub and **Import** it in Vercel (framework auto-detected:
   Next.js).
3. Add **Environment Variables** in Vercel:
   - `INGEST_TOKEN` — any strong secret
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Deploy. Open the URL — it self-seeds and goes live. `/api/health` shows
   `"backend":"upstash"` once Upstash is wired.

> Optional: a Vercel Cron (Pro) hitting `/api/simulate` keeps data fresh even when
> nobody is viewing. On Hobby, the client-side "Live" mode already keeps it live
> whenever the dashboard is open.

---

## API

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/ingest` | `POST` | **Workflow → dashboard.** Accepts a (raw or enriched) lead; auth via `x-ingest-token`. |
| `/api/snapshot` | `GET` | Full dashboard state the UI polls (KPIs, charts, feed, executions). |
| `/api/simulate` | `GET`/`POST` | Built-in traffic generator. `?n=<1..50>&spreadHours=<0..72>`. |
| `/api/health` | `GET` | Diagnostics — active store backend + event count. |

Example ingest payload:

```bash
curl -X POST https://<your-app>.vercel.app/api/ingest \
  -H "content-type: application/json" \
  -H "x-ingest-token: <token>" \
  -d '{"name":"Maya Reed","email":"maya@northwind.com","company":"Northwind Labs",
       "intent":"demo","channel":"referral","industry":"SaaS","employees":300,
       "message":"budget approved, rolling out this quarter"}'
```

---

## Project structure

```
app/
  api/{ingest,snapshot,simulate,health}/route.ts   API routes
  layout.tsx  page.tsx  globals.css                 dashboard shell + page
components/
  ui/*                                              shadcn/ui primitives
  dashboard-header, kpi-cards, volume-chart,        dashboard widgets
  tier-donut, source-bar, score-funnel,
  live-feed, execution-log, workflow-diagram,
  use-snapshot (polling hook), count-up, reveal
lib/
  scoring.ts        lead scoring + routing (mirrors the n8n Code node)
  event.ts          raw lead → scored LeadEvent + execution metadata
  snapshot.ts       aggregates events → dashboard snapshot
  store.ts          Upstash Redis (REST) with in-memory fallback
  leadgen.ts        synthetic mock-lead generator
  format.ts  types.ts
n8n/
  lead-intake-workflow.json    importable workflow export
  build-workflow.mjs           generator (keeps Code-node JS readable)
scripts/
  seed.mjs  simulate.mjs       CLI traffic helpers
```

---

## What I'd improve with more time

- **Server-Sent Events / WebSocket** instead of 2.5s polling for instant updates.
- **Persisted history + date-range filters** (today / 7d / 30d) backed by a time-series store.
- **Drill-down**: click a lead in the feed → full enrichment detail + n8n execution link.
- **Real destination nodes** behind feature flags (HubSpot/Slack) with a sandbox toggle.
- **Auth** on the dashboard (currently open) + per-source API keys for ingest.
- **Tests**: unit tests for `scoring.ts`/`snapshot.ts` and a Playwright smoke test.

---

## Built with

Claude Code (scaffolding, components, API, the n8n workflow generator) + n8n for the
automation. Mock data only; no real client data, emails, or messages.
