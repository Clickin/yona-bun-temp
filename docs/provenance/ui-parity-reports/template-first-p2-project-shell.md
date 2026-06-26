# Template-First UI Parity Report: P2 Project Shell/Settings

Status: current reset baseline
Date: 2026-06-26
Owner packet: P2 project shell/settings
Mode: template-first mapper baseline; implementation not started

## Scope

This report reopens project shell/settings parity under
`docs/plans/2026-06-26-template-first-ui-parity-reset.md`.

The older `ui-parity-project-home-admin.md` report remains useful for REST and
route-state coverage. It does not prove the legacy `projectLayout`,
`project/header`, and `projectMenu` template visual contract is pixel-level
equivalent.

## Legacy Template Call Graph

| Legacy source | Role | Required anchors |
| --- | --- | --- |
| `yona-original/app/views/projectLayout.scala.html` | Project shell wrapper. Calls `layout(..., "prj")`, `common.navbar(menuType, project, null)`, `project.header(project)`, body, `common.footer()`. | Project pages must inherit global shell plus project header before route body. |
| `yona-original/app/views/project/header.scala.html` | Project hero/header. | `.project-header-outer[style*=background-image]`, `.project-header-inner`, `.project-header-wrap`, `.project-header-avatar`, `.project-breadcrumb-wrap`, `.project-breadcrumb`, `.project-author`, `.project-name`, `.user-project-list`, `.star.material-icons`, `.project-private`, `.project-protected`, `.project-origin`, `.project-util-wrap`, `.project-util`, `.watch-btn`, `.watcher-count`, `.watchBtn`, `#enrollBtn`. |
| `yona-original/app/views/projectMenu.scala.html` | Project main menu and admin cog. | `.project-menu-outer`, `.project-menu-inner`, `.project-menu-nav.project-menu-gruop`, `.menu-name`, `.short-menu`, `.project-menu-count`, `.project-setting`, `.yobicon-cog`. |
| `yona-original/app/views/project/partial_settingmenu.scala.html` | Settings sub-tabs. | `.nav.nav-tabs`, `#subMenuProjectSetting`, `#subMenuProjectMember`, `#subMenuIssueLabel`, `#subMenuWebhook`, `#subMenuProjectTransfer`, `#subMenuProjectDelete`, `#subMenuProjectChangeVCS`, `.num-badge`. |
| `yona-original/app/views/project/home.scala.html` | Project home content. | `.page-wrap-outer`, `.project-page-wrap`, mobile `.project-breadcrumb`, `.project-home-header.row-fluid`, `.project-overview`, `#project-description.markdown-wrap`, `#project-description-input`, `#cloneURL`, `#cloneURLBtn`, `.span-left-pane`, `.span-right-pane`, `#alertLeave`. |
| `project/setting.scala.html`, `members.scala.html`, `watchers.scala.html`, `webhooks.scala.html`, `delete.scala.html`, `transfer.scala.html`, `change_vcs.scala.html` | Project settings/admin pages. | `.bubble-wrap.gray`, `.box-wrap.top/middle/bottom`, `.cu-label`, `.cu-desc`, legacy checkbox/radio labels, destructive modal IDs, webhook form/list IDs, watcher member list. |

## Current React/CSS Targets

| Current source | Current responsibility |
| --- | --- |
| `frontend/src/routes/-project-views.tsx` | Project header, menu, home, settings, members, watchers, webhooks, delete, transfer, change VCS. |
| `frontend/src/routes/$owner/$projectName/**` | Route entrypoints for project pages. |
| `frontend/src/app.css` | Project header/menu/settings visual approximation. |
| `frontend/tests/project-home-parity.e2e.ts`, `project-settings-parity.e2e.ts`, `project-members-parity.e2e.ts`, `project-webhooks-parity.e2e.ts`, `project-delete-parity.e2e.ts`, `project-transfer-parity.e2e.ts`, `project-change-vcs-parity.e2e.ts` | Route/interaction proof. |
| `frontend/src/project-home-tabs.spec.tsx`, `frontend/src/project-settings-parity.spec.tsx`, `frontend/src/project-members-parity.spec.tsx`, `frontend/src/project-watchers-parity.spec.tsx` | Static selector proof. |

## Open Reset Queue Summary

Source comparison by Subagent P2 found concrete reset blockers:

| status | count |
| --- | ---: |
| gap | 9 |
| deviation | 3 |
| weak evidence | 3 |
| covered | 1 |

## Reset Findings

