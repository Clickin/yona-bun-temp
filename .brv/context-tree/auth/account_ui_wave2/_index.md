---
children_hash: 8ea97e33b8f01b4787e7c558e615666f25763302001bdd5b72022f4c204eaa71
compression_ratio: 0.6196928635953026
condensation_order: 1
covers: [context.md, wave_2_account_ui_flows.md]
covers_token_total: 1107
summary_level: d1
token_count: 686
type: summary
---
# account_ui_wave2 (Wave 2 Account UI)

- **Purpose & Layout**: Restores the legacy account UI (login/register/forgot/reset) while centralizing capability discovery through `readAuthUiCapabilities`, keeping TRPC/auth-service validation, rate limiting, and session issuance aligned with the legacy structure. See `context.md` for the high-level rationale and `wave_2_account_ui_flows.md` for the detailed flow.

- **Flows & Dependencies**:
  - Capability retrieval → render legacy shell/forms → call TRPC procedures (`signInWithPassword`, `registerWithPassword`, `requestPasswordReset`, `completePasswordReset`, `signOut`) → AuthService validates identifiers/passwords, enforces rate limits, handles session/cookie issuance (rememberMe persistence), and issues fallback reset tokens.
  - Depends on shared schemas (`authIdentifierSchema`, `authPasswordSchema`, `sessionProjectionSchema`), environment flags (`YONA_AUTH_SIGNUP_REQUIRE_CONFIRM`, `YONA_AUTH_EMAIL_VERIFICATION_ENABLED`, `YONA_AUTH_SOCIAL_LOGIN_ONLY`), BetterAuth token store, CSRF/rate-limit helpers, and cookie utilities (`getSessionCookieName`, `applyRememberMeToCookieOptions`). Refer to `wave_2_account_ui_flows.md` for dependency specifics.

- **Key UI/UX Behavior**:
  - Login/register pages mount `AuthShell`, fetch capabilities, conditionally render forms/social buttons, and rely on adapters like `resolveRegisterSuccessHref` and `resolvePostAuthRedirectPath` tied to session projections.
  - Remember-me checkbox governs whether cookies are persistent or session-only.
  - Registration confirmation modes (none, admin, email) drive whether sessions are issued immediately or held pending verification; see the fact list for clarification.

- **Operational Rules & Patterns**:
  - Rate-limited auth routes must emit `Retry-After` headers with 429 responses; `rememberMe` toggles cookie `maxAge`; reset failures surface the typed error `app.auth.reset.invalidToken`.
  - TRPC flows honor schema validation (`signInWithPasswordInputSchema`, `registerWithPasswordInputSchema`) and use helpers like `runAuthAction`, `resolveLoginFailureMessage`, and social/signup flags during registration.

- **Facts & Traceability**:
  - `readAuthUiCapabilities` is the single capability source for Wave 2 UI.
  - Registration confirms via `none`, `admin`, or `email`, with pending accounts for verification-required modes.
  - Password reset failures return `app.auth.reset.invalidToken`.
  - The remember-me checkbox controls whether issued cookies persist or expire at session end.
  - Drill into `wave_2_account_ui_flows.md` for flow diagrams, rules, and example payloads; use `context.md` for the overarching topic summary and relationships (e.g., link to `auth/session_management`).