---
title: Wave 0 Workspace Parity Summary
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-11T01:33:19.260Z'
updatedAt: '2026-04-11T01:33:19.260Z'
---
## Raw Concept
**Task:**
Document the Wave 0 workspace parity readiness state for Pilot Wave 1, covering proto responses, repository behaviors, runtime flags, frontend shells, and audit outputs.

**Changes:**
- ReadWorkspaceOverviewResponse now surfaces session details, default landing path, favorite/recent project lists, watched project notifications, workspace emails, and the API token for downstream shells.
- AppRepository extends workspace settings support (org/project CRUD, favorites/recents/watch, emails, API tokens, default landing) and defaults NEW_COMMENT workspace notifications to disabled while exposing helpers used by service DTO construction.
- PilotServiceImpl and server/lib.rs now orchestrate session resolution, workspace settings aggregation, and ReadAuthUiCapabilities-driven UI gating when handling workspace overview/settings RPCs.
- Frontend auth-workspace-shell.tsx recreates legacy /user/editform tabs plus workspace overview sections, watched-project notification tables, secondary email controls, token display, favorites/recent tables, and directory shells that match legacy navigation while parity tests exercise those routes.
- The core parity audit matrix and Wave 0 exit snapshot document capability statuses, required tests, and the approved route/test battery that remains green for this parity stage.

**Files:**
- yona-rust/proto/yona/pilot/v1/pilot.proto
- docs/provenance/core-parity-audit.md
- packages/domain/src/user-workspace-service.ts
- packages/domain/src/default-landing.ts

**Flow:**
Client -> PilotService.ReadWorkspaceOverview RPC -> PilotServiceImpl aggregates AppRepository helpers (favorites, recents, watched notifications, emails, API token, default landing) -> Response hits frontend auth workspace shell and parity routes.

**Timestamp:** 2026-04-11

**Author:** Pilot Parity Team

## Narrative
### Structure
yona-rust PilotService proto now defines ReadWorkspaceOverviewResponse fields that map onto server/lib.rs handlers and the frontend auth workspace shell, preserving legacy /user/editform navigation while the AppRepository DTO helpers feed workspace favorites, recents, default landing path, emails, tokens, and watched-project notification data.

### Dependencies
Depends on AppRepository persistence helpers, ReadAuthUiCapabilities runtime flags (YONA_AUTH_SIGNUP_REQUIRE_CONFIRM, YONA_AUTH_EMAIL_VERIFICATION_ENABLED, YONA_AUTH_SOCIAL_LOGIN_ONLY), the domain/workspace services for favorites/recents/default landing, and route parity tests exercising the Rust frontend route table plus Playwright/Vitest suites.

### Highlights
Core parity audit matrix keeps every legacy capability row live with status/drift/test obligations, and the Wave 0 exit snapshot confirms pnpm/cargo commands plus tests/shell-routing-smoke.e2e.ts remain green while PilotService.ListOrganizations feeds the public org directory.

### Examples
Watched-project notification settings now render tables under /user/editform/notifications, secondary email actions appear under /user/editform/emails, token read-only display lives under /user/editform/token, and favorites/recent project lists reuse legacy container shapes with search filters.

## Facts
- **read_workspace_overview**: ReadWorkspaceOverviewResponse now returns session, default landing path, favorite projects, recent projects, watched project notifications, workspace emails, and the workspace API token. [project]
- **app_repository_workspace_settings**: AppRepository normalizes identities, manages org/project CRUD, favorites, recents, watch lists, workspace emails, API tokens, and default landing path settings while defaulting workspace_notification_enabled_by_default to false for NEW_COMMENT and surfacing helpers like load_workspace_project_lists and load_workspace_settings_data. [project]
- **pilot_service_impl_workspace_overview**: PilotServiceImpl consumes the repository data to build the ReadCurrentSessionResponse plus workspace favorites/recent/project lists, notification preferences, emails, API token, and default landing path while honoring ReadAuthUiCapabilities runtime flags for signup confirmation, email verification, and social-login-only mode. [project]
- **frontend_workspace_shell**: The frontend auth workspace shell renders legacy /user/editform tabs for profile, notifications, emails, API token, and favorites/recent lists alongside directory search filters/pagination, and route parity smoke tests validate the restored landing/navigation surfaces. [project]
- **wave0_exit_snapshot**: Wave 0 exit snapshot reports pnpm check/test/build/test:e2e tests/shell-routing-smoke.e2e.ts and cargo router/db router contract tests passing while PilotService.ListOrganizations powers the Rust public organization directory feed. [project]
