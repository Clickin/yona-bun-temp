# Fallback-off report: error-wrap retirement (2026-07-21)

## Scope

Batch 671 removes the five React-side `.error-wrap` bridge rules from `frontend/src/app.css`. The frozen/generated legacy fallback remains available, reset-password-specific rules remain in `app.css`, and the unreachable `ProjectPostEditNotFoundBody` producer is intentionally outside this retirement.

## Verification

- Focused default-mode retirement E2E: `stylex-error-wrap-fallback-retirement.e2e.ts` — 2 passed.
- Focused fallback-off retirement E2E (`VITE_DISABLE_LEGACY_FALLBACK=1`) — 2 passed.
- The formal assertion in `legacy-fallback-off.e2e.ts` passed in the focused fallback-off run.
- `frontend check`, production build, diff check, frozen-source hash checks, and StyleX verification passed.
- Frozen `_page.less` and `_sprites.less` hashes were unchanged.

## Global fallback-off run

Command:

```text
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend test:e2e:fallback-off
```

The global run was started with fallback disabled and 5 workers. It was stopped manually after test 455 because the existing suite was repeatedly hitting unrelated parity failures and could not complete within a practical execution window. Therefore this is not a green global fallback-off run, and it does not establish completion of the repository-wide fallback retirement gate.

Observed failures were outside the retired `.error-wrap` bridge, including authenticated-home notifications, login/auth aliases, global shell geometry, help TOC, migration, organization screens, project board/code screens, and legacy fallback bridge tests for vtop/search/project-issues consumers. The focused retirement suite and the new static assertion passed before and during this run.

## Follow-up

The remaining global fallback-off failures must be resolved or explicitly reclassified before claiming repository-wide fallback retirement. This batch only records the narrow, reachable `.error-wrap` retirement proof.
