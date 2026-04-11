---
children_hash: 26e538cd8bfa22807ca0963e02a8c6812c4826de1b3beb0a52e52835b785ecc5
compression_ratio: 0.6227848101265823
condensation_order: 1
covers: [context.md, legacy_parity_automation.md]
covers_token_total: 1185
summary_level: d1
token_count: 738
type: summary
---
# Legacy Parity Automation (process/legacy_parity_automation)

- **Scope & Purpose:** Documents the repo-local automation ensuring Yona changes stay aligned with the legacy app through the `yona-legacy-parity` skill, the gate runner (`tools/yona-parity-gate.mjs`), and enforcement hooks (Codex lifecycle hooks + Windows-safe `tools/precommit-verify.mjs`).

- **Architecture & Flow:**
  - `yona-legacy-parity` skill catalogs provenance/inventory docs under `.agents/skills/yona-legacy-parity/SKILL.md`, specifying capability-specific references and workspace paths, and feeds that catalog into the gate runner.
  - `tools/yona-parity-gate.mjs`:
    - Enumerates parity slices (e.g., public landing, project directory, organization directory) and domain buckets (auth/account lifecycle, ACL, workspace home, issue lifecycle, pull request/review, search, repo/smart HTTP, assets/ACL, deferred scopes).
    - Normalizes changed files, maps them to capabilities and domain buckets, checks tests/provenance/legacy evidence, and returns pass/expected-nonparity/block verdicts.
    - Offers CLI helpers for collecting changed files, parsing args, producing JSON/summary output, and exposes commands (`node tools/yona-parity-gate.mjs`, `--staged`, `--json`).
  - Enforcement:
    - Codex post-tool-use and stop hooks re-run the gate after tool execution.
    - `tools/precommit-verify.mjs` (Windows-safe) resolves git via common paths/where.exe, filters staged files, runs oxlint/oxfmt, evaluates the gate, and blocks commits if `shouldBlockForStrictGate` triggers.

- **Dependencies & Evidence Sources:**
  - Provenance documentation: `docs/provenance/core-parity-audit.md`, `docs/provenance/phase-0b/legacy-test-inventory.md`, `docs/agents/10-legacy-provenance-baseline.md`, plus capability-level docs under `docs/provenance/phase-0b/`.
  - Legacy evidence: `yona-original/test/**`, `yona-original/app/views/**`, `yona-original/conf/routes`.
  - Git diffs via `git diff --name-only --diff-filter=ACMR` (optionally `--cached`), Node.js CLI, oxfmt/oxlint tooling.

- **Operational Rules & Constraints:**
  - Do not rely solely on modern behavior; ignore `yona-rust/` or mixed-root code when citing legacy coverage.
  - Respect deferred scopes (SVN, LDAP, import/export, migration tooling) which auto-block.
  - Every parity slice needs matching tests, provenance references, or explicit legacy citations before claiming completion.

- **Key Facts for Drill-Down:**
  - **legacy_parity_skill**: Skill definition lives in `.agents/skills/yona-legacy-parity/SKILL.md`.
  - **parity_gate_runner**: `tools/yona-parity-gate.mjs` performs capability mapping and verdict emission.
  - **precommit_parity_gate**: `tools/precommit-verify.mjs` enforces parity gate in pre-commit scenarios with lint/format checks and git staging verification.

- **Related Work:** See `process/feature_parity_governance` for higher-level governance rules that contextualize this automation.