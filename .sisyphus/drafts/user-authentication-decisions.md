# User Authentication Decisions (Task 1)

## OAuth Library Decision

- **Selected library:** `auth.js` with `@auth/sveltekit` integration.
- **Why this choice:** It is a vetted OAuth/OpenID solution with first-class SvelteKit support, stable provider integrations for GitHub and Google, and built-in session/cookie primitives that reduce custom security-critical code.
- **Provider direction:** Use built-in GitHub and Google providers from the Auth.js ecosystem in a later implementation task. Do not implement custom OAuth flows.

## Session Storage Strategy

- **Single owner principle:** Auth.js will own session lifecycle to avoid split-brain behavior between multiple session systems.
- **Persistence direction:** Use a database-backed session strategy once the sessions table task lands; avoid in-memory session storage.
- **Compatibility note:** Existing identity tables (`n4user`, `userCredential`, `linkedAccount`, `email`) remain source-of-truth for user identity linkage.

## Cookie Security Settings

- Cookies remain `HttpOnly`.
- Cookies use `SameSite=Lax` by default to balance CSRF resistance and OAuth redirect flow reliability.
- Cookie `Secure` is enabled in production and disabled for local non-HTTPS development.
- Session cookie name and max age remain configurable via environment variables.

## SMTP and Email Capability Stance

- Authentication must remain enabled even when SMTP is unavailable or disabled.
- SMTP controls only outbound email capability (for example reset-password notifications).
- If SMTP is not configured, email send attempts fail fast with a typed error while auth sign-in/session operations continue to function.
- Development mode uses a log-only email provider to avoid accidental network sends.

## Password Reset Direction (Documented, Not Implemented Here)

- Password reset should support an **admin-driven, out-of-band** flow that does not require SMTP.
- One-time reset tokens/links can be generated and delivered through controlled manual channels when SMTP is not available.
- Full endpoint and UI implementation is explicitly deferred to later tasks.
