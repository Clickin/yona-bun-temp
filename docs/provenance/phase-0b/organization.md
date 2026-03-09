# Organization Provenance

## Scope

- Organization create
- Organization detail read
- Organization update
- This file does not cover delete, membership management, or pull-request listing.

## Legacy Sources

- `yona-original/test/models/OrganizationTest.java`
- `yona-original/app/controllers/OrganizationApp.java`
- `yona-original/conf/routes`

## Extracted Intent

| Legacy source                            | Intent                                                                                                                                                      | Modern translation                                                          |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `OrganizationTest.create`                | creating an organization also grants the creator the org-admin role; the creator is the sole initial admin                                                  | `packages/domain` create service test + `packages/db` membership write path |
| `OrganizationTest.validateName`          | org names reuse the user login-id pattern and reject malformed values                                                                                       | `packages/contracts` validation test                                        |
| `OrganizationApp.newOrganization`        | create is authenticated and guest-prohibited; duplicate names must reject both existing user login IDs and existing org names                               | `packages/domain` create service + app tRPC mutation test                   |
| `OrganizationApp.organization`           | org detail read is public; missing organization returns not found                                                                                           | app tRPC query + thin route loader                                          |
| `OrganizationApp.settingForm`            | settings page requires update permission                                                                                                                    | thin route auth and authorization gate                                      |
| `OrganizationApp.updateOrganizationInfo` | update requires org-admin or site-admin level authority; duplicate names are rejected; success redirects to the settings path of the current or renamed org | `packages/domain` update service + app tRPC mutation test                   |
| `Organization.updateWith`                | when an org name changes, org-owned projects update their owner string to preserve owner-based project routing                                              | `packages/db` update helper + domain service                                |

## Target Shape In This Batch

- Public identifier: `organizationName`
- Contract owner: `packages/contracts/src/org.ts`
- Domain owner: `packages/domain`
- Persistence owner: `packages/db`
- App adapter owner: `apps/app`

## Intentional Deviations

- Legacy Play routes used `/organizations/:organizationName/settingform` and `/organizations/:organizationName/setting`.
- This batch normalizes the UI path to `/organizations/$organizationName/settings`.
- Transport shape may change from Play form posts and redirects to typed app mutations, but create-as-admin, duplicate detection, rename semantics, and update authorization may not drift.

## Out Of Scope

- Delete organization
- Add, edit, leave, or remove organization members
- Organization pull-request listing
- Logo upload behavior
