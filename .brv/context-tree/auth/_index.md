---
children_hash: 733601f0f91d310670388e3b81c7a673aebcaa2e9986f4cdb6eb597677d4d527
compression_ratio: 0.5541999061473487
condensation_order: 2
covers: [account_ui_wave2/_index.md, better_auth_policies/_index.md, context.md, pilot_connect/_index.md]
covers_token_total: 2131
summary_level: d2
token_count: 1181
type: summary
---
# auth Domain Structural Summary (Level d2)

## Domain Purpose & Usage
- **Scope**: Defines Wave 2 account UI behavior, TRPC auth procedures, session/cookie rules, and dependency flags (see `context.md` for full domain description).  
- **Usage guidance**: Reference this domain to understand legacy account form flows, BetterAuth guardrails, social login gating, remember-me persistence, and session projection expectations.

## Topics

### account_ui_wave2
- **Purpose**: Restore legacy login/register/forgot/reset forms while centralizing capability discovery via `readAuthUiCapabilities`; dependent on TRPC/auth-service validation, rate limiting, and session issuance consistent with BetterAuth expectations (`account_ui_wave2/_index.md`).
- **Flows & Dependencies**:
  - UI flow: fetch capabilities → render `AuthShell` + conditional social buttons → call TRPC procedures (`signInWithPassword`, `registerWithPassword`, password reset, `signOut`).
  - Relies on shared schemas (`authIdentifierSchema`, `authPasswordSchema`, `sessionProjectionSchema`), env flags (`YONA_AUTH_*`), BetterAuth token store, CSRF/rate-limit helpers, and cookie utilities (`getSessionCookieName`, `applyRememberMeToCookieOptions`).
- **Key Rules**:
  - Rate-limited endpoints emit `Retry-After` headers with 429 responses; password reset failures surface `app.auth.reset.invalidToken`.
  - `rememberMe` determines persistent vs session-only cookies; registration confirmation modes (`none`, `admin`, `email`) affect immediate session issuance versus pending verification.
  - TRPC flows strictly follow validation schemas and helpers (`runAuthAction`, `resolveLoginFailureMessage`, capability flags) described in `wave_2_account_ui_flows.md`.

### better_auth_policies
- **Focus**: Documents the BetterAuth risk-closure policy, router safeguards, gate configuration, and their connections to authentication UIs (`better_auth_policies/_index.md`).
- **Architectural decisions**:
  - Email verification always routes through BetterAuth with `/login?verify=complete` when `emailVerificationEnabled` is true.
  - Auth router builds `AuthProcedureContext` bundling CSRF validation, session fusion, capability flags, and rate limits before invoking register/login/reset/profile flows; shared login view model exposes these states to UI.
  - Public BetterAuth gate restricts methods/paths (POST `/api/auth/sign-in/social`, GET `/api/auth/callback/{github|google}`, GET `/api/auth/verify-email`) and responds with `Retry-After` + `auth.rate-limited` payload on limit breaches.
  - Social provider behavior depends on configured client credentials; cookie handling reuses helper utilities.
- **Dependencies & Observability**: Tied to env vars (`BETTER_AUTH_SECRET`, `YONA_PUBLIC_ORIGIN`, GitHub/Google secrets), `@yona/db` adapters, capability service, and observability/logging on email, reset, or rate-limit failures.
- **Related topic**: Link back to `authentication/account_ui_wave_2` for UI interplay.

### pilot_connect
- **Domain overview** (`pilot_connect/_index.md`): Aligns Connect entry point by reconfiguring router base path, anonymous session bootstrapping, and frontend CSRF initialization before proxying to Connect RPC.
- **Go Connect Pilot Hardening** (`go_connect_pilot_hardening.md`):
  - **Changes & Flow**: Normalize runtime base path → mount `/rpc` service handler + anonymous bootstrap at `YONA_BASE_PATH/api/auth/session` → issue `yona_session`/`yona_csrf_token` cookies plus `X-CSRF-Token` headers → frontend uses `readPilotSessionBootstrap` to fetch CSRF before Connect RPC mutations.
  - **Structure & dependencies**: `NewRouter` handles base path normalization, pilot handler, and bootstrap endpoint; relies on `internal/auth/session.go`, Connect interceptors, and `sessionRoutePayloadSchema`.
  - **Highlights**: Removes hardcoded CSRF, synchronizes RPC/bootstrap paths with runtime base, ensures fresh CSRF acquisition.

## Facts & Relationships
- `readAuthUiCapabilities` is the single capability source for Wave 2 account UI; `better_auth_policies` connects router guardrails and verification flows back to these UI behaviors.
- Remember-me toggles cookie persistence; registration confirmation modes vary between immediate session issuance and pending verification.
- Connect Pilot now mounts RPCs under `YONA_BASE_PATH/rpc`, bootstraps anonymous sessions at `YONA_BASE_PATH/api/auth/session`, and enforces CSRF checks via `readPilotSessionBootstrap`.

For full implementation details and flow diagrams, drill into:
- `account_ui_wave2/context.md` & `wave_2_account_ui_flows.md`
- `better_auth_policies/context.md` & `better_auth_risk_closure_policy.md`
- `pilot_connect/context.md` & `go_connect_pilot_hardening.md`