# Monorepo Migration + In-Memory Sessions + Bun.SQL Multi-Dialect Drizzle (Full Schema Port)

## TL;DR

> **Summary**: Convert the current root-level SvelteKit repo into the AGENTS.md-style monorepo, refactor auth sessions to in-memory (redis later), and migrate DB access to Bun.SQL + Drizzle `bun-sql` with full schema parity across Postgres/MySQL/SQLite.
> **Deliverables**:
>
> - Monorepo layout: `apps/web`, `packages/api`, `packages/core`, `packages/infra`, `tools/*`
> - SessionStore port + in-memory implementation (no DB-backed sessions)
> - DB factory using `drizzle-orm/bun-sql` (`drizzle.postgres/mysql/sqlite`) selectable by env
> - Full schema port of current `drizzle/schema.ts` + `drizzle/relations.ts` to 3 dialect schema modules
> - Drizzle-kit configs + migrations per dialect + parity tests
>   **Effort**: XL
>   **Parallel**: YES - 6 waves
>   **Critical Path**: Monorepo move → session refactor → DB factory (bun-sql) → schema port (3 dialects) → migrations+parity tests → full test suite

## Context

### Original Request

- Use `AGENTS.md` as the project constitution, determine the next work package, refine via Q&A, then do deep review → execute.

### Interview Summary

- Repo layout: adopt monorepo (`apps/web`, `packages/*`, `tools/*`).
- Sessions: in-memory first; add redis/valkey later behind an abstraction.
- Git integration: keep `git` executable backend; explicitly **do not** build `packages/libgit2-ffi`.
- DB: migrate runtime to Bun.SQL now; provide Postgres/MySQL/SQLite schema parity concurrently.
- Schema scope: **full snapshot now** (port the entire current `drizzle/schema.ts` to 3 dialects).

### Metis Review (gaps addressed)

- Guardrails added: keep `bun run check`, `bun run test:unit`, `bun run test:e2e` runnable from repo root (or root scripts delegate).
- Remove silent DB URL fallbacks for drizzle-kit configs (avoid generating migrations against unintended DBs).
- Define an explicit schema parity bar (names, nullability, indices, FKs, timestamp semantics).
- Add missing integration coverage for session middleware contract (create → cookie → handle → session endpoint).

## Work Objectives

### Core Objective

- Align implementation with the intended architecture while preserving current behavior (auth + git routes + tests), and unlock multi-dialect DB portability using Bun.SQL.

### Deliverables

- Monorepo structure in-repo, with `apps/web` as the SvelteKit SSR app.
- `packages/api`: Hono type-contract API surface (auth + repo endpoints) consumed by `apps/web` route adapters.
- `packages/core`: ports + domain-facing interfaces (SessionStore, DbProvider, VcsService).
- `packages/infra`: Bun.SQL Drizzle drivers, schema modules, migrations wiring, in-memory session store, git executable backend.
- Multi-dialect schema + migration toolchain:
  - Schema: Postgres/MySQL/SQLite versions of _the full_ current snapshot.
  - Migrations: generated into dialect-specific directories.
  - Parity tests: validate table/column parity across dialect modules.

### Definition of Done (verifiable)

- `bun run check`
- `bun run test:unit -- --run`
- `bun run test:e2e`
- `bun run db:generate:all`
- `bun run db:migrate:sqlite && bun run db:smoke:sqlite`
- `bun run db:migrate:postgres && bun run db:smoke:postgres`
- `bun run db:migrate:mysql && bun run db:smoke:mysql`

### Must Have

- Session persistence moves off the DB: no `sessions` table reads/writes in runtime auth/session flow.
- DB runtime uses Bun SQL client (`import { SQL } from 'bun'`) via Drizzle `drizzle-orm/bun-sql`.
- All 3 dialect schema modules export the same table+column surface area.
- Existing auth + git API behavior remains compatible (tests green).

### Must NOT Have (guardrails)

- No libgit2 FFI work (`packages/libgit2-ffi` must not be created).
- No direct DB/Drizzle/VCS calls from SvelteKit UI/pages (keep infra behind packages).
- No silent environment fallbacks for migration generation.

## Verification Strategy

> ZERO HUMAN INTERVENTION — all verification is agent-executed.

- Test decision: **TDD** (Vitest first) + Playwright E2E.
- QA policy: Every TODO includes agent-executed happy-path + edge/failure scenario.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy

### Parallel Execution Waves

Wave 1: Contract locks + repo guardrails (tests + docs)
Wave 2: Monorepo move (file moves + root scripts delegating)
Wave 3: Package extraction (api/core/infra boundaries) + keep behavior green
Wave 4: SessionStore in-memory refactor + middleware contract tests
Wave 5: Bun.SQL MySQL runtime migration off mysql2 + relocate MySQL schema snapshot into `packages/infra`
Wave 6: Full multi-dialect schema+relations port + multi-dialect DB factory + migrations + parity + smoke tests (+ docs/CI)

### Dependency Matrix (high level)

- Wave 2 blocks all path-sensitive work.
- Wave 4 depends on Wave 3 (SessionStore lives in core/infra packages).
- Wave 5 depends on Wave 4 (session refactor must not be blocked by DB work).
- Wave 6 depends on Wave 5 (schema relocation + bun-sql mysql baseline).

### Agent Dispatch Summary

- Wave 1: unspecified-high ×2 (tests/docs)
- Wave 2: deep ×1 (monorepo move)
- Wave 3: deep ×2 (package extraction + API wiring)
- Wave 4: deep ×1 (sessions)
- Wave 5: deep ×1 (bun-sql mysql migration + schema relocation)
- Wave 6: ultrabrain ×1 (schema port) + deep ×1 (migrations + docker smoke) + writing ×1 (docs)

### Worktree Policy (per AGENTS.md)

- Each parallel task should run in its own `git worktree` (separate branch + directory) to avoid conflicts.
- Suggested worktree roots:
  - `worktrees/w1-docs/`
  - `worktrees/w2-monorepo-move/`
  - `worktrees/w3-packages/`
  - `worktrees/w4-sessions/`
  - `worktrees/w5-db-bunsql/`
  - `worktrees/w6-schema-port/`

## TODOs

> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have QA Scenarios.

