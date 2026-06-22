---
description: Full-stack technical audit across 20 quality dimensions with evidence verification — covers Fastify API, Prisma/DB, discord.js bot, Next.js web, shared DTOs, monorepo boundaries, security, and ESM/TS strictness
allowed-tools: Read(*), Bash(*), Glob(*), Grep(*), Agent(*), WebSearch(*)
argument-hint: '[category to focus on, e.g. "security" or "architecture,performance"]'
---

# Full-Stack Technical Audit — throngwatch monorepo

Analyze the monorepo (`apps/` + `packages/`) across 20 quality dimensions. Produce a scored report with strengths, weaknesses, and actionable recommendations. Low scores are verified via counterexample search to prevent false negatives.

## Usage

```bash
/tech-audit                                    # Full audit (all 20 categories)
/tech-audit security                           # Deep-dive into one category
/tech-audit architecture,performance           # Multiple categories
/tech-audit --no-verify                        # Skip evidence verification (faster)
```

## Parse Flags

Extract from `$ARGUMENTS`:

- `--no-verify` → Skip Phase 3 (evidence audit pass). Faster but may miss counterevidence.
- Everything else → Category filter (comma-separated). Empty = all 20 categories.

## Scoring Scale

| Score | Label     | Meaning                                    |
| ----- | --------- | ------------------------------------------ |
| 5     | Excellent | Industry best practice, nothing to improve |
| 4     | Good      | Solid, minor improvements possible         |
| 3     | Okay      | Acceptable, several improvements needed    |
| 2     | Weak      | Below standard, significant gaps           |
| 1     | Poor      | Critical issues, requires immediate action |

## Category Weights

Not all categories have equal impact. Use these weights for the weighted overall score.

| Weight | Categories                                                                                              |
| ------ | ------------------------------------------------------------------------------------------------------- |
| 3      | Architecture, Security, Code Quality                                                                    |
| 2      | Performance, Maintainability, Test Coverage, Dependencies, DB & Prisma                                  |
| 1      | Scalability, DevOps, Design System, Code Health, Documentation, i18n, Responsive, Monorepo Boundaries, Bot Quality, DTO Discipline, ESM/TS Strictness, Community Fit |

**Overall Score** = Σ(score × weight) / Σ(weights), rounded to 1 decimal.

---

## Phase 1: Automated Metrics Collection

Collect raw data ONCE upfront. These metrics feed multiple categories — do not re-run the same commands in individual categories.

### 1A: Run all metric commands in parallel

Launch these bash commands in parallel. Store results mentally for Phase 2.

**File counts & sizes:**

```bash
# Source file count across all workspaces (excluding .d.ts and generated)
find apps packages \( -name "*.ts" -o -name "*.tsx" \) \
  -not -name "*.d.ts" \
  -not -path "*/node_modules/*" \
  -not -path "*/dist/*" \
  -not -path "*/generated/*" \
  -not -path "*/.next/*" | wc -l

# Files over 300 lines
find apps packages \( -name "*.ts" -o -name "*.tsx" \) \
  -not -name "*.d.ts" \
  -not -path "*/node_modules/*" \
  -not -path "*/dist/*" \
  -not -path "*/generated/*" \
  -not -path "*/.next/*" \
  | xargs wc -l 2>/dev/null | awk '$1 > 300 {print}' | sort -rn | head -15

# Test file count
find apps packages \( -name "*.spec.ts" -o -name "*.spec.tsx" -o -name "*.test.ts" -o -name "*.test.tsx" \) \
  -not -path "*/node_modules/*" | wc -l
```

**Code smells:**

