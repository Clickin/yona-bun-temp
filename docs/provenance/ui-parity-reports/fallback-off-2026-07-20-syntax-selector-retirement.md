# Dead syntax selector-family retirement — 2026-07-20

## Scope

This bounded cleanup removes only the unreachable `.syntax-*` selector arms
from `frontend/src/app.css`: comment/quote, keyword, title, params, string,
number, punctuation, meta, and identifier. A repository inventory found no
current React, legacy Scala view, JavaScript, or test consumer for those
classes. Current highlighted markup uses Highlight.js `hljs-*` classes instead,
which remain unchanged.

## Evidence

- App-owned source: `frontend/src/app.css` syntax selector arms near lines
  4614–4654 (removed).
- Current consumer: `frontend/src/routes/-legacy-markdown-help.tsx` emits
  `hljs-*` spans; no `.syntax-*` consumer exists in `frontend/src`, tests, or
  frozen legacy views/scripts.
- Frozen Highlight.js styles retain the `hljs-*` contract; frozen files and
  `frontend/public/legacy-assets/stylesheets/legacy-fallback.css` were not
  modified.
- Focused contract: `frontend/tests/legacy-fallback-off.e2e.ts` asserts exact
  `.syntax-*` absence and neighboring `hljs-*` retention in normal and
  fallback-off modes.

## Verification

- Normal static contract: 1/1 passed.
- `VITE_DISABLE_LEGACY_FALLBACK=1` static contract: 1/1 passed.
- No TSX, frozen source, generated fallback asset, or geometry baseline changed.

Global fallback discovery remains incomplete/non-green; this bounded batch does
not claim generated fallback unlinking or full legacy visual parity.
