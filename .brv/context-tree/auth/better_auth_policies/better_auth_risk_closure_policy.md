---
title: Better Auth Risk Closure Policy
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-05T10:34:27.845Z'
updatedAt: '2026-04-05T10:34:27.845Z'
---
## Raw Concept
**Task:**
Document the auth risk closure policy, Better Auth router safeguards, and Better Auth gateway configuration active as of April 2026.

**Changes:**
- Email verification always dispatches Better Auth verification emails with callback /login?verify=complete when email verification is enabled.
- Auth router enforces CSRF, session requirements, and IP-based rate limits on login, register, and password recovery.
- Better Auth HTTP gate now only allows POST /sign-in/social, GET /verify-email, and GET /callback/{github|google} calls with provider-specific rate limits.

**Files:**
- apps/app/src/lib/auth-trpc.ts
- apps/app/src/routes/login.tsx
- packages/auth/src/better-auth-http.ts
- packages/auth/src/better-auth.ts

**Flow:**
Request arrives at auth router → CSRF validation + session context fusion → register/login/password flows enforce rate limits and optionally issue Better Auth verification emails → public Better Auth gate proxies only the allowed endpoints → Better Auth instance handles email/password and configured social providers with cookie/session helpers and DB hooks → failures (email dispatch, resets, rate limits) log observability events.

**Timestamp:** 2026-04-05

**Author:** Security team

## Narrative
### Structure
The auth router bundles helper context, validation, and rate limits into AuthProcedureContext before delegating to flows such as registerWithPassword, signInWithPassword, password reset, and profile updates. A separate login view model uses this router to resolve localized messages, surface verification statuses, and toggle UI elements based on capabilities.

### Dependencies
Depends on Better Auth environment variables (BETTER_AUTH_SECRET, YONA_PUBLIC_ORIGIN with fallback http://localhost:3001, CLIENT_ID/CLIENT_SECRET pairs for GitHub and Google), drizzle adapters (@yona/db), and the auth capability service that drives emailVerificationEnabled/signupRequireConfirm flags.

### Highlights
Remember-me cookies reuse getBetterAuthSessionCookieOptions() and applyRememberMeToCookieOptions, form submissions call authCaller sign-in routes, and rate limits (forgot-password/login/register/oauth-callback) reject with HTTP 429 + Retry-After when thresholds breach. Better Auth configuration includes normalized identifiers, DB hooks syncing n4user, hashed credential storage, secondary-memory test storage, and limited social providers.

### Rules
Rule 1: Email verification callback is fixed to /login?verify=complete when emailVerificationEnabled is true.
Rule 2: Public Better Auth HTTP gate only accepts POST /api/auth/sign-in/social, GET /api/auth/callback/{github|google}, and GET /api/auth/verify-email; everything else returns 404.
Rule 3: Rate limit violations must emit Retry-After headers, 429 status, and the auth.rate-limited payload.

### Examples
Example localized status urls: /login?verify=sent for email confirmation, /login?signup=requested when signup confirmation is required, and resolvePostAuthRedirectPath for successful logins; authErrorMessage maps auth.account-not-confirmed to user.locked.

## Facts
- **email_verification_callback**: Email verification dispatch always uses Better Auth with callback /login?verify=complete when emailVerificationEnabled is true. [project]
- **auth_proxy_allowlist**: The public auth proxy allowlist is limited to POST /api/auth/sign-in/social, GET /api/auth/callback/{github|google}, and GET /api/auth/verify-email. [convention]
- **auth_rate_limit_response**: Rate limit failures return HTTP 429 with a Retry-After header and payload { code: "auth.rate-limited", message, retryAfterSeconds }. [environment]
- **social_provider_config**: GitHub and Google social providers are only configured when both CLIENT_ID and CLIENT_SECRET are provided. [project]