```bash
# `any` type usage (count + examples)
grep -rn ": any\b\|as any\b\|<any>" --include="*.ts" --include="*.tsx" \
  apps/ packages/ \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=generated | wc -l
grep -rn ": any\b\|as any\b\|<any>" --include="*.ts" --include="*.tsx" \
  apps/ packages/ \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=generated | head -15

# @ts-ignore / @ts-expect-error / eslint-disable
grep -rn "@ts-ignore\|@ts-expect-error\|eslint-disable" --include="*.ts" --include="*.tsx" \
  apps/ packages/ \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=generated | wc -l
grep -rn "@ts-ignore\|@ts-expect-error\|eslint-disable" --include="*.ts" --include="*.tsx" \
  apps/ packages/ \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=generated | head -10

# console.log in production code (excluding test files)
grep -rn "console\.\(log\|warn\|error\|debug\)" --include="*.ts" --include="*.tsx" \
  apps/ packages/ \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=generated \
  | grep -v "\.spec\.\|\.test\." | wc -l
grep -rn "console\.\(log\|warn\|error\|debug\)" --include="*.ts" --include="*.tsx" \
  apps/ packages/ \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=generated \
  | grep -v "\.spec\.\|\.test\." | head -10

# TODO/FIXME/HACK/XXX
grep -rn "TODO\|FIXME\|HACK\|XXX" --include="*.ts" --include="*.tsx" \
  apps/ packages/ \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=generated | wc -l
grep -rn "TODO\|FIXME\|HACK\|XXX" --include="*.ts" --include="*.tsx" \
  apps/ packages/ \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=generated | head -10

# Default exports (against named-export convention)
grep -rn "^export default" --include="*.ts" --include="*.tsx" \
  apps/ packages/ \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=generated | head -15

# dangerouslySetInnerHTML (XSS risk)
grep -rn "dangerouslySetInnerHTML" --include="*.tsx" apps/ --exclude-dir=node_modules --exclude-dir=.next | wc -l

# Non-null assertions
grep -rn "[^!]![^=!]" --include="*.ts" --include="*.tsx" \
  apps/ packages/ \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=generated | wc -l
```

**Monorepo boundary checks:**

```bash
# Direct @prisma/client imports in apps/ (should import @throngwatch/db instead)
grep -rn "from ['\"]@prisma/client['\"]" --include="*.ts" --include="*.tsx" \
  apps/ --exclude-dir=node_modules --exclude-dir=dist

# Cross-package leakage: apps importing each other directly
grep -rn "from ['\"]\.\.\/\.\.\/" --include="*.ts" --include="*.tsx" \
  apps/ --exclude-dir=node_modules --exclude-dir=dist | head -15

# Prisma generated client imported directly in bot or web
grep -rn "@prisma/client" --include="*.ts" \
  apps/bot/ apps/web/ apps/landing/ apps/agent/ \
  --exclude-dir=node_modules --exclude-dir=dist | head -10
```

**Security checks:**

```bash
# Potential hardcoded secrets
grep -rn "password\s*=\s*['\"][^'\"]\|secret\s*=\s*['\"][^'\"]\|api_key\s*=\s*['\"][^'\"]\|token\s*=\s*['\"][^'\"]" \
  --include="*.ts" --include="*.tsx" apps/ packages/ \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=generated | head -20

# .env files gitignored
grep -n "\.env" .gitignore 2>/dev/null | head -10

# process.env access without validation (outside config files)
grep -rn "process\.env\." --include="*.ts" \
  apps/ packages/ \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=generated | head -20
```

**Fastify API checks:**

```bash
# Routes without auth preHandler
grep -rn "fastify\.get\|fastify\.post\|fastify\.put\|fastify\.delete\|fastify\.patch" \
  --include="*.ts" apps/api/ --exclude-dir=node_modules --exclude-dir=dist | wc -l

# Raw SQL queries (potential injection risk)
grep -rn "\$queryRaw\|prisma\.\$queryRaw\|\$executeRaw" --include="*.ts" \
  apps/ packages/ --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=generated | head -10

# Missing request schema validation
grep -rn "schema:" --include="*.ts" apps/api/ --exclude-dir=node_modules | wc -l
```

**Discord.js bot checks:**

```bash
# GatewayIntentBits usage
grep -rn "GatewayIntentBits\|Intents" --include="*.ts" apps/bot/ \
  --exclude-dir=node_modules --exclude-dir=dist | head -15

# Event handlers that do heavy work synchronously
grep -rn "client\.on\|client\.once" --include="*.ts" apps/bot/ \
  --exclude-dir=node_modules --exclude-dir=dist | wc -l

# Missing rate limit handling
grep -rn "RateLimitError\|rateLimitRetry\|429" --include="*.ts" apps/bot/ \
  --exclude-dir=node_modules --exclude-dir=dist | head -10
```

**Dependencies:**

```bash
pnpm audit --audit-level=moderate 2>&1 | tail -30
pnpm outdated 2>&1 | head -30
```

**Lint & typecheck:**

```bash
pnpm lint 2>&1 | tail -30
pnpm typecheck 2>&1 | tail -30
```

### 1B: Read key configuration files

Read these in parallel (use Read tool, not cat):

