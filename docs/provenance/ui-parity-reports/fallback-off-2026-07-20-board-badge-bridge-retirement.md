# Source-less project board badge bridge retirement — 2026-07-20

## Scope

This bounded retirement deletes exactly the 30-line bridge group from
`frontend/src/app.css`:

```css
.board-badges { /* removed */ }
.board-badge, .board-label { /* removed */ }
.board-badge.notice { /* removed */ }
.board-badge.readme { /* removed */ }
```

It does not alter route TSX, frozen `yona-original` source, theme variables,
generated-fallback selector inventory, DOM order, or behavior. The separate
live `.board-labels` selector is explicitly outside this retirement.

## Source and no-emitter evidence

`yona-original/app/views/board/partial_list.scala.html:17-23` establishes the
legacy visible markers: `.label.label-notice` for notices and
`.label.label-important` for README. `board/list.scala.html:40` and
`board/view.scala.html:143` establish the distinct `.board-labels` filter and
sidebar control. The complete frozen view, LESS, and Bootstrap inventory has
no `.board-badges`, `.board-badge`, or exact `.board-label` selector.

The complete current production `frontend/src/**/*.{ts,tsx}` and Rust source
inventory likewise has no bridge-selector emitter. Current project posts
render the unchanged legacy label markers with existing class-free StyleX list
owners. Legacy Scala HTML/JS is output DOM/UX evidence; React state,
events/components plus TanStack Router/Query own current behavior.

The focused static contract was deliberately RED before deletion because
`.board-badges` remained in `app.css`; it is GREEN after exact absence of all
three bridge selectors and retained frozen label-source assertions.

## Bounded runtime matrix

The populated `/admin/sample/posts` fixture contains one notice and one README
post. It asserts the normal generated-fallback stylesheet link versus the
fallback-off absent-link boundary, retained `.label.label-notice` and
`.label.label-important` output, and absence of `.board-badges`,
`.board-badge`, and `.board-label` DOM classes.

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

Both focused normal and fallback-off runs completed GREEN on 2026-07-20. The
additional project-posts static/runtime normal check also completed GREEN after
the deletion.

## Discovery boundary

Global fallback-off discovery remains incomplete and non-green. This report
does not claim generated fallback unlinking or live-legacy visual parity.
