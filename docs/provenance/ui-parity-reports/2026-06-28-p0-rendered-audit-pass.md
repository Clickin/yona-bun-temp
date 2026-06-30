# 2026-06-28 P0 Rendered Audit Pass

Status: active P0 findings
Date: 2026-06-28
Sources: `2026-06-28-rendered-verification-queue.md`,
`yona-original/app/views/**`, `frontend/src/routes/**`

This pass opens the 12 P0 rows from the rendered verification queue. It is not
closure evidence. It records which rows already have strong source parity
signals, which rows are intentional deviations from the current parent
directive, and which rows must still be checked in a browser-rendered route.

## Summary

| status | count | meaning |
| --- | ---: | --- |
| `source-match-rendered-check-needed` | 4 | Current React source has the expected legacy anchors or wrapper shape, but the route still needs rendered browser evidence. |
| `rendered-metric-guard-passed` | 2 | Rendered browser evidence now proves the legacy DOM roots and layout metrics for the row. |
| `intentional-deviation-recorded` | 3 | Legacy framed iframe shells conflict with the current SPA-sidebar directive; the deviation is documented and must stay guarded. |
| `gap-candidate-rendered-check-needed` | 2 | Source review found a likely parity gap or user-state mismatch that requires rendered confirmation and then implementation or explicit deviation. |
| `thin-wrapper-caller-check-needed` | 1 | The P0 template delegates almost all UI to an included template/caller; verify through that caller route. |

## P0 Findings

