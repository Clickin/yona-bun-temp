# User Authentication System (Updated - No Email Verification for Registration)

## TL;DR

> **Summary**: Implement authentication system with GitHub OAuth, Google OAuth, Email/Password login, session management, password reset (admin-only). Email verification NOT required for registration. Email used ONLY for password reset via admin. If SMTP not configured, auth system disabled.
> **Deliverables**: Session middleware, auth API routes, OAuth integration, login/register/reset-password UI, admin password reset dashboard
> **Effort**: Large
> **Parallel**: YES — 4 waves
> **Critical Path**: OAuth library decision → Session storage → Auth routes → Email service (dev-mode stub) → UI components

## Context

### Original Request

Implement user authentication system for Yona project with login, register, password reset, and support for GitHub OAuth, Google OAuth, Email/Password authentication.

### Interview Summary (Updated)

- Auth providers: GitHub OAuth, Google OAuth, Email/Password (all three required)
- Session strategy: HttpOnly session cookies (SvelteKit standard)
- **Scope**: Login, Register, Forgot Password (email verification NOT required for registration)
- **Critical clarification**: Email used ONLY for password reset; if SMTP not configured, auth system disabled; admin can reset user passwords; OAuth emails auto-verified; one n4user can have multiple OAuth providers

### Metis Review (gaps addressed)

- **Account linking policy**: OAuth logins auto-link to existing email accounts (one n4user can have multiple OAuth providers)
- **Session semantics**: Multi-device sessions, session revocation, TTL, rotation
- **Email verification**: NOT required for registration; email ONLY used for password reset; SMTP is optional (auth disabled if not configured)
- **Password reset**: Single-use tokens, TTL, invalidate all sessions; admin can reset any user's password
- **Deployment constraints**: HTTPS, subdomain requirements affecting cookie settings
- **Legacy migration boundary**: Keep existing Yona table/column names exactly
- **Email sending**: Provider interface with SMTP/SES/SendGrid; dev-mode console logging; SMTP not mandatory
- **Authorization scope**: Authn only (separate phase for authz)
- **OAuth security**: PKCE, state validation, redirect allowlist
- **Scope creep risk**: Authz, 2FA, device management, admin UI (exclude)

## Work Objectives

### Core Objective

A SvelteKit application with production-ready authentication supporting three providers (GitHub, Google, Email/Password), secure session management, password reset capability. Email verification NOT required for registration. If SMTP not configured, authentication system is disabled. Admin users can reset any user's password.

### Deliverables

- Session middleware in `src/hooks.server.ts` with HttpOnly cookie handling
- Auth API routes: `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/reset-password` (admin-only)
- OAuth callback routes: `/api/auth/callback/github`, `/api/auth/callback/google`
- UI components: Login form, Registration form, Forgot password (redirects to admin reset)
- Database migrations for session table (if using DB-backed sessions)
- Email sending interface with dev-mode console stub (SMTP/SES/SendGrid hooks for future)
- CSRF token generation and validation

### Definition of Done (verifiable)

```bash
# All commands succeed
bun run test:unit -- --run
bun run test:e2e
bun run build
bun run check

# Session verification
curl -i http://localhost:5173/api/auth/session
# Returns 200 with JSON; no session cookie for unauthenticated

# Registration flow (NO email verification)
curl -i -X POST http://localhost:5173/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!","name":"Test User"}'
# Returns 201 with session (direct login, no email verification)

# Login flow
curl -i -X POST http://localhost:5173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!"}'
# Returns 200; sets HttpOnly session cookie

# Admin password reset flow
curl -i -X POST http://localhost:5173/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -H "x-yona-role: admin" \
  -d '{"userId":123,"newPassword":"NewSecurePass456!"}'
# Returns 200 if admin, invalidates all sessions

# DB assertions
# - sessions table exists with proper indexes
# - linkedAccount table stores OAuth metadata (providerDisplayName, avatarUrl, providerUserId)
# - unique constraint on providerUserId+providerKey for multiple OAuth providers
```

### Must Have

- Use existing Yona database schema (`n4user`, `userCredential`, `linkedAccount`, `email`)
- HttpOnly session cookies with SameSite and Secure flags
- Password hashing (bcrypt) using legacy `passwordSalt` field or new approach
- OAuth state validation and PKCE for GitHub/Google
- CSRF protection for all POST endpoints
- Rate limiting on auth endpoints
- Audit logging for auth events
- **Admin password reset**: Allow admin users to reset any user's password
- **OAuth multi-provider**: One n4user can link multiple OAuth providers
- **SMTP optional**: If not configured, auth system disabled; no email sending
- **OAuth email auto-verified**: Provider email is considered verified automatically
- **No email verification for registration**: Direct login allowed

### Must NOT Have

- Email verification for registration (registration is direct login)
- Authorization/permission enforcement (separate phase)
- 2FA/TOTP implementation (separate phase)
- Device management UI (separate phase)
- Admin user management panels (separate phase)
- Profile management/updates (separate phase)
- Custom OAuth flow implementation (use vetted library)
- Session storage in-memory (not production-safe)
- "Remember me" functionality (separate phase)
- Password reset without admin role check (non-admins shouldn't be able to reset others' passwords)
- OAuth account confirmation prompts (auto-link allowed per user clarification)

## Verification Strategy

> ZERO HUMAN INTERVENTION — all verification is agent-executed.

