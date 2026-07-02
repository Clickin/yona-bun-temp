# Template-First UI Parity Report: P6 Organization/Directory/Workspace

Status: current reset baseline
Date: 2026-07-02
Owner packet: P6 organization/directory/workspace
Mode: template-first mapper baseline; implementation evidence reviewed

## Scope

This report reopens organization, project/organization directory, user
workspace/profile, user settings/files, and notification stream parity under
`docs/plans/2026-06-26-template-first-ui-parity-reset.md`.

The older `ui-parity-directory-organization.md`,
`ui-parity-user-workspace-profile.md`,
`ui-parity-user-account-settings.md`, and
`ui-parity-search-notification.md` reports remain useful route/API evidence.
This report restates their P6-owned portions in the template-first reset format
and keeps the app-runtime boundary explicit: legacy server-rendered fragments
are implemented as REST JSON/API-return plus React-rendered legacy DOM.

## Legacy Template Call Graph

| Legacy source | Role | Required anchors |
| --- | --- | --- |
| `yona-original/app/views/index/allProjectList.scala.html`, `allProjectList_partial.scala.html`, `allOrganizationList.scala.html`, `allOrganizationList_partial.scala.html` | Project and organization directories. | directory tabs, search form `filter`, `.error-wrap`, project/org rows, created/code-update metadata, `#pagination`. |
| `yona-original/app/views/organizationLayout.scala.html`, `organization/header.scala.html`, `organization/menu.scala.html` | Organization shell. | organization header/menu, settings/member/project navigation, visibility/enrollment actions. |
| `organization/create.scala.html`, `organization/view.scala.html`, `organization/setting.scala.html`, `organization/members.scala.html`, `organization/deleteForm.scala.html`, `partial_settingmenu.scala.html` | Organization create/home/settings/members/delete. | `#mylist-filter`, `.all-projects`, `#groupLeaveBtn`, `#alertLeave`, `#addNewMember`, `#loginId[data-provider=typeahead]`, `.members.project`, role dropdowns, `#alertDeletion`, logo upload controls, delete confirm. |
| `organization/group_issue_list*.scala.html`, `group_board_list*.scala.html`, `group_pullrequest_list*.scala.html` | Organization aggregate issue/board/PR lists. | organization header/menu plus aggregate filters, quick search, rows, pagination. Board/PR list internals are P4/P5-owned; org shell ownership is P6. |
| `user/view.scala.html`, `user/partial_issues.scala.html`, `partial_pullRequests.scala.html`, `partial_projectlist.scala.html` | `/me` and public `/:user` profile/workspace. | `.user-info-box`, `.whoami-wrap`, `.guest-user`, `.edit`, `.user-status`, `.user-since`, `.user-stream-box`, `#daysAgoBtn`, `.nav.nav-tabs`, `.post-list-wrap`, `.user-streams.all-projects`. |
| `user/userFiles.scala.html` | Current-user files page. | `mySeriesMenuTab`, `.user-file-search`, `.attachment-files`, `.attachment-file-detail`, file preview/name/size/download/date/location columns, `#pagination`. |
| `user/edit.scala.html`, `edit_password.scala.html`, `edit_notifications.scala.html`, `edit_emails.scala.html`, `edit_token.scala.html`, `partial_edit_tabmenu.scala.html` | Account settings tabs. | `.site-breadcrumb-outer`, `.nav.nav-tabs.mt20`, `#frmBasic`, `#frmAvatar`, `#avatarFile`, `#avatarCropWrap`, `#frmPassword`, `#notification-projects`, `.notiUpdate`, email rows/action buttons, `.token-generate`. |
| `index/notifications.scala.html`, `index/partial_notifications.scala.html`, `common/mySeriesMenuTab.scala.html` | Authenticated home notifications and direct notification page/fragment boundary. | `.site-guide-outer`, `#toggleIntro`, `.notification-wrap`, `.notification-stream`, `.message-wrap.nowrap`, `.more`, `#notification-more`, `#setDefaultLoginPage`. |

## Current React/API Targets

