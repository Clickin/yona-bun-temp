# Controls-row fallback retirement — 2026-07-20

## Scope

This bounded cleanup retires only the unreachable
`.row-fluid .controls-row [class*="span"] + [class*="span"]` declaration from
`frontend/src/app.css`. A complete current React/JSX and legacy-view inventory
found no `.controls-row` consumer. The frozen Bootstrap rule and generated
legacy fallback remain unchanged for legacy/plugin output.

## Evidence

- Frozen source: `yona-original/public/bootstrap/css/bootstrap.css:375`.
- Generated fallback: `frontend/public/legacy-assets/stylesheets/legacy-fallback.css:378`.
- Removed app-owned declaration: `frontend/src/app.css`.
- Focused contracts: `frontend/tests/stylex-controls-row-fallback.e2e.ts` and
  `frontend/tests/legacy-fallback-off.e2e.ts`.

## Verification

- Normal managed Playwright: 1/1 passed.
- `VITE_DISABLE_LEGACY_FALLBACK=1` managed Playwright: 1/1 passed.
- No TSX, frozen source, generated fallback asset, or geometry baseline changed.

Global fallback discovery remains incomplete/non-green; this report makes no
claim of full fallback retirement.
