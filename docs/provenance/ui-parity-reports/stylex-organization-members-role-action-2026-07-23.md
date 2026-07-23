# Organization members role/action meta — 2026-07-23

Status: implemented; live legacy screenshot comparison unverified.

## Evidence boundary

- Legacy output: `yona-original/app/views/organization/members.scala.html:45-65` emits the member role dropdown and delete action inside `.member-setting`.
- Frozen cascade: `yona-original/app/assets/stylesheets/less/_page.less:2185-2212` defines the meta geometry: `position:absolute`, `right:0`, and `top:15px`.
- React owner: `frontend/src/routes/organizations/$organizationName/members.tsx` adds those declarations to the existing `organization-member-meta` StyleX owner while retaining the legacy class and DOM.

Role state, mutation behavior, delete confirmation, copy/order, and responsive fallback were not changed. The test's mobile document-edge tolerance reflects the frozen member row's `margin-left:5px` and `width:100vw`; it is not a route-specific CSS compensation.

## Verification

`frontend/tests/stylex-organization-members-list.e2e.ts` passed 9/9 in managed dynamic-port Playwright with `PW_CHANNEL=chrome` outside the sandbox. Coverage includes source/import provenance, computed geometry, role PATCH, delete interaction, desktop/mobile containment, and normal/fallback-off screenshots:

`frontend/output/playwright/visual-sweep/stylex-organization-members-role-action-{normal,fallback-off}-{desktop,mobile}.png`

The live legacy renderer was unavailable, so screenshot parity against a concurrently rendered legacy page remains explicitly unverified. No compensating geometry was added.

The approved Yoram footer differences—NAVER/NAVER LABS/NAVER CLOUD, upstream Yona repository URL, and developer-contact entries—are intentional product changes and are not gaps for this screen.
