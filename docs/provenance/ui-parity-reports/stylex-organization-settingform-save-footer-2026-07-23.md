# Organization settings Save footer — 2026-07-23

Status: implemented; live legacy screenshot comparison unverified.

## Evidence boundary

- Legacy output: `yona-original/app/views/organization/setting.scala.html` emits `form#saveSetting`, `<div class="box-wrap bottom">`, and the Save button.
- Frozen desktop cascade: `_page.less:2062-2078` defines `padding:20px 0`, `padding-bottom:12px`, `border-bottom:0 none`, and `text-align:center`.
- Frozen responsive cascade: `_responsive.less:126-128` defines `.box-wrap { padding:10px 0 !important; }`, the effective mobile result.
- React owner: `frontend/src/routes/organizations/$organizationName/settingform.tsx` and `-settingform.stylex.ts` own the footer through `organization-setting-save-footer`.

The `box-wrap bottom` class, Save button DOM/copy/order, React PATCH mutation, and fallback declarations for other `.box-wrap` consumers remain intact. The mobile breakpoint values are the effective frozen responsive values, not compensating geometry.

## Verification

`frontend/tests/stylex-organization-setting-form.e2e.ts` passed 4/4 in both managed dynamic-port modes with `PW_CHANNEL=chrome` outside the sandbox. It checks Scala/LESS/import provenance, computed desktop/mobile declarations, footer and Save containment/centering, absence of inline style, and the Save PATCH boundary.

Screenshots:

`output/playwright/visual-sweep/stylex-organization-setting-form-{desktop,mobile}.png`

The live legacy renderer was unavailable, so direct screenshot parity remains explicitly unverified. Approved Yoram footer differences—NAVER/NAVER LABS/NAVER CLOUD, upstream Yona repository URL, and developer-contact entries—remain intentional product changes.
