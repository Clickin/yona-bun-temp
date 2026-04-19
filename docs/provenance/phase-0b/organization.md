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
- Out of scope: organization board/pull-request listing body

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
| `OrganizationTest.validateName`                              | org names reuse user login-id rules and reject malformed values                                                                                     | contract validation in `proto` plus domain validation test                                             |
| `OrganizationApp.orgList` and `organization/list.scala.html` | `/orgs` is public, searchable, paginated, and must stay mounted as a first-class legacy entry surface                                               | `frontend` route shell + `proto` directory query + browser smoke                                       |
| `OrganizationApp.newOrganization`                            | create is authenticated and duplicate names reject existing user/org identifiers                                                                    | `crates/domain` create service + `crates/server` mutation contract test                                |
| `OrganizationApp.organization`                               | org detail read is public; missing organization returns not found                                                                                   | `crates/server` query contract plus `frontend` route test                                              |
| `OrganizationApp.settingForm`                                | settings page requires update permission                                                                                                            | route authorization test in `crates/server` plus `frontend` page guard                                 |
| `OrganizationApp.updateOrganizationInfo`                     | update requires org-admin or site-admin authority; duplicate names reject; success keeps settings path semantics                                    | `crates/domain` update service + `crates/server` mutation contract test                                |
| `Organization.updateWith`                                    | org rename updates org-owned project owner string semantics                                                                                         | `crates/persistence` repository helper + `crates/domain` service test                                  |
| `IssueApp.organizationIssues`                                | org issue list is a visible-project-scoped cross-project inbox, not an organization-owned issue model                                               | `ListOrganizationIssues` contract + organization issue route                                           |
| `organization/group_issue_*` views                           | org issue screen keeps organization shell, quick filters, project selector, state tabs, sort links, cross-project rows, empty state, and pagination | `frontend/src/routes/organizations/$organizationName/issues/route.tsx` and `OrganizationIssueListPage` |

## Intentional Deviations

- Legacy Play routes used `/organizations/:organizationName/settingform` and `/organizations/:organizationName/setting`.
- The current Rust/React canonical path keeps legacy `settingform`, `members`, and `deleteForm` deep links, but the surrounding implementation uses Connect RPC + file routes rather than Play forms and jQuery modals.
- Organization board/pull-request listing bodies remain follow-up gaps even though the deep-link placeholder routes stay mounted.

## Wave 2B Delivery Note

- Wave 2B now covers organization create, public detail read, settings read/update, home CTA matrix, members admin view, deleteForm admin view, member add/edit/delete, enrollment accept/request/cancel, leave, and delete guards in `proto`, `crates/server`, `crates/persistence`, and `frontend`.
- The members view now restores legacy ordering semantics: org admins first, org members second, login-id ascending within each group, and pending enrollment requests in a separate ascending block.
- Direct entry semantics now match legacy intent on the mounted React routes: anonymous viewers redirect to login with return-path, authenticated forbidden viewers receive a forbidden shell, and missing organizations receive a not-found shell.
- Phase 2F restores organization issue listing body parity with visible-project aggregation, core GET filters, state tabs, project selector, sort links, empty state, and pagination.
- Remaining gap after this packet: organization board/pull-request listing body parity still stays deferred, and project admin/watchers/webhooks/transfer/change VCS/statistics/delete remain outside this packet.