| Current source | Current responsibility |
| --- | --- |
| `frontend/src/routes/projects.tsx`, `frontend/src/routes/orgs.tsx` | Active template-first reset implementations for `project/list.scala.html` and `organization/list.scala.html`, using REST `/api/v1/projects` and `/api/v1/organizations` through TanStack Query while preserving the legacy site-layout directory DOM. |
| `frontend/src/routes/organizations/new.tsx`, `frontend/src/routes/organizations/$organizationName.tsx`, `frontend/src/routes/organizations/$organizationName/settingform.tsx`, `frontend/src/routes/organizations/$organizationName/members.tsx`, `frontend/src/routes/organizations/$organizationName/deleteForm.tsx` | Organization create/home/settings/members/delete screens and shell. |
| `frontend/src/routes/$user.tsx`, `frontend/src/routes/user/issues.tsx`, `frontend/src/routes/user/files.tsx` | Workspace/current-user and public profile, user issue list, user files. |
| `frontend/src/routes/user/editform.tsx`, `frontend/src/routes/user/editform/password.tsx`, `frontend/src/routes/user/editform/notifications.tsx`, `frontend/src/routes/user/editform/emails.tsx`, `frontend/src/routes/user/editform/token.tsx` | Account settings canonical legacy routes. |
| `frontend/src/routes/index.tsx`, `frontend/src/routes/notifications.tsx`, `frontend/src/routes/-home-route-screen.tsx` | Authenticated notification stream, direct notification route conversion, default landing controls. |
| `frontend/src/api/workspace.ts`, `notifications.ts`, `attachments.ts`, `auth-workspace-client.ts` | REST JSON boundaries for workspace/profile/settings/files/notifications. |
| `frontend/tests/projects-list.e2e.ts`, `frontend/tests/organizations-list.e2e.ts`, `frontend/tests/organizations-new.e2e.ts`, `frontend/tests/project-create.e2e.ts`, `frontend/tests/project-import.e2e.ts`, `frontend/tests/organization-home.e2e.ts`, `frontend/tests/organization-settings-form.e2e.ts`, `frontend/tests/organization-members-form.e2e.ts`, `frontend/tests/organization-delete-form.e2e.ts`, `frontend/tests/user-public-profile.e2e.ts`, `frontend/tests/user-issues.e2e.ts`, `frontend/tests/user-files.e2e.ts`, `frontend/tests/user-profile-settings.e2e.ts`, `frontend/tests/user-password-settings.e2e.ts`, `frontend/tests/user-notification-settings.e2e.ts`, `frontend/tests/user-email-settings.e2e.ts`, `frontend/tests/user-token-settings.e2e.ts`, `frontend/tests/search-global.e2e.ts`, `frontend/tests/search-organization.e2e.ts`, `frontend/tests/authenticated-home-empty-notifications.e2e.ts` | Browser-visible interaction proof. |

## 2026-07-01 Organization Board Aggregate Template-First Rebuild

- Rebuilt `/organizations/:organizationName/boards` in `frontend/src/routes/organizations/$organizationName/boards.tsx` from `organization/group_board_list.scala.html` and `organization/group_board_list_partial.scala.html`.
- Scope: the flat route renders organization header/menu chrome with Board active, `#option_form`, project multi-select, keyword search, two-column checkbox, `.post-list-wrap` rows, `.group-project-name`, comment count links, empty state, and existing organization container plus organization board REST query boundaries.
- Verification: `pnpm --dir frontend test:e2e -- organization-boards.e2e.ts`.

## 2026-07-01 Organization Pull Request Aggregate Template-First Rebuild

- Rebuilt `/organizations/:organizationName/pullrequests` and `/organizations/:organizationName/closedPullrequests` in `frontend/src/routes/organizations/$organizationName/pullrequests.tsx` plus `frontend/src/routes/organizations/$organizationName/closedPullrequests.tsx` from `organization/group_pullrequest_list.scala.html` and `organization/group_pullrequest_list_partial.scala.html`.
- Scope: the flat routes render organization header/menu chrome with Pull request active, category-specific left `#search` form action, open/closed active tabs, `.post-list-wrap` rows, review progress, assignee avatar, state badge, and existing organization container plus organization pull-request REST query boundaries.
- Verification: `pnpm --dir frontend test:e2e -- organization-pullrequests.e2e.ts`.

## 2026-07-01 Organization Issue Aggregate Template-First Rebuild

