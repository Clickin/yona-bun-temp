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

Completed audit subagents:

- P0 Root/global shell audit
- P1 Project shell audit
- P2 Issue/editor/comment audit

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

- Issue detail header should match legacy `.board-header .title` density.
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
