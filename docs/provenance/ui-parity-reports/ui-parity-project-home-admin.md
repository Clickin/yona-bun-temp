# UI Parity Report: ui-parity-project-home-admin

Status: explorer report
Date: 2026-06-26
Agent: `019effaa-4c2c-7a91-8845-ea0edd3d5d48` (`Socrates`)
Mode: read-only audit, no files edited by the explorer

## 2026-06-27 Nested Layout Follow-Up

- Moved project members settings shell ownership into `frontend/src/routes/$owner/$projectName/route.tsx` for `/members`, keeping the settings menu active and rendering `ProjectMembersPage` through the TanStack Router `<Outlet />`.
- Scope: `frontend/src/routes/-project-views.tsx` adds `renderShell={false}` for `ProjectMembersPage`; the members leaf route passes that flag while retaining its existing member REST mutation/query boundaries.
- Verification: `pnpm --dir frontend exec tsc --noEmit`; `pnpm --dir frontend exec vitest run src/project-members-parity.spec.tsx src/project-settings-parity.spec.tsx`.

## 2026-07-01 Project Home README Template-First Rebuild

- Rebuilt the concrete flat route `frontend/src/routes/$ownerName/$projectName.tsx` from `project/home.scala.html`, `project/partial_readme.scala.html`, `project/header.scala.html`, and `projectMenu.scala.html`.
- Scope: the default README tab state keeps a single local component tree because the legacy screen is one project home body plus shell; the route reads the existing project container REST data for shell, clone URL, README fallback, member pane, and leave/overview mutation boundaries.
- Verification: `pnpm --dir frontend test:e2e -- project-home-readme.e2e.ts`.

## 2026-07-01 Project Home History Template-First Rebuild

- Extended the concrete flat route `frontend/src/routes/$ownerName/$projectName.tsx` from `project/home.scala.html` plus `project/partial_history.scala.html` for `?tabId=history`.
- Scope: the route now reads `tabId` from TanStack Router search params, keeps the legacy project home shell, activates the History tab, and renders `.content-container.nm`, `.main-stream`, `.activity-streams`, actor/avatar links, item type copy, target links, and date from the existing project container REST `history.items` projection.
- Verification: `pnpm --dir frontend test:e2e -- project-home-history.e2e.ts`.

## 2026-07-01 Project Home Dashboard Template-First Rebuild

- Extended the concrete flat route `frontend/src/routes/$ownerName/$projectName.tsx` from `project/home.scala.html` plus `project/partial_dashboard*.scala.html` for `?tabId=dashboard`.
- Scope: the route reads `tabId`, activates the Dashboard tab, and renders `.content-container.nm`, `.project-overview-home.row-fluid`, assignee, milestone, label, and pull-request empty dashboard sections from project container REST `dashboard`.
- Verification: `pnpm --dir frontend test:e2e -- project-home-dashboard.e2e.ts`.

## 2026-07-01 Project Settings Template-First Rebuild

- Rebuilt the concrete flat route `frontend/src/routes/$ownerName/$projectName/setting.tsx` from `project/setting.scala.html`, `project/header.scala.html`, `projectMenu.scala.html`, and `project/partial_settingmenu.scala.html`.
- Scope: the initial Git project settings state keeps a single local component tree because the legacy body is one multipart settings form; the route reads project settings REST data plus code-branch REST data for the default-branch select and uses existing project/default-branch mutation boundaries on submit.
- Verification: `pnpm --dir frontend test:e2e -- project-settings-form.e2e.ts`.

## 2026-07-01 Project Members Template-First Rebuild

- Rebuilt the concrete flat route `frontend/src/routes/$ownerName/$projectName/members.tsx` from `project/members.scala.html`, `project/header.scala.html`, `projectMenu.scala.html`, and `project/partial_settingmenu.scala.html`.
- Scope: the member management state keeps a single local component tree because the legacy body is one add-member form, member list, role/delete controls, and enrollment request block; the route reads project container data for the shell and members REST data for list/mutation boundaries.
- Verification: `pnpm --dir frontend test:e2e -- project-members-form.e2e.ts`.

## 2026-07-01 Project Issue Labels Template-First Rebuild

