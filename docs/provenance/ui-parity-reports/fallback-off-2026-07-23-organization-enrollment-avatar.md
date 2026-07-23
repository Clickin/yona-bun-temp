# Organization enrollment avatar wrapper — Batch 834

The organization members enrollment-request state was checked against
`yona-original/app/views/organization/members.scala.html:89-103`. The frozen
style source is `yobi.less:1-13`, including `_common.less:50-101` (`.pull-left`
and `.mr10`) and its complete imported LESS chain. The React route preserves
the legacy avatar/link/details/button DOM order, 65px image dimensions, copy,
and accept interaction; only the avatar wrapper's frozen float/gap is owned by
route-local StyleX.

Evidence:

- `frontend/src/routes/organizations/$organizationName/members.tsx`
- `frontend/tests/stylex-organization-members-list.e2e.ts`
- Normal and fallback-off managed system-Chrome focused suites: 5/5 passed each.
- The accept test observes `POST /api/v1/organizations/weblabs/enrollments/3/accept`.
- The 390px assertion preserves the legacy narrow `.span2` behavior; no
  compensating route CSS was added.

The live legacy server was unavailable, so live screenshot parity is
explicitly unverified. The Yoram footer/provider/developer-contact/repository
differences are the user-approved intentional identity change and are not a
gap or regression.
