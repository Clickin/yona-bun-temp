---
children_hash: 3f3e3f3a2528cba849851179a58ecd777e41fb974a86e7a880992b7d11e9b4f8
compression_ratio: 0.6538461538461539
condensation_order: 1
covers: [wave_2_auth_account_ui_flows.md]
covers_token_total: 910
summary_level: d1
token_count: 595
type: summary
---
### Wave 2 Auth Account UI Flows (wave_2_auth_account_ui_flows.md)
- **Task & scope**: Documents Wave 2 authentication account UI flows, schema-backed validation, env-flag-driven capability gating, and backend procedures spanning auth services and TRPC routers.
- **Key structural facts**:
  - Contracts (`contracts/src/auth.ts`) define capability schemas and projections consumed by the TRPC service (`auth/src/app-service.ts` and `apps/app/src/lib/auth-trpc.ts`) and UI routes (`apps/app/src/routes/login.tsx`, `register.tsx`).
  - UI always queries `readAuthUiCapabilities` before rendering login/register/forgot/reset flows to determine email verification, admin confirmation, or social-login-only notices.
  - TRPC router enforces CSRF, rate limits with `Retry-After`, and wraps responses in shared schema outputs.
- **Flows & dependencies**: `env flag resolution → readAuthUiCapabilities → TRPC auth procedures (sign-in/register/request/complete/reset/rotate/update) → UI forms → session cookie handling (rememberMe, rate limits, confirmation mode) → redirects/notifications`. Environment flags (signup confirmation, email verification, social-login-only) shape capability responses and confirmation modes; rate limiting relies on `consumeAuthRateLimit`, and cookie options fall back to BetterAuth settings.
- **Highlights & rules**:
  - Remember-me toggles between persistent and session cookies; registration only issues sessions when confirmation mode allows it.
  - Password reset failures consistently return the `app.auth.reset.invalidToken` message via `completePasswordResetFailureMessageSchema`.
  - Validation must use shared schemas (`signInWithPasswordInputSchema`, `registerWithPasswordInputSchema`, reset token payloads).
  - Rate-limit responses must include `Retry-After` headers and HTTP 429.
- **Facts preserved**:
  - `readAuthUiCapabilities` is the single capability source (auth_ui_capability_source).
  - `rememberMe` controls persistence vs. session cookie behavior (remember_me_cookie_behavior).
  - Registration encodes confirmation modes and defers sessions until approval (register_confirmation_mode).
  - Password reset invalid-token errors use `app.auth.reset.invalidToken` for consistent messaging (password_reset_invalid_token_message).

For implementation details and deeper rationale, refer directly to **wave_2_auth_account_ui_flows.md**.