- Rebuilt the concrete flat route `frontend/src/routes/$ownerName/$projectName/issue/labelsform.tsx` from `project/issuelabels.scala.html`, `project/partial_issuelabels_list.scala.html`, `project/partial_issuelabels_editcategory.scala.html`, `project/partial_issuelabels_editlabel.scala.html`, `project/header.scala.html`, `projectMenu.scala.html`, and `project/partial_settingmenu.scala.html`.
- Scope: the empty label editor keeps a single local component tree because the legacy body is one copy-label form, add-label form, empty list, and edit modal pair; the route reads project container data for the shell and project labels REST data for list/mutation boundaries.
- Verification: `pnpm --dir frontend test:e2e -- project-labels-form.e2e.ts`.

## 2026-06-27 Webhooks Layout Follow-Up

- Moved project webhooks settings shell ownership into `frontend/src/routes/$owner/$projectName/route.tsx` for `/webhooks`, keeping the settings menu active and rendering `ProjectWebhooksPage` through the TanStack Router `<Outlet />`.
- Scope: `frontend/src/routes/-project-views.tsx` adds `renderShell={false}` for `ProjectWebhooksPage`; the webhooks leaf route passes that flag while retaining its existing webhook REST mutation/query boundaries.
- Verification: `pnpm --dir frontend exec tsc --noEmit`; `pnpm --dir frontend exec vitest run src/project-settings-parity.spec.tsx`.

## 2026-06-30 Project Webhooks Template-First Rebuild

- Rebuilt the concrete flat route `frontend/src/routes/$ownerName/$projectName/webhooks.tsx` from `project/webhooks.scala.html`, `project/partial_webhooks_list.scala.html`, `project/header.scala.html`, `projectMenu.scala.html`, and `project/partial_settingmenu.scala.html`.
- Scope: the empty-list state keeps a single local component tree because it is one settings form/list screen; the route reads project container data for the shell and webhooks REST data for the form/list boundary.
- Verification: `pnpm --dir frontend test:e2e -- project-webhooks-form.e2e.ts`.

## 2026-06-27 Transfer Layout Follow-Up

- Moved project transfer settings shell ownership into `frontend/src/routes/$owner/$projectName/route.tsx` for `/transfer`, keeping the settings menu active and rendering `ProjectTransferPage` through the TanStack Router `<Outlet />`.
- Scope: `frontend/src/routes/-project-views.tsx` adds `renderShell={false}` for `ProjectTransferPage`; the transfer leaf route passes that flag while retaining its existing transfer REST request/query boundary.
- Verification: `pnpm --dir frontend exec tsc --noEmit`; `pnpm --dir frontend exec vitest run src/project-settings-parity.spec.tsx`.

## 2026-06-30 Project Transfer Form Template-First Rebuild

- Rebuilt the concrete flat route `frontend/src/routes/$ownerName/$projectName/transfer.tsx` from `project/transfer.scala.html` plus `project/header.scala.html`, `projectMenu.scala.html`, and `project/partial_settingmenu.scala.html`.
- Scope: the screen keeps a single local component tree because it is one destructive settings screen plus legacy header/menu partial shapes; extra extraction would only add indirection.
- Verification: `pnpm --dir frontend test:e2e -- project-transfer-form.e2e.ts`.

## 2026-06-27 Delete Layout Follow-Up

- Moved project delete settings shell ownership into `frontend/src/routes/$owner/$projectName/route.tsx` for `/deleteform`, keeping the settings menu active and rendering `ProjectDeletePage` through the TanStack Router `<Outlet />`.
- Scope: `frontend/src/routes/-project-views.tsx` adds `renderShell={false}` for `ProjectDeletePage`; the delete leaf route passes that flag while retaining its existing delete REST mutation boundary.
- Verification: `pnpm --dir frontend exec tsc --noEmit`; `pnpm --dir frontend exec vitest run src/project-settings-parity.spec.tsx`.

## 2026-06-30 Project Delete Form Template-First Rebuild

- Rebuilt the concrete flat route `frontend/src/routes/$ownerName/$projectName/deleteform.tsx` from `project/delete.scala.html` plus `project/header.scala.html`, `projectMenu.scala.html`, and `project/partial_settingmenu.scala.html`.
- Scope: the screen keeps a single local component tree because the route is one destructive settings screen plus legacy header/menu partial shapes; extra extraction would only add indirection.
- Verification: `pnpm --dir frontend test:e2e -- project-delete-form.e2e.ts`.

## 2026-06-27 Change-VCS Layout Follow-Up