- [x] 1. Document architecture overrides + parity bar (AGENTS/CLAUDE)

  **What to do**:
  - Update `AGENTS.md` to explicitly record project-level overrides decided in this planning session:
    - Monorepo adoption (`apps/web`, `packages/api|core|infra`, `tools/*`).
    - Sessions: in-memory default; redis/valkey later behind `SessionStore`.
    - Git backend: `git` executable is the chosen approach; **libgit2-ffi is out of scope**.
    - DB: Bun.SQL + Drizzle `drizzle-orm/bun-sql`; provide Postgres/MySQL/SQLite schema parity.
  - Define the schema parity bar in `AGENTS.md` (what must be identical across 3 dialect schema modules):
    - Table names + column names
    - Nullability
    - Indices/unique indices
    - Foreign keys and onDelete/onUpdate actions
    - Timestamp semantics: use Date at the TypeScript boundary (PG `timestamp`, MySQL `datetime`, SQLite `integer({ mode: 'timestamp' | 'timestamp_ms' })`).
  - Add citations:
    - Drizzle bun-sql multi-dialect context: `https://github.com/drizzle-team/drizzle-orm/issues/4937#issuecomment-3707293427`
    - Bun SQL supports postgres/mysql/sqlite and shows sqlite connection strings: `https://bun.com/docs/runtime/sql`
    - Bun SQL SQLite filename examples: `https://bun.com/reference/bun/SQL/SQLiteOptions/filename`
  - Mirror the same overrides in `CLAUDE.md` if that file is used as an agent-facing ruleset in this repo.

  **Must NOT do**:
  - Do not remove existing guardrails from `AGENTS.md`; add an explicit “override” section instead.
  - Do not commit `yona-original/` contents.

  **Recommended Agent Profile**:
  - Category: `writing`
  - Skills: []

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 3 | Blocked By: none

  **References**:
  - Constitution: `AGENTS.md`
  - Existing rules mirror: `CLAUDE.md`
  - Local proof (drizzle bun-sql exposes postgres/mysql/sqlite): `node_modules/drizzle-orm/bun-sql/driver.d.ts`
  - External: `https://github.com/drizzle-team/drizzle-orm/issues/4937#issuecomment-3707293427`
  - External: `https://bun.com/docs/runtime/sql`

  **Acceptance Criteria**:
  - [ ] `AGENTS.md` contains an explicit “Overrides / Decisions” section capturing the 4 bullets above.
  - [ ] `AGENTS.md` contains a “Schema parity bar” section enumerating parity requirements.

  **QA Scenarios**:

  ```
  Scenario: Docs contain required decisions
    Tool: Bash
    Steps:
      1) rg -n "Overrides|Decisions|Schema parity" AGENTS.md
    Expected: Section headings and decision bullets present
    Evidence: .sisyphus/evidence/task-1-docs-decisions.txt

  Scenario: Citations are included
    Tool: Bash
    Steps:
      1) rg -n "github.com/drizzle-team/drizzle-orm/issues/4937" AGENTS.md
      2) rg -n "bun.com/docs/runtime/sql" AGENTS.md
    Expected: Both citations appear at least once
    Evidence: .sisyphus/evidence/task-1-docs-citations.txt
  ```

  **Commit**: YES | Message: `docs(agents): document monorepo/db/session overrides` | Files: `AGENTS.md`, `CLAUDE.md`

- [x] 2. Make `yona-original/` a local-only read-only reference

  **What to do**:
  - Update `.gitignore` to ignore `yona-original/` (per AGENTS “Git Ignore target”).
  - Ensure no `yona-original/` files are staged/committed.
  - Add a short note in `AGENTS.md` that `yona-original/` is read-only reference and must never be modified by agents.

  **Must NOT do**:
  - Do not delete the folder; only ensure git ignores it.

  **Recommended Agent Profile**:
  - Category: `quick`
  - Skills: [`git-master`]

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 3 | Blocked By: none

  **References**:
  - Current ignore rules: `.gitignore`
  - Reference directory exists: `yona-original/`

  **Acceptance Criteria**:
  - [ ] `git status --porcelain` does not list `yona-original/` as untracked.
  - [ ] `.gitignore` includes `yona-original/`.

  **QA Scenarios**:

  ```
  Scenario: Git ignore works
    Tool: Bash
    Steps:
      1) git status --porcelain=v1
    Expected: No lines containing "yona-original/"
    Evidence: .sisyphus/evidence/task-2-gitignore-status.txt

  Scenario: Guardrail documented
    Tool: Bash
    Steps:
      1) rg -n "yona-original" AGENTS.md
    Expected: At least one line documenting read-only + gitignored
    Evidence: .sisyphus/evidence/task-2-agents-yona-original.txt
  ```

  **Commit**: YES | Message: `chore: ignore yona-original reference tree` | Files: `.gitignore`, `AGENTS.md`

- [x] 3. Monorepo migration: move current SvelteKit app to `apps/web` with root delegating scripts

  **What to do**:
  - Create workspace directories:
    - `apps/web/`
    - `packages/api/`, `packages/core/`, `packages/infra/`
    - `tools/` (empty placeholder is fine)
  - Convert repo root into a Bun workspace root:
    - Add `"workspaces": ["apps/*", "packages/*", "tools/*"]` to root `package.json`.
    - Root `package.json` becomes a thin workspace coordinator; root scripts delegate to `apps/web` via Bun filters:
      - Example: `"dev": "bun --filter ./apps/web dev"` (repeat for `check`, `test:unit`, `test:e2e`, `build`, `preview`, `test`)
    - Keep `bun.lock` at repo root (single lockfile for the entire workspace).
    - Bun caveat: when adding dependencies to a workspace package, use `bun add --cwd <workspace-path> ...` (do not rely on `bun add --filter`, which adds to root).
    - Create `apps/web/package.json` containing the current app dependencies/scripts.
  - Move the current SvelteKit app files into `apps/web/`:
    - `src/` → `apps/web/src/`
    - `static/` → `apps/web/static/`
    - `svelte.config.js` → `apps/web/svelte.config.js`
    - `vite.config.ts` → `apps/web/vite.config.ts`
    - `playwright.config.ts` → `apps/web/playwright.config.ts`
    - `e2e/` → `apps/web/e2e/`
    - `messages/` → `apps/web/messages/`
    - `project.inlang/` → `apps/web/project.inlang/`
    - `.env.example` stays at repo root; rely on Bun automatic env loading from repo root (avoid `--cwd` in root scripts). If deterministic env loading is needed, use Bun `--env-file`.
  - Update path-sensitive ignores to cover monorepo:
    - `.svelte-kit/`, `build/`, `test-results/`, `src/lib/paraglide` should be ignored under `apps/web/`.
  - Ensure root scripts still work by delegating:
    - `bun run dev` runs `apps/web` dev
    - `bun run check`, `bun run test:unit`, `bun run test:e2e`, `bun run test` work from repo root

  **Must NOT do**:
  - Do not change runtime behavior in this task beyond what is required to keep the app working after moves.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`git-master`]

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 4, 5, 6, 7, 8, 9, 10, 11+ | Blocked By: 1, 2

  **References**:
  - Current app entrypoints:
    - `src/hooks.server.ts`
    - `src/routes/+layout.svelte`
    - `src/lib/server/hono/auth-app.ts`
  - Current test wiring:
    - `vite.config.ts`
    - `playwright.config.ts`
    - `e2e/shell.test.js`
  - Current i18n wiring:
    - `project.inlang/settings.json`
    - `src/hooks.server.ts`
  - Bun workspaces (package.json `workspaces`): `https://bun.sh/docs/pm/workspaces`
  - Bun filter/workspaces flags (`--filter`, `--workspaces`, `--cwd`, `--env-file`): `https://bun.com/docs/pm/filter`

  **Acceptance Criteria**:
  - [ ] From repo root: `bun run check`
  - [ ] From repo root: `bun run test:unit -- --run`
  - [ ] From repo root: `bun run test:e2e`
  - [ ] From repo root: `bun run build` and `bun run preview` serve the app

  **QA Scenarios**:

  ```
  Scenario: All scripts work from repo root after move
    Tool: Bash
    Steps:
      1) bun run check
      2) bun run test:unit -- --run
      3) bun run test:e2e
    Expected: All commands exit 0
    Evidence: .sisyphus/evidence/task-3-root-scripts-green.txt

  Scenario: Preview serves a page
    Tool: Bash
    Steps:
      1) bun run build
      2) bun run preview --port 4173 &
      3) curl -sf "http://127.0.0.1:4173/" > /dev/null
    Expected: curl exits 0 (HTTP 200)
    Evidence: .sisyphus/evidence/task-3-preview-curl.txt

  Scenario: Shell E2E still passes
    Tool: Bash
    Steps:
      1) bun run test:e2e -- --project=chromium e2e/shell.test.*
    Expected: Test passes
    Evidence: .sisyphus/evidence/task-3-e2e-shell.txt
  ```

  **Commit**: YES | Message: `refactor(monorepo): move web app to apps/web` | Files: repo-wide moves + `package.json`

