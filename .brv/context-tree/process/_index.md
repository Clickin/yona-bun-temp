---
children_hash: 5d9c95fdaa52034ecc1e4c2e6023e47bff04acdbf136cf1c0d59b9a140d3131f
compression_ratio: 0.4638615541228368
condensation_order: 2
covers: [context.md, feature_parity_governance/_index.md, legacy_parity_automation/_index.md, legacy_parity_gate/_index.md]
covers_token_total: 2947
summary_level: d2
token_count: 1367
type: summary
---
# process Structural Summary

## Domain Intent & Constraints (`context.md`)
- **Purpose:** Defines migration governance rules enforcing feature-parity execution and agent authority for the Yona rebuild.
- **Scope:** Includes authority hierarchy between AGENTS.md/SPEC.md and supporting documentation, architectural constraints (no new structures, canonical tooling), and process dependencies that shape enforcement, documentation, and LLM onboarding; excludes daily engineering work and unrelated feature implementation details.
- **Ownership & Usage:** Managed by the Migration Governance Council; consult this domain when verifying documents that hold execution authority and when aligning implementations with enforced constraints.

## Feature Parity Governance (`feature_parity_governance/_index.md` and covered entries)
- **Governance Hierarchy:** AGENTS.md prescribes “functional parity first” and “no new structure,” overriding SPEC.md and cascading into README/CLAUDE mirrors; SPEC.md locks the stack to TanStack Start + React + Bun runtime with in-process tRPC, Better Auth sessions, multi-db parity, and Git/SVN commands, while documentation mirrors maintain ordered status banners and Rust references enforced by `tools/verify-agents-integrity.mjs` and `pnpm verify:agents`.
- **Canonical Tech Baseline:** Transition to top-level `yona-rust` workspace; frontend routing restricted to `src/routes/**` generated via `routeTree.gen.ts`, banning legacy helpers and `any`-typed sources enforced by `typing-harness.spec.ts`; verification consists of `pnpm verify:agents`, router/db contracts, and typing harness, with provenance audits tracking deferred/gap/deviation states.
- **Parity Automation & Tooling:** Legacy parity automation skill (.agents/skills/yona-legacy-parity/SKILL.md), gate runner (`tools/yona-parity-gate.mjs`), Codex hooks, and `tools/precommit-verify.mjs` gate commits/changes using capability catalogs, verdict semantics (pass/expected-nonparity/block), and provenance evidence; CLI supports `--staged`, `--json`, strict blocking, and Windows-safe pre-commit lint/format flows.
- **Wave Plans & Parity Checks:** Wave 1 restores legacy public landing/nav IA, gating subsequent waves until suites rerun (`bun run check`, `bun run test:unit`, `packages/db test:sqlite`); `/orgs` route must match legacy pagination/filter/logo/contract expectations with dependencies across contracts, db helpers, organization service, and survey audits; Wave 0 workspace parity verifies PilotService workspace features with proto/domain services, AppRepository, frontend auth shells, and combined pnpm/cargo + Playwright/Vitest coverage plus audit matrices.

## Legacy Parity Automation (`legacy_parity_automation/_index.md`)
- **Objective:** Repo-local automation preserving alignment with the legacy app through the `yona-legacy-parity` skill, gate runner, and enforcement hooks.
- **Flow:** Skill catalogs provenance/inventory docs feeding the gate (`tools/yona-parity-gate.mjs`), which maps changed files to capability-domain buckets, checks tests/provenance/legacy evidence, and outputs verdicts; CLI options include `--staged`, `--json`, and summaries. Hooks (Codex and pre-commit) rerun the gate after tool use or before commits, running lint/format with `oxlint/oxfmt`, resolving Windows git paths, and blocking when strict rules apply.
- **Dependencies:** Provenance docs (`docs/provenance/...`), legacy evidence under `yona-original/`, git diffs, Node CLI, and lint/format tooling.
- **Rules:** Must cite legacy coverage rather than modern roots, respect deferred scopes (SVN/LDAP/import/export/migration), and ensure every parity slice is backed by documentation/test/evidence before claiming completion.

## Legacy Parity Gate (`legacy_parity_gate/_index.md`)
- **Automation Role:** Validates capability-level changes against legacy evidence before declaring parity, relying on the skill definition, CLI gate, hooks, and pre-commit enforcement.
- **Components & Workflow:** Skill mandates comparisons to `yona-original/` and provenance docs; `tools/yona-parity-gate.mjs` defines PARITY_SLICES and DOMAIN_BUCKETS, normalizes paths, classifies files, and emits pass/expected-nonparity/block verdicts with staged/JSON/require-pass flags; hooks integrate the gate into tooling, CI, and commits via `shouldBlockForStrictGate`.
- **Process Steps:** Identify capability, gauge slice status, extract legacy behavior, compare changes, verify tests/provenance/audits, and return verdict.
- **Highlights:** Enforcement prevents declaring parity without legacy correlation, blocks merges, and guides contributors to rerun parity checks; rules forbid relying solely on modern behavior or reopening deferred scopes without explicit coverage.

### Drill-Down References
- **Authority & Canonical Docs:** `2026_04_05_agents_priority_enforcement.md`, `2026_04_05_agents_spec_alignment.md`, `2026_04_05_canonical_execution_spec.md`, `rust_conversion_governance_spec.md`.
- **Routing & Verification:** `frontend_canonical_spec.md`, `typing-harness.spec.ts`, `pnpm verify:agents`, `cargo router_contract`.
- **Automation & Hooks:** `legacy_parity_automation.md`, `Yona Legacy Parity Automation`, `.agents/skills/yona-legacy-parity/SKILL.md`, `tools/yona-parity-gate.mjs`, `.codex/hooks/*.mjs`, `tools/precommit-verify.mjs`.
- **Wave & Route Plans:** `2026_04_05_parity_wave_plan.md`, `organization_directory_parity_2026_04_05.md`, `wave_0_workspace_parity_summary.md`.