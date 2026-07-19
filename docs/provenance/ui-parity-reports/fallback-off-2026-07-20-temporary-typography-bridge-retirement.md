# Source-less temporary typography fallback bridge retirement — 2026-07-20

## Scope

This bounded formal retirement deletes only these inactive standalone
`frontend/src/app.css` selector groups:

```css
.eyebrow
.lede
```

It preserves the adjacent `h1` and generic
`.content-container .main-stream .activity-streams` fallback groups. No route TSX,
frozen `yona-original` source, theme variable, generated-fallback selector
inventory, DOM order, or behavior changes. A later production build may update
only the deterministic `app.css` source SHA-256 in the fallback manifest; it must
not modify the frozen generated fallback asset or selector inventory.

## Source and no-emitter evidence

The complete current production `frontend/src/**/*.{ts,tsx}` inventory has no
runtime emitter for either deleted selector. Frozen legacy views and stylesheet
sources contain neither selector nor class output. The two blocks entered
`app.css` in the temporary React parity import and are not legacy styling
evidence.

The exact static contract was deliberately RED before deletion because both
prefixes existed, then GREEN after deletion by rejecting both prefixes while
requiring the adjacent retained boundaries. This proves only the bounded
source-less bridge removal.

## Bounded runtime matrix

The stable populated `/admin/sample/posts` fixture is intentionally unrelated to
the removed temporary typography bridges. It verifies the runtime generated
stylesheet boundary without claiming that a removed selector renders: normal
output has the generated fallback link, while fallback-off output does not, and
both retain visible class-free project-post StyleX output.

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

Both isolated runs completed with `1 passed` on 2026-07-20; the static
exact-absence contract also passed after deletion.

## Discovery boundary

Global fallback-off discovery remains incomplete and non-green. This report does
not claim generated fallback unlinking or live-legacy visual parity.
