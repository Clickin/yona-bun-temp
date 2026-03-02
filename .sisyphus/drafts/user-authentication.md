# Draft: User Authentication System

## Requirements (confirmed)

- Support 3 auth providers: GitHub OAuth, Google OAuth, Email/Password
- Session management: HttpOnly cookies (SvelteKit standard)
- Full auth flow: Login, Register, Forgot Password, Email Verification

## Technical Decisions

- Use existing Yona database schema (n4user, userCredential, linkedAccount, email)
- Session cookies for server-side session storage
- OAuth via @auth/core or Lucia for SvelteKit (to be confirmed)
- Password hashing: bcrypt or scrypt (legacy Yona uses passwordSalt field)
- Email verification: token-based flow using existing email.valid/token fields

## Research Findings

- Existing schema supports auth: n4user (loginId, password, email, token), userCredential, linkedAccount
- Current hooks.server.ts: Paraglide middleware only (no auth logic)
- Current login route: Placeholder page only
- Git mutation policy exists: src/lib/server/git/policy.ts (role-based access)
- No session middleware or auth route handlers exist

## Open Questions

- OAuth library: @auth/core vs Lucia vs custom OAuth flow?
- Session storage: In-memory vs database-backed sessions?
- Legacy Yona auth patterns: Should we mirror Yona Java auth exactly or modernize?

## Scope Boundaries

- INCLUDE: Session management, auth API routes, login/register/forgot UI, OAuth integration
- EXCLUDE: User profile management (separate phase), admin panels, API key auth
