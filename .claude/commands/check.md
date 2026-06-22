---
description: Run typecheck across all workspaces and report failures by package.
allowed-tools: Bash
---

Run `pnpm typecheck` from the repo root. This runs `tsc --noEmit` in every workspace package.

If it fails:
- Group failures by package (`@throngwatch/api`, `@throngwatch/web`, etc.).
- For each, quote the first 1-2 errors verbatim and propose the specific fix.
- Don't run `tsc --noEmit` in a single package as a workaround — fix the root cause.

If it passes, just say so and stop.
