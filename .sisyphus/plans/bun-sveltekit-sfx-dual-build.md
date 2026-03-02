# Bun-native SvelteKit SFX Dual Build (Keep Vite)

## TL;DR

> **Summary**: Keep SvelteKit+Vite for dev/build, add a deterministic SFX (single-binary) build lane using `@jesterkit/exe-sveltekit` with embedded static assets.
> **Deliverables**: conditional adapter selection, SFX build scripts (host + cross-target), SFX smoke verification (assets + /api), runbook docs.
> **Effort**: Medium
> **Parallel**: YES - 2 waves
> **Critical Path**: Adapter switch → SFX build script → SFX smoke verification

## Context

### Original Request

- SvelteKit is the primary stack today; SSR is not mandatory.
- Current reality: Vite and Bun are mixed; Bun matters most at final SFX build.
- SFX is mandatory; cannot be dropped.
- Node-dev + Bun-build can break asset embedding; avoid that class of failure.

### Interview Summary

- Keeping Vite (build-time) is acceptable; “Bun-native” focus is runtime/packaging, not eliminating Vite.
- Prefer to keep the current “dual build” behavior: existing `bun run build && bun run preview` (Playwright) remains working, while SFX gets its own build lane.

### Metis Review (gaps addressed)

- Guardrails: do not break existing preview/e2e flow; do not swap configs by copying files; adapter selection must be env-flag based.
- Do not rely on `exe-sveltekit` `volume` for persistence (typed but not implemented upstream); use `YONA_DATA` env var for writable runtime state.
- Add explicit SFX acceptance criteria: binary exists, serves embedded static assets, and `/api/auth/session` works.
- Ensure runtime env is dynamic (avoid `$env/static/private` on SFX path).

## Work Objectives

### Core Objective

Ship a reliable Bun SFX for `apps/web` while preserving the existing Vite/SvelteKit dev & preview workflows.

### Deliverables

- D1. Conditional adapter selection in `apps/web/svelte.config.js`:
  - default: current adapter (keep Playwright preview behavior)
  - SFX lane: `@jesterkit/exe-sveltekit` with embedded static assets
- D2. SFX build scripts in `apps/web/package.json` and root `package.json` (host + cross-target variants).
- D3. SFX smoke verification that is agent-executable and checks:
  - `/` returns HTML
  - embedded static files return 200: `/favicon.ico`, `/images/yona_logo.png`, `/stylesheets/yobicon/style.css`, `/stylesheets/yobicon/fonts/yobicon.woff`
  - `/api/auth/session` returns 200 with JSON
  - `YONA_DATA` is honored (directories created under the configured path)
- D4. Minimal runbook doc for building/running SFX + required env (`PORT`, `YONA_DATA`).

### Definition of Done (agent-verifiable)

- `bun run --cwd apps/web test:e2e` passes (unchanged webServer path).
- `bun run --cwd apps/web build:sfx` produces an executable binary at a stable path (chosen in this plan).
- Running the SFX binary from a clean temp CWD serves the pinned static assets and `/api/auth/session`.

### Must Have

- Keep Vite build-time (no attempt to replace SvelteKit’s bundler).
- Preserve existing `apps/web/playwright.config.ts` workflow.
- Embed static assets for SFX (no external asset directory required to boot).

### Must NOT Have (guardrails)

- No “copy svelte.config.js around” to switch adapters.
- No new runtime config system beyond documenting and using `PORT` + `YONA_DATA`.
- No React migration work.
- No attempt to eliminate Vite.

## Verification Strategy

> ZERO HUMAN INTERVENTION — all verification is agent-executed.

- Test decision: tests-after (reuse existing Vitest/Playwright); add SFX smoke checks.
- QA policy: every task includes at least one command-based verification and one runtime scenario.
- Evidence: write curl/smoke outputs to `.sisyphus/evidence/task-*-*.txt`.

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Build Lane + Adapter Wiring)

- T1 Adapter selection + dependency wiring
- T2 SFX build scripts (host + cross-target)

Wave 2 (SFX Smoke + Docs)

- T3 SFX smoke verification (assets + /api + YONA_DATA)
- T4 Runbook docs

### Dependency Matrix (full, all tasks)

- T1 blocks T2, T3
- T2 blocks T3
- T4 blocked by T2 (doc needs final script names/paths)

### Agent Dispatch Summary

- Wave 1: 2 tasks (quick/unspecified-low)
- Wave 2: 2 tasks (unspecified-low/writing)

