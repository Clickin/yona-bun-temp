---
children_hash: 16d4404746c2dce0a25a037e8d891a0ccafc4c7b48d71eee68fdf06065278bf6
compression_ratio: 0.2256667426487349
condensation_order: 3
covers: [auth/_index.md, authentication/_index.md, experimental_pilot/_index.md, migration/_index.md, pilot_service/_index.md, process/_index.md, project_directory/_index.md, project_directory_parity/_index.md, project_management/_index.md, project_updates/_index.md, projects/_index.md, release/_index.md, rust_foundation/_index.md, strategy/_index.md, tooling/_index.md]
covers_token_total: 17548
summary_level: d3
token_count: 3960
type: summary
---
## auth (d3 structural overview)
- **Domain intent**: `auth/_index.md` explains that Wave 2 UI, BetterAuth policies, and Connect pilot flows share TRPC/CSRF helpers, session cookies, and capability gating; use this domain to trace UI behaviors, router guardrails, and pilot proxy coordination.
- **Account UI Wave2**: `account_ui_wave2/_index.md` + `wave_2_account_ui_flows.md`
  - Flow: `readAuthUiCapabilities` → `AuthShell` rendering → TRPC procedures (`signInWithPassword`, `registerWithPassword`, resets, `signOut`); ties to shared schemas (`authIdentifierSchema`, `sessionProjectionSchema`) and env flags `YONA_AUTH_*`.
  - Rules: rate limits emit `Retry-After`/429, password-reset failures map to `app.auth.reset.invalidToken`, remember-me toggles cookie persistence, and confirmation modes (`none/admin/email`) gate session issuance.
- **BetterAuth policies**: `better_auth_policies/_index.md` + `better_auth_risk_closure_policy.md`
  - Auth router builds `AuthProcedureContext` (CSRF, session fusion, capability flags, rate limits) before register/login/reset/profile flows. Public gate restricts social/callback/verify routes, enforcing 429 + `auth.rate-limited`.
  - Email verification always routes through BetterAuth (`/login?verify=complete`); social buttons appear only when GitHub/Google env vars exist.
  - Observability tied to `BETTER_AUTH_SECRET`, `YONA_PUBLIC_ORIGIN`, `@yona/db`, capability service, and logging for email/reset/rate-limit anomalies.
- **Pilot connect**: `pilot_connect/_index.md`, `go_connect_pilot_hardening.md`
  - Rebase router on `YONA_BASE_PATH`, expose `/rpc` handlers and `/api/auth/session` bootstrap issuing `yona_session`, `yona_csrf_token`, and `X-CSRF-Token`.
  - Frontend reads CSRF bootstrap before Connect RPCs; `NewRouter` normalizes base path and relies on `internal/auth/session.go`, `sessionRoutePayloadSchema`, and Connect interceptors.

## authentication
- **Account UI Wave 2**: `account_ui_wave_2/_index.md`
  - UI contracts from `contracts/src/auth.ts` drive TRPC router and login/register routes; Always fetches `readAuthUiCapabilities`, enforces CSRF/rate limiting schemas, and toggles remember-me persistence.
- **Better Auth coverage** (`better_auth_gateway`, `better_auth_integration`, `better_auth_security_controls`)
  - Gateway proxies TRPC → BetterAuth HTTP endpoints (social login, verification), rate-limits endpoints with 429 + `Retry-After`, and instantiates social providers only when credentials present.
  - Router exposes `AuthProcedureContext`; view models map query params to localized statuses, hide inputs for social-only, and persist `setCurrentSessionData`.
  - Rules: Email verification callback `/login?verify=complete`, password reset tokens expire 1 hr with logging, proxy allowlist includes `/api/auth/sign-in/social`, `/api/auth/callback/{github|google}`, `/api/auth/verify-email`, and rate-limits return `auth.rate-limited`.
