# Issue-state badge fallback-off retirement report — 2026-07-20

## Scope

This formal fallback-retirement batch removes only the React-side issue-state
badge family from `frontend/src/app.css`:

- `.badge[class*="badge-issue-"]` base geometry and `#777` base paint
- open, closed, rejected, merged, and conflict state paints

The complete current React production consumer graph is:

- issue detail: `project-issue-detail-state-badge`
- milestone detail: `milestone-detail-state-badge`
- pull-request overview: `pull-request-detail-badge`

Each consumer keeps the legacy badge element, classes, copy, order, and
surrounding geometry. Colocated StyleX owns the exact declarations from
`yona-original/app/assets/stylesheets/less/_page.less:2898-2910` and
`_variables.less:100-105`.

## Global fallback-off discovery

Command:

```sh
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend test:e2e:fallback-off -- --max-failures=1 --reporter=line
```

The managed wrapper used dynamic ports and ran the full `frontend/tests`
inventory: 2,636 tests discovered. Result: 13 passed, 1 failed, 3
interrupted, and 2,619 not run after the first failure. The first failure was
`tests/global-shell-geometry.e2e.ts:10`, an anonymous public-shell width
delta of 18px against a 1px tolerance; it is a pre-existing global shell
geometry parity gap and does not render an issue-state badge. The interrupted
alias/help tests were consequences of `--max-failures=1`.

Classification: global fallback discovery remains non-green for the existing
shell geometry owner. The badge retirement itself is supported by the focused
normal/fallback-off evidence below; this report does not claim global fallback
unlinking or overall migration completion.

## Focused badge evidence

The managed focused suite covered issue, milestone, pull-request, and formal
fallback-off contracts in desktop/mobile state paths:

```sh
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store exec node scripts/run-playwright-e2e.mjs frontend/tests/stylex-project-issue-detail.e2e.ts frontend/tests/project-milestone-detail.e2e.ts frontend/tests/project-pullrequest-overview.e2e.ts frontend/tests/legacy-fallback-off.e2e.ts --grep "issue detail header owns|milestone state badge|badge maps|badge keeps exact|issue-state badge fallback"
VITE_DISABLE_LEGACY_FALLBACK=1 pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store exec node scripts/run-playwright-e2e.mjs frontend/tests/stylex-project-issue-detail.e2e.ts frontend/tests/project-milestone-detail.e2e.ts frontend/tests/project-pullrequest-overview.e2e.ts frontend/tests/legacy-fallback-off.e2e.ts --grep "issue detail header owns|milestone state badge|badge maps|badge keeps exact|issue-state badge fallback"
```

Both focused runs passed 5/5. They verify exact app.css arm absence, generic
`.badge` retention, frozen LESS and generated fallback retention, all three
stable owners, source mapping, and computed state declarations in the visible
desktop/mobile paths. The generated fallback hash remains
`8b437655422bcfe1e612e7320362c3b52e6f65ec43c064dd344e8e7e5de18be6`; frozen
`yona-original` sources are unchanged.
