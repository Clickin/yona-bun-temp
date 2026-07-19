# `/sites/userList` generic user-list bridge retirement — 2026-07-20

## Scope

This formal fallback-retirement batch deletes exactly three entries from
`frontend/src/app.css`:

- `.site-admin-page .user-list-wrap` from the reset group;
- `.site-admin-page .user-list-wrap .listitem` from the row group; and
- `.site-admin-page .user-list-wrap .listitem:last-child` from the last-row group.

No route TSX, frozen `yona-original` source, theme variable, generated-fallback
selector inventory, DOM order, or behavior changes. The preceding project-list
and post-list bridge batches had already retired their separate siblings; this
batch is limited to the remaining user-list entries.

## Source and no-emitter evidence

`yona-original/app/views/site/userList.scala.html:73-75` emits the historical
`ul.user-list-wrap > li.row-fluid.listitem` structure, and its legacy jQuery
delegation at lines 156-180 is output/behavior evidence only. Frozen
`yona-original/app/assets/stylesheets/less/_page.less:5318-5363` supplies the
legacy row and user-list declarations. These frozen sources are unchanged.

The current `frontend/src/routes/sites/userList.tsx` has no `site-admin-page`
or `user-list-wrap` literal and renders the populated surface through
`site-user-list-row-list` and `site-user-list-row` StyleX owners. `rg` found no
React TS/TSX emission of either removed compatibility class. The static absence
assertion was deliberately RED before deletion with
`dead bridge still present: .site-admin-page .user-list-wrap`, then GREEN after
the exact three selector entries were removed.

## Runtime boundary checks

One exact, populated `/sites/userList` assertion was run using authenticated
site-admin session/update/users mocks. It checks the normal generated stylesheet
link versus fallback-off absence, visible StyleX list/row/name output, and the
absence of both `.site-admin-page` and `.user-list-wrap` in browser DOM:

```sh
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node \
  ../scripts/run-playwright-e2e.mjs --timeout=30000 \
  -g "user-list output retains the runtime fallback boundary without its dead bridge" \
  tests/legacy-fallback-off.e2e.ts

VITE_DISABLE_LEGACY_FALLBACK=1 \
  pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node \
  ../scripts/run-playwright-e2e.mjs --timeout=30000 \
  -g "user-list output retains the runtime fallback boundary without its dead bridge" \
  tests/legacy-fallback-off.e2e.ts
```

Both completed cleanly on 2026-07-20 with `1 passed`. A direct static
Playwright invocation attempted to start an already occupied configured server
port before the managed runs; it is a non-result and is not used as evidence.

The separately invoked populated-row frozen-fixture check is non-green before
this retirement can be established: it compares the StyleX actual list/rows to
a class-only fixture outside the legacy `.site-setting-wrap` ancestry, producing
the known `listStyleType`/row border/line-height mismatch. The static source
assertion in that file is GREEN after deletion, but this unrelated fixture
baseline is not claimed as parity evidence or repaired in this no-TSX,
three-selector batch.

## Manifest and discovery boundary

The integration production build must update the
`legacy-fallback.manifest.json` source SHA-256 for `frontend/src/app.css`
deterministically. That provenance hash update does not change the frozen
generated fallback asset or selector inventory.

Global fallback discovery remains incomplete and non-green. This bounded batch
does not claim fallback unlinking or live-legacy browser visual parity.
