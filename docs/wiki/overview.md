---
title: Yoram migration overview
kind: overview
status: active
updated: 2026-08-09
---

# Overview

## Baseline

- Canonical implementation: `frontend/` and Rust crates in the repository
  root.
- Legacy evidence: `yona-original/` only.
- Styling baseline: frozen Yobi LESS import graph plus legacy Bootstrap CSS.
- Frontend StyleX modules: 91 (`*.stylex.ts` at the 2026-08-09 sweep).
- Focused StyleX WTR files: 733 (`*stylex*.e2e.ts` at the same sweep).
- Runtime app stylesheet: `frontend/src/app.css`, 5,247 lines, still in the
  lower `legacy` layer.
- Generated fallback artifact: `frontend/public/legacy-assets/stylesheets/legacy-fallback.css`,
  generated and hash-checked; it is transitional runtime evidence, not a new
  styling source.
- Browser parity runner: `@web/test-runner` with the system-Chrome
  `@web/test-runner-chrome` launcher; specs import Page/Locator/Route only from
  `frontend/tests/wtr-compat.ts`.

## Last documented suite

The last repository-level WTR report recorded `2,835 passed / 213 failed / 5
skipped` after the earlier Phase F baseline. The branch has subsequent F7
fixes, so those numbers are historical until a new full run is completed.

The remaining failures are classified in the ledger as harness investigation,
stale pin, distribution geometry, or genuine app-fix work. F7 residuals are not
zero and therefore the final StyleX lock is open.

The 2026-08-09 WTR boundary slice passed the focused real-mouse CSS test after
removing the WTR-side Playwright launcher, direct Playwright test types, and
`PW_CHANNEL` test environment dependency. Legacy localhost seeding, route
discovery, and the real-data visual sweep now use the shared WTR system-Chrome
adapter as well; the full residual suite is still not a completion claim.

## Working decision

Keep the fallback and `app.css` while a screen is not proven equivalent without
it. Move selectors screen-by-screen to StyleX with explicit legacy source,
owner, focused WTR, and provenance evidence. Select2 is part of the application
surface: its React-owned generated DOM must receive StyleX ownership before the
fallback selector family can be retired.
