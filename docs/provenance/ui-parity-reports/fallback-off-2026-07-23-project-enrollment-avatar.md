# Project enrollment avatar wrapper — Batch 835

The project-members enrollment-request state was checked against the enrolled
users block in `yona-original/app/views/project/members.scala.html`. The frozen
style source is `yobi.less:1-13`, including `_common.less:207` (`.mr10`) and
Bootstrap `.pull-left { float:left; }` plus the complete imported LESS chain.
The React route preserves the 65px avatar, link/details/button DOM order,
legacy classes, copy, and existing Add behavior; only the avatar wrapper's
frozen float/gap is owned by route-local StyleX.

Evidence:

- `frontend/src/routes/$ownerName/$projectName/members.tsx`
- `frontend/tests/stylex-project-members-list.e2e.ts`
- Normal and fallback-off managed system-Chrome focused runs: 1/1 passed each.
- The Add test observes the existing project-members POST for `bob`.
- Desktop and 390px geometry/containment assertions pass without compensating
  route CSS.

The live legacy server was unavailable, so live screenshot parity is explicitly
unverified. The Yoram footer/provider/developer-contact/repository differences
are the user-approved intentional identity change and are not a gap.
