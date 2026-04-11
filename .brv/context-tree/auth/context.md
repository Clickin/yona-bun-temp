# Domain: auth

## Purpose
Capture Wave 2 authentication account UI decisions, TRPC procedures, and session handling conventions to keep account flows aligned.

## Scope
Included in this domain:
- readAuthUiCapabilities as the single UI capability source for account-related pages
- Login, register, forgot password, and reset password legacy form flows and their validation rules
- TRPC procedures managing authentication (signInWithPassword, registerWithPassword, request/completeReset, signOut, rotate tokens) and related helpers
- Environment flags and helpers that influence registration confirmation modes and social login availability
- Session projection shapes, rememberMe cookie persistence, and fallback BetterAuth tokens

Excluded from this domain:
- Non-account Wave 2 UI changes (landing pages, navigation parity)

## Ownership
Wave 2 Auth Team

## Usage
Use this domain for documenting authentication UI flows, TRPC safeguards, and session/cookie behaviors introduced in Wave 2.
