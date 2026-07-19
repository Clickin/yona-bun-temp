# Final site-admin ancestry bridge retirement — 2026-07-20

## Scope

This bounded formal retirement deletes every remaining selector in
`frontend/src/app.css` that begins `.site-admin-page`, from the obsolete
site-setting navigation/title/search/list/metadata bridge through the form,
modal, and pagination descendants. It changes no selector outside that prefix.

No route TSX, frozen `yona-original` source, theme variable, generated fallback
selector inventory, DOM order, or behavior changes. An integration production
build will update only the deterministic `app.css` source hash in the fallback
manifest; it does not modify the frozen fallback asset or inventory.

## Source and no-emitter evidence

`yona-original/app/views/site/siteMngLayout.scala.html` supplies the historical
site-management shell, while the composed `userList`, `postList`, `issueList`,
`projectList`, `mail`, `massMail`, `update`, `diagnostic`, `data`, and `setting`
templates supply its visible screen states. Frozen `_page.less:5248-5455` and
Bootstrap remain immutable output/styling context. Legacy Scala HTML/JS is
output DOM/UX evidence; React state/events/components plus TanStack Router/Query
own current behavior.

Before deletion, the exact static check was RED with 64 residual selector
entries beginning `.site-admin-page`. A complete `frontend/src/**/*.{ts,tsx}`
inventory found no runtime emitter. The static contract now asserts whole-prefix
absence and retains all eight current site-management route source checks for
their class-free StyleX layout boundaries.

## Bounded runtime matrix

`frontend/tests/legacy-fallback-off.e2e.ts` uses authenticated mocks for four
representative populated route families: massmail (default and selected
project), project list, user list, and post list. It asserts normal-mode
generated stylesheet linkage versus fallback-off absence, visible class-free
StyleX owners, and absent `.site-admin-page` DOM output.

```sh
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node \
  ../scripts/run-playwright-e2e.mjs --timeout=30000 tests/legacy-fallback-off.e2e.ts

VITE_DISABLE_LEGACY_FALLBACK=1 \
  pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node \
  ../scripts/run-playwright-e2e.mjs --timeout=30000 tests/legacy-fallback-off.e2e.ts
```

On 2026-07-20, each managed run completed with 6 passed and 1 mode-specific
skip. This is a representative four-family matrix: mail, update, diagnostic,
and data are not replayed by this retirement test and retain their existing
focused route coverage.

## Discovery boundary

Global fallback-off discovery remains incomplete and non-green. This report
does not claim generated fallback unlinking or live-legacy visual parity.
