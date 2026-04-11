---
title: Wave 2 Account UI Flows
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-05T10:07:46.816Z'
updatedAt: '2026-04-05T10:07:46.816Z'
---
## Raw Concept
**Task:**
Document Wave 2 authentication account UI flows and supporting TRPC/auth-service procedures for login, registration, password reset, and session handling.

**Changes:**
- Login, register, forgot, and reset routes restored their legacy form layout while relying on readAuthUiCapabilities as the single UI capability source.
- Auth service utilities normalize identifiers, honor YONA_AUTH_SIGNUP_REQUIRE_CONFIRM, YONA_AUTH_EMAIL_VERIFICATION_ENABLED, and YONA_AUTH_SOCIAL_LOGIN_ONLY, and orchestrate session issuance, password mutations, and fallback reset tokens.
- TRPC procedures rate-limit sign-in/register/reset flows, respect rememberMe cookie options, honor registration confirmation modes, and emit typed failures such as app.auth.reset.invalidToken.

**Files:**
- apps/app/src/lib/auth-trpc.ts
- apps/app/src/routes/login.tsx
- apps/app/src/routes/register.tsx

**Flow:**
readAuthUiCapabilities -> render legacy login/register/forgot/reset forms -> call TRPC procedures (signInWithPassword, registerWithPassword, requestPasswordReset, completePasswordReset, signOut) -> AuthService validates inputs, enforces rate limits, issues sessions/cookies, and toggles rememberMe persistence -> session routes/exposures keep the UI in sync with current session/user data.

**Timestamp:** 2026-04-05

**Author:** Wave 2 Auth Team

## Narrative
### Structure
Login and register pages mount AuthShell, fetch rights via readAuthUiCapabilities, and conditionally show forms, social buttons, and confirmation messaging while leveraging adapters like resolveRegisterSuccessHref and resolvePostAuthRedirectPath tied to session projections.

### Dependencies
Depends on contracts schemas (authIdentifierSchema, authPasswordSchema, sessionProjectionSchema), env flags (YONA_AUTH_SIGNUP_REQUIRE_CONFIRM, YONA_AUTH_EMAIL_VERIFICATION_ENABLED, YONA_AUTH_SOCIAL_LOGIN_ONLY), BetterAuth verification token store, and TRPC helpers that enforce CSRF, rate limits, and rememberMe cookie options (getSessionCookieName, applyRememberMeToCookieOptions).

### Highlights
Rate-limit guard ensures every auth route returns Retry-After with 429 on exhaustion; registration adjusts behavior based on confirmation mode (email/admin require pending confirmation, none issues a session); rememberMe checkbox controls whether issued cookies are persistent or session-only, and password reset failures surface app.auth.reset.invalidToken.

### Rules
Rate-limit responses must set Retry-After and return 429 status; confirmation mode flows (email/admin) never issue a session until verification, while none issues cookies immediately; rememberMe toggles removal of cookie maxAge so persistent cookies remain longer.

### Examples
Login form validates via signInWithPasswordInputSchema (identifier, password, rememberMe) and calls runAuthAction to update session data or show resolveLoginFailureMessage. Register form collects loginId, name, email, password, retypedPassword, and uses registerWithPasswordInputSchema to prevent mismatched passwords, displays social buttons with requestSignUp flags, and follows resolveRegisterSuccessHref for navigation when confirmation is optional.

## Facts
- **ui_capability_source**: Wave 2 auth account UI flows rely exclusively on readAuthUiCapabilities for capability data. [project]
- **registration_confirmation_modes**: Registration responses include confirmation modes none, admin, and email while storing unconfirmed pending accounts accordingly. [project]
- **reset_failure_message**: Password reset failures return the typed message key app.auth.reset.invalidToken. [project]
- **remember_me_cookie**: The rememberMe checkbox toggles between persistent and session-only cookies for issued sessions. [project]
