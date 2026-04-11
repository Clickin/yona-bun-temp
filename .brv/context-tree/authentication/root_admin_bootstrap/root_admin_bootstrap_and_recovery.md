---
title: Root Admin Bootstrap and Recovery
tags: []
related: [authentication/better_auth_integration/better_auth_integration.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-05T12:06:19.594Z'
updatedAt: '2026-04-05T12:06:19.594Z'
---
## Raw Concept
**Task:**
Describe how the root admin bootstrap, recovery, and password reset lifecycle is orchestrated across database state, service APIs, CLI utilities, and the initial UI route.

**Changes:**
- Moved initialization state tracking into packages/db/src/root-admin.ts with explicit reserved root-admin validity.
- Introduced bootstrap_mutex in SQLite migrations to guard first-admin creation and capture metadata for recovery flows.
- Exposed CLI commands and UI route handlers that enforce state validation before allowing admin creation, recovery, or password resets.

**Files:**
- packages/db/src/root-admin.ts
- packages/auth/src/app-service.ts
- packages/auth/src/admin-cli.ts
- apps/app/src/routes/setup.first-admin.tsx
- drizzle/sqlite/migrations/20260405120036_daffy_wraith/migration.sql

**Flow:**
Startup reads initialization state -> fresh-uninitialized triggers createFirstRootAdmin inside mutex -> reserved loginId creation and mapping -> state becomes initialized; recovery paths require recovery-required state and either update reserved admin identity or recreate user -> CLI commands mask password input and reuse service flows -> password reset routes and tokens are governed by app service helpers and session invalidation.

**Timestamp:** 2026-04-05

**Author:** Authentication Team

## Narrative
### Structure
packages/db/src/root-admin.ts keeps InitializationState records with user counts and reserved root admin checks, while services in packages/auth/src/app-service.ts and CLI utilities share helpers to normalize identifiers, hash passwords, and mutate state within serialized mutations.

### Dependencies
Depends on better-auth integrations for password reset/verification, the bootstrap_mutex migration for guarding startup, and the UI route in apps/app/src/routes/setup.first-admin.tsx which only renders when the state is fresh-uninitialized.

### Highlights
Admin creation is blocked if general signups would create the reserved login id, recovery commands only work when the system reports recovery-required, CLI helpers read passwords from stdin, and the web route moves users to /login?setup=complete after creating the first admin.

### Rules
Rule 1: `/setup/first-admin` loader returns 404 unless initialization state resolves to fresh-uninitialized.
Rule 2: CLI commands `yona admin recover-root --password-stdin` and `yona admin reset-root-password --password-stdin` both require password input via stdin to proceed.

### Examples
Example CLI invocation: `yona admin recover-root --name "Lead Dev" --email admin@example.com --password-stdin` followed by supplying the password through stdin.

## Facts
- **initialization_state_enum**: InitializationState enumerates fresh-uninitialized, recovery-required, and initialized states. [project]
- **reserved_root_admin_login_id**: Reserved root admin login id "admin" is blocked from general user creation. [project]
- **password_reset_token_ttl**: PASSWORD_RESET_TOKEN_TTL_MS is set to 3600000 milliseconds (one hour). [environment]
- **bootstrap_mutex_table**: bootstrap_mutex table defines mutex_key as the primary key and updated_at defaults to null. [project]
