---
children_hash: 2328ac9df21c6461985928c2cd3cedd6f8e113f75218bc0fe64800c1e59dad97
compression_ratio: 0.632
condensation_order: 1
covers: [better_auth_gateway.md]
covers_token_total: 750
summary_level: d1
token_count: 474
type: summary
---
### Better Auth Gateway (better_auth_gateway.md)
- **Purpose:** Documents how the Better Auth gateway enforces verification, rate limits, and provider scope across auth flows.
- **Key Flow:** Auth UI → auth router procedures (CSRF guards, rate-limiting, Better Auth client) → Better Auth HTTP gateway for social login/callbacks and verification → session cookie issuance or confirmation response.
- **Structure & Behavior:** Router mixes shared procedure context, session cookie helpers, CSRF protection, and capability-based decisions (email verification, requirement for confirmation, social provider availability); login view model maps verification statuses to localized alerts.
- **Dependencies:** Better Auth client configuration, capability metadata flags (emailVerificationEnabled, signupRequireConfirm, enabledSocialProviders), subscribe to consumeAuthRateLimit, and environment variables that normalize GitHub/Google provider instantiation.
- **Highlight Decisions:**
  - Password reset/change flows log delivery failures for observability.
  - Remember-me toggles remove maxAge unless explicitly selected.
  - Public endpoints strictly limited to social sign-in, callbacks, and email verification, with shared IP-based rate limits returning HTTP 429 plus Retry-After and auth.rate-limited payloads.
- **Facts for Drill-down:**
  - `email_verification_callback`: verification mails hit `/login?verify=complete` when enabled.
  - `auth_proxy_allowlist`: Public auth proxy only allows POST `/api/auth/sign-in/social`, GET `/api/auth/callback/{github|google}`, and GET `/api/auth/verify-email` when social providers exist.
  - `auth_rate_limiting`: Forgot-password, login, register routes share an IP-based rate limit responding with 429 and `Retry-After`.
  - `social_provider_configuration`: GitHub/Google providers configured only when respective CLIENT_ID/CLIENT_SECRET env vars exist.