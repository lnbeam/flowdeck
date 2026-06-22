---
description: 'Chain-of-Verification (isolated) — fact-check response with independent sub-agents'
allowed-tools: Read(*), Glob(*), Grep(*), Agent
argument-hint: '[--explore] [--haiku] [--quick] question or topic to verify'
---

# CoVe Isolated — Sub-Agent Verification

Run the Chain-of-Verification process using independent sub-agents for true factored verification. Sub-agents have zero context about the initial answer.

**Cost:** ~8-15x base tokens (full) / ~4-6x (quick) | **Isolation:** True (separate sub-agents)

## Input

The user provides a question with optional flags:

- `/cove-isolated What year was TCP standardized?`
- `/cove-isolated --explore How does the ingestion pipeline process Discord events?`
- `/cove-isolated --haiku What is the space complexity of mergesort?`
- `/cove-isolated --quick --explore What port does the Fastify API bind to?`

## Parse Flags

Extract from `$ARGUMENTS`:

- `--explore` → Use Explore sub-agent type (for codebase questions)
- `--haiku` → Use haiku model for sub-agents
- `--quick` → Lightweight mode: 1-2 questions only
- `--agent=<name>` → Use custom agent type
- Everything else → The question to verify

Flags can be combined: `--quick --explore`, `--quick --haiku`

## Pre-check: Is CoVe the right tool?

Before starting, quickly assess whether CoVe is needed:

- Can this be verified by running `pnpm typecheck`, `pnpm test`, or reading a source file? → Do that instead.
- Is this a simple lookup in a config, Prisma schema (`packages/db/prisma/schema.prisma`), or shared DTO (`packages/shared/`)? → Just read the source.
- Is the answer subjective? → CoVe can't help. Answer directly.

If a simpler verification exists, skip CoVe and use it. State why briefly.

## Process

Follow the 4-step CoVe workflow from `.claude/skills/cove/cove-isolated.md`:

### Step 1: Initial Response

Generate a complete, confident baseline answer. Do not hedge.

### Step 2: Verification Questions

Create **self-contained** questions. Each must be answerable without ANY context from Step 1.

- **Full mode:** 3-5 questions
- **Quick mode:** 1-2 questions targeting the single most uncertain claim

Rules for self-containment:

- Include all necessary context in the question itself
- Reference specific file paths, function names, or concepts directly (e.g. `apps/api/src/routes/`, `packages/db/prisma/schema.prisma`, `packages/ingestion/src/`)
- Never say "the claim above" or "as mentioned"

### Step 3: Spawn Verification Sub-Agents

For each verification question, spawn an independent Agent task **in parallel**.

**Sub-agent prompt template:**

```
You are a fact-checker. Answer the following question accurately and concisely.
Do NOT assume any prior context — answer based solely on your knowledge and
any tools available to you.

Question: [SELF-CONTAINED VERIFICATION QUESTION]

Provide:
1. Your answer with reasoning
2. Confidence level: HIGH / MEDIUM / LOW
3. If this involves code: cite specific file paths and line numbers
```

**Agent configuration:**

- Default: `subagent_type: "code"`
- With `--explore`: `subagent_type: "explore"`
- With `--haiku`: add `model: "claude-haiku-4-5-20251001"`

Launch ALL sub-agents in parallel, then collect results.

### Step 4: Reconciliation

Compare sub-agent findings against the initial response:

- HIGH confidence REFUTED → Strongly revise
- Sub-agent conflicts → Flag explicitly
- All CONFIRMED → Present original with verification note

## Output Format

```markdown
## Initial Response

[Baseline answer]

## Verification Questions

1. [Self-contained question]
2. [Self-contained question]
3. [Self-contained question]

## Sub-Agent Verification

### Agent 1: [Question summary]

**Finding:** [Sub-agent result]
**Confidence:** HIGH | MEDIUM | LOW
**Verdict:** CONFIRMED | REFUTED | UNCERTAIN

### Agent 2: [Question summary]

...

## Verification Summary

- Confirmed: X/Y claims (with confidence levels)
- Refuted: [corrections with sub-agent evidence]
- Uncertain: [caveats from LOW confidence findings]
- Conflicts: [any sub-agent disagreements]

## Final Verified Response

[Revised answer with all corrections applied]

## Verification Cost

- **Mode:** Isolated (full | quick)
- **Questions:** N verification questions
- **Sub-agents:** N spawned (type: code | explore)
- **Model:** default | haiku
- **Estimated cost:** ~Nx base response tokens
```

---

**Now begin the isolated CoVe process for: $ARGUMENTS**