| legacy template | legacy route/state | current file | defect class | status | owner packet | proposed write scope | verification evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `project/header.scala.html` | Any project page, viewer can watch/enroll. | `frontend/src/routes/-project-views.tsx` | layout | gap | P2 | `ProjectHeader`, project container view model/API if needed | Legacy has `.project-util-wrap` and project util dropdown controls; current mapper found `ProjectHeader` lacks this wrapper. |
| `project/header.scala.html` | Any project page. | `frontend/src/routes/-project-views.tsx`, `frontend/src/route-parity.spec.tsx` | layout | covered in current follow-up | P2 | none | Removed the non-legacy `.project-title-text` wrapper from `ProjectHeader`; focused route parity now asserts that the class is absent while preserving legacy owner/project breadcrumb anchors. |
| `projectMenu.scala.html` | Project menu with admin update permission and enrollment requests. | `frontend/src/routes/-project-views.tsx` | data-boundary | gap | P2 | `ProjectMenu`, project view model | Legacy admin cog includes `project.enrolledUsers.size` badge; current cog has no badge. |
| `projectMenu.scala.html` | Any project page. | `frontend/src/routes/-project-views.tsx` | layout | weak evidence | P2 | `ProjectMenu`, tests | Current always renders visible `ProjectKeymapHelp`; mapper found no matching visible markup in `projectMenu.scala.html`. |
| `project/partial_settingmenu.scala.html` | Settings submenu with enroll requests. | `frontend/src/routes/-project-views.tsx` | data-boundary | gap | P2 | settings tab component, project settings/member API data | Legacy member tab shows `.num-badge`; current submenu cannot render the count. |
| `project/watchers.scala.html` | `/owner/project/watchers`, private/protected/custom-menu project. | `frontend/src/routes/$owner/$projectName/watchers/route.tsx` | data-boundary | gap | P2 | `watchers/route.tsx`, `-project-views.tsx` | Current uses synthetic `projectShellDetail`, losing logo/background/scope/menu/count state. |
| `project/members.scala.html` | `/owner/project/members`, custom-menu project. | `frontend/src/routes/$owner/$projectName/members/route.tsx` | data-boundary | gap | P2 | `members/route.tsx`, `-project-views.tsx` | Current shell detail is synthesized from members response. |
| `project/webhooks.scala.html` | Webhook list, viewer can read but cannot create. | `frontend/src/routes/$owner/$projectName/webhooks/route.tsx` | permission | gap | P2 | `webhooks/route.tsx` | Legacy hides create form only; current route returns `ForbiddenPage` when `!viewerCanUpdate`. |
| `project/setting.scala.html` | Settings form with logo. | `frontend/src/routes/-project-views.tsx` | asset | gap | P2 | `ProjectSettingsPage` | Legacy `.logo-wrap` has `background-image:url(...)`; current `.logo-wrap` is empty. |
| `project/setting.scala.html` | Git project, code menu off. | `frontend/src/routes/-project-views.tsx` | layout | gap | P2 | `ProjectSettingsPage` | Legacy keeps `#defaultBranceSettingPanel` hidden; current omits it when code is off or no branches exist. |
| `project/setting.scala.html` | Reviewer count dropdown. | `frontend/src/routes/-project-views.tsx` | layout | deviation | P2 | `ProjectSettingsPage` | Legacy uses `.btn-group.branches > button + ul.dropdown-menu`; current uses native `select`. |
| `project/home.scala.html` | Project home sidebar. | `frontend/src/routes/-project-views.tsx` | layout | deviation | P2 | `ProjectDetailPage` | Current adds `section > h3 Project dashboard` and `.runtime-grid`; legacy sidebar has button wrap, milestone, and member info only. |
| `project/home.scala.html` | SVN project with code menu enabled. | `frontend/src/routes/-project-views.tsx` | interaction | gap | P2 | `ProjectDetailPage` | Legacy fork button only appears for Git; current shows fork whenever `detail.showCode`. |
| `project/create.scala.html` | New project form, SVN selected. | `frontend/src/routes/-project-views.tsx` | layout | deviation | P2 | project create form component | Legacy always renders PR menu checkbox; current hides the PR checkbox when SVN is selected. |
| `project/members.scala.html` | Role dropdown. | `frontend/src/routes/-project-views.tsx` | layout | weak evidence | P2 | `ProjectMembersPage` | Legacy dropdown items are `<a data-loginId>`; current uses `<button data-loginid>`. |
| `project/partial_webhooks_list.scala.html` | Existing webhook row. | `frontend/src/routes/-project-views.tsx` | interaction | weak evidence | P2 | `ProjectWebhooksPage` | Legacy checkbox has `onclick="return false;"`; current uses a read-only checkbox. |

## Verifier Baseline Required

P2 cannot close until verifier evidence includes:

- desktop/mobile legacy/current screenshots for project home, settings,
  members, watchers, webhooks, transfer/delete/changeVCS, and at least one
  private/protected/forked project header state;
- computed-style/layout proof for `.project-header-outer`,
  `.project-header-avatar`, `.project-breadcrumb-wrap`, `.project-util-wrap`,
  `.project-menu-outer`, `.project-menu-nav`, `.page-wrap-outer`,
  `.project-page-wrap`, `.bubble-wrap.gray`, `.box-wrap`, `.cu-label`, and
  `.cu-desc`;
- conditional branch proof for watcher/favorite/enroll/member/admin/menu
  settings states;
- REST boundary proof retained from the older report, but treated as supporting
  evidence only.
