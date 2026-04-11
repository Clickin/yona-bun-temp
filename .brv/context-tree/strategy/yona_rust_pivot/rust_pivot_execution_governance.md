---
title: Rust Pivot Execution Governance
tags: []
related: [strategy/runtime_stack_decisions/2026_04_06_stack_decision_report.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-07T11:57:14.252Z'
updatedAt: '2026-04-07T11:57:14.252Z'
---
## Raw Concept
**Task:**
Document the AGENTS/SPEC canonical execution governance for the Yona Rust+React feature parity pivot.

**Changes:**
- Promoted the experimental Rust pilot to the top-level yona-rust workspace and rewrote AGENTS/SPEC/README/CLAUDE plus docs/agents around the Rust+React canonical ordering.
- Updated provenance owner/target paths to point at yona-rust crates, added historical status banners to docs/plans and docs/workflow, and categorized root mixed code as reference-only.
- Extended verify:agents to enforce the new AGENTS contract by checking for required snippets, forbidding legacy patterns, and validating skip-worktree status.

**Files:**
- AGENTS.md
- SPEC.md
- docs/agents/00-goals-and-fixed-decisions.md
- docs/agents/01-frontend-architecture.md
- docs/agents/02-testing-migration.md
- docs/agents/03-repo-structure.md
- docs/agents/04-architecture-guardrails.md
- docs/agents/05-agent-execution-guidelines.md
- docs/agents/06-phase-plan.md
- docs/agents/07-rust-sfx-deployment.md
- docs/agents/08-rust-deployment-strategy.md
- docs/agents/09-llm-onboarding-checklist.md
- docs/agents/10-legacy-provenance-baseline.md
- docs/provenance/phase-0b/legacy-test-inventory.md
- docs/plans
- docs/workflow
- tools/verify-agents-integrity.mjs

**Flow:**
AGENTS conversion principles -> SPEC canonical baseline -> docs/agents mirror guidance -> docs/provenance legacy mapping -> docs/plans/workflow historical status -> verify:agents enforcement.

**Timestamp:** 2026-04-07

**Author:** Yona Rust transformation leadership

## Narrative
### Structure
AGENTS.md asserts the execution rules, followed by SPEC.md as the canonical execution spec for Rust+React, which mirror docs/agents addendums, provenance records, and historical docs/plans/workflow artifacts decorated with status banners. The canonical workspace boundaries are locked to yona-rust/{frontend,proto,crates/*} and root mixed code is treat-as-reference-only. Product scope chapters list auth, workspace, organization, projects, issues, repositories, PRs, search, notifications, integrations, admin, migration, and deployment hardening across phases 0‑6 with DoD tied to yona-original parity and Rust workspace anchors.

### Dependencies
This governance bundle depends on AGENTS/SPEC, the docs/agents mirror files, docs/provenance owner/target updates, docs/plans/workflow historical banners, and the tools/verify-agents-integrity.mjs guardrail to detect missing snippets or forbidden patterns.

### Highlights
Project goal is to realign Yona as a Rust + React single workspace that matches the legacy UX/functionality while allowing deferred/gap/deviation annotations. Fixed decisions lock canonical ownership to yona-rust/ paths (frontend, proto, crates/server|domain|persistence|migration|vcs|search|integrations) and document ordering for canonical, provenance, and historical artifacts. Documentation governance mandates status banners, synchronous missing-feature records, and a pnpm verify:agents check.

### Rules
SPEC.md Section 3 고정 결정 밖 새 패턴/추상화 제안 X.
레거시에 없는 기능 “개선” 명목 추가 금지.
기존 UI/UX를 개선 이유로 임의 변경 금지.
변환 범위 밖 아키텍처 논의 금지.
docs/plans/* and docs/workflow/* must gain a historical/superseded/reference-only status banner before being relied on as current baseline.
All missing features must be recorded simultaneously as deferred/gap/deviation across canonical root docs, provenance narratives, and follow-up planning documents.

## Facts
- **conversion_principles**: Conversion project only pursues feature parity with legacy Yona and forbids proposing new structures until parity is achieved. [convention]
- **canonical_document_order**: Canonical documentation order is AGENTS.md -> SPEC.md -> docs/agents mirror -> docs/provenance -> docs/plans/workflow with status banners before considering historical files current. [project]
- **missing_feature_recording**: Missing legacy functionality must be recorded as deferred, gap, or deviation entries across canonical, provenance, and planning documents. [convention]
- **verify_agents_script**: The pnpm verify:agents script enforces AGENTS.md content requirements, forbids legacy patterns, and ensures the file is not marked skip-worktree. [environment]
- **phase_plan**: Phase plan enumerates phases 0‑6 covering Rust workspace promotion, core auth/workspace/org/project parity, issues/comments/attachments, repo/VCS flows, PR/review parity, search/board/notifications/integrations, and admin/migration/deployment hardening. [project]