- [x] 4. Create `packages/core` ports (SessionStore, DbProvider, VcsService) and wire workspace deps

  **What to do**:
  - Create `packages/core/package.json` (name: `@yona/core`, `type: module`).
  - Add TypeScript config for `packages/core` and build-less dev usage (tsconfig references are fine).
  - Define ports in `packages/core/src/ports/`:
    - `SessionStore` interface (create/get/delete, deleteAllByUserId, TTL semantics).
    - `DbDialect` type: `'postgres' | 'mysql' | 'sqlite'`.
    - `DbProvider` interface returning a Drizzle db handle for the selected dialect (can be `unknown`/generic to avoid over-tight typing during migration).
    - `VcsService` port interface (wrap existing git-exec behaviors).
  - Export these ports from `packages/core/src/index.ts`.
  - Update `apps/web/package.json` to depend on workspace packages:
    - `@yona/core`, `@yona/api`, `@yona/infra` as `workspace:*`.
  - Update `apps/web/vite.config.ts` to ensure SvelteKit SSR bundles workspace packages:
    - Add `ssr.noExternal = ['@yona/core', '@yona/api', '@yona/infra']`
  - No behavior change in this task.

  **Must NOT do**:
  - Do not move existing implementations yet.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: []

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 7, 8, 9, 10, 11+ | Blocked By: 3

  **References**:
  - Existing session API surface to match:
    - `apps/web/src/lib/server/auth/session.ts`
    - `apps/web/src/lib/server/auth/session-helper.ts`
  - Existing git backend surface to match:
    - `apps/web/src/lib/server/git/index.ts`

  **Acceptance Criteria**:
  - [ ] `bun run check`
  - [ ] `bun run test:unit -- --run`

  **QA Scenarios**:

  ```
  Scenario: Workspace compiles with new packages
    Tool: Bash
    Steps:
      1) bun run check
      2) bun run test:unit -- --run
    Expected: Both commands exit 0
    Evidence: .sisyphus/evidence/task-4-packages-core-green.txt

  Scenario: Exports exist
    Tool: Bash
    Steps:
      1) rg -n "export.*SessionStore" packages/core/src
    Expected: SessionStore is exported via packages/core/src/index.ts
    Evidence: .sisyphus/evidence/task-4-core-exports.txt
  ```

  **Commit**: YES | Message: `feat(core): add ports for sessions/db/vcs` | Files: `packages/core/**`, `apps/web/package.json`

- [x] 5. Extract git executable backend into `packages/infra` (no behavior change)

  **What to do**:
  - Create `packages/infra/package.json` (name: `@yona/infra`, `type: module`).
  - Move git backend implementation from `apps/web/src/lib/server/git/**` to `packages/infra/src/git/**`.
  - Keep the public surface compatible by exporting the same functions:
    - `cloneRepository`, `fetchRepository`, `initBareRepository`, `runGit`, `handleSmartHttpRequest`, etc.
  - Update SvelteKit route handlers to import from `@yona/infra` instead of `$lib/server/git/*`.
  - Update Vitest tests that import git modules accordingly.

  **Must NOT do**:
  - Do not change any git behavior (paths, env vars, headers, actor auth); only relocate and rewire.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`git-master`]

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 6, 8, 11+ | Blocked By: 3, 4

  **References**:
  - Route patterns to preserve:
    - `apps/web/src/routes/api/repos/[repoId]/smart-http/[...gitPath]/+server.ts`
    - `apps/web/src/routes/api/repos/[repoId]/bootstrap/+server.ts`
    - `apps/web/src/routes/api/repos/[repoId]/files/+server.ts`
    - `apps/web/src/routes/api/repos/[repoId]/inline-edit/+server.ts`
  - Backend implementation to move:
    - `apps/web/src/lib/server/git/http-backend.ts`
    - `apps/web/src/lib/server/git/executable.ts`
  - Existing tests:
    - `apps/web/src/lib/server/git/routes/git-routes-e2e.spec.ts`

  **Acceptance Criteria**:
  - [ ] `bun run test:unit -- --run` passes (git route tests included)
  - [ ] `bun run test:e2e` passes

  **QA Scenarios**:

  ```
  Scenario: Git unit/E2E-in-unit tests still pass
    Tool: Bash
    Steps:
      1) bun run test:unit -- --run src/lib/server/git/routes/git-routes-e2e.spec.ts
    Expected: Test passes
    Evidence: .sisyphus/evidence/task-5-git-unit-e2e.txt

  Scenario: Smart HTTP endpoint still works in preview
    Tool: Bash
    Steps:
      1) bun run build
      2) bun run preview --port 4173 &
      3) curl -i "http://127.0.0.1:4173/api/repos/test-repo/smart-http/info/refs?service=git-upload-pack"
    Expected: Status is one of 200/401/403/404; never 500
    Evidence: .sisyphus/evidence/task-5-smart-http-smoke.txt
  ```

  **Commit**: YES | Message: `refactor(infra): move git-exec backend into packages/infra` | Files: `packages/infra/src/git/**`, `apps/web/src/routes/api/repos/**`, updated imports

- [x] 6. Move Hono apps into `packages/api` and make SvelteKit `/api/**` adapters forward to them

     **What to do**:
  - Create `packages/api/package.json` (name: `@yona/api`, `type: module`).
  - Move auth Hono app to `packages/api/src/auth/auth-app.ts` (from `apps/web/src/lib/server/hono/auth-app.ts`).
  - Create a new repo/git Hono sub-app that exposes the existing `/api/repos/...` endpoints:
    - bootstrap
    - files
    - inline-edit
    - smart-http
  - Export a single top-level Hono app (type-contract surface) from `packages/api/src/index.ts`.
  - In `apps/web/src/routes/api/**/+server.ts`, reduce each route handler to a thin forwarder calling `apiApp.fetch(event.request, { event })`.
  - Keep auth JSON shapes and status codes unchanged.

  **Must NOT do**:
  - Do not move DB/session implementation into `packages/api` (API should call ports/usecases only).

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: []

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 7, 8, 9 | Blocked By: 3, 4, 5

  **References**:
  - Existing auth Hono app behavior:
    - `apps/web/src/lib/server/hono/auth-app.ts`
  - Existing route adapters:
    - `apps/web/src/routes/api/auth/**/+server.ts`
  - Existing repo routes to preserve:
    - `apps/web/src/routes/api/repos/[repoId]/**/+server.ts`

  **Acceptance Criteria**:
  - [ ] `bun run test:unit -- --run` passes (auth route tests included)
  - [ ] `bun run test:e2e` passes

  **QA Scenarios**:

  ```
  Scenario: Auth unit tests pass after move
    Tool: Bash
    Steps:
      1) bun run test:unit -- --run src/routes/api/auth/login.spec.ts
      2) bun run test:unit -- --run src/routes/api/auth/register.spec.ts
    Expected: Tests pass
    Evidence: .sisyphus/evidence/task-6-auth-unit-tests.txt

  Scenario: Repo endpoints still respond
    Tool: Bash
    Steps:
      1) bun run build
      2) bun run preview --port 4173 &
      3) curl -i "http://127.0.0.1:4173/api/repos/demo/bootstrap" -X POST
    Expected: Status is one of 400/401/403/404; never 500
    Evidence: .sisyphus/evidence/task-6-repo-bootstrap-smoke.txt
  ```

  **Commit**: YES | Message: `refactor(api): extract hono apps into packages/api` | Files: `packages/api/**`, `apps/web/src/routes/api/**`
  |- [x] 7. Refactor sessions to in-memory and remove DB dependency (NO sessions table in dialects)

