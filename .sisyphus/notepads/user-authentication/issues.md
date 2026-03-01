# Issues

- No unresolved implementation blockers during Task 6 delivery; auth route behavior is covered by focused unit specs and type checks.
- Hands-on QA for `POST /api/auth/register` and `POST /api/auth/login` requires configuring `YONA_DB_URL` to a reachable MySQL instance (unit tests mock DB calls).
- Constraint note: avoid Sisyphus-Junior tasks when routed through glm-5; continue with alternative delegation or non-Junior verification flow for remaining tasks.
- Blocker (Wave 4): Remaining implementation tasks 11-14 require code-writing delegation, but available code-writing path is Sisyphus-Junior; user constraint forbids running Junior on glm-5. Non-Junior agents are analysis-only in this toolset.
- Hono auth app originally failed non-OAuth auth unit suites because eager import of `$lib/server/auth/oauth-providers` required missing `GITHUB_CLIENT_ID`; resolved by moving oauth provider import into GitHub handlers.
- Completed auth endpoint migration to `authApp` with full-path Hono routes and thin SvelteKit adapters forwarding `event.request` + `{ event }`, preserving existing response contracts for unit specs.
- E2E gotcha: browser `fetch(..., { redirect: 'manual' })` can produce `status === 0` for redirect responses, so OAuth initiation checks should assert simulated 302/location via deterministic route stubs rather than relying on fetch status.
- [HIGH][BLOCKING] `POST /api/auth/reset-password` trusts caller-controlled identity headers for admin authorization. `readMutationActor()` derives `canAdmin` from `x-yona-role` / `x-yona-can-admin` headers with no server-side session binding (`src/lib/server/git/auth.ts`), and the endpoint authorizes on that flag alone (`src/lib/server/hono/auth-app.ts`). The current UI even sends `x-yona-role: admin` directly (`src/routes/reset-password/+page.svelte`). This allows privilege escalation by crafted requests.
- [MEDIUM][NON-BLOCKING] CSRF helper exists but is not enforced by auth handlers: `validateCsrfToken()` has no runtime call-sites in auth routes, so session-issued CSRF tokens are currently informational only (`src/lib/server/auth/csrf.ts`, `src/lib/server/hono/auth-app.ts`).
- [MEDIUM][NON-BLOCKING] OAuth state checking in callback handlers uses direct string comparison (`state !== storedState`) instead of the constant-time helper; low practical exploitability but inconsistent with the hardened utility already present (`src/lib/server/hono/auth-app.ts`, `src/lib/server/auth/oauth.ts`).
- [LOW][NON-BLOCKING] No explicit rate limiting on OAuth start/callback endpoints (`/api/auth/github`, `/api/auth/google`, callbacks), so repeated initiation/callback abuse can still consume provider/API quota even though login/register/reset routes are limited.

- F1 compliance audit: `POST /api/auth/reset-password` in `src/lib/server/hono/auth-app.ts` gates on `actor.canAdmin`, but `actor` comes from client-controlled headers via `src/lib/server/git/auth.ts` and the browser UI in `src/routes/reset-password/+page.svelte` lets any user set `x-yona-role: admin`; as-is, password reset is not effectively admin-only.
- Minor UX drift: `src/routes/login/+page.svelte` links "Forgot password?" to `/reset-password` (admin tool) rather than `/forgot-password` (messaging + redirect).
- Resolved blocker: `POST /api/auth/reset-password` no longer trusts `x-yona-*` headers for admin auth; it now requires authenticated session and server-side admin allowlist (`YONA_ADMIN_USER_IDS`).
- Intermittent orchestration blocker: repeated `task()` retries for a one-line shell E2E update timed out without file changes; patch applied directly to unblock final verification.
- Compatibility caveat after CSRF hardening: login/register enforce token validation only when the anonymous CSRF cookie exists; direct API clients without that cookie (curl/scripts) are kept functional, but browser form entrypoints now always include and validate token headers.

- No new blockers from SMTP/reset endpoint behavior update; targeted reset-password unit suite passed with deterministic provider-mocking for success and 503 paths.
- No blockers found while completing OAuth token exchange utility: focused oauth unit spec and full build both passed in this worktree.
- Drizzle acceptance checks remain environment-blocked in this session: `bunx drizzle-kit push` and `bunx drizzle-kit studio` now read config but fail with `ECONNREFUSED 127.0.0.1:3307` because no reachable MySQL instance is running.
