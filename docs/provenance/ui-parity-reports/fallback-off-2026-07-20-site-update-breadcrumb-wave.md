# Site update breadcrumb route-local StyleX wave — 2026-07-20

## Scope

This wave migrates only `/sites/update`'s site-management breadcrumb boundary
in `frontend/src/routes/sites/update.tsx`. It replaces that route's raw
`.site-breadcrumb-outer` and `.site-breadcrumb-inner` presentation classes with
the route-local `site-update-breadcrumb-{outer,inner,heading}` StyleX owners.
The outer owner keeps box sizing, 100% width, horizontal padding, and the
legacy mobile 10px minimum; the inner retains auto margin; the `h3` retains
line-height and padding. All values are inline StyleX geometry, not theme
variables. DOM order, copy, and the existing query boundary are unchanged.

## Legacy evidence and boundary

Frozen `yona-original/app/views/site/siteMngLayout.scala.html:34-38` is the
output source of truth: outer > inner > `h3` with `site.sidebar`. Frozen
`yona-original/app/assets/stylesheets/less/_page.less:743-753` supplies the
inner margin and heading padding/line-height. Frozen
`_responsive.less:349-351,627-631` supplies the responsive outer minimum,
width, padding, and box-sizing. The focused static contract reads those sources
and requires the exact class absence and three StyleX owners in the update
route.

This wave does not edit frozen sources, `frontend/src/app.css`, theme files, or
generated assets. It does not retire the separate raw breadcrumb consumers in
`sites/diagnostic.tsx`, `sites/mail.tsx`, or other routes. The generated
fallback remains linked in normal mode and global fallback discovery remains
incomplete/non-green.

## Managed browser matrix

`frontend/tests/stylex-site-update-breadcrumb.e2e.ts` covers one static source
contract plus authenticated desktop (1366px) and mobile (390px) route runs. It
requires the owner DOM order, canonical `Site management` copy, raw-class
absence, outer/inner/heading geometry and computed local declarations, and a
breadcrumb screenshot at each viewport.

```sh
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node \
  ../scripts/run-playwright-e2e.mjs --retries=0 --reporter=line --workers=1 \
  tests/stylex-site-update-breadcrumb.e2e.ts

VITE_DISABLE_LEGACY_FALLBACK=1 \
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node \
  ../scripts/run-playwright-e2e.mjs --retries=0 --reporter=line --workers=1 \
  tests/stylex-site-update-breadcrumb.e2e.ts
```

Both managed runs passed 3/3 on 2026-07-20: static source/owner proof,
desktop geometry, and 390px geometry. Frontend typecheck also passed.

## Discovery boundary

This is a route-local ownership migration, not generated-fallback unlinking or
a claim of complete live-legacy visual parity. Other raw breadcrumb consumers
remain intentionally outside Batch 567.
