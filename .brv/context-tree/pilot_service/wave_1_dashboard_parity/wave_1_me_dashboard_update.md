---
title: Wave 1 Me Dashboard Update
tags: []
related: [pilot_service/wave_1_workspace_parity/wave_1_workspace_parity.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-11T04:39:15.153Z'
updatedAt: '2026-04-11T04:39:15.153Z'
---
## Raw Concept
**Task:**
Document Wave 1 /me dashboard parity updates across the PilotService gRPC surface, server runtime, persistence helpers, frontend shells, and provenance audit baseline.

**Changes:**
- ReadWorkspaceOverview now emits legacy profile data, social providers, project/issue/PR streams, and a daysAgo window for the dashboard.
- Rust frontend workspace shell renders open/closed issue buckets, PR stream, member project stream, notification toggles, and preserves existing settings mutations while leaving email validation and avatar upload flows unresolved.
- PilotService gRPC API continues to expose session/auth/workspace/favorites/enrollment/issue/notification RPCs with payloads such as ReadCurrentSessionResponse and ReadWorkspaceOverviewResponse carrying profile, projects, emails, and notification preferences.
- Server runtime routers and session helpers normalize base paths, enforce CSRF/session requirements, and rely on workspace helpers plus WORKSPACE_DAYS_AGO = 14 when assembling responses.
- Persistence repository utilities handle identity normalization, workspace notification defaults, random tokens, and workspace-specific queries for favorites, recent projects, issues, PRs, and notification types.
- Frontend auth/workspace shells (login, register, workspace, settings, project directory) wire view models, href builders, pagination, and workspace state rendering.
- Provenance audit documents the parity baseline, drift vocabulary, owner mappings, and Wave 0 exit checklist to benchmark future UI/UX parity work.

**Files:**
- yona-rust/proto/yona/pilot/v1/pilot.proto
- yona-rust/crates/server/src/lib.rs
- yona-rust/crates/persistence/src/repo.rs
- yona-rust/frontend/src/auth-workspace-shell.tsx
- docs/provenance/core-parity-audit.md

**Flow:**
Dashboard payload updates -> gRPC/PilotService surface -> runtime helpers/session bootstrapping -> persistence queries/constants -> frontend shell rendering -> provenance audit validation

**Timestamp:** 2026-04-11

## Narrative
### Structure
The Wave 1 /me dashboard surfaces a legacy-style profile card plus open/closed issue buckets, PR and member project streams, and notification/settings tabs that reuse the existing mutations. gRPC payloads (ReadCurrentSessionResponse, ReadWorkspaceOverviewResponse) describe actors, emails, projects, emails, API tokens, notification preferences, and workspace-specific entities such as WorkspaceProfile and WorkspaceNotificationPreference.

### Dependencies
Server runtime routers require normalized base paths, CSRF/session guards, and repository-backed PilotService implementations. Workspace helpers rely on persistence utilities for favorite/recent/project enumeration and reference constants like WORKSPACE_DAYS_AGO = 14. fixed_auth_ui_capabilities and confirmation_session_required derive from YONA_AUTH_* environment flags to gate email confirmation flows.

### Highlights
PilotService retains a comprehensive RPC surface covering workspace, favorites, enrollment, issue, and notification flows while rebuilding workspace overviews whenever users mutate auth/profile data. Persistence helpers supply identity normalization, email heuristics, notification defaults, and workspace queries that feed the dashboard. Frontend auth/workspace shells include login, register, workspace overview, workspace settings, and project directory components wired with pagination, href builders, and notification toggles. The provenance audit locks a Wave 0 parity baseline with statuses (parity, semantic-drift, missing, deferred-2nd-priority) and an exit checklist that tracks runtime/router readiness, test suites, and directory feeds.

### Examples
Workspace shell renders tabs for issues, PRs, favorite/recent projects, default landing path, and sign-out, while settings shell exposes profile, password, notification, emails, and API token sections wired to /user/* endpoints. ProjectDirectoryShell uses a 10-item page size, search filter, and breadcrumbs linking /projects and /orgs to mirror legacy navigation.

## Facts
- **workspace_overview_payload**: ReadWorkspaceOverview now returns legacy-shaped profile fields, connected social providers, issue/PR/project streams, and daysAgo metadata. [project]
- **pilot_service_rpc_surface**: PilotService exposes session, auth, workspace, organization, project, favorites, enrollment, issue, and notification RPCs from pilot.proto. [project]
- **workspace_days_ago_window**: Server runtime builds workspace overviews with WORKSPACE_DAYS_AGO set to 14. [environment]
- **workspace_overview_rebuild**: PilotService endpoints rebuild the workspace overview response after mutations such as sign_in_with_password, update_profile, and workspace email changes. [project]
- **auth_ui_capabilities_flags**: fixed_auth_ui_capabilities reads YONA_AUTH_* environment variables and confirmation_session_required toggles whether email confirmation flows are required. [environment]
- **wave_0_parity_audit**: docs/provenance/core-parity-audit.md freezes the Wave 0 parity baseline and records statuses parity, semantic-drift, missing, and deferred-2nd-priority per capability. [project]
