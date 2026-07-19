# Source-less authenticated HOME notification-page bridge retirement — 2026-07-20

## Scope

This bounded formal retirement deletes exactly one declaration block from
`frontend/src/app.css`:

```css
.notification-page .activity-streams {
  margin: 0;
}
```

No route TSX, frozen `yona-original` source, theme variable, generated-fallback
selector inventory, DOM order, or behavior changes. The active generic rule is
explicitly retained:

```css
.content-container .main-stream .activity-streams {
  margin: 0;
}
```

A later integration production build is expected to update only the
deterministic `frontend/src/app.css` source SHA-256 in the fallback manifest;
it must not alter the frozen generated fallback asset or selector inventory.

## Source and no-emitter evidence

`yona-original/app/views/index/notifications.scala.html:54-59` emits the
historical `content-container > main-stream > ul.activity-streams
notification-wrap unstyled` list. `partial_notifications.scala.html:113-117`
uses the generic list class only as a legacy append target. Frozen
`_page.less:1197-1204`, reached through the immutable `yobi.less` import
chain, supplies the generic main-stream/list rule. A complete literal frozen
view/style/JavaScript inventory contains no composite `.notification-page
.activity-streams` selector; the template's standalone class output is the
historical DOM evidence, not this React-only bridge rule.

Current `frontend/src/**/*.{ts,tsx}` has no production emission of either
`.notification-page` or `.activity-streams` for authenticated HOME. Its output
uses the existing class-free `authenticated-home-notification-list` and row
StyleX owners. Legacy Scala HTML/JS is output DOM/UX evidence; React
state/events/components plus TanStack Router/Query own current behavior.

The exact static contract was deliberately RED before deletion because the
standalone bridge existed, then GREEN after deletion. It also asserts that the
generic `.content-container .main-stream .activity-streams` rule remains. This
proves only removal of the source-less app.css bridge, not removal of the
legacy generic activity-stream fallback.

## Bounded runtime matrix

The populated `/notifications` fixture uses an authenticated session and one
notification item. It asserts the normal generated-fallback stylesheet link
versus fallback-off absent-link boundary, visible list/row owners, and no
obsolete `.notification-page` or `.activity-streams` DOM classes.

```sh
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node \
  ../scripts/run-playwright-e2e.mjs --timeout=30000 \
  -g "notifications output retains the runtime fallback boundary" \
  tests/legacy-fallback-off.e2e.ts

VITE_DISABLE_LEGACY_FALLBACK=1 \
  pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node \
  ../scripts/run-playwright-e2e.mjs --timeout=30000 \
  -g "notifications output retains the runtime fallback boundary" \
  tests/legacy-fallback-off.e2e.ts
```

Each completed with `1 passed` on 2026-07-20. The static exact-absence
contract also passed after the deletion. An additional fallback-off populated
notification owner check passed `1/1`; it confirms the existing list/row
output remains class-free when the fallback asset is absent.

## Discovery boundary

Global fallback-off discovery remains incomplete and non-green. This report
does not claim generated fallback unlinking or live-legacy visual parity.
