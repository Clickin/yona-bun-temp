# Topic: pilot_workspace_minimum

## Overview
Documents the R0-2 pilot authentication and workspace minimum on the yona-rust stack, detailing the proto surface, server/persistence helpers, and frontend shells that deliver the initial login, register, and workspace experiences.

## Key Concepts
- PilotService RPCs for session/auth/workspace operations
- Session bootstrap & CSRF handling via Axum+Connect
- SeaORM persistence for app_users and default landing preferences
- Connect/Web-based frontend shells for /login, /register, /me
