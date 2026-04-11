---
children_hash: 0493536d455cb4487d9757096a6c83a33e611bafff9d780710860baeb5317a40
compression_ratio: 0.5022789425706472
condensation_order: 1
covers: [better_auth_risk_closure_policy.md, context.md]
covers_token_total: 1097
summary_level: d1
token_count: 551
type: summary
---
# better_auth_policies (domain-level structural summary)

- **Scope & Focus:** Documents the Better Auth risk-closure policy, router safeguards, and gate configuration that together enforce verification, CSRF protection, rate limiting, and cookie/session handling for the authentication flows described in `better_auth_risk_closure_policy.md`. The topic overview clarifies this coverage and links to `authentication/account_ui_wave_2` for UI-specific dependencies.

- **Key Architectural Decisions:**
  - **Risk Closure Flow:** Email verification always routes through the Better Auth system and mandates the `/login?verify=complete` callback when `emailVerificationEnabled` is true, ensuring consistent verification endpoints (`better_auth_risk_closure_policy.md` raw concept & facts).
  - **Router Guardrails:** The auth router builds an `AuthProcedureContext` that bundles CSRF validation, session fusion, capability flags, and per-flow rate limits before delegating to register, login, password reset, and profile flows; UI elements observe these states via a shared login view model (`structure` narrative).
  - **Gate & Rate-Limit Enforcement:** The public Better Auth HTTP gate only allows POST `/api/auth/sign-in/social`, GET `/api/auth/callback/{github|google}`, and GET `/api/auth/verify-email`, and rejects other paths with 404. All sensitive endpoints emit HTTP 429 + `Retry-After` headers plus `auth.rate-limited` payload on limit breaches, while social provider behavior depends on configured `CLIENT_ID/CLIENT_SECRET` pairs (`Rules`, `Highlights`, `Facts`).

- **Dependencies & Observability:** Auth behavior relies on environment variables (`BETTER_AUTH_SECRET`, `YONA_PUBLIC_ORIGIN`, GitHub/Google credentials), `@yona/db` adapters, and the auth capability service (email verification, signup confirmation flags). Failures in email dispatch, resets, or rate limits log observability events, and cookie handling reuses helper functions (`Highlights`, `Dependencies`).

- **Related Topics:** Readers can drill into the related account UI coverage at `authentication/account_ui_wave_2`, which links UI messaging and verification status handling back to the router safeguards outlined here.