- **Pilot workspaces & sessions** (`pilot_auth_workspace_minimum`, `pilot_session_hardening`, `pilot_workspace_minimum`)
  - Pilot Service RPCs defined in `proto/yona/pilot/v1/pilot.proto`; servers (Axum/Connect) wire CSRF/session bootstrap at `/api/auth/session`, SeaORM models for users & defaults, and runtime configs injected into client shells.
  - Session hardening normalizes `YONA_BASE_PATH/rpc`, ensures anonymous session creation via `EnsureAnonymousSession`, Strict CSRF validation via constant-time comparisons, and require `readPilotSessionBootstrap` to get tokens before RPCs.
  - Workspace parity tracks overview enrichment (favorites/notifications/tokens/streams) and ensures mutations refresh caches; frontend shells (`auth-workspace-shell.tsx`) reuse normalized data with helper utilities.
- **Root admin bootstrap** (`root_admin_bootstrap/_index.md`)
  - Tracks initialization state in `packages/db/src/root-admin.ts`, enforces mutex `bootstrap_mutex` (migration `20260405120036_daffy_wraith`), and exposes CLI commands with `--password-stdin`.
  - Route `/setup/first-admin` only available when state `fresh-uninitialized`; password reset tokens TTL 3,600,000 ms; sessions invalidated via `app-service` helpers.
- **Wave 1 direct auth packet** (`wave_1_direct_auth_email_packet/_index.md`)
  - Rust server exposes endpoints (`/api/auth/session`, `/lostPassword`, `/resetPassword`, email send/confirm, RPCs); AppRepository handles normalization, verification tokens, notifications, and workspace projections; frontend shells mirror legacy flows.
  - Contract tests cover capability flags, auth journeys, email validation, workspace settings mutations, notifications, and landing normalization.

## experimental_pilot
- **Domain aim**: Captures experimental Rust/Go pilot sidecars until stabilization.
- **Rust sidecar** (`rust_sidecar/_index.md`, `experimental_rust_pilot_sidecar.md`)
  - Axum router (`crates/server/src/lib.rs`) wires persistence, runtime config, session modules, `/api/auth/session`, Connect RPC handlers, runtime config injection into SPA HTML, and rejects unsafe methods before fallback.
  - SeaORM persistence (`crates/server/src/persistence.rs`, `crates/migration/src/lib.rs`) defines tables via migration `m20260407_000001_create_pilot_tables` for SQLite/Postgres/MySQL/MariaDB; DB matrix script runs tests across containers.
  - Pipeline: codegen via `build.rs` using `connectrpc-build`, runtime config injection sequence, DB matrix validation (`scripts/run-db-matrix.ps1`), and frontend smoke tests hitting `/yona/`, `/yona/api/auth/session`, `/yona/rpc/.../ListProjects`.
  - Session bootstrap issues `yona_session`, `yona_csrf_token`, and `X-CSRF-Token`; `PilotServiceImpl` enforces CSRF/session checks on project/issue endpoints.

## migration
- **Domain governance**: Tracks migration phases, checkpoints, deferred work, and rules for parity (Phase 0B provenance focus, legacy baselines).
- **Phase plan overview** (`phase_plan_overview/_index.md`)
  - April 4 roadmap (Phases 0A–6); current checkpoint covers Phase 0B provenance with dependencies on legacy provenance baseline and deferred Phases 4–6.
- **Phase 0B provenance** (`phase_0b_provenance/_index.md`)
  - Documents Org/Project provenance completion, deferred features (PR/review lifecycle, search expansion, AI endpoints), and references `docs/provenance/phase-0b/README.md`.
- **Legacy provenance baseline**: Matrix tying legacy tests → modern targets → ownership and requiring PRs to cite matrix rows; enforces fixture/seeding strategies and capabilities for Wave 1 exit.
- **Legacy schema baseline**: Schema manifest/migration scripts (`migration/src/lib.rs`), SeaORM repos, and dialect compatibility tests ensure Rust recreates legacy database constraints.

