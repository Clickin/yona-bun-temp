# Organization-home project-menu active pseudo StyleX parity report

- State: authenticated organization home `/organizations/weblabs`, four organization menu links, Home active.
- Legacy output: `yona-original/app/views/organization/menu.scala.html`.
- Frozen cascade: `yobi.less:1-13`, `_page.less:627-686`, `_responsive.less:281-283`, `_common.less`, Bootstrap, and `conf/messages`.
- React owner: `organizationMenuMigrationStyles.activeItem` in `frontend/src/routes/organizations/$organizationName.tsx` owns only active color and the exact before/after triangle pseudos.
- Preserved contract: plain-text organization links, legacy classes/DOM/order/copy, Link navigation, active state, existing item/link owners, and natural mobile text wrapping.
- Focused evidence: `frontend/tests/stylex-organization-menu-active-pseudo.e2e.ts` checks source/import/message provenance, active order/hrefs, pseudo content/position/border colors, hover, desktop/mobile containment, and fallback-off behavior.
- Verification: managed system-Chrome normal 1/1 and fallback-off 1/1 passed at 1366px and 390px.
- Gap: live legacy rendering was unavailable, so screenshot parity is explicitly unverified. Mobile vertical wrapping is legacy-derived; no compensating geometry was added.
- Intentional Yoram identity diff: footer/provider/developer-contact/upstream repository entries unrelated to Yoram remain omitted by design.
