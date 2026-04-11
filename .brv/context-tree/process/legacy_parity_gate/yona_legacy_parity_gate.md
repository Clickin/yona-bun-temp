---
title: Yona Legacy Parity Gate
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-07T14:41:04.252Z'
updatedAt: '2026-04-07T14:41:04.252Z'
---
## Raw Concept
**Task:**
Document the repository-local Yona legacy parity automation that validates capability-level changes against legacy evidence and enforces pass/expected-nonparity/block verdicts before claiming parity.

**Changes:**
- Added the `.agents/skills/yona-legacy-parity/SKILL.md` skill definition so reviewers know to compare touched capabilities to `yona-original/` evidence and probate docs.
- Implemented `tools/yona-parity-gate.mjs` with PARITY_SLICES, DOMAIN_BUCKETS, evidence detection helpers, and CLI flags that normalize paths, classify files, and emit verdicts.
- Hooked parity evaluation into `.codex/hooks/post-tool-use-yona-parity.mjs`, `.codex/hooks/stop-yona-parity.mjs`, and `tools/precommit-verify.mjs` so tooling automatically rejects blocks and guides remediation.

**Files:**
- .agents/skills/yona-legacy-parity/SKILL.md
- tools/yona-parity-gate.mjs
- .codex/hooks.json
- .codex/hooks/stop-yona-parity.mjs
- tools/precommit-verify.mjs

**Flow:**
1. Identify the touched capability, 2. Determine the slice status (parity/semantic-drift/missing/deferred-2nd-priority), 3. Extract user-visible behavior, permissions, route flow, and UI wording from legacy evidence, 4. Compare the change to legacy behavior, 5. Ensure parity evidence exists (tests, provenance/audit updates, explicit legacy references), 6. Return verdict pass/expected-nonparity/block.

**Timestamp:** 2026-04-07

**Author:** Yona legacy parity automation maintainers

## Narrative
### Structure
The automation is defined as a ByteRover skill document that tells reviewers to work within the Yona repo, compare against the `yona-original/` tree, and consult provenance docs plus matching legacy files when touching capability slices. `tools/yona-parity-gate.mjs` then implements helper functions that normalize git paths, classify implementation versus legacy evidence, locate tests/provenance artifacts, and evaluate each slice or domain bucket before emitting a verdict. Hooks in `.codex/hooks.json` (post-tool-use and stop hooks) call the gate script so automation runs during tooling and CI, and `tools/precommit-verify.mjs` wraps lint/format checks around the gate so a blocked verdict aborts commits.

### Dependencies
Depends on the `yona-original/` reference tree, docs such as `docs/provenance/phase-0b/legacy-test-inventory.md` and `docs/provenance/core-parity-audit.md`, evidence matching legacy files under `yona-original/test/**`, `yona-original/app/views/**`, and `yona-original/conf/routes`, Node tooling, git for staged file enumeration (`git diff --cached`), and `oxlint`/`oxfmt` for linting/formatting during pre-commit.

### Highlights
The gate keeps modern code from claiming parity without tangible legacy references and supporting tests, supports verdicts pass/expected-nonparity/block with unmapped implementation surface reporting, and integrates with hooks so `$yona-legacy-parity` or `pnpm parity:check` can be rerun whenever necessary. Hooks therefore stop merges when a block is detected and instruct contributors to inspect legacy evidence, update tests/provenance, and rerun the gate, while pre-commit and stop hooks emit informative summaries and enforce strict gates via `shouldBlockForStrictGate`.

### Rules
Do not claim parity based on modern behavior alone; do not treat `yona-rust/` or files that mix rust and other layers in the repo root as legacy references; do not reopen deferred scope unless the contributor explicitly adds changes to it; do not claim completion until tests and provenance agree; when the stop hook triggers a block provide the formatted summary and remind contributors to use `$yona-legacy-parity`, inspect `yona-original/`, update tests/provenance, and rerun `pnpm parity:check`.

### Examples
Run `node tools/yona-parity-gate.mjs --staged --json` or pass `--require-pass` to emit structured output and fail fast; the stop hook reads optional JSON stdin, evaluates the gate, and either continues or emits `decision:block` with human guidance; `tools/precommit-verify.mjs` prints “precommit: verification passed” only after lint/format targets succeed and the parity gate clears, otherwise it exits 1 when strict blocking is enforced.

## Facts
- **legacy_parity_skill_scope**: Yona legacy parity automation skill in `.agents/skills/yona-legacy-parity/SKILL.md` requires comparing touched capabilities to `yona-original/` and referencing docs under `docs/provenance/phase-0b/legacy-test-inventory.md`, `docs/provenance/core-parity-audit.md`, plus matching legacy files under `yona-original/test/**`, `yona-original/app/views/**`, and `yona-original/conf/routes`. [project]
- **parity_workflow**: Verification follows six steps: identify the capability, determine slice status (parity/semantic-drift/missing/deferred-2nd-priority), extract user-visible behavior/permissions/route/UI wording, compare to legacy behavior, ensure tests/provenance/audit evidence, and return a verdict (pass/expected-nonparity/block). [convention]
- **parity_buckets**: PARITY_SLICES cover the public landing, public project directory, and public organization directory while DOMAIN_BUCKETS span auth-account lifecycle, ACL baseline, organization/project CRUD, workspace, issue lifecycle, PR/review, search, repo/smart HTTP, attachment/asset ACL, and deferred scope, each requiring evidence before parity is claimed. [project]
- **parity_gate_cli**: The `tools/yona-parity-gate.mjs` CLI normalizes paths, classifies implementation versus legacy/test/provenance files, and exposes `--staged`, `--json`, and `--require-pass` flags while exiting non-zero on a block or require-pass failure. [project]
- **precommit_verify**: Pre-commit verification (`tools/precommit-verify.mjs`) collects git staged files, filters out ignored prefixes and generated suffixes, runs `oxlint`/`oxfmt` on eligible files, evaluates the parity gate, and blocks when `shouldBlockForStrictGate` is true before printing “precommit: verification passed.” [project]
