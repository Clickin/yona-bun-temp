---
title: Pilot R0-3 Baseline Features
tags: []
related: [release/pilot_rust_baseline/pilot_rust_baseline.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-07T14:16:15.429Z'
updatedAt: '2026-04-07T14:16:15.429Z'
---
## Raw Concept
**Task:**
Document the R0-3 yona-rust pilot service baseline that delivers org/project RPCs, storage helpers, and frontend workspace shells before later waves.

**Changes:**
- Defined the PilotService proto surface for sessions, organizations, projects, enrollments, favorites, recent visits, and issue updates.
- Implemented server helpers in crates/server/src/lib.rs for session bootstrap, CSRF validation, workspace list loading, and organization/project authorization.
- Wired frontend yona-rust/frontend/src/App.tsx to fetch session/workspace data, handle WorkspaceShell callbacks, and coordinate navigation + workspace refresh after auth or enrollment changes.

**Files:**
- yona-rust/proto/yona/pilot/v1/pilot.proto
- yona-rust/crates/server/src/lib.rs
- yona-rust/frontend/src/App.tsx

**Flow:**
App bootstrap fetches session/CSRF/workspace overview -> route-specific loaders call PilotService RPCs -> server validates sessions, applies persistence helpers, and returns normalized responses -> frontend updates workspace state, favorites, and navigation via AuthWorkspaceShell callbacks.

**Timestamp:** 2026-04-07

**Author:** ByteRover context engineer

## Narrative
### Structure
The proto file enumerates the PilotService RPCs, the server module splits concerns across PilotServiceImpl, backend management, and helper functions, and App.tsx orchestrates workspace state, route data loading, and callback wiring for AuthWorkspaceShell.

### Dependencies
Server handlers rely on Axum, Connect, bcrypt, Buffa, runtime config normalizers, session manager helpers, PilotRepository persistence, and authorization utilities, while the frontend depends on the runtime config types, generated Pilot API client, and AuthWorkspaceShell view models.

### Highlights
R0-3 links favorites and recent projects, enforces CSRF-protected mutators, handles org/project CRUD with viewer permissions, delivers workspace overview refreshes, and keeps the frontend shell responsive to enrollments, favorites, default path updates, and navigation decisions.

## Facts
- **pilot_rpc_surface**: PilotService now exposes RPCs for ReadCurrentSession, ReadAuthUiCapabilities, auth mutations, workspace overview, organization/project CRUD, enrollment, favorites, recent visits, and issue state updates as part of the R0-3 baseline. [project]
- **frontend_app_workflow**: App.tsx bootstraps by fetching session/CSRF tokens and workspace overview, then routes load organization or project data while AuthWorkspaceShell callbacks refresh workspace state after enrollments, favorites, registrations, and sign-in/out events. [project]
