# Topic: pilot_auth_workspace_minimum

## Overview
Describes the R0-2 pilot authentication and workspace baseline built for the Yona Rust pilot, covering the protobuf RPC surface, server session helpers, persistence, and frontend client/shell wiring.

## Key Concepts
- PilotService RPC surface for session/auth/workspace operations
- Session bootstrap and CSRF payload delivery
- SeaORM-backed persistence for app_users and default landing preferences
- Connect-web + buf-generated TypeScript client shells for /login, /register, /me
