# Project Provenance

## Scope

- Public project directory route foundation
- Project create, read, update
- Project visibility enforcement
- Project enrollment request/cancel
- Workspace recent/favorite/default landing semantics

## Legacy Sources

- `yona-original/test/controllers/ProjectAppTest.java`
- `yona-original/test/controllers/EnrollProjectAppTest.java`
- `yona-original/test/models/ProjectTest.java`
- `yona-original/test/models/RecentlyVisitedProjectsTest.java`
- `yona-original/test/controllers/WatchProjectAppTest.java`
- `yona-original/app/controllers/ProjectApp.java`

## Current Baseline And Canonical Target

- current mixed-code reference: `frontend/legacy-start/src/lib/project-trpc.ts`, `frontend/legacy-start/src/lib/enrollment-trpc.ts`, `frontend/legacy-start/src/lib/me-trpc.ts`, `packages/domain/*project*`, `packages/db/*project*`
- canonical implementation path: `yona-rust/`
- canonical owner path:
  - `yona-rust/frontend`
  - `yona-rust/crates/server`
  - `yona-rust/crates/domain`
  - `yona-rust/crates/persistence`

## Extracted Intent

| Legacy source | Intent | Rust translation target |
| --- | --- | --- |
| `ProjectTest.create` | project create persists identity, overview, scope, VCS, and derived site URL semantics | `yona-rust/crates/persistence` repository helper + `yona-rust/crates/domain` create service |
| `ProjectTest.findByNameAndOwner` and `Project.exists` | public routing keys are owner plus project name | identifiers in `yona-rust/proto` plus lookup helper in `yona-rust/crates/persistence` |
| `ProjectApp.projects` and `project/list.scala.html` | `/projects` is a public, searchable, paginated directory entry surface and must not fall back to an unsupported route | `yona-rust/frontend` route shell + `PilotService.ListProjects` query + browser smoke |
| `ProjectTest.projectNameChangeable` | rename stays owner-scoped and duplicate project names reject under the same owner | `yona-rust/crates/persistence` conflict helper + `yona-rust/crates/domain` update service |
| `ProjectApp.newProject` | create under personal owner is allowed; org owner create requires org-admin authority | `yona-rust/crates/domain` create service + `yona-rust/crates/server` mutation contract test |
| `ProjectApp.project` | detail read is permission filtered and records recent visit semantics | `yona-rust/crates/domain` detail resolution + `yona-rust/frontend` route/UI test |
| `ProjectApp.projectOverviewUpdate` | manager-level actor can update overview content | `yona-rust/crates/domain` update service + `yona-rust/crates/server` mutation contract test |
| `ProjectAppTest` visibility cases | public/protected/private visibility gates readable discovery | `yona-rust/crates/domain` read matrix + `yona-rust/crates/server` query contract test |
| `EnrollProjectAppTest` | enrollment request and cancel stay guest-only, not-found for missing projects, idempotent | `yona-rust/crates/domain` enrollment service + `yona-rust/crates/server` mutation contract test |
| `RecentlyVisitedProjectsTest` and `WatchProjectAppTest` | recent visits dedupe/reorder and favorites remain workspace-local behavior | `yona-rust/crates/domain` workspace service + `yona-rust/crates/persistence` workspace repo + `yona-rust/frontend` route/UI test |

## Explicit Gaps

- delete project
- project transfer
- org enrollment management
- full workspace settings and default landing UX parity
- project member management beyond read-only summary
- project watchers, webhooks, change VCS, statistics

이 항목들은 후속 follow-up과 provenance gap으로 계속 남는다.

## R0-3 Delivery Note

- `R0-3` now covers project create/detail/settings, visibility-aware read, guest-only enrollment request/cancel, read-only member summary, and workspace favorite/recent linkage in `yona-rust/`.
- The Wave 0 route-foundation slice also mounts the public `/projects` directory in `yona-rust/frontend` through file routes under `src/routes/projects/**`, with route-parity tests and a shell-routing Playwright smoke pack.
- Project detail read records recent visits for authenticated viewers, and `/me` now reflects favorite/recent project state through `ReadWorkspaceOverview`.
