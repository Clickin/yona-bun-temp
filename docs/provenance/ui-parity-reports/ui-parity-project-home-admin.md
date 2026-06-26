# UI Parity Report: ui-parity-project-home-admin

Status: explorer report
Date: 2026-06-26
Agent: `019effaa-4c2c-7a91-8845-ea0edd3d5d48` (`Socrates`)
Mode: read-only audit, no files edited by the explorer

## 2026-06-27 Nested Layout Follow-Up

- Moved project members settings shell ownership into `frontend/src/routes/$owner/$projectName/route.tsx` for `/members`, keeping the settings menu active and rendering `ProjectMembersPage` through the TanStack Router `<Outlet />`.
- Scope: `frontend/src/routes/-project-views.tsx` adds `renderShell={false}` for `ProjectMembersPage`; the members leaf route passes that flag while retaining its existing member REST mutation/query boundaries.
- Verification: `pnpm --dir frontend exec tsc --noEmit`; `pnpm --dir frontend exec vitest run src/project-members-parity.spec.tsx src/project-settings-parity.spec.tsx`.

## 2026-06-27 Webhooks Layout Follow-Up

- Moved project webhooks settings shell ownership into `frontend/src/routes/$owner/$projectName/route.tsx` for `/webhooks`, keeping the settings menu active and rendering `ProjectWebhooksPage` through the TanStack Router `<Outlet />`.
- Scope: `frontend/src/routes/-project-views.tsx` adds `renderShell={false}` for `ProjectWebhooksPage`; the webhooks leaf route passes that flag while retaining its existing webhook REST mutation/query boundaries.
- Verification: `pnpm --dir frontend exec tsc --noEmit`; `pnpm --dir frontend exec vitest run src/project-settings-parity.spec.tsx`.

## 2026-06-27 Transfer Layout Follow-Up

- Moved project transfer settings shell ownership into `frontend/src/routes/$owner/$projectName/route.tsx` for `/transfer`, keeping the settings menu active and rendering `ProjectTransferPage` through the TanStack Router `<Outlet />`.
- Scope: `frontend/src/routes/-project-views.tsx` adds `renderShell={false}` for `ProjectTransferPage`; the transfer leaf route passes that flag while retaining its existing transfer REST request/query boundary.
- Verification: `pnpm --dir frontend exec tsc --noEmit`; `pnpm --dir frontend exec vitest run src/project-settings-parity.spec.tsx`.

## 2026-06-27 Delete Layout Follow-Up

- Moved project delete settings shell ownership into `frontend/src/routes/$owner/$projectName/route.tsx` for `/deleteform`, keeping the settings menu active and rendering `ProjectDeletePage` through the TanStack Router `<Outlet />`.
- Scope: `frontend/src/routes/-project-views.tsx` adds `renderShell={false}` for `ProjectDeletePage`; the delete leaf route passes that flag while retaining its existing delete REST mutation boundary.
- Verification: `pnpm --dir frontend exec tsc --noEmit`; `pnpm --dir frontend exec vitest run src/project-settings-parity.spec.tsx`.

## 2026-06-27 Change-VCS Layout Follow-Up

- Moved project change-VCS settings shell ownership into `frontend/src/routes/$owner/$projectName/route.tsx` for `/changeVCS`, keeping the settings menu active and rendering `ProjectChangeVcsPage` through the TanStack Router `<Outlet />`.
- Scope: `frontend/src/routes/-project-views.tsx` adds `renderShell={false}` for `ProjectChangeVcsPage`; the change-VCS leaf route passes that flag while retaining its existing REST mutation/query boundary.
- Verification: `pnpm --dir frontend exec tsc --noEmit`; `pnpm --dir frontend exec vitest run src/project-settings-parity.spec.tsx`.

## 2026-06-27 Issue-Labels Layout Follow-Up

- Moved project issue-label settings shell ownership into `frontend/src/routes/$owner/$projectName/route.tsx` for `/issue/labelsform`, keeping the settings menu active and rendering `IssueLabelsFormPage` through the TanStack Router `<Outlet />`.
- Scope: `frontend/src/routes/$owner/$projectName/issue/labelsform/route.tsx` adds `renderShell={false}` for the page while retaining its existing label/category REST mutation/query boundary.
- Verification: `pnpm --dir frontend exec tsc --noEmit`; `pnpm --dir frontend exec vitest run src/issue-label-settings-i18n.spec.tsx src/project-settings-parity.spec.tsx`.

