# Yona Shell + Branding Migration (Slice 1)

## TL;DR

> **Summary**: Port Yona’s top-level UI chrome (header/footer/layout) into the existing SvelteKit app and migrate only the minimal branding assets needed to render it.
> **Deliverables**: Yona-like header/footer, base-safe favicon + logo, Yobicon icon font available, placeholder routes for nav targets, updated/added tests (Vitest + Playwright).
> **Effort**: Medium
> **Parallel**: YES — 2 waves
> **Critical Path**: Assets → Layout shell → Placeholder routes → Tests + config alignment

## Context

### Original Request

- Follow `AGENTS.md` phases; repo is a bare SvelteKit app; first milestone is migrating from `yona-original/`.
- First migration slice chosen: `Shell + Branding`.

### Interview Summary

- Keep existing Paraglide i18n plumbing (no i18n strategy changes).
- Migrate minimal assets only: legacy favicon, Yona logo, Yobicon icon font (+ its license text).
- Implement Yona-like UI shell in SvelteKit (header/footer) and provide minimal placeholder routes so navigation can be verified.
- Keep the locale switcher hidden (current behavior in `src/routes/+layout.svelte`), to avoid UI scope creep in this slice.

### Metis Review (gaps addressed)

- Base-path risk: design all static asset URLs to work if `kit.paths.base` is set later.
- i18n regression risk: do not change `src/hooks.server.ts`, `src/hooks.ts`, or `%paraglide.*%` placeholders; add automated assertions that placeholders are replaced at runtime.
- Icon font safety: copy and serve Yobicon with directory structure preserved so `style.css` font URLs remain valid.
- Scope guardrail: do not port legacy JS (jQuery/NProgress/etc) or LESS; this slice is shell + branding only.

### Preconditions

- This project is executed with Bun. Assume Bun is available in the environment.
- The repo must not rely on `npm`/`pnpm` being present; scripts and configs should be Bun-friendly.

## Work Objectives

### Core Objective

- A SvelteKit app whose default layout renders Yona-like header + footer, using migrated branding assets, while preserving the current Paraglide setup.

### Deliverables

- Static assets migrated into SvelteKit `static/`:
  - `static/favicon.ico` (from legacy)
  - `static/images/yona_logo.png` (from legacy)
  - `static/stylesheets/yobicon/**` (from legacy, including fonts and `license.txt`)
- Layout shell:
  - Header with logo + 3–4 nav links (to placeholder pages)
  - Footer with attribution text (minimal)
- Placeholder routes to back the nav links.
- Automated verification:
  - Playwright: shell renders, nav works, `html[lang]` and `html[dir]` are not placeholders.
  - Vitest: keep/update existing basic render tests so they match the new home page.

### Definition of Done (verifiable)

- Commands succeed:
  - `bun run check`
  - `bun run build`
  - `bun run test:unit -- --run`
  - `bun run test:e2e`
- Asset presence checks succeed:
  - `test -f static/favicon.ico`
  - `test -f static/images/yona_logo.png`
  - `test -f static/stylesheets/yobicon/style.css`
  - `test -f static/stylesheets/yobicon/license.txt`
- Playwright assertions pass:
  - Visiting `/` shows header + footer (via stable selectors)
  - Clicking each header nav link changes URL and preserves shell
  - `document.documentElement.lang` is non-empty and does not contain `paraglide`
  - `document.documentElement.dir` is `ltr` or `rtl` and does not contain `paraglide`

### Must Have

- Preserve existing Paraglide plumbing:
  - Keep `src/app.html` placeholders `%paraglide.lang%` and `%paraglide.dir%` intact
  - Keep `src/hooks.server.ts` and `src/hooks.ts` behavior intact
- Base-safe asset linking (compatible with future `kit.paths.base`)
- No legacy JS porting; no LESS porting

### Must NOT Have

- No migration of legacy runtime JS (jQuery, NProgress, etc.) into SvelteKit for this slice
- No attempt to match the full legacy pixel-perfect UI (only “recognizably Yona” shell)
- No changes to i18n routing strategy (no new locale prefixes/rewrites beyond current Paraglide behavior)

## Verification Strategy

- Test decision: tests-after using existing `vitest` + `@playwright/test`
- QA policy: every task includes at least one agent-executable scenario; final wave runs full `bun run test`
- Evidence artifacts (optional but recommended for traceability):
  - `.sisyphus/evidence/shell-home.png`
  - `.sisyphus/evidence/nav-projects.png`

## Execution Strategy

### Parallel Execution Waves

Wave 1 (foundation)

