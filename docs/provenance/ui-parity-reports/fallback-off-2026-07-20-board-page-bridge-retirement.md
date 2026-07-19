# Source-less standalone `.board-page` fallback bridge retirement — 2026-07-20

## Scope

This bounded formal retirement deletes exactly one current
`frontend/src/app.css` declaration block:

```css
.board-page {
  color: #333;
}
```

The requested `.app-shell.board-page` entry is not present in this worktree:
it was one selector in the complete `.app-shell` shared list deleted by
`49bfecccd` (Batch 551). It is asserted absent here but is neither recreated
nor deleted a second time. All other app-shell entries remain absent under that
earlier scope; all active board descendants, including `.board-toolbar`, are
outside this change and remain intact.

No route TSX, frozen `yona-original` source, theme variable, generated fallback
selector inventory, DOM order, or behavior changes. A later integration
production build is expected to update only the deterministic `app.css` source
SHA-256 in the fallback manifest; it must not alter the frozen fallback asset
or inventory.

## Source and no-emitter evidence

`yona-original/app/views/board/list.scala.html` establishes the historical
`page-wrap-outer > post-list project-page-wrap` list shell, and
`board/partial_list.scala.html` establishes the post-item/title/infos row
output. Frozen `_page.less:3827-3858,6994-7018`, reached through the immutable
`yobi.less` import chain, supplies the corresponding post-list/board styling
context. A complete literal inventory of frozen views, stylesheets, and legacy
JavaScript contains neither `.board-page` nor `.app-shell.board-page`; current
`frontend/src/**/*.{ts,tsx}` has no production emitter either.

Legacy Scala HTML/JS is output DOM/UX evidence; React state/events/components
plus TanStack Router/Query own current behavior. The existing class-free
`project-posts-page`, `project-posts-search`, `project-posts-item`, avatar,
title-wrap, and infos StyleX owners remain the output boundary.

The new exact static project-posts contract was deliberately RED before this
deletion: `.app-shell.board-page` was already absent, while standalone
`.board-page` was present. It is GREEN after deletion and rejects either
literal. This proves only removal of the source-less app.css bridge, not that
the legacy board/post-list classes or frozen rules are removable.

## Bounded runtime matrix

The focused populated `/admin/sample/posts` fixture asserts its normal linked
generated fallback asset versus fallback-off absent-link boundary, absence of
obsolete `.app-shell`/`.board-page` DOM, visible existing StyleX page/search/list
owners, legacy-derived computed declarations, sort navigation, and mobile
no-overflow geometry.

```sh
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node \
  ../scripts/run-playwright-e2e.mjs --timeout=30000 \
  tests/stylex-project-posts.e2e.ts -g "project posts preserves legacy populated-list owners and sort geometry"

VITE_DISABLE_LEGACY_FALLBACK=1 \
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node \
  ../scripts/run-playwright-e2e.mjs --timeout=30000 \
  tests/stylex-project-posts.e2e.ts -g "project posts preserves legacy populated-list owners and sort geometry"
```

Both focused project-posts runs completed with `1 passed` on 2026-07-20. The
required shared `legacy-fallback-off` board/posts asset-link and class-free
output assertion also completed with `1 passed` in normal mode and `1 passed`
in fallback-off mode. Production build is intentionally deferred to integration
scope for this no-commit worker task.

## Discovery boundary

Global fallback-off discovery remains incomplete and non-green. This report
does not claim generated fallback unlinking or live-legacy visual parity.
