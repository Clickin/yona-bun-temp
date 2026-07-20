# Fallback-off report: dead `#experimentalHelp .actrow` bridge

## Scope

Batch 606 removes only the React-side `#experimentalHelp .actrow` display rule
from `frontend/src/app.css`. The current UI-kit route emits no
`#experimentalHelp` node; the legacy help/experimental template remains
historical DOM evidence and frozen assets are unchanged.

## Verification

- `frontend/tests/ui-kit.e2e.ts` static contract passed in normal and
  `VITE_DISABLE_LEGACY_FALLBACK=1` modes.
- `frontend/tests/legacy-fallback-off.e2e.ts` (`experimental-help action bridge`)
  passed in normal and fallback-off modes.
- `frontend/src/app.css` contains no `#experimentalHelp .actrow` selector.
- Frozen `yona-original` CSS/LESS and generated fallback assets were not
  modified.

This is a bounded compatibility-selector retirement; global fallback
discovery remains incomplete.
