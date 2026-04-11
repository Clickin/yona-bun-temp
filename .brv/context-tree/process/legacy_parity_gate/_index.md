---
children_hash: 1aaf485b165c4e20dbfcbc6727f7a6c7147d0654f80c59e482f729cdad1daec2
compression_ratio: 0.4301494476933073
condensation_order: 1
covers: [yona_legacy_parity_gate.md]
covers_token_total: 1539
summary_level: d1
token_count: 662
type: summary
---
**Yona Legacy Parity Gate (yona_legacy_parity_gate.md)**
- **Purpose:** Automate verification that capability-level changes in the Yona repo are grounded in legacy evidence before claiming parity.
- **Key Components:**  
  - Skill definition at `.agents/skills/yona-legacy-parity/SKILL.md` instructing reviewers to compare touched capabilities against `yona-original/` evidence and provenance docs (`docs/provenance/...`).
  - CLI tool `tools/yona-parity-gate.mjs` handling PARITY_SLICES (public landing, project/org directories) and DOMAIN_BUCKETS (auth account lifecycle, ACL baseline, CRUD, workspace, issue/PR flows, search, repo/smart HTTP, attachment ACL, deferred scope), normalizing paths, classifying files, and emitting pass/expected-nonparity/block verdicts with `--staged`, `--json`, `--require-pass`.
  - Hooks (`.codex/hooks/post-tool-use-yona-parity.mjs`, `.codex/hooks/stop-yona-parity.mjs`, `.codex/hooks.json`) and `tools/precommit-verify.mjs` integrate the gate into tooling/CI, lint/format checks, and pre-commit flows, enforcing blocks via `shouldBlockForStrictGate`.

- **Workflow:**  
  1. Identify touched capability.  
  2. Determine slice status (parity/semantic drift/missing/deferred).  
  3. Extract behavior, permissions, route/UI wording from legacy evidence.  
  4. Compare change to legacy behavior.  
  5. Verify supporting tests/provenance/audit references.  
  6. Return verdict (pass/expected-nonparity/block).  

- **Dependencies:** Relies on the `yona-original/` reference tree (tests, views, routes), provenance docs (`phase-0b/legacy-test-inventory.md`, `core-parity-audit.md`), Node tooling, git staged diffs, and `oxlint`/`oxfmt`.

- **Highlights/Rules:** Enforcement prevents claiming parity without legacy correlation; hooks block merges and prompt contributors to rerun `$yona-legacy-parity`/`pnpm parity:check`, consult `yona-original/`, and update tests/provenance; strict rules forbid using modern-only behavior, rust-mixed files, or reopening deferred slices without explicit changes; stop hook provides formatted summaries guiding remediation.

- **Facts of Record:**  
  - Legacy parity skill scope mandates evidence mapping to `yona-original/` files and specific provenance docs.  
  - Defined six-step parity workflow with passthrough verdicts.  
  - PARITY_SLICES and DOMAIN_BUCKETS enumerate expected coverage areas.  
  - CLI gate exposes path normalization, file classification, JSON output, staged checking, and fail-fast `--require-pass`.  
  - Pre-commit verification runs lint/format, runs the gate, and halts commits when strict blocking applies, reporting success only after clearance.