- Rebuilt `/organizations/:organizationName/issues` in `frontend/src/routes/organizations/$organizationName/issues.tsx` from `organization/group_issue_list.scala.html`, `organization/group_issue_search_partial.scala.html`, `organization/group_issue_list_quicksearch.scala.html`, and `organization/group_issue_list_partial.scala.html`.
- Scope: the flat route renders organization header/menu chrome with Issue active, quick-search links, project multi-select, hidden filter/search fields, open/closed tabs, two-column toggle, `.post-list-wrap` issue rows, project/milestone/comment/vote/label anchors, assignee/due-date rail, pagination placeholder, and existing organization container plus organization issue REST query boundaries. The REST organization issue list now exposes `createdLabel` so the row can render the legacy `issue.createdDate` label instead of substituting update time.
- Verification: `pnpm --dir frontend test:e2e -- organization-issues.e2e.ts`.

## Open Reset Queue Summary

| status | count |
| --- | ---: |
| gap | 0 |
| deviation | 0 |
| weak evidence | 0 |
| covered | 17 |
| not-applicable | 1 |
| needs-parent-decision | 0 |

## Reset Findings

| legacy template | legacy route/state | current file | defect class | status | owner packet | proposed write scope | verification evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `project/list.scala.html`, `organization/list.scala.html` | `/projects` and `/orgs` directory search, empty/list rows, metadata, pagination. | `frontend/src/routes/projects.tsx`, `frontend/src/routes/orgs.tsx`, `frontend/src/routes/-home-route-screen.tsx`, `frontend/src/api/org-project.ts`, `frontend/src/api/query-keys.ts` | layout | covered in 2026-06-30 template-first reset slice | P6 | none; each route is one legacy template plus shared site shell, so decomposition beyond row components would add noise | `frontend/tests/projects-list.e2e.ts` and `frontend/tests/organizations-list.e2e.ts` were RED against missing/incomplete directory routes, then GREEN after the Scala HTML skeletons were ported under the legacy `siteLayout` shell. They compare the stable `.unsupported`, `.gnb-outer`, `.site-breadcrumb-outer`, `.page-wrap-outer`, and `.page-footer-outer` roots after mocking a non-anonymous session and REST directory responses, including active navbar Project list item, authenticated `common.usermenu`, project/group breadcrumb tabs, filter forms, `.all-projects > li.project` rows, and `#pagination`. Verification: `pnpm --dir frontend check`; `pnpm --dir frontend test:e2e -- projects-list.e2e.ts organizations-list.e2e.ts`. |
| `organization/create.scala.html` | `/organizations/new` authenticated new group form. | `frontend/src/routes/organizations/new.tsx`, `frontend/src/api/org-project.ts`, `frontend/src/api/query-keys.ts` | layout | covered in 2026-06-30 template-first reset slice | P6 | none; the route is one small legacy template plus shared site shell, so decomposition would only add indirection | `frontend/tests/organizations-new.e2e.ts` was RED against the missing `/organizations/new` route, then GREEN after the Scala HTML skeleton was ported under the legacy `siteLayout` shell. It compares the stable `.unsupported`, `.gnb-outer`, `.page-wrap-outer`, and `.page-footer-outer` roots after mocking an authenticated admin session, including `form[name=new-org]`, `.n-alert[data-errType=name]`, hidden `.msg.wrongName`, `#name`, `#descr[style="resize: vertical;"]`, create/cancel actions, form/input/textarea/action metrics, invalid-name warning behavior without REST mutation, and REST/TanStack create submit payload/redirect boundary through the existing organization create client. Verification: `pnpm --dir frontend check`; `pnpm --dir frontend test:e2e -- organizations-new.e2e.ts`. |
| `project/importing.scala.html` | `/_import?owner=admin` Git project import form. | `frontend/src/routes/[_]import.tsx`, `frontend/src/api/org-project.ts`, `frontend/src/api/query-keys.ts` | layout | covered in 2026-06-30 template-first reset slice | P6 | none; the route is one legacy template plus shared site shell, so decomposition beyond tiny option/checkbox helpers would add noise | `frontend/tests/project-import.e2e.ts` was RED against the missing `/_import` route, then GREEN after `project/importing.scala.html` was ported under the legacy `siteLayout` shell. It compares the stable `.unsupported`, `.gnb-outer`, `.page-wrap-outer`, and `.page-footer-outer` roots after mocking an authenticated admin session and `/api/v1/projects/form-options`, including `#importGit`, `#url`, `#useRepoAuth`, `#repoAuth .row-fluid > dl.span6`, owner select options with `data-type`/`data-avatar-url`, project name/description fields, share option radios, hidden protected scope row, disabled Git VCS select plus hidden `vcs`, all menu-setting checkboxes, create-form/cancel links, and REST/TanStack import submit boundary through the existing import client. Verification: `pnpm --dir frontend check`; `pnpm --dir frontend test:e2e -- project-import.e2e.ts`. |
| `organizationLayout.scala.html`, `organization/header.scala.html`, `organization/menu.scala.html` | Organization shell for `/organizations/:org/**`. | `frontend/src/routes/organizations/$organizationName.tsx`, organization child route files | layout | covered in current follow-up | P6 | none | Organization E2E guards prove header/menu/settings links, enrollment/admin controls, active menu states, and raw-key absence. Aggregate board/PR list internals remain covered by P4/P5 reports; P6 owns the org shell chrome. |
| `organization/view.scala.html` | Organization home, project filter, create-project CTA, admin/member side panes, leave modal. | `frontend/src/routes/organizations/$organizationName.tsx`, organization container REST route files | interaction | covered in 2026-07-01 template-first reset slice | P6 | none | `frontend/tests/organization-home.e2e.ts` was RED against the missing flat organization home screen, then GREEN after `organization/view.scala.html` was ported under the legacy site shell. It whole-screen compares `/organizations/weblabs`, including organization header/menu, `#project-description`, `#mylist-filter`, create-project CTA, `.all-projects` project card, member/watch stats, admin/member side panes, `#groupLeaveBtn`, `#alertLeave`, and REST/TanStack container plus leave mutation boundaries. |
| `organization/members.scala.html` | Organization member add/typeahead, role dropdowns, delete modal, enrollment accept. | `frontend/src/routes/organizations/$organizationName/members.tsx`, organization admin/member REST route files | interaction | covered in 2026-07-01 template-first reset slice | P6 | none | `frontend/tests/organization-members-form.e2e.ts` was RED against the missing flat members screen, then GREEN after `organization/members.scala.html` was ported under the legacy site shell. It whole-screen compares `/organizations/weblabs/members`, including organization header/menu, `partial_settingmenu`, `#addNewMember`, `#loginId[data-provider=typeahead]`, role dropdowns with `data-action="apply"`, delete anchors, `#alertDeletion`, enrolled-user request rows, and REST/TanStack add/role/delete/accept boundaries through the existing organization admin/members clients. The current follow-up also proves Delete opens `#alertDeletion`, No closes without DELETE, and only `#deleteBtn` confirms the REST delete mutation. |
| `organization/setting.scala.html`, `organization/deleteForm.scala.html`, `partial_settingmenu.scala.html` | Organization settings/logo update/delete confirm. | `frontend/src/routes/organizations/$organizationName/settingform.tsx`, `frontend/src/routes/organizations/$organizationName/deleteForm.tsx`, organization REST settings/update/delete route files | interaction | covered in 2026-07-01 template-first reset slice | P6 | none | `frontend/tests/organization-settings-form.e2e.ts` whole-screen compares `/organizations/weblabs/settingform` against `organization/setting.scala.html`, including site shell, organization header/menu, `partial_settingmenu`, `#saveSetting`, logo upload controls, hidden id, name/description fields, and REST/TanStack update boundary. `frontend/tests/organization-delete-form.e2e.ts` whole-screen compares `/organizations/weblabs/deleteForm` against `organization/deleteForm.scala.html`, including site shell, organization header/menu, `partial_settingmenu`, `#btnDelete`, `#alertDeletion`, `#btnDeleteExec`, non-fade `modal hide`, and REST delete redirect boundary. Existing setting evidence covers invalid logo warning and valid logo temp upload with `logoAttachmentId`. |
| `user/view.scala.html`, user profile partials | `/me` authenticated profile and `/:user` public profile shell. | `frontend/src/routes/$user.tsx`, `frontend/tests/user-public-profile.e2e.ts` | layout | covered in current follow-up | P6 | none | `ui-parity-user-workspace-profile.md` records 14 covered rows. Browser proof covers `.user-info-box`, guest/site-admin/blocked badges, edit gating, daysAgo, issue/PR/project tabs, actor links, public email visibility, ACL filtering, organization-name redirect, and missing-user handling. |
| `user/view.scala.html`, `index/myRecentIssueList*.scala.html` | `/user/issues` current-user issue list and workspace streams. | `frontend/src/routes/user/issues.tsx`, `frontend/tests/user-issues.e2e.ts` | layout | covered in current follow-up | P6 | none | Shared P3 issue list renderer plus workspace/profile E2E proves filters/search/order/page query, default landing control, empty/populated states, issue row selectors, and REST query shape. |
| `user/userFiles.scala.html` | `/user/files` search, file rows, preview/download/location, pagination. | `frontend/src/routes/user/files.tsx`, workspace files REST | layout | covered in 2026-06-30 template-first reset slice | P6 | none | `frontend/tests/user-files.e2e.ts` whole-screen compares the authenticated site shell plus `mySeriesMenuTab`, search form, `.attachment-files` header/detail row, image preview, file icon, download, date, ISSUE_POST location, and pagination active state against `user/userFiles.scala.html`. |
| `user/edit*.scala.html`, `partial_edit_tabmenu.scala.html` | `/user/editform/**` account settings tabs. | `frontend/src/routes/user/editform.tsx`, `frontend/src/routes/user/editform/password.tsx`, `frontend/src/routes/user/editform/notifications.tsx`, `frontend/src/routes/user/editform/emails.tsx`, `frontend/src/routes/user/editform/token.tsx` | interaction | covered in 2026-06-30 template-first reset slice | P6 | none | `ui-parity-user-account-settings.md` records 14 covered settings rows. `frontend/tests/user-profile-settings.e2e.ts` whole-screen compares `/user/editform` against `edit.scala.html` plus `partial_edit_tabmenu.scala.html`, including the site shell, account breadcrumb, active profile tab, `#frmBasic`, `#frmAvatar`, `.avatar-wrap.xlarge`, reset form, crop modal, profile/reset layout metrics, CSRF bootstrap, and REST/TanStack profile/reset mutations. `frontend/tests/user-password-settings.e2e.ts` proves `/user/editform/password` with the active password tab, `#frmPassword`, lost-password action, password REST payload, and login-form redirect path. `frontend/tests/user-notification-settings.e2e.ts` proves `/user/editform/notifications#7` with the active notification tab, watched-project list, active tab pane, all legacy notification type rows, checked states, layout metrics, CSRF bootstrap, and notification REST toggle payload. `frontend/tests/user-email-settings.e2e.ts` proves `/user/editform/emails` with the active email tab, add form, description, primary/secondary email table, legacy request action attrs, layout metrics, CSRF bootstrap, and add-email REST payload. `frontend/tests/user-token-settings.e2e.ts` similarly proves `/user/editform/token`. Existing E2E evidence proves avatar crop/upload depth, password failure/mismatch states, deeper notification backend states, deeper email delete/set-main/validation backend behavior, auth gate, and raw-key absence. |
| `index/notifications.scala.html`, `index/partial_notifications.scala.html` | `/notifications` welcome guide, tabs, empty/populated notification stream, intro persistence. | `frontend/src/routes/notifications.tsx`, `frontend/src/routes/-home-route-screen.tsx`, notifications API | interaction | covered in current follow-up | P6 | none | `ui-parity-search-notification.md` records notification rows as covered. `frontend/tests/authenticated-home-empty-notifications.e2e.ts` proves `.site-guide-outer`, `#toggleIntro`, localStorage `yobi-intro`, `.notification-stream`, `.message-wrap.nowrap`, link/img click non-toggle, `.more` expand, default landing UI, and no raw keys. |
| `index/partial_notifications.scala.html` | Notification load-more appends server-rendered fragments in legacy. | `frontend/src/routes/-home-route-screen.tsx`, `frontend/src/routes/notifications.tsx` | data-boundary | covered in current follow-up | P6 | none | React renders legacy `#notification-more[href="javascript:void(0);"]`, prevents navigation, fetches `/api/v1/notifications?from=<items.length>&size=20`, appends rows, and removes the link when `hasMore=false`; direct notification JSON compatibility remains an API-return boundary rather than a runtime HTML-fragment data source. |
| Legacy server-rendered notification fragment as runtime data source | Legacy `NotificationApp.notifications` returned `partial_notifications` HTML fragment. | REST JSON plus React render | data-boundary | not-applicable | P6 | none unless parent reclassifies | Keeping legacy HTML fragment injection as a React runtime data source is out of scope under the reset rule. The conversion boundary is API-return plus React-rendered legacy DOM. |
| Global/project/org search rows intersecting user/org/notification surfaces | `/search`, `/organizations/:org/search`, project/org scoped search chrome. | `frontend/src/routes/search.tsx`, `frontend/src/routes/organizations/$organizationName/search.tsx`, `frontend/src/routes/$ownerName/$projectName/search.tsx`, `frontend/src/routes/-search-screen.tsx` | layout | covered in current follow-up | P6 | none | Search rows are tracked in `ui-parity-search-notification.md`; organization scoped chrome uses real org container header/menu and remains relevant to P6 shell parity. Repository-scoped `/admin/sample/search` integrated delta remains owned by P5 until parent reassigns. |
| Organization aggregate issue/board/PR list shells | `/organizations/:org/issues`, `/boards`, `/pullrequests`, `/closedPullrequests`. | organization aggregate route files and P3/P4/P5 list renderers | layout | covered in current follow-up | P6 | none | Organization shell ownership is covered here; row/list internals are covered in P3/P4/P5. `frontend/tests/organization-issues.e2e.ts` whole-screen compares `/organizations/weblabs/issues` against `organization/group_issue_list.scala.html`, `group_issue_search_partial.scala.html`, `group_issue_list_quicksearch.scala.html`, and `group_issue_list_partial.scala.html`, proving Issue-active org chrome, quick search, project selector, hidden search fields, open/closed tabs, issue rows, project/milestone/comment/vote/label anchors, assignee/due-date rail, pagination placeholder, and REST/TanStack organization issue query boundaries. `frontend/tests/organization-boards.e2e.ts` whole-screen compares `/organizations/weblabs/boards` against `organization/group_board_list.scala.html` plus `group_board_list_partial.scala.html`, proving Board-active org chrome and board rows. `frontend/tests/organization-pullrequests.e2e.ts` whole-screen compares `/organizations/weblabs/pullrequests`, its empty state, and `/organizations/weblabs/closedPullrequests` against `organization/group_pullrequest_list.scala.html` plus `group_pullrequest_list_partial.scala.html`, proving Pull request-active org chrome, category-specific left search action, open/closed active tabs, empty `.error-wrap`, PR rows, review progress, assignee/state cells, and REST/TanStack organization pull-request query boundaries. |
| Public/current-user route auth gates | `/me`, `/user/editform/**`, `/user/files`, notification routes. | route guards and session REST | permission | covered in current follow-up | P6 | none | Existing auth/workspace specs and e2e prove anonymous guard/loading states, authenticated render, guest stream hiding, private/public ACL filters, and direct legacy alias compatibility. |
| Raw visible i18n keys in P6 surfaces | All P6 templates resolve `Messages(...)` labels; raw keys are failures. | Browser proof across P6 files | copy | covered in current follow-up | P6 | none | The P6 whole-screen E2E files listed below include raw-key absence checks across organization, directory, workspace/profile, account settings, user files/issues, search, and notification surfaces. |

