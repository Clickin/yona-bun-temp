# 2026-06-27 UI Parity Coordination Plan

Status: current execution plan

## Goal

Reach legacy Yona UI/UX parity before any CSS tooling migration. The current
target is not a redesign and not a Tailwind/Vanilla Extract migration. Tooling
changes may happen only after the legacy output is stable and covered.

## Source Order

1. `yona-original/app/views/**`
2. `yona-original/app/assets/stylesheets/yobi.less` and imported LESS
3. `yona-original/public/bootstrap/css/bootstrap.css`
4. Current React implementation under `frontend/src/**`
5. Provenance reports under `docs/provenance/**`

## Work Rules

- Keep legacy DOM class names and deep links.
- Use TanStack Router nested layouts as the shell ownership boundary. Legacy
  selectors stay in the rendered output, but route shells must not be rebuilt as
  ad hoc template-style page reloads or document-level DOM bridges.
- Fix shared root causes before per-screen patches.
- Do not introduce Tailwind, Vanilla Extract, or new CSS architecture during
  parity closure.
- Record any unavoidable mismatch as `gap`, `deviation`, or `deferred` in the
  canonical/provenance/plan chain.
- Prefer small milestone commits. Later squash is allowed; each milestone must
  still pass the available local checks or clearly document the blocking gate.

## Subagent Slices

| Slice | Scope | Primary files | Output |
| --- | --- | --- | --- |
| P0 Root/global shell | Navbar, user menu, sidebar entry, footer, login dialog, SPA link behavior | `frontend/src/routes/__root.tsx`, `frontend/src/app.css`, `yona-original/app/views/common/**`, legacy `_page.less` | mismatch list and smallest-first fixes |
| P1 Project shell | Project header, project menu, breadcrumb, project home/admin/settings chrome | `frontend/src/routes/-project-views.tsx`, project route files, `frontend/src/app.css`, legacy project templates/LESS | mismatch list and smallest-first fixes |
| P2 Issue/editor/comment | Issue list/detail/form density, editor tabs, comments, labels, milestone/sidebar controls | `frontend/src/routes/-issue-views.tsx`, issue route files, `frontend/src/app.css`, legacy issue templates/LESS | mismatch list and smallest-first fixes |
| P3 Board/milestone/post | Board list/detail, milestone list/detail/form, post list/detail/editor | `frontend/src/routes/-board-views.tsx`, `-milestone-views.tsx`, project post routes, legacy board/milestone/post templates | mismatch list and smallest-first fixes |
| P4 Code/PR/review | Code browser, commits, diff, PR list/detail/change/review thread | `frontend/src/routes/-pull-request-views.tsx`, code route files, legacy code/git/review templates | mismatch list and smallest-first fixes |
| P5 Workspace/org/site-admin | User/profile/settings, organization pages, directories, admin pages, search/notification | workspace/org/site-admin/search route files, legacy user/organization/site/search templates | mismatch list and smallest-first fixes |

## Milestone Loop

1. Assign one or more disjoint slices to subagents.
2. Subagents return concrete mismatches with legacy source and target files.
3. Coordinator reviews reports, drops speculative items, and chooses the
   smallest shared fixes.
4. Implement fixes in narrow files.
5. Run focused checks first, then broader checks when the touched surface is
   shared.
6. Update the relevant provenance report when the evidence changes.
7. Run `pnpm agent:turn-commit -- -m "<summary>"`.
8. If the turn commit hook fails on an existing strict parity gate, keep the
   working tree staged and record the exact blocker before continuing.

## Current Milestone

M0 is root-shell stabilization:

- Preserve legacy anchor markup while internal page links navigate through
  TanStack Router SPA transitions.
- Keep server-action and asset links as normal browser navigation.
- Reduce the global navigation height drift caused by block-level anchor boxes.
- Add a focused unit contract for SPA link filtering.

M1 is low-risk shared CSS parity:

- Restore legacy search scope dropdown styling by limiting transparent button
  rules to `.search-box button`.
- Restore legacy common utilities used by the shell: `.btn-transparent`,
  `.hidden`, and `.nm`.
- Restore legacy `.nav-tabs` density and blue link treatment.
- Remove the desktop-only `.project-page-wrap` width shrink.
- Restore project breadcrumb hover underline behavior.

M0/M1 verification:

