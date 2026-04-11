---
title: Wave 2 Auth Account UI Flows
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-05T10:07:05.994Z'
updatedAt: '2026-04-05T10:07:05.994Z'
---
## Raw Concept
**Task:**
Document Wave 2 authentication account UI flows, their supporting schemas, env flag dependencies, and backend procedures through auth services and TRPC routers.

**Changes:**
- Consolidated UI capability data behind readAuthUiCapabilities so every account page pulls the same source.
- Restored legacy layouts for login, register, forgot, and reset forms while wiring them to new TRPC procedures.
- Extended session/user projection schemas to enforce anonymous/authenticated invariants and payload expectations.
- Added rate limiting and confirmation-mode aware flows in auth procedures (including failed password reset messaging).

**Files:**
- apps/app/src/lib/auth-trpc.ts
- apps/app/src/routes/login.tsx
- apps/app/src/routes/register.tsx

**Flow:**
env flag resolution -> readAuthUiCapabilities -> TRPC auth procedures (sign-in/register/request/complete/reset/rotate/update) -> UI forms (login/register) -> session cookie handling (rememberMe, rate limits, confirmation handling) -> post-auth redirects/notifications

**Timestamp:** 2026-04-05

## Narrative
### Structure
Backend capability schemas, projections, and auth procedures are defined in contracts/src/auth.ts, auth/src/app-service.ts, and apps/app/src/lib/auth-trpc.ts, with the UI consuming them via apps/app/src/routes/login.tsx and register.tsx. The UI always queries readAuthUiCapabilities before showing login/register/forgot/reset to decide whether email verification, admin confirmation, or social login-only notices apply. The TRPC router enforces CSRF, rate limits with Retry-After headers, and wraps every response in the documented schema outputs.

### Dependencies
Env flags (YONA_AUTH_SIGNUP_REQUIRE_CONFIRM, YONA_AUTH_EMAIL_VERIFICATION_ENABLED, YONA_AUTH_SOCIAL_LOGIN_ONLY) influence readAuthUiCapabilities and the confirmation mode chosen by registerWithPassword. Rate limit state relies on consumeAuthRateLimit per route, and cookie options fall back to BetterAuth settings when available.

### Highlights
Remember-me toggles between persistent and session cookies, register responses can issue sessions immediately only when confirmation mode is none, and password reset failures consistently return the app.auth.reset.invalidToken message key so the UI shows the legacy layout error. Login/register components validate input against the shared TRPC schemas and surface error messages via resolveLoginFailureMessage.

### Rules
Rate-limit responses must include Retry-After and return HTTP 429. Validation flows must use the shared contract schemas (signInWithPasswordInputSchema, registerWithPasswordInputSchema, reset token payloads). Password reset failure must emit completePasswordResetFailureMessageSchema with app.auth.reset.invalidToken for invalid tokens.

## Facts
- **auth_ui_capability_source**: Wave 2 auth account UI flows rely on readAuthUiCapabilities as the sole capability source before rendering any login/register/forgot/reset forms. [project]
- **remember_me_cookie_behavior**: `rememberMe` toggles whether session cookies persist or expire with the browser session. [project]
- **register_confirmation_mode**: Register responses encode confirmation modes (none, admin, email) and keep pending accounts until the mode allows session issuance. [convention]
- **password_reset_invalid_token_message**: Password reset failures surface the typed message key app.auth.reset.invalidToken to keep UI messaging consistent. [project]