- `pnpm-workspace.yaml`
- `package.json` (root — scripts, engines, devDependencies)
- `turbo.json` or `turbo.config.ts` (if exists)
- `tsconfig.json` (root) and each `apps/*/tsconfig.json`
- `apps/api/src/` — top-level entry (e.g. `server.ts` or `app.ts`)
- `apps/bot/src/` — top-level entry
- `apps/web/` — `next.config.ts` / `next.config.mjs`
- `packages/db/prisma/schema.prisma`
- `packages/shared/src/index.ts` (or similar barrel)
- `.eslintrc.*` / `eslint.config.mjs` (root or per-app)
- `.prettierrc`
- `.gitlab-ci.yml` or `.github/workflows/*.yml` (if exists)
- `docker-compose.yml` or `Dockerfile` (if exists)

---

## Phase 2: Category Analysis

Analyze each category using collected metrics + targeted code exploration. Launch **4 parallel agent batches**, then synthesize "Overall" after all complete.

### Agent Batch 1: Architecture & Monorepo Health

**Categories: 1. Architecture, 6. Scalability, 16. Monorepo Boundaries**

These share concerns about workspace organization, dependency graph, and structural integrity.

#### 1. Architecture

- Monorepo structure: do `apps/` and `packages/` have clear single responsibilities?
- `packages/shared` DTO discipline: does it export only serializable types, no runtime-heavy code?
- `packages/db` isolation: is the Prisma client exposed only through `@throngwatch/db`, never leaked?
- `packages/ingestion` purpose and boundaries clear?
- `apps/api` route organization: feature-based or flat? Route file size?
- `apps/web` App Router structure: route groups, server vs client components default, layout nesting?
- `apps/bot` command/event handler separation?
- `apps/agent` (Electron): main/renderer process boundary respected?
- Cross-cutting concerns (logging, config) — shared or duplicated?

#### 6. Scalability

- Can new Discord commands be added without touching core bot files?
- Can new API routes be added without touching existing route files?
- State management in `apps/web`: TanStack Query scope, server actions vs fetch?
- Can `packages/shared` accommodate new DTO shapes without breaking consumers?
- Worker / queue patterns for heavy ingestion tasks?

#### 16. Monorepo Boundaries

- No direct `@prisma/client` imports in `apps/` other than `packages/db` (from Phase 1 grep)
- No app importing another app's source directly
- Workspace deps declared as `"workspace:*"` in each `package.json`
- `packages/shared` exports no Node-only or browser-only APIs that break cross-environment consumers
- ESM-only enforced: no `require()` / `__dirname` / CommonJS patterns leaking in

### Agent Batch 2: API, DB & Security

**Categories: 2. Code Quality, 7. Security, 8. Maintainability, 10. DevOps & CI/CD, 18. DB & Prisma**

#### 2. Code Quality

- ESLint config active rules — any missing for Fastify / Node / ESM context?
- Naming conventions: route handlers, service functions, DTOs
- `eslint-disable` and `@ts-ignore` usage — count AND list each with context (from Phase 1)
- Files >500 lines
- `any` type count and worst offenders (from Phase 1)
- Default exports count (from Phase 1)

#### 7. Security

- `.env` files gitignored? (from Phase 1)
- Hardcoded secrets in source? (from Phase 1)
- `process.env` access validated through a config module (Zod/env-var), not scattered raw usage?
- Fastify: CORS configured correctly? Helmet or security headers present?
- Auth: JWT verification on every protected route? Scope/role checks?
- `$queryRaw` usage — SQL injection risk? (from Phase 1)
- `dangerouslySetInnerHTML` usage in web? (from Phase 1)
- Discord bot: token stored only in env, never logged?
- Rate limiting on API endpoints?
- Input validation: Fastify JSON schema or Zod on all routes?

#### 8. Maintainability

- Codebase consistency across apps (same patterns, same error handling style)?
- Dead code: TODO/FIXME/HACK count and context (from Phase 1)
- File size distribution — any god files?
- Complexity: deeply nested async chains in bot event handlers?
- How easy is it to onboard a new developer?

#### 10. DevOps & CI/CD

