---
title: Go Connect Pilot Hardening
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-06T14:09:03.670Z'
updatedAt: '2026-04-06T14:09:03.670Z'
---
## Raw Concept
**Task:**
Describe the Go+Connect pilot hardening that aligns RPC endpoints with YONA_BASE_PATH, issues anonymous session cookies + CSRF headers, and ensures the frontend obtains a valid token before calling Connect.

**Changes:**
- Connect service handler mounts under YONA_BASE_PATH + /rpc instead of a hardcoded path to work inside the pilot route tree.
- Anonymous session bootstrap now lives at YONA_BASE_PATH + /api/auth/session and emits yona_session/yona_csrf_token cookies along with an X-CSRF-Token header.
- Frontend pilot issue mutation calls readPilotSessionBootstrap to fetch CSRF tokens instead of relying on the legacy pilot-csrf value before invoking Connect RPCs.

**Files:**
- internal/httpapi/connect/pilot.go
- internal/auth/session.go
- apps/app/src/lib/pilot-session.ts

**Flow:**
Normalize runtime BasePath -> mount /rpc Connect service handler + /api/auth/session bootstrap endpoint -> Ensure anonymous session creation writes cookies/CSRF token -> Frontend reads /auth/session via runtime config, validates CSRF, then invokes Connect RPCs with the token.

**Timestamp:** 2026-04-06

**Author:** Pilot Go+Connect team

## Narrative
### Structure
NewRouter normalizes the incoming RuntimeConfig.BasePath, registers the Connect PilotService handler on /rpc, and exposes /api/auth/session to seed anonymous sessions. The handler returns an empty session/user payload but still writes yena session cookies and the CSRF token header so the browser always receives the tokens it needs.

### Dependencies
Relies on internalauth.Manager for session storage/validation, Connect interceptors that read sessions from context, and sessionRoutePayloadSchema on the frontend to validate the bootstrap response.

### Highlights
With this hardening the pilot surface no longer hardcodes CSRF values, the RPC and bootstrap endpoints align with YONA_BASE_PATH, and every pilot issue mutation fetches a fresh CSRF token before sending the mutation over Connect.

## Facts
- **pilot_rpc_mount**: Pilot Connect RPC handlers mount under YONA_BASE_PATH + /rpc to keep the browser-safe route tree aligned with service endpoints. [project]
- **pilot_session_bootstrap**: Anonymous session bootstrap at YONA_BASE_PATH + /api/auth/session issues the yona_session and yona_csrf_token cookies plus an X-CSRF-Token header while returning an empty session/user payload. [project]
- **pilot_frontend_bootstrap**: readPilotSessionBootstrap fetches /auth/session, enforces a CSRF token from headers or payload, and throws if the token is missing before allowing pilot issue mutations. [project]
