---
title: Wave 1 Workspace Parity
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-11T01:30:07.690Z'
updatedAt: '2026-04-11T01:30:07.690Z'
---
## Raw Concept
**Task:**
Capture the Wave 1 PilotService workspace parity implementation across proto, persistence, server, frontend, and provenance audit artifacts.

**Changes:**
- Extended ReadWorkspaceOverviewResponse to return session, default landing path, favorites/recent projects, watched projects, emails, and API token fields.
- Persisted workspace notifications, emails, favorites, recents, landing path, and API tokens with helper authorization metadata.
- Server endpoints load workspace project lists/settings and honor new auth capability flags while exposing workspace overview and default landing path updates.
- Frontend auth/workspace shells render legacy profile, notification, email, and token sections backed by the new data surfaces.
- Provenance audit freezes Wave 0 parity baseline and maps legacy UX/route behavior to canonical Rust implementations.

**Files:**
- yona-rust/proto/yona/pilot/v1/pilot.proto
- yona-rust/crates/persistence/src/repo.rs
- yona-rust/crates/server/src/lib.rs
- yona-rust/frontend/src/auth-workspace-shell.tsx
- docs/provenance/core-parity-audit.md

**Flow:**
ReadWorkspaceOverview request -> persistence aggregates favorites, recents, notifications, emails, landing path, API token -> server loads project lists/settings and responds with enriched payload -> frontend workspace shells honor the new fields while reusing legacy UI surfaces -> provenance audit captures parity status.

**Timestamp:** 2026-04-11

**Author:** Yona Rust team

## Narrative
### Structure
The PilotService proto defines RPCs that back workspace overview and CRUD flows plus the new workspace notification, email, and API token messages, while the persistence repo maintains per-user favorites, recent projects, watched notifications, landing path, emails, and API tokens along with authorization helpers.

### Dependencies
Server routing and session bootstrap depend on CSRF/cookie injection, env flags (YONA_AUTH_*), and persistence helpers to gather favorites, recents, emails, watched projects, and API tokens before handing them to the workspace overview and settings endpoints.

### Highlights
Workspace overview and settings now return the expanded payload that feeds legacy workspace/profile/notification/email/token shells and the workspace settings shell (profile, password, notifications, emails, token sections), and the provenance audit ensures parity mappings to legacy routes and UX.

### Examples
WorkspaceSettingsShell renders notification toggles, email actions, and API token recreation controls while listing favorites, recents, and watched notifications supplied by the enriched ReadWorkspaceOverviewResponse.

## Facts
- **workspace_overview_extensions**: Wave 1 extends ReadWorkspaceOverview with watched project notifications, workspace emails, and API tokens coming from persistence. [project]
- **new_comment_notification_default**: The persistence layer normalizes identifiers and keeps NEW_COMMENT notifications disabled by default unless overrides exist. [convention]
- **workspace_settings_data_load**: Workspace settings load favorites, recents, emails, watched projects, and the API token before rendering the settings shell. [project]