- Moved project change-VCS settings shell ownership into `frontend/src/routes/$owner/$projectName/route.tsx` for `/changeVCS`, keeping the settings menu active and rendering `ProjectChangeVcsPage` through the TanStack Router `<Outlet />`.
- Scope: `frontend/src/routes/-project-views.tsx` adds `renderShell={false}` for `ProjectChangeVcsPage`; the change-VCS leaf route passes that flag while retaining its existing REST mutation/query boundary.
- Verification: `pnpm --dir frontend exec tsc --noEmit`; `pnpm --dir frontend exec vitest run src/project-settings-parity.spec.tsx`.

## 2026-06-30 Project Change-VCS Form Template-First Rebuild

- Rebuilt the concrete flat route `frontend/src/routes/$ownerName/$projectName/changeVCS.tsx` from `project/change_vcs.scala.html` plus `project/header.scala.html`, `projectMenu.scala.html`, and `project/partial_settingmenu.scala.html`.
- Scope: the screen keeps a single local component tree because it is one destructive settings screen plus legacy header/menu partial shapes; extra extraction would only add indirection.
- Verification: `pnpm --dir frontend test:e2e -- project-change-vcs-form.e2e.ts`.

## 2026-06-27 Issue-Labels Layout Follow-Up

- Moved project issue-label settings shell ownership into `frontend/src/routes/$owner/$projectName/route.tsx` for `/issue/labelsform`, keeping the settings menu active and rendering `IssueLabelsFormPage` through the TanStack Router `<Outlet />`.
- Scope: `frontend/src/routes/$owner/$projectName/issue/labelsform/route.tsx` renders only the label editor body/modals and passes `renderShell={false}` from the route, with `ProjectHeader`/`ProjectMenu` ownership kept in the parent project layout while retaining the existing label/category REST mutation/query boundary.
- Verification: `pnpm --dir frontend exec tsc --noEmit`; `pnpm --dir frontend exec vitest run src/issue-label-settings-i18n.spec.tsx src/project-settings-parity.spec.tsx`.

## 2026-06-27 Watchers Layout Follow-Up

- Moved project watchers shell ownership into `frontend/src/routes/$owner/$projectName/route.tsx` for `/watchers`, preserving the legacy project menu state with no active menu item.
- Scope: `frontend/src/routes/-project-views.tsx` adds `renderShell={false}` for `ProjectWatchersPage`; the watchers leaf route passes that flag while retaining its read/query boundary.
- Verification: `pnpm --dir frontend exec tsc --noEmit`; `pnpm --dir frontend exec vitest run src/project-watchers-parity.spec.tsx`.

## 2026-06-30 Project Watchers Template-First Rebuild

- Rebuilt the concrete flat route `frontend/src/routes/$ownerName/$projectName/watchers.tsx` from `project/watchers.scala.html` plus `project/header.scala.html` and `projectMenu.scala.html`.
- Scope: the screen keeps a single local component tree because the legacy body is only the watcher title/description plus `.members.project.row-fluid` list; the route reads project container data for the shell and watcher data for the member rows.
- Verification: `pnpm --dir frontend test:e2e -- project-watchers.e2e.ts`.

## 2026-06-27 Statistics Layout Follow-Up

- Moved project statistics shell ownership into `frontend/src/routes/$owner/$projectName/route.tsx` for `/statistics`, keeping the issue menu active.
- Scope: `frontend/src/routes/-project-views.tsx` adds `renderShell={false}` for `ProjectStatisticsPage`; the statistics leaf route passes that flag while retaining the legacy `Under Construction` body.
- Verification: `pnpm --dir frontend exec tsc --noEmit`; `pnpm --dir frontend exec vitest run src/route-parity.spec.tsx -- --testNamePattern "project statistics"`.

## 2026-06-30 Project Statistics Template-First Rebuild

- Rebuilt the concrete flat route `frontend/src/routes/$ownerName/$projectName/statistics.tsx` from `project/statistics.scala.html` plus `project/header.scala.html` and `projectMenu.scala.html`.
- Scope: the screen keeps a single local component tree because the legacy body is only the project shell with the Issue menu active and `<h1>Under Construction</h1>`.
- Verification: `pnpm --dir frontend test:e2e -- project-statistics.e2e.ts`.

## 2026-06-30 Project Fork Form Template-First Rebuild

