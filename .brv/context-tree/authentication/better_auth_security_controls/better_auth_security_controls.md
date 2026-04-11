---
title: Better Auth Security Controls
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-05T10:35:44.602Z'
updatedAt: '2026-04-05T10:35:44.602Z'
---
## Raw Concept
**Task:**
Document the Better Auth-powered authentication router, HTTP gate, and login view behaviors plus their safety checks.

**Changes:**
- Email verification always uses `/login?verify=complete` callback when email verification is enabled and surfaces deterministic login alerts for verify sent/complete/error.
- Public Better Auth HTTP gate allowlist now only accepts social sign-in, callback, and verify-email routes, rejecting all other paths.
- Auth router enforces rate limits on forgot-password, login, register; validates CSRF tokens; and respects remember-me cookie logic when issuing sessions.
- Login route view model resolves verify/signup/reset search params to localized statuses, conditionally hides forms when social-only, and persists sessions via resolvePostAuthRedirectPath.
- Better Auth instantiation enforces env prerequisites, normalizes identifiers, syncs with n4user table, and logs delivery failures for verification/reset emails.

**Files:**
- apps/app/src/lib/auth-trpc.ts
- apps/app/src/routes/login.tsx
- packages/auth/src/better-auth-http.ts
- packages/auth/src/better-auth.ts

**Flow:**
Registration -> create user -> Better Auth send verification email (if confirmation rules apply) -> redirect to /login?verify=sent or post-auth path -> login attempts respect rate limits and CSRF tokens -> session cookie issued with remember-me if requested.

**Timestamp:** 2026-04-05

**Author:** Yona Auth Team

## Narrative
### Structure
The auth router exposes helpers via AuthProcedureContext, enforces CSRF and session guards, and collaborates with Better Auth configuration that includes normalized identifiers, database hooks, and custom email verification/reset integrations. The login route uses the auth flow view model to surface localized alerts, build redirect targets, and optionally disable password input when social-only logins are configured.

### Dependencies
Depends on Better Auth configuration (BETTER_AUTH_SECRET, CLIENT_ID/SECRET for GitHub and Google), @yona/db adapters, @yona/integrations email helpers, and auth capability queries in the login page.

### Highlights
Email verification dispatch now always routes through `/login?verify=complete`; public auth HTTP gate rejects all endpoints except the social sign-in, oauth callbacks, and email verification hooks; rate limit breaches return 429 Retry-After with auth.rate-limited payload; password resets send 1-hour tokens and log delivery failures; remember-me toggles adjust cookie lifetimes.

### Rules
Public gate: only POST /api/auth/sign-in/social, GET /api/auth/callback/{github|google}, GET /api/auth/verify-email are allowed. Rate-limited routes respond with HTTP 429, Retry-After header, and payload code auth.rate-limited. CSRF validation failure returns 403 with message “CSRF validation failed.”.

### Examples
Registration success with email confirmation navigates to `/login?verify=sent`; signup requiring confirmation redirects to `/login?signup=requested`; successful login stores session via setCurrentSessionData and navigates using resolvePostAuthRedirectPath; social callback routes are rate limited per IP via consumeAuthRateLimit route “oauth-callback”.

## Facts
- **email_verification_callback**: Email verification now dispatches Better Auth verification mail with fixed callback path `/login?verify=complete` whenever `emailVerificationEnabled` is true. [project]
- **auth_proxy_allowlist**: Public auth proxy allowlist is limited to POST /api/auth/sign-in/social, GET /api/auth/callback/{github|google}, and GET /api/auth/verify-email. [convention]
- **auth_rate_limit_response**: Rate-limited auth responses include HTTP 429, a Retry-After header, and payload code auth.rate-limited. [environment]
- **better_auth_config**: Better Auth instantiation requires BETTER_AUTH_SECRET and only configures GitHub/Google providers when both CLIENT_ID and CLIENT_SECRET pairs are present. [project]
- **password_reset_handling**: Password reset tokens expire after 1 hour and failures log context via logPasswordResetDeliveryFailure. [convention]
