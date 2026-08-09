---
title: Yoram migration wiki log
kind: log
status: active
updated: 2026-08-09
---

# Log

## [2026-08-09] bootstrap | repo-native wiki

Adopted Karpathy's git-native wiki pattern for this repository. `docs/wiki/`
is the agent-maintained navigation/synthesis layer; `AGENTS.md`, `SPEC.md`,
`yona-original/`, and provenance remain canonical evidence. The desktop LLM
Wiki binary is not a project dependency.

## [2026-08-09] baseline | WTR-637 StyleX

Recorded the transitional StyleX state: 91 StyleX modules, 733 focused StyleX
WTR files, `frontend/src/app.css` still imported and 5,247 lines, Select2 still
requires explicit React-owned StyleX coverage, and the final `global.css`
replacement is deferred until F7 residuals and final fallback-off parity are
green.

## [2026-08-09] verification | Select2 focused slice

Fallback-off Chrome focused checks passed for project settings default-branch
Select2 (`stylex-project-setting-default-branch-control.e2e.ts`, 1/1, desktop
and 390px interaction) and project import Select2 (`project-import.e2e.ts`,
8/8). The old ledger rows describing the project-import class spread as an F7
gap are stale on this branch; no selector was removed based on that evidence.

Frontend `tsc --noEmit` passed. `stylex-foundation.spec.ts` passed 4/4; Vitest
reported a non-failing Vite shutdown timeout after the tests completed.

Production frontend build and the StyleX verifier passed. The generated
fallback artifact remained deterministic at SHA-256
`8b437655422bcfe1e612e7320362c3b52e6f65ec43c064dd344e8e7e5de18be6`.

## [2026-08-09] runner | WTR Chrome boundary

Replaced the active WTR `@web/test-runner-playwright` launcher with
`@web/test-runner-chrome` and retained the real-mouse bridge through Chrome's
Puppeteer page. Moved the remaining WTR Page/Locator/Route type imports into
`tests/wtr-compat.ts`, removed WTR `PW_CHANNEL` setup, and verified
`stylex-user-profile-edit-control-classes.e2e.ts` passed 1/1 in system Chrome.
The 214 full-suite residual failures remain documented as open WTR-637 work.

## [2026-08-09] runner | real-data sweep on WTR

Moved `scripts/visual-parity-sweep.mjs`, live route discovery, and legacy
localhost browser seeding to the shared `scripts/wtr-browser.mjs` adapter.
The adapter launches the same installed Chrome through
`@web/test-runner-chrome`, preserves isolated seed contexts, request/response
telemetry, form interactions, screenshots, and local Gravatar interception.
The real-data sweep remains read-only and still serializes legacy-to-local
route discovery where the local target consumes the legacy path list.