## 2026-07-02 Public Profile Width Follow-Up

- Restored legacy `user/view.scala.html` profile proportions by exempting
  `.page-wrap:has(.user-box)` from the generic breadcrumb fixed-width rule in
  `frontend/src/app.css`.
- Legacy source: `_page.less` leaves `.page-wrap` fluid for profile pages while
  `.user-info-box` floats at `200px` and `.user-stream-box` consumes the
  remaining width with `20px` left padding.
- Focused failure before the fix: `frontend/tests/user-public-profile.e2e.ts`
  measured `.user-stream-box` at `880px` instead of the legacy `1060px`.
- Verification after the fix: `pnpm --dir frontend test:e2e -- user-public-profile.e2e.ts`
  passed 7 tests; the P6 representative verifier listed below passed 62 tests.

## 2026-07-02 Organization Home Layout Metrics Follow-Up

- Restored the legacy `organization/view.scala.html` organization home styling
  backed by `_page.less` for `.all-projects`, project row metadata/stats, and
  `.bubble-wrap.gray.project-home` member panels in `frontend/src/app.css`.
- Added browser metric proof to `frontend/tests/organization-home.e2e.ts` for
  the legacy `span9`/`span3` content ratio, project row padding/border/avatar
  sizing, metadata typography/color, stats alignment, and manager/member panel
  padding/header/list proportions.
