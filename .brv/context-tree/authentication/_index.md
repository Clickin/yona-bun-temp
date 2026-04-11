---
children_hash: f1804cb8be15145b6a37bf5708374529bacc416d81b91cd830e2200239aaa5fa
compression_ratio: 0.3798209366391185
condensation_order: 2
covers: [account_ui_wave_2/_index.md, better_auth_gateway/_index.md, better_auth_integration/_index.md, better_auth_security_controls/_index.md, pilot_auth_workspace_minimum/_index.md, pilot_session_hardening/_index.md, pilot_workspace_minimum/_index.md, root_admin_bootstrap/_index.md, wave_1_direct_auth_email_packet/_index.md]
covers_token_total: 5808
summary_level: d2
token_count: 2206
type: summary
---
## account_ui_wave_2
- **Capability gating & flow** (`wave_2_auth_account_ui_flows.md`): Contracts in `contracts/src/auth.ts` feed TRPC router (`auth/src/app-service.ts`, `apps/app/src/lib/auth-trpc.ts`) and UI routes (`apps/app/src/routes/login.tsx`, `register.tsx`); UI always fetches `readAuthUiCapabilities` before rendering login/register/forgot/reset flows so email verification, admin confirmation, and social-only notices can toggle UI behavior.
- **Security & rate limiting**: TRPC enforces CSRF, `consumeAuthRateLimit` with `Retry-After`, and shared schema-wrapped responses; password resets return `app.auth.reset.invalidToken` via `completePasswordResetFailureMessageSchema`, and validation relies on shared schemas (e.g., `signInWithPasswordInputSchema`).
- **Stateful cookie logic**: `rememberMe` toggles between persistent/session cookies tied to BetterAuth settings, while registration defers session issuance until confirmation mode permits it.

## better_auth_gateway
- **Gateway orchestration** (`better_auth_gateway.md`): Auth UI → TRPC router (CSRF/session helpers) → Better Auth HTTP gateway (social logins, verification) → session issuance; router context mixes capability flags (email verification, signup confirmation, enabled social providers) with rate limits and CSRF guards.
- **Public proxy constraints**: Allowlist restricts POST `/api/auth/sign-in/social`, GET `/api/auth/callback/{github|google}`, GET `/api/auth/verify-email`; GitHub/Google providers only instantiate when CLIENT_ID/CLIENT_SECRET env vars exist; forgot-password/login/register share IP-based rate limits that return 429 + `Retry-After` + `auth.rate-limited`.
- **Operational highlights**: Password reset/change failures are logged, remember-me removes `maxAge` unless chosen explicitly, and login view models map verification statuses to localized alerts.

## better_auth_integration
- **Policy & wiring** (`better_auth_integration.md`, `context.md`): Better Auth policies govern TRPC procedures, view models, and UI controls; `/login.tsx` renders capability-driven alerts, social guidance, and binds forms to `signInWithPassword`.
- **Security & dependency stack**: TRPC enforces CSRF via `x-csrf-token`, rate limits with 429+`Retry-After`, and logs Better Auth email issues; backend uses Drizzle adapters, normalized identifiers, session cookie TTL cleanup, and integrates `BETTER_AUTH_SECRET`, `YONA_PUBLIC_ORIGIN`, and provider secrets.
- **Gateway & UI patterns**: Only fully configured GitHub/Google social buttons appear; public proxy provides POST `/api/auth/sign-in/social`, callback, and verify-email endpoints; CSRF failures yield 403, and remember-me/redirect flows align with Better Auth status values.

## better_auth_security_controls
- **Protection architecture** (`better_auth_security_controls.md`, `context.md`): Better Auth instantiation requires secrets, syncs `n4user`, and logs delivery failures; router exposes `AuthProcedureContext`, enforces CSRF and per-route rate limits (forgot/login/register/oauth-callback), and applies allowlist gating plus 429/Retry-After responses with `auth.rate-limited`.
- **Login & registration flows**: View model transforms query params into localized statuses, hides password inputs in social-only mode, resolves post-auth redirects, and persists sessions through `setCurrentSessionData`; registration creates users, triggers verification emails when required, and routes to `/login?verify=sent`.
- **Rules & facts**: Email verification callback is `/login?verify=complete`, rate-limit responses include `auth.rate-limited`, password reset tokens expire in 1 hour with delivery failure logging, proxy allowlist and cookie normalization are enforced, and Remember-me logic respects confirmation modes.