- Rebuilt the concrete flat route `frontend/src/routes/$ownerName/$projectName/newFork.tsx` from `git/fork.scala.html` plus `project/header.scala.html` and `projectMenu.scala.html`.
- Scope: the positive no-existing-fork state keeps a single local component tree because the legacy body is one fork form/help panel; the route reads fork-options REST data for the shell, owner options, existing fork state, and form defaults.
- Verification: `pnpm --dir frontend test:e2e -- project-fork-form.e2e.ts`.

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
- `yona-original/app/views/project/issuelabels.scala.html`
- `yona-original/app/views/project/partial_issuelabels_list.scala.html`
- `yona-original/app/views/project/partial_issuelabels_editcategory.scala.html`
- `yona-original/app/views/project/partial_issuelabels_editlabel.scala.html`
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
- `frontend/src/routes/$ownerName/$projectName.tsx`
- `frontend/src/routes/$ownerName/$projectName/setting.tsx`
- `frontend/src/routes/$owner/$projectName/members/route.tsx`
- `frontend/src/routes/$ownerName/$projectName/members.tsx`
- `frontend/src/routes/$ownerName/$projectName/issue/labelsform.tsx`
- `frontend/src/routes/$ownerName/$projectName/watchers.tsx`
- `frontend/src/routes/$ownerName/$projectName/webhooks.tsx`
- `frontend/src/routes/$ownerName/$projectName/transfer.tsx`
- `frontend/src/routes/$owner/$projectName/changeVCS/route.tsx`
- `frontend/src/routes/$owner/$projectName/deleteform/route.tsx`
- `frontend/src/routes/$ownerName/$projectName/newFork.tsx`
- `frontend/src/routes/$ownerName/$projectName/statistics.tsx`
- `frontend/src/app-view-models.ts`
- `frontend/src/project-home-tabs.spec.tsx`
- `frontend/src/project-settings-parity.spec.tsx`
- `frontend/src/route-parity.spec.tsx`
- `frontend/tests/project-home-readme.e2e.ts`
- `frontend/tests/project-home-history.e2e.ts`
- `frontend/tests/project-home-dashboard.e2e.ts`
- `frontend/tests/project-fork-form.e2e.ts`
- `frontend/tests/project-members-form.e2e.ts`
- `frontend/tests/project-labels-form.e2e.ts`
- `frontend/tests/project-settings-form.e2e.ts`
- `frontend/tests/project-statistics.e2e.ts`
- `frontend/tests/project-transfer-form.e2e.ts`
- `frontend/tests/project-watchers.e2e.ts`
- `frontend/tests/project-webhooks-form.e2e.ts`
- `crates/server/src/routes/projects.rs`
- `crates/server/src/routes/projects/home.rs`
- `crates/server/src/routes/utils.rs`
- `crates/server/tests/rest_contract.rs`
- `crates/server/tests/board_contract.rs`
- `crates/server/tests/project_fork_contract.rs`
- `crates/server/tests/project_delete_contract.rs`
- `crates/server/tests/project_change_vcs_contract.rs`

## Route Inventory Summary

Total rows: 19

| status | count |
| --- | ---: |
| covered | 19 |
| gap | 0 |
| deviation | 0 |
| deferred | 0 |
| not-applicable | 0 |
| weak evidence | 0 |
| needs-parent-decision | 0 |

## Result Inventory