## TODOs

> Implementation + Test = ONE task.
> EVERY task includes QA scenarios.

- [ ] 1. Add conditional adapter selection for SFX builds

  **What to do**:
  - Update `apps/web/svelte.config.js` to select adapter based on `process.env.YONA_BUILD`:
    - default (no env): keep `@sveltejs/adapter-auto` exactly as today
    - when `YONA_BUILD === 'sfx'`: use `@jesterkit/exe-sveltekit` with:
      - `out: 'dist'`
      - `binaryName: process.env.YONA_SFX_BINARY_NAME ?? 'yona-server'`
      - `embedStatic: true`
      - `target: process.env.YONA_SFX_TARGET` when provided, otherwise omit (host default)
  - Use this exact adapter-selection shape (adjust only alias block to match existing):

    ```js
    import auto from '@sveltejs/adapter-auto';
    import exe from '@jesterkit/exe-sveltekit';

    const isSfx = process.env.YONA_BUILD === 'sfx';

    // ...
    adapter: isSfx
      ? exe({
          out: 'dist',
          binaryName: process.env.YONA_SFX_BINARY_NAME ?? 'yona-server',
          embedStatic: true,
          target: process.env.YONA_SFX_TARGET
        })
      : auto(),
    ```

  - Add `@jesterkit/exe-sveltekit` as a devDependency of `apps/web`.
  - Keep aliases unchanged (must continue to resolve `@web`, `@api`, `@infra`, etc.).

  **Must NOT do**:
  - Do not copy/swap config files to switch adapters.
  - Do not change `apps/web/playwright.config.ts` in this task.
  - Do not introduce `$env/static/private` usage.

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: small, localized config wiring
  - Skills: []
  - Omitted: [`git-master`] — not needed unless committing

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [2, 3] | Blocked By: []

  **References**:
  - Existing adapter config: `apps/web/svelte.config.js`
  - Existing preview/e2e expects non-SFX build: `apps/web/playwright.config.ts`
  - Static assets that must be embedded in SFX: `apps/web/static/`
  - Data dir behavior (runtime writes): `packages/infra/src/git/config.ts`
  - Adapter docs: `https://www.npmjs.com/package/@jesterkit/exe-sveltekit`
  - Adapter docs: `https://jesterkit.com/exe`

  **Acceptance Criteria**:
  - [ ] `bun run --cwd apps/web build` succeeds (non-SFX path unchanged)
  - [ ] `YONA_BUILD=sfx bun run --cwd apps/web build` starts a build that uses the SFX adapter (no missing-module/config errors)

  **QA Scenarios**:

  ```
  Scenario: Non-SFX build remains unchanged
    Tool: Bash
    Steps:
      1) bun run --cwd apps/web build
    Expected:
      - Exit code 0
    Evidence: .sisyphus/evidence/task-1-non-sfx-build.txt

  Scenario: SFX adapter path loads without errors
    Tool: Bash
    Steps:
      1) YONA_BUILD=sfx bun run --cwd apps/web build
    Expected:
      - Exit code 0 (or if later tasks add required scripts/vars, the failure mode is not "cannot find adapter")
    Evidence: .sisyphus/evidence/task-1-sfx-adapter-load.txt
  ```

  **Commit**: YES | Message: `build(web): add conditional exe-sveltekit adapter` | Files: `apps/web/svelte.config.js`, `apps/web/package.json`

