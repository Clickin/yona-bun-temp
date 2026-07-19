# Source-less board-actions fallback bridge retirement — 2026-07-20

## Scope

This bounded retirement removes only the isolated five-declaration
`.board-actions` block from `frontend/src/app.css`. It does not change
`.actions`, `.checkbox`, `.board-form`, `.board-check`, any board-comment
selector, route TSX, or frozen legacy sources.

## Legacy and current-owner evidence

Frozen `yona-original/app/views/board/create.scala.html:41-111` and
`board/edit.scala.html:15-71` establish board form output as
`form.nm > .content-wrap.frm-wrap`, optional `.checkbox` controls, and an
`.actions` submit/cancel row. Neither template emits `.board-actions`.

The current React create and edit routes likewise have no `.board-actions`
emitter. Their visible action rows are owned by existing
`project-postform-actions` and `post-edit-form-actions` StyleX owners. The
focused static contract was observed RED before deletion because the isolated
fallback block existed, and is GREEN afterward by rejecting that exact selector
while requiring retained legacy action/check boundaries and both owners.

## Managed browser matrix

The real `/admin/sample/postform` and `/admin/sample/post/3/editform` fixtures
retain legacy form/action structure. Focused normal and fallback-off managed
runs check generated fallback link state, retained action owners/order, and
desktop/390px containment with no horizontal overflow.

```sh
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node \
  ../scripts/run-playwright-e2e.mjs --timeout=30000 \
  -g "board-actions fallback bridge|board edit form retains legacy form controls|project board create form matches legacy board/create.scala.html core form DOM" \
  tests/legacy-fallback-off.e2e.ts tests/project-board-create-form.e2e.ts

VITE_DISABLE_LEGACY_FALLBACK=1 \
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node \
  ../scripts/run-playwright-e2e.mjs --timeout=30000 \
  -g "board-actions fallback bridge|board edit form retains legacy form controls|project board create form matches legacy board/create.scala.html core form DOM" \
  tests/legacy-fallback-off.e2e.ts tests/project-board-create-form.e2e.ts
```

Both managed runs passed on 2026-07-20 after the static contract turned GREEN.

## Discovery boundary

Global fallback-off discovery remains incomplete and non-green. This is not a
generated-fallback unlinking or live-legacy visual-parity claim.