| path | legacy evidence | current evidence | status | proposed owner |
| --- | --- | --- | --- | --- |
| `/:owner/:project?tabId=readme` | `home.scala.html` selects `partial_readme(project)` for default/readme tab and wraps it with project header/menu, description editor, clone URL, side member pane, and leave modal. | `frontend/src/routes/$ownerName/$projectName.tsx` renders the flat legacy site shell, project header/menu with Home active, mobile breadcrumb, `#project-description`, hidden description edit form, `#cloneURL`, README empty fallback/create link from `partial_readme.scala.html`, right action/member pane, `#projectLeaveBtn`, `#alertLeave`, and existing project container REST plus leave/overview mutation boundaries. `frontend/tests/project-home-readme.e2e.ts` was RED against the missing flat route, then GREEN after the template-first rebuild. | covered in 2026-07-01 template-first reset slice | `frontend/tests/project-home-readme.e2e.ts` |
| `/:owner/:project?tabId=history` | `partial_history.scala.html` renders `.activity-streams`, actor avatar/link, type text, target links, and date inside the project home tab content. | `frontend/src/routes/$ownerName/$projectName.tsx` reads `tabId=history`, activates the History tab, and renders the legacy `.content-container.nm > .main-stream > .activity-streams` history body from project container REST `history.items`. `frontend/tests/project-home-history.e2e.ts` was RED against the README-only flat route, then GREEN after the template-first history state rebuild. | covered in 2026-07-01 template-first reset slice | `frontend/tests/project-home-history.e2e.ts` |
| `/:owner/:project?tabId=dashboard` | Dashboard includes assignee rows, milestone rows, label rows, and pull-request list/empty sections. | `frontend/src/routes/$ownerName/$projectName.tsx` reads `tabId=dashboard`, activates the Dashboard tab, and renders the legacy `.content-container.nm > .project-overview-home.row-fluid` dashboard body from project container REST `dashboard`. `frontend/tests/project-home-dashboard.e2e.ts` was RED against the README/history-only flat route, then GREEN after the template-first dashboard state rebuild. | covered in 2026-07-01 template-first reset slice | `frontend/tests/project-home-dashboard.e2e.ts` |
| `/:owner/:project` project menu | `projectMenu.scala.html` shows home/code/issue/PR/review/milestone/board by menu settings, VCS, and code-access membership; admin cog only for update permission. | `ProjectMenu` renders same shell; backend `build_project_container_response` gates `showCode`, `showPullRequest`, and `showReview` with menu/code-access state. | covered | none |
| `/:owner/:project` project header | Legacy project pages render project header/breadcrumb/private/protected/fork context through project layout/menu evidence. | `ProjectHeader` renders owner/project links, logo/background, favorite star, private/protected markers, fork origin link. | covered | none |
| `/:owner/:project` right member block | `home.scala.html` renders member avatars/links/display name/login and an add-member link when update is allowed. | `frontend/src/routes/$ownerName/$projectName.tsx` renders `.member-wrap`, `.project-members .member`, profile avatar/name anchors, and `#member-add-link`; `frontend/tests/project-home-readme.e2e.ts`, `project-home-history.e2e.ts`, and `project-home-dashboard.e2e.ts` compare those roots in the browser. | covered in 2026-07-01 template-first reset slice | `frontend/tests/project-home-readme.e2e.ts` |
| `/:owner/:project` leave project | `home.scala.html` includes `#projectLeaveBtn` and hidden `#alertLeave` modal shell with leave confirm copy and Yes/No buttons. | `frontend/src/routes/$ownerName/$projectName.tsx` renders `#projectLeaveBtn`, `data-href`, hidden `#alertLeave`, `#leaveBtn`, and the legacy modal header/body/footer; the active project-home E2Es compare the hidden shell as part of the whole project home roots. | covered in 2026-07-01 template-first reset slice | `frontend/tests/project-home-readme.e2e.ts` |
| `/:owner/:project/newFork`, `/:owner/:project/newFork/:forkOwner` | `git/fork.scala.html` renders the project shell with Pull Request active, fork help image/copy or same-fork warning, owner/name/scope controls, selected fork owner, and Fork/Cancel actions. | `frontend/src/routes/$ownerName/$projectName/newFork.tsx` renders the legacy site shell, project header/menu, Pull Request-active project menu, no-existing-fork help panel, owner route segment, selected organization owner, same-fork existing notice, fork owner/name/scope form, and REST fork mutation boundary. | covered in current follow-up | `frontend/tests/project-fork-form.e2e.ts` |
| `/:owner/:project/setting` / `/:owner/:project/settingform` menu settings persistence | `setting.scala.html` submits menu checkboxes for code/issue/PR/review/milestone/board. | `frontend/src/routes/$ownerName/$projectName/setting.tsx` renders the legacy site shell, active settings tab, multipart `#saveSetting` form, menu checkboxes, and project/default-branch REST mutation boundaries. `frontend/tests/project-settings-form.e2e.ts` covers the whole-screen DOM; `frontend/tests/project-settings-parity.e2e.ts` retains behavioral PATCH/refetch coverage. | covered in 2026-07-01 template-first reset slice | `frontend/tests/project-settings-form.e2e.ts` |
| `/:owner/:project/setting` / `/:owner/:project/settingform` general settings controls | Legacy settings include logo upload shell, name/overview fields, share radios, Git issue-template edit row, code-access radios, reviewer-count dropdown, default branch select, protected scope only for grouped projects, field validation, and updater-only access. | `frontend/src/routes/$ownerName/$projectName/setting.tsx` renders the initial Git settings form from `project/setting.scala.html`, including logo/upload copy, project name/description, share/code-access radios, reviewer count, default branch select, and menu checkboxes. Existing settings parity tests retain mutation, validation, and forbidden-state coverage. | covered in 2026-07-01 template-first reset slice | `frontend/tests/project-settings-form.e2e.ts` |
| `/:owner/:project/members` | `members.scala.html` provides add-member typeahead form, role dropdown, delete action, owner label, enrollment request accept, and update-gated access to the management route. | `frontend/src/routes/$ownerName/$projectName/members.tsx` renders the legacy site shell, project header/menu, project settings tab menu with Member active, add-member form, owner/member rows, role dropdown/delete anchors, enrollment request block, and REST member mutation boundaries. `frontend/tests/project-members-form.e2e.ts` covers the whole-screen DOM and proves `.enrollAcceptBtn` posts the selected enrolled user's login ID through the existing add-member REST mutation; `frontend/tests/project-members-parity.e2e.ts` retains mutation/forbidden-state coverage. | covered in 2026-07-01 template-first reset slice | `frontend/tests/project-members-form.e2e.ts` |
| `/:owner/:project/issue/labelsform` | `issuelabels.scala.html` renders copy-label and new-label forms, preset color buttons, `partial_issuelabels_list` empty/list state, and hidden edit category/label modals. | `frontend/src/routes/$ownerName/$projectName/issue/labelsform.tsx` renders the legacy site shell, project header/menu, project settings tab menu with Issue Label active, empty label editor forms, preset color controls, empty list message, and modal shells from the project labels REST boundary. | covered in 2026-07-01 template-first reset slice | `frontend/tests/project-labels-form.e2e.ts` |
| `/:owner/:project/watchers` | `watchers.scala.html` lists watcher title/description and watcher avatar/name/login links under the project shell with no active project menu item. | `frontend/src/routes/$ownerName/$projectName/watchers.tsx` renders the legacy site shell, project header/menu, no-active project menu state, watcher title/description, and `.members.project.row-fluid` watcher rows from the watcher REST boundary. | covered in 2026-06-30 template-first reset slice | `frontend/tests/project-watchers.e2e.ts` |
| `/:owner/:project/webhooks` | `webhooks.scala.html` and `partial_webhooks_list.scala.html` render create form, payload/secret inputs, type radios, git-push checkbox/help, list, delete, and empty-list state. | `frontend/src/routes/$ownerName/$projectName/webhooks.tsx` renders the legacy site shell, project header/menu, project settings tab menu with Webhooks active, create form/help, empty list shell, and REST webhook create/delete boundary. | covered in 2026-06-30 template-first reset slice | `frontend/tests/project-webhooks-form.e2e.ts` |
| `/:owner/:project/transfer` | `transfer.scala.html` renders the new-owner input row, transfer warning list, checkbox, danger button, and Yes/No confirmation modal. | `frontend/src/routes/$ownerName/$projectName/transfer.tsx` renders the legacy site shell, project header/menu, project settings tab menu, `#owner`, warning bubble, `#accept`, `#btnTransfer`, non-fade `#alertTransfer`, and REST transfer request boundary. | covered in 2026-06-30 template-first reset slice | `frontend/tests/project-transfer-form.e2e.ts` |
| `/:owner/:project/changeVCS` | `change_vcs.scala.html` checkbox-gates change-VCS modal and confirmation. | `frontend/src/routes/$ownerName/$projectName/changeVCS.tsx` renders the legacy site shell, project header/menu, project settings tab menu, VCS warning bubble, `#acceptChangeVCS`, `#btnChangeVCS`, non-fade `#alertChangeVCS`, and REST change-VCS redirect boundary. | covered in 2026-06-30 template-first reset slice | `frontend/tests/project-change-vcs-form.e2e.ts` |
| `/:owner/:project/deleteform` | `delete.scala.html` checkbox-gates delete modal and confirmation. | `frontend/src/routes/$ownerName/$projectName/deleteform.tsx` renders the legacy site shell, project header/menu, project settings tab menu, delete warning bubble, `#accept`, `#btnDelete`, non-fade `#alertDeletion`, and REST delete redirect boundary. | covered in 2026-06-30 template-first reset slice | `frontend/tests/project-delete-form.e2e.ts` |
| `/:owner/:project/statistics` | `statistics.scala.html` renders the project shell with Issue menu active and `<h1>Under Construction</h1>`. | `frontend/src/routes/$ownerName/$projectName/statistics.tsx` renders the legacy site shell, project header/menu, Issue-active project menu, page wrapper, and under-construction heading from the project container REST boundary. | covered in 2026-06-30 template-first reset slice | `frontend/tests/project-statistics.e2e.ts` |
| project admin/settings browser raw-key absence | Legacy project admin/settings pages resolve `project.*`, `button.*`, `fork.*`, and validation message keys through Play messages before rendering. | The scoped project admin Playwright suites assert browser-visible body text does not contain bounded raw project-admin message key patterns across settings, members, fork, webhooks, delete, transfer, and changeVCS positive and forbidden/disabled states. Current fork coverage lives in `frontend/tests/project-fork-form.e2e.ts`. | covered in current follow-up | none |

