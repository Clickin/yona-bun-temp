# UI Parity Report: ui-parity-project-home-admin

Status: explorer report
Date: 2026-06-26
Agent: `019effaa-4c2c-7a91-8845-ea0edd3d5d48` (`Socrates`)
Mode: read-only audit, no files edited by the explorer

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

Total rows: 17

| status | count |
| --- | ---: |
| covered | 17 |
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
| `/:owner/:project/newFork` | Legacy fork flow uses project owner/name/scope form, fork help image/copy, existing fork notice. | `ProjectForkPage` and route preserve form shell, REST mutation, redirect, existing-fork and help states; tests cover source and render evidence. | covered | none |
| `/:owner/:project/settingform` menu settings persistence | `setting.scala.html` submits menu checkboxes for code/issue/PR/review/milestone/board. | `ProjectSettingsPage` submits menu booleans through `updateProject`; backend updates `project_menu_setting`; project menu consumes returned `show*` flags. `frontend/tests/project-settings-parity.e2e.ts` now unchecks issue/review in browser, asserts the PATCH REST payload, refetches settings, and verifies the project menu labels are hidden after save. | covered in current follow-up | none |
| `/:owner/:project/settingform` general settings controls | Legacy settings include mutable code-access radios, Git issue-template edit row, reviewer-count panel hidden when code menu off, default branch select, protected scope only for grouped projects. | Wave 5 keeps the legacy code-access radios mutable/submitted through React REST JSON and persists `isCodeAccessibleMemberOnly`; the settings route now reads existing branch JSON, renders `#defaultBranceSettingPanel #project-default-branch[data-toggle=select2][data-format=branch]`, and calls the existing default-branch REST mutation only when the selected branch changed. Git issue-template, reviewer-count visibility, SVN hiding, and protected-scope visibility remain covered from Wave 2. `frontend/tests/project-settings-parity.e2e.ts` proves mutable code-access, reviewer count, overview, and default-branch browser submission, including CSRF headers, PATCH body, branch-default POST body, refetch, and visible post-save state. | covered in current follow-up | none |
| `/:owner/:project/members` | `members.scala.html` provides add-member typeahead form, role dropdown, delete action, owner label, enrollment request accept. | `ProjectMembersPage` preserves these controls and routes mutations through REST; unit/source checks exist. | covered | none |
| `/:owner/:project/watchers` | `watchers.scala.html` lists watcher title/description and watcher avatar/name/login links. | `ProjectWatchersPage` matches title/description and member-list shell from REST watcher data; backend contract covers watcher list. | covered | none |
| `/:owner/:project/webhooks` | `webhooks.scala.html` renders create form, payload/secret, type radios, JSON auto gitPush behavior, help, list, delete. | `ProjectWebhooksPage` covers form/list/delete, permission-hidden form, JSON gitPush disabling; route uses REST create/delete and tests cover shell. | covered | none |
| `/:owner/:project/transfer` | `transfer.scala.html` checkbox-gates transfer modal and Yes/No confirmation; owner input is submitted by JS module. | `ProjectTransferPage` preserves checkbox alert, modal IDs/copy, REST mutation, and accept path projection. | covered | none |
| `/:owner/:project/changeVCS` | `change_vcs.scala.html` checkbox-gates change-VCS modal and confirmation. | `ProjectChangeVcsPage` preserves checkbox alert, modal IDs/copy, REST mutation, redirect. | covered | none |
| `/:owner/:project/deleteform` | `delete.scala.html` checkbox-gates delete modal and confirmation. | `ProjectDeletePage` preserves checkbox alert, modal IDs/copy, REST mutation, redirect. | covered | none |
| `/:owner/:project/statistics` | `statistics.scala.html` renders only `<h1>Under Construction</h1>`. | `ProjectStatisticsPage` renders the same under-construction shell with project header/menu. | covered | none |

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
| `/:owner/:project/members` | add member | `#addNewMember #loginId`, add button | same form/input/button | type login, submit | REST `POST /members` | covered |
| `/:owner/:project/members` | edit/delete member | role dropdown `data-action="apply"`, delete `data-action="delete"` | role buttons and delete button invoke REST mutations | choose role, delete member | REST `PUT/DELETE /members/:userId` | covered |
| `/:owner/:project/watchers` | watcher list | `project.watcher.title`, `project.watcher.description`, `.members.project .member` | same title/description/member shell | load page | REST `GET /watchers` | covered |
| `/:owner/:project/webhooks` | create webhook | `#formNewWebhook`, payload/secret, type radios, `#gitPush` | same form/list IDs; JSON type forces gitPush checked/disabled | select JSON, submit payload | REST `POST /webhooks` | covered |
| `/:owner/:project/webhooks` | delete webhook | `#webhooksList`, `data-request-method="delete"` | `data-request-uri`, delete button | click delete | REST `DELETE /webhooks/:id` | covered |
| `/:owner/:project/transfer` | unchecked destructive flow | `#accept`, `#btnTransfer`, alert before modal | inline alert key then modal only after accept | click Transfer unchecked, then checked | REST `POST /transfer` only on confirm | covered |
| `/:owner/:project/changeVCS` | unchecked destructive flow | `#acceptChangeVCS`, `#btnChangeVCS`, modal `#alertChangeVCS` | same IDs/copy, alert then modal after accept | click unchecked, then checked | REST `POST /change-vcs` only on confirm | covered |
| `/:owner/:project/deleteform` | unchecked destructive flow | `#accept`, `#btnDelete`, modal `#alertDeletion` | same IDs/copy, alert then modal after accept | click unchecked, then checked | REST `DELETE /project` only on confirm | covered |
| `/:owner/:project/newFork` | fork form | `#helpMessage`, `#project-owner`, `#inputName`, project scope radios, fork button | same help/form/scope/button shell | fill name, submit | REST `POST /fork`, app redirect | covered |
| `/:owner/:project/statistics` | statistics page | `<h1>Under Construction</h1>` | `<h1>Under Construction</h1>` | load page | REST container read only | covered |