**Decision (yona-original analysis)**: Sessions table in yona-original DOES NOT EXIST. Yona-original uses Play Framework's cookie-based session storage (PLAY_SESSION). See evidence in `.sisyphus/drafts/plan-review-monorepo-sessions-bunsql-multidialect.md`.

**What to do** (UPDATED per analysis):

- **REMOVE sessions table from ALL dialect schemas** (Tasks 10, 11, 12, 13):
  - Task 10: Do NOT include sessions table in `packages/infra/src/db/schema/mysql.ts`
  - Task 11: Do NOT include sessions table in `packages/infra/src/db/schema/postgres.ts`
  - Task 12: Do NOT include sessions table in `packages/infra/src/db/schema/sqlite.ts`
  - Task 13: Remove sessions relations from all relations files
- **ADD migration to DROP sessions table** if it exists:
  - Create migration file: `drizzle/migrations/<timestamp>_drop_sessions.sql`
  - Content: `DROP TABLE IF EXISTS sessions;`
  - Include in all dialect migration directories
- **Document decision in AGENTS.md**:
  - "Yona used Play Framework in-memory sessions (cookie-based via PLAY_SESSION)"
  - "Sessions table added during migration work, NOT from yona-original"
  - "Sessions table removed in this port; runtime uses in-memory SessionStore"
- **Alternative for scalability**: Add Redis/Valkey session store later (as mentioned in AGENTS.md)

**Must NOT do**:

- Do not read/write DB `sessions` table in runtime auth/session flow.

  **What to do**:
  - Implement `SessionStore` in-memory backend in `packages/infra/src/session/in-memory-session-store.ts`:
    - Keyed by `tokenHash` (never store raw token as the map key).
    - Store: `{ userId, csrfToken, expiresAt }`.
    - Lazy expiry cleanup on reads + bounded size guard:
      - Hard cap: `MAX_SESSIONS = 10_000`
      - Eviction policy when cap exceeded: delete all expired sessions first; if still over, evict oldest-inserted sessions until under cap.
    - Support `deleteAllByUserId(userId)` efficiently (maintain reverse index userId → tokenHash set).
    - Test isolation: export a test-only reset hook (e.g., `resetForTests()` or `__resetSessionStoreForTests()`) so Vitest runs don't leak state.
  - Replace DB-backed session functions with store-backed ones (keep public API stable for callers):
    - `createSession`, `getSessionByToken`, `deleteSessionByToken`, `deleteAllSessionsByUserId`
  - Update session middleware to use the new store-backed functions:
    - `apps/web/src/hooks.server.ts` currently uses `handleSession` from `$lib/server/auth/session-helper`.
  - Preserve cookie behavior:
    - `AUTH_SESSION_COOKIE_NAME`, `AUTH_SESSION_COOKIE_MAX_AGE`, `AUTH_SESSION_COOKIE_SECURE` remain supported.
  - Add an integration-style Vitest spec that locks the contract:
    - Create a session → set cookie → run `handleSession` → call `GET /api/auth/session` and assert non-null session.
    - Expired session clears cookie and returns `{ session: null }`.
    - Simulated restart (SessionStore reset) clears cookie and returns `{ session: null }`.

  **Must NOT do**:
  - Do not read/write the DB `sessions` table at runtime.
  - Do not change auth endpoint response shapes.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: []

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: 8, 9, 10+ | Blocked By: 4, 6

  **References**:
  - Existing session logic to replace:
    - `apps/web/src/lib/server/auth/session.ts`
    - `apps/web/src/lib/server/auth/session-helper.ts`
  - Existing tests to update/extend:
    - `apps/web/src/lib/server/auth/session.spec.ts`
    - `apps/web/src/routes/api/auth/session.spec.ts`

  **Acceptance Criteria**:
  - [ ] `bun run test:unit -- --run`
  - [ ] `bun run test:e2e`
  - [ ] Grep check: no runtime code reads/writes the DB `sessions` table in the auth session lifecycle

  **QA Scenarios**:

  ```
  Scenario: Session middleware contract works
    Tool: Bash
    Steps:
      1) bun run test:unit -- --run src/lib/server/auth/session-store.integration.spec.ts
    Expected: Test passes (create→cookie→handle→session endpoint; expiry clears)
    Evidence: .sisyphus/evidence/task-7-sessionstore-integration.txt

  Scenario: No DB sessions table usage remains in runtime auth flow
    Tool: Bash
    Steps:
      1) ! rg -n "\b(insert|delete|select)\(sessions\)\b|\bfrom\(sessions\)\b" apps/web/src packages --glob '!**/*.{spec,test}.ts' --glob '!**/db/schema/**' --glob '!**/drizzle/**'
      2) ! rg -n "import\s*\{[^}]*\bsessions\b[^}]*\}\s*from" apps/web/src packages --glob '!**/*.{spec,test}.ts' --glob '!**/db/schema/**' --glob '!**/drizzle/**'
    Expected: No matches
    Evidence: .sisyphus/evidence/task-7-no-db-sessions.txt
  ```

  **Commit**: YES | Message: `refactor(auth): move sessions to in-memory SessionStore` | Files: session modules + new tests

- [ ] 8. Migrate MySQL DB runtime off `mysql2` to Bun.SQL + Drizzle `bun-sql` (mysql driver)

  **What to do**:
  - Replace `drizzle-orm/mysql2` usage with `drizzle-orm/bun-sql` MySQL driver:
    - Use `import { drizzle } from 'drizzle-orm/bun-sql'` and call `drizzle.mysql(...)`.
  - Keep `YONA_DB_URL` env var but remove any “silent fallback URL” defaults in production code paths.
  - Ensure existing query code remains dialect-agnostic (no MySQL-specific SQL fragments).
  - Update any direct `mysql2` dependency usage (should become unused).

  **Must NOT do**:
  - Do not introduce Postgres/SQLite runtime switching yet (that comes after schema port).

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: []

  **Parallelization**: Can Parallel: NO | Wave 5 | Blocks: 9, 10+ | Blocked By: 7

  **References**:
  - Current DB client:
    - `apps/web/src/lib/server/db.ts`
  - Current schema snapshot (MySQL):
    - `drizzle/schema.ts` (pre-monorepo)
  - Drizzle bun-sql MySQL types:
    - `node_modules/drizzle-orm/bun-sql/mysql/driver.d.ts`
  - Bun SQL docs:
    - `https://bun.com/docs/runtime/sql`

  **Acceptance Criteria**:
  - [ ] `bun run check`
  - [ ] `bun run test:unit -- --run`

  **QA Scenarios**:

  ```
  Scenario: Unit test suite remains green after DB driver swap
    Tool: Bash
    Steps:
      1) bun run test:unit -- --run
    Expected: Exit 0
    Evidence: .sisyphus/evidence/task-8-db-driver-swap-tests.txt

  Scenario: No mysql2 driver remains in runtime code
    Tool: Bash
    Steps:
      1) ! rg -n "drizzle-orm/mysql2|from 'mysql2'|require\('mysql2'\)" apps/web/src packages
    Expected: No matches
    Evidence: .sisyphus/evidence/task-8-no-mysql2-imports.txt
  ```

  **Commit**: YES | Message: `refactor(db): use drizzle bun-sql mysql driver` | Files: db client + updated deps

