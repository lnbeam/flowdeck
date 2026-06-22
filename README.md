# EnrollDeck — Admissions Command Center

A visually polished, **live** dashboard wired to a real **n8n** automation workflow
for a **coding-bootcamp admissions funnel**. New prospective-student leads flow
through n8n (validate → score → route), get POSTed to the dashboard, and appear in
real time: KPI counters, charts, a streaming activity feed, and an automation
execution monitor.

> Built for the *Senior Automation* assessment. **Mock / test data only** — no real
> people, no real emails or messages are ever sent.

- **Live demo:** `https://<your-app>.vercel.app` _(add after deploy)_
- **Workflow export:** [`n8n/lead-intake-workflow.json`](n8n/lead-intake-workflow.json)
- **Stack:** Next.js 14 (App Router) · TypeScript · Tailwind + shadcn/ui · Recharts · GSAP · n8n

---

## What it does

EnrollDeck monitors a **course-enrollment lead pipeline** for an online coding
bootcamp. Each incoming prospective-student lead is scored 0–100 by enrollment intent
and classified **Hot / Warm / Cold**, then routed to the right destination
(Senior Advisor / SDR nurture / Email nurture). The dashboard surfaces both the
**business view** (volume, scoring, routing, expected tuition revenue) and the
**automation health view** (execution success rate, run latency, error log) — the two
things an automation engineer actually needs to see.

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
                 │                                             └─► Switch ─► Advisor / SDR /   │  │
                 │                                                          Email (mocked)     │  │
                 └───────────────────────────────────────────────────────────────────────────┘  │
                                                                                                  │  x-ingest-token
                 ┌──────────────────────── Next.js on Vercel ──────────────────────────────┐     │
                 │   /api/ingest  ─►  enrich + store  ─► in-memory store ◄─ /api/snapshot   │ ◄───┘
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

## Run + test the n8n workflow

