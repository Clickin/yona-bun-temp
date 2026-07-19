# Site-admin layout ancestry bridge retirement — 2026-07-20

## Scope

This formal fallback-retirement batch deletes exactly one source-less ancestry
group from `frontend/src/app.css`:

- `.site-admin-page .row-fluid` and its `::before`/`::after` clearfix;
- `.site-admin-page .span1`, `.span2`, `.span3`, `.span4`, `.span5`, and
  `.span10`;
- `.site-admin-page .page-wrap-outer`; and
- `.site-admin-page .site-setting-wrap`.

No other app.css selector group, route TSX, frozen `yona-original` source,
theme, generated-fallback selector inventory, DOM order, or behavior changes.
The generated-fallback manifest will update only the tracked `app.css` source
hash when integration regenerates it; this batch does not change the frozen
fallback asset or its selector inventory.

## Source and no-emitter evidence

`yona-original/app/views/site/siteMngLayout.scala.html` emits the historical
`page-wrap-outer > site-setting-wrap > row-fluid > span2/span10` layout, and
the site screen templates compose that layout. Frozen Bootstrap 2.3.1 supplies
the row-fluid clearfix/span rules; frozen `_page.less` supplies the
site-setting wrapper rule. They are immutable output/styling evidence only.

Before deletion, the exact static check was RED because all ten target
selector entries remained in `app.css`. A current React source inventory found
no `site-admin-page` runtime TS/TSX emitter. The new static contract verifies
that each affected route (`userList`, `postList`, `projectList`, `mail`,
`massmail`, `update`, `diagnostic`, and `data`) has the existing class-free
StyleX page/grid/sidebar/content owner boundary.

## Bounded runtime contracts

The shared bounded test uses authenticated mocks for populated massmail,
project-list, user-list, and post-list states. It verifies generated-asset
link presence in normal mode versus absence in fallback-off mode, visible
class-free layout owners, and absence of the retired `.site-admin-page` DOM
ancestor. Commands:

```sh
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node \
  ../scripts/run-playwright-e2e.mjs --timeout=30000 tests/legacy-fallback-off.e2e.ts

VITE_DISABLE_LEGACY_FALLBACK=1 pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store \
  --dir frontend exec node ../scripts/run-playwright-e2e.mjs --timeout=30000 \
  tests/legacy-fallback-off.e2e.ts
```

On 2026-07-20, each run completed with 6 passed and 1 mode-specific skip.
These are bounded four-route mocks, not a global site-management or whole-app
fallback-off discovery result.

## Discovery boundary

Global fallback-off discovery remains incomplete and non-green. This report
does not claim generated fallback unlinking or live-legacy browser visual
parity.