- Test decision: tests-after using Vitest (unit) + Playwright (e2e)
- QA policy: Every task includes agent-executable curl/playwright scenarios
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.txt`

## Execution Strategy

### Parallel Execution Waves

> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.

**Wave 1 (Foundation)**

- Task 1: Decision & Setup - Choose OAuth library, configure SMTP interface (dev-mode stub)
- Task 2: Database schema - Add sessions table, OAuth metadata columns
- Task 3: Password utilities - Implement hashing, reset token generation, CSRF helpers
- Task 4: Email service - Provider interface with dev-mode console stub

**Wave 2 (API Core)**

- Task 5: Session middleware - Create session manager with HttpOnly cookies
- Task 6: Auth routes - Register/login/logout endpoints (NO email verification)
- Task 7: Admin password reset - Admin-only endpoint with session invalidation
- Task 8: OAuth utilities - PKCE implementation, callback validation

**Wave 3 (OAuth Integration)**

- Task 9: GitHub OAuth - Integration, state validation, account linking (auto-link, one n4user multiple providers)
- Task 10: Google OAuth - Integration, state validation, account linking (auto-link, one n4user multiple providers)

**Wave 4 (UI & E2E)**

- Task 11: Login UI - Email/password login form
- Task 12: Registration UI - Registration form (no email verification)
- Task 13: Admin password reset UI - Admin dashboard page
- Task 14: E2E auth flows - Playwright tests for all auth paths

### Dependency Matrix

- Task 1 blocks all other tasks (OAuth library decision)
- Task 2 blocks Task 5 (session needs session table)
- Task 3 blocks Tasks 6, 7, 8 (password utils needed)
- Task 4 blocks Task 7 (email service needed for reset password notification)
- Task 5 blocks Tasks 6, 7 (session middleware needed)
- Task 6 blocks Tasks 11-13 (UI needs API endpoints)
- Task 7, 8 block Tasks 11-13 (password reset and OAuth endpoints needed)
- Task 9, 10 block Tasks 11-13 (OAuth endpoints needed)
- Task 14 blocked by Tasks 6-13 (all flows must exist)

### Agent Dispatch Summary

- Wave 1: CODER (decision setup), CODER (schema), CODER (utils), CODER (email)
- Wave 2: CODER (middleware), CODER (auth routes), CODER (admin reset), CODER (OAuth utils)
- Wave 3: CODER (GitHub OAuth), CODER (Google OAuth)
- Wave 4: frontend-design (login UI), frontend-design (register UI), frontend-design (admin reset UI), TESTER (E2E)

## TODOs

> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. OAuth library decision and SMTP interface setup

  **What to do**:
  - Research and choose OAuth library: `@auth/sveltekit` (recommended for SvelteKit)
  - Decide session storage: Database-backed (for production persistence)
  - Configure environment variables for OAuth providers (GITHUB_CLIENT_ID, GITHUB_SECRET, GOOGLE_CLIENT_ID, GOOGLE_SECRET)
  - Document decision in `.sisyphus/drafts/user-authentication-decisions.md`
  - Set up cookie configuration: HttpOnly, Secure (true in prod), SameSite (Lax/Strict), Max-Age (from env)
  - Create email provider interface: stub for dev-mode (console.log), hooks for SMTP/SES/SendGrid
  - **CRITICAL**: Design system to work WITHOUT SMTP (dev-mode console.log only, production endpoints return error if not configured)

  **Must NOT do**:
  - Do not implement custom OAuth flow without vetted library
  - Do not use in-memory session storage
  - Do not proceed without documenting SMTP configuration approach

  **Recommended Agent Profile**:
  - Agent ID: `CODER` — Reason: Setup and configuration decisions

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: Task 2-10 | Blocked By: none

  **References**:
  - SvelteKit 5 docs: https://kit.svelte.dev/docs/authentication
  - @auth/sveltekit docs: https://authjs.dev/reference/sveltekit
  - Lucia docs: https://lucia-auth.com/
  - SMTP provider patterns: Nodemailer, AWS SES, SendGrid APIs

  **Acceptance Criteria**:
  - [x] OAuth library chosen and documented with rationale
  - [x] Session storage strategy decided (DB vs stateless)
  - [x] SMTP configuration approach documented (provider interface with dev-mode stub)
  - [x] Environment variable template created (`.env.example`)
  - [x] Cookie configuration documented (HttpOnly, Secure, SameSite)
  - [x] Email service stub created (dev-mode console logging)

  **QA Scenarios**:

  ```
  Scenario: Decision document exists
    Tool: Bash
    Steps:
      1) test -f .sisyphus/drafts/user-authentication-decisions.md
      2) cat .sisyphus/drafts/user-authentication-decisions.md
    Expected: File exists with library choice, session strategy, SMTP config, cookie settings
    Evidence: .sisyphus/evidence/task-1-decisions.txt

  Scenario: Env template exists
    Tool: Bash
    Steps:
      1) test -f .env.example
      2) grep -q "GITHUB_CLIENT_ID\\|GOOGLE_CLIENT_ID\\|SMTP" .env.example
    Expected: Env template with OAuth and SMTP provider variables
    Evidence: .sisyphus/evidence/task-1-env-template.txt
  ```

  **Commit**: YES | Message: `🔐 auth: choose OAuth library and configure SMTP interface` | Files: `.env.example`, `.sisyphus/drafts/user-authentication-decisions.md`

- [x] 2. Add database schema for sessions and OAuth metadata

  **What to do**:
  - Create `sessions` table with columns: id, userId, token (hashed), createdAt, expiresAt, ipAddress, userAgent
  - Add OAuth metadata columns to `linkedAccount` table: providerDisplayName, avatarUrl, providerUserId (for multi-provider support)
  - Create migration file using Drizzle Kit: `drizzle-kit generate`
  - Add indexes: sessions.userId (for revocation), sessions.token (for lookup), linkedAccount.providerUserId+providerKey (unique - multi-provider support)
  - Keep existing `n4user`, `userCredential`, `linkedAccount`, `email` table names (no renaming)

  **Must NOT do**:
  - Do not rename existing Yona tables or columns
  - Do not store OAuth access tokens in sessions table (use separate OAuth token storage if needed)
  - Do not store plaintext passwords or tokens

  **Recommended Agent Profile**:
  - Agent ID: `CODER` — Reason: Database schema migrations

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Task 5 | Blocked By: Task 1

  **References**:
  - Existing schema: `drizzle/schema.ts` (n4user, userCredential tables)
  - Drizzle migration pattern: `drizzle/migrations/` directory
  - Drizzle docs: https://orm.drizzle.team/docs/migrations

  **Acceptance Criteria**:
  - [x] Migration file generated with session table
  - [x] Migration file generated with linkedAccount enhancements (providerUserId, providerDisplayName, avatarUrl)

- [x] `drizzle-kit push` succeeds (or equivalent command)
- [x] Schema validates: `bun run drizzle-kit studio` works (or similar command)

  **QA Scenarios**:

  ```
  Scenario: Migration generated
    Tool: Bash
    Steps:
      1) ls -lt drizzle/migrations/ | head -1
      2) grep -q "CREATE TABLE.*sessions" drizzle/migrations/*.sql
    Expected: Latest migration file contains sessions table creation
    Evidence: .sisyphus/evidence/task-2-migration.txt

  Scenario: Schema validates
    Tool: Bash
    Steps:
      1) bun run drizzle-kit studio 2>&1 | head -5 || echo "Schema validated"
    Expected: No schema validation errors
    Evidence: .sisyphus/evidence/task-2-schema-validation.txt
  ```

  **Commit**: YES | Message: `🗄️ db: add sessions table and OAuth metadata` | Files: `drizzle/schema.ts`, `drizzle/migrations/*.sql`

- [x] 3. Implement password utilities and CSRF helpers

  **What to do**:
  - Create `src/lib/server/auth/password.ts` with:
    - `hashPassword(password: string, salt: string): Promise<string>` (bcrypt)
    - `verifyPassword(password: string, hash: string, salt: string): Promise<boolean>`
  - Create `src/lib/server/auth/tokens.ts` with:
    - `generateResetToken(): string` (crypto random 32 bytes, base64)
    - `hashToken(token: string): string` (SHA-256)
    - `verifyToken(token: string, hashedToken: string): boolean`
  - Create `src/lib/server/auth/csrf.ts` with:
    - `generateCsrfToken(): string` (crypto random)
    - `validateCsrfToken(token: string, session: Session): boolean`
  - Use Bun's built-in crypto module (not Node's crypto)
  - Add unit tests for all utilities in `src/lib/server/auth/*.spec.ts`

  **Must NOT do**:
  - Do not use legacy Yona password hashing if it's insecure
  - Do not store plaintext tokens in database
  - Do not create custom crypto primitives (use Web Crypto API or Bun crypto)

  **Recommended Agent Profile**:
  - Agent ID: `CODER` — Reason: Security-critical utilities

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Tasks 6-8 | Blocked By: Task 1

  **References**:
  - Bun crypto docs: https://bun.sh/docs/api/crypto
  - Existing auth utilities (for patterns only): Yona Java auth utilities
  - Password hashing best practices: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html

  **Acceptance Criteria**:
  - [x] Password hashing returns consistent hashes for same input
  - [x] Password verification returns false for wrong passwords
  - [x] Reset tokens are unique across generations
  - [x] CSRF tokens validate correctly against session
  - [x] All unit tests pass: `bun run test:unit -- --run src/lib/server/auth/*.spec.ts`

  **QA Scenarios**:

  ```
  Scenario: Password hashing consistent
    Tool: Vitest
    Steps:
      1) Run password hash tests
    Expected: Same password + salt produces same hash; different password produces different hash
    Evidence: .sisyphus/evidence/task-3-password-hash.txt

  Scenario: CSRF token validation
    Tool: Vitest
    Steps:
      1) Run CSRF token tests
    Expected: Invalid tokens rejected; valid tokens accepted
    Evidence: .sisyphus/evidence/task-3-csrf.txt
  ```

  **Commit**: YES | Message: `🔐 auth: add password hashing and CSRF utilities` | Files: `src/lib/server/auth/*.ts`, `src/lib/server/auth/*.spec.ts`

- [x] 4. Implement email service interface (dev-mode stub)

  **What to do**:
  - Create `src/lib/server/email/index.ts` with:
    - EmailProvider interface: sendResetPasswordEmail(to, token)
    - Dev-mode stub: Console.log email content, don't send (no SMTP)
    - Hooks for production providers: SMTP (Nodemailer), AWS SES, SendGrid
    - Create `src/lib/server/email/templates.ts` with:
    - Password reset template HTML/text
    - Design for future SES/SendGrid/SMTP integration (provider interface pattern)
    - **CRITICAL**: If SMTP not configured, email.send() should throw or reject requests

  **Must NOT do**:
  - Do not implement actual email sending in this phase (dev-mode stub only)
  - Do not hardcode email templates in route handlers
  - Do not send passwords in emails (security violation)

  **Recommended Agent Profile**:
  - Agent ID: `CODER` — Reason: Email infrastructure

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Task 7 | Blocked By: Task 1

  **References**:
  - Existing email table: `drizzle/schema.ts` (email table with token, valid columns)
  - Email template patterns: Transactional email best practices
  - Bun console logging: `console.log()` for dev-mode

  **Acceptance Criteria**:
  - [x] EmailProvider interface defined with send methods
  - [x] Dev-mode stub logs email content to console
  - [x] Production provider hooks defined (SMTP/SES/SendGrid)
  - [x] Password reset template includes reset link placeholder
  - [x] Email not configured check: Routes return error if SMTP missing

  **QA Scenarios**:

  ```
  Scenario: Email stub logs content
    Tool: Vitest
    Steps:
      1) Call sendResetPasswordEmail with test data in dev-mode
      2) Verify console.log was called (spy console)
    Expected: Email content logged with token included
    Evidence: .sisyphus/evidence/task-4-email-stub.txt

  Scenario: Email not configured rejects requests
    Tool: Vitest
    Steps:
      1) Mock SMTP as not configured
      2) Attempt to send reset password email
      3) Verify error is thrown
    Expected: Function throws EmailNotConfiguredError or similar
    Evidence: .sisyphus/evidence/task-4-not-configured.txt
  ```

  **Commit**: YES | Message: `📧 auth: add email service interface with dev-mode stub` | Files: `src/lib/server/email/*.ts`

- [x] 5. Create session middleware with HttpOnly cookies

  **What to do**:
  - Create `src/lib/server/auth/session.ts` with:
    - `Session` interface: userId, createdAt, expiresAt, csrfToken
    - `createSession(userId: bigint): Promise<Session>`
    - `getSession(token: string): Promise<Session | null>`
    - `destroySession(token: string): Promise<void>`
    - `destroyAllSessions(userId: bigint): Promise<void>`
  - Update `src/hooks.server.ts` to:
    - Add session extraction from cookie
    - Add `locals` session for route access
    - Add session validation for protected routes
    - Add CSRF token injection for forms
    - Configure cookie: HttpOnly=true, Secure=true (prod), SameSite=Lax, Max-Age (from env)
    - Create session helper: `$lib/server/auth/session-helper.ts` for easy route usage

  **Must NOT do**:
  - Do not store session data in client-accessible cookies (localStorage, etc.)
  - Do not create session without CSRF token
  - Do not set Secure=false in production (hard-code logic or env var)

  **Recommended Agent Profile**:
  - Agent ID: `CODER` — Reason: Session management (security-critical)

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: Tasks 6, 7 | Blocked By: Task 2

  **References**:
  - Existing hooks: `src/hooks.server.ts` (current Paraglide middleware only)
  - SvelteKit session docs: https://kit.svelte.dev/docs/load#cookies
  - CSRF protection patterns: OWASP CSRF Prevention Cheat Sheet
  - Session table schema: `drizzle/schema.ts` (from Task 2)

  **Acceptance Criteria**:
  - [x] Session created and stored in database
  - [x] Cookie contains session ID (not full session object)
  - [x] Cookie flags: HttpOnly, Secure, SameSite set correctly
  - [x] `locals.session` accessible in all routes
  - [x] Invalid/expired sessions rejected by middleware
  - [x] CSRF token injected for all protected routes

  **QA Scenarios**:

  ```
  Scenario: Session cookie is HttpOnly
    Tool: Bash
    Steps:
      1) curl -i -c cookies.txt -X POST http://localhost:5173/api/auth/login \
         -H "Content-Type: application/json" \
         -d '{"email":"test@example.com","password":"valid"}'
      2) grep -i "httponly" cookies.txt
    Expected: Cookie includes "HttpOnly" flag
    Evidence: .sisyphus/evidence/task-5-httponly.txt

  Scenario: Session expiration
    Tool: Vitest
    Steps:
      1) Create expired session via direct DB manipulation
      2) Attempt to access with expired session token
    Expected: Middleware rejects with 401/403
    Evidence: .sisyphus/evidence/task-5-session-expiry.txt
  ```

  **Commit**: YES | Message: `🔐 auth: add session middleware and HttpOnly cookies` | Files: `src/lib/server/auth/session.ts`, `src/hooks.server.ts`, `src/lib/server/auth/session-helper.ts`

- [x] 6. Implement register and login API routes (NO email verification)

  **What to do**:
  - Create `src/routes/api/auth/register/+server.ts` with:
    - POST handler accepting email, password, name
    - Validate input (email format, password strength, required fields)
    - Hash password using utility from Task 3
    - Insert into `n4user` table
    - **NO email verification** (per user requirements - direct login)
    - Create session using Task 5 utility
    - Set HttpOnly cookie with session ID
    - Return 200 with user data (excluding password/token)
    - Handle CSRF token validation
    - Add rate limiting (IP-based, 5 requests/minute)
    - Add audit logging for successful/failed attempts
    - Return generic error messages (no enumeration: "email not found" vs "invalid password")
  - Create `src/routes/api/auth/login/+server.ts` with:
    - POST handler accepting email, password
    - Validate input
    - Look up user by email from `n4user` table
    - Verify password hash using Task 3 utility
    - Create session using Task 5 utility
    - Set HttpOnly cookie
    - Return 200 with user data
    - Handle CSRF token validation
    - Add rate limiting
    - Add audit logging

  **Must NOT do**:
  - Do not leak user existence via error messages
  - Do not return password or sensitive data in response
  - Do not require email verification for login
  - Do not skip rate limiting

  **Recommended Agent Profile**:
  - Agent ID: `CODER` — Reason: Auth route handlers

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Tasks 11-13 | Blocked By: Task 3, Task 4, Task 5

  **References**:
  - User schema: `drizzle/schema.ts` (n4user table)
  - Password utilities: `src/lib/server/auth/password.ts` (from Task 3)
  - Session utilities: `src/lib/server/auth/session.ts` (from Task 5)
  - Email service: `src/lib/server/email/index.ts` (from Task 4)

  **Acceptance Criteria**:
  - [x] Register endpoint creates user in database
  - [x] Register endpoint creates session (no email verification)
  - [x] Login endpoint validates password correctly
  - [x] Login endpoint creates session and sets HttpOnly cookie
  - [x] Both endpoints enforce rate limiting
  - [x] Error messages do not leak user existence
  - [x] CSRF token validation works

  **QA Scenarios**:

  ```
  Scenario: Register new user (no email verification)
    Tool: Bash
    Steps:
      1) curl -i -X POST http://localhost:5173/api/auth/register \
         -H "Content-Type: application/json" \
         -d '{"email":"newuser@example.com","password":"SecurePass123!","name":"New User"}'
    Expected: Returns 201 with session (direct login, no email verification required)
    Evidence: .sisyphus/evidence/task-6-register.txt

  Scenario: Login with valid credentials
    Tool: Bash
    Steps:
      1) curl -i -X POST http://localhost:5173/api/auth/login \
         -H "Content-Type: application/json" \
         -d '{"email":"newuser@example.com","password":"SecurePass123!"}'
      2) grep "Set-Cookie" from response
    Expected: Returns 200; sets HttpOnly session cookie
    Evidence: .sisyphus/evidence/task-6-login.txt

  Scenario: Login with invalid credentials
    Tool: Bash
    Steps:
      1) curl -i -X POST http://localhost:5173/api/auth/login \
         -H "Content-Type: application/json" \
         -d '{"email":"newuser@example.com","password":"wrong"}'
      2) grep -i "error\\|unauthorized" response
    Expected: Returns 401 with generic error message
    Evidence: .sisyphus/evidence/task-6-invalid-login.txt

  Scenario: Rate limiting enforced
    Tool: Bash
    Steps:
      1) for i in {1..6}; do curl -X POST http://localhost:5173/api/auth/login \
           -H "Content-Type: application/json" \
           -d '{"email":"test@example.com","password":"test"}'; done
    Expected: 6th request returns 429 (rate limit exceeded)
    Evidence: .sisyphus/evidence/task-6-rate-limit.txt
  ```

  **Commit**: YES | Message: `🔐 auth: add register and login API endpoints` | Files: `src/routes/api/auth/register/+server.ts`, `src/routes/api/auth/login/+server.ts`

- [x] 7. Implement logout and admin password reset API routes

  **What to do**:
  - Create `src/routes/api/auth/logout/+server.ts` with:
    - POST handler
    - Extract session ID from cookie
    - Destroy session from database using Task 5 utility
    - Clear HttpOnly session cookie
    - Return 200
  - Create `src/routes/api/auth/reset-password/+server.ts` (ADMIN-ONLY) with:
    - POST handler accepting userId, newPassword, adminToken
    - Validate admin role (x-yona-role header from existing git policy)
    - Update user password in `n4user` table (hash new password)
    - **Invalidate ALL sessions** for target user using Task 5 utility
    - Send password reset notification email using Task 4 service (if SMTP configured)
    - Add audit logging for admin password reset events
    - Return 401 if not admin or invalid admin token
    - Add rate limiting (3 resets/hour per IP)
    - **CRITICAL**: If SMTP not configured, endpoint should return 503 with error message

  **Must NOT do**:
  - Do not allow password reset without admin role check
  - Do not allow non-admins to reset other users' passwords
  - Do not bypass CSRF protection
  - Do not invalidate sessions on logout without verifying session ID
  - Do not send email if SMTP not configured (return error instead)

  **Recommended Agent Profile**:
  - Agent ID: `CODER` — Reason: Auth security endpoints

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Tasks 11-13 | Blocked By: Task 3, Task 4, Task 5

  **References**:
  - Session utilities: `src/lib/server/auth/session.ts` (from Task 5)
  - Password utilities: `src/lib/server/auth/password.ts` (from Task 3)
  - Email service: `src/lib/server/email/index.ts` (from Task 4)
  - Git policy: `src/lib/server/git/policy.ts` (existing admin role checks)

  **Acceptance Criteria**:
  - [x] Logout destroys session and clears cookie
  - [x] Admin password reset validates admin role
  - [x] Admin password reset updates password and invalidates all sessions

- [x] Reset endpoint sends email notification if SMTP configured
  - [x] Reset endpoint returns error if SMTP not configured
  - [x] All sessions invalidated after password reset
  - [x] Rate limiting enforced on password reset

  **QA Scenarios**:

  ```
  Scenario: Logout clears session
    Tool: Bash
    Steps:
      1) Login to get session cookie
      2) curl -i -X POST http://localhost:5173/api/auth/logout \
         -H "Cookie: session=<cookie>"
      3) curl -i http://localhost:5173/api/auth/session \
         -H "Cookie: session=<cookie>"
    Expected: Session cookie cleared; /api/auth/session returns 401
    Evidence: .sisyphus/evidence/task-7-logout.txt

  Scenario: Admin password reset (with SMTP)
    Tool: Bash
    Steps:
      1) curl -i -X POST http://localhost:5173/api/auth/reset-password \
         -H "Content-Type: application/json" \
         -H "x-yona-role: admin" \
         -d '{"userId":123,"newPassword":"NewSecurePass456!"}'
      2) Verify email notification sent (if SMTP configured)
      3) curl -i http://localhost:5173/api/auth/session (target user) \
         -H "Cookie: <old-session>"
    Expected: Returns 200; all sessions invalidated
    Evidence: .sisyphus/evidence/task-7-admin-reset.txt

  Scenario: Admin password reset without SMTP
    Tool: Bash
    Steps:
      1) curl -i -X POST http://localhost:5173/api/auth/reset-password \
         -H "Content-Type: application/json" \
         -H "x-yona-role: admin" \
         -d '{"userId":123,"newPassword":"NewSecurePass456!"}'
    Expected: Returns 503 with SMTP not configured error
    Evidence: .sisyphus/evidence/task-7-no-smtp.txt
  ```

  **Commit**: YES | Message: `🔐 auth: add logout and admin password reset endpoints` | Files: `src/routes/api/auth/logout/+server.ts`, `src/routes/api/auth/reset-password/+server.ts`

- [x] 8. Implement OAuth utilities (PKCE, state validation)

  **What to do**:
  - Create `src/lib/server/auth/oauth.ts` with:
    - `generateOAuthState(): string` (crypto random for CSRF)
    - `validateOAuthState(state: string, storedState: string): boolean`
    - `generatePKCEVerifier(): { verifier: string, challenge: string }`
    - `validatePKCEChallenge(verifier: string, challenge: string): boolean`
    - `exchangeCodeForToken(provider: string, code: string, redirectUri: string): Promise<OAuthToken>`
    - Create `OAuthToken` interface: accessToken, expiresIn, scope
    - Add unit tests for all OAuth utilities
    - Create OAuth error types (standard OAuth error codes)

  **Must NOT do**:
  - Do not implement custom OAuth flow without library support
  - Do not skip state validation (CSRF risk)
  - Do not skip PKCE (security risk)
  - Do not store refresh tokens insecurely

  **Recommended Agent Profile**:
  - Agent ID: `CODER` — Reason: OAuth security utilities

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: none | Blocked By: Task 1

  **References**:
  - OAuth library decision: `.sisyphus/drafts/user-authentication-decisions.md` (from Task 1)
  - PKCE RFC: https://datatracker.ietf.org/doc/html/rfc7636
  - OAuth 2.0 spec: https://oauth.net/2/

  **Acceptance Criteria**:
  - [x] OAuth states are unique and unpredictable
  - [x] State validation rejects invalid states
  - [x] PKCE verifier and challenge generated correctly
  - [x] PKCE validation works correctly

- [x] Code exchange returns access token
  - [x] All unit tests pass

  **QA Scenarios**:

  ```
  Scenario: OAuth state uniqueness
    Tool: Vitest
    Steps:
      1) Generate 100 OAuth states
      2) Verify all states are unique
    Expected: No duplicate states
    Evidence: .sisyphus/evidence/task-8-oauth-state.txt

  Scenario: PKCE challenge validation
    Tool: Vitest
    Steps:
      1) Generate verifier and challenge
      2) Verify challenge matches SHA-256(verifier)
    Expected: Challenge matches SHA-256 encoding
    Evidence: .sisyphus/evidence/task-8-pkce.txt
  ```

  **Commit**: YES | Message: `🔐 auth: add OAuth utilities and PKCE helpers` | Files: `src/lib/server/auth/oauth.ts`, `src/lib/server/auth/oauth.spec.ts`

- [x] 9. Integrate GitHub OAuth (auto-link, multi-provider)

  **What to do**:
  - Configure GitHub OAuth app (Client ID, Secret, Redirect URI)
  - Create `src/routes/api/auth/github/+server.ts` with:
    - GET handler initiating OAuth flow
    - Generate OAuth state (CSRF protection) using Task 8 utility
    - Store state in session/temp storage
    - Generate PKCE code verifier and challenge
    - Redirect to GitHub authorization URL with proper scopes (user:email, read:user)
  - Create `src/routes/api/auth/callback/github/+server.ts` with:
    - GET handler receiving OAuth callback
    - Validate OAuth state parameter (CSRF protection)
    - Exchange authorization code for access token
    - Fetch GitHub user profile (email, name, avatar)
    - Check for existing `linkedAccount` record by providerUserId+providerKey
    - If exists: Use existing `n4user` ID (auto-link, one n4user multiple OAuth providers)
    - If not exists: Create new `n4user` + `linkedAccount` record
    - Create session using Task 5 utility
    - Set HttpOnly cookie
    - Redirect to application root with success/failure
    - Store OAuth metadata in `linkedAccount` table: providerDisplayName, avatarUrl, providerUserId
    - Implement PKCE for enhanced security

  **Must NOT do**:
  - Do not skip OAuth state validation (security risk)
  - Do not store OAuth access tokens in session or database (unless needed)
  - Do not require email verification for OAuth (auto-verified per user requirement)
  - Do not block OAuth if same email already exists (allow auto-link)

  **Recommended Agent Profile**:
  - Agent ID: `CODER` — Reason: OAuth integration

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: Tasks 11-13 | Blocked By: Task 1, Task 5, Task 8

  **References**:
  - OAuth library decision: `.sisyphus/drafts/user-authentication-decisions.md` (from Task 1)
  - Session utilities: `src/lib/server/auth/session.ts` (from Task 5)
  - Linked account schema: `drizzle/schema.ts` (linkedAccount table)
  - GitHub OAuth docs: https://docs.github.com/en/apps/oauth-apps
  - PKCE RFC: https://datatracker.ietf.org/doc/html/rfc7636

  **Acceptance Criteria**:
  - [x] GitHub OAuth initiation returns 302 redirect to GitHub
  - [x] OAuth callback validates state parameter
  - [x] Callback exchanges code for user profile
  - [x] Account created or linked correctly (auto-link if email exists)
  - [x] One n4user can have multiple OAuth providers
  - [x] Session created and HttpOnly cookie set
  - [x] OAuth metadata stored (providerDisplayName, avatarUrl, providerUserId)

  **QA Scenarios**:

  ```
  Scenario: GitHub OAuth initiation
    Tool: Bash
    Steps:
      1) curl -i "http://localhost:5173/api/auth/github"
      2) grep "location" response | grep "github.com"
    Expected: Returns 302 redirect to GitHub authorization URL
    Evidence: .sisyphus/evidence/task-9-github-initiate.txt

  Scenario: GitHub OAuth callback with valid state
    Tool: Bash
    Steps:
      1) curl -i "http://localhost:5173/api/auth/callback/github?code=valid&state=<valid-state>"
      2) grep "Set-Cookie" response
    Expected: Returns redirect; sets HttpOnly session cookie
    Evidence: .sisyphus/evidence/task-9-github-callback.txt

  Scenario: GitHub OAuth callback with invalid state
    Tool: Bash
    Steps:
      1) curl -i "http://localhost:5173/api/auth/callback/github?code=valid&state=invalid"
    Expected: Returns 400/403 with CSRF/state error
    Evidence: .sisyphus/evidence/task-9-github-invalid-state.txt

  Scenario: Auto-link existing account
    Tool: Bash
    Steps:
      1) Create n4user with email=test@example.com via register
      2) Login via GitHub OAuth with same email
      3) Verify only one n4user record exists
      4) Verify linkedAccount record exists for GitHub
    Expected: GitHub OAuth links to existing n4user (no new account created)
    Evidence: .sisyphus/evidence/task-9-auto-link.txt
  ```

  **Commit**: YES | Message: `🔐 auth: add GitHub OAuth integration` | Files: `src/routes/api/auth/github/+server.ts`, `src/routes/api/auth/callback/github/+server.ts`

- [x] 10. Integrate Google OAuth (auto-link, multi-provider)

  **What to do**:
  - Configure Google OAuth app (Client ID, Secret, Redirect URI)
  - Create `src/routes/api/auth/google/+server.ts` with:
    - GET handler initiating OAuth flow
    - Generate OAuth state (CSRF protection) using Task 8 utility
    - Store state in session/temp storage
    - Generate PKCE code verifier and challenge
    - Redirect to Google authorization URL with proper scopes (email, profile)
  - Create `src/routes/api/auth/callback/google/+server.ts` with:
    - GET handler receiving OAuth callback
    - Validate OAuth state parameter (CSRF protection)
    - Exchange authorization code for access token
    - Fetch Google user profile (email, name, picture)
    - Check for existing `linkedAccount` record by providerUserId+providerKey
    - If exists: Use existing `n4user` ID (auto-link, one n4user multiple OAuth providers)
    - If not exists: Create new `n4user` + `linkedAccount` record
    - Create session using Task 5 utility
    - Set HttpOnly cookie
    - Redirect to application root with success/failure
    - Store OAuth metadata in `linkedAccount` table: providerDisplayName, avatarUrl, providerUserId
    - Implement PKCE for enhanced security

  **Must NOT do**:
  - Do not skip OAuth state validation (security risk)
  - Do not store OAuth access tokens in session or database (unless needed)
  - Do not require email verification for OAuth (auto-verified per user requirement)
  - Do not block OAuth if same email already exists (allow auto-link)

  **Recommended Agent Profile**:
  - Agent ID: `CODER` — Reason: OAuth integration

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: Tasks 11-13 | Blocked By: Task 1, Task 5, Task 8

  **References**:
  - OAuth library decision: `.sisyphus/drafts/user-authentication-decisions.md` (from Task 1)
  - Session utilities: `src/lib/server/auth/session.ts` (from Task 5)
  - Linked account schema: `drizzle/schema.ts` (linkedAccount table)
  - Google OAuth docs: https://developers.google.com/identity/protocols/oauth2

  **Acceptance Criteria**:
  - [x] Google OAuth initiation returns 302 redirect to Google
  - [x] Google OAuth callback validates state parameter
  - [x] Callback exchanges code for user profile
  - [x] Account created or linked correctly (auto-link if email exists)
  - [x] One n4user can have multiple OAuth providers
  - [x] Session created and HttpOnly cookie set
  - [x] OAuth metadata stored (providerDisplayName, avatarUrl, providerUserId)

  **QA Scenarios**:

  ```
  Scenario: Google OAuth initiation
    Tool: Bash
    Steps:
      1) curl -i "http://localhost:5173/api/auth/google"
      2) grep "location" response | grep "accounts.google.com"
    Expected: Returns 302 redirect to Google authorization URL
    Evidence: .sisyphus/evidence/task-10-google-initiate.txt

  Scenario: Google OAuth callback with valid state
    Tool: Bash
    Steps:
      1) curl -i "http://localhost:5173/api/auth/callback/google?code=valid&state=<valid-state>"
      2) grep "Set-Cookie" response
    Expected: Returns redirect; sets HttpOnly session cookie
    Evidence: .sisyphus/evidence/task-10-google-callback.txt

  Scenario: Google OAuth callback with invalid state
    Tool: Bash
    Steps:
      1) curl -i "http://localhost:5173/api/auth/callback/google?code=valid&state=invalid"
    Expected: Returns 400/403 with CSRF/state error
    Evidence: .sisyphus/evidence/task-10-google-invalid-state.txt

  Scenario: Auto-link existing account
    Tool: Bash
    Steps:
      1) Create n4user with email=test2@example.com via register
      2) Login via Google OAuth with same email
      3) Verify only one n4user record exists
      4) Verify linkedAccount record exists for Google
    Expected: Google OAuth links to existing n4user (no new account created)
    Evidence: .sisyphus/evidence/task-10-auto-link.txt
  ```

  **Commit**: YES | Message: `🔐 auth: add Google OAuth integration` | Files: `src/routes/api/auth/google/+server.ts`, `src/routes/api/auth/callback/google/+server.ts`

- [x] 11. Implement login UI (Email/Password)

  **What to do**:
  - Update `src/routes/login/+page.svelte` to:
    - Create login form with email and password fields
    - Add "forgot password" link to `/reset-password`
    - Add "register" link to `/register`
    - Add CSRF token hidden field (injected from session)
    - Implement form submission with API call to `/api/auth/login`
    - Handle successful login: redirect to dashboard/home
    - Handle login failure: show error message
    - Add loading state during form submission
    - Use Tailwind CSS for styling
    - Follow design system tokens (Yona colors from shell)
    - Add input validation (client-side email format, password length)
    - Make responsive design (mobile-friendly)
    - Access session and CSRF token from page data ($page.data)

  **Must NOT do**:
  - Do not show "email not found" vs "invalid password" errors (use generic message)
  - Do not store password in localStorage or cookies
  - Do not implement social login UI yet (Tasks 9-10 add OAuth buttons later)
  - Do not bypass CSRF protection

  **Recommended Agent Profile**:
  - Agent ID: `frontend-design` — Reason: Login form UI

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: Task 14 | Blocked By: Task 6

  **References**:
  - Login API: `src/routes/api/auth/login/+server.ts` (from Task 6)
  - Existing shell: `src/routes/+layout.svelte` (Yona design tokens)
  - Tailwind CSS: Already in project

  **Acceptance Criteria**:
  - [x] Login form renders with email/password fields
  - [x] Form submission calls login API
  - [x] Successful login redirects to dashboard
  - [x] Failed login shows generic error
  - [x] CSRF token included in form
  - [x] Form uses Yona design system
  - [x] Forgot password and register links visible

  **QA Scenarios**:

  ```
  Scenario: Login form renders
    Tool: Playwright
    Steps:
      1) page.goto('/login')
      2) expect page.locator('input[type="email"]').toBeVisible()
      3) expect page.locator('input[type="password"]').toBeVisible()
    Expected: Email and password inputs visible
    Evidence: .sisyphus/evidence/task-11-login-form.png

  Scenario: Login with valid credentials
    Tool: Playwright
    Steps:
      1) page.goto('/login')
      2) fill email/password with valid test credentials
      3) click login button
      4) expect page.url()).toContain('/dashboard')
    Expected: Redirects to dashboard after login
    Evidence: .sisyphus/evidence/task-11-login-success.png

  Scenario: Login with invalid credentials
    Tool: Playwright
    Steps:
      1) page.goto('/login')
      2) fill email/password with invalid credentials
      3) click login button
      4) expect page.locator('text=Invalid credentials').toBeVisible()
    Expected: Shows generic error message
    Evidence: .sisyphus/evidence/task-11-login-error.png
  ```

  **Commit**: YES | Message: `✨ ui: add login form with email/password` | Files: `src/routes/login/+page.svelte`

- [x] 12. Implement registration UI (NO email verification)

  **What to do**:
  - Create `src/routes/register/+page.svelte` with:
    - Create registration form with email, password, name fields
    - Add password confirmation field
    - Add "login" link to `/login`
    - Add CSRF token hidden field
    - Implement form submission with API call to `/api/auth/register`
    - Handle successful registration: redirect to login with success message (direct login, no email verification)
    - Handle registration failure: show error message
    - Add loading state during form submission
    - Add client-side validation (email format, password strength, confirm password match)
    - Use Tailwind CSS with Yona design tokens
    - Make responsive design

  **Must NOT do**:
  - Do not create account without email verification (per user requirement: direct login allowed)
  - Do not require email verification (registration creates session immediately)
  - Do not bypass CSRF protection
  - Do not show whether email already exists (use generic error)

  **Recommended Agent Profile**:
  - Agent ID: `frontend-design` — Reason: Registration form UI

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: Task 14 | Blocked By: Task 6

  **References**:
  - Register API: `src/routes/api/auth/register/+server.ts` (from Task 6)
  - Existing shell: `src/routes/+layout.svelte` (Yona design tokens)
  - Tailwind CSS: Already in project

  **Acceptance Criteria**:
  - [x] Registration form renders with email/password/name/confirm-password fields
  - [x] Form submission calls register API
  - [x] Successful registration redirects to login with success
  - [x] Failed registration shows generic error
  - [x] CSRF token included in form
  - [x] Form uses Yona design system
  - [x] Password confirmation validation works

  **QA Scenarios**:

  ```
  Scenario: Registration form renders
    Tool: Playwright
    Steps:
      1) page.goto('/register')
      2) expect page.locator('input[type="email"]').toBeVisible()
      3) expect page.locator('input[type="password"]').toBeVisible()
      4) expect page.locator('input[name="confirm-password"]').toBeVisible()
    Expected: All registration inputs visible
    Evidence: .sisyphus/evidence/task-12-register-form.png

  Scenario: Register with valid data
    Tool: Playwright
    Steps:
      1) page.goto('/register')
      2) fill form with valid test data
      3) click register button
      4) expect page.url()).toContain('/login')
    Expected: Redirects to login with success message
    Evidence: .sisyphus/evidence/task-12-register-success.png

  Scenario: Register with weak password
    Tool: Playwright
    Steps:
      1) page.goto('/register')
      2) fill form with weak password (e.g., "123")
      3) click register button
      4) expect page.locator('text=Password too weak').toBeVisible()
    Expected: Shows password strength error
    Evidence: .sisyphus/evidence/task-12-weak-password.png
  ```

  **Commit**: YES | Message: `✨ ui: add registration form` | Files: `src/routes/register/+page.svelte`

- [x] 13. Implement admin password reset UI (redirects from forgot password)

  **What to do**:
  - Create `src/routes/reset-password/+page.svelte` (admin dashboard page) with:
    - Form with userId, newPassword, confirmPassword, adminToken fields
    - Add validation (admin role check, password strength, confirm match)
    - Display current admin status
    - Add CSRF token hidden field
    - Implement form submission with API call to `/api/auth/reset-password`
    - Handle successful reset: show success message
    - Handle failure: show error message
    - Add loading state during form submission
    - Add client-side validation
    - Use Tailwind CSS with Yona design tokens
    - Make responsive design
    - **Note**: This is an ADMIN dashboard page, not user-facing forgot password form
    - Update `src/routes/forgot-password/+page.svelte` to redirect to this admin page

  **Must NOT do**:
  - Do not allow non-admins to access this page (protected route with admin role check)
  - Do not bypass CSRF protection
  - Do not show which user's password was reset (security)

  **Recommended Agent Profile**:
  - Agent ID: `frontend-design` — Reason: Admin password reset UI

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: Task 14 | Blocked By: Task 7

  **References**:
  - Admin reset API: `src/routes/api/auth/reset-password/+server.ts` (from Task 7)
  - Existing shell: `src/routes/+layout.svelte` (Yona design tokens)
  - Tailwind CSS: Already in project
  - Admin role check pattern: `src/lib/server/git/policy.ts` (existing)

  **Acceptance Criteria**:
  - [x] Admin password reset form renders with userId/newPassword/confirmPassword fields
  - [x] Form submission calls admin reset API
  - [x] Successful reset shows success message
  - [x] Failed reset shows error message
  - [x] CSRF token included in form
  - [x] Form uses Yona design system
  - [x] Admin role validation works
  - [x] Password confirmation validation works

  **QA Scenarios**:

  ```
  Scenario: Admin password reset form renders
    Tool: Playwright
    Steps:
      1) Login as admin, then page.goto('/admin/reset-password')
      2) expect page.locator('input[name="userId"]').toBeVisible()
      3) expect page.locator('input[type="password"]').toBeVisible()
    Expected: All reset inputs visible
    Evidence: .sisyphus/evidence/task-13-reset-form.png

  Scenario: Admin reset with valid data
    Tool: Playwright
    Steps:
      1) Login as admin
      2) page.goto('/admin/reset-password')
      3) fill form with valid userId and new password
      4) click reset button
      5) expect page.locator('text=Password reset successfully').toBeVisible()
    Expected: Shows success message
    Evidence: .sisyphus/evidence/task-13-reset-success.png

  Scenario: Admin reset without admin role
    Tool: Playwright
    Steps:
      1) Login as non-admin, then page.goto('/admin/reset-password')
      2) fill form with valid data
      3) click reset button
      4) expect page.locator('text=Access denied').toBeVisible()
    Expected: Shows access denied error
    Evidence: .sisyphus/evidence/task-13-access-denied.png
  ```

  **Commit**: YES | Message: `✨ ui: add admin password reset page (with forgot-password redirect)` | Files: `src/routes/reset-password/+page.svelte`, `src/routes/forgot-password/+page.svelte`

- [x] 14. Create E2E tests for all auth flows

  **What to do**:
  - Create `e2e/auth-flows.test.ts` with Playwright tests covering:
    - Email/password registration flow (direct login, no email verification)
    - Email/password login flow (valid and invalid)
    - Forgot password flow (redirects to admin reset)
    - Logout flow
    - GitHub OAuth initiation and callback
    - Google OAuth initiation and callback
    - Admin password reset flow
    - Session expiration and CSRF rejection
    - Rate limiting enforcement
    - Use test data fixtures for consistent testing
    - Implement test database setup/teardown
    - Add assertions for all critical paths (happy paths and error cases)
    - Ensure tests can run in CI (headless mode)

  **Must NOT do**:
  - Do not require manual browser interaction during tests
  - Do not use hardcoded test data that relies on real OAuth providers
  - Do not skip error case tests (404, 401, 403, 429)
  - Do not create flaky tests with timing dependencies

  **Recommended Agent Profile**:
  - Agent ID: `TESTER` — Reason: E2E test coverage

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: none | Blocked By: Tasks 6-13

  **References**:
  - All auth API routes: `src/routes/api/auth/**/*server.ts` (from Tasks 6-7)
  - All auth UI pages: `src/routes/**/+page.svelte` (from Tasks 11-13)
  - Existing E2E auth tests: `src/lib/server/git/routes/git-routes-e2e.spec.ts` (in-repo vitest pattern calling +server handlers directly)

  **Acceptance Criteria**:
  - [x] All auth flows tested (register, login, logout, reset-password, OAuth)
  - [x] Both happy paths and error cases covered
  - [x] All tests pass: `bun run test:e2e`
  - [x] Tests run in CI without manual intervention

- [x] Test coverage report generated

  **QA Scenarios**:

  ```
  Scenario: Run all auth E2E tests
    Tool: Bash
    Steps:
      1) bun run test:e2e e2e/auth-flows.test.ts
    Expected: All tests pass (exit code 0)
    Evidence: .sisyphus/evidence/task-14-e2e-results.txt
  ```

  **Commit**: YES | Message: `🧪 test: add E2E auth flow tests` | Files: `e2e/auth-flows.test.ts`

## Final Verification Wave (4 parallel agents, ALL must APPROVE)

- [x] F1. Plan Compliance Audit — oracle (verify auth scope respected, no email verification for registration, admin-only password reset)
- [x] F2. Security Review — deep (verify CSRF, session security, OAuth state/PKCE, rate limiting, SMTP optional)
- [x] F3. Automated QA Run — unspecified-high (run all verification commands from Definition of Done)
- [x] F4. Real Manual QA — unspecified-high (+ Playwright manual testing of all auth flows)

## Commit Strategy

- Prefer 1 commit per TODO item (14 commits) for granular reviewability.
- For Tasks 9-10 (OAuth integration), consider 2-commit pattern per provider: 1) initiation routes, 2) callback routes.

## Success Criteria

- User can register with email/password and receive direct login (no email verification)
- User can login with email/password and receive HttpOnly session cookie
- User can request password reset via forgot password flow (redirects to admin reset)
- Admin can reset any user's password via admin dashboard
- User can login via GitHub OAuth and receive session
- User can login via Google OAuth and receive session
- One n4user can have multiple OAuth providers linked (GitHub + Google)
- User can logout and have session destroyed
- All auth endpoints enforce rate limiting and CSRF protection
- System works in dev-mode without SMTP (console logging only)
- All E2E tests pass for all auth flows
- `bun run test:unit`, `bun run test:e2e`, `bun run build`, `bun run check` all succeed
