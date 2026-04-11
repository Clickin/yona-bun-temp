# Topic: wave_1_direct_auth_email_packet

## Overview
Captures the Wave 1 Rust implementation and validation surface for direct lost-password/reset-password and workspace email validation flows along with their frontend and audit context.

## Key Concepts
- Rust server routing for session bootstrap, lost/reset password, workspace email validation, and gRPC services
- AppRepository persistence helpers for user lifecycle, workspace notifications, profiles, and verification records
- Auth workspace contract tests covering capability flags, auth commands, workspace settings changes, and notification handling
- AuthWorkspaceShell frontend components and helpers for login, registration, workspace overview, and CSRF-aware redirects

## Related Topics
- authentication/pilot_workspace_minimum
- authentication/pilot_session_hardening
