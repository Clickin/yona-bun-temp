# Project Provenance

## Scope

- Public project directory route foundation
- Project create, read, update
- Project visibility enforcement
- Project enrollment request/cancel
- Project watcher directory
- Workspace recent/favorite/default landing semantics

## Legacy Sources

- `yona-original/test/controllers/ProjectAppTest.java`
- `yona-original/test/controllers/EnrollProjectAppTest.java`
- `yona-original/test/models/ProjectTest.java`
- `yona-original/test/models/RecentlyVisitedProjectsTest.java`
- `yona-original/test/controllers/WatchProjectAppTest.java`
- `yona-original/app/controllers/ProjectApp.java`
- `yona-original/app/views/project/watchers.scala.html`

## Current Baseline And Canonical Target

- current mixed-code reference: `reference/mixed-code/frontend/legacy-start/src/lib/project-trpc.ts`, `reference/mixed-code/frontend/legacy-start/src/lib/enrollment-trpc.ts`, `reference/mixed-code/frontend/legacy-start/src/lib/me-trpc.ts`, `reference/mixed-code/packages/domain/*project*`, `reference/mixed-code/packages/db/*project*`
- canonical implementation path: `repo root`
- canonical owner path:
  - `frontend`
  - `crates/server`
  - `crates/domain`
  - `crates/persistence`

## Extracted Intent

| Legacy source | Intent | Rust translation target |
| --- | --- | --- |
| `ProjectTest.create` | project create persists identity, overview, scope, VCS, and derived site URL semantics | `crates/persistence` repository helper + `crates/domain` create service |
| `ProjectTest.findByNameAndOwner` and `Project.exists` | public routing keys are owner plus project name | REST path identifiers plus lookup helper in `crates/persistence` |
| `ProjectApp.projects` and `project/list.scala.html` | `/projects` is a public, searchable, paginated directory entry surface and must not fall back to an unsupported route | `frontend` route shell + `GET /api/v1/projects` query + browser smoke |
| `ProjectTest.projectNameChangeable` | rename stays owner-scoped and duplicate project names reject under the same owner | `crates/persistence` conflict helper + `crates/domain` update service |
| `ProjectApp.newProject` | create under personal owner is allowed; org owner create requires org-admin authority | `crates/domain` create service + `crates/server` mutation contract test |
| `ProjectApp.project` | detail read is permission filtered and records recent visit semantics | `crates/domain` detail resolution + `frontend` route/UI test |
| `ProjectApp.projectOverviewUpdate` | manager-level actor can update overview content | `crates/domain` update service + `crates/server` mutation contract test |
| `ProjectApp.watchers` and `project/watchers.scala.html` | watcher directory is READ-gated, resolves actual project watchers, and preserves `page-wrap-outer` / `members project row-fluid` member list anchors | `GET /api/v1/owners/:owner/projects/:project/watchers` + `/:owner/:project/watchers` route + contract/unit/Playwright assertions |
| `ProjectAppTest` visibility cases | public/protected/private visibility gates readable discovery | `crates/domain` read matrix + `crates/server` query contract test |
| `EnrollProjectAppTest` | enrollment request and cancel stay guest-only, not-found for missing projects, idempotent | `crates/domain` enrollment service + `crates/server` mutation contract test |
| `RecentlyVisitedProjectsTest` and `WatchProjectAppTest` | recent visits dedupe/reorder and favorites remain workspace-local behavior | `crates/domain` workspace service + `crates/persistence` workspace repo + `frontend` route/UI test |

## Explicit Gaps

- delete project
- project transfer
- org enrollment management
- full workspace settings and default landing UX parity
- project member management beyond read-only summary
- webhooks, change VCS, statistics

이 항목들은 후속 follow-up과 provenance gap으로 계속 남는다.

## R0-3 Delivery Note

- `R0-3` now covers project create/detail/settings, visibility-aware read, guest-only enrollment request/cancel, read-only member summary, and workspace favorite/recent linkage in `repo root`.
- The Wave 0 route-foundation slice also mounts the public `/projects` directory in `frontend` through file routes under `src/routes/projects/**`, with route-parity tests and a shell-routing Playwright smoke pack.
- Project detail read records recent visits for authenticated viewers, and `/me` now reflects favorite/recent project state through `GET /api/v1/workspace`.
- The project watcher closeout adds an app REST watcher directory and legacy deep-link route for `/:owner/:project/watchers`; unreadable projects keep the project READ denial while readable projects list actual watcher users with legacy member-row class anchors.
