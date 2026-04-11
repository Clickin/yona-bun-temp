---
title: Pilot Auth Workspace Minimum
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-07T13:08:08.772Z'
updatedAt: '2026-04-07T13:08:08.772Z'
---
## Raw Concept
**Task:**
Capture the pilot auth/workspace minimum delivered for the Yona Rust pilot, including RPC contracts, server flow helpers, persistence, and frontend shells.

**Changes:**
- Defined the pilot auth/workspace protobuf surface and related helper RPCs plus static fallbacks for ListProjects and issue reads/updates.
- Implemented server routing, session bootstrapping, persistence repos, and PilotService handlers that enforce CSRF/session requirements and default landing persistence.
- Added frontend auth workspace client utilities and /login, /register, /me shells powered by connect-web and buf-generated TypeScript clients.

**Files:**
- proto/yona/pilot/v1/pilot.proto

**Flow:**
Runtime config -> session bootstrap payload -> PilotService RPCs (session/capabilities, sign-in/register/sign-out, workspace overview, default landing) -> persistence updates and default landing normalization -> frontend shells that drive /login, /register, /me experiences with CSRF headers

**Timestamp:** 2026-04-07

## Narrative
### Structure
Server-side, crates/server/src/lib.rs wires up Axum, Connect, runtime config, session management, and asset serving, while BrowserRuntimeConfig data is injected into index HTML. PilotServiceImpl implements the auth/workspace RPC surface and relies on helper methods to bootstrap sessions, normalize identifiers, verify passwords, attach CSRF headers, and wrap responses with default landing data. Frontend components and the auth workspace client mirror that flow, resolving the current path, fetching bootstrap payloads, and rendering the login, register, or workspace shells with runtime config-aware redirects.

### Dependencies
Implementation depends on Axum for routing, Connect and connect-web for RPC transport, bcrypt for password hashing, SeaORM repositories for persistence (app_users/default_landing_preferences/projects/issues), Buf-generated TypeScript schemas, and runtime config normalization helpers for API/RPC base paths.

### Highlights
The payload at /api/auth/session delivers CSRF tokens and persisted session cookies so PilotService RPCs always include valid headers. Default landing paths are normalized and stored per user by the persistence layer before being surfaced in ReadCurrentSession and ReadWorkspaceOverview responses. Login, register, and workspace shells all reuse the same connect-web client configuration and expose runtime-config-driven post-auth redirects.

## Facts
- **pilot_service_rpcs**: PilotService exposes the RPCs ReadCurrentSession, ReadAuthUiCapabilities, SignInWithPassword, RegisterWithPassword, SignOut, ReadWorkspaceOverview, SetDefaultLandingPath, ListProjects, ReadIssueDetail, and UpdateIssueState for the auth/workspace experience. [project]
- **session_bootstrap_route**: The session bootstrap endpoint at /api/auth/session attaches a CSRF token, session cookies, and runtime config before the client requests the PilotService surface. [environment]
- **persistence_tables**: SeaORM-backed tables app_users and default_landing_preferences store user credentials, confirmation/admin flags, and each user’s saved landing path. [project]
- **frontend_auth_shells**: Frontend auth workspace shells for /login, /register, /me use connect-web plus buf-generated TypeScript clients to call the PilotService RPCs with CSRF headers. [project]