## Playwright Scenario Matrix

| path | state | legacy selector/copy | Rust selector/copy | interaction | API/direct boundary | status |
| --- | --- | --- | --- | --- | --- | --- |
| `/:owner/:project` | default README, DB README exists | `.nav-tabs li.active a` `README`; README post body | `.board-view.project-readme-post`, `.readme-body.markdown-wrap` | load page | React route reads REST container plus posts JSON | covered |
| `/:owner/:project` | no DB README, Git README exists | README tab displays repository README markdown | `.project-git-readme`, README filename/body | load page | React route reads REST container `readmeFile` | covered |
| `/:owner/:project` | no README, Git project, updater | `.bubble-wrap.gray.readme`, `project.readme`, create README link | `.bubble-wrap.gray.readme`, `postform?readme=true` | load page and assert create README link | React route reads project container REST; direct link opens React board post form; submit remains REST | covered by `project-home-readme.e2e.ts` |
| `/:owner/:project?tabId=history` | history tab | `.activity-streams .activity-stream`, `.actor`, `.where`, `.title`, `.date` | same legacy shell/classes in `frontend/src/routes/$ownerName/$projectName.tsx` | load `?tabId=history`; active History tab | project container REST `history.items` | covered by `project-home-history.e2e.ts` |
| `/:owner/:project?tabId=dashboard` | open issues with assignees/labels/milestones and pull-request empty state | `.overview-assignee`, `.overview-milestone`, `.overview-label`, `.overview-pullrequest` with row lists or empty action | same legacy shell/classes in `frontend/src/routes/$ownerName/$projectName.tsx`, including progress bars, no-assignee/no-milestone rows, label groups, and PR empty action | load `?tabId=dashboard`; active Dashboard tab | project container REST `dashboard` | covered by `project-home-dashboard.e2e.ts` |
| `/:owner/:project` | project member side block | `.project-members .member img`, member profile links, `#member-add-link` | `.member-wrap`, `.project-members .member`, avatar/profile/name links, and updater add link rendered | load page as updater | REST container members available | covered by `project-home-readme.e2e.ts` |
| `/:owner/:project` | leave project hidden modal shell | `#projectLeaveBtn`, `#alertLeave`, `#leaveBtn`, Yes/No | same hidden legacy modal shell rendered in the whole project home DOM | load page as updater | REST container member metadata available | covered by `project-home-readme.e2e.ts` |
| `/:owner/:project/setting` | Git settings form shell | `#saveSetting`, logo upload shell, `#project-name`, `#project-desc`, share/code-access radios, reviewer count, `#project-default-branch`, `#menuSettingCode` etc. | same whole-screen DOM, settings submenu, multipart form, field IDs/names, radio/checkbox states, reviewer/default-branch controls, and Save button | initial render; existing mutation spec covers save/refetch/validation/forbidden state | REST project settings plus code branches; submit uses project update and default-branch REST boundaries | covered in 2026-07-01 template-first reset slice |
| `/:owner/:project/members` | member management shell | `#addNewMember #loginId`, `.members.project .member`, role dropdown `data-action="apply"`, delete `data-action="delete"`, owner badge, enrollment request legend, `.enrollAcceptBtn[data-loginId]` | same whole-screen DOM, settings submenu, add-member form, owner/member rows, role dropdown/delete anchors, enrollment request block, and enrolled-user Add mutation | initial render; click enrolled-user Add; existing mutation spec covers add/role/delete/forbidden state | REST project container plus `GET/POST/PATCH/DELETE /members` | covered in current follow-up |
| `/:owner/:project/issue/labelsform` | empty label editor shell | `#copyLabel`, `#frmNewLabel`, `.label-preset-colors`, `#labelsList .error-wrap`, `#editCategory`, `#editLabel` | same whole-screen DOM, settings submenu, copy/add forms, 17 new-label color buttons, empty list, category modal, and label modal | initial render; submit handlers retain REST mutation boundaries | REST project container plus `GET/POST /labels` and copy label REST boundary | covered in 2026-07-01 template-first reset slice |
| `/:owner/:project/watchers` | watcher list shell | `project.watcher.title`, `project.watcher.description`, `.members.project .member` | same whole-screen DOM, project shell, no-active menu state, title/description, and watcher rows | initial render | REST project container plus `GET /watchers` | covered in 2026-06-30 template-first reset slice |
| `/:owner/:project/webhooks` | empty webhook form/list shell | `#formNewWebhook`, payload/secret, type radios, `#gitPush`, `#webhooksList .error-wrap` | same whole-screen DOM, settings submenu, create form/help, and empty-list state | initial render; create/delete use REST mutation boundaries | REST project container plus `GET/POST/DELETE /webhooks` | covered in 2026-06-30 template-first reset slice |
| `/:owner/:project/transfer` | transfer form shell | `#owner`, `#accept`, `#btnTransfer`, modal `#alertTransfer`, `#btnTransferExec` | same whole-screen DOM, IDs/copy, warning bubble, settings submenu, and non-fade modal class | initial render and hidden modal state; confirm uses REST mutation boundary | REST `POST /transfer` on confirm | covered in 2026-06-30 template-first reset slice |
| `/:owner/:project/changeVCS` | change-VCS form shell | `#acceptChangeVCS`, `#btnChangeVCS`, modal `#alertChangeVCS`, `#btnChangeVCSExec` | same whole-screen DOM, IDs/copy, warning bubble, settings submenu, and non-fade modal class | initial render and hidden modal state; confirm uses REST mutation boundary | REST `POST /change-vcs` on confirm | covered in 2026-06-30 template-first reset slice |
| `/:owner/:project/deleteform` | delete form shell | `#accept`, `#btnDelete`, modal `#alertDeletion`, `#btnDeleteExec` | same whole-screen DOM, IDs/copy, warning bubble, settings submenu, and non-fade modal class | initial render and hidden modal state; confirm uses REST mutation boundary | REST `DELETE /project` on confirm | covered in 2026-06-30 template-first reset slice |
| `/:owner/:project/newFork` | fork form shell, no existing fork | `#helpMessage`, `#project-owner`, `#inputName`, project scope radios, fork button | same whole-screen DOM, project shell, Pull Request-active menu, help image/copy, owner/name/scope controls, and Fork/Cancel actions | initial render; submit uses REST mutation boundary | REST fork-options read plus `POST /fork` with CSRF | covered in 2026-06-30 template-first reset slice |
| `/:owner/:project/newFork/:forkOwner` | fork form shell, same fork already exists | `#helpMessage .ico-err2`, `fork.already.exist`, selected `#project-owner`, protected share option for organization owner | same page-wrap DOM, selected organization owner, existing-fork source/target link row, protected option, and Fork/Cancel actions | initial render via legacy owner segment route | REST fork-options read plus React route owner segment selection | covered in current follow-up |
| `/:owner/:project/statistics` | statistics page shell | Issue-active project menu and `<h1>Under Construction</h1>` | same whole-screen DOM, project shell, and body heading | initial render | REST project container read only | covered in 2026-06-30 template-first reset slice |

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
- 2026-06-27 project settings/admin shell follow-up:
  `frontend/src/routes/$owner/$projectName/route.tsx` now owns the project
  header/menu/page-wrap shell for `/settingform`, `/members`, `/webhooks`,
  `/transfer`, `/deleteform`, `/changeVCS`, `/issue/labelsform`,
  `/watchers`, and `/statistics`. The leaf pages render only their legacy inner
  bodies through `renderShell={false}` while preserving direct-render shell
  output for existing specs. Focused coverage is recorded in
  `docs/plans/2026-06-27-ui-parity-coordination.md`.
