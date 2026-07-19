# Batch 538 notification and milestone fallback retirement

## Scope

This batch changes only React runtime assets. `yona-original/**/*.css` and
`yona-original/**/*.less` remain immutable evidence.

- `user/edit_notifications.scala.html:38-44` and its Setting behavior emit/select project-tab
  anchors; current React notifications emit Links and their existing StyleX owners cover list,
  item, link, and selected state. The obsolete `#notification-projects li button` branches are
  removed only from `frontend/src/app.css`.
- `milestone/list.scala.html:80-130` has no `.infos .desc` node in the current list surface.
  `frontend/scripts/build-legacy-css.mjs` excludes only the exact rendered Yobi selector
  `.milestones .milestone .infos .desc`. Its adjacent `progress-wrap`, `actrow`, and
  `completion-rate` rules remain in the generated fallback.

## Verification

```sh
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend build:legacy-css
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend test:e2e -- tests/legacy-fallback-off.e2e.ts
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend test:e2e:fallback-off -- tests/legacy-fallback-off.e2e.ts
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend test:e2e -- tests/stylex-project-milestones-progress-residual.e2e.ts
```

These are generated-asset and source-ownership contracts, not a live legacy visual comparison.

2026-07-19 results: `build:legacy-css` regenerated the asset and manifest with fallback SHA-256
`8b437655422bcfe1e612e7320362c3b52e6f65ec43c064dd344e8e7e5de18be6`; the normal asset contract,
fallback-off link contract, milestone residual contract, and `frontend check` passed.

## Global discovery status

Fallback-off global discovery remains incomplete and non-green. This focused retirement does not
claim global fallback unlinking or live visual parity.
