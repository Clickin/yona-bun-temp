# Project Enrollment Domain Design

> Status: `historical`
> This document records a pre-Rust-pivot design discussion. Current canonical implementation work happens in `yona-rust/`; any root mixed-code paths mentioned below are reference-only.

## Scope

- Project self-enrollment request and cancel
- Project and organization member list reads
- Legacy `user_enrolled_project` and `user_enrolled_organization` table shape preservation

## Legacy Provenance

- `yona-original/test/controllers/EnrollProjectAppTest.java`
- `yona-original/app/controllers/EnrollProjectApp.java`
- `yona-original/app/models/User.java`
- `yona-original/app/models/Project.java`
- `yona-original/app/views/project/members.scala.html`
- `yona-original/app/views/organization/members.scala.html`

## Intent

- Project self-enrollment is represented by the presence of a row in `user_enrolled_project`.
- Enroll and cancel are guest-only relative to project membership, not organization membership.
- Duplicate enroll and duplicate cancel are idempotent.
- Missing project is translated as not-found in domain and `NOT_FOUND` at the tRPC boundary.
- Member list reads expose both accepted members and pending enrollment requests.

## Data Model

- Keep `user_enrolled_project` and `user_enrolled_organization` as the canonical pending-request storage.
- Align those join tables with legacy composite uniqueness on `(user_id, project_id)` and `(user_id, organization_id)`.
- Do not introduce a separate enrollment-request entity in this batch.

## Domain Design

- Add `packages/domain/src/enrollment-service.ts` for project enroll and cancel.
- Use `readProjectAuthorization` to resolve the target project and current actor facts.
- Reject anonymous actors with `DomainPermissionError`.
- Reject current project members, project managers, and site admins with `DomainConflictError`.
- Allow organization members and organization admins to self-enroll if they are not already project members, matching legacy `ProjectUser.isGuest` behavior.
- Keep enroll as idempotent create and cancel as idempotent delete.

## Member Lists

- Add organization and project member list DTOs to the resource-scoped contract files.
- Expose `members` and `enrollmentRequests` in one response shape for each resource.
- Guard organization member list read with organization update authority.
- Guard project member list read with project update authority.
- Exclude pending enrollment rows for users who are already accepted members.

## Test Plan

- Add Red domain tests for enroll and cancel outcomes.
- Extend DB helper tests for enrollment create/read/delete and member-directory reads.
- Add contract tests for member-list DTO parsing.
- Add tRPC boundary tests for auth translation, validation, and happy paths.

## Deviation

- Legacy project enroll and cancel return `403 Forbidden` for missing project because the Play action guard resolves project existence before controller logic.
- Modern domain keeps missing project as `DomainNotFoundError`, and the tRPC layer returns `NOT_FOUND`.
# Status: historical
#
# This document records a pre-Rust-pivot design discussion. Current canonical implementation
# work happens in `yona-rust/`; any root mixed-code paths mentioned below are reference-only.
