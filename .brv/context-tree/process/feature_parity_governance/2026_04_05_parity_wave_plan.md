---
title: 2026-04-05 parity wave plan
tags: []
related: [process/feature_parity_governance/context.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-05T09:22:12.275Z'
updatedAt: '2026-04-05T09:22:12.275Z'
---
## Raw Concept
**Task:**
Document the April 5, 2026 Wave plan that restores Wave 1 public landing and global navigation parity while defining execution contracts for Waves 1-11C.

**Changes:**
- Restored Wave 1 public landing/global nav IA, copy, CTAs, and link targets to match the legacy experience.
- Captured the execution contract, parity checklist, and verification tooling required to keep the parity suite locked through pending waves.
- Anchored follow-on org listing work to specific waves and recorded parity audit expectations.

**Files:**
- apps/app/src/routes/-public-landing-parity.spec.tsx
- docs/provenance/core-parity-audit.md
- .omx/plans/2026-04-05-remaining-p1-parity-resolve-plan-v3.md

**Flow:**
Identify legacy controller/tests/views -> add failing Red test -> expand contracts additively -> align domain/database semantics -> restore route/UI to legacy IA/copy/CTA/sections -> lock the parity suite after achieving Green status.

**Timestamp:** 2026-04-05

**Author:** Parity Governance Team

## Narrative
### Structure
Wave 1 restores _app.index and _app to mirror the legacy anonymous landing experience and streamlined global nav, while the Wave plan document defines priorities, success criteria, and follow-on expectations for Waves 2 through 11C.

### Dependencies
Shared nav changes must rerun earlier parity suites before moving forward; Wave execution keys off legacy controller/tests/views plus domain/database semantics alignment.

### Highlights
Parity checklist verifies menu order, CTA labels/positions, sections/blocks, forms, deep-link/forbidden/empty states, and ensures org listing audits in Waves 6B/B/C, 7A, and 9C block further progress until complete. Verification for each wave runs bun run check, bun run test:unit, and bun run --cwd packages/db test:sqlite.

### Rules
Parity checklist enforces menu order, CTA labels/positions, sections/blocks, forms, and deep-link/forbidden/empty states. Shared nav changes demand rerunning the prior parity suites before allowing downstream waves to advance.

### Examples
Wave 1 success criteria include entry links to login/register/forgot-reset/projects/orgs/global search and removal of temporary cards/home link, mirroring legacy IA; audit updates mark the row as parity when diagnostics hit zero and tests pass.

## Facts
- **public_landing_render**: _app.index renders the legacy anonymous landing experience with the intro heading, feature grid of unlimited projects/code management/issue tracker/private repos/code review/work team, signup CTA, and entry links to login, register, forgot/reset passwords, projects, orgs, and global search. [project]
- **global_nav_structure**: _app trims the app shell navigation to project/org/search entry points, exposes a locale switch, global search form, auth links (login/register for anonymous and workspace/settings/new project for authenticated users), and footer runtime metadata. [project]
- **public_landing_spec**: apps/app/src/routes/-public-landing-parity.spec.tsx mocks auth, locale, and shell data to assert anonymous intro copy, entry links, and the absence of temporary cards or a home link. [project]
- **parity_audit_matrix**: docs/provenance/core-parity-audit.md marks the public landing/global nav audit row as parity, documents legacy sources/current files/status/drift type/owners, requires a Red test to keep the route parity green, and notes that global nav entry points are now project/org/search plus login/signup. [project]
- **parity_verification_commands**: Parity verification commands are bun run check, bun run test:unit, and bun run --cwd packages/db test:sqlite. [project]
- **wave_priority_order**: Waves follow a priority order P0 through P10 covering Wave 1 public landing/global nav through Wave 11C site admin diagnostics/update, and organization issue/board/PR listings remain follow-on tasks linked to specific waves rather than separate priorities. [project]
- **parity_checklist**: The parity checklist enforces menu order, CTA labels and positions, sections/blocks, forms, deep-link/forbidden/empty states, and shared nav changes require rerunning the prior parity suites before progressing. [convention]
- **projects_orgs_expectation**: /projects and /orgs routes are assumed locked as complete unless regressions appear, and waves 6B/B/C, 7A, and 9C require immediate addition of organization listings and block further parity until their audits pass. [project]