- Verification: `pnpm --dir frontend test:e2e -- organization-home.e2e.ts`
  passed 6 tests.

## Verifier Evidence

Route/source proof:

- `frontend/src/routes/projects.tsx`
- `frontend/src/routes/orgs.tsx`
- `frontend/src/routes/organizations/new.tsx`
- `frontend/src/routes/organizations/$organizationName.tsx`
- `frontend/src/routes/organizations/$organizationName/settingform.tsx`
- `frontend/src/routes/organizations/$organizationName/members.tsx`
- `frontend/src/routes/organizations/$organizationName/deleteForm.tsx`
- `frontend/src/routes/organizations/$organizationName/issues.tsx`
- `frontend/src/routes/organizations/$organizationName/boards.tsx`
- `frontend/src/routes/organizations/$organizationName/pullrequests.tsx`
- `frontend/src/routes/organizations/$organizationName/closedPullrequests.tsx`
- `frontend/src/routes/$user.tsx`
- `frontend/src/routes/user/issues.tsx`
- `frontend/src/routes/user/files.tsx`
- `frontend/src/routes/user/editform.tsx`
- `frontend/src/routes/notifications.tsx`

Browser proof:

- `frontend/tests/projects-list.e2e.ts`
- `frontend/tests/organizations-list.e2e.ts`
- `frontend/tests/organizations-new.e2e.ts`
- `frontend/tests/project-create.e2e.ts`
- `frontend/tests/project-import.e2e.ts`
- `frontend/tests/organization-home.e2e.ts`
- `frontend/tests/organization-members-form.e2e.ts`
- `frontend/tests/organization-issues.e2e.ts`
- `frontend/tests/organization-boards.e2e.ts`
- `frontend/tests/organization-pullrequests.e2e.ts`
- `frontend/tests/organization-settings-form.e2e.ts`
- `frontend/tests/organization-delete-form.e2e.ts`
- `frontend/tests/user-public-profile.e2e.ts`
- `frontend/tests/user-issues.e2e.ts`
- `frontend/tests/user-files.e2e.ts`
- `frontend/tests/user-profile-settings.e2e.ts`
- `frontend/tests/user-password-settings.e2e.ts`
- `frontend/tests/user-notification-settings.e2e.ts`
- `frontend/tests/user-email-settings.e2e.ts`
- `frontend/tests/user-token-settings.e2e.ts`
- `frontend/tests/authenticated-home-empty-notifications.e2e.ts` for notification stream/load-more; `frontend/tests/search-global.e2e.ts` and `frontend/tests/search-organization.e2e.ts` for scoped search chrome.

