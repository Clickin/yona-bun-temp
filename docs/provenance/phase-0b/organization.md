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

- current mixed-code reference: `frontend/legacy-start/src/lib/organization-trpc.ts`, `packages/domain/*organization*`, `packages/db/*organization*`
- canonical implementation path: `yona-rust/`
- canonical owner path:
  - `yona-rust/frontend`
  - `yona-rust/crates/server`
  - `yona-rust/crates/domain`
  - `yona-rust/crates/persistence`

## Extracted Intent

| Legacy source | Intent | Rust translation target |
| --- | --- | --- |
| `OrganizationTest.create` | creating an organization grants the creator the initial org-admin role | `yona-rust/crates/domain` create service test + `yona-rust/crates/persistence` membership write path |
| `OrganizationTest.validateName` | org names reuse user login-id rules and reject malformed values | contract validation in `yona-rust/proto` plus domain validation test |
| `OrganizationApp.orgList` and `organization/list.scala.html` | `/orgs` is public, searchable, paginated, and must stay mounted as a first-class legacy entry surface | `yona-rust/frontend` route shell + `yona-rust/proto` directory query + browser smoke |
| `OrganizationApp.newOrganization` | create is authenticated and duplicate names reject existing user/org identifiers | `yona-rust/crates/domain` create service + `yona-rust/crates/server` mutation contract test |
| `OrganizationApp.organization` | org detail read is public; missing organization returns not found | `yona-rust/crates/server` query contract plus `yona-rust/frontend` route test |
| `OrganizationApp.settingForm` | settings page requires update permission | route authorization test in `yona-rust/crates/server` plus `yona-rust/frontend` page guard |
| `OrganizationApp.updateOrganizationInfo` | update requires org-admin or site-admin authority; duplicate names reject; success keeps settings path semantics | `yona-rust/crates/domain` update service + `yona-rust/crates/server` mutation contract test |
| `Organization.updateWith` | org rename updates org-owned project owner string semantics | `yona-rust/crates/persistence` repository helper + `yona-rust/crates/domain` service test |

## Intentional Deviations

- Legacy Play routes used `/organizations/:organizationName/settingform` and `/organizations/:organizationName/setting`.
- A Rust/React implementation may normalize the concrete path, but create-as-admin, duplicate detection, rename semantics, and update authorization must not drift.
- `R0-3` only exposes organization member summaries to actors with update authority. Full public member management and org enrollment remain deferred.

## R0-3 Delivery Note

- `R0-3` now covers organization create, public detail read, settings read/update, and read-only member summary in `yona-rust/proto`, `yona-rust/crates/server`, `yona-rust/crates/persistence`, and `yona-rust/frontend`.
- The Wave 0 route-foundation slice also mounts the public `/orgs` directory in `yona-rust/frontend` and loads it through additive `PilotService.ListOrganizations`.
- Remaining gap after this packet: org enrollment request/cancel, member add/edit/delete, delete, and org PR listing stay deferred.