The dashboard moves on its own (built-in simulator), but the point of the assessment is
the **real n8n → dashboard connection**. This is the exact, tested path. Keep the
dashboard from [Run locally](#run-locally) running on `http://localhost:3000` first.

### 1. Start n8n (Docker Compose)

n8n is a stateful long-running server, so it can't run on Vercel — run it locally. A
[`docker-compose.yml`](docker-compose.yml) is included (n8n + the right env, persistent
volume, `host.docker.internal` mapping):

```bash
docker compose up -d            # n8n at http://localhost:5678
```

Open `http://localhost:5678` and create the owner account (any email + password — a
local login, unrelated to the dashboard).

**By default it targets your LOCAL dashboard** (`http://host.docker.internal:3000`). To
point the **POST to Dashboard** node at your **deployed** dashboard, set `DASHBOARD_URL`
(and `INGEST_TOKEN` if you enabled auth) — via shell env or a `.env` file next to
`docker-compose.yml`:

```bash
DASHBOARD_URL=https://<your-app>.vercel.app docker compose up -d
```

> **Env, not n8n Variables.** The node reads `{{ $env.DASHBOARD_URL }}` and
> `{{ $env.INGEST_TOKEN }}` — process **environment variables** (compose injects them),
> *not* n8n *Variables* (Settings → Variables is a paid feature). That's why
> `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` is set in the compose file. **Both values fall back
> to sensible defaults** if unset: the local dashboard and an empty token (auth off).
>
> **`host.docker.internal`, not `localhost`** — inside the container `localhost` is the
> container itself; `host.docker.internal` reaches your machine (the compose file maps it
> for Linux too). For a deployed dashboard this doesn't apply — it's a public URL.
>
> `docker compose down` stops n8n; the `n8n_data` volume (workflow + account) is kept.

### 2. Import the workflow

n8n → *Overview* → *Workflows* → **Import from File** → select
[`n8n/lead-intake-workflow.json`](n8n/lead-intake-workflow.json).

### 3. Run it

- **On demand** — open the workflow → **Execute Workflow**. Runs the whole chain once.
- **Autonomous** — flip the **Active** toggle (top-right). The *Every 1 min* schedule then
  POSTs a fresh mock lead every minute. CLI equivalent (note the ID from step 2):
  ```bash
  docker exec enrolldeck-n8n n8n update:workflow --active=true --id=<workflow-id>
  docker restart enrolldeck-n8n     # active triggers register on boot
  ```
- **Real webhook** — once the workflow is **Active**, POST a lead to its production URL:
  ```bash
  curl -X POST http://localhost:5678/webhook/lead-intake \
    -H "content-type: application/json" \
    -d '{"name":"Maya Reed","email":"maya.reed@gmail.com","intent":"enroll-now",
         "channel":"referral","industry":"Data Science","employees":6,
         "message":"ready to enroll, do you offer a payment plan?"}'
  ```

### 4. Verify the connection

```bash
curl -s http://localhost:3000/api/health      # note "events": N
# ...trigger the workflow once (any method above)...
curl -s http://localhost:3000/api/health      # "events" incremented by 1
```

You should also see a green **Success** in n8n → *Executions*, and the new lead in the
dashboard's live feed within ~2.5s.

**Prove the ingest path without n8n at all:**

```bash
TARGET=https://<your-app>.vercel.app INGEST_TOKEN=<token> npm run simulate
```

### The flow

1. **Webhook (`POST /lead-intake`)** — external entry point for a real lead, **and**
2. **Schedule (every 1 min)** → **Generate Lead (mock)** — autonomous demo traffic.
3. **Score & Route Lead** (Code) — scores 0–100, sets tier + routing + estimated value
   (identical rules to the dashboard).
4. **POST to Dashboard** (HTTP Request) — `POST {{ $env.DASHBOARD_URL }}/api/ingest` with
   the `x-ingest-token` header. **This is the live connection.**
5. **Route by Tier** (Switch) → **Senior Advisor / SDR Nurture / Email Nurture** —
   routing branch. These destinations are **No-Op nodes** (mocked): per the brief, no
   real CRM writes, emails, or messages are sent. In production these would be CRM /
   calendar-booking / email nodes.

---

## Deploy to Vercel

1. Push this repo to GitHub and **Import** it in Vercel (framework auto-detected:
   Next.js). No external services to configure.
2. *(Optional)* Add env var `INGEST_TOKEN` — any strong secret — to require the
   `x-ingest-token` header on `/api/ingest`. It must match the token on the n8n side.
3. Deploy. Open the URL — it self-seeds 24h of demo traffic and goes live.

> **Store note.** EnrollDeck uses a process-local **in-memory** store — zero setup.
> The dashboard self-seeds on load and the client-side "Live" mode keeps streaming
> while it's open, so the deployed URL always shows moving data. Serverless
> instances are stateless, so data is per-instance and resets on cold starts —
> fine for a prototype/demo. For shared, durable persistence, swap
> [`lib/store.ts`](lib/store.ts) for a real store (Redis/Postgres) behind its
> existing async API.

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
  -d '{"name":"Maya Reed","email":"maya.reed@gmail.com","company":"Career switcher",
       "intent":"enroll-now","channel":"referral","industry":"Data Science","employees":6,
       "message":"ready to enroll, do you offer a payment plan?"}'
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
  store.ts          in-memory event store (swappable async API)
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
- **Real destination nodes** behind feature flags (CRM / calendar-booking / email) with a sandbox toggle.
- **Auth** on the dashboard (currently open) + per-source API keys for ingest.
- **Tests**: unit tests for `scoring.ts`/`snapshot.ts` and a Playwright smoke test.

---

## Built with

Claude Code (scaffolding, components, API, the n8n workflow generator) + n8n for the
automation. **Mock data only** — no real prospects, emails, or messages. In production
this would handle prospect PII under consent / GDPR; none is used here.
