---
title: 2026_04_05_agents_spec_alignment
tags: []
related: [process/feature_parity_governance/context.md, release/demo_ready_pr_merge_review/landing_plan_2026_04_05_demo_ready_pr_merge_review.md, migration/phase_plan_overview/context.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-07T12:02:36.117Z'
updatedAt: '2026-04-07T12:02:36.117Z'
---
## Raw Concept
**Task:**
Capture the April 5, 2026 AGENTS/SPEC rewrite and governance updates that enforce the Rust+React canonical baseline.

**Changes:**
- Promoted the experimental Rust pilot into the top-level yona-rust workspace and rewrote AGENTS, SPEC, README, CLAUDE, and docs/agents/* to match the canonical ordering.
- Updated provenance owner/target mappings to point to the relevant yena-rust crates and annotated docs/plans plus docs/workflow with historical status banners.
- Recorded the docs/agents/03-repo-structure reminder about AGENTS → SPEC → README → CLAUDE order, canonical workspace layout, and reference-only root paths.
- Tightened verification by refreshing tools/verify-agents-integrity.mjs so it enforces the AGENTS contract and prohibits stale patterns.

**Files:**
- AGENTS.md
- SPEC.md
- README.md
- CLAUDE.md
- docs/agents/03-repo-structure.md
- docs/provenance/phase-0b/legacy-test-inventory.md
- tools/verify-agents-integrity.mjs

**Flow:**
Promote the Rust pilot → rewrite canonical docs → align provenance/test inventory → add historical banners → enforce with verify:agents.

**Timestamp:** 2026-04-05

## Narrative
### Structure
AGENTS.md is now the gatekeeper, followed by SPEC.md, README.md, and CLAUDE.md, with docs/agents/03 highlighting the canonical yona-rust/frontend + proto + crates layout and listing reference-only root paths for frontend/packages/cmd/internal/apps/proto.

### Dependencies
Verification depends on tools/verify-agents-integrity.mjs reading AGENTS.md snippets and docs/plans plus docs/workflow staying annotated with status banners before being interpreted.

### Highlights
Rust+React single-app workspace expectations are now cemented, provenance ownership now references yona-rust crates, and the phase-0b legacy-test-inventory enumerates gaps/deferred statuses for legacy tests.

### Rules
Execution Rules: Always review AGENTS + relevant SPEC sections and mirrors before work; implement using yona-rust/ canonical paths; avoid describing Bun/Go/TanStack/Go backend decisions as baseline; document missing features across three tiers (deferred scope, provenance gap/deviation, plan follow-up).

## Facts
- **execution_priority_tiers**: Priority tiers place legacy core features first, migration tooling second, and architecture/performance/new features third. [convention]
- **canonical_doc_order**: Canonical docs follow the AGENTS.md → SPEC.md → README.md → CLAUDE.md ordering before consulting mirrors or provenance narratives. [project]
- **verification_baseline**: Verification baseline requires running pnpm verify:agents and checking canonical docs for residual old-stack cues before acceptance. [project]
- **verify_integrity_script**: tools/verify-agents-integrity.mjs enforces AGENTS.md contains conversion principles, canonical paths, banners, mission statements, and doc links while banning outdated patterns. [environment]
- **legacy_test_inventory_status**: The phase-0b legacy-test-inventory marks auth, ACL, organizations, projects, workspace, issue, PR, search, repo, and attachment tests as gaps while notification/mailbox/admin stays deferred. [project]