## 2026-06-27 Watchers Layout Follow-Up

- Moved project watchers shell ownership into `frontend/src/routes/$owner/$projectName/route.tsx` for `/watchers`, preserving the legacy project menu state with no active menu item.
- Scope: `frontend/src/routes/-project-views.tsx` adds `renderShell={false}` for `ProjectWatchersPage`; the watchers leaf route passes that flag while retaining its read/query boundary.
- Verification: `pnpm --dir frontend exec tsc --noEmit`; `pnpm --dir frontend exec vitest run src/project-watchers-parity.spec.tsx`.

## 2026-06-27 Statistics Layout Follow-Up

- Moved project statistics shell ownership into `frontend/src/routes/$owner/$projectName/route.tsx` for `/statistics`, keeping the issue menu active.
- Scope: `frontend/src/routes/-project-views.tsx` adds `renderShell={false}` for `ProjectStatisticsPage`; the statistics leaf route passes that flag while retaining the legacy `Under Construction` body.
- Verification: `pnpm --dir frontend exec tsc --noEmit`; `pnpm --dir frontend exec vitest run src/route-parity.spec.tsx -- --testNamePattern "project statistics"`.

## Legacy Evidence Checked

- `yona-original/app/views/project/home.scala.html`
- `yona-original/app/views/project/partial_history.scala.html`
- `yona-original/app/views/project/partial_dashboard.scala.html`
- `yona-original/app/views/project/partial_dashboard_issuesbyassignee.scala.html`
- `yona-original/app/views/project/partial_dashboard_issuesbymilestone.scala.html`
- `yona-original/app/views/project/partial_dashboard_issuesbylabel.scala.html`
- `yona-original/app/views/project/partial_dashboard_pullrequests.scala.html`
- `yona-original/app/views/project/setting.scala.html`
- `yona-original/app/views/project/members.scala.html`
- `yona-original/app/views/project/watchers.scala.html`
- `yona-original/app/views/project/webhooks.scala.html`
- `yona-original/app/views/project/transfer.scala.html`
- `yona-original/app/views/project/change_vcs.scala.html`
- `yona-original/app/views/project/delete.scala.html`
- `yona-original/app/views/project/statistics.scala.html`
- `yona-original/app/views/projectMenu.scala.html`

## Rust/React Evidence Checked

- `frontend/src/routes/-project-views.tsx`
- `frontend/src/routes/$owner/$projectName/index.tsx`
- `frontend/src/routes/$owner/$projectName/route.tsx`
- `frontend/src/routes/$owner/$projectName/settingform/route.tsx`
- `frontend/src/routes/$owner/$projectName/members/route.tsx`
- `frontend/src/routes/$owner/$projectName/watchers/route.tsx`
- `frontend/src/routes/$owner/$projectName/webhooks/route.tsx`
- `frontend/src/routes/$owner/$projectName/transfer/route.tsx`
- `frontend/src/routes/$owner/$projectName/changeVCS/route.tsx`
- `frontend/src/routes/$owner/$projectName/deleteform/route.tsx`
- `frontend/src/routes/$owner/$projectName/newFork/route.tsx`
- `frontend/src/routes/$owner/$projectName/statistics/route.tsx`
- `frontend/src/app-view-models.ts`
- `frontend/src/project-home-tabs.spec.tsx`
- `frontend/src/project-settings-parity.spec.tsx`
- `frontend/src/route-parity.spec.tsx`
- `crates/server/src/routes/projects.rs`
- `crates/server/src/routes/projects/home.rs`
- `crates/server/src/routes/utils.rs`
- `crates/server/tests/rest_contract.rs`
- `crates/server/tests/board_contract.rs`
- `crates/server/tests/project_fork_contract.rs`
- `crates/server/tests/project_delete_contract.rs`
- `crates/server/tests/project_change_vcs_contract.rs`

