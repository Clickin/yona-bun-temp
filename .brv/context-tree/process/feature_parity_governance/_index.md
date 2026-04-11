---
children_hash: 57570ff18085e4dc2aad868b96edd152a4f6d3ca08b12744eaeee9f7ccd5da47
compression_ratio: 0.10264550264550265
condensation_order: 1
covers: [2026_04_05_agents_priority_enforcement.md, 2026_04_05_agents_spec_alignment.md, 2026_04_05_canonical_execution_spec.md, 2026_04_05_parity_wave_plan.md, context.md, frontend_canonical_spec.md, legacy_parity_automation.md, organization_directory_parity_2026_04_05.md, rust_conversion_governance_spec.md, wave_0_workspace_parity_summary.md, yona_legacy_parity_automation.md]
covers_token_total: 10395
summary_level: d1
token_count: 1067
type: summary
---
## Process / Feature Parity Governance Snapshot (2026-04-05)

- **Governance hierarchy** (see `2026_04_05_agents_priority_enforcement.md`, `2026_04_05_agents_spec_alignment.md`, `2026_04_05_canonical_execution_spec.md`, `rust_conversion_governance_spec.md`):
  - AGENTS.md sits atop the execution tree, imposing “functional parity first” and “no new structure” principles, overriding SPEC sections, and flowing down through SPEC, README, and CLAUDE mirrors.
  - SPEC.md becomes the canonical technical manual locking the stack (TanStack Start + React + Bun runtime, in-process tRPC backend, Better Auth sessions, multi-db parity, Git/SVN exec commands, llm-first surface).
  - Documentation mirrors (`docs/agents/00/01/03/05/07/08/09`, provenance inventories, README, CLAUDE, docs/workflow/plans) must carry canonical ordering, status banners, and Rust-target references; tools/verify-agents-integrity.mjs plus pnpm verify:agents enforce no stale patterns.

- **Rust + React canonical baseline** (refer to `2026_04_05_agents_spec_alignment.md`, `rust_conversion_governance_spec.md`, `frontend_canonical_spec.md`):
  - Yona pivots to a top-level `yona-rust` workspace (frontend, proto, Rust crates) with root mixed Bun/Go code treated as reference-only.
  - Frontend routing is locked to `src/routes/**` modules generated via `routeTree.gen.ts`; legacy routing helpers/configs and `any`-typed sources are banned, enforced by `typing-harness.spec.ts`.
  - Verification stack runs `pnpm verify:agents`, `cargo router_contract/db_router_contract`, and the typing harness to keep routing/typing hygiene, while provenance audits track deferred/gap/deviation states.

- **Parity automation / integrity tooling** (`legacy_parity_automation.md`, `Yona Legacy Parity Automation`, `2026_04_05_agents_spec_alignment.md`):
  - `.agents/skills/yona-legacy-parity/SKILL.md`, `tools/yona-parity-gate.mjs`, Codex hooks, and `tools/precommit-verify.mjs` gate unit-of-change status (pass/expected-nonparity/block) via capability catalogs, provenance evidence, and legacy references.
  - CLI supports `--staged`, `--json`, and strict-block semantics; the stop hook emits explicit block reasons and guidance, and pre-commit resolves git on Windows before lint/format plus parity enforcement.
  - Capability catalogs cover legacy slices (public landing, project/org directories, auth/account flows) and deferred buckets (SVN/LDAP/import/export/migration), with missing features documented across docs, provenance, and plans.

- **Wave plans & parity checks** (`2026_04_05_parity_wave_plan.md`, `organization_directory_parity_2026_04_05.md`, `wave_0_workspace_parity_summary.md`):
  - Wave 1 restores legacy public landing/global nav IA + CTAs/tests, with audits blocking downstream waves until previous suites rerun and parity checks (menu/CTA/section/forms states, pagination, nav entries) clear via `bun run check`, `bun run test:unit`, `bun run --cwd packages/db test:sqlite`.
  - `/orgs` route complies with legacy pagination, logos, filter preservation, contract validation, and provenance audit vocabulary; dependencies include contracts, db helpers, organization service, and survey audit matrix.
  - Wave 0 workspace parity tracks PilotService workspace overview (favorites, recents, notifications, emails, tokens, default landing) across proto, domain services, AppRepository, and frontend auth shells, with core audit matrix plus route/test exit snapshot confirming pnpm/cargo + Playwright/Vitest coverage.

- **Facts highlighted for drill-down**
  - AGENTS priority tiers, canonical doc ordering, and verification baseline (see `2026_04_05_agents_priority_enforcement.md` and `2026_04_05_agents_spec_alignment.md`).
  - Frontend routing policy, typing harness constraints, and verification baseline freeze (see `frontend_canonical_spec.md`).
  - Legacy parity automation commands, verdict rules, and hook flow (see `legacy_parity_automation.md` and `Yona Legacy Parity Automation`).
  - Organization directory pagination/logo rules and parity checklist gating rules (see `organization_directory_parity_2026_04_05.md` and `2026_04_05_parity_wave_plan.md`).
  - Wave 0 workspace overview flow, dependencies, and exit snapshot requirements (see `wave_0_workspace_parity_summary.md`).