- `pnpm --dir frontend exec tsc --noEmit` passed.
- `pnpm --dir frontend exec vitest run src/auth-workspace-shell.spec.tsx src/project-home-tabs.spec.tsx` passed.
- `pnpm agent:turn-commit -- -m "Document UI parity coordination and fix shell CSS"` reached lint, React Doctor, oxfmt, and design harness pass, then stopped at the existing strict parity gate:
  `Rust foundation and runtime bootstrap still tracks a legacy gap or partial slice and has not yet landed a full parity closure.`
- The blocker is triggered because this milestone touches `frontend/src/routes/__root.tsx`, which the parity gate maps to the partial runtime-bootstrap slice. Do not bypass the hook without an explicit maintainer decision.

M2 starts project shell ownership migration:

- `/$owner/$projectName/route.tsx` owns the legacy project header/menu/page-wrap
  shell for `/settingform`.
- `ProjectSettingsPage` supports `renderShell={false}` so the layout route can
  render the shell while the leaf keeps the legacy inner `project-page-wrap`
  body.
- Other project children still keep their existing leaf-owned shell until they
  are migrated one vertical slice at a time.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/project-settings-parity.spec.tsx src/project-home-tabs.spec.tsx`.

M3 continues project shell ownership migration for issue forms:

- `/$owner/$projectName/route.tsx` now also owns the legacy project
  header/menu/page-wrap shell for `/issueform` and
  `/issue/:issueNumber/editform`, with the issue menu active.
- `ProjectIssueFormPage` supports `renderShell={false}` so create/edit leaf
  routes render the legacy form body under the project layout `<Outlet />`.
- Issue detail itself still keeps its existing route-owned shell until migrated
  as a separate, higher-risk detail slice.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/issue-detail-shell.spec.tsx src/project-settings-parity.spec.tsx`.

M4 continues settings-family shell migration:

- `/$owner/$projectName/route.tsx` now owns the legacy project
  header/menu/page-wrap shell for `/members`, with the settings menu active.
- `ProjectMembersPage` supports `renderShell={false}` so the members leaf route
  keeps its REST member management boundary but renders only the legacy
  `project-page-wrap` body under the project layout `<Outlet />`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/project-members-parity.spec.tsx src/project-settings-parity.spec.tsx`.

M5 continues settings-family shell migration:

- `/$owner/$projectName/route.tsx` now owns the legacy project
  header/menu/page-wrap shell for `/webhooks`, with the settings menu active.
- `ProjectWebhooksPage` supports `renderShell={false}` so the webhooks leaf
  route keeps its REST webhook management boundary but renders only the legacy
  `project-page-wrap webhook-editor-wrap` body under the project layout
  `<Outlet />`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/project-settings-parity.spec.tsx`.

M6 continues settings-family shell migration:

- `/$owner/$projectName/route.tsx` now owns the legacy project
  header/menu/page-wrap shell for `/transfer`, with the settings menu active.
- `ProjectTransferPage` supports `renderShell={false}` so the transfer leaf
  route keeps its REST transfer request boundary but renders only the legacy
  `project-page-wrap` body under the project layout `<Outlet />`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/project-settings-parity.spec.tsx`.

M7 continues settings-family shell migration:

- `/$owner/$projectName/route.tsx` now owns the legacy project
  header/menu/page-wrap shell for `/deleteform`, with the settings menu active.
- `ProjectDeletePage` supports `renderShell={false}` so the delete leaf route
  keeps its REST delete mutation boundary but renders only the legacy
  `project-page-wrap` body under the project layout `<Outlet />`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/project-settings-parity.spec.tsx`.

M8 continues settings-family shell migration:

- `/$owner/$projectName/route.tsx` now owns the legacy project
  header/menu/page-wrap shell for `/changeVCS`, with the settings menu active.
- `ProjectChangeVcsPage` supports `renderShell={false}` so the leaf route keeps
  its REST mutation/query boundary but renders only the legacy
  `project-page-wrap` body under the project layout `<Outlet />`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/project-settings-parity.spec.tsx`.

M9 continues settings-family shell migration:

- `/$owner/$projectName/route.tsx` now owns the legacy project
  header/menu/page-wrap shell for `/issue/labelsform`, with the settings menu
  active.
- `IssueLabelsFormPage` supports `renderShell={false}` so the leaf route keeps
  its label/category REST mutation boundary but renders only the legacy
  `project-page-wrap label-editor-wrap` body and modals under the project
  layout `<Outlet />`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/issue-label-settings-i18n.spec.tsx src/project-settings-parity.spec.tsx`.

M10 continues project shell migration:

- `/$owner/$projectName/route.tsx` now owns the legacy project
  header/menu/page-wrap shell for `/watchers`, preserving the old page's
  no-active-menu behavior.
