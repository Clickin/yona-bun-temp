---
title: Projects Parity Baseline
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-05T05:48:14.839Z'
updatedAt: '2026-04-05T05:48:14.839Z'
---
## Raw Concept
**Task:**
Document the current parity surface for the /projects experience, covering schema, service, UI, and audit evidence.

**Changes:**
- Captured lastPushedAt propagation from contracts through DB, domain, and UI to show code-update dates on public cards.
- Enumerated the contracts, DB records, and services that govern project listing, member directories, and authorization.
- Logged the remaining UI drift (logos/avatars and legacy card chrome) plus the Wave 0 audit matrix statuses.

**Files:**
- apps/app/src/routes/_app.projects.index.tsx
- docs/provenance/core-parity-audit.md

**Flow:**
Contracts schemas -> DB helpers/records -> Domain project service (list/detail/settings/members) -> /projects route + UI cards -> Wave 0 parity audit matrix + verification commands.

**Timestamp:** 2026-04-05

**Author:** Project Parity Audit

## Narrative
### Structure
Contracts define normalization and schema rules that feed DB mappers and project service helpers, which then supply the /projects loader and card rendering logic before being validated via the Wave 0 parity audit matrix.

### Dependencies
listProjects leans on authorization + search schema inputs from contracts, while UI cards rely on renderScopeLabel/formatDate utilities and projectScope data to decide badges and locks; the audit doc depends on status vocabularies and verification scripts to mark drift.

### Highlights
Public cards now show lastPushedAt as a code-update date; private cards retain lock affordances; the only remaining UI drift is logo/avatar styling and legacy chrome, while the audit matrix enumerates semantic/UX gaps and deferred tooling needs.

## Facts
- **projects_last_pushed_at_propagation**: Public /projects parity now carries lastPushedAt through contracts, DB summaries, domain mapping, and UI rendering. [project]
- **projects_card_rendering**: Visible cards display a code-update date when lastPushedAt exists, while private visible cards render a lock affordance via projectScope. [project]
- **project_name_validation**: Contracts/src/project.ts enforces PROJECT_NAME_PATTERN /^[a-zA-Z0-9-_.가-힣]+$/, reserves ., .., .git, and trims projectName to 1-255 characters during validation. [project]
- **org_project_helpers**: db/src/org-project.ts exposes helpers for URL building, membership checks, CRUD flows, and uniqueness guards before creating or updating project records. [project]
- **wave0_audit_statuses**: Wave 0 parity audit uses statuses parity, ux-drift, semantic-drift, missing, deferred-2nd-priority and validates readiness via bun run verify:agents, bun run check, bun run test:unit. [project]