- [ ] 9. Add multi-dialect DB factory (postgres/mysql/sqlite) using `drizzle-orm/bun-sql`

  **What to do**:
  - Introduce `YONA_DB_DIALECT` env var with allowed values: `postgres`, `mysql`, `sqlite`.
  - Implement a single DB factory in `packages/infra/src/db/db.ts`:
    - Reads `YONA_DB_DIALECT` and `YONA_DB_URL`.
    - For `postgres`: `drizzle.postgres(url, { schema: schemaPostgres })`
    - For `mysql`: `drizzle.mysql(url, { schema: schemaMysql, mode: 'default' })`
    - For `sqlite`: `drizzle.sqlite(url, { schema: schemaSqlite })`
  - Default behavior:
    - If `YONA_DB_DIALECT` is missing: default to `sqlite`.
    - If `YONA_DB_URL` is missing and dialect is sqlite: default to `sqlite://./.yona-data/yona.db`.
    - Otherwise: throw a clear error (no silent fallback).
  - Update call sites to import DB via `@yona/infra` only.

  **Must NOT do**:
  - Do not allow “mysql URL but postgres dialect” mismatches; validate URL scheme matches the dialect using Bun.SQL URL rules:
    - `postgres`: URL must start with `postgres://` or `postgresql://`
    - `mysql`: URL must start with `mysql://` or `mysql2://`
    - `sqlite`: URL must be one of:
      - `:memory:`
      - starts with `sqlite://` or `sqlite:`
      - starts with `file://` or `file:`

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: []

  **Parallelization**: Can Parallel: NO | Wave 6 | Blocks: 15, 16 | Blocked By: 8, 10, 11, 12, 13, 14

  **References**:
  - Bun SQL driver provides dialect-specific drizzle entrypoints:
    - `node_modules/drizzle-orm/bun-sql/driver.d.ts`
  - Bun SQL URL examples:
    - `https://bun.com/docs/runtime/sql`
    - `https://bun.com/reference/bun/SQL/SQLiteOptions/filename`

  **Acceptance Criteria**:
  - [ ] `bun run check`
  - [ ] `bun run test:unit -- --run`
  - [ ] A new unit test verifies dialect selection + URL validation

  **QA Scenarios**:

  ```
  Scenario: Dialect selection validation
    Tool: Bash
    Steps:
      1) bun run test:unit -- --run src/lib/server/db-dialect.spec.ts
    Expected: Test passes (bad combos rejected; defaults work for sqlite)
    Evidence: .sisyphus/evidence/task-9-db-dialect-tests.txt

  Scenario: App starts with sqlite defaults
    Tool: Bash
    Steps:
      1) env -u YONA_DB_URL -u YONA_DB_DIALECT bun run build
    Expected: Build succeeds (runtime DB init happens at request time; no crash during build)
    Evidence: .sisyphus/evidence/task-9-sqlite-default-build.txt
  ```

  **Commit**: YES | Message: `feat(infra): add bun-sql multi-dialect db factory` | Files: `packages/infra/src/db/**`, env docs

- [ ] 10. Port schema snapshot: relocate current MySQL schema+relations into `packages/infra` as the canonical snapshot

  **What to do**:
  - Move (or copy, then switch imports) the current schema snapshot into infra package:
    - Source: `drizzle/schema.ts` → Target: `packages/infra/src/db/schema/mysql.ts`
    - Source: `drizzle/relations.ts` → Target: `packages/infra/src/db/relations/mysql.ts`
  - Ensure the exported table names stay the same (exported const identifiers like `n4user`, `linkedAccount`, etc.).
  - Export `schemaMysql` (object) from `packages/infra/src/db/schema/mysql.ts` for parity tests + DB factory.
  - Normalize drizzle-kit introspection default sentinels in the canonical MySQL snapshot (so migrations generation works):
    - Postgres: `.default(new Date("NULLZ"))` → `.defaultNow()`
    - Postgres: `.default(new Date("current_timestamp()Z"))` → `.defaultNow()`
    - SQLite (per user decision: use SQLite SQL expression): `default(new Date("NULLZ"))` → `.default(sql\`strftime('%s', 'now') \* 1000\`)`
    - SQLite (per user decision): `default(new Date("current_timestamp()Z"))` → `.default(sql\`strftime('%s', 'now') \* 1000\`)`
    - SQLite boolean defaults: `boolean().default(false)` → `integer({ mode: 'boolean' }).default(sql\`0\`)`
  - Document in AGENTS.md: "Postgres uses defaultNow(), SQLite uses SQL expression based on timestamp semantics"

