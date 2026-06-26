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
| gap | 0 |
| deviation | 0 |
| weak evidence | 0 |
| covered | 16 |

## Reset Findings

| legacy template | legacy route/state | current file | defect class | status | owner packet | proposed write scope | verification evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `project/header.scala.html` | Any project page, viewer can watch/enroll. | `frontend/src/routes/-project-views.tsx`, `frontend/src/app.css`, `frontend/src/project-home-tabs.spec.tsx`, `frontend/src/wave2a-container-parity.spec.tsx` | layout | covered in current follow-up | P2 | none | `ProjectHeader` now renders legacy `.project-util-wrap > ul.project-util` with enrollment dropdown, `#enrollBtn`, `.watch-btn`, `.watcher-count`, `.watch-on`, and `.watchBtn` anchors; React handlers keep current REST mutations instead of importing legacy JS. CSS restores the legacy absolute header placement and watcher/down-arrow classes. |
| `project/header.scala.html` | Any project page. | `frontend/src/routes/-project-views.tsx`, `frontend/src/route-parity.spec.tsx` | layout | covered in current follow-up | P2 | none | Removed the non-legacy `.project-title-text` wrapper from `ProjectHeader`; focused route parity now asserts that the class is absent while preserving legacy owner/project breadcrumb anchors. |
| `projectMenu.scala.html` | Project menu with admin update permission and enrollment requests. | `crates/server/src/api_types.rs`, `crates/server/src/routes/utils.rs`, `frontend/src/api/types.ts`, `frontend/src/app-view-models.ts`, `frontend/src/routes/-project-views.tsx`, `frontend/src/project-settings-parity.spec.tsx` | data-boundary | covered in current follow-up | P2 | none | Project detail/container DTOs and the frontend view model now carry `enrollmentRequestCount` from existing project membership directory data. `ProjectMenu` renders the legacy admin cog `<span class="project-menu-count">N</span>` when the count is positive. |
| `projectMenu.scala.html` | Any project page. | `frontend/src/routes/-project-views.tsx`, `frontend/src/project-keymap.spec.tsx` | layout | covered in current follow-up | P2 | none | `ProjectMenu` no longer renders visible `ProjectKeymapHelp` by default because `projectMenu.scala.html` does not include `help.keymap`. Pages whose legacy templates explicitly call `@help.keymap(...)` keep passing `keymapMode` and still render the legacy `#helpKeys` modal. |
| `project/partial_settingmenu.scala.html` | Settings submenu with enroll requests. | `crates/server/src/api_types.rs`, `crates/server/src/routes/utils.rs`, `frontend/src/api/types.ts`, `frontend/src/app-view-models.ts`, `frontend/src/routes/-project-views.tsx`, `frontend/src/project-settings-parity.spec.tsx` | data-boundary | covered in current follow-up | P2 | none | `ProjectSettingsSubMenu` now renders the legacy member tab `<span class="num-badge">N</span>` from `enrollmentRequestCount` when the count is positive, matching `project.enrolledUsers.size`. |
| `project/watchers.scala.html` | `/owner/project/watchers`, private/protected/custom-menu project. | `frontend/src/routes/$owner/$projectName/watchers/route.tsx`, `frontend/src/routes/-project-views.tsx`, `frontend/src/project-watchers-parity.spec.tsx` | data-boundary | covered in current follow-up | P2 | none | Watchers route now reads project container data and passes `projectDetail` into `ProjectWatchersPage`, so the legacy project header/menu shell preserves logo, scope marker, menu visibility, and menu counts instead of using only synthetic owner/project state. |
| `project/members.scala.html` | `/owner/project/members`, custom-menu project. | `frontend/src/routes/$owner/$projectName/members/route.tsx`, `frontend/src/routes/-project-views.tsx`, `frontend/src/project-members-parity.spec.tsx` | data-boundary | covered in current follow-up | P2 | none | Members route now reads project container data and passes `projectDetail` into `ProjectMembersPage`, so the legacy project header/menu/settings-tab shell preserves logo, scope marker, menu visibility/counts, and enrollment badge while keeping member CRUD data from the members response. |
| `project/webhooks.scala.html` | Webhook list, viewer can read but cannot create. | `crates/server/src/routes/projects/webhooks.rs`, `frontend/src/routes/$owner/$projectName/webhooks/route.tsx`, `frontend/src/route-parity.spec.tsx` | permission | covered in current follow-up | P2 | none | `GET /webhooks` now uses project READ authorization and the React route no longer returns `ForbiddenPage` solely for `!viewerCanUpdate`; `ProjectWebhooksPage` still hides `#formNewWebhook` for read-only viewers. Create/delete mutations keep UPDATE authorization. |
| `project/setting.scala.html` | Settings form with logo. | `frontend/src/routes/-project-views.tsx`, `frontend/src/project-settings-parity.spec.tsx` | asset | covered in current follow-up | P2 | none | `ProjectSettingsPage` now renders `.logo-wrap` with legacy inline `background-image:url(...)`, using `detail.logoUrl` or the legacy `/assets/images/project_default_logo.png` fallback; focused settings parity asserts the style and `#logoPath` upload anchor. |
| `project/setting.scala.html` | Git project, code menu off. | `frontend/src/routes/-project-views.tsx`, `frontend/src/project-settings-parity.spec.tsx` | layout | covered in current follow-up | P2 | none | Git settings now always render `#defaultBranceSettingPanel` with the legacy branch select and hide the wrapper with `style="display:none"` when code menu is off; the panel no longer disappears when code is off or branch options are empty. |
| `project/setting.scala.html` | Reviewer count dropdown. | `frontend/src/routes/-project-views.tsx`, `frontend/src/project-settings-parity.spec.tsx`, `frontend/src/auth-workspace-shell.spec.tsx` | layout | covered in current follow-up | P2 | none | `#welReviewerCount` now renders the legacy `.btn-group.branches[data-id=project-reviewer-count][data-name=defaultReviewerCount] > button.btn.dropdown-toggle.large[data-toggle=dropdown] + ul.dropdown-menu > li[data-value] > a` shell. React click handlers update current state without importing legacy JavaScript. |
| `project/home.scala.html` | Project home sidebar. | `frontend/src/routes/-project-views.tsx`, `frontend/src/project-home-tabs.spec.tsx` | layout | covered in current follow-up | P2 | none | Removed the non-legacy `section > h3 Project dashboard` / `.runtime-grid` sidebar block; watch/enroll controls now live in `project/header.scala.html`'s util dropdown position, and the sidebar preserves legacy button wrap, optional milestone summary, and member info order. |
| `project/home.scala.html` | SVN project with code menu enabled. | `frontend/src/routes/-project-views.tsx`, `frontend/src/project-home-tabs.spec.tsx` | interaction | covered in current follow-up | P2 | none | Fork CTA now renders only when `detail.showCode` is true and `vcs` is Git/unspecified, matching the legacy `project.vcs.equals("GIT")` guard under `project.menuSetting.code`. |
| `project/create.scala.html` | New project form, SVN selected. | `frontend/src/routes/-project-views.tsx`, `frontend/src/project-create-parity.spec.tsx` | layout | covered in current follow-up | P2 | none | Removed the React-only `display:none` branch for `#menuSettingPullRequest`; the create form now keeps the legacy template checkbox label/input in the DOM regardless of SVN warning state, with a source guard preventing the old `svnSelected` hide condition from returning. |
| `project/members.scala.html` | Role dropdown. | `frontend/src/routes/-project-views.tsx`, `frontend/src/project-members-parity.spec.tsx`, `frontend/src/project-settings-parity.spec.tsx` | layout | covered in current follow-up | P2 | none | Member role dropdown items now render as `<a data-action="apply" data-href=... data-loginId=...>` inside the legacy `.btn-group > button.dropdown-toggle.large + ul.dropdown-menu > li[data-value]` shell. The legacy `javascript:void(0)` href is intentionally represented as a React `preventDefault()` anchor target to preserve behavior without copying legacy JavaScript. |
| `project/partial_webhooks_list.scala.html` | Existing webhook row. | `frontend/src/routes/-project-views.tsx`, `frontend/src/project-settings-parity.spec.tsx` | interaction | covered in current follow-up | P2 | none | Existing webhook rows now preserve the legacy `.row-fluid.list-item.vertical-align[data-webhook-id]` shell, `<h6>` wrappers for payload/secret/type, delete button request attributes, and checked read-only git-push checkbox. The legacy inline `onclick="return false;"` is intentionally implemented as React `event.preventDefault()` to keep the same no-toggle UX without copying legacy JavaScript. |

