# Complete `.site-setting-wrap` app.css scope retirement — 2026-07-20

## Scope

This bounded formal retirement deletes every selector entry beginning
`.site-setting-wrap` from `frontend/src/app.css`: the wrapper itself and its
title, listhead, listitem/avatar, user metadata, mass-mail, and project-list
descendants. It changes no selector outside that prefix.

No route TSX, frozen `yona-original` source, theme variable, generated fallback
selector inventory, DOM order, or behavior changes. The integration production
build changes only the deterministic `app.css` source SHA-256 in the fallback
manifest; it does not modify the frozen fallback asset or inventory.

## Source and no-emitter evidence

`yona-original/app/views/site/siteMngLayout.scala.html:39-42` supplies the
historical site-management wrapper and grid. Frozen
`yona-original/app/assets/stylesheets/less/_page.less:5248-5363`, imported by
`yobi.less`, supplies the historical title/list/row/form subtree. Legacy Scala
HTML/JS is output DOM/UX evidence; React state/events/components plus TanStack
Router/Query own current behavior.

Before deletion, the exact static check was RED with 23 selector entries
beginning `.site-setting-wrap`. A complete current
`frontend/src/**/*.{ts,tsx}` inventory found no production emitter. The four
direct static contracts now assert exact absence for the listhead,
project-list, issue-list avatar, and post-list avatar entries. The runtime
contract retains class-free StyleX layout boundaries for the representative
site routes.

## Bounded runtime matrix

`frontend/tests/legacy-fallback-off.e2e.ts` uses authenticated mocks for
populated massmail (including selected project), project list, user list, and
post list. It asserts normal-mode generated stylesheet linkage versus
fallback-off absence, visible class-free StyleX owners, and absent
`.site-setting-wrap` DOM output.

```sh
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node \
  ../scripts/run-playwright-e2e.mjs --timeout=30000 tests/legacy-fallback-off.e2e.ts

VITE_DISABLE_LEGACY_FALLBACK=1 \
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node \
  ../scripts/run-playwright-e2e.mjs --timeout=30000 tests/legacy-fallback-off.e2e.ts
```

On 2026-07-20, each managed run completed with `6 passed` and one
mode-specific skip. The normal run skips the fallback-off asset-absence test;
the fallback-off run skips the normal linked-asset content test. The exact
post-delete static check reports zero `.site-setting-wrap` selectors and all
four authorized absence assertions are present.

The bundled four-file static Playwright invocation has three passing files and
one unrelated existing RED: `stylex-site-user-list-listhead.e2e.ts` still
expects an exact `className="row-fluid listhead"` literal in the unrelated code
browser route, which now emits that class through a StyleX template literal.
Its new `.site-setting-wrap` absence assertion ran before that later assertion
and passed. This no-TSX/no-broad-fixture retirement neither changes nor claims
that unrelated code-browser expectation.

Mail, update, diagnostic, data, issue-list, and setting retain their existing
focused route coverage; they are not claimed as replayed by this representative
retirement matrix.

## Discovery boundary

Global fallback-off discovery remains incomplete and non-green. This report
does not claim generated fallback unlinking or live-legacy visual parity.
