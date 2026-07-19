# Source-less board label-picker fallback bridge retirement — 2026-07-20

## Scope

This bounded retirement removes only `.board-label-picker` from three
`frontend/src/app.css` locations: the comma arm beside `.board-form label`, its
standalone padding/border/radius block, and the comma arm beside `.board-check`.
The active `.board-form label` and `.board-check` declarations remain.

## Legacy and no-emitter evidence

Frozen `yona-original/app/views/board/create.scala.html:49-54,89-111` and
`board/edit.scala.html:19-28,51-71` render the board form as
`.content-wrap.frm-wrap` with `.checkbox` options and `.actions`. The comment
surface is separately represented by `.board-comment-wrap`, `.comments`, and
`.write-comment-box`. No cited board template emits `.board-label-picker`.

Existing provenance (`ui-parity-board-milestone.md` and
`template-first-p4-board-milestone-post.md`) records that post create/edit forms
intentionally do not expose a label picker. Current production route source has
no static emitter. The focused static contract was observed RED before removal
because the three selector arms existed, and is GREEN afterward by rejecting
`.board-label-picker` while requiring the retained board form/check selectors.

## Managed browser matrix

The real `/admin/sample/post/3/editform` fixture provides the legacy form
structure: `form.nm > .content-wrap.frm-wrap`, `.actions`, and three
`.checkbox` controls. It asserts no label-picker or board-check output, normal
generated-fallback link presence versus fallback-off absence, and desktop/390px
containment with no horizontal overflow.

```sh
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node \\
  ../scripts/run-playwright-e2e.mjs --timeout=30000 \\
  -g "board label-picker fallback bridge|board edit form retains legacy form controls" \\
  tests/legacy-fallback-off.e2e.ts

VITE_DISABLE_LEGACY_FALLBACK=1 \\
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node \\
  ../scripts/run-playwright-e2e.mjs --timeout=30000 \\
  -g "board label-picker fallback bridge|board edit form retains legacy form controls" \\
  tests/legacy-fallback-off.e2e.ts
```

Both managed runs passed on 2026-07-20 after the static contract turned GREEN.

## Discovery boundary

Global fallback-off discovery remains incomplete and non-green. This is not a
generated-fallback unlinking or live-legacy visual-parity claim.
