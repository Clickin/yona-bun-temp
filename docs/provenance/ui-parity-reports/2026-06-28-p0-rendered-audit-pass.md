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
| `source-match-rendered-check-needed` | 5 | Current React source has the expected legacy anchors or wrapper shape, but the route still needs rendered browser evidence. |
| `intentional-deviation-recorded` | 3 | Legacy framed iframe shells conflict with the current SPA-sidebar directive; the deviation is documented and must stay guarded. |
| `gap-candidate-rendered-check-needed` | 3 | Source review found a likely parity gap or user-state mismatch that requires rendered confirmation and then implementation or explicit deviation. |
| `thin-wrapper-caller-check-needed` | 1 | The P0 template delegates almost all UI to an included template/caller; verify through that caller route. |

## P0 Findings

| legacy template | queue lane | current source evidence | audit status | required next rendered evidence |
| --- | --- | --- | --- | --- |
| `layout_framed.scala.html` | V0 low-overlap | Legacy renders `body.framed-body`, `#sidebar`, `#sidebar-bottom`, `#mainFrame`, and iframe `#mainFrameId`. Current `__root.tsx` removed the old `/sidebar` iframe shell per the parent directive, and `rg` finds no active `mainFrame`/`mainFrameId` route anchor. | `intentional-deviation-recorded` | Add/keep a browser assertion that no framed iframe shell is active and the SPA root sidebar is the only sidebar contract. |
| `help/markdown.scala.html` | V0 low-overlap | Current `LegacyMarkdownHelp` in `-markdown-renderer.tsx` preserves `markdown-help`, `markdown-help-nav`, `help-nav`, `data-toggle="markdown-help"`, and `data-target` section anchors. It is included from issue/PR editor callers, not from `/_help`. | `source-match-rendered-check-needed` | Render an issue or PR editor route and assert the markdown help nav sections, `data-target` values, and sample input/output blocks. |
| `index/index.scala.html` | V1 manual | Legacy template is a thin wrapper over `views.html.index.notifications(currentUser)`. Current `/` route renders `HomePage`; notifications live at `/notification`/`/notifications`. | `gap-candidate-rendered-check-needed` | Verify logged-in legacy home/default route behavior against current `/`, `/notification`, and sidebar default landing behavior; then record gap/deviation or implement user-state routing parity. |
| `index/sidebar.scala.html` | V1 manual | Legacy template is a thin wrapper over `siteLayout_framed(...) {}`. Current parent directive retires framed sidebar iframe behavior and moves sidebar into the root SPA layout. | `intentional-deviation-recorded` | Keep SPA root sidebar rendered checks tied to `common/usermenu.scala.html` anchors; do not restore `siteLayout_framed` iframe behavior. |
| `projectLayout.scala.html` | V1 manual | Legacy wraps project pages with `layout(...)("prj")`, `common.navbar`, `project.header`, content, and `common.footer`. Current project route renders `ProjectHeader`, `ProjectMenu`, and `page-wrap-outer`; root layout owns navbar/footer. | `source-match-rendered-check-needed` | Render `/:owner/:projectName` and a nested project route to assert root navbar, project header/menu order, `page-wrap-outer`, and footer presence. |
| `organizationLayout.scala.html` | V1 manual | Legacy wraps organization pages with `layout`, `common.navbar`, content, and `common.footer`; concrete org pages include `organization.header`/`organization.menu`. Current org route has `OrganizationHeader`, `OrganizationMenu`, and `organization-page` shell while root owns navbar/footer. | `source-match-rendered-check-needed` | Render `/organizations/:organizationName` and nested org pages to assert root navbar, organization header/menu, content order, and footer presence. |
| `search/result.scala.html` | V1 manual | Legacy chooses `projectLayout`, `organizationLayout`, or `siteLayout` based on search scope and then includes `partial_search`. Current `SearchRoutePage` imports `ProjectHeader`/`ProjectMenu` and `OrganizationHeader`/`OrganizationMenu` for scoped search. | `source-match-rendered-check-needed` | Render global, project, and organization search results and assert the correct shell variant plus `partial_search` category/result structure. |
| `restricted.scala.html` | V1 manual | Legacy renders the novelty restricted page inside `siteLayout`: heading `Sshhh...don't tell anyone!`, Gangnam Style iframe, local user details, provider/session text. Current `RestrictedPage` preserves those visible anchors. | `source-match-rendered-check-needed` | Render `/restricted` with a credential fixture and assert heading, iframe URL, user label/email, verification state, provider, and expiry copy. |
| `site/setting.scala.html` | V1 manual | Legacy site setting page delegates to `siteMngLayout(message) { TODO }`. Current `sites/$pageName` has concrete admin page implementations; no direct `TODO` page parity evidence was found in source review. | `gap-candidate-rendered-check-needed` | Render `/sites/setting` and decide whether legacy `TODO` must be preserved, mapped to an existing admin page, or recorded as an explicit deviation. |
| `siteLayout_framed.scala.html` | V1 manual | Legacy delegates to `layout_framed` with navbar/content/footer. Current parent directive retires framed iframe layout in favor of SPA root layout/sidebar. | `intentional-deviation-recorded` | Same guard as `layout_framed.scala.html`: rendered checks must prove the framed shell is absent and SPA root layout is active. |
| `siteLayout.scala.html` | V1 manual | Legacy wraps site pages with `layout`, `common.navbar`, content, and `common.footer`. Current root layout owns navbar/footer, while `sites/$pageName` renders `site-admin-page` and `site-setting-wrap` admin content. | `thin-wrapper-caller-check-needed` | Render representative `/sites/userList`, `/sites/projectList`, and `/sites/update` pages to assert root navbar/footer plus site admin nav/content order. |
| `common/childCommentsAnchorDiv.scala.html` | V0 low-overlap | Legacy emits empty anchor divs `id="comment-@comment.id"` for child comments. Current issue/board/PR/comment code renders `id={\`comment-${comment.id}\`}` on comment list items, but source review did not prove separate empty child anchors for every caller state. | `gap-candidate-rendered-check-needed` | Render issue and board detail pages with nested comments and assert hash anchors for child comments target the same IDs legacy emitted. |

## P0 Exit Criteria

The P0 queue is not closed by this pass. Each row above must either gain
browser-rendered evidence in the owning route or be moved to a documented
`gap`, `deviation`, or `deferred` record. The framed-layout rows are already
classified as intentional deviations only because the current parent directive
explicitly requires SPA root-layout sidebar behavior.
