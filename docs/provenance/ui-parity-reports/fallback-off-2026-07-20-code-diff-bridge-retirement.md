# Source-less code/diff fallback bridge retirement — 2026-07-20

## Scope

This bounded formal retirement deletes only these inactive `frontend/src/app.css`
selector groups:

```css
.diff-file, .diff-stats, .diff-code, .diff-table, .line-comment-trigger
.inline-comment-form-row, .code-review-form
.code-syntax-wrap, .code-line-wrap, .line-code
```

It preserves the adjacent active `.diff-body`, `.diff-partial-codeline`,
`.diff-container*`, `.review-wrap`, `.line-number`, and syntax-highlighting groups.
No route TSX, frozen `yona-original` source, theme variable, generated-fallback
selector inventory, DOM order, or behavior changes. A later production build may
update only the deterministic `app.css` source SHA-256 in the fallback manifest;
it must not modify the frozen generated fallback asset or selector inventory.

## Source and no-emitter evidence

The complete current production `frontend/src/**/*.{ts,tsx}` inventory has no
runtime emitter for any deleted selector. Frozen legacy views and stylesheet
sources do not provide those React-only bridge selectors. The rendered legacy
diff surface instead uses retained `.diff-body`, `.diff-container`,
`.diff-partial-codeline`, `.line-number`, review, and syntax selectors.

The exact static contract was deliberately RED before deletion because all ten
selector prefixes existed, then GREEN after deletion by rejecting each prefix
while requiring the retained adjacent boundaries. This proves only the bounded
source-less bridge removal.

## Bounded runtime matrix

The stable populated `/admin/sample/posts` fixture is intentionally unrelated to
the removed code/diff bridges. It verifies the runtime generated-stylesheet
boundary without claiming that a diff surface renders: normal output has the
generated fallback link, while fallback-off output does not, and both retain
visible class-free project-post StyleX output.

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