- [ ] 2. Add explicit SFX build scripts (host + cross-target)

  **What to do**:
  - Add `cross-env` (or equivalent cross-platform env setter) to `apps/web` devDependencies.
  - In `apps/web/package.json`, add scripts (names + exact bodies are fixed by this plan):
    - `build:sfx`: `cross-env YONA_BUILD=sfx YONA_SFX_BINARY_NAME=yona-server vite build`
    - `build:sfx:linux-x64`: `cross-env YONA_BUILD=sfx YONA_SFX_TARGET=linux-x64 YONA_SFX_BINARY_NAME=yona-server-linux-x64 vite build`
    - `build:sfx:linux-x64-baseline`: `cross-env YONA_BUILD=sfx YONA_SFX_TARGET=linux-x64-baseline YONA_SFX_BINARY_NAME=yona-server-linux-x64-baseline vite build`
    - `build:sfx:windows-x64`: `cross-env YONA_BUILD=sfx YONA_SFX_TARGET=windows-x64 YONA_SFX_BINARY_NAME=yona-server-windows-x64 vite build`
    - `build:sfx:darwin-arm64`: `cross-env YONA_BUILD=sfx YONA_SFX_TARGET=darwin-arm64 YONA_SFX_BINARY_NAME=yona-server-darwin-arm64 vite build`
  - In root `package.json`, add pass-through scripts:
    - `build:sfx`, `build:sfx:linux-x64`, `build:sfx:linux-x64-baseline`, `build:sfx:windows-x64`, `build:sfx:darwin-arm64`
  - Update `.gitignore` to ignore SFX outputs:
    - add `/apps/web/dist`

  **Must NOT do**:
  - Do not change existing `dev/build/preview/test` scripts; only add new ones.
  - Do not add CI workflows in this work package.

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: package scripts + small config alignment
  - Skills: []

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [3, 4] | Blocked By: [1]

  **References**:
  - Current scripts: `apps/web/package.json`, `package.json`
  - Playwright uses these scripts (must remain valid): `apps/web/playwright.config.ts`
  - Adapter target strings and Bun version floor (Metis): Bun >= 1.2.18; targets like `linux-x64`, `darwin-arm64`, `windows-x64`.

  **Acceptance Criteria**:
  - [ ] `bun run --cwd apps/web build:sfx` produces `apps/web/dist/yona-server`
  - [ ] `bun run --cwd apps/web build:sfx:linux-x64` completes and produces a linux-x64 binary in `apps/web/dist/`
  - [ ] `bun run --cwd apps/web test:e2e` still passes (unchanged preview lane)

  **QA Scenarios**:

  ```
  Scenario: Host SFX build output exists
    Tool: Bash
    Steps:
      1) bun run --cwd apps/web build:sfx
      2) test -x apps/web/dist/yona-server
    Expected:
      - Exit code 0
      - Binary exists and is executable
    Evidence: .sisyphus/evidence/task-2-host-sfx-build.txt

  Scenario: Cross-target build does not clobber host binary
    Tool: Bash
    Steps:
      1) bun run --cwd apps/web build:sfx
      2) bun run --cwd apps/web build:sfx:linux-x64
      3) ls apps/web/dist
    Expected:
      - Both binaries exist with distinct names
    Evidence: .sisyphus/evidence/task-2-cross-target-names.txt
  ```

  **Commit**: YES | Message: `build(web): add SFX build scripts` | Files: `apps/web/package.json`, `package.json`, `.gitignore`

- [ ] 3. Add SFX smoke verification (embedded assets + /api + YONA_DATA)

  **What to do**:
  - Add a Bun script `apps/web/scripts/sfx-smoke.ts` that:
    - Assumes `apps/web/dist/yona-server` exists (built via Task 2).
    - Spawns the binary with:
      - `PORT=4174` (avoid Playwright’s 4173)
      - `YONA_DATA=<temp dir>`
      - `cwd=<temp dir>` (prove it does not depend on repo working directory)
    - Polls until `GET /api/auth/session` returns 200 (timeout + clear error).
    - Verifies endpoints:
      - `GET /` → 200
      - `GET /favicon.ico` → 200
      - `GET /images/yona_logo.png` → 200
      - `GET /stylesheets/yobicon/style.css` → 200
      - `GET /stylesheets/yobicon/fonts/yobicon.woff` → 200
      - `GET /api/auth/session` → 200 and JSON includes `{ "session": null }` when unauthenticated
    - Verifies writable directories by hitting an endpoint that calls `ensureYonaDataDirectories()`:
      - `GET /api/repos/1001/files?branch=main&path=README.md` should return 404 (repo missing) but create `<YONA_DATA>/repo` and `<YONA_DATA>/logs`
    - Includes one negative assertion:
      - `GET /stylesheets/yobicon/fonts/does-not-exist.woff` → 404
    - Always terminates the spawned process (no orphan server).
  - Add `apps/web/package.json` script: `sfx:smoke`: `bun scripts/sfx-smoke.ts`.
  - Add root script pass-through: `sfx:smoke`.

  **Must NOT do**:
  - Do not convert Playwright to run against SFX in this work package.

  **Recommended Agent Profile**:
  - Category: `unspecified-low` — Reason: small new script + process management
  - Skills: []

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [] | Blocked By: [2]

  **References**:
  - Static assets to verify:
    - `apps/web/static/favicon.ico`
    - `apps/web/static/images/yona_logo.png`
    - `apps/web/static/stylesheets/yobicon/style.css`
    - `apps/web/static/stylesheets/yobicon/fonts/yobicon.woff`
  - API endpoint expected unauthenticated behavior: `apps/web/src/lib/server/hono/auth-app.ts` (route `/api/auth/session`)
  - Writable dirs behavior: `packages/infra/src/git/config.ts` and `packages/api/src/repos/repo-app.ts` (calls `ensureYonaDataDirectories()`)

  **Acceptance Criteria**:
  - [ ] `bun run --cwd apps/web build:sfx && bun run --cwd apps/web sfx:smoke` passes
  - [ ] Smoke output clearly identifies which URL failed if any assertion fails

  **QA Scenarios**:

  ```
  Scenario: SFX serves embedded static assets and /api
    Tool: Bash
    Steps:
      1) bun run --cwd apps/web build:sfx
      2) bun run --cwd apps/web sfx:smoke
    Expected:
      - All pinned URLs return expected status codes
      - YONA_DATA/repo and YONA_DATA/logs directories exist
    Evidence: .sisyphus/evidence/task-3-sfx-smoke.txt

  Scenario: Missing static asset returns 404
    Tool: Bash
    Steps:
      1) (covered by sfx:smoke) request /stylesheets/yobicon/fonts/does-not-exist.woff
    Expected:
      - 404 response
    Evidence: .sisyphus/evidence/task-3-sfx-missing-asset.txt
  ```

  **Commit**: YES | Message: `test(web): add SFX smoke verification` | Files: `apps/web/scripts/sfx-smoke.ts`, `apps/web/package.json`, `package.json`