| legacy template | queue lane | current source evidence | audit status | required next rendered evidence |
| --- | --- | --- | --- | --- |
| `layout_framed.scala.html` | V0 low-overlap | Legacy renders `body.framed-body`, `#sidebar`, `#sidebar-bottom`, `#mainFrame`, and iframe `#mainFrameId`. Current `__root.tsx` removed the old `/sidebar` iframe shell per the parent directive, and `rg` finds no active `mainFrame`/`mainFrameId` route anchor. | `intentional-deviation-recorded` | `frontend/src/auth-workspace-shell.spec.tsx` now asserts the Scala framed anchors exist and active React root/sidebar route plus CSS do not restore `framed-body`, `#sidebar-bottom`, `#mainFrame`, `#mainFrameId`, or `name="mainFrame"`. Focused run: `pnpm --dir frontend test src/auth-workspace-shell.spec.tsx` passed, 67 tests. |
| `help/markdown.scala.html` | V0 low-overlap | Current active root shell handles the legacy `help/markdown.scala.html` delegated click contract for `.markdown-help-nav [data-toggle="markdown-help"]`, preserving the ten `data-target` section anchors and matching `.help-nav.active` / `.markdown-help-wrap > .active` state. | `rendered-interaction-guard-passed` | `frontend/tests/ui-kit.e2e.ts` injects the legacy markdown help partial into `/_UIKit`, compares the stable rendered `.markdown-help` subtree against `help/markdown.scala.html`, asserts all ten `data-target` values, clicks between `markdownLinks` and `markdownLists`, and proves the legacy same-tab deactivation branch. |
| `index/index.scala.html` | V1 manual | Legacy template is a thin wrapper over `views.html.index.notifications(currentUser)`. Current `/` route renders `HomePage`; notifications live at `/notification`/`/notifications`. | `rendered-metric-guard-passed` | `frontend/tests/authenticated-home-empty-notifications.e2e.ts` renders authenticated `/` and `/notifications` with empty and populated notification fixtures, compares the stable `.unsupported`, `.gnb-outer`, `.page-wrap-outer`, and `.page-footer-outer` roots from `index/notifications.scala.html`, and asserts the notification tabs, guide toggle, empty warning, stream row, desktop shell metrics, and 390px mobile behavior. |
| `index/sidebar.scala.html` | V1 manual | Legacy template is a thin wrapper over `siteLayout_framed(...) {}`. Current parent directive retires framed sidebar iframe behavior and moves sidebar into the root SPA layout. | `intentional-deviation-recorded` | Keep SPA root sidebar rendered checks tied to `common/usermenu.scala.html` anchors; do not restore `siteLayout_framed` iframe behavior. |
| `projectLayout.scala.html` | V1 manual | Legacy wraps project pages with `layout(...)("prj")`, `common.navbar`, `project.header`, content, and `common.footer`. Current project settings route renders the root navbar/footer plus project header/menu and page content in that order. | `rendered-metric-guard-passed` | `frontend/tests/project-settings-form.e2e.ts` renders `/admin/sample/setting`, compares the stable `.unsupported`, `.gnb-outer`, `.project-header-outer`, `.project-menu-outer`, `.page-wrap-outer`, and `.page-footer-outer` roots, and asserts the rendered root order follows `projectLayout.scala.html`. |
| `organizationLayout.scala.html` | V1 manual | Legacy wraps organization pages with `layout`, `common.navbar`, content, and `common.footer`; concrete org settings adds `organization.header` and `organization.menu` before content. Current organization settings route renders the root navbar/footer plus organization header/menu and page content in that order. | `rendered-metric-guard-passed` | `frontend/tests/organization-settings-form.e2e.ts` renders `/organizations/weblabs/settingform`, compares the stable `.unsupported`, `.gnb-outer`, `.project-header-outer`, `.project-menu-outer`, `.page-wrap-outer`, and `.page-footer-outer` roots, and asserts the rendered root order follows `organizationLayout.scala.html` plus its concrete header/menu caller. |
| `search/result.scala.html` | V1 manual | Legacy chooses `projectLayout`, `organizationLayout`, or `siteLayout` based on search scope and then includes `partial_search`. Current `SearchRoutePage` imports `ProjectHeader`/`ProjectMenu` and `OrganizationHeader`/`OrganizationMenu` for scoped search. | `source-match-rendered-check-needed` | Render global, project, and organization search results and assert the correct shell variant plus `partial_search` category/result structure. |
| `restricted.scala.html` | V1 manual | Legacy renders the novelty restricted page inside `siteLayout`: heading `Sshhh...don't tell anyone!`, Gangnam Style iframe, local user details, provider/session text. Current `RestrictedPage` preserves those visible anchors. | `rendered-metric-guard-passed` | `frontend/tests/restricted.e2e.ts` renders `/restricted` with a session fixture and compares the stable `.unsupported`, `.gnb-outer`, `.page-wrap-outer`, and `.page-footer-outer` roots against `restricted.scala.html`; it also asserts the `560x315` iframe, identity/provider/expiry copy, desktop nav/page/footer metrics, and 390px mobile shell metrics. |
| `site/setting.scala.html` | V1 manual | Legacy site setting page delegates to `siteMngLayout(message) { TODO }`, but `SiteApp.java` routes/imports the concrete admin pages and `siteMngLayout.scala.html` does not link a setting page. Current React keeps the concrete site-admin pages instead of restoring a visible TODO placeholder. | `intentional-deviation-recorded` | `frontend/tests/site-admin-user-list.e2e.ts` renders `/sites/userList` and asserts the site-admin nav has no `/sites/setting` link and `.site-setting-wrap` does not contain `TODO`; the deviation is recorded in the rendered evidence manifest. |
| `siteLayout_framed.scala.html` | V1 manual | Legacy delegates to `layout_framed` with navbar/content/footer. Current parent directive retires framed iframe layout in favor of SPA root layout/sidebar. | `intentional-deviation-recorded` | Same focused guard as `layout_framed.scala.html`: `frontend/src/auth-workspace-shell.spec.tsx` asserts `@layout_framed` remains legacy-only and active React/CSS do not restore the iframe shell. |
| `siteLayout.scala.html` | V1 manual | Legacy wraps site pages with `layout`, `common.navbar`, content, and `common.footer`. Current root layout owns navbar/footer, while `sites/$pageName` renders `site-admin-page` and `site-setting-wrap` admin content. | `thin-wrapper-caller-check-needed` | Render representative `/sites/userList`, `/sites/projectList`, and `/sites/update` pages to assert root navbar/footer plus site admin nav/content order. |
| `common/childCommentsAnchorDiv.scala.html` | V0 low-overlap | Legacy emits empty anchor divs `id="comment-@comment.id"` for child comments. Current issue/board/PR/comment code renders `id={\`comment-${comment.id}\`}` on comment list items, but source review did not prove separate empty child anchors for every caller state. | `gap-candidate-rendered-check-needed` | Render issue and board detail pages with nested comments and assert hash anchors for child comments target the same IDs legacy emitted. |

## P0 Exit Criteria

The P0 queue is not closed by this pass. Each row above must either gain
browser-rendered evidence in the owning route or be moved to a documented
`gap`, `deviation`, or `deferred` record. The `index/index.scala.html` row is
closed by rendered authenticated home evidence in
`frontend/tests/authenticated-home-empty-notifications.e2e.ts`, and the
`restricted.scala.html` row is closed by rendered route evidence in
`frontend/tests/restricted.e2e.ts`. The framed-layout rows are already
classified as intentional deviations only because the current parent directive
explicitly requires SPA root-layout sidebar behavior.
