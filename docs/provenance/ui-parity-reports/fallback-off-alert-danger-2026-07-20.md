# Fallback-off alert-danger bridge retirement — 2026-07-20

## Scope

Retire only the unreachable `.alert-danger` arms from `frontend/src/app.css`.
Current React and legacy Scala inventories emit `.alert-error` and
`.alert-success`, but no `.alert-danger`; frozen Bootstrap and generated
fallback remain unchanged for legacy/plugin output.

## Evidence

- App-owned declarations: `frontend/src/app.css:1031-1039` (the
  `.alert-danger` branches were removed; `.alert-error` branches remain).
- Frozen source: `yona-original/public/bootstrap/css/bootstrap.css:3856-3863`.
- Generated fallback: `frontend/public/legacy-assets/stylesheets/legacy-fallback.css`.
- Runtime inventory: `rg` over `frontend/src`, `frontend/tests`, and
  `yona-original/app/views` finds no `alert-danger` emitter; active alert
  consumers use `.alert-error`/`.alert-success`.
- Contracts: `frontend/tests/stylex-alert-danger-bridge.e2e.ts` and the
  `alert-danger` assertion in `frontend/tests/legacy-fallback-off.e2e.ts`.

## Verification

The static contract is run in normal and
`VITE_DISABLE_LEGACY_FALLBACK=1` modes. It proves app.css no longer carries
the dead branches, `.alert-error` remains, and frozen/generated fallback still
contains the legacy selector. No TSX, frozen source, generated fallback asset,
or geometry baseline changes are part of this wave.
