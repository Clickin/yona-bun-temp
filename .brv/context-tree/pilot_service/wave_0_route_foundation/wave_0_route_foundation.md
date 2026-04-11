---
title: Wave 0 Route Foundation
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-10T13:28:33.443Z'
updatedAt: '2026-04-10T13:28:33.443Z'
---
## Raw Concept
**Task:**
Document Wave 0 route foundation and server handling for auth, directories, and PilotService RPCs in yona-rust.

**Changes:**
- Introduced canonical route table utilities, reserved prefixes, and project route matching to reprise legacy home/auth/public directories through canonical handlers.
- Auth workspace shell now renders every workspace-related view (login, register, directory, settings, placeholders) with helpers for redirects and pagination.
- PilotService RPC surface enumerates session/auth, workspace overview, default landing path, organization/project CRUD and membership controls, issue operations, and list responses backed by persistence.
- Server router assembles Axum routes, session bootstrap, ConnectRPC PilotService, and asset handlers that adapt to filesystem/embedded/none modes while mounting base path-aware index fallbacks.
- Persistence repository layering centralizes normalization, authorization helpers, membership/enrollment/favorite tracking, and converters for AppUser, Organization, Project, and Issue records.

**Files:**
- yona-rust/frontend/src/route-table.ts
- yona-rust/frontend/src/auth-workspace-shell.tsx
- yona-rust/proto/yona/pilot/v1/pilot.proto
- yona-rust/crates/server/src/lib.rs
- yona-rust/crates/persistence/src/repo.rs

**Flow:**
Canonical routing tables resolve legacy paths -> Auth workspace shell renders route-specific UI + helpers -> PilotService RPC handles auth/workspace/org/project/issue/list operations -> Server router wires Axum routes and session handling -> Persistence repo normalizes identities and maintains project/org lifecycle data.

**Timestamp:** 2026-04-10

## Narrative
### Structure
Wave 0 routing sits in frontend/route-table.ts with AppRoute enums, reserved prefixes, utilities for segment parsing, canonical href building, and matchProjectRoute for project subpaths; Frontend routes including auth and directories use AuthWorkspaceShell which switches on route kind to render dedicated shells backed by redirect logic, pagination helpers, and CSRF-aware settings forms.

### Dependencies
Depends on PilotService gRPC proto definitions, Axum ConnectRPC wiring, BrowserRuntimeConfig serialization, session bootstrap helpers, and persistence repositories for users, organizations, projects, favorites, and enrollments.

### Highlights
Legacy home/auth/public directory, search, site-admin, and deep project routes all map through a shared canonical table; Auth workspace shell exposes registration, workspace overview, directory browsing, creation forms, and fallback placeholders; Server router attaches CSRF/session headers, asset modes, and base path-aware index fallbacks; Persistence AppRepository normalizes identifiers, enforces authorization scopes, and refreshes cached favorite/recent metadata.

## Facts
- **route_resolution**: Wave 0 routes legacy home/auth/public/sc Key project paths through a canonical route table before handing non-reserved two-segment paths to Project resolution. [project]
- **auth_workspace_shell**: Auth workspace shell exposes distinct shells for login, register, home, lost/reset password, workspace overview, project and organization directories, detail, settings, and placeholders for deeper routes. [project]
- **pilot_service_rpc_surface**: PilotService gRPC surface offers session/auth management, workspace overview, organization/project CRUD, issue read/update, list organizations/projects, and enrollment/favorite toggles. [project]
- **server_router**: Server router built with Axum composes API/session bootstrap, ConnectRPC PilotService, and asset handlers that respect base path mounting plus browser runtime config serialization. [project]
- **persistence_repository**: AppRepository wraps SeaORM connection with normalization helpers, project/org lifecycle management, membership/favorites tracking, default landing persistence, and converters into domain records. [project]
