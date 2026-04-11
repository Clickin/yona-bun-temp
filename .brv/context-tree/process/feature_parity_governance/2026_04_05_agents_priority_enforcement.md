---
title: 2026-04-05 AGENTS Priority Enforcement
tags: []
related: [process/feature_parity_governance/2026_04_05_canonical_execution_spec.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-05T04:47:39.598Z'
updatedAt: '2026-04-05T04:47:39.598Z'
---
## Raw Concept
**Task:**
Capture the 2026-04-05 governance update that elevated AGENTS.md, aligned SPEC.md, and refreshed agents/docs mirrors with transformation principles

**Changes:**
- Elevated AGENTS.md to the main source of truth for agent execution governance and transformation principles
- Updated docs/agents/00, docs/agents/05, docs/agents/09, and CLAUDE.md to mirror the new AGENTS/SPEC priorities
- Reaffirmed SPEC.md as the canonical technical execution spec that references the AGENTS priorities, Section 3 minimal structure, and Section 19 Definition of Done

**Files:**
- AGENTS.md
- SPEC.md
- CLAUDE.md

**Flow:**
Elevate AGENTS rules -> enforce “functional parity first” + “no new structure” -> have SPEC cite AGENTS priorities -> refresh agent docs mirrors + CLAUDE entry -> guide implementation work through Sections 2-13 and Section 19 completion criteria

**Timestamp:** 2026-04-05

**Author:** Migration Taskforce

## Narrative
### Structure
AGENTS.md now resides at the apex of the execution hierarchy with its header prioritizing the “functional parity first” and “no new structure” transformation principles and explicitly overriding SPEC sections 1.5, 3.1, and 19. SPEC.md remains the technical canonical draft that chronicles architecture scope, packages, auth/permissions ownership, DB/VCS choices, migration steps, testing expectations, and completion criteria while directly referencing AGENTS priorities.

### Dependencies
docs/agents/00, docs/agents/05, docs/agents/09, and the trimmed CLAUDE.md entry are the mirrors that propagate the AGENTS/SPEC alignment; downstream implementation teams depend on SPEC sections 2–13, the fixed decisions in Section 3, and Section 19 Definition of Done to ensure parity-based delivery.

### Highlights
Key platform commitments include TanStack Start + React + Bun single runtime, in-process tRPC with serverFunction adapters, superjson transformers, Yona-controlled asset routes, Better Auth-backed permission/ACL/audit flows, simultaneous PostgreSQL/MySQL/MariaDB/SQLite parity, Git/SVN exec-based commands, and an LLM-first surface defined by llms.txt; no UX or UI innovations are allowed until parity is proven and brand deltas are minimized.

### Rules
Rule 1: Functional parity conversion only; no new structure proposals until parity is complete. Rule 2: AGENTS principles override SPEC decisions and limit new structure to what Section 3 explicitly allows. Rule 3: Completion must satisfy Section 19 Definition of Done, including vertical slice foundation constraints, Bun runtime deployment paths, TanStack stack requirements, in-memory Better Auth sessions, and out-of-process integration patterns.

## Facts
- **agents_documentation**: AGENTS.md is the main source of truth for agent execution rules and transformation principles as of 2026-04-05 [project]
- **transformation_principles**: Transformation principles require functional parity first and no new structure proposals until parity is achieved [convention]
- **spec_document_role**: SPEC.md remains the canonical execution spec referencing AGENTS priorities and Section 19 Definition of Done [project]
