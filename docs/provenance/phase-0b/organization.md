# Organization Provenance

## Scope

- Public organization directory route foundation
- Organization create
- Organization detail read
- Organization update
- Out of scope: delete, membership management, pull-request listing

## Legacy Sources

- `yona-original/test/models/OrganizationTest.java`
- `yona-original/app/controllers/OrganizationApp.java`
- `yona-original/conf/routes`

## Current Baseline And Canonical Target

- current mixed-code reference: `reference/mixed-code/frontend/legacy-start/src/lib/organization-trpc.ts`, `reference/mixed-code/packages/domain/*organization*`, `reference/mixed-code/packages/db/*organization*`
- canonical implementation path: `repo root`
- canonical owner path:
  - `frontend`
  - `crates/server`
  - `crates/domain`
  - `crates/persistence`

## Extracted Intent

| Legacy source | Intent | Rust translation target |
| --- | --- | --- |
| `OrganizationTest.create` | creating an organization grants the creator the initial org-admin role | `crates/domain` create service test + `crates/persistence` membership write path |
| `OrganizationTest.validateName` | org names reuse user login-id rules and reject malformed values | contract validation in `proto` plus domain validation test |
| `OrganizationApp.orgList` and `organization/list.scala.html` | `/orgs` is public, searchable, paginated, and must stay mounted as a first-class legacy entry surface | `frontend` route shell + `proto` directory query + browser smoke |
| `OrganizationApp.newOrganization` | create is authenticated and duplicate names reject existing user/org identifiers | `crates/domain` create service + `crates/server` mutation contract test |
| `OrganizationApp.organization` | org detail read is public; missing organization returns not found | `crates/server` query contract plus `frontend` route test |
| `OrganizationApp.settingForm` | settings page requires update permission | route authorization test in `crates/server` plus `frontend` page guard |
| `OrganizationApp.updateOrganizationInfo` | update requires org-admin or site-admin authority; duplicate names reject; success keeps settings path semantics | `crates/domain` update service + `crates/server` mutation contract test |
| `Organization.updateWith` | org rename updates org-owned project owner string semantics | `crates/persistence` repository helper + `crates/domain` service test |

## Intentional Deviations

- Legacy Play routes used `/organizations/:organizationName/settingform` and `/organizations/:organizationName/setting`.
- A Rust/React implementation may normalize the concrete path, but create-as-admin, duplicate detection, rename semantics, and update authorization must not drift.
- `R0-3` only exposes organization member summaries to actors with update authority. Full public member management and org enrollment remain deferred.

## R0-3 Delivery Note

- `R0-3` now covers organization create, public detail read, settings read/update, and read-only member summary in `proto`, `crates/server`, `crates/persistence`, and `frontend`.
- The Wave 0 route-foundation slice also mounts the public `/orgs` directory in `frontend` through file routes under `src/routes/orgs/**` and loads it through additive `PilotService.ListOrganizations`.
- Remaining gap after this packet: org enrollment request/cancel, member add/edit/delete, delete, and org PR listing stay deferred.
