# Project Provenance

## Scope

- Project create
- Project detail read
- Project update
- Project visibility enforcement
- Project enrollment request/cancel
- Workspace recent and favorite slices
- Workspace default landing remains out of scope

## Legacy Sources

- `yona-original/test/controllers/ProjectAppTest.java`
- `yona-original/test/controllers/EnrollProjectAppTest.java`
- `yona-original/test/models/ProjectTest.java`
- `yona-original/test/models/RecentlyVisitedProjectsTest.java`
- `yona-original/test/controllers/WatchProjectAppTest.java`
- `yona-original/app/controllers/ProjectApp.java`
- `yona-original/conf/routes`

## Extracted Intent

| Legacy source                                           | Intent                                                                                                                                                                                    | Modern translation                                                                                                                                              |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ProjectTest.create`                                    | project create persists `name`, `overview`, `projectScope`, `vcs`, and a derived `siteurl`                                                                                                | `packages/db` helper + domain create service                                                                                                                    |
| `ProjectTest.findByNameAndOwner` and `Project.exists`   | public routing keys are owner name plus project name                                                                                                                                      | `packages/contracts` identifier DTOs + `packages/db` lookup helper                                                                                              |
| `ProjectTest.projectNameChangeable`                     | rename stays owner-scoped; duplicate project names under the same owner are rejected                                                                                                      | `packages/db` conflict helper + domain update service                                                                                                           |
| `ProjectApp.newProject`                                 | create under your own user namespace is allowed; create under an org namespace requires org-admin authority; duplicate owner or name combinations reject; creator becomes project manager | domain create service + app tRPC mutation                                                                                                                       |
| `ProjectApp.project`                                    | detail read is permission filtered and records a recent visit                                                                                                                             | domain detail resolution + thin route loader                                                                                                                    |
| `ProjectApp.projectOverviewUpdate`                      | a manager-level actor can update overview content                                                                                                                                         | domain update service + app tRPC mutation                                                                                                                       |
| `ProjectApp.settingProject`                             | settings update can rename the project slug and keeps update permission narrow                                                                                                            | domain update service + app tRPC mutation                                                                                                                       |
| `ProjectAppTest` search cases                           | public projects remain visible to broad readers; private projects remain hidden from outsiders but visible to authorized actors                                                           | domain read matrix + app tRPC query                                                                                                                             |
| `EnrollProjectAppTest`                                  | enrollment request and cancel stay guest-only, return not-found for missing projects, and stay idempotent                                                                                 | `packages/domain/src/enrollment-service.ts`, `packages/domain/src/enrollment-service.spec.ts`, `apps/app/src/lib/enrollment-trpc.spec.ts`                       |
| `RecentlyVisitedProjectsTest` and `WatchProjectAppTest` | recent visits are deduped per user, sorted by latest visit, and favorite toggles remain personal workspace behavior                                                                       | `packages/domain/src/user-workspace-service.ts`, `packages/db/src/personal-workspace.spec.ts`, `apps/app/src/lib/me-trpc.spec.ts`, `apps/app/src/routes/me.tsx` |

## Current Reconciliation

- Historical blocker wording became stale after the project enrollment and personal workspace slices landed in the repo.
- Project enrollment is implemented and evidenced by `packages/domain/src/enrollment-service.ts`, `packages/domain/src/enrollment-service.spec.ts`, and `apps/app/src/lib/enrollment-trpc.spec.ts`.
- Workspace favorite/recent is implemented and evidenced by `packages/domain/src/user-workspace-service.ts`, `packages/db/src/personal-workspace.spec.ts`, `apps/app/src/lib/me-trpc.spec.ts`, and `apps/app/src/routes/me.tsx`.
- This reconciliation does not claim full Phase 0B exit. Organization enrollment and workspace default landing remain the true blockers in this project-slice view; the bounded PR and bounded search exemplars are already landed separately under their own provenance docs and are not open blockers here.

## Visibility Baseline For This Batch

- `public`: readable by anonymous and authenticated outsiders
- `protected`: readable by project members and organization members, anonymous outsiders denied
- `private`: readable by project members, project managers, organization admins, and site admins, outsiders denied
- Update permission remains narrower than read permission and is reserved for project managers, organization admins on org-owned projects, and site admins

## Route Deviation

- Legacy creation and settings pages used `/projectform`, `/:user/:project/settingform`, and `/:user/:project/setting`.
- This batch intentionally normalizes them to `/projects/new`, `/$owner/$projectName`, and `/$owner/$projectName/settings`.
- The path shape changes, but the owner-based routing semantics do not.

## Out Of Scope

- Delete project
- Project transfer between owners
- Organization enrollment request/cancel
- Workspace default landing page implementation
- Repository rename and menu-setting side effects beyond the minimal owner and identifier slice