## Route Inventory Summary

Total rows: 18

| status | count |
| --- | ---: |
| covered | 18 |
| gap | 0 |
| deviation | 0 |
| deferred | 0 |
| not-applicable | 0 |
| weak evidence | 0 |
| needs-parent-decision | 0 |

## Result Inventory

| path | legacy evidence | current evidence | status | proposed owner |
| --- | --- | --- | --- | --- |
| `/:owner/:project?tabId=readme` | `home.scala.html` selects `partial_readme(project)` for default/readme tab. | `ProjectDetailPage` normalizes `tabId`, renders DB README post, Git `readmeFile`, or legacy empty README fallback; `project-home-tabs.spec.tsx` covers DB/Git/empty/SVN README states. `frontend/tests/project-home-parity.e2e.ts` now opens `/yona/owner/projectYobi`, asserts the README tab, legacy empty README fallback, create README link, project shell, and REST-backed posts/container boundary. | covered | none |
| `/:owner/:project?tabId=history` | `partial_history.scala.html` renders `.activity-streams`, actor avatar/link, type text, target links, date. | `ProjectHomeHistoryPane` renders matching stream shell from `detail.history.items`; unit coverage exists. `frontend/tests/project-home-parity.e2e.ts` clicks the History tab in browser, verifies the `tabId=history` URL, active tab, activity stream actor, type copy, title, and raw-key absence. | covered | none |
| `/:owner/:project?tabId=dashboard` | Dashboard includes assignee rows, milestone rows, label rows, and recent PR rows with “more” link. | Wave 4 projects and renders all open milestone rows with legacy success progress bars, the no-open-milestone empty/new action, the no-milestone count row, and recent open PR contributor avatar/title/date rows plus `project.dashboard.more`; focused frontend and REST contract tests cover the projection/rendering. `frontend/tests/project-home-parity.e2e.ts` clicks the Dashboard tab and asserts assignee, milestone, label, and PR rows from REST container data. | covered in Wave 4 | none |
| `/:owner/:project` project menu | `projectMenu.scala.html` shows home/code/issue/PR/review/milestone/board by menu settings, VCS, and code-access membership; admin cog only for update permission. | `ProjectMenu` renders same shell; backend `build_project_container_response` gates `showCode`, `showPullRequest`, and `showReview` with menu/code-access state. | covered | none |
| `/:owner/:project` project header | Legacy project pages render project header/breadcrumb/private/protected/fork context through project layout/menu evidence. | `ProjectHeader` renders owner/project links, logo/background, favorite star, private/protected markers, fork origin link. | covered | none |
| `/:owner/:project` right member block | `home.scala.html` renders member avatars/links/display name/login and an add-member link when update is allowed. | `ProjectDetailPage` now renders `.member-wrap`, `.project-members .member`, profile avatar/name anchors, and `#member-add-link`; `project-home-tabs.spec.tsx` pins the selectors. `frontend/tests/project-home-parity.e2e.ts` proves the member block and updater add link in the browser. | covered in Wave 2 | none |
| `/:owner/:project` leave project | `home.scala.html` opens `#alertLeave` modal with leave confirm copy and Yes/No buttons before deleting membership. | `ProjectDetailPage` now makes `#projectLeaveBtn` open the legacy `#alertLeave` modal shell and calls the REST leave mutation only from `#leaveBtn`; `project-home-tabs.spec.tsx` pins the hidden modal/copy/buttons. `frontend/tests/project-home-parity.e2e.ts` clicks Leave, closes with No without REST, reopens, confirms with Yes, asserts the `/api/v1/owners/:owner/projects/:project/members/:userId` DELETE CSRF header, and verifies redirect. | covered in Wave 2 | none |
| `/:owner/:project/newFork` | Legacy fork flow uses project owner/name/scope form, fork help image/copy, existing fork notice. | `ProjectForkPage` and route preserve form shell, REST mutation, redirect, existing-fork notice/link, and disabled/no-submit states. `frontend/tests/project-fork-parity.e2e.ts` now browser-proves the positive shell plus POST/CSRF payload, empty-name disabled submit with zero REST POSTs, and existing-fork notice/link with `canFork=false` disabled submit and zero REST POSTs. | covered in current follow-up | none |
| `/:owner/:project/settingform` menu settings persistence | `setting.scala.html` submits menu checkboxes for code/issue/PR/review/milestone/board. | `ProjectSettingsPage` submits menu booleans through `updateProject`; backend updates `project_menu_setting`; project menu consumes returned `show*` flags. `frontend/tests/project-settings-parity.e2e.ts` now unchecks issue/review in browser, asserts the PATCH REST payload, refetches settings, and verifies the project menu labels are hidden after save. | covered in current follow-up | none |
| `/:owner/:project/settingform` general settings controls | Legacy settings include mutable code-access radios, Git issue-template edit row, reviewer-count panel hidden when code menu off, default branch select, protected scope only for grouped projects, field validation, and updater-only access. | Wave 5 keeps the legacy code-access radios mutable/submitted through React REST JSON and persists `isCodeAccessibleMemberOnly`; the settings route now reads existing branch JSON, renders `#defaultBranceSettingPanel #project-default-branch[data-toggle=select2][data-format=branch]`, and calls the existing default-branch REST mutation only when the selected branch changed. Git issue-template, reviewer-count visibility, SVN hiding, and protected-scope visibility remain covered from Wave 2. `frontend/tests/project-settings-parity.e2e.ts` now proves mutable code-access, reviewer count, overview, default-branch browser submission, invalid project-name validation with zero REST PATCH, invalid logo-file validation with zero REST PATCH, non-updater REST 403 forbidden shell, CSRF headers, PATCH body, branch-default POST body, refetch, and visible post-save state. | covered in current follow-up | none |
| `/:owner/:project/members` | `members.scala.html` provides add-member typeahead form, role dropdown, delete action, owner label, enrollment request accept, and update-gated access to the management route. | `ProjectMembersPage` preserves these controls and routes mutations through REST. `frontend/tests/project-members-parity.e2e.ts` now browser-proves add-member, enrollment accept, role update, and delete visible mutations while asserting POST/PATCH/DELETE methods, CSRF headers, request paths/bodies, and the non-updater 403 legacy forbidden shell with management controls absent. | covered in current follow-up | none |
| `/:owner/:project/watchers` | `watchers.scala.html` lists watcher title/description and watcher avatar/name/login links. | `ProjectWatchersPage` matches title/description and member-list shell from REST watcher data; backend contract covers watcher list. | covered | none |
| `/:owner/:project/webhooks` | `webhooks.scala.html` renders create form, payload/secret, type radios, JSON auto gitPush behavior, help, list, delete, and updater-only create controls. | `ProjectWebhooksPage` preserves form/list/delete, legacy payload validation copy, JSON type auto-check/disabled gitPush behavior, and updater-only access through the React route. `frontend/tests/project-webhooks-parity.e2e.ts` now browser-proves empty payload blocks REST POST with resolved legacy validation copy, JSON webhook submit uses CSRF and the legacy payload fields, delete uses CSRF-backed REST DELETE, and non-updater REST 403 renders the legacy forbidden shell with create/delete controls absent. | covered in current follow-up | none |
| `/:owner/:project/transfer` | `transfer.scala.html` checkbox-gates transfer modal and Yes/No confirmation; owner input is submitted by JS module. | `ProjectTransferPage` preserves checkbox alert, modal IDs/copy, REST mutation, and accept path projection. `frontend/tests/project-transfer-parity.e2e.ts` now clicks transfer while unchecked, asserts the legacy `project.transfer.alert` copy, verifies the modal stays hidden and no REST POST occurs, then checks the box and proves the CSRF-backed transfer POST plus modal confirm path. | covered in current follow-up | none |
| `/:owner/:project/changeVCS` | `change_vcs.scala.html` checkbox-gates change-VCS modal and confirmation. | `ProjectChangeVcsPage` preserves checkbox alert, modal IDs/copy, REST mutation, redirect. | covered | none |
| `/:owner/:project/deleteform` | `delete.scala.html` checkbox-gates delete modal and confirmation. | `ProjectDeletePage` preserves checkbox alert, modal IDs/copy, REST mutation, redirect. | covered | none |
| `/:owner/:project/statistics` | `statistics.scala.html` renders only `<h1>Under Construction</h1>`. | Project layout owns the header/menu/page-wrap shell with active issue menu; `ProjectStatisticsPage` renders the same under-construction body under the outlet. | covered | `frontend/src/routes/$owner/$projectName/route.tsx`, `frontend/src/routes/$owner/$projectName/statistics/route.tsx`, `frontend/src/routes/-project-views.tsx`, `frontend/src/route-parity.spec.tsx` |
| project admin/settings browser raw-key absence | Legacy project admin/settings pages resolve `project.*`, `button.*`, `fork.*`, and validation message keys through Play messages before rendering. | The scoped project admin Playwright suites now assert browser-visible body text does not contain bounded raw project-admin message key patterns across settings, members, fork, webhooks, delete, transfer, and changeVCS positive and forbidden/disabled states. `pnpm --dir frontend test:e2e -- project-settings-parity.e2e.ts project-members-parity.e2e.ts project-fork-parity.e2e.ts project-webhooks-parity.e2e.ts project-delete-parity.e2e.ts project-transfer-parity.e2e.ts project-change-vcs-parity.e2e.ts` passed 12 Playwright tests. | covered in current follow-up | none |

