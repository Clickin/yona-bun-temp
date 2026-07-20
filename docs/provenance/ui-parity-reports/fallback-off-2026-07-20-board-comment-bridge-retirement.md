# Source-less board-comment fallback bridge retirement — 2026-07-20

## Scope

This bounded retirement removes only the standalone `.board-comment` block from
`frontend/src/app.css` (`padding: 12px 0` and `border-bottom: 1px solid
#e5e5e5`). It preserves `.board-comments`, `.board-comment-wrap`, `.comments`,
all review/thread selectors, route TSX, and every frozen legacy source.

## Legacy and current-owner evidence

Frozen `yona-original/app/views/board/view.scala.html:131-137` establishes the
post comment output as `#comments.board-comment-wrap > #timeline >
.timeline-list` plus `common.commentForm`. Frozen
`yona-original/app/views/common/commentForm.scala.html:29-45` establishes the
separate `.write-comment-box` form. Neither template emits `.board-comment`.
The relevant frozen LESS context is `.board-comment-wrap` in
`_page.less:3005-3018` and its responsive branch in `_responsive.less:40-42`;
those active selectors remain untouched.

Current React board post create, edit, and detail routes have no
`board-comment` emitter. The focused static contract was observed RED before
deletion because the fallback block existed, then is GREEN by rejecting the
exact selector while retaining the adjacent active comment boundaries and route
non-emitter proof.

## Managed browser matrix

The stable `/admin/sample/post/3/editform` fixture retains the legacy
`form.nm > .content-wrap.frm-wrap` structure, checkbox controls, and action
order. It is intentionally used here instead of a strict post-timeline
assumption to prove normal linked versus fallback-off absent generated-asset
boundaries, plus desktop and Korean-390 containment/no-overflow behavior.

```sh
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node \
  ../scripts/run-playwright-e2e.mjs --timeout=30000 \
  -g "board-comment fallback bridge|board edit form retains legacy form controls" \
  tests/legacy-fallback-off.e2e.ts

VITE_DISABLE_LEGACY_FALLBACK=1 \
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node \
  ../scripts/run-playwright-e2e.mjs --timeout=30000 \
  -g "board-comment fallback bridge|board edit form retains legacy form controls" \
  tests/legacy-fallback-off.e2e.ts
```

Both managed runs passed on 2026-07-20 after the static contract turned GREEN.

## Discovery boundary

Global fallback-off discovery remains incomplete and non-green. This is not a
generated-fallback unlinking or live-legacy visual-parity claim.
