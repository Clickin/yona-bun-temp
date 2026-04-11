---
title: Wave 1 Workspace Parity Overview
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-11T04:38:42.927Z'
updatedAt: '2026-04-11T04:38:42.927Z'
---
## Raw Concept
**Task:**
Document Wave 1 /me dashboard parity updates spanning PilotService APIs, runtime persistence helpers, auth workspace shells, and the provenance audit snapshot.

**Changes:**
- ReadWorkspaceOverview now delivers legacy profile, provider, stream, and daysAgo metadata to the Rust workspace dashboard.
- PilotService exposes the session, auth, workspace, organization, project, etc. RPCs with CSRF/session guards, bcrypt password handling, and workspace overview refresh after mutations.
- Persistence repository utilities supply normalized identity helpers, workspace notifications defaults, and workspace-specific queries for favorites, recent projects, profile, and issue/PR streams.
- Frontend view models include helper href builders, pagination utilities, and shells for login, register, workspace, settings, and project directory experiences.
- Provenance audit preserves the Wave 0 parity baseline, owner mapping, drift vocabulary, audit matrix, and exit checklist for Rust migration verification.

**Files:**
- yona-rust/proto/yona/pilot/v1/pilot.proto
- yona-rust/crates/server/src/lib.rs
- yona-rust/crates/persistence/src/repo.rs
- yona-rust/frontend/src/auth-workspace-shell.tsx
- docs/provenance/core-parity-audit.md

**Flow:**
Legacy workspace data flows through PilotService RPCs -> server runtime helpers -> persistence adapters -> frontend workspace shells, with provenance audit confirming parity checkpoints.

**Timestamp:** 2026-04-11

**Author:** ByteRover context engineer

## Narrative
### Structure
PilotService exposes ReadWorkspaceOverview, enrollment, favorites, notifications, and project/organization RPCs, while the server runtime bootstraps sessions, resolves CSRF, and maps persistence rows to proto responses before invoking the frontend shells.

### Dependencies
Server runtime depends on normalized base paths, repository backends for auth, bcrypt for password hashing, CSRF/session helpers, WORKSPACE_DAYS_AGO = 14 for dashboard range, and the persistence repo for favorites/recent queries; frontend shells rely on auth/workspace view models, helper href builders, and workspace notification toggles.

### Highlights
WorkspaceShell renders open/closed issue buckets, PR stream, member/favorite/recent project streams, settings tabs (profile, password, notifications, emails, token), and respects env-toggled capabilities; provenance audit documents status/drift/owners for every legacy capability and validates Wave 0 exit criteria.

## Facts
- **workspace_overview**: ReadWorkspaceOverview now returns legacy-shaped profile fields, connected social providers, issue/PR/project streams, and daysAgo metadata for the dashboard. [project]
- **pilot_service_rpc**: PilotService RPCs cover session/auth/workspace/org/project/favorites/enrollment/issues/notifications and rebuild the workspace overview response after each mutation while enforcing CSRF, normalized identifiers, and bcrypt-protected credentials. [project]
- **workspace_notifications**: Persistence helpers deliver workspace profile data (connected social providers, admin/blocked flags, labels), favorite/recent project lists, sorted member projects, issue/PR summaries, and define WORKSPACE_NOTIFICATION_TYPES that default all but NEW_COMMENT on. [project]
- **frontend_shells**: Frontend view models and the auth/workspace shells drive login/register/home/lost/reset flows plus the workspace dashboard with issues/PRs/projects tabs, workspace settings sections, and project directory search/pagination experiences. [project]
