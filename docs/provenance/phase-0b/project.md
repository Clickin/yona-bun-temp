# Project Provenance

## Scope

- Project create
- Project detail read
- Project update
- Project visibility enforcement
- Recent-visit intent capture only

## Legacy Sources

- `yona-original/test/controllers/ProjectAppTest.java`
- `yona-original/test/controllers/EnrollProjectAppTest.java`
- `yona-original/test/models/ProjectTest.java`
- `yona-original/test/models/RecentlyVisitedProjectsTest.java`
- `yona-original/app/controllers/ProjectApp.java`
- `yona-original/conf/routes`

## Extracted Intent

| Legacy source                                         | Intent                                                                                                                                                                                    | Modern translation                                                 |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `ProjectTest.create`                                  | project create persists `name`, `overview`, `projectScope`, `vcs`, and a derived `siteurl`                                                                                                | `packages/db` helper + domain create service                       |
| `ProjectTest.findByNameAndOwner` and `Project.exists` | public routing keys are owner name plus project name                                                                                                                                      | `packages/contracts` identifier DTOs + `packages/db` lookup helper |
| `ProjectTest.projectNameChangeable`                   | rename stays owner-scoped; duplicate project names under the same owner are rejected                                                                                                      | `packages/db` conflict helper + domain update service              |
| `ProjectApp.newProject`                               | create under your own user namespace is allowed; create under an org namespace requires org-admin authority; duplicate owner or name combinations reject; creator becomes project manager | domain create service + app tRPC mutation                          |
| `ProjectApp.project`                                  | detail read is permission filtered and records a recent visit                                                                                                                             | domain detail resolution + thin route loader                       |
| `ProjectApp.projectOverviewUpdate`                    | a manager-level actor can update overview content                                                                                                                                         | domain update service + app tRPC mutation                          |
| `ProjectApp.settingProject`                           | settings update can rename the project slug and keeps update permission narrow                                                                                                            | domain update service + app tRPC mutation                          |
| `ProjectAppTest` search cases                         | public projects remain visible to broad readers; private projects remain hidden from outsiders but visible to authorized actors                                                           | domain read matrix + app tRPC query                                |
| `RecentlyVisitedProjectsTest`                         | recent visits are deduped per user, sorted by latest visit, and isolated across users                                                                                                     | later workspace DB helper and domain slice                         |
| `EnrollProjectAppTest`                                | enrollment request and cancel are separate legacy behaviors and stay out of this batch                                                                                                    | explicit blocker, not implemented here                             |

## Visibility Baseline For This Batch

- `public`: readable by anonymous and authenticated outsiders
- `protected`: readable by project members and organization members; anonymous outsiders denied
- `private`: readable by project members, project managers, organization admins, and site admins; outsiders denied
- Update permission remains narrower than read permission and is reserved for project managers, organization admins on org-owned projects, and site admins

## Route Deviation

- Legacy creation and settings pages used `/projectform`, `/:user/:project/settingform`, and `/:user/:project/setting`.
- This batch intentionally normalizes them to `/projects/new`, `/$owner/$projectName`, and `/$owner/$projectName/settings`.
- The path shape changes; the owner-based routing semantics do not.

## Out Of Scope

- Delete project
- Project transfer between owners
- Enrollment request and cancel
- Workspace default, favorite, and recent landing implementation
- Repository rename and menu-setting side effects beyond the minimal owner and identifier slice
