---
name: qa-bugs
description: Triage QA bug reports from the Throngwatch Notion bug-tracker — list open bugs, read a report, investigate it in code, and (after confirmation) set Статус/Priority back in Notion. Usage — /qa-bugs to list open bugs, /qa-bugs BUG-N to triage one. Reads + writes Notion via the claude.ai Notion connector; run it in the MAIN session.
---

# QA bug triage — Throngwatch Notion bug-tracker

Reads tester bug reports from the Notion QA workspace and helps triage them.
**Run in the MAIN session** — the claude.ai Notion connector (`notion-fetch`,
`notion-update-page`, …) lives there; subagents don't reliably inherit it, so do
not route this to an agent.

## Notion entities (IDs)

| Entity | ID |
|---|---|
| Hub page "🧪 Throngwatch QA" | `382c174355f98110a563f132adceedb3` |
| Database "🐞 Баг-репорти" | `f6e30c83c53143de978290376bc6acf8` |
| Data source (queries / create-page) | `921e6642-4b61-46bf-bbab-884f1871f67b` |

Schema source of truth: [docs/qa/bug-reporting-and-best-practices.md](docs/qa/bug-reporting-and-best-practices.md).
If a field below disagrees with that doc, the doc wins — update this skill.

## Schema essentials

- **Title** = `Заголовок`. Auto-id `Тікет` (prefix `BUG-`).
- **Статус** (select) — workflow ladder:
  `Новий → Підтверджено → У роботі → Виправлено → Перевірено`,
  plus side/terminal states `Потрібна інфа`, `Не виправляємо`, `Дублікат`.
- **Severity** (S1–S4) — set by the **tester** (impact). Triage does **not** overwrite it.
- **Priority** (P1–P4) — set by the **owner** (when/whether we fix). This is what triage assigns.
- Context fields: `Розділ`, `Частота` (Завжди/Іноді), `Середовище` (dev/prod/local),
  `Передумови`, `Кроки відтворення`, `Очікуваний результат`, `Фактичний результат`,
  `Браузер / ОС`, `Акаунт`, `Сервер / обʼєкт`, `Додатково`, `Посилання`, `Докази`.

**"Open"** = `Статус` NOT in {`Перевірено`, `Не виправляємо`, `Дублікат`}.

## `/qa-bugs` (no arg) — list open bugs

1. `notion-fetch` the database `f6e30c83c53143de978290376bc6acf8` to read its rows.
   (Fallback if results are paginated/sparse: `notion-search` scoped to the hub page.)
2. Filter to **open** (see above). Sort by Severity (S1 first), then most recently created.
3. Print a compact table: `Тікет · Заголовок · Статус · Severity · Priority · Розділ · Середовище`.
4. Call out what needs owner action:
   - `Новий` → untriaged (needs Статус + Priority),
   - `Потрібна інфа` → stalled on the tester,
   - `Виправлено` → awaiting verification.
5. Offer next step: `triage BUG-N`, or "investigate the top untriaged".

## `/qa-bugs BUG-N` — triage one report

1. Resolve `BUG-N` → its page id (from the list above, or `notion-search`), then
   `notion-fetch` the page in full.
2. **Investigate in code first.** Read the actual source for the area named in `Розділ`
   (honor the behavior-verification mandate — trace route→service→query / render path;
   don't trust the report's guess). Decide: reproduces / plausible / not-a-bug per the
   "what is NOT a bug" section of `docs/qa/bug-reporting-and-best-practices.md`.
3. Propose, **with reasoning**:
   - a **Статус** transition (e.g. `Новий → Підтверджено`, or `→ Дублікат` / `→ Не виправляємо` / `→ Потрібна інфа`),
   - a **Priority** (P1–P4) derived from Severity × `Частота` × scope — not Severity alone,
   - if it's real and small, a fix plan with the concrete `file:line`.
4. **Confirm before writing.** Show the exact field deltas and wait for an explicit "ok".
5. On confirm: `notion-update-page` to set `Статус` (and `Priority` if assigning).
   Leave `Severity` untouched (tester-owned). Optionally add a `notion-create-comment`
   with the triage note (what you found + where in the code).

## Guardrails

- **Never** write `Статус`/`Priority` without an explicit confirmation in the same turn.
- **Never** paste Discord message content, tokens, or customer PII into Notion.
- If a report lacks repro steps or environment, propose `Потрібна інфа` rather than guessing.
- The Notion form/template is half-built via API; don't try to edit views or the form
  here — that's a Notion-UI task (see memory `project_notion_qa_bug_tracker`).
