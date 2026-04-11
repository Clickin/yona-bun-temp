---
title: Wave 1 Auth Workspace Parity
tags: []
related: [authentication/pilot_workspace_minimum/pilot_workspace_minimum.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-11T04:35:00.862Z'
updatedAt: '2026-04-11T04:35:00.862Z'
---
## Raw Concept
**Task:**
Document the Wave 1 `/me` workspace parity implementation that integrates PilotService, persistence helpers, server runtime config, and frontend shells/tests.

**Changes:**
- Extended ReadWorkspaceOverview to include legacy profile card, social providers, member projects, issue/pull streams, and settings links.
- Exposed workspace-preference and management RPCs in PilotService, including default landing path, profile/password/email/token management, and notification toggles.
- Structured persistence utilities to normalize identifiers, manage memberships/projects/enrollments, and surface workspace/profile data for the overview response.
- Aligned frontend auth workspace shells, settings tabs, and project directory UI with legacy action URLs plus parity tests that assert links, empty states, and notification toggles.

**Files:**
- yona-rust/proto/yona/pilot/v1/pilot.proto
- yona-rust/crates/persistence/src/repo.rs
- yona-rust/crates/server/src/lib.rs
- yona-rust/frontend/src/auth-workspace-shell.tsx
- yona-rust/frontend/src/wave1-auth-workspace-parity.spec.tsx

**Flow:**
ReadWorkspaceOverview RPC -> persistence repo assembles profile/membership/issue/pull data -> server runtime config builds ReadWorkspaceOverviewResponse -> frontend WorkspaceShell renders legacy hero + tabs -> WorkspaceSettingsShell performs profile/password/notifications/emails/token flows -> parity tests verify forms, links, and streams.

**Timestamp:** 2026-04-11

**Author:** Wave 1 Auth Workspace Team

## Narrative
### Structure
PilotService gRPC surfaces, persistence repo utilities, server runtime builders, and frontend WorkspaceShell/WorkspaceSettingsShell together deliver the `/me` dashboard, social providers list, project/issue/pull streams, workspace settings, and project directory filters.

### Dependencies
Server runtime config relies on normalized base path to supply API/RPC URLs, PilotBackend repository, `YONA_AUTH_*` env vars for auth UI capabilities, and persistence helpers for workspace/profile/project data.

### Highlights
Forms post to legacy endpoints (`/users/login`, `/user/email`, `/user/resetVisitedList`, `/noti/toggle/...`, `/user/editform/token_reset`), notification toggles default enable (except NEW_COMMENT), and parity verification uses pnpm/cargo commands plus the parity gate.

### Rules
Auth flows require CSRF validation via require_valid_csrf; workspace updates rebuild the overview response after each mutation; password changes validate identifier, old password, new length (>=8), and matching retyped password.

### Examples
Workspace tests assert legacy auth link hrefs, capability-driven form visibility, dashboard streams with issue/pull/project counts linking to `/yona/owner/project/%`, watched notification toggle POST targets, email delete/set-main actions, and token reset form submission.

## Facts
- **wave1_me_dashboard**: Wave 1 `/me` dashboard renders the legacy workspace profile card, social providers, member project list, issue stream, and pull request stream while keeping settings actions under `/user/editform`. [project]
- **pilotservice_rpc_surface**: PilotService exposes authentication/session, workspace preference, organization/project CRUD, and issue management RPCs to support workspace and directory actions. [project]
- **workspace_notifications_and_dashboard_window**: Workspace notifications default to enabled except for NEW_COMMENT, and the overview response sets days_ago to 14 for dashboard data. [project]
- **workspace_state_refresh**: Workspace updates rebuild the ReadWorkspaceOverviewResponse after each mutation to keep favorite/recent/member projects, notifications, emails, API tokens, and issue/pull streams in sync. [project]