## Verifier Evidence

Focused verifier run:

- Command:
  `YONA_LEGACY_BASE_URL=http://127.0.0.1:19100 YORAM_BASE_URL=http://127.0.0.1:3101/yona YORAM_SWEEP_TARGET=both YORAM_SWEEP_PATHS=/admin/sample,/admin/sample/settingform,/admin/sample/members,/admin/sample/watchers,/admin/sample/webhooks,/admin/sample/transfer,/admin/sample/deleteform,/admin/sample/changeVCS,/admin/sample/issues,/user/issues,/admin/sample/issueform,/admin/sample/issue/1/editform,/admin/sample/issue/1 node scripts/visual-parity-sweep.mjs`
- Artifact: `output/playwright/visual-sweep/latest.json`
- Checked at: `2026-06-26T15:26:46.018Z`
- Result: legacy `13/13` passed, local `13/13` passed, `diffFailures 0`,
  `localFailures 0`, `statusDeltas []`.

Computed-style/layout proof now covers the P2 shell selectors listed below.

| Route | selector | legacy | local |
| --- | --- | ---: | ---: |
| `/admin/sample/settingform` | `.project-header-outer` width | 1366 | 1366 |
| `/admin/sample/settingform` | `.project-menu-outer` width | 1366 | 1366 |
| `/admin/sample/settingform` | `.project-page-wrap` width | 1346 | 1346 |
| `/admin/sample/settingform` | `.bubble-wrap.gray` width | 1346 | 1346 |
| `/admin/sample/settingform` | `.box-wrap` width | 1346 | 1346 |
| `/admin/sample/settingform` | `.cu-label` display/width | `inline-block` / 205 | `inline-block` / 205 |
| `/admin/sample/settingform` | `.cu-desc` display | `inline-block` | `inline-block` |

This evidence closes the previous verifier-baseline blocker for the sampled P2
project shell/settings routes. Conditional private/protected/forked header
states still require packet-specific verifier evidence before whole-project UI
parity can be closed.
