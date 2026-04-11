---
title: Pilot Session Hardening
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-06T14:08:14.644Z'
updatedAt: '2026-04-06T14:08:14.644Z'
---
## Raw Concept
**Task:**
Describe pilot Connect session hardening around base path routing, anonymous session bootstraps, and CSRF enforcement.

**Changes:**
- Connect handlers now mount under YONA_BASE_PATH + /rpc to align with environment-level base paths.
- Anonymous session bootstrap is served via YONA_BASE_PATH + /api/auth/session and issues yona_session + yona_csrf_token cookies plus X-CSRF-Token.
- Frontend pilot issue mutations fetch the raw session bootstrap before invoking Connect so CSRF tokens remain synced.

**Files:**
- internal/httpapi/connect/pilot.go
- internal/auth/session.go
- apps/app/src/lib/pilot-session.ts

**Flow:**
window config -> fetch BasePath/api/auth/session -> server ensures anonymous session with CSRF header/cookies -> client stores tokens -> subsequent RPC calls under BasePath/rpc supply X-CSRF-Token.

**Timestamp:** 2026-04-06

## Narrative
### Structure
The RuntimeConfig BasePath is normalized, joinBasePath combines it with /api/auth/session and /rpc, a chi router exposes the anonymous session bootstrap endpoint, and Connect handlers produced by pilotv1connect are mounted via http.StripPrefix so they live under BasePath/rpc.

### Dependencies
Depends on internalauth.Manager for the in-memory session store, pilotv1connect for RPC wiring, chi router for HTTP routing, and the frontend runtime config for the BasePath/api base URL.

### Highlights
EnsureAnonymousSession generates CSRF/session tokens, writes both cookies (yona_csrf_token, yona_session) with secure SameSite=Lax, and returns the CSRF token in X-CSRF-Token; ValidateCSRF compares headers against the stored token; readPilotSessionBootstrap fetches /auth/session with same-origin credentials, trusts the response JSON schema, and requires a CSRF token either from the header or payload before returning.

### Rules
Rule 1: Normalize YONA_BASE_PATH to always start with a slash and drop trailing slashes so joinBasePath resolves consistently.
Rule 2: RPC handlers must always be mounted under joinBasePath(basePath, "/rpc") and stripped of that prefix before reaching Connect so base path configuration does not leak into handler routes.

## Facts
- **rpc_mount_path**: Connect handlers mount under the normalized BasePath + /rpc via http.StripPrefix so the pilot Connect router respects YONA_BASE_PATH. [project]
- **session_bootstrap_endpoint**: The anonymous session bootstrap endpoint lives at the normalized BasePath + /api/auth/session. [project]
- **session_cookies**: EnsureAnonymousSession issues yona_session (HttpOnly, 30-day TTL) plus yona_csrf_token cookies and the X-CSRF-Token header when creating a fresh session. [environment]
- **csrf_validation**: ValidateCSRF enforces that the X-CSRF-Token header matches the stored session CSRF token via subtle.ConstantTimeCompare. [project]
- **base_path_normalization**: normalizeBasePath forces a leading slash, strips trailing slashes, and returns "/" when the configured BasePath is empty or root. [convention]
- **frontend_session_bootstrap**: Frontend readPilotSessionBootstrap hits runtimeConfig.apiBaseUrl + /auth/session with same-origin credentials, parses the payload, and requires a CSRF token before returning the session/user payload. [project]
