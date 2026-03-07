Project context mirror for Yona:

## Canonical Source

- `SPEC.md` is the canonical execution spec.
- `docs/agents/*.md` are condensed agent-facing mirrors.
- The old `SvelteKit + Hono` direction is historical and should not be expanded except when extracting or deleting code during migration.

## Target Architecture

- One `TanStack Start + React + Bun` application.
- Internal app operations use `createServerFn`.
- External or protocol-sensitive surfaces use server routes.
- `Better Auth` is the auth framework, but Yona owns canonical identity, ACL, audit, and resource permission semantics.
- Session persistence in DB is forbidden. Baseline is in-memory with optional `Redis/Valkey` secondary storage.
- Runtime DB access is `Bun.SQL + Drizzle` with `PostgreSQL`, `MySQL/MariaDB`, and `SQLite` treated as first-class from the first implementation.
- Async notification/integration delivery runs inside the Bun process through a dedicated worker path.

## Package Direction

- Target ownership lives in `apps/app`, `packages/auth`, `packages/contracts`, `packages/db`, `packages/domain`, `packages/integrations`, `packages/i18n`, `packages/ui`, `packages/vcs`.
- Current `apps/web`, `packages/api`, `packages/core`, and `packages/infra` are transition assets and extraction sources.

## Import Rules

- Cross-package imports use `@yona/*`.
- New app-internal imports use `@app/*`.
- `@drizzle/*` is allowed during migration for shared schema/config access.
- Legacy `@web`, `$lib`, `$app`, `@core`, `@api`, `@infra` aliases may remain only inside untouched migration-era code and should not appear in new long-lived files.

## Execution Rules

- Start from the relevant `SPEC.md` section and matching `docs/agents/*` summary.
- Identify legacy Yona references before implementing a feature.
- Write failing Red tests before implementation.
- When writing schema or query code, explicitly account for PostgreSQL/MySQL/SQLite parity, especially around datetime, FTS, and raw SQL.
- Prefer official TanStack Start/Router/Query, Better Auth, Bun, and Drizzle documentation when framework behavior must be verified.
