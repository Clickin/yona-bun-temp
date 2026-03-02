- Keep migration SQL aligned with legacy schema conventions in this repo (e.g., `varchar` columns often use `DEFAULT 'NULL'`, while text columns use `DEFAULT NULL`) to reduce drift between generated schema and manual migrations.
- Drizzle migration separators (`--> statement-breakpoint`) are required markers for statement splitting and should be preserved in hand-written migration files.
- Password and token helpers in this worktree can rely on WebCrypto (`crypto.subtle` + `crypto.getRandomValues`) without extra dependencies; URL-safe token storage works cleanly with base64url-encoded SHA-256 digests.
- Switched password hashing to `bcryptjs` for Bun compatibility, and kept the explicit DB `passwordSalt` meaningful by hashing and verifying `${password}:${salt}` with bcrypt.
- Email provider resolution should prioritize `NODE_ENV=development` over SMTP flags so local auth flows keep working, while production can distinguish `EMAIL_NOT_CONFIGURED` from `EMAIL_PROVIDER_NOT_IMPLEMENTED`.
- For unauthenticated auth entrypoints (`register`/`login`), a pragmatic CSRF baseline is to enforce same-host requests and only allow `Origin` when it matches the request origin; this preserves browser protection and keeps local curl-based verification possible.
- Minimal auth rate limiting can stay dependency-free with an in-memory `route + ip + minute` bucket map (5/min) plus opportunistic cleanup to cap memory.
- Auth API tests are easiest to stabilize by mocking `getDb` chain methods (`select().from().where().limit()`) and session helpers, validating endpoint behavior without requiring a real database.
- OAuth state and PKCE helpers can stay provider-agnostic by centering on WebCrypto only: random base64url values plus SHA-256-based challenge derivation.
- Constant-time string comparison is sufficient for state/challenge checks when both values are normalized to URL-safe ASCII tokens.
  Login form uses Svelte 5 $state runes for reactive form state, with generic error messages for security.
- Registration form mirrors login visual language, includes client-side validation (email, password length, password match), and redirects to login on success with query param hint.

- Admin password reset UI provides explicit admin auth fields (user ID, name, email) and sends x-yona-role: admin header since no admin session UI exists yet; this is a pragmatic interim solution for admin workflows.
- Keep auth E2E deterministic by asserting client-side validation first and stubbing auth API responses (especially OAuth redirect initiations) instead of relying on external providers or seeded DB state.
- Auth E2E for this worktree is most stable when success/error paths are validated through route stubs and request-shape assertions (payload + headers), while only lightweight real endpoint checks are kept for static contracts like unauthenticated session shape.
- Security review (F2): Session cookie posture is strong by default (`httpOnly`, `sameSite: 'lax'`, env-driven `secure`, max-age sync to DB expiry) and session invalidation paths are implemented in source (`deleteSessionByToken` on logout, `deleteAllSessionsByUserId` on admin password reset).
- Security review (F2): OAuth initiation/callback wiring correctly enforces state + verifier presence and clears temporary cookies on all invalid callback paths, while provider module import remains deferred inside handlers to avoid env-coupled startup failures.

- F1 compliance audit (auth scope): SvelteKit `+server.ts` auth endpoints are thin adapters to Hono (`src/routes/api/auth/*/+server.ts` -> `src/lib/server/hono/auth-app.ts`), and registration does not include email verification flows (no `verify-email` endpoints/UI found).
- Reset-password admin authorization should use `event.locals.session.userId` as the trust anchor and resolve admin eligibility server-side only (for now via `YONA_ADMIN_USER_IDS` allowlist), ignoring caller identity/role headers for privilege checks.
- Keep shell E2E assertions aligned with visible copy (`Sign in` on login page); brittle text expectations can break final F3 even when feature behavior is correct.
- CSRF enforcement for auth POST can stay minimal by using a two-tier trust anchor: session flows must match `event.locals.session.csrfToken`, while unauthenticated login/register only enforce CSRF when an anonymous double-submit cookie is present.
- A practical anonymous CSRF pattern for SvelteKit pages is `+page.server.ts` issuing a non-httpOnly `sameSite=lax` token cookie and returning the same token so SPA `fetch` calls can send `x-csrf-token` without adding dependencies.
- Route-stubbed auth E2E tests remain stable after CSRF hardening when assertions check request headers (`x-csrf-token`) instead of forcing payload shape changes.

- Reset-password handler can reuse the email provider abstraction safely by mapping `EmailNotConfiguredError` and `EmailProviderNotImplementedError` to HTTP 503 while keeping the password mutation and admin/CSRF guards unchanged.
- OAuth code exchange helper can stay provider-agnostic with a small provider config map (`client id/secret env names + token endpoint`) and a normalized return shape `{ accessToken, expiresIn, scope }` while still parsing both JSON and form-encoded token payloads.
- Adding `drizzle.config.ts` in the worktree removes the immediate Drizzle CLI config blocker; `drizzle-kit push/studio` now load schema correctly and fail only on DB connectivity.
- Coverage report generation in this repo requires `@vitest/coverage-v8`; once installed, `bun run test:unit -- --run --coverage` emits a full v8 coverage table.
