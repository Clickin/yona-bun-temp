---
title: 2026-04-05 Canonical Execution Spec
tags: []
related: [release/demo_ready_pr_merge_review/landing_plan_2026_04_05_demo_ready_pr_merge_review.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-05T04:46:05.553Z'
updatedAt: '2026-04-05T04:46:05.553Z'
---
## Raw Concept
**Task:**
Document the 2026-04-05 hierarchy and enforcement rules that keep AGENTS.md as the authoritative agent execution source while SPEC.md defines canonical technical scope for the feature-parity migration.

**Changes:**
- Reasserted AGENTS.md as the main single source of truth for agent execution behaviors and added the functional-parity-first, new-structure-ban principle to its top.
- Maintained SPEC.md as the canonical execution manual with Section 1.5 and 3.1 describing AGENTS priority, Section 3 locking the minimal structure decisions, and Section 19 listing conversion completion conditions.
- Aligned docs/agents/00, 05, and 09 with the AGENTS+SPEC mirror structure and reduced CLAUDE.md to a reference summary of those sources.

**Files:**
- AGENTS.md
- SPEC.md
- CLAUDE.md

**Flow:**
AGENTS.md asserts governance first, SPEC.md formalizes the execution scope (product, architecture, packages, auth, DB, VCS, migration, tests, completion), supporting agent docs mirror the hierarchy, and CLAUDE.md now serves as a reference for the combined mandates.

**Timestamp:** 2026-04-05

**Author:** Migration Governance Council

## Narrative
### Structure
The update emphasizes AGENTS.md at the top of the document tree with SPEC.md continuing to document the canonical stack (TanStack Start + React + Bun, in-process tRPC boundaries, streaming SSR, TanStack Query policies) and supporting docs in docs/agents/00, 05, and 09 reflecting the same ordering.

### Dependencies
SPEC sections 1.5 and 3.1 reference AGENTS priority, Section 3 fixes the minimal allowable structure (runtime Bun, React UI, TanStack Query/Router, backend in-process tRPC, Better Auth, VCS and DB engines, asset delivery paths, LLM optimization rules) and Section 19 defines the conversion done criteria, so any deviation must trace back to these sections.

### Highlights
Functional parity moves ahead without proposing new structures, canonical import aliases remain @yona/*, integration endpoints (LLMs, smart HTTP, webhooks, downloads, assets) stay server-route centric, and agent onboarding checklists (docs/agents/05 & 09) reiterate prohibitions like no new SvelteKit/Hono, single DB focus, or undocumented deviation.

### Rules
Rule: AGENTS.md now begins with a functional-parity-first statement and explicitly forbids suggesting new structural abstractions.
Rule: SPEC.md Section 3 fixes runtime (Bun only), deployment commands, UI stack, backend in-process tRPC, Better Auth, stateless session, database engines with Drizzle, asset routing, and integration providers; any deviation requires documented provenance.
Rule: Agent onboarding checklists (docs/agents/05 & 09) demand provenance traces, Red/Green tests, parity evidence, docs updates, and gating approvals before feature closure.

### Examples
Example enforcement sequence: Agents read AGENTS.md for execution priorities, follow SPEC.md for technical scope, validate via docs/agents/05 (process steps) and docs/agents/09 (LLM readiness), then confirm completion criteria section 19 before closing work.

## Facts
- **agent_authority**: AGENTS.md is the main single source of truth for agent execution rules and now leads with a functional-parity-first principle that forbids proposing new structures. [project]
- **canonical_spec_stack**: SPEC.md remains the canonical technical execution spec covering product, architecture, packaging, auth, DB, VCS, migration, test, and completion criteria anchored in TanStack Start + React + Bun. [project]
- **agent_docs_alignment**: Docs under docs/agents/00, 05, and 09 mirror AGENTS/SPEC priorities and CLAUDE.md is demoted to a reference document. [project]
