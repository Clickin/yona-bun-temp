---
children_hash: 08e1a3f2f7051a3165599dca8897be829c63d326f23a0c1e2264f1500b33e873
compression_ratio: 0.3662447257383966
condensation_order: 1
covers: [better_auth_integration.md, context.md]
covers_token_total: 1185
summary_level: d1
token_count: 434
type: summary
---
## better_auth_integration Overview
- **Scope**: Captures Better Auth policies, TRPC procedures, login/UI wiring, and provider/backend configuration that govern Yona authentication (see `better_auth_integration.md`).
- **Core Flow**: Client triggers auth TRPC procedures; Better Auth services (verification, resets, social) feed status parameters into the auth-flow view model, and the `/login.tsx` route renders authentication controls, verification alerts, and social-only guidance (details in both files).
- **Policy Highlights**:
  - Email verification alerts are pinned to `/login?verify=complete`, and the public auth proxy only allows POST `/api/auth/sign-in/social` plus GET `/api/auth/callback/{github|google}` and `/api/auth/verify-email`.
  - Social buttons expose only fully configured GitHub/Google pairs; no fallback providers.
  - TRPC enforces CSRF via `x-csrf-token`, rate limits with `Retry-After` (429), and logs Better Auth email issues; CSRF failures return 403 by rule.
- **Implementation Landmarks**:
  - Login view-model binds form state to `signInWithPassword`, handles remember-me cookies, post-auth redirects, and verification/help states, warning when social-only mode is active (`better_auth_integration.md`).
  - Better Auth backend uses drizzle adapters, normalized identifiers, session cookies with secondary storage TTL cleanup, and hooks for bridging n4user records while honoring env-provided secrets (`BETTER_AUTH_SECRET`, `YONA_PUBLIC_ORIGIN`, GitHub/Google credentials).
- **Key Contacts for Details**: Drill down into `better_auth_integration.md` for the full raw concept, narrative structure, dependencies, highlights, rules, and facts; `context.md` summarizes the topic focus and key concepts.