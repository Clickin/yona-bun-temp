---
children_hash: 7790720d9b4cb1232492c3c3da743769062e5dbfeb8ed9a11bd952e1982e3c2e
compression_ratio: 0.5537359263050153
condensation_order: 1
covers: [context.md, root_admin_bootstrap_and_recovery.md]
covers_token_total: 977
summary_level: d1
token_count: 541
type: summary
---
# root_admin_bootstrap Structural Summary

- **Overview**: Documents the full lifecycle of the reserved root admin account, spanning database state, service APIs, CLI utilities, and the initial `/setup/first-admin` route at the intersection of `authentication/root_admin_bootstrap`.
- **State Management** (`context.md`, `root_admin_bootstrap_and_recovery.md`):
  - `InitializationState` (fresh-uninitialized → recovery-required → initialized) lives in `packages/db/src/root-admin.ts`, tracking user counts and reserved admin validity.
  - `bootstrap_mutex` (SQLite migration `20260405120036_daffy_wraith`) serializes first-admin creation, capturing metadata via a mutex table keyed by `mutex_key`.
- **Service & CLI Coordination**:
  - Shared helpers in `packages/auth/src/app-service.ts` and `packages/auth/src/admin-cli.ts` normalize identifiers, hash passwords, enforce state transitions, and expose recovery/reset mutations.
  - CLI commands `yona admin recover-root --password-stdin` and `yona admin reset-root-password --password-stdin` read passwords from stdin and operate only when the respective initialization state permits them.
- **UI Gatekeeping**:
  - Route `apps/app/src/routes/setup.first-admin.tsx` renders only when state is `fresh-uninitialized`, blocking access otherwise and redirecting completed flows to `/login?setup=complete`.
- **Flows & Rules**:
  - Startup: read initialization state → acquire mutex → `createFirstRootAdmin` → create reserved login ID “admin” → mark state initialized.
  - Recovery paths require `recovery-required`, then either update the reserved identity or recreate the user via shared service helpers.
  - Password reset tokens (TTL = 3,600,000 ms) and session invalidation are governed by app service helpers plus better-auth password verification support.
  - Rule 1: `/setup/first-admin` loader 404 unless state fresh-uninitialized. Rule 2: recovery/reset CLI commands require `--password-stdin`.
- **Facts for Drill-down**:
  - Reserved login ID “admin” is blocked from general signups.
  - `PASSWORD_RESET_TOKEN_TTL_MS` equals one hour.
  - Mutex table uses `bootstap_mutex` with default-null `updated_at`.