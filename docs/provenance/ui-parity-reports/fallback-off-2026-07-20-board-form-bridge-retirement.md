# Source-less board-form fallback bridge retirement — 2026-07-20

## Scope

This bounded retirement removes only the source-less temporary grid family from
`frontend/src/app.css`: `.board-comment-form`, `.board-form`, their textarea
min-height branch, `.board-form label`, and `.board-check`. It preserves
`.write-comment-box`, `.frm-wrap`, `.checkbox`, `.actions`,
`.board-comment-wrap`, every other board selector, route TSX, and all frozen
legacy sources.

## Legacy and current-owner evidence

Frozen `yona-original/app/views/board/create.scala.html:49-111` and
`board/edit.scala.html:19-71` establish board form output as
`form.nm > .content-wrap.frm-wrap`, optional `.checkbox` controls, and an
`.actions` submit/cancel row. Frozen
`yona-original/app/views/common/commentForm.scala.html:29-45` instead uses
`#comment-form > .write-comment-box`; it does not introduce a board-specific
comment form class. Frozen `_page.less:3467-3506,3736-3767` owns the active
`.write-comment-box` and `.frm-wrap` context.

The current React post create, edit, and detail routes emit none of
`.board-comment-form`, `.board-form`, or `.board-check`. The focused static
contract was observed RED before deletion because those fallback blocks existed,
then is GREEN by rejecting every exact selector arm and retaining real route
non-emitter proof.

## Managed browser matrix

The real `/admin/sample/post/3/editform` fixture retains the legacy
`form.nm > .content-wrap.frm-wrap` structure, three `.checkbox` controls, and
the `.actions` row after the checkbox group. It checks normal generated fallback
link presence versus fallback-off absence, then desktop and 390px containment
without horizontal overflow.

```sh
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node \
  ../scripts/run-playwright-e2e.mjs --timeout=30000 \
  -g "board form fallback bridges|board edit form retains legacy form controls" \
  tests/legacy-fallback-off.e2e.ts

VITE_DISABLE_LEGACY_FALLBACK=1 \
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node \
  ../scripts/run-playwright-e2e.mjs --timeout=30000 \
  -g "board form fallback bridges|board edit form retains legacy form controls" \
  tests/legacy-fallback-off.e2e.ts
```

Both managed runs passed on 2026-07-20 after the static contract turned GREEN.

## Discovery boundary

Global fallback-off discovery remains incomplete and non-green. This is not a
generated-fallback unlinking or live-legacy visual-parity claim.
