# Stale secret-page fallback selector-branch retirement — 2026-07-20

## Scope

This bounded retirement deletes only five unused selector branches from
`frontend/src/app.css`:

```css
.secret-page .secret-box
.secret-page .secret-wrap
.secret-page .secret-wrap.restart
.secret-page .logo
.secret-page .logo:hover
```

The active `.secret-box`, `.secret-wrap`, `.secret-wrap .logo`, hover, and
`.page-wrap-outer:has(.secret-box.txt-center) .secret-wrap` rules remain. No
route TSX, frozen `yona-original` source, theme variable, generated fallback
asset/manifest, DOM order, or behavior changes.

## Source and no-emitter evidence

Frozen `welcome/secret.scala.html:40-47` and
`welcome/restart.scala.html:40-47` provide the standalone inline source for
the box, wrap, logo, and logo hover declarations. Both templates emit
`.secret-wrap`, `.secret-box`, and `.logo`; neither emits `.secret-page`.
The restart template does not emit a `restart` class either. The complete
current production source inventory likewise has no `.secret-page` emitter.

The focused static contract was deliberately RED while the branches existed,
then GREEN after deletion by rejecting all three source prefixes (including
the nested restart and hover forms) while requiring the live selector
boundaries.

## Bounded runtime matrix

The existing `/secret` setup fixture mocks the anonymous session and required
setup capability. It asserts the visible `secret-setup` StyleX owner, live
`.secret-wrap` class, logo and box output, no `.secret-page` DOM, and the
generated stylesheet boundary.

```sh
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node \
  ../scripts/run-playwright-e2e.mjs --timeout=30000 \
  -g "secret setup output retains active fallback classes without secret-page branches" \
  tests/legacy-fallback-off.e2e.ts

VITE_DISABLE_LEGACY_FALLBACK=1 \
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node \
  ../scripts/run-playwright-e2e.mjs --timeout=30000 \
  -g "secret setup output retains active fallback classes without secret-page branches" \
  tests/legacy-fallback-off.e2e.ts
```

Both isolated runs completed with `1 passed` on 2026-07-20. The normal run has
the generated fallback link; fallback-off has none. This proves only the
bounded branch retirement and active `/secret` output boundary.

## Discovery boundary

Global fallback-off discovery remains incomplete and non-green. This report
does not claim generated fallback unlinking or live-legacy visual parity.