Focused P6 verifier run on 2026-07-02:

```bash
pnpm --dir frontend test:e2e -- projects-list.e2e.ts organizations-list.e2e.ts organizations-new.e2e.ts project-create.e2e.ts project-import.e2e.ts organization-home.e2e.ts organization-members-form.e2e.ts organization-issues.e2e.ts organization-boards.e2e.ts organization-pullrequests.e2e.ts organization-settings-form.e2e.ts organization-delete-form.e2e.ts user-public-profile.e2e.ts user-issues.e2e.ts user-files.e2e.ts authenticated-home-empty-notifications.e2e.ts search-organization.e2e.ts
```

Result: 62 passed.

The integrated desktop sweep status in
`output/playwright/visual-sweep/latest.json` checked at
`2026-06-26T16:21:36.680Z` is a pre-organization-layout-migration baseline.
Current 2026-06-27 organization nested-layout claims are limited to the focused
spec evidence listed below. Whole UI parity remains blocked until a fresh
integrated visual sweep covers all packet reports.

## Active Route Shell Follow-Ups

- 2026-07-02 organization home shell evidence:
  `frontend/src/routes/organizations/$organizationName.tsx` owns the active
  organization home route under the legacy site shell, including organization
  header/menu/page-wrap chrome with the home menu active. Focused coverage:
  `pnpm --dir frontend test:e2e -- organization-home.e2e.ts`.