- Task 0: Bun toolchain readiness + install deps
- Task 1: Asset migration plan + copy minimal assets (favicon/logo/yobicon)
- Task 2: Make scripts/config bun-friendly (avoid npm/pnpm hardcoding)
- Task 3: Add placeholder routes for nav targets

Wave 2 (dependent)

- Task 4: Implement layout shell (header/footer) using migrated assets and base-safe links
- Task 5: Update/add tests for shell + nav + lang/dir injection

### Dependency Matrix (all tasks)

- Task 0 blocks all other tasks
- Task 1 blocks Task 4
- Task 3 blocks Task 5 (nav verification)
- Task 4 blocks Task 5
- Task 2 unblocks Task 5 reliability (CI/local)

## TODOs

- [x] 0. Ensure Bun toolchain is ready (blocking prerequisite)

  **What to do**:
  - Make sure Bun is available and dependencies are installed:
    - `bun --version`
    - `bun install`
  - Ensure `bun run <script>` works for all repo scripts.

  **Must NOT do**:
  - Do not change repo code/config as part of this prerequisite.

  **Recommended Agent Profile**:
  - Agent ID: `CODER` — Reason: environment readiness + dependency install.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: Task 1-5 | Blocked By: none

  **Acceptance Criteria**:
  - [x] `bun --version` prints a version
  - [x] `bun install` completes successfully

  **QA Scenarios**:

  ```
  Scenario: Toolchain readiness
    Tool: Bash
    Steps:
      1) bun --version
      2) bun install
    Expected: all commands succeed
    Evidence: .sisyphus/evidence/task-0-toolchain.txt
  ```

  **Commit**: NO

- [x] 1. Migrate minimal branding assets into `static/`

  **What to do**:
  - Copy these legacy assets into SvelteKit `static/` (preserve directory structure where noted):
    - From `yona-original/public/images/favicon.ico` → `static/favicon.ico`
    - From `yona-original/public/images/yona_logo.png` → `static/images/yona_logo.png`
    - Copy directory `yona-original/public/stylesheets/yobicon/` → `static/stylesheets/yobicon/` (must include `fonts/` and `style.css` and `license.txt`).
  - Do not rewrite `static/stylesheets/yobicon/style.css` font URLs; preserving structure keeps URLs valid.
  - Ensure the repo continues to ignore generated Paraglide output (`src/lib/paraglide` is already gitignored).

  **Must NOT do**:
  - Do not migrate any other legacy assets (bootstrap, jcrop, dynatree, images/assets/\*) in this slice.

  **Recommended Agent Profile**:
  - Agent ID: `CODER` — Reason: file moves + minimal wiring.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Task 4 | Blocked By: none

  **References**:
  - Legacy favicon: `yona-original/public/images/favicon.ico`
  - Legacy logo: `yona-original/public/images/yona_logo.png`
  - Legacy Yobicon: `yona-original/public/stylesheets/yobicon/style.css`
  - Yobicon license: `yona-original/public/stylesheets/yobicon/license.txt`

  **Acceptance Criteria**:
  - [x] `test -f static/favicon.ico`
  - [x] `test -f static/images/yona_logo.png`
  - [x] `test -f static/stylesheets/yobicon/style.css`
  - [x] `test -f static/stylesheets/yobicon/license.txt`

  **QA Scenarios**:

  ```
  Scenario: Verify files exist
    Tool: Bash
    Steps:
      1) test -f static/favicon.ico
      2) test -f static/images/yona_logo.png
      3) test -f static/stylesheets/yobicon/style.css
      4) test -f static/stylesheets/yobicon/license.txt
    Expected: all commands exit 0
    Evidence: .sisyphus/evidence/task-1-assets.txt

  Scenario: Verify Yobicon CSS still references fonts/
    Tool: Grep
    Steps:
      1) Search `static/stylesheets/yobicon/style.css` for `fonts/yobicon.`
    Expected: at least one match for each font type (eot/woff/ttf/svg)
    Evidence: .sisyphus/evidence/task-1-yobicon-css.txt
  ```

  **Commit**: YES | Message: `🎨 shell: migrate yona branding assets` | Files: `static/`

