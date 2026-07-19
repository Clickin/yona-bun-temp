# `/sites/postList` generic post-list bridge retirement — 2026-07-20

## Scope

This batch deletes exactly three entries from `frontend/src/app.css`:

- `.site-admin-page .post-list-wrap` from the reset group;
- `.site-admin-page .post-list-wrap .listitem` from the row group; and
- `.site-admin-page .post-list-wrap .listitem:last-child` from the last-row group.

The user-list sibling entries remain in every group. No route TSX, frozen legacy source, theme
variable, generated-fallback selector inventory, DOM order, or behavior changed.

## Source and no-emitter evidence

`yona-original/app/views/site/postList.scala.html:30-33` emits the legacy
`ul.post-list-wrap > li.row-fluid.listitem` shape inside the `siteMngLayout.scala.html` content
column. That is legacy output evidence only. The current
`frontend/src/routes/sites/postList.tsx` has no `site-admin-page` or `post-list-wrap` literal, and
the populated React fixture emits neither class while retaining class-free
`site-post-list-container` and `site-post-list-row` ownership.

The focused static contract was RED before deletion because `app.css` still contained the generic
post-list selectors. After deletion, normal `stylex-site-post-list-shell-fallbacks.e2e.ts` is
GREEN 5/5.

## Runtime boundary checks

The following single assertion passed with a fresh managed server run in both modes:

```sh
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node \
  ../scripts/run-playwright-e2e.mjs --timeout=30000 \
  -g "post-list output retains" tests/legacy-fallback-off.e2e.ts

VITE_DISABLE_LEGACY_FALLBACK=1 pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store \
  --dir frontend exec node ../scripts/run-playwright-e2e.mjs --timeout=30000 \
  -g "post-list output retains" tests/legacy-fallback-off.e2e.ts
```

Each reports `1 passed`, checks normal-mode generated fallback linking versus fallback-off absence,
and verifies populated post output and absence of `.site-admin-page`/`.post-list-wrap`.

## Manifest and discovery boundary

The `legacy-fallback.manifest.json` `frontend/src/app.css` source SHA-256 must change
deterministically when the legacy CSS build is regenerated because this source changed; that
manifest update records source provenance, not a generated selector-inventory change.

Global fallback discovery remains incomplete/non-green. This report makes no claim that the
generated fallback asset can be unlinked, and it makes no live-legacy browser parity claim.
