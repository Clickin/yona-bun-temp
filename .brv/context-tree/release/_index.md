---
children_hash: 3c886098710e318fa4260c745a7893ad8132b82d683d015346acf78d1409e35a
compression_ratio: 0.3249107388080198
condensation_order: 2
covers: [context.md, demo_ready_pr_merge_review/_index.md, pilot_frontend/_index.md, pilot_rust_baseline/_index.md, stack_decisions/_index.md]
covers_token_total: 3641
summary_level: d2
token_count: 1183
type: summary
---
# release Structural Summary

- **Domain Purpose & Usage**: Release domain captures landing branch runbooks ensuring minimal drift cherry-picks, verification sequences, and provenance-aligned messaging. It documents precise branch preparation, verification, and follow-up policies owned by Release Engineering + Provenance.

- **demo_ready_pr_merge_review**: 
  - **Landing Plan** (`landing_plan_2026_04_05_demo_ready_pr_merge_review.md`): Defines landing-demo-ready-pr worktree creation, cherry-pick offset (`861408a` onto `704a665`), fixed verification suite, generated-file restoration rules, and provenance doc sync language. Follow-ups limited to drift fixes, generated-file cleanup, or documentation sync, with failure logs stored under `.omx/plans/*-failure.md`.
  - **Stacked PR Integration** (`stacked_pr_integration_plan.md`): Coordinates PR1 (`main-sync-20260405`) and PR2 (`landing-demo-ready-pr-merge-review-20260405`) with ordered branch/push flows, upstream sync counts (six commits for PR1, three for PR2), per-PR verification suites, generated-file gates (bun.lock, apps/app/src/routeTree.gen.ts), restack protocols, PR-body templates, and gating for verification gaps.
  - **Stacked PR Follow-Up** (`stacked_pr_review_follow_up*.md`): Records review outcomes—PR #2 adds commit discussion moderation hooks; PR #3 adds merge-lease helpers, lease-before-merge enforcement, persistent `isMerging` state on DB failure, and scoped review-count reads—while capturing verification coverage (`packages/domain`, `packages/db`, `apps/app`, etc.) and blocked suites (`packages/db test:node`).
  - **Wave 1 Public Landing Parity** (`wave_1_public_landing_parity.md`): Aligns anonymous landing experience with legacy hero/feature layout, nav links, and routing (`_app.index.tsx`/`_app.tsx`), mandates legacy copy/nav/feature grid, forbids temporary labels, and ties global search behaviors and locale options to translations plus session/route helpers; tests include `-public-landing-parity.spec.tsx` and provenance audit in `docs/provenance/core-parity-audit.md`.

- **pilot_frontend**:
  - **Context** (`context.md`): Ensures pilot frontend parity by aligning Vite config, entry point, and Vitest suites with canonical release, referencing generated route tree and pilot service mocks.
  - **Build Parity** (`pilot_frontend_build_parity.md`): Documents config chain `apps/app/vite.pilot.config.ts` → `tanstackRouterGenerator` → `src/pilot-routeTree.gen.ts` → `apps/app/index.html` loading `./src/main.tsx`, stripping absolute paths, and ensuring minimal TanStack dependency surface. Vitest suites validate route tree rendering and entry expectations.
  - **Issue Detail Parity** (`pilot_issue_detail_parity.md`): Covers `-issue-detail-parity.spec.tsx` that mocks pilot services, boots session via `readPilotSessionBootstrap`, toggles issue state (`runPilotIssueStateToggle`), and asserts success/error flows while matching canonical issue shell snapshots and maintaining pilot session bootstrapping semantics.

- **pilot_rust_baseline**:
  - **Context & Baseline** (`context.md`, `pilot_rust_baseline.md`): Captures R0-3 Rust baseline tying the PilotService gRPC API (`yona/pilot/v1/pilot.proto`), server/runtime wiring (`yona-rust/crates/server/src/lib.rs`), persistence repo responsibilities (`crates/persistence/src/repo.rs`), frontend workspace orchestration (`frontend/src/App.tsx`), and provenance mapping of legacy Java tests to Rust targets (docs/provenance/phase-0b/project.md), emphasizing workspace visibility, enrollment, favorites/recents, and noted gaps (delete/transfer, enrollment management, settings UX, member/webhook stats).

- **stack_decisions**:
  - **Domain Context** (`context.md`, `runtime_stack_decision_report_2026_04_06.md`): Centers on the 2026-04-06 runtime stack decision reinforcing Bun+TypeScript+React+TanStack Start parity-first path with Go fallback and future Rust track, covering hard gate constraints (multi-DB coverage, Git/SVN executables, SFX/Docker/K8s deployments) plus pivot triggers (Bun warm RSS >1 GB, parity blockers, executable/rust readiness).
  - **Architectural Choices**: Documents measured Bun performance (Windows SFX ~850 ms, warm RSS ~219 MB), weighted scoring (Bun 420, Go 330, Rust 280), and forces parity delivery with TanStack Start baseline, live markdown preview priority, and avoidance of structural overhauls.
  - **Decision Process & Rules**: Describes flow from scope to scoring, hard gate table outcomes, and pivot rules that re-evaluate Go when Bun/SFX issues emerge and Rust once post-parity Git/executable conditions align. References release planning context in `release/demo_ready_pr_merge_review/landing_plan_2026_04_05_demo_ready_pr_merge_review.md`.