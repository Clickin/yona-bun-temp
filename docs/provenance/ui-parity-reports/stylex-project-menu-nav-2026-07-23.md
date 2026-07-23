# Project-route project-menu navigation StyleX parity report

- State: authenticated populated project route `/admin/sample`, all project menu features enabled, project settings visible.
- Legacy output: `yona-original/app/views/projectMenu.scala.html`.
- Frozen cascade: `yobi.less:1-13`, `_page.less:627-719`, `_responsive.less:273-289`, `_common.less`, Bootstrap, and `conf/messages`.
- React owners: `projectMenuNavStyles` in `frontend/src/routes/$ownerName/$projectName.tsx` owns menu item/link/active pseudo, mobile short-menu/name/padding, and count positioning declarations for the project route only.
- Preserved contract: legacy menu classes, DOM/order/copy, conditional menu visibility, Link targets, counts, active/hover behavior, and organization-route fallback consumers.
- Focused evidence: `frontend/tests/stylex-project-menu-nav.e2e.ts` checks seven menu items, hrefs, counts, active pseudo colors, responsive declarations, desktop/390px metrics, and menu-owner containment.
- Verification: managed system-Chrome normal 1/1 and fallback-off 1/1 passed at 1366px and 390px.
- Gap: live legacy rendering was unavailable, so screenshot parity is explicitly unverified. A known shared authenticated shell document overflow is outside the project-menu owner and no compensating geometry was added.
- Intentional Yoram identity diff: footer/provider/developer-contact/upstream repository entries unrelated to Yoram remain omitted by design.
