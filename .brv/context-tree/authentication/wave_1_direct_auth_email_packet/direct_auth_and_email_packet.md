---
title: Direct Auth and Email Packet
tags: []
keywords: []
importance: 55
recency: 1
maturity: draft
updateCount: 1
createdAt: '2026-04-11T06:17:03.422Z'
updatedAt: '2026-04-11T06:18:51.913Z'
---
## Raw Concept
**Task:**
Document the Wave 1 direct authentication and workspace email packet implemented in yona-rust, covering server routes, persistence helpers, contract tests, frontend shells, and parity audit context.

**Changes:**
- Added Rust server routing for session bootstrap plus direct lost-password, reset-password, workspace email validation send, and confirmation flows with normalized base paths, CSRF handling, and standardized redirects.
- Extended AppRepository persistence helpers to normalize identifiers, manage verification tokens, workspace notifications, profiles, organizations, and project projections that feed workspace overview payloads.
- Captured contract tests that validate capability flags, registration/sign-in journeys, direct reset flows, email validation send/confirm, workspace settings mutations, notification toggles, and default landing normalization.
- Documented frontend AuthWorkspaceShell surfaces and provenance audit linking back to Wave 0 parity baselines.

**Files:**
- yona-rust/crates/server/src/lib.rs
- yona-rust/crates/persistence/src/repo.rs
- yona-rust/crates/server/tests/auth_workspace_contract.rs
- yona-rust/frontend/src/auth-workspace-shell.tsx
- docs/provenance/core-parity-audit.md

**Flow:**
Session bootstrap secures CSRF/session data -> direct lost-password request produces verification redirect -> reset-password validates hash and updates password -> workspace email send/confirm routes validate CSRF/token and refresh sessions -> AuthWorkspaceShell surfaces render legacy links and workspace overview data fed by AppRepository -> Contract tests and parity audit guarantee feature alignment.

**Timestamp:** 2026-04-11

## Narrative
### Structure
The Rust server organizes direct auth flows inside runtime_config-aware router builders that register session bootstrap, lost/reset password, workspace email send, confirm, and RPC routes, while the persistence layer supplies normalized identities, verification management, notification preferences, and workspace overview projections. Frontend AuthWorkspaceShell components drive login/register/lost/reset/forms, workspace overview tabs, and redirect helpers that mirror legacy URLs.

### Dependencies
RuntimeConfig base_path/public_origin, SessionManager, AppRepository-backed repositories, CSRF/session bootstrapping, env-driven YONA_AUTH_* capability flags, bcrypt for password hashing, SeaORM persistence models, and workspace token helpers.

### Highlights
Direct routes enforce token matching and CSRF safeguards, contract tests cover capability toggles plus workspace settings mutations, and the core parity audit documents Wave 0 expectations alongside the current yana-rust implementation.

## Facts
- **auth_routes**: Rust server publishes /api/auth/session plus direct /lostPassword, /resetPassword, /user/email/sendValidationEmail/{email_id}, /user/email/confirm/{email_id}/{token}, and /rpc routes with base_path normalization. [project]
- **email_validation_send**: Workspace email validation send requires an authenticated session, CSRF token, and numeric email_id before repository-side email validation is issued. [project]
- **auth_workspace_shell**: AuthWorkspaceShell renders LoginShell, RegisterShell, LostPasswordShell, ResetPasswordShell, HomeShell, and WorkspaceShell components with CSRF-aware hidden fields and redirects tailored for legacy routes. [project]
- **workspace_contract_tests**: Contract tests exercise capability flag reads, registration/sign-in/sign-out roundtrips, direct lost/reset password flows, workspace email validation paths, workspace settings mutations (profile/email/default landing/notifications), and default landing normalization. [project]
