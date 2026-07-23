# Project History avatar wrapper — Batch 836

The project-home History activity state was checked against
`yona-original/app/views/project/partial_history.scala.html:49-55`. The frozen
style source is `yobi.less:1-13`, including `_common.less:207` (`.mr10`),
Bootstrap `.pull-left { float:left; }`, and the complete imported LESS chain.
The React route preserves the 32px avatar/link, legacy classes, fallback
`default-avatar-64` asset, History copy, and activity order; only the wrapper's
frozen float/gap is owned by route-local StyleX.

Evidence:

- `frontend/src/routes/$ownerName/$projectName.tsx`
- `frontend/tests/stylex-project-history-avatar-wrapper.e2e.ts`
- Normal and fallback-off managed system-Chrome focused runs: 1/1 passed each.
- Desktop and 390px geometry/containment, fallback avatar, and History link/copy
  assertions pass without compensating route CSS.

The live legacy server was unavailable, so live screenshot parity is explicitly
unverified. The Yoram footer/provider/developer-contact/repository differences
are the user-approved intentional identity change and are not a gap.