- CI pipeline exists? (`.gitlab-ci.yml`, `.github/workflows/`)
- CI runs: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`?
- Docker setup for Postgres + apps?
- `pnpm db:migrate` in CI before tests?
- Pre-commit/pre-push hooks?
- Environment configs for staging/production?
- Turbo or build caching configured?
- Playwright E2E in CI (`:3100`/`:4100`)?

#### 18. DB & Prisma

- Schema: models named in PascalCase singular? Relations explicit with `@relation`?
- All foreign keys have `onDelete` / `onUpdate` cascade semantics defined?
- Indexes on high-cardinality filter/sort columns?
- N+1 query risks: `include` / `select` used instead of separate queries in loops?
- `findMany` without `take` / pagination on large tables?
- Aggregate-on-write patterns vs read-path aggregation for counters (e.g. message counts per channel)?
- Migrations: are all migrations committed? No schema drift between `schema.prisma` and migrations folder?
- Seed file exists and is idempotent?
- Prisma client singleton pattern (not instantiated per-request)?

### Agent Batch 3: Bot, Performance & DTO Discipline

**Categories: 9. Performance, 17. Bot Quality, 19. DTO Discipline, 14. Code Health**

#### 9. Performance

- `apps/web`: Next.js `cache()` accessors on server components? `unstable_cache` for dynamic data?
- Server components as default; `"use client"` only where interactivity needed?
- `apps/web`: `<Image>` component vs raw `<img>`? Font loading strategy?
- `apps/api`: read-path budget — are expensive aggregations done at write time or cached?
- `apps/bot`: event handlers offload heavy work to async tasks, not blocking the gateway loop?
- Recharts bundle: dynamic-imported or included in server bundle?
- Large static imports that should be dynamic?

#### 17. Bot Quality

- Intent declarations: only requesting intents actually used?
- `Partials` declared for events that may arrive on uncached objects?
- Event handlers: each handler has a single responsibility, short body?
- Error handling: uncaught promise rejections from event handlers caught globally?
- Command registration: slash commands registered via REST, not on every login?
- Sharding: planned or implemented for scale?
- Rate limit handling: exponential backoff or discord.js built-in handling relied upon?
- Message content intent: privileged intent used only if truly needed?

#### 19. DTO Discipline

- `packages/shared` exports only serializable plain types (interfaces/type aliases), no class instances?
- Every API response shape defined in `@throngwatch/shared`, not inline in route handlers?
- DTOs versioned or forward-compatible?
- `apps/bot` and `apps/agent` consume the same DTOs from shared — no local type re-declarations?
- No Prisma model types (`Prisma.UserGetPayload<...>`) leaking into `@throngwatch/shared`?

#### 14. Code Health (SonarQube-like)

- `any` type count (from Phase 1)
- Suppression comments count (from Phase 1)
- Non-null assertions (`!`) count (from Phase 1)
- Console.log in production (from Phase 1)
- Empty catch blocks
- Magic numbers/strings (Discord channel IDs hardcoded in source?)
- Functions >50 lines
- Async functions without try/catch

### Agent Batch 4: UI, Docs, Testing & ESM Strictness

**Categories: 3. Dependencies, 4. Documentation, 5. Test Coverage, 11. Community Fit, 12. Component Duplication, 13. Design System, 15. i18n / Responsive, 20. ESM/TS Strictness**

#### 3. Dependencies

- Major deps up to date? (discord.js, Fastify, Next.js, Prisma, TypeScript)
- Deprecated packages?
- `pnpm audit` results (from Phase 1)
- `pnpm outdated` results (from Phase 1)
- Lock file (`pnpm-lock.yaml`) committed?
- Duplicate functionality across apps (multiple date libs, multiple HTTP clients)?
- Peer dep conflicts?

#### 4. Documentation

- `CLAUDE.md` coverage: architecture, commands, conventions, subagent routing?
- `.claude/rules/` files: present, accurate, non-contradictory?
- Complex business logic (ingestion pipeline, analytics aggregation) documented?
- `packages/db/prisma/schema.prisma` — models have `///` doc comments?
- README per workspace (especially `packages/shared`, `packages/db`)?

#### 5. Test Coverage

- Vitest configured at root or per-workspace?
- Test file count vs source file count (from Phase 1)
- `apps/api` tests: Fastify `inject` harness used? No real port binding?
- Critical paths covered: auth middleware, route validation, DB mutations?
- Bot command handlers unit tested with mock interactions?
- Playwright E2E: what flows are covered? (`:3100`/`:4100`)
- Test utilities or fixtures (`prisma.$transaction` rollback per test)?

#### 11. Community Fit