- 2026-07-01 organization home template-first rebuild:
  `frontend/src/routes/organizations/$organizationName.tsx` now owns the
  concrete `organization/view.scala.html` screen under the legacy site shell
  and existing organization container/leave REST boundaries. Focused coverage:
  `pnpm --dir frontend test:e2e -- organization-home.e2e.ts`.
- 2026-07-02 organization settings/members/delete shell evidence:
  `frontend/src/routes/organizations/$organizationName/settingform.tsx`,
  `members.tsx`, and `deleteForm.tsx` own the active settings routes under the
  legacy site shell, including organization header/menu/page-wrap chrome,
  `partial_settingmenu`, and settings-active menu state. Focused coverage:
  `pnpm --dir frontend test:e2e -- organization-settings-form.e2e.ts organization-members-form.e2e.ts organization-delete-form.e2e.ts`.
- 2026-07-01 organization members template-first rebuild:
  `frontend/src/routes/organizations/$organizationName/members.tsx` now owns
  the concrete `organization/members.scala.html` screen under the legacy site
  shell and existing organization admin/member REST boundaries. Focused
  coverage:
  `pnpm --dir frontend test:e2e -- organization-members-form.e2e.ts`.
- 2026-06-30 organization delete form template-first rebuild:
  `frontend/src/routes/organizations/$organizationName/deleteForm.tsx` now owns
  the concrete `organization/deleteForm.scala.html` screen under the legacy
  site shell. Focused coverage:
  `pnpm --dir frontend test:e2e -- organization-delete-form.e2e.ts`.
