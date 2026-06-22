# CoVe Standard Process

The standard Chain-of-Verification workflow runs within a single conversation turn using prompt-based isolation.

## Characteristics

- **Token cost:** ~3-5x base tokens (full) / ~2-3x base tokens (quick)
- **Isolation:** Best-effort (mental reset instructions between steps)
- **Speed:** Faster, single context
- **Best for:** Quick fact-checking, cost-sensitive scenarios

## Quick Mode (`--quick`)

When `--quick` flag is present, use a lightweight verification:

- Generate only **1-2** verification questions (target the single most uncertain claim)
- Skip question categories — focus only on the claim most likely to be wrong
- Shorter output format (no per-question headers, just a bullet list)
- Best for spot-checking a single factual claim

## Step-by-Step Workflow

### Step 1: Initial Response

Generate a complete baseline answer to the user's question. Do not hold back or hedge — answer as fully and confidently as possible. This is the draft to be verified.

**Output format:**

```
## Initial Response

[Full answer to the question]
```

### Step 2: Generate Verification Questions

Analyze the initial response and generate 3-5 targeted verification questions designed to expose potential errors. Good verification questions:

- Target specific factual claims made in the response
- Challenge assumptions or implicit reasoning steps
- Focus on the most impactful claims (if wrong, would change the answer)
- Are independently answerable (don't require the full response context)

**Question categories to consider:**

- **Factual accuracy:** "Is [specific claim] actually true?"
- **Logical consistency:** "Does [conclusion] actually follow from [premise]?"
- **Completeness:** "Are there important cases/exceptions not covered?"
- **Precision:** "Is [number/date/name] exactly correct?"
- **Source validity:** "Is [API/method/behavior] actually how it works in [version]?"

**Output format:**

```
## Verification Questions

1. [Question targeting claim X]
2. [Question targeting claim Y]
3. [Question targeting reasoning step Z]
4. [Question about completeness/edge cases]
5. [Question about precision of specific detail]
```

### Step 3: Independent Verification

**CRITICAL: Mental reset before this step.**

Answer each verification question independently. For each question:

- Reason from first principles, NOT from the initial response
- If the question involves codebase facts (e.g. a Prisma schema field, a Fastify route handler, a shared DTO in packages/shared), use Read/Grep/Glob to verify against the actual source files under apps/ or packages/
- If the question involves external facts, reason carefully and flag uncertainty
- Provide a clear verdict: CONFIRMED, REFUTED, or UNCERTAIN

**Output format:**

```
## Verification Results

### Q1: [Question]
**Finding:** [Independent answer with reasoning]
**Verdict:** CONFIRMED | REFUTED | UNCERTAIN

### Q2: [Question]
**Finding:** [Independent answer with reasoning]
**Verdict:** CONFIRMED | REFUTED | UNCERTAIN

[... repeat for all questions]
```

### Step 4: Reconciliation

Compare verification findings against the initial response. Produce a final, revised answer:

- If all verdicts are CONFIRMED: State that verification passed and present the original answer (minor rewording for clarity is fine)
- If any verdict is REFUTED: Revise the answer to correct the error, clearly noting what changed
- If any verdict is UNCERTAIN: Add appropriate caveats or qualifiers

**Output format:**

```
## Verification Summary

- **Confirmed:** N/M claims verified
- **Refuted:** List any corrections made
- **Uncertain:** List any caveats added

## Final Verified Response

[Revised answer incorporating all verification findings]
```

## Example

**User:** What is the time complexity of Python's sorted() function?

**Step 1 — Initial Response:**
Python's sorted() uses Timsort with O(n log n) worst-case and O(n) best-case time complexity. Space complexity is O(n).

**Step 2 — Verification Questions:**

1. Does Python's sorted() actually use Timsort?
2. Is O(n log n) the correct worst-case for Timsort?
3. Is O(n) the correct best-case for Timsort?
4. Is O(n) the correct space complexity?
5. Has the sorting algorithm changed in recent Python versions?

**Step 3 — Independent Verification:**

1. CONFIRMED — CPython uses Timsort since Python 2.3
2. CONFIRMED — Timsort worst-case is O(n log n)
3. CONFIRMED — Timsort achieves O(n) on already-sorted or nearly-sorted input
4. CONFIRMED — Timsort requires O(n) auxiliary space
5. CONFIRMED — Still Timsort as of Python 3.12+ (Powersort variant of Timsort since 3.11, same complexity)

**Step 4 — Reconciliation:**
All claims confirmed. Minor refinement: note Powersort merge policy since 3.11.

## Isolation Caveat

Standard mode uses prompt-based isolation ("mental reset"). The initial response remains in context, so there is inherent confirmation bias — the model tends to confirm its own claims. This is acceptable for quick checks but means:

- REFUTED verdicts in standard mode carry strong signal (the error was obvious enough to overcome bias)
- CONFIRMED verdicts are weaker than in isolated mode
- For claims where accuracy is critical, prefer `/cove-isolated`

## Cost Tracking

Always append this section to the output:

```
## Verification Cost

- **Mode:** Standard (full | quick)
- **Questions:** N verification questions
- **Estimated cost:** ~Nx base response tokens
```
