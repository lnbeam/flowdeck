# test_automation — Senior Automation Assessment

A short, high-quality prototype for a "Senior Automation" task: a **visually polished
dashboard wired to a real n8n automation workflow**, with a live (or simulated-live)
connection, deployed publicly (Vercel).

**Current concept:** *EnrollDeck* — a coding-bootcamp **admissions lead funnel**.
Prospective-student leads are scored 0–100 by enrollment intent → classified
Hot/Warm/Cold → routed to Senior Advisor / SDR nurture / Email nurture. Same polarity
as a sales funnel (higher score = hotter buyer). Scoring lives in `lib/scoring.ts` and
is mirrored byte-for-byte in the n8n Code node (`n8n/build-workflow.mjs`).

## Goal / deliverables

- Polished dashboard / internal-tool UI.
- A real automation/workflow component (**n8n** preferred) — exported as JSON.
- A live or simulated-live connection between the workflow and the dashboard
  (n8n `HTTP Request` node → dashboard ingest endpoint).
- Meaningful stats, charts, counters, status indicators, logs, activity feed.
- Publicly deployed URL (Vercel) + workflow export + short English video walkthrough.
- **Mock / test data only.** No real client data, no real emails/WhatsApp sent.

## Stack (intended)

- **Dashboard:** Next.js (App Router) + TypeScript, deployed on **Vercel**.
- **Store:** in-memory, process-local (no external service). On serverless this is
  per-instance / ephemeral — fine for the prototype; `lib/store.ts` keeps an async
  API so a real store could drop in later.
- **Automation:** n8n (run locally via Docker for the demo; export JSON committed).
- Connection: n8n → `POST /api/ingest` (shared `x-ingest-token`). A built-in
  simulator keeps the deployed URL alive when n8n isn't actively firing.

> Note: n8n itself cannot run on Vercel (it's a stateful long-running server).
> Vercel hosts the dashboard only; n8n runs locally (Docker) or on n8n.cloud/Railway.

## Working agreement

- Engineering mode: concise, no role-play. Verify changes (`npm run build`) before
  claiming done. Use mock data only.
- Commit/push only when asked. If deploying, the Vercel login is the user's step
  (no credentials are taken). No external store to provision.

## Available subagents (`.claude/agents/`)

Copied from the discord-analytics workspace. **Several reference that project's
monorepo** (throngwatch, Sentry, pnpm, `apps/web`, `@throngwatch/shared`) — treat
those references as inspiration, not literal paths here.

| Agent | Use for | Note |
| --- | --- | --- |
| `nextjs-shadcn-frontend` | Next.js App Router pages, shadcn/ui, Recharts charts | Tuned to their `apps/web` + Tailwind v4 |
| `ui-ux-designer` | Visual design, layout, polish | generic |
| `ui-ux-reviewer` | Design QA / review pass | generic |
| `code-reviewer` | Pre-merge correctness/security review | generic |
| `research-analyst` | Research / comparisons | generic |
| `business-adviser` | Product framing / positioning | generic |
| `fastify-api-engineer` | API design patterns | Fastify-specific; we use Next API routes |

## Available skills (`.claude/skills/`)

- `gsap-*` (core, react, timeline, scrolltrigger, performance, utils, plugins,
  frameworks) — animation polish for the dashboard.
- `cove` — Chain-of-Verification self-checking (`/cove`, `/cove-isolated`).
- `qa-bugs` — systematic QA pass.

Commands in `.claude/commands/`: `/check`, `/tech-audit`, `/cove`, `/cove-isolated`.
