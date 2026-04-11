---
title: Rust Conversion Governance Spec
tags: []
related: [process/feature_parity_governance/context.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-07T11:58:04.263Z'
updatedAt: '2026-04-07T11:58:04.263Z'
---
## Raw Concept
**Task:**
Capture the Rust conversion governance established in AGENTS.md, SPEC.md, supporting docs, and verification tooling after the Rust pivot.

**Changes:**
- Promoted the experimental Rust pilot to top-level yona-rust and rewrote AGENTS/SPEC/README/CLAUDE plus docs/agents/* around Rust+React canonical ordering.
- Updated provenance owner/target paths to point at yona-rust crates and added historical status banners to docs/plans and docs/workflow.
- Introduced scripts/verify-agents-integrity.mjs to enforce the new AGENTS contract and forbid legacy doc patterns.

**Files:**
- AGENTS.md
- SPEC.md
- docs/agents/03-repo-structure.md
- docs/provenance/phase-0b/legacy-test-inventory.md
- tools/verify-agents-integrity.mjs

**Flow:**
Define canonical order (AGENTS > SPEC > docs/agents > docs/provenance > docs/plans/workflow) -> promote yona-rust workspace + annotate documentation with status banners -> update provenance inventories -> enforce AGENTS integrity via pnpm verify:agents and verify-agents-integrity.mjs.

**Timestamp:** 2026-04-07

**Author:** Yona Conversion Team

**Patterns:**
- `docs/agents/07-rust-sfx-deployment\.md` (flags: m) - Ensure AGENTS.md references the new Rust SFX deployment doc instead of the legacy bun-sfx filename.
- `docs/agents/08-rust-deployment-strategy\.md` (flags: m) - Anchor AGENTS.md on the Rust deployment strategy doc and block the old sveltekit deployment strategy file.
- `^\d+#\w+\|` (flags: m) - Detect corrupted line prefixes such as #XX| that violate canonical formatting.

## Narrative
### Structure
AGENTS.md now leads the conversion governance, followed by SPEC.md as the canonical execution spec, docs/agents as mirrors, docs/provenance for legacy intent/canonical owner mapping, and docs/plans/workflow that must carry historical status banners. The new canonical workspace centers on yona-rust/ (frontend, proto, rust crates) while root mixed code (frontend, packages, cmd, internal, apps, proto) becomes reference-only.

### Dependencies
Every implementation must re-check AGENTS conversion principles, SPEC Section 3 decisions, docs/agents mirrors, and provenance inventories; pnpm verify:agents plus tools/verify-agents-integrity.mjs ensure AGENTS.md includes required snippets, avoids forbidden legacy patterns, and is not skip-worktree.

### Highlights
The project goal is Rust + React parity with legacy UX preserved, prioritized features captured in phase plan (auth/workspace/org/project, issues/comments/PRs/search/notifications/admin), and missing features logged as deferred/gap/deviation. Documentation now records canonical owner/target updates and historical status banners, while verify-agents-integrity.mjs enforces the canonical AGENTS contract.

### Rules
Rule 1: No patterns/abstractions outside SPEC Section 3 fixed decisions. Rule 2: Do not add legacy-missing features under the guise of improvements. Rule 3: Preserve existing UI/UX rather than invent new designs. Rule 4: Avoid architecture discussions outside the conversion scope. Rule 5: Record every missing capability across canonical docs (deferred), provenance (gap/deviation), and plan docs (follow-up).

### Examples
Document index now enumerates docs/agents/00-10, docs/provenance/*, docs/plans/*, and docs/workflow/* so mirrors can be cross-referenced. Legacy test inventory tables pair capability/gap status with mixed-code references and Rust canonical owner paths, providing a routing aid for future parity work.

## Facts
- **conversion_goal**: Project goal is to realign Yona into a Rust + React canonical workspace under top-level yona-rust while preserving legacy functionality and UX parity, and to record any missing pieces as deferred/gap/deviation. [project]
- **document_order**: Canonical document ordering now prioritizes AGENTS.md for conversion rules, SPEC.md for execution spec, docs/agents as mirrors, docs/provenance for intent gaps, and docs/plans/workflow only with historical status banners. [convention]
- **doc_governance**: Documentation governance requires status banners on historical docs, mirrors in docs/agents, and provenance tracking that records legacy intent, owner paths, and Rust targets rather than letting old stack references appear as current baseline. [convention]
- **missing_feature_recording**: Missing-feature recording rule enforces that root canonical documents mark deferred scope, provenance documents call out gap or deviation, and plan documents list follow-up items so no omission is left undocumented. [convention]
- **phase_plan**: Phase plan spans promotion (phase 0) through admin/migration hardening (phase 6) and ties Definition of Done to pnpm verify:agents plus canonical docs that explicitly hide legacy mixed stack from current baseline. [project]
- **agents_integrity_check**: tools/verify-agents-integrity.mjs keeps AGENTS.md honest by requiring new canonical snippets, forbidding outdated file references and corruption patterns, and ensuring the file is not skip-worktree. [environment]
