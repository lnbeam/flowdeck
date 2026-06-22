---
description: 'Chain-of-Verification (standard) — fact-check response with prompt-based isolation'
allowed-tools: Read(*), Glob(*), Grep(*)
argument-hint: '[--quick] question or topic to verify'
---

# CoVe — Standard Verification

Run the Chain-of-Verification process to fact-check a response using prompt-based isolation within a single turn.

**Cost:** ~3-5x base tokens (full) / ~2-3x (quick) | **Isolation:** Best-effort (mental reset)

## Input

The user provides either:

- A question to answer and verify: `/cove What is the time complexity of Timsort?`
- A quick spot check: `/cove --quick Is Timsort O(n log n) worst-case?`
- No argument (verify the most recent response in conversation)

## Parse Flags

Extract from `$ARGUMENTS`:

- `--quick` → Lightweight mode: 1-2 questions only, targeting the single most uncertain claim
- Everything else → The question to verify

## Pre-check: Is CoVe the right tool?

Before starting, quickly assess whether CoVe is needed:

- Can this be verified by running `pnpm typecheck`, `pnpm test`, or reading a file in `apps/` or `packages/`? → Do that instead.
- Is this a simple lookup in a config, Prisma schema, or doc? → Just read the source.
- Is the answer subjective? → CoVe can't help. Answer directly.

If a simpler verification exists, skip CoVe and use it. State why briefly.

## Process

Follow the 4-step CoVe workflow from `.claude/skills/cove/cove-process.md`:

### Step 1: Initial Response

Generate a complete, confident baseline answer. Do not hedge.

### Step 2: Verification Questions

- **Full mode:** Create 3-5 targeted questions covering factual claims, logical reasoning, completeness, and precision.
- **Quick mode:** Create 1-2 questions targeting the single most uncertain or impactful claim.

### Step 3: Independent Verification

**MENTAL RESET: Forget the initial response. Answer each question from first principles.**

For each question:

- Reason independently — do NOT reference Step 1
- If the question involves codebase facts (e.g. a route in `apps/api/`, a model in `packages/db/prisma/schema.prisma`, a DTO in `packages/shared/`), use Read/Grep/Glob to check the actual source
- Provide a clear verdict: CONFIRMED, REFUTED, or UNCERTAIN

Note: Standard mode has inherent confirmation bias (initial response is still in context). A REFUTED verdict here is strong signal — the error was obvious enough to overcome bias.

### Step 4: Reconciliation

Compare verification results against the initial response:

- CONFIRMED claims: Keep as-is
- REFUTED claims: Correct with evidence
- UNCERTAIN claims: Add caveats

## Output Format

```markdown
## Initial Response

[Baseline answer]

## Verification Questions

1. [Question]
2. [Question]
3. [Question]

## Verification Results

### Q1: [Question]

**Finding:** [Independent reasoning]
**Verdict:** CONFIRMED | REFUTED | UNCERTAIN

### Q2: [Question]

...

## Verification Summary

- Confirmed: X/Y claims
- Refuted: [list corrections]
- Uncertain: [list caveats]

## Final Verified Response

[Revised answer with all corrections applied]

## Verification Cost

- **Mode:** Standard (full | quick)
- **Questions:** N verification questions
- **Estimated cost:** ~Nx base response tokens
```

---

**Now begin the CoVe process for: $ARGUMENTS**
