---
children_hash: 4999ec33a19da7a17bf9c9d420093443914f252e64e3354ebb2284f25947cb6d
compression_ratio: 0.6727664155005382
condensation_order: 1
covers: [context.md, pilot_workspace_minimum.md]
covers_token_total: 929
summary_level: d1
token_count: 625
type: summary
---
# pilot_workspace_minimum Structural Summary

## Overview
- Captures the R0-2 pilot authentication/workspace minimum built on the yona-rust stack, covering proto surface, server helpers, persistence, and frontend shells that deliver the initial login, register, and workspace experiences.

## Key Architectural Layers
- **Proto & RPC Surface (_pilot_workspace_minimum.md_)**
  - `proto/yona/pilot/v1/pilot.proto` defines `PilotService` with RPCs for session/auth/workspace flows (ReadCurrentSession, ReadAuthUiCapabilities, SignInWithPassword, RegisterWithPassword, SignOut, ReadWorkspaceOverview, SetDefaultLandingPath, ListProjects, ReadIssueDetail, UpdateIssueState).
- **Server Runtime (_context.md_ & _pilot_workspace_minimum.md_)**
  - Axum router composes `BrowserRuntimeConfig` (injecting `rpcBaseUrl` into `index.html`) and a Connect router that routes to `PilotServiceImpl`.
  - Server helpers bootstrap sessions at `/api/auth/session` (CSRF + cookies), validate identifiers, hash passwords via bcrypt, normalize default landing paths, and persist defaults.
- **Persistence Layer (_pilot_workspace_minimum.md_)**
  - SeaORM models cover `projects`, `issues`, `app_users`, and `default_landing_preferences` with repositories supporting authentication, issue reads/updates, and landing preference storage.
- **Frontend Shells (_context.md_ & _pilot_workspace_minimum.md_)**
  - Connect-web shells for `/login`, `/register`, and `/me` call PilotService RPCs through buf-generated TypeScript clients, supplying CSRF-aware headers.
  - Workspace shell surfaces default landing, favorites, and recent projects while reusing backend RPC signatures for runtime consistency.

## Key Dependencies & Patterns
- Axum + Connect stack exposes RPCs and CSRF-aware session bootstrapping.
- SeaORM repositories relay persistence requirements.
- sanitize/normalize helpers ensure default landing paths are validated before `SetDefaultLandingPath`.
- Frontend shells on `/login`, `/register`, `/me` rely on connect-web clients and injected runtime config to reach backend RPCs.

## Highlights & Relations
- Session bootstrap handled via `/api/auth/session`.
- Registration enforces identifier normalization and hashed passwords before issuing authenticated sessions.
- Default landing persistence occurs through normalized values and dedicated RPC, ensuring safe defaults before storage.
- Frontend shells reuse connect-web payloads to maintain parity with backend RPC signatures, keeping the stack cohesive.