## pilot_auth_workspace_minimum
- **Pilot baseline stack** (`pilot_auth_workspace_minimum.md`, `context.md`): Proto surface `proto/yona/pilot/v1/pilot.proto` defines RPCs (session/auth/workspace operations) consumed by Connect/web TypeScript clients powering `/login`, `/register`, `/me`.
- **Server & persistence**: Axum router wires runtime config (CSRF/session bootstrap at `/api/auth/session`), Connect router, SeaORM models for app users/default landings, and helpers for identifier normalization, bcrypt verification, and default landing persistence.
- **Front-end shells**: Auth/workspace shells rely on buf-generated clients and runtime config, reuse CSRF-aware headers, and surface normalized landing info; PilotService RPCs (e.g., `ReadCurrentSession`, `SetDefaultLandingPath`, `ListProjects`) provide workspace + issue data consistent with backend persistence.

## pilot_session_hardening
- **Session hardening blueprint** (`pilot_session_hardening.md`, `context.md`): Connect handlers mounted under normalized `YONA_BASE_PATH/rpc`; anonymous session bootstrap at `/api/auth/session` issues `yona_session`, `yona_csrf_token`, and `X-CSRF-Token` for frontend use before RPCs.
- **Architectural rules**: `normalizeBasePath` ensures slash hygiene; RPC handlers always strip `/rpc` prefix; `EnsureAnonymousSession` issues SameSite=Lax cookies, `ValidateCSRF` uses constant-time comparison; `readPilotSessionBootstrap` fetches bootstrap endpoint with same-origin credentials and validates CSRF payload before RPC calls.
- **Flows**: Runtime config → fetch `/api/auth/session` → persist tokens → subsequent RPCs use `X-CSRF-Token`; dependencies include `internalauth.Manager`, chi, `pilotv1connect`, and frontend runtime config values.

## pilot_workspace_minimum
- **R0-2 pilot workspace stack** (`pilot_workspace_minimum.md`, `context.md`): Proto definitions, Axum routing, SeaORM persistence, and frontend shells supporting login/register/workspace flows for yona-rust parity.
- **Server & persistence roles**: Axum + Connect combine runtime config, session bootstrap, and RPC routing; SeaORM repos manage `app_users`, `default_landing_preferences`, `projects`, and `issues`; default landing normalized before persistence via helper RPCs.
- **Frontend parity**: Connect-web shells for `/login`, `/register`, `/me` reuse BUF-generated clients, CSRF-aware headers, and runtime config-injected `rpcBaseUrl`; workspace shell surfaces landing/favorites while mirroring backend RPC signatures.
- **Highlights**: `/api/auth/session` handles CSRF/session bootstrapping, registration enforces normalization + bcrypt hashing before sessions, and default landing persistence happens through dedicated RPC calls to keep frontend and backend aligned.

## root_admin_bootstrap
- **Root admin lifecycle** (`root_admin_bootstrap_and_recovery.md`, `context.md`): Documents initialization/recovery states, mutex-protected first-admin creation, CLI utilities, and `/setup/first-admin` gating.
- **State & coordination**: `packages/db/src/root-admin.ts` tracks `InitializationState`; SQLite migration `20260405120036_daffy_wraith` introduces `bootstrap_mutex` with `mutex_key`; `packages/auth/src/app-service.ts` and `admin-cli.ts` share helpers for identifier normalization, password hashing, and state transitions.
- **CLI & UI rules**: CLI commands (`yona admin recover-root`, `reset-root-password`) require `--password-stdin` and respect initialization state; route `/setup/first-admin` only loads when state is fresh-uninitialized, otherwise redirects to `/login?setup=complete`; password reset tokens live 3,600,000 ms and sessions are invalidated via app service helpers.
- **Facts for drilling**: Reserved login ID “admin”, 1-hour password reset TTL, mutex table `bootstrap_mutex` with nullable `updated_at`, and better-auth verification hooks for password changes.

## wave_1_direct_auth_email_packet
- **Wave 1 direct auth packet** (`direct_auth_and_email_packet.md`, `context.md`): Rust server registers session bootstrap, lost/reset password, email validation endpoints (send/confirm), and RPC services; AppRepository handles normalization, verification tokens, notifications, profiles, and workspace projections; frontend AuthWorkspaceShell mirrors legacy flows.
- **Contracts & tests**: Contract tests cover capability flags, entire auth journeys, email validation, workspace settings mutations, notifications, and landing normalization; frontend shells combine Login/Register/LostPassword/Reset/Home/Workspace components with CSRF helpers.
- **Endpoints & persistence**: Explicit endpoints include `/api/auth/session`, `/lostPassword`, `/resetPassword`, `/user/email/sendValidationEmail/{email_id}`, `/user/email/confirm/{email_id}/{token}`, and RPCs; persistence via SeaORM manages identifiers, verification tokens, settings, and workspace projections.
- **Relationships**: Ties into `authentication/pilot_workspace_minimum` and `authentication/pilot_session_hardening` for parity, and references `docs/provenance/core-parity-audit.md` for audit traceability.