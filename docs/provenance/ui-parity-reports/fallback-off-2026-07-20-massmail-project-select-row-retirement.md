# Fallback-off massmail project-select-row retirement — 2026-07-20

## Scope

This is a formal fallback-retirement evidence batch for one dead React runtime
bridge only. `yona-original/**/*.css` and `yona-original/**/*.less` are
unchanged immutable evidence.

`frontend/src/app.css` deletes exactly these source-less selectors:

- `.site-admin-page .project-select-row`
- `.site-admin-page .project-select-row #input-project`

`yona-original/app/views/site/massMail.scala.html` emits
`#project-list-wrap > .controls > #input-project`; it emits neither deleted
class. The React `/sites/massmail` source and both browser states likewise
emit neither `.site-admin-page` nor `.project-select-row`. No generated legacy
fallback asset, build script, route TSX, theme, frozen source, or other app.css
selector changes are included. The generated-fallback manifest updates only its tracked `app.css`
source hash deterministically; the generated frozen fallback asset and its selector inventory are
unchanged.

## Runtime contracts

Commands:

```sh
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node ../scripts/run-playwright-e2e.mjs --timeout=20000 tests/legacy-fallback-off.e2e.ts
VITE_DISABLE_LEGACY_FALLBACK=1 pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node ../scripts/run-playwright-e2e.mjs --timeout=20000 tests/legacy-fallback-off.e2e.ts
```

`frontend/tests/legacy-fallback-off.e2e.ts` keeps the normal generated-asset
link/fetch contract and the fallback-off absent-link contract. Its added
massmail contract mocks the authenticated site-admin APIs, verifies default
all-recipient output, switches to projects, adds `admin/projectYobi`, and
checks the selected-project output while asserting the generated fallback link
is present in normal mode and absent in fallback-off mode. It also asserts no
runtime `.site-admin-page` or `.project-select-row` node in either state.

2026-07-20 results: normal mode passed 2 with 1 mode-specific skip; fallback-
off mode passed 2 with 1 mode-specific skip. The separate
`stylex-site-massmail-selected-projects.e2e.ts` static contract first recorded
the stale selector presence as RED, then passed normal and fallback-off after
the exact deletion.

## Global discovery status

No new global fallback-off discovery was run for this bounded dead-selector
deletion. Existing global discovery remains incomplete and non-green; this
report does not claim global fallback unlinking or live legacy visual parity.
