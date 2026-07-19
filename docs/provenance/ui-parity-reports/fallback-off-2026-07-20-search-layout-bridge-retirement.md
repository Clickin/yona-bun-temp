# Source-less global-search layout fallback bridge retirement — 2026-07-20

## Scope

This bounded formal retirement deletes exactly two inactive `frontend/src/app.css`
blocks: the desktop `.search-layout` grid and its max-640 single-column override.
They contain six declarations in total. No route TSX, frozen `yona-original`
source, theme variable, generated-fallback selector inventory, DOM order, or
behavior changes. Active `.search-category-wrap`, `#searchInnerForm`,
`#searchKeyword`, search box, result, and list rules are explicitly retained.
A later integration build may update only the deterministic `app.css` source
SHA-256 in the fallback manifest; it must not alter the frozen generated asset
or selector inventory.

## Source and no-emitter evidence

Frozen `search/partial_search.scala.html:73-146` renders the search rail and
content as `row-fluid > span2/span10`; it contains no `.search-layout` class.
Frozen `_page.less:6375-6491`, reached through immutable `yobi.less`, supplies
the actual search-box/category/list output and also has no such selector.
Current global, project, and organization search routes retain the legacy
Bootstrap shell and have no static or dynamic `.search-layout` emitter.

The focused static contract was deliberately RED before deletion because the
two exact selector blocks existed, then GREEN afterward by rejecting the prefix
while requiring the adjacent active category and mobile form boundaries.
Legacy Scala HTML/JS is output DOM/UX evidence; React state/events/components
plus TanStack Router/Query own current search behavior.

## Bounded runtime matrix

The populated global `/search?keyword=bug&searchType=issue` fixture asserts the
visible input, result wrapper, and result item. Normal mode retains the generated
fallback link; fallback-off mode removes it without losing the StyleX-owned
visible search output.

```sh
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node \
  ../scripts/run-playwright-e2e.mjs --timeout=30000 \
  -g "global search output retains the runtime fallback boundary" \
  tests/legacy-fallback-off.e2e.ts

VITE_DISABLE_LEGACY_FALLBACK=1 \
  pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node \
  ../scripts/run-playwright-e2e.mjs --timeout=30000 \
  -g "global search output retains the runtime fallback boundary" \
  tests/legacy-fallback-off.e2e.ts
```

Both isolated runs completed with `1 passed` on 2026-07-20. The focused search
owner/desktop-mobile contract also passed after the removal.

## Discovery boundary

Global fallback-off discovery remains incomplete and non-green. This report
does not claim generated fallback unlinking or live-legacy visual parity.