- [ ] 4. Add SFX runbook documentation

  **What to do**:
  - Add `docs/deploy/sfx.md` documenting:
    - Prereqs: Bun >= 1.2.18
    - Build commands (root + apps/web): `build:sfx`, cross-target scripts
    - Run commands with required env:
      - `PORT` (default behavior + recommended explicit)
      - `YONA_DATA` (must be writable; recommended location)
    - Note on persistence: do not assume adapter `volume` works; rely on `YONA_DATA`.
    - Smoke verification command: `bun run sfx:smoke`
    - Security note: avoid `$env/static/private` for secrets in SFX builds; prefer runtime env (process.env / `$env/dynamic/private`).

  **Must NOT do**:
  - Do not introduce new deployment mechanisms (Docker/CI release pipelines) here.

  **Recommended Agent Profile**:
  - Category: `writing` — Reason: runbook/documentation
  - Skills: []

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [] | Blocked By: [2]

  **References**:
  - Existing SFX guidance: `AGENTS.md` (Section 7)
  - Bun executables doc: `https://bun.com/docs/bundler/executables`
  - Adapter docs: `https://jesterkit.com/exe`
  - Data root: `packages/infra/src/git/config.ts`

  **Acceptance Criteria**:
  - [ ] `docs/deploy/sfx.md` exists and contains the exact script names from Task 2
  - [ ] Doc includes one example for macOS/Linux shells and one for Windows PowerShell (env var syntax)

  **QA Scenarios**:

  ```
  Scenario: Runbook matches implementation
    Tool: Bash
    Steps:
      1) Verify referenced scripts exist in package.json
      2) Run the documented host build + smoke commands
    Expected:
      - Commands in doc are runnable and succeed
    Evidence: .sisyphus/evidence/task-4-runbook-validated.txt

  Scenario: Windows env syntax documented
    Tool: Read
    Steps:
      1) Inspect docs/deploy/sfx.md
    Expected:
      - Contains PowerShell example with $env:PORT / $env:YONA_DATA
    Evidence: .sisyphus/evidence/task-4-windows-env-doc.txt
  ```

  **Commit**: YES | Message: `docs(deploy): add SFX runbook` | Files: `docs/deploy/sfx.md`

## Final Verification Wave (4 parallel agents, ALL must APPROVE)

- F1. Plan Compliance Audit — oracle
- F2. Code Quality Review — unspecified-high
- F3. Real Manual QA (agent-executed) — unspecified-high
- F4. Scope Fidelity Check — deep

## Commit Strategy

- Prefer 2 commits:
  1. `build(web): add conditional exe-sveltekit SFX lane`
  2. `test(web): add SFX smoke verification + docs`

## Success Criteria

- SFX binary build is deterministic and repeatable from a clean checkout.
- Embedded static assets are served correctly from the SFX binary.
- Existing Playwright e2e flow remains unchanged and passing.