- Tech stack mainstream for a Discord analytics SaaS?
- Libraries well-maintained (discord.js active, Fastify 5 current, Prisma current)?
- Would new hires be familiar with the patterns?
- Custom abstractions that increase onboarding time?

#### 12. Component Duplication

- Repeated JSX patterns across `apps/web` views
- Near-identical Recharts chart wrappers that should be shared
- Similar Fastify route handler logic repeated across endpoints
- Similar Discord command handlers with duplicated boilerplate

#### 13. Design System & Styles

- `apps/web`: shadcn/ui (new-york style) used consistently?
- Theme compliance: all colors from CSS variables/tokens — no hardcoded hex in `.tsx`?
- `cn()` usage consistency
- Spacing consistency
- Dark mode support?
- Inline styles (`style={{`)
- Recharts theming aligned with shadcn tokens?

#### 15. i18n / Responsive

- Hardcoded user-facing strings in `.tsx` files?
- `apps/web`: breakpoint usage (`sm:` `md:` `lg:`)?
- Mobile-first approach?
- Tables / charts responsive on mobile?
- Fixed widths that break on smaller viewports?

#### 20. ESM/TS Strictness

- All `package.json` files have `"type": "module"`?
- No `require()` / `module.exports` in `.ts` files?
- No `__dirname` / `__filename` (use `import.meta.url` + `fileURLToPath` instead)?
- `tsconfig.json` root and per-workspace: `"strict": true`, `"noUncheckedIndexedAccess": true`?
- `"moduleResolution": "bundler"` or `"node16"` / `"nodenext"` (not legacy `"node"`)?
- Path aliases consistent across workspaces?
- No CommonJS interop hacks (`createRequire`, `esModuleInterop` abused)?

### After all batches complete: Overall Feedback

Synthesize findings from all 19 scored categories into an overall assessment. This MUST run after all agent batches return. Compute the weighted overall score.

---

## Phase 3: Evidence Audit Pass

**Skip this phase if `--no-verify` flag is present.**

After scoring all categories, run a counterexample search for the **3 lowest-scoring categories**. This fights confirmation bias by actively searching for evidence that would RAISE each score.

### Why counterexample search, not CoVe

Audit findings are empirically derived (grep results, file reads). The real risk is **incomplete evidence sampling**, not hallucinated facts. CoVe verifies claims against themselves — counterexample search finds what the initial analysis missed.

### Verification process

For each of the 3 lowest-scoring categories:

**Step 1 — Evidence gap check:** Review what files/patterns were examined. Identify what was NOT examined that could be relevant. Ask: "What evidence would raise this score?"

**Step 2 — Counterexample search:** Spawn an Explore sub-agent to search specifically for **score-raising evidence**. Frame the search positively.

**Sub-agent prompt template:**

```
You are auditing a full-stack TypeScript monorepo (pnpm, ESM-only, Fastify 5 API,
discord.js bot, Next.js App Router web, Prisma ORM, Vitest tests).

Category: [CATEGORY NAME]
Current score: [X]/5 — [LABEL]
Reasoning: [WHY IT SCORED LOW]

Your job is to find COUNTEREVIDENCE — things the codebase does WELL in this category
that may have been overlooked. Search for:
[2-3 specific positive patterns to look for]

Report:
1. Counterevidence found (with file paths, line numbers)
2. Counterevidence significance: HIGH / MEDIUM / LOW
3. Should the score change? If so, what score and why?
```

**Step 3 — Score adjustment:** If significant counterevidence is found, adjust the score with an annotation explaining the revision.

### Output format

```markdown
## Evidence Audit Pass

### [Category 1] — Score: X/5

**Evidence gap:** [What wasn't examined]
**Counterevidence found:**
- [Finding with file paths] — Significance: HIGH/MEDIUM/LOW
**Score adjustment:** None | X → Y (reason)

### [Category 2] — Score: X/5
...

### [Category 3] — Score: X/5
...

### Verification Cost
- **Categories verified:** 3
- **Sub-agents spawned:** 3 (Explore)
- **Estimated overhead:** ~1.5x per-category analysis cost
```

---

## Phase 4: Write Report to File

**MANDATORY**: Write report to `.claude/tech-audits/YYYY-MM-DD-HH-MM[-scope].md`.

### Report format

