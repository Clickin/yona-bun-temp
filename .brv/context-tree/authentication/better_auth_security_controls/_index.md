---
children_hash: ea7f0b4e4d8662d5d31ab5a0f9a28abd0bb7bd03747d9fbbf6d243a99774733b
compression_ratio: 0.4623032311516156
condensation_order: 1
covers: [better_auth_security_controls.md, context.md]
covers_token_total: 1207
summary_level: d1
token_count: 558
type: summary
---
### Domain: auth › better_auth_security_controls  
- **Scope:** Documents Better Auth-powered authentication safeguards, routing, proxy gating, and login experience protections for the Yona platform.  
- **Key Structural Facts:**  
  - Better Auth setup enforces environment prerequisites (BETTER_AUTH_SECRET, GitHub/Google CLIENT_ID+SECRET pairs), syncs users with the `n4user` table, and logs verification/reset delivery failures.  
  - Auth router exposes `AuthProcedureContext`, validates CSRF tokens, enforces per-route rate limits (forgot-password, login, register, oauth-callback), and respects remember-me cookie logic when issuing sessions.  
  - Public HTTP gate allowlist restricts endpoints to social sign-in, OAuth callbacks, and `/api/auth/verify-email`; all other paths are rejected. Rate-limit responses send HTTP 429 with `Retry-After` and `auth.rate-limited` payload; CSRF failures return 403 with “CSRF validation failed.”  
  - Login route’s view model translates `verify/signup/reset` query params into localized statuses, hides password inputs for social-only flows, builds redirect targets via `resolvePostAuthRedirectPath`, and persists sessions through `setCurrentSessionData`.  
  - Registration flow: create user → Better Auth sends verification email (if confirmation required) → redirect to `/login?verify=sent` or post-auth pathway → subsequent login attempts observe rate limits/CSRF → sessions issued with remember-me lifetimes.  
- **Facts to Drill Down:**  
  - Email verification callback fixed to `/login?verify=complete` when enabled (`email_verification_callback`).  
  - Proxy allowlist: only POST `/api/auth/sign-in/social`, GET `/api/auth/callback/{github|google}`, GET `/api/auth/verify-email` (`auth_proxy_allowlist`).  
  - Rate-limit responses carry 429 + `Retry-After` + `auth.rate-limited` payload (`auth_rate_limit_response`).  
  - Password reset tokens expire in 1 hour and failures log via `logPasswordResetDeliveryFailure` (`password_reset_handling`).  
  - Better Auth instantiation requires secrets and normalizes identifiers before syncing database hooks (`better_auth_config`).  
- **Entry for Details:** `better_auth_security_controls.md` (also referenced by `context.md`).