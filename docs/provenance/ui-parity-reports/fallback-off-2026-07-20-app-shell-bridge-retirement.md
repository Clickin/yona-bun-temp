# Source-less `.app-shell` fallback bridge retirement — 2026-07-20

## Scope

This bounded formal retirement deletes exactly every `frontend/src/app.css`
selector entry requiring the `.app-shell` ancestor: its base declaration, nine
project/page override entries, the user-issue page-width entry, and nine
max-720 issue-form project-menu entries. That is 20 pre-delete entries.

No route TSX, frozen `yona-original` source, theme variable, generated fallback
selector inventory, DOM order, or behavior changes. A production build will
update only the deterministic `frontend/src/app.css` source SHA-256 in the
fallback manifest; it does not alter the frozen fallback asset or inventory.

## Source and no-emitter evidence

Neither `yona-original` nor `frontend/src/**/*.{ts,tsx}` contains
`.app-shell`. The frozen project output is instead rooted at
`project/header.scala.html:52` (`.project-header-outer`) with its composed menu,
and `issue/create.scala.html:35-39` (`.project-page-wrap`, content form, and
issue form). Frozen `_page.less:479-629` and `_responsive.less:353-359` provide
the corresponding header/menu output context. Legacy Scala HTML/JS is output
DOM/UX evidence; React state/events/components plus TanStack Router/Query own
the current behavior.

The exact static absence assertion was deliberately RED before deletion with
`app-shell selector entries=20`, then GREEN with zero entries. The new
`legacy-fallback-off` static contract rejects any remaining `.app-shell`
selector. It is a source-less app.css bridge retirement, not a claim that the
legacy project/header/menu classes themselves are removable.

## Bounded runtime matrix

The focused project issue-form fixture keeps the visible project header/menu,
the issue-form owner, and the 390px menu output while checking normal linked
fallback versus fallback-off absent-link behavior. The shared fallback fixture
checks the same asset boundary plus populated non-project `/sites/massmail`
output in both recipient states; all outputs assert that `.app-shell` is not
rendered.

```sh
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node \
  ../scripts/run-playwright-e2e.mjs --timeout=30000 \
  tests/stylex-project-issueform.e2e.ts -g "project issue form preserves legacy editor layout with StyleX owners"

VITE_DISABLE_LEGACY_FALLBACK=1 \
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node \
  ../scripts/run-playwright-e2e.mjs --timeout=30000 \
  tests/stylex-project-issueform.e2e.ts -g "project issue form preserves legacy editor layout with StyleX owners"
```

Each project run completed with `1 passed` on 2026-07-20. The normal and
fallback-off massmail/static command each completed with `2 passed`.

## Discovery boundary

Global fallback-off discovery remains incomplete and non-green. This report
does not claim generated fallback unlinking or live-legacy visual parity.
