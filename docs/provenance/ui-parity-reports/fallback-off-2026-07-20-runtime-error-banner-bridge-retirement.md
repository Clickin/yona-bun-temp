# Source-less runtime-error-banner fallback bridge retirement — 2026-07-20

## Scope

This bounded formal retirement deletes exactly two self-contained blocks from
`frontend/src/app.css`:

```css
.runtime-error-banner { /* presentation declarations */ }
.runtime-error-banner button { /* button presentation declarations */ }
```

No route TSX, frozen `yona-original` source, theme variable, generated-fallback
selector inventory, DOM order, or behavior changes. The adjacent secret-page
rules and every other fallback selector remain intact. A later integration
production build may update only the deterministic `app.css` source SHA-256 in
the fallback manifest; it must not alter the frozen generated fallback asset or
selector inventory.

## Source and no-emitter evidence

A complete literal inventory of frozen legacy views, LESS/CSS, and JavaScript
contains no `.runtime-error-banner` selector. Current production
`frontend/src/**/*.{ts,tsx}` likewise has no runtime emitter, and no existing
test references the selector before this retirement contract. The two app.css
blocks were a self-contained bootstrap-era React-only presentation bridge, not
legacy output styling.

The exact static contract was deliberately RED before deletion because both
blocks existed, then GREEN after deletion by rejecting the whole
`.runtime-error-banner` prefix. This proves removal only of that source-less
bridge; it does not establish that any unrelated fallback selector is unused.

## Bounded runtime matrix

The stable populated `/admin/sample/posts` fixture is intentionally unrelated
to the removed banner. It verifies the runtime generated stylesheet boundary
without claiming that the banner renders: normal output has the generated
fallback link, while fallback-off output does not, and both retain visible
class-free project-post StyleX output.

```sh
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node \
  ../scripts/run-playwright-e2e.mjs --timeout=30000 \
  -g "project posts retains legacy label output without the dead board-badge bridge" \
  tests/legacy-fallback-off.e2e.ts

VITE_DISABLE_LEGACY_FALLBACK=1 \
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node \
  ../scripts/run-playwright-e2e.mjs --timeout=30000 \
  -g "project posts retains legacy label output without the dead board-badge bridge" \
  tests/legacy-fallback-off.e2e.ts
```

Both runs completed with `1 passed` on 2026-07-20. The static exact-absence
contract also passed after deletion.

## Discovery boundary

Global fallback-off discovery remains incomplete and non-green. This report
does not claim generated fallback unlinking or live-legacy visual parity.