- **REMOVED from task**: Instructions for tinyint → smallint range documentation (moved to Task 11 as per plan's structure)
  - `default(new Date("current_timestamp()Z"))` → `defaultNow()`
  - Update runtime imports to use `@yona/infra` schema exports (auth code must stop importing from `../../../../drizzle/schema`).
  - Keep behavior unchanged; this is a relocation + import rewrite task.

  **Must NOT do**:
  - Do not change table or column names.
  - Do not change the DB dialect in this task.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: []

  **Parallelization**: Can Parallel: NO | Wave 5 | Blocks: 11, 12, 13, 14, 15, 16 | Blocked By: 8

  **References**:
  - Current schema snapshot:
    - `drizzle/schema.ts`
    - `drizzle/relations.ts`
  - Current schema consumers:
    - `apps/web/src/lib/server/hono/auth-app.ts`
    - `apps/web/src/lib/server/auth/session.ts` (legacy; should remain unused for sessions after task 7)

  **Acceptance Criteria**:
  - [ ] `bun run check`
  - [ ] `bun run test:unit -- --run`

  **QA Scenarios**:

  ```
  Scenario: Typecheck and unit tests pass after schema relocation
    Tool: Bash
    Steps:
      1) bun run check
      2) bun run test:unit -- --run
    Expected: Exit 0
    Evidence: .sisyphus/evidence/task-10-schema-mysql-relocate.txt

  Scenario: MySQL schema no longer contains invalid Date defaults
    Tool: Bash
    Steps:
      1) ! rg -n "NULLZ|current_timestamp\(\)Z" packages/infra/src/db/schema/mysql.ts
    Expected: No matches
    Evidence: .sisyphus/evidence/task-10-mysql-schema-no-nullz.txt

  Scenario: No imports remain from legacy drizzle/ paths
    Tool: Bash
    Steps:
      1) ! rg -n "\bdrizzle/schema\b|\bdrizzle/relations\b" apps/web/src packages
    Expected: No matches (all schema imports come from packages/infra)
    Evidence: .sisyphus/evidence/task-10-no-legacy-schema-imports.txt
  ```

  **Commit**: YES | Message: `refactor(infra): relocate mysql schema snapshot into packages/infra` | Files: `packages/infra/src/db/**`, updated imports

- [ ] 11. Generate Postgres schema module for the full snapshot (`packages/infra/src/db/schema/postgres.ts`)

  **What to do**:
  - Create `packages/infra/src/db/schema/postgres.ts` containing the full set of tables/columns from the MySQL snapshot.
  - Apply deterministic type mapping rules:
    - `mysqlTable` → `pgTable`
    - `varchar({ length })` → `varchar({ length })`
    - `longtext()` → `text()`
    - `datetime()` / `timestamp()` → `timestamp()` (default mode `date`)
    - `date()` → `date()`
    - `tinyint()` → `smallint()` (or `integer()` if smallint is not viable)
    - `boolean()` → `boolean()`
    - `bigint({ mode: 'number' })` → `bigint({ mode: 'number' })`
    - `*.autoincrement()` (MySQL) → `.generatedByDefaultAsIdentity()` (Postgres)
    - Replace MySQL introspection default sentinels:
      - `default(new Date("NULLZ"))` → `default(sql\`NULL\`)`
      - `default(new Date("current_timestamp()Z"))` → `defaultNow()`
  - Preserve all index/uniqueIndex/foreignKey names.
  - Ensure the module exports all tables as named exports and also exports `schemaPostgres` (object) for parity tests and DB factory.

  **Must NOT do**:
  - Do not “simplify” by dropping tables/columns.

  **Recommended Agent Profile**:
  - Category: `ultrabrain`
  - Skills: []

  **Parallelization**: Can Parallel: YES | Wave 6 | Blocks: 14, 15, 16 | Blocked By: 10

  **References**:
  - Canonical snapshot:
    - `packages/infra/src/db/schema/mysql.ts`
  - PG column builders:
    - `node_modules/drizzle-orm/pg-core/**`

  **Acceptance Criteria**:
  - [ ] `bun run check`
  - [ ] A parity test (added in task 14) can load the postgres schema module

  **QA Scenarios**:

  ```
  Scenario: Postgres schema compiles
    Tool: Bash
    Steps:
      1) bun run check
    Expected: Exit 0
    Evidence: .sisyphus/evidence/task-11-postgres-schema-check.txt

  Scenario: Table set is non-trivial
    Tool: Bash
    Steps:
      1) rg -n "export const" packages/infra/src/db/schema/postgres.ts | head -n 50
    Expected: Many exported tables exist (not an empty stub)
    Evidence: .sisyphus/evidence/task-11-postgres-schema-exports.txt
  ```

  **Commit**: YES | Message: `feat(db): add postgres schema snapshot` | Files: `packages/infra/src/db/schema/postgres.ts`

- [ ] 12. Generate SQLite schema module for the full snapshot (`packages/infra/src/db/schema/sqlite.ts`)

  **What to do**:
  - Create `packages/infra/src/db/schema/sqlite.ts` containing the full set of tables/columns from the MySQL snapshot.
  - Apply deterministic type mapping rules:
    - `mysqlTable` → `sqliteTable`
    - `varchar({ length })` → `text({ length })`
    - `longtext()` → `text()`
    - `datetime()` / `timestamp()` → `integer({ mode: 'timestamp_ms' })`
    - `date()` → `integer({ mode: 'timestamp_ms' })` (Date at TS boundary)
    - `int()` / `bigint()` / `tinyint()` → `integer()` (mode `number`)
    - `boolean()` → `integer({ mode: 'boolean' })`
    - `*.autoincrement()` (MySQL) → `integer(...).primaryKey({ autoIncrement: true })` (SQLite)
    - Replace MySQL introspection default sentinels:
      - `default(new Date("NULLZ"))` → `default(sql\`NULL\`)`
      - `default(new Date("current_timestamp()Z"))` → `defaultNow()` (only when column mode is `timestamp_ms`)
  - Preserve index/uniqueIndex/foreignKey names.
  - Export all tables as named exports and also export `schemaSqlite` (object) for parity tests and DB factory.

  **Must NOT do**:
  - Do not drop columns with “MySQL-only” defaults; prefer omitting NULL defaults where safe.

  **Recommended Agent Profile**:
  - Category: `ultrabrain`
  - Skills: []

  **Parallelization**: Can Parallel: YES | Wave 6 | Blocks: 14, 15, 16 | Blocked By: 10

  **References**:
  - Canonical snapshot:
    - `packages/infra/src/db/schema/mysql.ts`
  - SQLite builders:
    - `node_modules/drizzle-orm/sqlite-core/**`
  - SQLite timestamp/boolean integer modes:
    - `node_modules/drizzle-orm/sqlite-core/columns/integer.d.ts`
    - `node_modules/drizzle-orm/sqlite-core/columns/text.d.ts`
  - Bun SQL sqlite URL examples:
    - `https://bun.com/docs/runtime/sql`

  **Acceptance Criteria**:
  - [ ] `bun run check`
  - [ ] Parity test can load the sqlite schema module

  **QA Scenarios**:

  ```
  Scenario: SQLite schema compiles
    Tool: Bash
    Steps:
      1) bun run check
    Expected: Exit 0
    Evidence: .sisyphus/evidence/task-12-sqlite-schema-check.txt
  ```

  **Commit**: YES | Message: `feat(db): add sqlite schema snapshot` | Files: `packages/infra/src/db/schema/sqlite.ts`

- [ ] 13. Port relations snapshot to 3 dialects and export a stable `relations*` entrypoint

  **What to do**:
  - Keep the relations body identical across dialects; only change the imported schema module.
  - Create:
    - `packages/infra/src/db/relations/mysql.ts` (already from task 10)
    - `packages/infra/src/db/relations/postgres.ts`
    - `packages/infra/src/db/relations/sqlite.ts`
  - Export `relationsMysql`, `relationsPostgres`, `relationsSqlite`.
  - Update DB factory (task 9) to attach the correct `relations` config when schema supports it.

  **Must NOT do**:
  - Do not change relation alias strings; keep them identical.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: []

  **Parallelization**: Can Parallel: YES | Wave 6 | Blocks: 15, 16 | Blocked By: 11, 12

  **References**:
  - Canonical relations body:
    - `packages/infra/src/db/relations/mysql.ts`
  - Existing relations helper:
    - `node_modules/drizzle-orm/relations.d.ts` (for `defineRelations`)

  **Acceptance Criteria**:
  - [ ] `bun run check`

  **QA Scenarios**:

  ```
  Scenario: Relations modules compile
    Tool: Bash
    Steps:
      1) bun run check
    Expected: Exit 0
    Evidence: .sisyphus/evidence/task-13-relations-check.txt
  ```

  **Commit**: YES | Message: `feat(db): add relations snapshots for postgres/sqlite` | Files: `packages/infra/src/db/relations/**`

- [ ] 14. Add schema parity tests across dialect modules (tables + column names)

  **What to do**:
  - Add `apps/web/src/lib/server/db/schema-parity.spec.ts` (or move to `packages/infra` test folder if preferred) that:
    - Imports the three schema modules.
    - Uses `isTable`, `getTableName`, `getTableColumns` from `drizzle-orm`.
    - Uses dialect table introspection helpers:
      - `getTableConfig` from `drizzle-orm/mysql-core`
      - `getTableConfig` from `drizzle-orm/pg-core`
      - `getTableConfig` from `drizzle-orm/sqlite-core`
    - Asserts:
      - Same set of table names across postgres/mysql/sqlite.
      - For each table name, same set of column names across dialects.
      - For each `(table, column)` pair, `notNull` parity across dialects.
      - Index parity across dialects (name + column name list + uniqueness).
      - Foreign key parity across dialects (name + local column names + referenced table name + referenced column names + onDelete/onUpdate).
      - Primary key parity across dialects (count + column name list).
  - Implement a strict set-compare helper (e.g., `assertSameSet(label, left, right)`) and include a unit test that proves it fails on mismatches.
  - Add one “intentional difference allowlist” mechanism only if absolutely required (default: none allowed).

**Must NOT do**:

- Do not weaken parity by only checking counts; must check exact names.

**UPDATED per review** (SQLite FK actions):

- Allow SQLite to omit `onUpdate` actions (SQLite ignores them anyway).
- App layer handles CASCADE/SET NULL deletes explicitly when deleting users.
- Parity test accepts that SQLite FKs don't have `onUpdate` or differ from MySQL/Postgres.
- Document in AGENTS.md: "SQLite FK `onUpdate` not supported; handled at application layer"

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: []

  **Parallelization**: Can Parallel: YES | Wave 6 | Blocks: 15, 16 | Blocked By: 10, 11, 12

  **References**:
  - Drizzle utils:
    - `node_modules/drizzle-orm/index.d.ts` (exports `isTable`, `getTableName`, `getTableColumns`)

  **Acceptance Criteria**:
  - [ ] `bun run test:unit -- --run src/lib/server/db/schema-parity.spec.ts`

  **QA Scenarios**:

  ```
  Scenario: Parity test passes
    Tool: Bash
    Steps:
      1) bun run test:unit -- --run src/lib/server/db/schema-parity.spec.ts
    Expected: Exit 0
    Evidence: .sisyphus/evidence/task-14-parity-test.txt

  Scenario: Parity helper is strict (negative control inside test)
    Tool: Bash
    Steps:
      1) bun run test:unit -- --run src/lib/server/db/schema-parity.spec.ts -t "mismatch"
    Expected: The helper-negative-control test passes (it expects a throw on mismatch)
    Evidence: .sisyphus/evidence/task-14-parity-negative-control.txt
  ```

  **Commit**: YES | Message: `test(db): add schema parity checks across dialects` | Files: parity test file(s)

- [ ] 15. Add per-dialect migration scripts; generate initial migrations per dialect (no drizzle config)

  **What to do**:
  - Generate migrations using drizzle-kit CLI flags (avoid config files; `generate` does not need DB connectivity):
    - MySQL:
      - `bunx drizzle-kit generate --dialect mysql --schema packages/infra/src/db/schema/mysql.ts --out packages/infra/drizzle/migrations/mysql --breakpoints`
    - Postgres:
      - `bunx drizzle-kit generate --dialect postgresql --schema packages/infra/src/db/schema/postgres.ts --out packages/infra/drizzle/migrations/postgres --breakpoints`
    - SQLite:
      - `bunx drizzle-kit generate --dialect sqlite --schema packages/infra/src/db/schema/sqlite.ts --out packages/infra/drizzle/migrations/sqlite --breakpoints`
  - Add `packages/infra/scripts/db-migrate.ts` that applies migrations using Drizzle bun-sql migrator:
    - Import `migrate` from `drizzle-orm/bun-sql/migrator`.
    - Use the infra DB factory (task 9) to get a connected db for the selected dialect.
    - Compute `migrationsFolder` from dialect as an absolute path (do not depend on process cwd):
      - Use `path.resolve(import.meta.dir, '../drizzle/migrations/<dialect>')` inside `packages/infra/scripts/db-migrate.ts`.
      - Dialect folder mapping:
        - `mysql` → `packages/infra/drizzle/migrations/mysql`
        - `postgres` → `packages/infra/drizzle/migrations/postgres`
        - `sqlite` → `packages/infra/drizzle/migrations/sqlite`
    - Call the correct migrator entrypoint:
      - `migrate.mysql(db, { migrationsFolder })`
      - `migrate.postgres(db, { migrationsFolder })`
      - `migrate.sqlite(db, { migrationsFolder })`
  - Add scripts:
    - In `packages/infra/package.json`:
      - `db:generate:mysql|postgres|sqlite`
      - `db:generate:all`
      - `db:migrate:mysql|postgres|sqlite`
    - In repo root `package.json`: delegate so DoD commands work from repo root:
      - Example: `"db:generate:all": "bun --filter ./packages/infra db:generate:all"`
  - Run `db:generate:all` once to produce the initial migrations for all dialects and commit the generated directories.

  **Must NOT do**:
  - Do not write all dialect migrations into a single folder.
  - Do not rely on `drizzle-kit migrate` for applying migrations in this repo (use Drizzle bun-sql migrator so runtime and migrations share the same Bun.SQL transport).
  - Do not generate migrations without `--breakpoints` (multi-statement `migration.sql` must be split on `--> statement-breakpoint`).

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: []

  **Parallelization**: Can Parallel: NO | Wave 6 | Blocks: 16 | Blocked By: 14

  **References**:
  - Current drizzle config (legacy): `drizzle.config.ts`
  - Drizzle kit docs (official): `https://orm.drizzle.team/docs/migrations`
  - drizzle-kit generate flags (local): `bunx drizzle-kit generate --help`
  - Drizzle bun-sql migrator API: `node_modules/drizzle-orm/bun-sql/migrator.d.ts`
  - Drizzle migrator migration folder format: `node_modules/drizzle-orm/migrator.js`

  **Acceptance Criteria**:
  - [ ] `bun run db:generate:all` exits 0
  - [ ] Migration output dirs exist for all 3 dialects

  **QA Scenarios**:

  ````
  **Scenario**: SQLite FK actions handled correctly in schema
   Tool: Bash
   Steps:
      1) rg -n "onUpdate" packages/infra/src/db/schema/sqlite.ts | head -n 10
      Expected: No `onUpdate` specified in SQLite FK constraints (SQLite ignores them anyway)
      2) rg -n "CASCADE|SET NULL" packages/infra/src/db/schema/*.ts | head -n 10
      Expected: FKs with CASCADE/SET NULL actions found but `onUpdate` omitted for SQLite
      Evidence: .sisyphus/evidence/task-14-sqlite-fk-actions.txt
    ```
  **Scenario**: App layer handles FK CASCADE/SET NULL deletes (user deletion cascades to sessions, issues, etc.)
   Tool: Bash
   Steps:
      1) bun run test:unit -- --run
      2) rg -n "delete.*userId" apps/web/src/lib/server/auth/session.ts | head -n 10
      Expected: Code path exists and deleteAllSessionsByUserId is called before user deletion
      3) Check that session helper middleware clears cookie and calls delete when user logs out
    Evidence: .sisyphus/evidence/task-14-app-layer-fk-cascade.txt
    ```
  Scenario: Generate migrations for all dialects
    Tool: Bash
    Steps:
      1) bun run db:generate:all
      2) ls packages/infra/drizzle/migrations/mysql
      3) ls packages/infra/drizzle/migrations/postgres
      4) ls packages/infra/drizzle/migrations/sqlite
    Expected: Command exits 0; each directory contains at least one migration
    Evidence: .sisyphus/evidence/task-15-generate-migrations.txt
  ````

  **Commit**: YES | Message: `chore(db): add per-dialect drizzle-kit configs and migrations` | Files: `packages/infra/drizzle/**`, root `package.json`

- [ ] 16. Add automated DB smoke (migrate + basic query) for sqlite/postgres/mysql using docker for server DBs

  **What to do**:
  - Add `packages/infra/docker/docker-compose.db.yml` that starts:
    - Postgres service (fixed port, user/pass/db)
    - MySQL service (fixed port, user/pass/db)
  - Add scripts:
    - `db:up` / `db:down` (compose up/down)
    - `db:migrate:sqlite|postgres|mysql`:
      - Uses `packages/infra/scripts/db-migrate.ts` (task 15) and Drizzle bun-sql migrator.
      - Env contract:
        - `sqlite`: defaults allowed (dialect defaults to sqlite; URL defaults to `sqlite://./.yona-data/yona.db` per task 9)
        - `postgres`: requires `YONA_DB_URL_POSTGRES` and sets `YONA_DB_DIALECT=postgres`, `YONA_DB_URL=$YONA_DB_URL_POSTGRES`
        - `mysql`: requires `YONA_DB_URL_MYSQL` and sets `YONA_DB_DIALECT=mysql`, `YONA_DB_URL=$YONA_DB_URL_MYSQL`
    - `db:smoke:sqlite` (run migrate, run `select 1`, verify one known table exists)
    - `db:smoke:postgres` / `db:smoke:mysql` (requires compose up, then migrate + query)
  - Implement smoke runner `packages/infra/scripts/db-smoke.ts`:
    - Connect using `@yona/infra` DB factory
    - Execute `select 1 as ok` and `select count(*) from n4user` (or another always-present table)

  **Must NOT do**:
  - Do not embed credentials in code; keep in `.env.example` and use compose defaults for local only.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: []

  **Parallelization**: Can Parallel: NO | Wave 6 | Blocks: F\* | Blocked By: 15

  **References**:
  - Bun SQL supports MySQL/Postgres/SQLite:
    - `https://bun.com/docs/runtime/sql`
  - Current env template:
    - `.env.example`

  **Acceptance Criteria**:
  - [ ] `bun run db:smoke:sqlite` exits 0
  - [ ] `bun run db:up && bun run db:smoke:postgres && bun run db:smoke:mysql && bun run db:down` exits 0

  **QA Scenarios**:

  ```
  Scenario: SQLite smoke
    Tool: Bash
    Steps:
      1) bun run db:smoke:sqlite
    Expected: Exit 0
    Evidence: .sisyphus/evidence/task-16-sqlite-smoke.txt

  Scenario: Postgres+MySQL smoke via docker compose
    Tool: Bash
    Steps:
      1) bun run db:up
      2) bun run db:smoke:postgres
      3) bun run db:smoke:mysql
      4) bun run db:down
    Expected: All exit 0
    Evidence: .sisyphus/evidence/task-16-docker-smoke.txt
  ```

  **Commit**: YES | Message: `test(db): add docker-backed multi-dialect smoke` | Files: compose + scripts + smoke runner

- [ ] 17. Update env template + developer docs for monorepo, DB dialects, migrations, sessions

  **What to do**:
  - Update `.env.example`:
    - Add `YONA_DB_DIALECT` + `YONA_DB_URL` (runtime)
    - Add `YONA_DB_URL_POSTGRES`, `YONA_DB_URL_MYSQL`, `YONA_DB_URL_SQLITE` (migration/smoke convenience)
    - Add `YONA_DATA` (data root) and `YONA_ADMIN_USER_IDS` (reset-password admin allowlist)
  - Replace the generic root `README.md` with a repo-specific one describing:
    - Monorepo layout
    - How to run web app (`bun run dev` from root)
    - How to run tests (`bun run test`, `bun run test:e2e`)
    - How to generate/apply migrations per dialect
    - How session storage works (in-memory; redis later)
    - How git smart-http endpoints work and required headers for mutation endpoints

  **Must NOT do**:
  - Do not include real credentials in committed docs/examples.

  **Recommended Agent Profile**:
  - Category: `writing`
  - Skills: []

  **Parallelization**: Can Parallel: YES | Wave 6 | Blocks: F\* | Blocked By: 3, 15, 16

  **References**:
  - Current env template: `.env.example`
  - Bun SQL docs: `https://bun.com/docs/runtime/sql`
  - Existing endpoints/tests:
    - `apps/web/src/routes/api/auth/**`
    - `apps/web/src/routes/api/repos/**`

  **Acceptance Criteria**:
  - [ ] `.env.example` contains the new variables
  - [ ] `README.md` describes monorepo + DB dialect usage

  **QA Scenarios**:

  ```
  Scenario: Env template has required vars
    Tool: Bash
    Steps:
      1) rg -n "^YONA_DB_DIALECT=|^YONA_DB_URL=|^YONA_DB_URL_POSTGRES=|^YONA_DB_URL_MYSQL=|^YONA_DB_URL_SQLITE=" .env.example
    Expected: All vars present
    Evidence: .sisyphus/evidence/task-17-env-example.txt

  Scenario: README includes migration commands
    Tool: Bash
    Steps:
      1) rg -n "db:generate:all|db:migrate:mysql|db:migrate:postgres|db:migrate:sqlite" README.md
    Expected: At least one match for each command family
    Evidence: .sisyphus/evidence/task-17-readme-db-commands.txt
  ```

  **Commit**: YES | Message: `docs: update env and monorepo runbook` | Files: `.env.example`, `README.md`

- [ ] 18. Add CI workflow (Bun + unit + e2e + DB smoke)

  **What to do**:
  - Add `.github/workflows/ci.yml` with jobs:
    - `lint-test`:
      - bun install
      - `bun run check`
      - `bun run test:unit -- --run`
      - install Playwright browsers
      - `bun run test:e2e`
    - `db-smoke` (can be separate job):
      - Start postgres + mysql services
      - `bun run db:migrate:postgres && bun run db:smoke:postgres`
      - `bun run db:migrate:mysql && bun run db:smoke:mysql`
      - Always run `bun run db:smoke:sqlite`

  **Must NOT do**:
  - Do not require secrets for CI (use local docker service containers + default creds).

  **Recommended Agent Profile**:
  - Category: `unspecified-high`
  - Skills: []

  **Parallelization**: Can Parallel: YES | Wave 6 | Blocks: F\* | Blocked By: 16

  **References**:
  - Existing scripts to run: `package.json`
  - Playwright config: `apps/web/playwright.config.ts`

  **Acceptance Criteria**:
  - [ ] `.github/workflows/ci.yml` exists and references the repo scripts listed in DoD

  **QA Scenarios**:

  ```
  Scenario: Workflow contains required commands
    Tool: Bash
    Steps:
      1) rg -n "bun run check|bun run test:unit|bun run test:e2e|db:smoke:sqlite" .github/workflows/ci.yml
    Expected: Matches found
    Evidence: .sisyphus/evidence/task-18-ci-workflow-grep.txt

  Scenario: Workflow uses service containers for postgres/mysql
    Tool: Bash
    Steps:
      1) rg -n "services:|postgres:|mysql:" .github/workflows/ci.yml
    Expected: Services configured
    Evidence: .sisyphus/evidence/task-18-ci-services.txt
  ```

  **Commit**: YES | Message: `ci: add bun test matrix with db smoke` | Files: `.github/workflows/ci.yml`

## Final Verification Wave (4 parallel agents, ALL must APPROVE)

- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Automated E2E QA (Playwright) — unspecified-high
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy

- One logical change per commit; prefer the per-task commit messages already specified.
- Task 3 (monorepo move) must be a standalone commit to keep history reviewable.
- Schema snapshot commits should be split by dialect:
  - MySQL relocation (task 10)
  - Postgres schema (task 11)
  - SQLite schema (task 12)
  - Relations (task 13)
- Migrations (task 15) should be committed in one commit after generation.
- Never commit secrets; keep `.env` ignored and only update `.env.example`.
- Before each commit that changes runtime behavior, run:
  - `bun run check`
  - `bun run test:unit -- --run`

## Success Criteria

- All Definition-of-Done commands pass from repo root:
  - `bun run check`
  - `bun run test:unit -- --run`
  - `bun run test:e2e`
  - `bun run db:generate:all`
  - `bun run db:migrate:*` + `bun run db:smoke:*` for sqlite/postgres/mysql
- Session storage is in-memory by default and the DB `sessions` table is not used by runtime auth/session flow.
- DB runtime is Bun.SQL-based and dialect-switchable via `YONA_DB_DIALECT` + `YONA_DB_URL`.
- Schema parity test passes and validates parity across the 3 dialect schema modules (tables/columns + nullability + keys/indices/FKs).
- CI workflow (if implemented) runs the same checks without secrets.
