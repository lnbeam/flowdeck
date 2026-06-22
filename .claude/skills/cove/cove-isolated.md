# CoVe Isolated Process

The isolated Chain-of-Verification workflow uses Claude Code's Task tool to spawn independent sub-agents for true factored verification. Sub-agents have zero context about the initial answer, ensuring genuine independence.

## Characteristics

- **Token cost:** ~8-15x base tokens
- **Isolation:** True (sub-agents have zero context about initial answer)
- **Speed:** Parallel execution minimizes latency
- **Best for:** High-stakes accuracy, codebase verification

## Flags

| Flag             | Effect                                                                 |
| ---------------- | ---------------------------------------------------------------------- |
| `--explore`      | Use Explore agent for codebase verification                            |
| `--haiku`        | Use haiku model for faster/cheaper verification                        |
| `--quick`        | Lightweight mode: 1-2 questions only (~4-6x tokens instead of ~8-15x) |
| `--agent=<name>` | Use custom agent type                                                  |

Flags can be combined: `--quick --explore`, `--quick --haiku`

## Step-by-Step Workflow

### Step 1: Initial Response

Same as standard process — generate a complete baseline answer.

**Output format:**

```
## Initial Response

[Full answer to the question]
```

### Step 2: Generate Verification Questions

Create targeted, **self-contained** verification questions (answerable without any context from the initial response).

- **Full mode:** 3-5 questions
- **Quick mode (`--quick`):** 1-2 questions targeting the single most uncertain claim

**Self-containment rules:**

- Include all necessary context in the question itself
- Reference specific file paths, function names, or concepts directly (e.g. `packages/db/prisma/schema.prisma`, `apps/api/src/routes/`, `packages/shared/src/`)
- Do NOT say "the claim above" or "as mentioned" — the sub-agent has no "above"

**Output format:**

```
## Verification Questions

1. [Self-contained question targeting claim X]
2. [Self-contained question targeting claim Y]
3. [Self-contained question targeting claim Z]
```

### Step 3: Spawn Verification Sub-Agents

For each verification question, create an independent Task using the Task tool. All tasks run in parallel.

**Task prompt template:**

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

**Sub-agent configuration based on flags:**

- Default: `subagent_type: "code"` (standard Claude Code agent)
- `--explore`: `subagent_type: "explore"` (Explore agent with codebase search)
- `--haiku`: `model: "claude-haiku-4-5-20251001"` (faster/cheaper)
- `--agent=<name>`: Use specified agent type

**Execution:**

1. Create all Task instances in parallel (one per verification question)
2. Poll tasks for completion
3. Collect all results

**Output format:**

```
## Sub-Agent Verification

### Task 1: [Question summary]
**Status:** Complete
**Agent finding:** [Result from sub-agent]
**Confidence:** HIGH | MEDIUM | LOW
**Verdict:** CONFIRMED | REFUTED | UNCERTAIN

### Task 2: [Question summary]
[... same format]
```

### Step 4: Reconciliation

Same as standard process — compare findings, produce revised answer.

**Additional considerations for isolated mode:**

- Sub-agent findings carry more weight than standard mode (true isolation)
- If a sub-agent REFUTES with HIGH confidence, strongly consider revising
- If sub-agents disagree with each other, flag the conflict explicitly
- Include sub-agent task IDs for traceability

**Output format:**

```
## Verification Summary

- **Confirmed:** N/M claims verified (with confidence levels)
- **Refuted:** List corrections with sub-agent evidence
- **Uncertain:** List caveats (LOW confidence findings)
- **Conflicts:** Any disagreements between sub-agents

## Final Verified Response

[Revised answer incorporating all verification findings]
```

## Example

**User:** `/cove-isolated --explore How does the ingestion pipeline process incoming Discord events?`

**Step 1:** Generate initial response about how `packages/ingestion` processes Discord gateway events based on current knowledge.

**Step 2:** Generate self-contained questions:

1. "In the monorepo at the current working directory, what files under `packages/ingestion/src/` implement event processing? List file paths and the main exported functions or classes."
2. "In the monorepo at the current working directory, how does the ingestion package handle message create events from the Discord gateway? What transformation or persistence steps occur before data reaches the Prisma client in `packages/db`?"
3. "In the monorepo at the current working directory, what happens when the ingestion pipeline encounters an error — is there retry logic, dead-letter handling, or does it fail silently? Reference specific files and line numbers."

**Step 3:** Spawn 3 Explore sub-agents in parallel, each answering one question by searching `apps/`, `packages/ingestion/`, and `packages/db/` independently.

**Step 4:** Reconcile sub-agent findings with initial response, correcting any inaccuracies about file paths, function names, Prisma models, or event-handling behavior.

## Cost Tracking

Always append this section to the output:

```
## Verification Cost

- **Mode:** Isolated (full | quick)
- **Questions:** N verification questions
- **Sub-agents:** N spawned (type: code | explore)
- **Model:** default | haiku
- **Estimated cost:** ~Nx base response tokens
```