- [x] 2. Make scripts/config bun-friendly

  **What to do**:
  - Update `playwright.config.ts` so `webServer.command` uses `bun run build && bun run preview`.
  - Keep `port: 4173` unless `bun run preview` uses a different port in this repo.
  - Update `package.json` scripts to remove `npm run ...` chaining:
    - Change `test` to: `bun run test:unit -- --run && bun run test:e2e`

  **Must NOT do**:
  - Do not change Playwright testDir or add complex reporters in this slice.

  **Recommended Agent Profile**:
  - Agent ID: `CODER` — Reason: small config alignment.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Task 5 (stability) | Blocked By: none

  **References**:
  - Current config: `playwright.config.ts`
  - Existing e2e test: `e2e/demo.test.ts`

  **Acceptance Criteria**:
  - [x] `bun run test:e2e` starts its webServer and runs tests successfully (after Task 4/5 are complete)

  **QA Scenarios**:

  ```
  Scenario: Smoke run Playwright
    Tool: Bash
    Steps:
      1) bun run test:e2e
    Expected: exit code 0
    Evidence: .sisyphus/evidence/task-2-playwright-run.txt
  ```

  **Commit**: YES | Message: `🧪 e2e: use bun for scripts` | Files: `playwright.config.ts`, `package.json`

- [x] 3. Create placeholder routes for header navigation

  **What to do**:
  - Add minimal placeholder pages (title + short text only) for these routes:
    - `/projects`
    - `/organizations`
    - `/help`
    - `/login`
  - Each placeholder page must render an `h1` with a stable label for Playwright to assert.
  - Keep pages locale-safe: when generating links from the header, use the existing Paraglide `localizeHref` helper.

  **Must NOT do**:
  - Do not implement any real data fetching or auth in these pages.

  **Recommended Agent Profile**:
  - Agent ID: `CODER` — Reason: small route scaffolding.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Task 5 | Blocked By: none

  **References**:
  - Existing routing pattern: `src/routes/+page.svelte`, `src/routes/+layout.svelte`
  - Paraglide link helper imported already in: `src/routes/+layout.svelte`

  **Acceptance Criteria**:
  - [x] Visiting each route returns HTTP 200 in Playwright (Task 5 will assert)

  **QA Scenarios**:

  ```
  Scenario: Manual route smoke via Playwright
    Tool: Playwright
    Steps:
      1) page.goto('/projects')
      2) expect page.getByRole('heading', { level: 1, name: 'Projects' }) visible
      3) Repeat for /organizations, /help, /login
    Expected: each route renders its h1
    Evidence: .sisyphus/evidence/task-3-placeholders.txt
  ```

  **Commit**: YES | Message: `🧭 routes: add placeholder pages for shell nav` | Files: `src/routes/`

- [x] 4. Implement Yona-like shell in `src/routes/+layout.svelte`

  **What to do**:
  - Keep Paraglide behavior intact:
    - Do not change `src/hooks.server.ts` or `src/hooks.ts`.
    - Do not remove `%paraglide.lang%` / `%paraglide.dir%` from `src/app.html`.
  - Replace the current minimal layout with a shell that includes:
    - Header: logo (use `static/images/yona_logo.png`) + nav links (use `localizeHref('/projects')`, etc.)
    - Footer: attribution text similar to legacy footer, but minimal.
  - Wire favicon + Yobicon in **`src/app.html`** (decision-complete, base-safe):
    - Add `<link rel="icon" href="%sveltekit.assets%/favicon.ico" />` inside `<head>`.
    - Add `<link rel="stylesheet" href="%sveltekit.assets%/stylesheets/yobicon/style.css" />` inside `<head>`.
    - Do not keep the old `$lib/assets/favicon.svg` import-based favicon once this is in place.
  - Add stable selectors for testing:
    - Header root: `data-testid="yona-shell-header"`
    - Footer root: `data-testid="yona-shell-footer"`
    - Nav links: `data-testid="yona-nav-projects"` etc.
  - Styling approach (decision complete):
    - Keep Tailwind import in `src/routes/layout.css` and add a small CSS variable block inspired by legacy variables:
      - Use legacy references: `yona-original/app/assets/stylesheets/less/_variables.less` and `yona-original/app/assets/stylesheets/less/_page.less`.
      - Primary accent: orange `#F36C22` (legacy `@orange`).
      - Header background: near-black `#1b1b1b` (legacy `.gnb-outer`).
      - Nav text: `#a2a2a2` with hover white.
    - Do not port LESS; just recreate the minimal header/footer look.

  **Must NOT do**:
  - Do not copy/serve legacy Bootstrap or jQuery.
  - Do not re-introduce legacy iframe/sidebar pin behaviors.

  **Recommended Agent Profile**:
  - Agent ID: `CODER` — Reason: Svelte + CSS implementation.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Task 5 | Blocked By: Task 1

  **References**:
  - Current layout: `src/routes/+layout.svelte`
  - Current html shell: `src/app.html`
  - Tailwind entry: `src/routes/layout.css`
  - Legacy header HTML: `yona-original/app/views/common/navbar.scala.html`
  - Legacy footer HTML: `yona-original/app/views/common/footer.scala.html`
  - Legacy header/footer CSS: `yona-original/app/assets/stylesheets/less/_page.less` (see `.gnb-outer`, `.gnb-nav`, `.page-footer-outer`)
  - Legacy color tokens: `yona-original/app/assets/stylesheets/less/_variables.less`
  - Paraglide usage in layout: `src/routes/+layout.svelte` imports `localizeHref`

  **Acceptance Criteria**:
  - [x] `bun run build` succeeds
  - [x] Home page renders header + footer with the `data-testid` selectors
  - [x] Logo image request returns HTTP 200 in Playwright

  **QA Scenarios**:

  ```
  Scenario: Shell renders on home
    Tool: Playwright
    Steps:
      1) page.goto('/')
      2) expect locator('[data-testid="yona-shell-header"]') visible
      3) expect locator('[data-testid="yona-shell-footer"]') visible
      4) expect page.locator('img[alt="Yona"]') visible
    Expected: header/footer/logo visible
    Evidence: .sisyphus/evidence/task-4-shell.png

  Scenario: Assets are base-safe
    Tool: Playwright
    Steps:
      1) page.goto('/')
      2) Ensure CSS request for `/stylesheets/yobicon/style.css` succeeds (status 200)
    Expected: stylesheet loads successfully
    Evidence: .sisyphus/evidence/task-4-yobicon-network.txt
  ```

  **Commit**: YES | Message: `✨ shell: add yona header/footer layout` | Files: `src/routes/`, `src/app.html`, `src/routes/layout.css`

