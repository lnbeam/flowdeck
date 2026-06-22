---
name: cove
description: 'Chain-of-Verification (CoVe) — self-verification technique that improves response accuracy. Makes the model fact-check its own answers by generating verification questions, answering them independently, and revising the original response.'
allowed-tools: Read, Agent, TaskCreate, TaskGet, TaskOutput
---

# Chain-of-Verification (CoVe)

A verification technique that improves response accuracy by making the model fact-check its own answers. Instead of accepting an initial response at face value, CoVe generates verification questions, answers them independently, and revises the original answer based on findings.

## When to Use

CoVe adds the most value in these scenarios:

**Precision-required questions:**

- Questions containing precision language ("exactly", "precisely", "specific")
- Complex factual questions (dates, statistics, specifications)

**Complex reasoning:**

- Multi-step reasoning chains (3+ logical dependencies)
- Technical claims about APIs, libraries, or version-specific behavior

**Fact-checking scenarios:**

- Historical facts, statistics, or quantitative data
- Technical specifications and API behavior

**High-stakes accuracy:**

- Security-critical code paths or analysis
- Code generation requiring accuracy verification
- Any response where correctness is critical

**Self-correction triggers:**

- When initial response contains hedging language ("I think", "probably", "might be")

## When NOT to Use

Don't reach for CoVe when a simpler verification method exists:

- **Runnable code:** If you can verify by running a test, executing a script, or checking a REPL — just do that. Empirical evidence beats self-verification.
- **Readable source of truth:** If the answer is in a file, doc, or config you can read directly — read it instead of generating verification questions about it.
- **Simple factual lookups:** Single-fact questions ("what port does the Fastify API bind to?") don't need 3-5 verification questions. Just check the config or source.
- **Subjective/opinion questions:** CoVe verifies facts, not preferences. "Which ORM is better?" has no factual answer to verify.
- **Already-verified responses:** If you just ran `pnpm typecheck`, `pnpm test`, or read source code to confirm, adding CoVe is redundant.

**Rule of thumb:** If you can verify in <30 seconds with a tool call, skip CoVe.

## Verification Modes

| Mode           | Command                  | Token Cost  | Isolation                       | Best For                                    |
| -------------- | ------------------------ | ----------- | ------------------------------- | ------------------------------------------- |
| Standard       | `/cove`                  | ~3-5x base  | Best-effort (mental reset)      | Quick fact-checking, cost-sensitive         |
| Standard Quick | `/cove --quick`          | ~2-3x base  | Best-effort                     | Single-claim spot checks                    |
| Isolated       | `/cove-isolated`         | ~8-15x base | True (sub-agents, zero context) | High-stakes accuracy, codebase verification |
| Isolated Quick | `/cove-isolated --quick` | ~4-6x base  | True (sub-agents)               | Fast isolated spot check                    |

## Mode Selection Guide

| Use Case                    | Recommended Mode                            |
| --------------------------- | ------------------------------------------- |
| Quick single-claim check    | `/cove --quick`                             |
| Quick fact-checking         | `/cove`                                     |
| High-stakes accuracy        | `/cove-isolated`                            |
| Codebase verification       | `/cove-isolated --explore`                  |
| Cost-sensitive verification | `/cove --quick` or `/cove-isolated --haiku` |

## Reference Files

| File               | Topic                                                      |
| ------------------ | ---------------------------------------------------------- |
| `cove-process.md`  | Standard CoVe workflow (4-step process within single turn) |
| `cove-isolated.md` | Isolated CoVe workflow (sub-agent factored verification)   |

## Process Overview

All CoVe modes follow 4 steps:

1. **Initial Response** — Generate baseline answer
2. **Verification Questions** — Create 3-5 targeted questions to expose errors (1-2 in `--quick` mode)
3. **Independent Verification** — Answer questions without referencing the original
4. **Reconciliation** — Revise answer based on verification findings

## Cost Tracking

Every CoVe output includes a `## Verification Cost` section at the end showing:

- **Mode** used (standard/isolated, quick/full)
- **Questions** generated (count)
- **Sub-agents** spawned (isolated mode only)
- **Estimated multiplier** over a single-pass answer (e.g., ~3x, ~8x)

## Natural Language Triggers

Recognize these phrases as requests to invoke CoVe:

- "verify this using chain of verification"
- "use CoVe to answer"
- "fact-check your response"
- "double-check this with verification"
- "use self-verification for this"
- "apply chain of verification"
- "verify this answer"

For isolated mode:

- "use isolated verification"
- "verify with sub-agents"
- "use factored verification with isolation"