```markdown
# Full-Stack Technical Audit Report

**Project:** throngwatch monorepo
**Date:** {date}
**Scope:** {full audit / specific categories}
**Evidence verified:** Yes / Skipped (--no-verify)

## Summary

| Category               | Weight | Score        | Key Issue                            |
| ---------------------- | ------ | ------------ | ------------------------------------ |
| Architecture           | 3      | X. Label     | ...                                  |
| Code Quality           | 3      | X. Label     | ...                                  |
| Security               | 3      | X. Label     | ...                                  |
| Performance            | 2      | X. Label     | ...                                  |
| Maintainability        | 2      | X. Label     | ...                                  |
| Test Coverage          | 2      | X. Label     | ...                                  |
| Dependencies           | 2      | X. Label     | ...                                  |
| DB & Prisma            | 2      | X. Label     | ...                                  |
| Scalability            | 1      | X. Label     | ...                                  |
| DevOps & CI/CD         | 1      | X. Label     | ...                                  |
| Monorepo Boundaries    | 1      | X. Label     | ...                                  |
| Bot Quality            | 1      | X. Label     | ...                                  |
| DTO Discipline         | 1      | X. Label     | ...                                  |
| ESM/TS Strictness      | 1      | X. Label     | ...                                  |
| Code Health            | 1      | X. Label     | ...                                  |
| Documentation          | 1      | X. Label     | ...                                  |
| Community Fit          | 1      | X. Label     | ...                                  |
| Component Duplication  | 1      | X. Label     | ...                                  |
| Design System          | 1      | X. Label     | ...                                  |
| i18n / Responsive      | 1      | X. Label     | ...                                  |
| **Weighted Overall**   |        | **X.X Label**|                                      |

## Detailed Findings

### 1. Architecture — X. Label

**Strengths:**
- {concrete finding with file paths}

**Weaknesses:**
- {concrete finding with file paths}

**Recommendations:**
1. {actionable item with effort estimate: S/M/L}

{repeat for all audited categories}

## Evidence Audit Results

{Include full verification output from Phase 3, or "Skipped (--no-verify)" if flag was set}

## Priority Action Items

### Critical (Score 1-2)
1. {highest impact fix} — **Effort:** S/M/L

### Important (Score 3)
1. {improvement} — **Effort:** S/M/L

### Nice to Have (Score 4)
1. {polish item} — **Effort:** S/M/L

## Metrics Snapshot

| Metric                        | Value |
| ----------------------------- | ----- |
| Source files (all workspaces) | N     |
| Test files                    | N     |
| `any` type usages             | N     |
| Suppression comments          | N     |
| console.log in prod           | N     |
| TODO/FIXME/HACK               | N     |
| Files >300 lines              | N     |
| pnpm audit vulnerabilities    | N     |
| Direct @prisma/client leaks   | N     |
| dangerouslySetInnerHTML       | N     |
| Non-null assertions (!)       | N     |
```

---

## Phase 5: Update Summary Table

Append a row to `.claude/tech-audits/summary.md` with the date, scope, all 20 scores, weighted overall, and top pro/con.

---

## Delta Comparison

If previous audits exist in `.claude/tech-audits/summary.md`, add a **Delta** section to the report showing score changes:

```markdown
## Delta from Previous Audit ({previous date})

| Category            | Previous | Current | Change |
| ------------------- | -------- | ------- | ------ |
| Architecture        | 3        | 4       | +1 ↑   |
| Security            | 2        | 2       | —      |
| DB & Prisma         | 3        | 4       | +1 ↑   |
| ...                 |          |         |        |
| **Overall**         | 3.1      | 3.5     | +0.4 ↑ |
```

---

## Guidelines

- **Be specific**: cite file paths, line counts, command outputs — never describe patterns without evidence
- **Be honest**: don't inflate scores — a 3 is fine, most projects have mostly 3s
- **Be actionable**: every weakness must have a concrete recommendation with effort estimate (S/M/L)
- **Be efficient**: use parallel agents for data collection, reference Phase 1 metrics instead of re-running
- **Scope searches**: exclude `node_modules/`, `dist/`, `.next/`, `generated/`, `.claude/`
- **Fight confirmation bias**: the evidence audit pass exists because initial analysis tends to find problems and miss strengths
- **Use shared metrics**: Phase 1 data feeds multiple categories — never run the same grep twice
- **Monorepo context**: distinguish findings by workspace (`apps/api`, `apps/bot`, `apps/web`, `packages/db`, etc.) — do not blur issues across workspaces
- **ESM discipline**: treat any CommonJS pattern (`require`, `__dirname`, `module.exports`) as a defect in this project
