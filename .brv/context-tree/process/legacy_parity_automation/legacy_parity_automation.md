---
title: Legacy Parity Automation
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-07T14:43:19.643Z'
updatedAt: '2026-04-07T14:43:19.643Z'
---
## Raw Concept
**Task:**
Document the repo-local legacy parity automation skill, gate runner, and enforcement hooks that keep Yona changes aligned with the legacy app.

**Changes:**
- Added the `yona-legacy-parity` skill under `.agents/skills/yona-legacy-parity/SKILL.md` with provenance/inventory references and a structured workflow.
- Implemented `tools/yona-parity-gate.mjs` to catalog parity slices, map changed files to domain buckets, and produce pass/expected-nonparity/block verdicts based on tests, provenance, or legacy references.
- Hooked Codex PostToolUse/Stop lifecycle events and the Windows-safe `tools/precommit-verify.mjs` flow to re-run the parity gate before letting work continue.

**Files:**
- .agents/skills/yona-legacy-parity/SKILL.md
- tools/yona-parity-gate.mjs
- .codex/hooks.json
- .codex/hooks/post-tool-use-yona-parity.mjs
- .codex/hooks/stop-yona-parity.mjs
- tools/precommit-verify.mjs

**Flow:**
1. Identify touched capability. 2. Classify capability status. 3. Read matching legacy evidence for behavior, permissions, routes, and UI wording. 4. Compare change to legacy behavior. 5. Verify parity evidence via tests, provenance updates, or legacy references. 6. Return pass/expected-nonparity/block, run evaluateParityGate to map changed files to parity slices and domain buckets, then enforce verdicts via Codex hooks and pre-commit verification.

**Timestamp:** 2026-04-07

## Narrative
### Structure
Automation binds the `yona-legacy-parity` skill to `tools/yona-parity-gate.mjs` and enforcement hooks. The skill enumerates required provenance docs (core parity audit, legacy test inventory, capability-specific references) and workspace directories under `yona-original/`. The gate runner tracks parity slices (public landing, project directory, organization directory) plus domain buckets (auth/account lifecycle, ACL, workspace home, issue lifecycle, pull request/review, search, repo/smart HTTP, assets/ACL, and deferred scopes), and exposes CLI helpers to collect changed files, parse arguments, and print JSON or formatted summaries.

### Dependencies
Relies on docs/provenance/core-parity-audit.md, docs/provenance/phase-0b/legacy-test-inventory.md, docs/agents/10-legacy-provenance-baseline.md, capability-specific provenance under docs/provenance/phase-0b/, matching legacy evidence in `yona-original/test/**`, `yona-original/app/views/**`, `yona-original/conf/routes`, a Git diff (`git diff --name-only --diff-filter=ACMR` optionally with --cached), Node.js for CLI scripts, and oxfmt/oxlint for lint/format checks.

### Highlights
Parity slices must ship tests, provenance references, or explicit legacy citations to report parity; domain buckets default to partial or gap statuses with gap evidence expectations; deferred scopes such as SVN/LDAP/import/export/migration immediately block. The `tools/precommit-verify.mjs` Windows-safe flow resolves git via common paths or where.exe, filters staged files, runs oxlint/oxfmt, evaluates the parity gate, and formats success/verification messages.

### Rules
Stop conditions: Do not rely solely on modern behavior, ignore `yona-rust/` or mixed-root code as legacy, respect deferred scopes (SVN, LDAP, import/export, migration tooling), and do not claim slices complete without matching tests/provenance. Runner commands (must preserve verbatim):
  - `node tools/yona-parity-gate.mjs`
  - `node tools/yona-parity-gate.mjs --staged`
  - `node tools/yona-parity-gate.mjs --json`

## Facts
- **legacy_parity_skill**: Legacy parity automation centers on the `yona-legacy-parity` skill defined in `.agents/skills/yona-legacy-parity/SKILL.md`. [project]
- **parity_gate_runner**: `tools/yona-parity-gate.mjs` normalizes changed files, matches them against capability catalogs, and emits pass/expected-nonparity/block verdicts using provenance docs, tests, and legacy evidence. [project]
- **precommit_parity_gate**: `tools/precommit-verify.mjs` resolves a Windows-safe git binary, runs oxlint/oxfmt on staged files, and enforces the parity gate by blocking commits when `shouldBlockForStrictGate` returns true. [convention]
