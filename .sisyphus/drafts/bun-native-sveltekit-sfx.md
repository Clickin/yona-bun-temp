# Draft: Bun-native SvelteKit + SFX

## Requirements (confirmed)

- Make the current SvelteKit setup "more Bun-native".
- SSR is NOT mandatory.
- Keep SFX build as a non-negotiable deliverable.
- Avoid the class of issues where Node dev + Bun build breaks asset embedding.
- Keeping Vite (and thus SvelteKit's Vite build pipeline) is acceptable; "Bun-native" focus is runtime/packaging, not eliminating Vite.

## Technical Decisions

- Frontend stays SvelteKit (Svelte 5) + Vite build-time.
- Packaging for distribution uses SvelteKit adapter `@jesterkit/exe-sveltekit` to produce a single Bun SFX binary.
- Keep a "non-SFX" build path for local preview/tests (so Playwright webServer `bun run build && bun run preview` keeps working).
- Static assets are embedded via adapter `embedStatic: true` (avoid manual `embeddedFiles` management for SvelteKit static dir).
- SSR posture: keep defaults; do not refactor SSR/CSR behavior in this work package unless required for SFX correctness.

## Research Findings

- apps/web uses SvelteKit (Svelte 5) with Vite config at `apps/web/vite.config.ts`.
- apps/web SvelteKit config uses `@sveltejs/adapter-auto` in `apps/web/svelte.config.js`.
- Monorepo scripts run via Bun filters, but actual dev/build in web are `vite dev/build/preview` (`apps/web/package.json`, root `package.json`).
- SvelteKit API routes in `apps/web/src/routes/api/**/+server.ts` proxy into the Hono app via `apiApp.fetch` from `@yona/api`.
- SvelteKit is currently using server-only features (CSRF token load) in `apps/web/src/routes/*/+page.server.ts` and server hooks in `apps/web/src/hooks.server.ts` (paraglide middleware + session handling).
- Static assets required at runtime live under `apps/web/static/` (favicon, `/images/yona_logo.png`, `stylesheets/yobicon/**` fonts/CSS) and are referenced via `%sveltekit.assets%` in `apps/web/src/app.html`.
- i18n uses Paraglide via Vite plugin outputting generated runtime files to `apps/web/src/lib/paraglide/`; source messages in `apps/web/messages/*.json` are compile-time inputs.
- There is no `bunfig.toml` and no repo-level SFX build scripts yet (SFX guidance exists in `AGENTS.md`, but not implemented in package.json).
- If we keep SvelteKit: Vite cannot realistically be eliminated; adapters (exe-sveltekit / adapter-bun) still run through SvelteKit+Vite build.
- If we migrate to Bun+React: Bun can SSR React via `Bun.serve()` + `renderToReadableStream`, and can produce SFX via `bun build --compile`; asset embedding requires deliberate strategy.

## Open Questions

- Are we allowed to change the AGENTS.md fixed frontend decision (Svelte 5 + SvelteKit) and migrate UI to React?
- Target production shape: single SFX binary serving BOTH UI and API on same origin (recommended) vs separate artifacts?
- SSR posture: do we require SSR for any routes, or is React SPA / Svelte prerender acceptable?
- What exact failure mode are we solving today? (asset 404 in compiled binary, path resolution, missing fonts, i18n, env, etc.)
- Platform targets for SFX: linux-x64 only vs +windows +darwin, and baseline vs modern?

## Scope Boundaries

- INCLUDE: build/dev toolchain changes, adapter selection, SFX pipeline, asset embedding strategy, verification strategy.
- EXCLUDE (for now): rewriting application features, redesigning API contracts, major routing changes unless required by chosen build strategy.

## Option Scorecard (heuristic)

Scale:

- Risk (R): 1 low, 5 high
- Impact (I): 1 low change, 5 high change
- Benefit scores: 1 low, 5 high

| Option                                      | Effort (eng-days to "SFX runs + static + /api") |   R |   I | Benefit: SFX Reliability | Benefit: Bun-native (Vite-free) | Benefit: SSR capability |
| ------------------------------------------- | ----------------------------------------------: | --: | --: | -----------------------: | ------------------------------: | ----------------------: |
| Keep SvelteKit + `@jesterkit/exe-sveltekit` |                                             1-3 |   2 |   2 |                        4 |                               2 |                       5 |
| Migrate to Bun + React SPA (CSR)            |                                             3-6 |   3 |   4 |                        3 |                               5 |                       1 |
| Migrate to Bun + React SSR                  |                                            5-10 |   4 |   5 |                        3 |                               5 |                       4 |

Repo-specific drivers:

- Static assets include a non-trivial font bundle under `apps/web/static/stylesheets/yobicon/fonts/**`; manual embedding for Bun `--compile` is more work than adapter-driven embed.
- i18n uses Paraglide Vite plugin today; keeping SvelteKit keeps the pipeline, React options need a CLI build step + runtime integration.
- Existing CSRF + session/i18n hooks are implemented in SvelteKit; React options must re-implement equivalents.