- `ProjectWatchersPage` supports `renderShell={false}` so the leaf route keeps
  its read/query boundary but renders only the legacy `project-page-wrap` body
  under the project layout `<Outlet />`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/project-watchers-parity.spec.tsx`.

M11 starts milestone shell migration:

- `/$owner/$projectName/route.tsx` now owns the legacy project
  header/menu/page-wrap shell for `/milestones`, with the milestone menu active.
- `ProjectMilestoneListPage` supports `renderShell={false}` so the list leaf
  route keeps its milestone list read boundary but renders only the legacy
  stylesheet link plus `project-page-wrap` body under the project layout
  `<Outlet />`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/board-milestone-parity.spec.tsx`.

M12 continues milestone shell migration:

- `/$owner/$projectName/route.tsx` now owns the legacy project
  header/menu/page-wrap shell for `/newMilestoneForm` and
  `/milestone/:milestoneId/editform`, with the milestone menu active.
- `ProjectMilestoneFormPage` supports `renderShell={false}` so create/edit leaf
  routes keep their REST submit boundaries but render only the legacy
  `project-page-wrap` form body under the project layout `<Outlet />`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/board-milestone-parity.spec.tsx`.

M13 continues milestone shell migration:

- `/$owner/$projectName/route.tsx` now owns the legacy project
  header/menu/page-wrap shell for `/milestone/:milestoneId`, with the milestone
  menu active.
- `ProjectMilestoneDetailPage` supports `renderShell={false}` so the detail
  leaf route keeps its REST close/open/delete/mass-update boundaries but renders
  only the legacy stylesheet link, `project-page-wrap` detail body, and delete
  modal under the project layout `<Outlet />`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/board-milestone-parity.spec.tsx`.

M14 starts board shell migration:

- `/$owner/$projectName/route.tsx` now owns the legacy project
  header/menu/page-wrap shell for `/posts`, with the board menu active, board
  list keymap mode, and `board-page` shell class preserved.
- `ProjectBoardListPage` supports `renderShell={false}` so the list leaf route
  keeps its board list REST/query boundary but renders only the legacy
  `post-list project-page-wrap` body under the project layout `<Outlet />`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/board-milestone-parity.spec.tsx`.

M15 continues board shell migration:

- `/$owner/$projectName/route.tsx` now owns the legacy project
  header/menu/page-wrap shell for `/postform` and
  `/post/:postNumber/editform`, with the board menu active and `board-page`
  shell class preserved.
- `ProjectPostFormPage` supports `renderShell={false}` so create/edit leaf
  routes keep their REST submit boundaries but render only the legacy
  `project-page-wrap` form body under the project layout `<Outlet />`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/board-milestone-parity.spec.tsx`.

M16 continues board shell migration:

- `/$owner/$projectName/route.tsx` now owns the legacy project
  header/menu/page-wrap shell for `/post/:postNumber`, with the board menu
  active, detail keymap mode, and `board-page` shell class preserved.
- `ProjectBoardDetailPage` supports `renderShell={false}` so the detail leaf
  route keeps its REST comment/watch/label/delete boundaries but renders only
  the legacy `project-page-wrap board-view` body and delete modal under the
  project layout `<Outlet />`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/board-milestone-parity.spec.tsx`.

M17 starts issue list/detail shell migration:

- `/$owner/$projectName/route.tsx` now owns the legacy project
  header/menu/page-wrap shell for `/issues`, with the issue menu active, issue
  list keymap mode, and `issue-list-page` shell class preserved.
- `ProjectIssueListPage` supports `renderShell={false}` so the list leaf route
  keeps its REST list/mass-update boundaries but renders only the legacy
  `project-page-wrap` issue list body under the project layout `<Outlet />`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/issue-list-filter.spec.tsx`.

M18 continues issue list/detail shell migration:

- `/$owner/$projectName/route.tsx` now owns the legacy project
  header/menu/page-wrap shell for `/issue/:issueNumber`, with the issue menu
  active, issue detail keymap mode, and `issue-detail-page` shell class
  preserved.
- `ProjectIssueDetailPage` supports `renderShell={false}` so the detail leaf
  route keeps its REST detail/comment/action/metadata boundaries but renders
  only the legacy `project-page-wrap board-view` body under the project layout
  `<Outlet />`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/issue-detail-shell.spec.tsx`.

M19 continues project shell migration:

- `/$owner/$projectName/route.tsx` now owns the legacy project
  header/menu/page-wrap shell for `/statistics`, with the issue menu active.
- `ProjectStatisticsPage` supports `renderShell={false}` so the statistics leaf
  route keeps its project-container read boundary but renders only the legacy
  `project-page-wrap` under-construction body under the project layout
  `<Outlet />`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/route-parity.spec.tsx -- --testNamePattern "project statistics"`.