- [x] 5. Update/add tests for shell + nav + Paraglide lang/dir injection

  **What to do**:
  - Update existing tests to match the new home page content:
    - `e2e/demo.test.ts` currently asserts `h1` visibility; update it to assert shell presence.
    - `src/routes/page.svelte.spec.ts` currently asserts `h1` exists; update it to assert new primary heading or header selector.
  - Add a new Playwright test `e2e/shell.test.ts` with these assertions:
    - Shell header/footer visible.
    - Each nav link navigates to the placeholder page and retains shell.
    - `document.documentElement.lang` and `dir` are not placeholder strings and have valid values.
  - Keep Vitest tests minimal (one test is enough) to avoid setup churn.

  **Must NOT do**:
  - Do not add screenshot diffing or flaky timing-based assertions.

  **Recommended Agent Profile**:
  - Agent ID: `TESTER` — Reason: test-focused updates.
  - Agent ID: `CODER` if production changes are needed to add stable selectors.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: none | Blocked By: Task 2, Task 3, Task 4

  **References**:
  - Existing Playwright test: `e2e/demo.test.ts`
  - Existing Vitest browser test pattern: `src/routes/page.svelte.spec.ts`
  - Playwright config: `playwright.config.ts`
  - Paraglide injection: `src/hooks.server.ts`, `src/app.html`

  **Acceptance Criteria**:
  - [x] `bun run test:unit -- --run` succeeds
  - [x] `bun run test:e2e` succeeds

  **QA Scenarios**:

  ```
  Scenario: Navigation works and shell persists
    Tool: Playwright
    Steps:
      1) page.goto('/')
      2) click [data-testid="yona-nav-projects"]
      3) expect URL contains '/projects'
      4) expect header/footer visible
      5) Repeat for organizations/help/login
    Expected: URL changes and shell persists
    Evidence: .sisyphus/evidence/task-5-nav.txt

  Scenario: Paraglide placeholders replaced
    Tool: Playwright
    Steps:
      1) page.goto('/')
      2) const lang = await page.evaluate(() => document.documentElement.lang)
      3) const dir = await page.evaluate(() => document.documentElement.dir)
    Expected:
      - lang is non-empty and does not include 'paraglide'
      - dir is 'ltr' or 'rtl' and does not include 'paraglide'
    Evidence: .sisyphus/evidence/task-5-lang-dir.txt
  ```

  **Commit**: YES | Message: `🧪 test: cover yona shell and navigation` | Files: `e2e/`, `src/routes/`

## Final Verification Wave

- [x] F1. Plan Compliance Audit — `REVIEWER` (verify i18n unchanged, slice scope respected)
- [x] F2. Code Quality Review — `REVIEWER` (Svelte 5 patterns, no enums, minimal CSS)
- [x] F3. Automated QA Run — `REVIEWER` (run all verification commands)

## Commit Strategy

- Prefer 1 commit per TODO item (5 commits). If you want fewer commits, merge Tasks 1+4 and Tasks 2+5, but keep diffs reviewable.

## Success Criteria

- The app boots and renders Yona-like shell on `/` with migrated favicon/logo/icon font.
- Navigation across placeholder routes works and remains locale-safe.
- Unit + e2e tests pass using bun.
