# Source-less pull-request action/branch fallback bridge retirement — 2026-07-20

## Scope

This bounded retirement removes only `.pull-request-actions` and
`.pull-request-branches` from the shared flex selector in `frontend/src/app.css`,
then removes the coupled `.pull-request-branches label` and `select` blocks.
The active `.thread-actrow` and `.actions` flex declarations remain. All
`.pullrequeset-tab-menu` rules are explicitly outside this slice.

## Legacy and no-emitter evidence

Frozen `yona-original/app/views/git/create.scala.html:30-106` and
`git/edit.scala.html` establish the actual PR form output: `.pull-request-wrap`
contains the from selector group, arrow, and to selector group, followed by the
legacy `.actions` submit/cancel controls. Neither template emits either retired
temporary selector. Frozen PR list `git/partial_search.scala.html:96-130` remains
the separate source of the active `.pullrequeset-tab-menu` behavior and is not
changed.

Complete current production React TS/TSX inventory has no static or dynamic
emitter for `.pull-request-actions` or `.pull-request-branches`. The focused
static contract was observed RED before deletion because the shared-selector arms
and coupled blocks existed; it is GREEN afterward, while requiring the retained
`.thread-actrow` and `.actions` declarations.

## Managed browser matrix

The real `/admin/sample/pullRequest/7/editform` fixture retains the legacy form
sequence: `.pull-request-wrap > .pull-left`, `.arrow + .pull-right`, then
`.actions > submit + cancel`. It asserts normal generated-fallback link presence
versus fallback-off absence, selector absence, and desktop/390px containment with
no horizontal overflow.

```sh
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node \\
  ../scripts/run-playwright-e2e.mjs --timeout=30000 \\
  -g "pull-request action and branch fallback bridges|pull-request edit form retains active action order" \\
  tests/legacy-fallback-off.e2e.ts

VITE_DISABLE_LEGACY_FALLBACK=1 \\
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node \\
  ../scripts/run-playwright-e2e.mjs --timeout=30000 \\
  -g "pull-request action and branch fallback bridges|pull-request edit form retains active action order" \\
  tests/legacy-fallback-off.e2e.ts
```

Both managed runs pass after the static contract turns GREEN.

## Discovery boundary

Global fallback-off discovery remains incomplete and non-green. This is not a
generated-fallback unlinking or live-legacy visual-parity claim.