M20 starts code shell migration:

- `/$owner/$projectName/route.tsx` now owns the legacy project
  header/menu/page-wrap shell for `/branches`, with the code menu active.
- `CodeBranchListPage` supports `renderShell={false}` so the branches leaf route
  keeps its branch list query/default/delete REST boundaries but renders only
  the legacy `project-page-wrap` branch list body under the project layout
  `<Outlet />`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/code-views.spec.tsx -t "branch list shell"`.

M21 continues code shell migration:

- `/$owner/$projectName/route.tsx` now owns the legacy project
  header/menu/page-wrap shell for `/code` and `/code/:branch/*path`, with the
  code menu active.
- `CodeBrowserPage` supports `renderShell={false}` so the shared code browser
  route view keeps its REST/data-loading boundary but renders only the legacy
  `project-page-wrap` code browser body under the project layout `<Outlet />`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/code-views.spec.tsx -t "code browser shell"`.

M22 continues code shell migration:

- `/$owner/$projectName/route.tsx` now owns the legacy project
  header/menu/page-wrap shell for `/commit/:commitId`, with the code menu
  active.
- `CodeCommitDetailPage` supports `renderShell={false}` so the commit detail
  leaf route keeps its commit discussion/watch REST boundaries but renders only
  the legacy `project-page-wrap` commit diff body under the project layout
  `<Outlet />`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/code-views.spec.tsx -t "commit detail shell"`.

M23 continues code shell migration:

- `/$owner/$projectName/route.tsx` now owns the legacy project
  header/menu/page-wrap shell for `/compare/:revisionRange`, with the code menu
  active.
- `CodeComparePage` supports `renderShell={false}` so the compare leaf route
  keeps its compare data-loading boundary but renders only the legacy
  `project-page-wrap` compare body under the project layout `<Outlet />`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/code-views.spec.tsx -t "compare shell"`.

M24 completes current code shell migration pass:

- `/$owner/$projectName/route.tsx` now owns the legacy project
  header/menu/page-wrap shell for `/commits` and `/commits/:branch/*path`, with
  the code menu active.
- `CodeHistoryPage` supports `renderShell={false}` so the shared commits route
  view keeps its history data-loading and keyboard behavior but renders only
  the legacy `project-page-wrap` commit history body under the project layout
  `<Outlet />`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/code-views.spec.tsx -t "history shell"`.

M25 starts pull-request shell migration:

- `/$owner/$projectName/route.tsx` now owns the legacy project
  header/menu/page-wrap shell for `/pullRequests`, `/closedPullRequests`, and
  `/sentPullRequests`, with the pull request menu active and the legacy
  `pull-request-page` shell class.
- `ProjectPullRequestListPage` supports `renderShell={false}` so each PR list
  child route keeps its list query/mutation boundary but renders only the
  legacy `project-page-wrap` PR list body under the project layout `<Outlet />`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/pull-request-list-form-review-i18n.spec.tsx -t "PR list chrome"`.

M26 continues pull-request shell migration:

- `/$owner/$projectName/route.tsx` now owns the legacy project
  header/menu/page-wrap shell for `/newPullRequestForm` and
  `/pullRequest/:pullRequestNumber/editform`, with the pull request menu active
  and the legacy `pull-request-page` shell class.
- `ProjectPullRequestFormPage` supports `renderShell={false}` so create/edit
  child routes keep their form query/mutation boundaries but render only the
  legacy `project-page-wrap` PR form body under the project layout `<Outlet />`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/pull-request-list-form-review-i18n.spec.tsx -t "PR form chrome"`.

M27 continues pull-request shell migration:

- `/$owner/$projectName/route.tsx` now owns the legacy project
  header/menu/page-wrap shell for `/pullRequest/:pullRequestNumber`, with the
  pull request menu active and the legacy `pull-request-page` shell class.
- `ProjectPullRequestDetailPage` supports `renderShell={false}` so the overview
  child route keeps its detail query/mutation boundary but renders only the
  legacy `project-page-wrap` PR overview body under the project layout
  `<Outlet />`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/pull-request-review-i18n.spec.tsx -t "PR detail chrome"`.

M28 continues pull-request shell migration:

- `/$owner/$projectName/route.tsx` now owns the legacy project
  header/menu/page-wrap shell for `/pullRequest/:pullRequestNumber/changes` and
  `/pullRequest/:pullRequestNumber/changes/:commitId`, with the pull request
  menu active and the legacy `pull-request-page` shell class.
- `PullRequestChangesPage` supports `renderShell={false}` so the shared changes
  route content keeps its diff/review query and mutation boundary but renders
  only the legacy `project-page-wrap` changes body under the project layout
  `<Outlet />`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/pull-request-review-i18n.spec.tsx -t "PR changes chrome"`.

M29 completes current pull-request/review shell migration pass:

- `/$owner/$projectName/route.tsx` now owns the legacy project
  header/menu/page-wrap shell for `/reviews`, with the review menu active and
  the legacy `pull-request-page` shell class.
- `ProjectReviewsPage` supports `renderShell={false}` so the review-list child
  route keeps its query boundary but renders only the legacy
  `project-page-wrap` review list body under the project layout `<Outlet />`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/pull-request-list-form-review-i18n.spec.tsx -t "review-list chrome"`.

M30 continues project shell migration:

- `/$owner/$projectName/route.tsx` now owns the legacy project
  header/menu/page-wrap shell for `/newFork`, with the pull request menu active.
- `ProjectForkPage` supports `renderShell={false}` so the fork child route keeps
  its fork options query/mutation boundary but renders only the legacy
  `project-page-wrap` fork form body under the project layout `<Outlet />`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/project-settings-parity.spec.tsx -t "fork shell"`.

M31 continues project shell migration:

- `/$owner/$projectName/route.tsx` now owns the legacy project
  header/menu/page-wrap shell for the project index route, with the home menu
  active.
- `ProjectDetailPage` supports `renderShell={false}` so the index child route
  keeps the existing project home query/mutation callbacks but renders only the
  legacy `project-page-wrap` home body under the project layout `<Outlet />`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/project-home-tabs.spec.tsx -t "project layout route own project home"`.

M32 continues project shell migration:

- `/$owner/$projectName/route.tsx` now owns the legacy project header/menu shell
  for `/search`, with the legacy `search-page` class.
- Because legacy search puts `site-breadcrumb-outer` before `page-wrap-outer`,
  the project layout skips its own page-wrap for this route and lets
  `SearchRoutePage renderShell={false}` keep the existing search body order.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/route-parity.spec.tsx -t "real search routes"`.

M33 starts organization shell migration:

- `/organizations/$organizationName/route.tsx` now owns the legacy organization
  header/menu/page-wrap shell for the organization index route, with the home
  menu active.
- `OrganizationDetailPage` supports `renderShell={false}` so the index child
  route keeps the existing organization home data/mutation callbacks but
  renders only the legacy `organization-home-wrap` body under the organization
  layout `<Outlet />`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/organization-home-parity.spec.tsx -t "organization layout route own home"`.

M34 continues organization shell migration:

- `/organizations/$organizationName/route.tsx` now owns the legacy organization
  header/menu/page-wrap shell for `/settingform`, with the settings menu active
  and the legacy `organization-settings-shell` class.
- `OrganizationSettingsPage` supports `renderShell={false}` so the settings
  child route keeps the existing update/upload mutation boundary but renders
  only the legacy settings body under the organization layout `<Outlet />`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/organization-shell-i18n.spec.tsx -t "settings chrome"`.

M35 continues organization shell migration:

- `/organizations/$organizationName/route.tsx` now owns the legacy organization
  header/menu/page-wrap shell for `/members` and `/deleteForm`.
- `OrganizationMembersPage` and `OrganizationDeletePage` support
  `renderShell={false}` so those child routes keep their existing mutation
  boundaries but render only the legacy settings-tab bodies under the
  organization layout `<Outlet />`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/organization-shell-i18n.spec.tsx -t "members chrome|delete chrome"`.

M36 continues organization shell migration:

- `/organizations/$organizationName/route.tsx` now owns the legacy organization
  header/menu/page-wrap shell for `/issues`, `/boards`, `/pullrequests`, and
  `/closedPullrequests`.
- `OrganizationIssueListPage`, `OrganizationBoardListPage`, and
  `OrganizationPullRequestListPage` support `renderShell={false}` so aggregate
  leaf routes keep their REST/query boundaries but render only their legacy
  list bodies under the organization layout `<Outlet />`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/organization-shell-i18n.spec.tsx`.

M37 continues organization shell migration for scoped search:

- `/organizations/$organizationName/route.tsx` now owns the legacy organization
  header/menu shell for `/search`, with `search-page` shell class and no extra
  parent `page-wrap-outer`, matching the existing project scoped search layout
  pattern.
- `organizations/$organizationName/search/route.tsx` renders
  `SearchRoutePage` with `renderShell={false}` so the child keeps only the
  legacy search breadcrumb/results body and does not refetch org chrome.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/route-parity.spec.tsx -t "real search routes"`.

M38 starts workspace settings shell migration:

- `/user/editform/route.tsx` now owns the legacy account-settings
  breadcrumb/tabs/page-wrap shell for `/user/editform/**`.
- `WorkspaceSettingsPage` supports `renderShell={false}` so profile, password,
  notifications, emails, and token leaf routes keep their mutation boundaries
  but render only their legacy section bodies under the editform layout
  `<Outlet />`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/workspace-settings-parity.spec.tsx src/workspace-settings-i18n.spec.tsx`.

M39 continues workspace files SPA navigation:

- `/user/files` keeps the legacy user files shell and GET form/link markup, but
  filter submit and pagination clicks now call TanStack navigation instead of
  native document navigation.
- The route reads file query state from router location changes so same-page
  filter/page changes refetch workspace files without leaving the SPA.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/user-files-parity.spec.tsx src/form-submit-boundary.spec.tsx`.

M40 continues workspace issues SPA navigation:

- `/user/issues` keeps the legacy my-issues shell, side filters, search form,
  tabs, sort links, and pagination markup, but same-page query changes now call
  TanStack navigation instead of native document navigation.
- The route reads issue query state from router location changes so filter,
  state, search, sort, and page changes refetch the list inside the SPA.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/route-parity.spec.tsx -t "real user issue route" src/form-submit-boundary.spec.tsx`.

M41 continues directory SPA navigation:

- `/projects` and `/orgs` keep the legacy directory GET form markup, tabs,
  rows, empty states, and pagination.
- Directory search submit now calls TanStack navigation so public project/org
  filtering updates the existing SPA route instead of performing native
  document navigation.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/route-parity.spec.tsx -t "directory"`.

M42 continues PR list SPA navigation:

- Project and organization PR list search forms keep the legacy GET form markup,
  tabs, rows, and pagination.
- Search submit now calls TanStack navigation, and each PR list route subscribes
  to router location state so same-page filter and page-input changes refetch
  inside the SPA.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/route-parity.spec.tsx -t "pull request list pagination"`.

M43 continues board list SPA navigation:

- Project and organization board list search/filter forms keep the legacy GET
  `#option_form` markup, row output, sort links, and pagination.
- Search/filter submit now calls TanStack navigation, and each board list route
  subscribes to router location state so same-page filtering refetches inside
  the SPA.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/route-parity.spec.tsx -t "board permission gates"`.

M44 continues review-thread list SPA navigation:

- Project review-thread list search keeps the legacy hidden-field GET form,
  filters, state tabs, export href, rows, and pagination.
- Search submit now calls TanStack navigation while the existing router
  location subscription refetches review and page-input changes inside the SPA.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/route-parity.spec.tsx -t "project review list"`.

M45 continues site-admin list SPA navigation:

- `/sites/userList` and `/sites/projectList` search forms keep the legacy GET
  form, title/sidebar, rows, modals, and pagination output.
- Search submit now calls TanStack navigation and reuses the existing
  href-derived query parsing to refetch inside the SPA.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/site-admin-route-parity.spec.tsx -t "legacy user and project search forms"`.

M46 continues code browser SPA navigation:

- Code browser/history branch selectors and history keyboard paging keep the
  legacy selectors and shortcut behavior.
- Those transitions now call TanStack navigation; commit history subscribes to
  router location state for same-route `page` refetch.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/route-parity.spec.tsx -t "direct browser navigation|real project code browser route|real project commit history route"`.

M47 continues root/shared SPA navigation:

- Global navbar search keeps the legacy `gnb-search-form` action/dropdown
  output, but submit now calls TanStack navigation instead of native GET reload.
- Shared auth-required redirects, shared alias redirects, and the project admin
  alias handoff now use TanStack navigation/replace semantics instead of direct
  `window.location` document navigation.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  focused `auth-workspace-shell`, `user-profile-route-loading-shell-i18n`,
  `issue-detail-shell`, and `route-parity` vitest guards.

M48 continues auth/password SPA navigation:

- Login, signup, lost-password, reset-password, and workspace password-change
  success/error redirects now keep the existing REST JSON submit boundary but
  use TanStack navigation instead of `navigateToAppHref` document navigation.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  focused `auth-workspace-shell`, `route-parity`, and
  `form-submit-boundary` guards.

M49 continues issue mutation SPA navigation:

- Project issue create, edit, and delete keep the existing REST mutation
  boundary and now redirect with TanStack navigation instead of
  `navigateToAppHref`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/route-parity.spec.tsx -t "uses legacy message keys for form route document titles"`.

M50 continues milestone mutation SPA navigation:

- Project milestone create, edit, and delete keep the existing REST mutation
  boundary and now redirect with TanStack navigation instead of
  `navigateToAppHref`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/route-parity.spec.tsx -t "uses legacy message keys for form route document titles"`.

M51 continues board post mutation SPA navigation:

- Project board post create, edit, and delete keep the existing REST mutation
  boundary and now redirect with TanStack navigation instead of
  `navigateToAppHref`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  `pnpm --dir frontend exec vitest run src/route-parity.spec.tsx -t "requires real board routes and board API wiring instead of placeholders"`.

M52 continues workspace/profile SPA navigation:

- Public profile redirect aliases now reuse the shared TanStack `RedirectPage`,
  and workspace profile save redirects through TanStack navigation instead of
  `navigateToAppHref`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  focused `auth-workspace-shell` / `user-profile-route-loading-shell-i18n`
  guards.

M53 continues project mutation SPA navigation:

- Project create, settings save, delete, VCS change, fork, and member self-leave
  redirects keep their existing REST mutation boundaries and now use TanStack
  navigation instead of `navigateToAppHref`.
- Verification for this slice: `pnpm --dir frontend exec tsc --noEmit` and
  focused `project-create-parity`, `project-settings-parity`,
  `project-members-parity`, and `route-parity` guards.

Completed audit subagents:

- P0 Root/global shell audit
- P1 Project shell audit
- P2 Issue/editor/comment audit
- P3 Board/milestone/post audit
- P4 Code/PR/review audit
- P5 Workspace/org/site-admin audit
- P6 Organization/directory/workspace audit

## Reviewed Subagent Findings

## Router Layout Direction

The implementation target is nested route layouts, not a template-engine-style
page shell and not manual DOM ownership:

| Layout owner | Route file | Owns |
| --- | --- | --- |
| Root app shell | `frontend/src/routes/__root.tsx` | global navbar, login dialog, footer, authenticated user menu state, global SPA anchor interception only where TanStack Router owns the target |
| Project shell | `frontend/src/routes/$owner/$projectName/route.tsx` | project header, project menu, project-scoped search context, project shell data/query boundary, then `<Outlet />` |
| Organization shell | `frontend/src/routes/organizations/$organizationName/route.tsx` | organization header/menu/enrollment shell, organization search context, then `<Outlet />` |
| Workspace shell | `frontend/src/routes/me/route.tsx` and `frontend/src/routes/user/editform/route.tsx` | workspace/settings tab shell and auth gate, then `<Outlet />` for settings subroutes |
| User issues shell | `frontend/src/routes/user/issues/route.tsx` | my-issues tab/search shell and `/user/issues/new/**` nested routing |
| Site admin shell | `frontend/src/routes/sites/$pageName/route.tsx` or a future parent route if route shape changes | site admin sidebar/top shell with legacy `siteMngLayout.scala.html` output |

Rules for migration into these layouts:

- Move shared shell markup upward to the nearest existing layout route before
  patching leaf pages one by one.
- Prefer TanStack Router navigation APIs over `window.location.assign` for
  client-owned page transitions. Keep browser navigation only for server-action,
  auth/logout, file, raw/download, and external links.
- Avoid document-level click/state bridges except for legacy compatibility
  behavior that has no route-level owner, such as global shortcut handling.
- Layout refactors must keep legacy class names so existing CSS, tests, and
  selector-based parity evidence remain meaningful.

### P0 Root/Global Shell

Accepted for M1:

- `.gnb-search-form button` is too broad and flattens the search-scope dropdown.
- Legacy utility classes used by the shell are missing globally.

Queued for M2:

- `#mySidenav` open/close behavior belongs to the root TanStack layout state in
  `__root.tsx`, triggered from `RootUserMenu` and rendered through
  `RootSidebar`; do not implement it as a document-level DOM bridge.
- Framed sidebar and `#mainFrame` height/mobile rules need verification and
  CSS restoration.
- Sidebar refresh/pin behavior should target the iframe surface if retained.

### P1 Project Shell

Accepted for M1:

- `.nav-tabs` styling is narrower and more redesigned than legacy.
- `.project-page-wrap` has an extra desktop width shrink not present in legacy.
- Project breadcrumb hover underline is incomplete.

Queued for M2:

- Project header/menu ownership should move into
  `/$owner/$projectName/route.tsx` as a TanStack nested layout where possible,
  leaving leaf routes to render their page bodies.
- First migrated child: `/settingform`.
- Mobile project menu must stay horizontal and preserve legacy short-menu/count
  badge positioning.
- Site-admin sidebar/layout needs a separate pass against
  `siteMngLayout.scala.html` and `_page.less`.

### P2 Issue/Editor/Comment

Queued for M2/M3:

- Issue detail header title, board-id, and date CSS now match the legacy
  `.board-header` selectors; continue with body/sidebar/comment geometry.
- Detail layout should restore the legacy Bootstrap `span9/span3` behavior and
  `.issue-info` spacing.
- Comment boxes and write-comment editor need legacy bubble, avatar, metadata,
  indentation, and textarea sizing rules.
- Issue form and issue list row CSS need focused restoration.

Rejected from immediate action:

- Do not globally shrink `.ybtn`; legacy `_yobiUI.less` defines `.ybtn` at
  14px/20px with `4px 12px` padding even though generic form controls are 12px.

## Completion Criteria

A slice is closed only when:

- legacy templates/LESS have been cited,
- React/CSS output matches the visible legacy structure and spacing for the
  slice,
- focused tests or Playwright evidence cover the corrected behavior,
- provenance reflects the new evidence,
- no undocumented `gap` remains inside the slice.

## Milestones

- M54 continues organization mutation SPA navigation: organization create,
  settings save, and delete keep their REST mutation boundaries and now redirect
  through TanStack Router navigation instead of `navigateToAppHref`. Focused
  guards cover the organization route sources and keep the legacy visual
  shells/mutation fallbacks unchanged.
- M55 continues pull-request mutation SPA navigation: PR create and edit keep
  their existing TanStack Query invalidation boundaries, then redirect to the
  PR detail route through TanStack Router navigation instead of a full document
  reload helper. Focused guards cover the PR form route sources and mutation
  error fallbacks.
- M56 continues nested-layout mutation SPA navigation: project and organization
  leave actions keep their legacy anchors/REST mutations, then route
  redirect-path responses through TanStack Router navigation from the layout
  owner instead of reloading the document.
- M57 continues direct issue mutation SPA navigation: `/user/issues/new` and
  `/user/issues/new/mine` keep the shared direct issue form body and create
  mutation, then navigate to the created project issue through TanStack Router
  with the mounted base path preserved.
- M58 continues import mutation SPA navigation: project Git import and site
  data import keep their existing REST/file-form boundaries, then redirect
  through TanStack Router navigation instead of the full document reload helper.
- M59 removes the remaining route-owned full-reload helper usage: root login
  dialog and `/secret` setup now redirect through TanStack Router navigation
  while preserving legacy auth/setup form output and base-path handling.
- M60 establishes the frontend source import alias baseline: Vite and
  TypeScript now resolve `@/*` to `frontend/src/*`, and representative deep
  route imports were rewritten without changing runtime output.
- M61 closes the P0 root search-scope dropdown CSS gap: `.gnb-search-form`
  now carries the legacy `_page.less` dropdown item clear/float and anchor
  padding/line-height rules without broadening the search icon button selector.
- M62 closes the P0 global utility CSS gap: legacy `_common.less` float,
  text-align, vertical-align, and used margin utilities are restored globally,
  and `.pull-right` is no longer overloaded as a flex helper.
- M63 closes the P1 nav-tabs CSS drift: global `.nav-tabs` now follows legacy
  Bootstrap tab float, clearfix, padding, border, hover, and active-state rules
  instead of the temporary wide cyan/bold tab styling.
- M64 closes the P1 project breadcrumb hover drift: `.project-name a:hover`
  now keeps the legacy orange color and underline behavior from `_page.less`.
- M65 starts the P2 issue detail geometry closure: `.issue-info` sidebar
  padding, dl/dd spacing, paragraph rhythm, and status/name sizing now follow
  legacy `_page.less`.
- Follow-up modernization after parity slices: continue mechanically rewriting
  remaining deep relative frontend imports to `@/*` in small no-behavior-change
  batches.
