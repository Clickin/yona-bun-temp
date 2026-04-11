---
title: Yona Legacy Parity Automation
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-07T14:41:56.823Z'
updatedAt: '2026-04-07T14:41:56.823Z'
---
## Raw Concept
**Task:**
Describe the repo-local parity automation that gates commits based on legacy parity evidence and hooks.

**Changes:**
- Added the yona legacy parity skill definition and required provenance sources
- Defined tools/yona-parity-gate.mjs with capability catalogs, verdict rules, and CLI helpers
- Hooked PostToolUse and Stop Codex events plus pre-commit verification to re-run the parity gate

**Files:**
- .agents/skills/yona-legacy-parity/SKILL.md
- tools/yona-parity-gate.mjs
- .codex/hooks.json
- .codex/hooks/post-tool-use-yona-parity.mjs
- .codex/hooks/stop-yona-parity.mjs
- tools/precommit-verify.mjs

**Flow:**
Determine touched capability -> classify status -> extract legacy evidence -> compare artifacts -> collect test/provenance/legacy references -> return verdict -> enforce via hooks and pre-commit gate

## Narrative
### Structure
The skill documents the purpose, required provenance inventories, workflow steps, and stop conditions for classification. tools/yona-parity-gate.mjs normalizes changed files, distinguishes implementation vs non-implementation, catalogs parity slices vs domain buckets, and exposes CLI helpers for evaluation and git diff collection.

### Dependencies
Hooks rely on .codex/hooks.json, the PostToolUse hook scripts, and the Stop hook that reuses parity gate utilities. The pre-commit script resolves git on Windows, filters generated files, runs lint/format checks, and finally calls the parity gate with staged files.

### Highlights
Skill returns pass/expected-nonparity/block summaries prefixed with [yona-legacy-parity]; capabilities require tests/provenance/legacy references; deferred scopes immediately block; unmapped implementations raise warnings. Stop hook emits decision, reason, and systemMessage when blocking. Pre-commit gate logs summaries and exits with status 1 when strict blocking is needed.

### Rules
Runner enforcement: deferred scopes -> block; parity slices need tests/provenance/legacy reference; partial/gap slices with evidence -> expected-nonparity, otherwise block; unmapped files block by warning about missing legacy mapping. Stop hook block payload: decision "block", reason formatted summary with remediation directions, and systemMessage depending on stop_hook_active flag. Pre-commit verifier exits 1 on shouldBlockForStrictGate and prints "precommit: verification passed" when gate passes.

### Examples
Runner commands: node tools/yona-parity-gate.mjs, node tools/yona-parity-gate.mjs --staged, node tools/yona-parity-gate.mjs --json. Pre-commit logs counts for oxlint and oxfmt targets, prints parity summaries, and fails fast when the gate decides to block a commit.

## Facts
- **yona_legacy_parity_skill_sources**: The yona-legacy-parity skill relies on .agents/skills/yona-legacy-parity/SKILL.md and provenance inventories plus matching yona-original files for tests, view, and route references. [project]
- **parity_gate_runner_commands**: The parity gate runner exposes node tools/yona-parity-gate.mjs with --staged and --json flags to evaluate changed files and print either formatted summaries or JSON results. [project]
- **precommit_parity_enforcement**: The Windows-safe pre-commit verifier resolves git on typical install paths, filters out generated files, runs oxlint/oxfmt on staged files, and then enforces the parity gate before allowing commits. [project]
