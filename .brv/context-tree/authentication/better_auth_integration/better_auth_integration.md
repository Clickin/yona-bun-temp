---
title: Better Auth Integration
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-05T10:33:40.114Z'
updatedAt: '2026-04-05T10:33:40.114Z'
---
## Raw Concept
**Task:**
Document the Better Auth integration policies, TRPC procedures, UI flow helpers, login route behaviors, and backend configuration.

**Changes:**
- Scoped email verification results to the Better Auth callback /login?verify=complete with deterministic alert precedence.
- Restricted the public auth proxy to three specific social and verification endpoints and limited social provider exposure to explicitly configured github/google pairs.
- Auth TRPC enforces CSRF, rate limits, logs Better Auth email issues, and manages remember-me cookie settings alongside password reset flows.
- Login UI binds form state to signInWithPassword, shows verification/help states, respects social-only mode, and resolves post-auth redirects.
- Better Auth backend wires drizzle adapters, normalized identifiers, session cookies, and hooks for creating/updating bridge entries while honoring env-provided secrets.

**Files:**
- apps/app/src/lib/auth-trpc.ts
- apps/app/src/lib/auth-flow-view-model.ts
- apps/app/src/routes/login.tsx
- packages/auth/src/better-auth-http.ts
- packages/auth/src/better-auth.ts

**Flow:**
Client action -> auth TRPC procedures -> Better Auth services (verification, password reset, social providers) -> auth-flow view model maps statuses -> login route renders stateful help/redirects while honoring verification and social-only policies.

**Timestamp:** 2026-04-05

**Author:** ByteRover context engineer

## Narrative
### Structure
Starting with auth policies that pin verification callbacks and login alert precedence, the auth TRPC router enforces CSRF via x-csrf-token, rate limits with Retry-After, handles password reset/logging, and manages remember-me cookies. The auth-flow view-model maps backend status parameters to translation keys for verification, signup, and reset notifications before login route components render form controls bound to signInWithPassword plus verification and social guidance.

### Dependencies
Depends on Better Auth service exports (email verification, password reset, session helpers), @yona/integrations for custom email delivery, configured env vars (YONA_PUBLIC_ORIGIN, BETTER_AUTH_SECRET, GITHUB/GOOGLE client id+secret), drizzle adapter hooks for n4user bridging, and csrf tokens provided by the frontend.

### Highlights
Public auth proxy allowlist now limited to POST /api/auth/sign-in/social and the GET callback/verify endpoints; social login buttons only show github/google when env pairs exist. Better Auth config uses drizzle adapters, normalization helpers, username/tanstack cookie plugins, and secondary storage with TTL cleanup for sessions.

### Rules
Rule 1: Email verification messages must reference /login?verify=complete. Rule 2: Only fully configured github/google pairs are surfaced as social providers. Rule 3: CSRF failures return 403 and rate-limit hits return 429 with Retry-After.

## Facts
- **auth_policy_email_verification**: Email verification now dispatches Better Auth verification emails targeting the fixed callback /login?verify=complete. [project]
- **auth_proxy_allowlist**: Public auth proxy allowlist only permits POST /api/auth/sign-in/social, GET /api/auth/callback/{github|google}, and GET /api/auth/verify-email. [project]
- **social_providers**: Social provider capabilities and Better Auth expose only github and google when both client id and secret env vars are configured; no dev fallbacks are available. [project]
- **auth_trpc_security**: The auth TRPC router issues 429 with Retry-After limits, enforces CSRF via the x-csrf-token header, and logs Better Auth email dispatch failures. [project]
- **login_route_behavior**: Login route binds identifier/password/remember-me to formState, uses signInWithPassword, resolves post-auth redirects, surfaces email verification help when enabled, and warns when only social login is permitted. [project]
- **better_auth_config**: Better Auth configuration reads YONA_PUBLIC_ORIGIN (default http://localhost:3001), BETTER_AUTH_SECRET, GitHub+Google client id/secret env vars, and issues custom session cookies backed by secondary storage with TTL cleanup. [project]
