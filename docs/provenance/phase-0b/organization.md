# Organization Provenance

## Scope

- Public organization directory route foundation
- Organization create
- Organization detail read
- Organization update
- Organization home CTA matrix
- Organization members / deleteForm admin surface
- Organization member add/edit/delete
- Organization enroll / cancel enroll / leave / delete
- Organization issue listing body
- Organization board listing body
- Organization pull-request listing body

## Legacy Sources

- `yona-original/test/models/OrganizationTest.java`
- `yona-original/app/controllers/OrganizationApp.java`
- `yona-original/conf/routes`
- `yona-original/app/controllers/IssueApp.java`
- `yona-original/app/views/organization/group_issue_list.scala.html`
- `yona-original/app/views/organization/group_issue_search_partial.scala.html`
- `yona-original/app/views/organization/group_issue_list_partial.scala.html`
- `yona-original/app/views/organization/group_issue_list_quicksearch.scala.html`

## Current Baseline And Canonical Target

- current mixed-code reference: `reference/mixed-code/frontend/legacy-start/src/lib/organization-trpc.ts`, `reference/mixed-code/packages/domain/*organization*`, `reference/mixed-code/packages/db/*organization*`
- canonical implementation path: `repo root`
- canonical owner path:
  - `frontend`
  - `crates/server`
  - `crates/domain`
  - `crates/persistence`

## Extracted Intent

| Legacy source                                                | Intent                                                                                                                                              | Rust translation target                                                                                |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `OrganizationTest.create`                                    | creating an organization grants the creator the initial org-admin role                                                                              | `crates/domain` create service test + `crates/persistence` membership write path                       |
| `OrganizationTest.validateName`                              | org names reuse user login-id rules and reject malformed values                                                                                     | REST contract validation plus domain validation test                                                   |
| `OrganizationApp.orgList` and `organization/list.scala.html` | `/orgs` is public, searchable, paginated, and must stay mounted as a first-class legacy entry surface                                               | `frontend` route shell + `/api/v1/organizations` directory query + browser smoke                       |
| `OrganizationApp.newOrganization`                            | create is authenticated and duplicate names reject existing user/org identifiers                                                                    | `crates/domain` create service + `crates/server` mutation contract test                                |
| `OrganizationApp.organization`                               | org detail read is public; missing organization returns not found                                                                                   | `crates/server` query contract plus `frontend` route test                                              |
| `OrganizationApp.settingForm`                                | settings page requires update permission                                                                                                            | route authorization test in `crates/server` plus `frontend` page guard                                 |
| `OrganizationApp.updateOrganizationInfo`                     | update requires org-admin or site-admin authority; duplicate names reject; success keeps settings path semantics                                    | `crates/domain` update service + `crates/server` mutation contract test                                |
| `Organization.updateWith`                                    | org rename updates org-owned project owner string semantics                                                                                         | `crates/persistence` repository helper + `crates/domain` service test                                  |
| `IssueApp.organizationIssues`                                | org issue list is a visible-project-scoped cross-project inbox, not an organization-owned issue model                                               | `ListOrganizationIssues` contract + organization issue route                                           |
| `organization/group_issue_*` views                           | org issue screen keeps organization shell, quick filters, project selector, state tabs, sort links, cross-project rows, empty state, and pagination | `frontend/src/routes/organizations/$organizationName/issues/route.tsx` and `OrganizationIssueListPage` |
| `BoardApp.organizationBoards`                                | org board list is a visible-project-scoped cross-project posting list with project filters, search, sort, pagination, and no separate notice pinning | `organization_board_contract` + `frontend/src/routes/organizations/$organizationName/boards/route.tsx` |
| organization pull-request links/views                        | org PR list is a visible-project-scoped open/closed pull-request aggregate                                                                          | `pull_request_read_contract` + `frontend/src/routes/organizations/$organizationName/pullrequests/route.tsx` |

## Intentional Deviations

- Legacy Play routes used `/organizations/:organizationName/settingform` and `/organizations/:organizationName/setting`.
- The current Rust/React canonical path keeps legacy `settingform`, `members`, and `deleteForm` deep links, but the surrounding implementation uses `/api/v1` REST + file routes rather than Play forms and jQuery modals.
- Organization board and pull-request listing bodies are no longer placeholder-only routes; they use `/api/v1` aggregation endpoints and React legacy shells. Remaining organization gaps should be tracked in their narrower feature provenance files.

## Route Module Diet Note

- 2026-06-19: REST organization route registration for `/api/v1/organizations`, `/api/v1/organizations/:organization`, `/admin`, `/container`, `/settings`, `/members`, `/enrollments/:userId/accept`, `/enroll`, and `/leave` moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/projects.rs` alongside the project REST registration it is coupled to. This is a registration-only build/check diet change; organization create/read/update/member/enrollment/leave/delete behavior remains covered by `org_project_contract`.

## Wave 2B Delivery Note

- Wave 2B now covers organization create, public detail read, settings read/update, home CTA matrix, members admin view, deleteForm admin view, member add/edit/delete, enrollment accept/request/cancel, leave, and delete guards through `/api/v1/organizations/**`, `crates/server`, `crates/persistence`, and `frontend`.
- The organization home route now keeps the legacy page/project shell anchors for the visible-project list and roster side pane: `.page-wrap-outer`, `.project-page-wrap`, `.project-home-header`, `.span-left-pane`, `.span-right-pane`, `.project-list-wrap`, and `.bubble-wrap.gray.organization-home`.
- The members view now restores legacy ordering semantics: org admins first, org members second, login-id ascending within each group, and pending enrollment requests in a separate ascending block.
- Direct entry semantics now match legacy intent on the mounted React routes: anonymous viewers redirect to login with return-path, authenticated forbidden viewers receive a forbidden shell, and missing organizations receive a not-found shell.
- Phase 2F restores organization issue listing body parity with visible-project aggregation, core GET filters, state tabs, project selector, sort links, empty state, and pagination.
- Follow-up after this packet: project admin/watchers/webhooks/transfer/change VCS/statistics/delete remain outside the original Wave 2B organization packet and are tracked by their narrower project/VCS provenance files.