- 2026-07-01 organization settings form template-first rebuild:
  `frontend/src/routes/organizations/$organizationName/settingform.tsx` now owns
  the concrete `organization/setting.scala.html` screen under the legacy site
  shell and existing organization settings/update REST boundary. Focused
  coverage:
  `pnpm --dir frontend test:e2e -- organization-settings-form.e2e.ts`.
- 2026-07-01 organization board aggregate template-first rebuild:
  `frontend/src/routes/organizations/$organizationName/boards.tsx` now owns the
  concrete `organization/group_board_list.scala.html` screen under the legacy
  site shell and existing organization board REST boundary. The organization
  home parent route now yields to child routes through `<Outlet />`, so direct
  `/organizations/:org/boards` renders the child screen instead of the
  organization home body. Focused coverage:
  `pnpm --dir frontend test:e2e -- organization-boards.e2e.ts`.
- 2026-07-01 organization pull request aggregate template-first rebuild:
  `frontend/src/routes/organizations/$organizationName/pullrequests.tsx` and
  `frontend/src/routes/organizations/$organizationName/closedPullrequests.tsx`
  now own the concrete `organization/group_pullrequest_list.scala.html` open
  and closed screens under the legacy site shell and existing organization
  pull-request REST boundary. Focused coverage:
  `pnpm --dir frontend test:e2e -- organization-pullrequests.e2e.ts`.
- 2026-07-01 organization issue aggregate template-first rebuild:
  `frontend/src/routes/organizations/$organizationName/issues.tsx` now owns
  the concrete `organization/group_issue_list.scala.html` screen and included
  search/quicksearch/list partials under the legacy site shell and existing
  organization issue REST boundary, with `createdLabel` projected for the
  legacy created-date row. Focused coverage:
  `pnpm --dir frontend test:e2e -- organization-issues.e2e.ts`.
- 2026-07-02 organization aggregate/search shell evidence:
  `frontend/src/routes/organizations/$organizationName/issues.tsx`,
  `boards.tsx`, `pullrequests.tsx`, `closedPullrequests.tsx`, and `search.tsx`
  own the active aggregate/search routes under the legacy site shell. The
  organization issue search form preserves legacy markup while same-page query
  changes route through TanStack navigation and reload from route location
  state instead of native document GET. Focused coverage:
  `pnpm --dir frontend test:e2e -- organization-issues.e2e.ts organization-boards.e2e.ts organization-pullrequests.e2e.ts search-organization.e2e.ts`.
- 2026-07-02 workspace settings shell evidence:
  `frontend/src/routes/user/editform.tsx`, `password.tsx`,
  `notifications.tsx`, `emails.tsx`, and `token.tsx` own the legacy
  account-settings breadcrumb/tabs/page-wrap shell and tab bodies for
  `/user/editform/**`. Focused coverage:
  `pnpm --dir frontend test:e2e -- user-profile-settings.e2e.ts user-password-settings.e2e.ts user-notification-settings.e2e.ts user-email-settings.e2e.ts user-token-settings.e2e.ts`.
- 2026-06-27 user files SPA navigation follow-up:
  `/user/files` preserves the legacy `user/userFiles.scala.html` search form,
  my-series tabs, rows, and pagination markup, but same-page filter submit and
  pagination clicks now route through TanStack navigation and refetch from
  router location state instead of native document navigation. Focused coverage:
  `pnpm --dir frontend test:e2e -- user-files.e2e.ts`.
- 2026-06-27 user issues SPA navigation follow-up:
  `/user/issues` preserves the legacy `issue/my_partial_search.scala.html` and
  `issue/my_partial_list.scala.html` shell, filters, tabs, search form, sort
  links, and pagination markup, but same-page query changes now route through
  TanStack navigation and refetch from router location state. Focused coverage:
  `pnpm --dir frontend test:e2e -- user-issues.e2e.ts`.