## pilot_service
- **Domain scope**: PilotService RPCs, Axum/Connect runtime, and AuthWorkspaceShell parity for workspace flows.
- **r0_3_baseline**: Bootstraps PilotService RPC surface and workspace overview sync; gRPC (`pilot.proto`), server (`yona-rust/crates/server/src/lib.rs`), frontend (`yona-rust/frontend/src/App.tsx`) integrate CSRF-protected mutators and workspace refresh logic.
- **wave_0_route_foundation**: Canonical route table remaps legacy URLs while preserving pagination/workspace behaviors; route utilities feed AuthWorkspaceShell rendering.
- **wave_1 layers**:
  - `wave_1_auth_workspace_parity`: Extended RPCs for overview, notifications, emails, tokens; normalized persistence, parity tests for `/me` dashboard; runtime depends on `YONA_AUTH_*` flags, CSRF/session, bcrypt hashing.
  - `wave_1_dashboard_parity`: gRPC payload definitions for session/auth/workspace/favorites/issues, doc-driven provenance audit (`docs/provenance/core-parity-audit.md`), server routing guards, and front-end notification/stream rendering.
  - `wave_1_workspace_parity`: Expanded `ReadWorkspaceOverview` includes landing path, favorites, emails, tokens, issue/PR/project streams, notification prefs; persistence enforces normalized metadata; frontend shells reuse overview data; audit tracks drift and exit checklist.

## process
- **Domain intent**: Migration governance rules, authority hierarchy, canonical tooling, and parity enforcement diocese.
- **feature_parity_governance**: AGENTS/SPEC dictate “functionality parity first” and canonical stack (TanStack Start + React + Bun + tRPC + BetterAuth with multi-DB). Verification via `pnpm verify:agents`, typing harness, and router/db contracts. Automation skill/gate enforce compliance and audits.
- **legacy_parity_automation**: Skill inventories docs/evidence, `tools/yona-parity-gate.mjs` checks capability buckets, hooks integrate gate into Codex/pre-commit; ensures every parity claim references legacy evidence.
- **legacy_parity_gate**: Gate runner compares changes against legacy artifacts, emits pass/nonparity/block verdicts, and enforces strictness via hooks; blocking rules prevent merging without legacy correlation.

## projects
- **public_directory_parity**: Aggregates contract→domain→UI for `/projects`.
  - Pagination entry: validates filters via `publicListSearchSchema`, slices 10-row windows, uses `buildProjectsHref`, and enforces 5-page windows with placeholders.
  - Feature parity entry: `ProjectService.listProjects` aggregates labels/member/watcher counts, authorizes, and returns visible vs. redacted items consumed by UI cards; tests cover both branches.

## project_directory
- **Purpose**: Maintains `/projects` parity across backend contracts, domain services, UI, and tests.
- **public_projects**: Loader validates filters, hits `ProjectService.listProjects` (with normalization/aggregation), and renders visible/redacted cards; enforces naming regex & reserved names; highlights include member/watcher counts, label badges, origin links, and placeholder policy.
- **public_projects_parity**: Service returns discriminated unions (visible/redacted) with metadata, aggregated counts, and UI rendering specs; connectors include `packages/db/src/org-project.ts`, `packages/domain/src/project-service.ts`, and `contracts/src/project.ts`.
- **Relationship**: Domain shows how schemas → services → UI align and points to `release/demo_ready_pr_merge_review/landing_plan...` for parity deployment context.

## project_directory_parity
- **Domain goal**: Coordinate `/projects` parity contracts, DB, services, UI, and audits with release scope.
- **Subtopics**:
  1. **Landing & navigation parity** (`landing_navigation_wave1_parity/_index.md`): Anonymous hero, route/layout rules, global search, locale switcher, and audit via `core-parity-audit.md`.
  2. **Legacy directory list parity** (`legacy_directory_list_parity/_index.md`): Legacy `/projects`/`/orgs` pagination (10/30 rows, window=5), placeholders, loaders, and tests.
  3. **Organization directory parity**: Contracts enforce validation/role rules; loader + `OrganizationDirectoryPage` render paginated cards with logos and viewer metadata; pagination helpers ensure window rules.
  4. **Projects/orgs parity update**: 2026-04-05 restore of legacy flows with helper reuse, CSS, and audit coverage; details include pagination constants and formatting rules.
  5. **Projects parity baseline**: Contracts → DB → services → UI → audit matrix; includes metadata normalization, helper dependencies, and card badge rules.
  6. **Projects route parity**: Focused `/projects` route coverage with logos, member/watcher counts, placeholders, filters, and audit documentation.
  7. **Public directory parity snapshot**: Wave 0 restore summary with pagination constants and legacy helpers.
  8. **Public directory routes**: Legacy structure emphasis (`ul.all-projects`, `.info-wrap`, `.directory-pagination`), loaders, pagination rules, tests.
  9. **Public directory legacy chrome**: Loader sanitization, pagination rules, styling selectors; facts include placeholder policy and audit statuses.
