---
title: Better Auth Gateway
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-05T10:33:51.460Z'
updatedAt: '2026-04-05T10:33:51.460Z'
---
## Raw Concept
**Task:**
Document the Better Auth gateway, risk closure, and router behaviors that enforce verification, rate limits, and provider scope for authentication flows.

**Changes:**
- Deterministic email verification alert precedence reports verify sent, verify complete, or verify error statuses.
- Public auth proxy was locked down to Better Auth endpoints for sign-in, callbacks, and verification when social providers are explicitly configured.
- Router procedures enforce CSRF, cookie clearing, remember-me logic, and conditional session creation depending on confirmation requirements.
- Better Auth instantiation now normalizes identifiers, syncs with core user tables, and uses env-driven provider selection plus secondary storage for tests.

**Files:**
- apps/app/src/lib/auth-trpc.ts
- apps/app/src/routes/login.tsx
- packages/auth/src/better-auth-http.ts
- packages/auth/src/better-auth.ts

**Flow:**
Auth UI → auth router procedures (CSRF, rate limits, Better Auth client) → Better Auth HTTP gate for social login/callbacks and verification → session cookie issuance or confirmation status response

**Timestamp:** 2026-04-05T00:00:00Z

## Narrative
### Structure
The auth router mixes shared procedure context, session cookie helpers, and CSRF guards; register/login routes consult capabilities to decide whether to initiate Better Auth email confirmation or immediate sessions, while the login view model maps verification statuses to localized alerts.

### Dependencies
Depends on Better Auth client configuration, capabilities metadata (emailVerificationEnabled, signupRequireConfirm, enabledSocialProviders), consumeAuthRateLimit for brute-force protection, and normalized environment variables that drive GitHub/Google provider instantiation.

### Highlights
Password reset and change flows log delivery failures for observability, remember-me toggles remove maxAge unless selected, and public endpoints are strictly scoped to social sign-in, callbacks, and email verification with rate-limited 429 responses.

## Facts
- **email_verification_callback**: Email verification now dispatches Better Auth verification mail with callback `/login?verify=complete` whenever email verification is enabled. [project]
- **auth_proxy_allowlist**: Public auth proxy only allows POST /api/auth/sign-in/social, GET /api/auth/callback/{github|google}, and GET /api/auth/verify-email when configured social providers exist. [convention]
- **auth_rate_limiting**: Forgot-password, login, and register routes share an IP-based rate limit that returns HTTP 429 with a Retry-After header and auth.rate-limited payload. [environment]
- **social_provider_configuration**: Better Auth only configures GitHub and Google social providers when both CLIENT_ID and CLIENT_SECRET environment variables are provided. [project]
