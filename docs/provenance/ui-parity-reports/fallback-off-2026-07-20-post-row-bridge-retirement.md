# Source-less site post-row fallback bridge retirement — 2026-07-20

## Scope

This bounded retirement deletes exactly four inactive standalone
`frontend/src/app.css` blocks:

```css
.post-row
.post-row-main
.post-title
.post-row-meta
```

It does not edit route TSX, frozen `yona-original` sources, theme variables,
generated fallback assets, DOM order, or behavior.

## Legacy and no-emitter evidence

`yona-original/app/views/site/postList.scala.html:26-68` and
`site/issueList.scala.html:35-83` establish the actual output: a
`.post-list-wrap` containing `row-fluid listitem` rows with project avatar,
post-info, and post-meta children. Frozen
`yona-original/app/assets/stylesheets/less/_page.less:5389-5431` deliberately
retains the nested `.post-list-wrap .post-title` rule; it is not this bridge and
is unchanged.

Current `frontend/src/routes/sites/postList.tsx` and `issueList.tsx` have no
static or dynamic temporary bridge emitter. Their actual row, info, title-link,
and metadata DOM already has the respective `site-post-list-*` and
`site-issue-list-*` StyleX owners. The focused static contract was observed RED
before deletion because all four standalone selector prefixes existed, and is
GREEN afterward by rejecting those exact prefixes while requiring the existing
owners.

## Managed browser matrix

The `/sites/postList` and `/sites/issueList` fixtures each mock only their
current site-admin/session API boundary. They assert the legacy avatar/info/meta
child order, visible title owner, generated-fallback link state, desktop
containment, and 390px title/no-horizontal-overflow geometry. Normal runs keep
the generated fallback link; fallback-off runs omit it.

```sh
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node \\
  ../scripts/run-playwright-e2e.mjs --timeout=30000 \\
  -g "site post-row fallback bridges|post-list output retains|issue-list output retains" \\
  tests/legacy-fallback-off.e2e.ts

VITE_DISABLE_LEGACY_FALLBACK=1 \\
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node \\
  ../scripts/run-playwright-e2e.mjs --timeout=30000 \\
  -g "site post-row fallback bridges|post-list output retains|issue-list output retains" \\
  tests/legacy-fallback-off.e2e.ts
```

Both managed runs passed on 2026-07-20 after the static contract turned GREEN.

## Discovery boundary

Global fallback-off discovery remains incomplete and non-green. This bounded
retirement does not claim generated-fallback unlinking or live-legacy visual
parity.
