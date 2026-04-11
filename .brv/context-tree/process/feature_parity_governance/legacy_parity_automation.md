---
title: legacy_parity_automation
tags: []
related: [process/feature_parity_governance/context.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-07T14:42:31.136Z'
updatedAt: '2026-04-07T14:42:31.136Z'
---
## Raw Concept
**Task:**
Document the repo-local Yona legacy parity automation workflow and enforcement hooks for feature parity governance.

**Changes:**
- Added the yona-legacy-parity skill definition to marshal capability evidence and verdict expectations.
- Introduced tools/yona-parity-gate.mjs as the strict parity gate runner with classification, evidence checks, and CLI flags.
- Hooked the automation into Codex PostToolUse and Stop hooks plus tools/precommit-verify.mjs to ensure parity checks run during lifecycle events.
- Secured Windows-friendly pre-commit verification that lints, formats, and enforces parity gating before allowing commits.

**Files:**
- .agents/skills/yona-legacy-parity/SKILL.md
- tools/yona-parity-gate.mjs
- .codex/hooks.json
- .codex/hooks/post-tool-use-yona-parity.mjs
- .codex/hooks/stop-yona-parity.mjs
- tools/precommit-verify.mjs

**Flow:**
Identify touched capability -> classify status (parity/semantic-drift/missing/deferred) -> read legacy evidence -> compare implementation -> verify tests/provenance/legacy references -> return pass/expected-nonparity/block verdict.

**Timestamp:** 2026-04-07

## Narrative
### Structure
The SKILL definition orchestrates capability identification and verdict expectations, `tools/yona-parity-gate.mjs` implements classification, evidence gathering, and CLI formatting, Codex hooks (PostToolUse and Stop) trigger the gate for lifecycle events, and `tools/precommit-verify.mjs` wraps lint/format plus gate enforcement for commits.

### Dependencies
Depends on provenance sources under docs/provenance/phase-0b/legacy-test-inventory.md, docs/provenance/core-parity-audit.md, docs/agents/10-legacy-provenance-baseline.md, and reference legacy behaviors from yona-original/test/**, yona-original/app/views/**, and yona-original/conf/routes.

### Highlights
Capability catalogs include parity-complete slices (public landing, project directory, organization directory) plus bucketed domains (auth/account lifecycle, ACL, organization/project CRU, workspace home, issue lifecycle, pull request/review, search, repo/smart HTTP, assets/ACL) with deferred scopes for SVN/LDAP/import-export/migration; classification aggregates evidence to either pass, expected-nonparity, or block, and the CLI prints JSON summaries replacing `[yona-legacy-parity]` prefix formatting when requested.

### Rules
Runner commands must be preserved verbatim: `node tools/yona-parity-gate.mjs`, `node tools/yona-parity-gate.mjs --staged`, `node tools/yona-parity-gate.mjs --json`. Stop hook outputs `decision: "block"` with reason `${formatParitySummary(result)} Use $yona-legacy-parity, inspect matching legacy files under yona-original/, update tests or provenance, then re-run pnpm parity:check.` and systemMessage toggles between "Yona legacy parity gate is still unresolved." and "Yona legacy parity gate blocked completion." depending on `stop_hook_active`.

### Examples
Run `node tools/yona-parity-gate.mjs --staged` to evaluate staged files, `node tools/yona-parity-gate.mjs --json` for machine-readable summaries, or let `tools/precommit-verify.mjs` resolve git and rerun the gate after linting/formatting; the stop hook will emit `{ continue: true }` when no block is found.

## Facts
- **parity_skill_source**: Legacy parity automation centers on `.agents/skills/yona-legacy-parity/SKILL.md` to define capability mappings and verdict behaviors. [project]
- **parity_runner_cli**: `tools/yona-parity-gate.mjs` supports `--staged`, `--json`, and `--require-pass`, prints JSON when requested, and exits with code 1 on any block unless `--require-pass` changes that behavior. [project]
- **parity_verdict_rules**: Parity slices require at least tests, provenance updates, or explicit legacy references to pass, while deferred buckets block instantly. [project]
- **precommit_sequence**: The Windows-safe pre-commit script resolves git explicitly before running `oxlint`, `oxfmt`, and `evaluateParityGate`, blocking commits when `shouldBlockForStrictGate` is true. [convention]