## Playwright Scenario Matrix

| path | state | legacy selector/copy | Rust selector/copy | interaction | API/direct boundary | status |
| --- | --- | --- | --- | --- | --- | --- |
| `/:owner/:project` | default README, DB README exists | `.nav-tabs li.active a` `README`; README post body | `.board-view.project-readme-post`, `.readme-body.markdown-wrap` | load page | React route reads REST container plus posts JSON | covered |
| `/:owner/:project` | no DB README, Git README exists | README tab displays repository README markdown | `.project-git-readme`, README filename/body | load page | React route reads REST container `readmeFile` | covered |
| `/:owner/:project` | no README, Git project, updater | `.bubble-wrap.gray.readme`, `project.readme`, create README link | `.bubble-wrap.gray.readme`, `postform?readme=true` | load page and assert create README link | Direct link opens React board post form; submit remains REST | covered by `project-home-parity.e2e.ts` |
| `/:owner/:project?tabId=history` | history tab | `.activity-streams .activity-stream`, `.actor`, `.where`, `.title`, `.date` | same shell/classes from `ProjectHomeHistoryPane` | click History tab | REST container history data | covered by `project-home-parity.e2e.ts` |
| `/:owner/:project?tabId=dashboard` | open issues with assignees/labels/milestones and recent PRs | `.overview-assignee`, `.overview-milestone`, `.overview-label`, `.overview-pullrequest` with row lists | assignee/label rows present; Wave 4 adds all open milestone rows, empty/new milestone state, no-milestone count row, and recent PR contributor/title/date rows plus “more” link | click Dashboard tab | REST container dashboard data includes assignee, label, milestone, no-milestone, and PR row projections | covered by `project-home-parity.e2e.ts` |
| `/:owner/:project` | project member side block | `.project-members .member img`, member profile links, `#member-add-link` | `.member-wrap`, `.project-members .member`, avatar/profile/name links, and updater add link rendered | load page as updater | REST container members available | covered by `project-home-parity.e2e.ts` |
| `/:owner/:project` | leave project | `#projectLeaveBtn` opens `#alertLeave`; modal has `project.member.leaveConfirm`, Yes/No | `#projectLeaveBtn` opens `#alertLeave`; confirm `#leaveBtn` calls REST leave mutation | click Leave, cancel, reopen, confirm | REST delete member mutation | covered by `project-home-parity.e2e.ts` |
| `/:owner/:project/settingform` | code access, default branch, issue template | `#codeAccessibleMemberOnly`, `#codeAccessibleAnyone`, issue-template edit link, `#project-default-branch` | Git issue-template edit link, protected-scope visibility, reviewer-count code-menu/SVN visibility, mutable code-access radios, and default branch selector are covered | toggle code access/reviewer/default branch, save, assert refetched state | REST project update persists code-access; existing branch REST updates default branch | covered by `project-settings-parity.e2e.ts` |
| `/:owner/:project/settingform` | menu settings | `#menuSettingCode` etc. checked state persists after Save | same checkbox IDs; menu updates from `show*` flags | toggle menu checkboxes, save, assert hidden menu labels after refetch | REST update project menu settings | covered by `project-settings-parity.e2e.ts` |
| `/:owner/:project/members` | add member | `#addNewMember #loginId`, add button | same form/input/button | type login, submit; enrollment accept | REST `POST /members` with CSRF and legacy loginId body | covered in current follow-up |
| `/:owner/:project/members` | edit/delete member | role dropdown `data-action="apply"`, delete `data-action="delete"` | role buttons and delete button invoke REST mutations | choose role, delete member; non-updater forbidden state | REST `PATCH/DELETE /members/:userId` with CSRF; 403 renders forbidden shell | covered in current follow-up |
| `/:owner/:project/watchers` | watcher list | `project.watcher.title`, `project.watcher.description`, `.members.project .member` | same title/description/member shell | load page | REST `GET /watchers` | covered |
| `/:owner/:project/webhooks` | create webhook | `#formNewWebhook`, payload/secret, type radios, `#gitPush` | same form/list IDs; JSON type forces gitPush checked/disabled; empty payload renders resolved legacy validation copy | submit empty payload, select JSON, submit payload | REST `POST /webhooks` with CSRF and legacy payload fields; empty payload sends no POST | covered in current follow-up |
| `/:owner/:project/webhooks` | delete webhook | `#webhooksList`, `data-request-method="delete"` | `data-request-uri`, delete button; non-updater forbidden shell | click delete; load as non-updater | REST `DELETE /webhooks/:id` with CSRF; 403 renders forbidden shell | covered in current follow-up |
| `/:owner/:project/transfer` | unchecked destructive flow | `#accept`, `#btnTransfer`, alert before modal | inline legacy alert copy, hidden modal while unchecked, then modal only after accept | click Transfer unchecked, assert no POST, then checked | REST `POST /transfer` only on confirm | covered in current follow-up |
| `/:owner/:project/changeVCS` | unchecked destructive flow | `#acceptChangeVCS`, `#btnChangeVCS`, modal `#alertChangeVCS` | same IDs/copy, alert then modal after accept | click unchecked, then checked | REST `POST /change-vcs` only on confirm | covered |
| `/:owner/:project/deleteform` | unchecked destructive flow | `#accept`, `#btnDelete`, modal `#alertDeletion` | same IDs/copy, alert then modal after accept | click unchecked, then checked | REST `DELETE /project` only on confirm | covered |
| `/:owner/:project/newFork` | fork form | `#helpMessage`, `#project-owner`, `#inputName`, project scope radios, fork button; existing-fork notice/link | same help/form/scope/button shell; existing-fork notice/link and disabled submit when unavailable | empty name no-submit, existing-fork no-submit, fill name, submit | REST `POST /fork` with CSRF and legacy payload only when enabled | covered in current follow-up |
| `/:owner/:project/statistics` | statistics page | `<h1>Under Construction</h1>` | `<h1>Under Construction</h1>` | load page | REST container read only | covered |

## Nested Layout Follow-Ups

- 2026-06-27 project home shell follow-up:
  `frontend/src/routes/$owner/$projectName/route.tsx` now owns the project
  header/menu/page-wrap shell for the index project route with the home menu
  active. `ProjectDetailPage` renders only the legacy project home body through
  `renderShell={false}` for `/$owner/$projectName/` while preserving
  direct-render shell output for existing specs. Focused coverage:
  `pnpm --dir frontend exec vitest run src/project-home-tabs.spec.tsx -t "project layout route own project home"`.
- 2026-06-27 project fork shell follow-up:
  `frontend/src/routes/$owner/$projectName/route.tsx` now owns the project
  header/menu/page-wrap shell for `/newFork` with the pull request menu active.
  `ProjectForkPage` renders only the legacy fork form body through
  `renderShell={false}` for that TanStack child route while preserving
  direct-render shell output for existing specs. Focused coverage:
  `pnpm --dir frontend exec vitest run src/project-settings-parity.spec.tsx -t "fork shell"`.