- **Patterns**: Contracts drive loaders/services; shared CSS/helpers preserve appearance; audit doc `core-parity-audit.md` tracks statuses; constants (10 projects/30 orgs, window=5) and placeholder rules ensure navigation parity; specs guard metadata/pagination.

## project_management
- **Domain focus**: Entire public `/projects` request-to-render pipeline.
  - Flow: inbound params → `_app.projects.index.tsx` loader → `ProjectService.listProjects` → `packages/db/src/org-project.ts` aggregation → `ProjectDirectoryPage`.
  - Contracts: `contracts/src/project.ts` defines discriminated union between visible/redacted entries.
  - UI: Visible cards show member/watcher counts, labels, dates, origin links; redacted entries render placeholder text; helpers like `formatDate` ensure consistent presentation.
  - Testing: `project-directory-route.spec.tsx` verifies metadata/no leaks and placeholder handling.

## project_updates
- **Domain scope**: Operational logs tied to migration verification.
  - Logs topic (`logs/_index.md`, `omx_turns_highlights.md`): Chronicle April 2 validation, merge slices (`non_pr_commit_slice`, `demo_pr_merge_slice`) with Ft. diff statuses, validation suites (`bun run check`, `domain/unit tests`, SQL injection checks), and follow-up commits (e.g., `861408a`).
  - Relationship: Feeds migration phase plan checkpoints and readiness signals.

## release
- **Domain coverage**: Landing branch runbooks, verification policies, provenance messaging.
  - `demo_ready_pr_merge_review`: Landing plan, stacked PR integration/follow-up, and `wave_1_public_landing_parity` (legacy hero/nav layout, test `-public-landing-parity.spec.tsx`, audit doc).
  - `pilot_frontend`: Vite config chain, route tree generation, build parity, and issue detail parity spec ensuring session bootstrapping (`readPilotSessionBootstrap`) and pilot service mocks.
  - `pilot_rust_baseline`: R0-3 Rust baseline covering proto, server runtime, persistence, frontend workspace, and provenance mapping for parity gaps.
  - `stack_decisions`: 2026-04-06 runtime stack decision (Bun+TS primary, Go fallback, Rust future) with measurement data, weighted scoring, hard gates, and pivot rules.

## rust_foundation
- **Domain purpose**: R0-1 Rust foundation anchors for canonical `yona-rust` reference.
  - **Baseline**: Proto ownership/build (`connectrpc_build`), runtime config injection, agent tier documentation (`docs/shared/agent-tiers.md`), and anchor existence tests.
  - **Verification**: Anchor tests (`tests/yona-rust-foundation.test.mjs`), canonical workspace crate enforcement, frontend stack (pnpm 10.32.1, React 19, Vite 8, TS 5.9.3, Vitest 4.1.0), and tier mappings.

## strategy
- **Domain scope**: Runtime stack decisions and Rust pivot governance.
  - **runtime_stack_decisions**: 2026-04-06 report preserving Bun+TS primary stack, constraint comparisons, weighted scoring (Bun 420, Go 330, Rust 280), hard gates (multi-DB, Git/SVN), and pivot triggers (>1 GB RSS, TanStack instability, Bun blockers).
  - **yona_rust_pivot**: Governance entry (`context.md`) plus execution rules (`rust_pivot_execution_governance.md`) covering canonical workspace boundaries, doc/provenance synchronization, verification scripts, feature-phase scope, and strict rules (no new abstractions/UI tweaks, dual missing-feature recording).

## tooling
- **Domain role**: API transport spike tooling knowledge.
  - **inventory**: Generator scans `apps/app/src/lib`, normalizes query keys, emits `surface.json`/`query-keys.json`, and ensures Vitest diff-gate coverage.
  - **protobuf_codegen** & **protobuf_codegen_split**: Rust build uses `connectrpc_build` (Buf-free) verified by `tests/yona-rust-codegen-contract.test.mjs`; browser pipeline uses Buf to emit TS artifacts checked in (`frontend/src/gen/yona/pilot/v1`).
  - **Relationships**: Inventory outputs support release parity and project directory coverage; protobuf split doc (`docs/shared/protobuf-codegen.md`) and tests ensure both Rust and browser codegen governance.