---
title: Project Directory Feature Parity
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-05T05:42:26.337Z'
updatedAt: '2026-04-05T05:42:26.337Z'
---
## Raw Concept
**Task:**
Document the public /projects directory feature parity across contracts, domain service, and UI.

**Changes:**
- Added a discriminated project list item union so the UI can render visible summaries or gated redacted rows.
- Enforced DB aggregation and authorization filtering in listProjects before handing data to the UI loader.
- Mirrored contracts filter/label input schemas in the front-end search form and preserved tests for the public directory route.

**Files:**
- packages/db/src/org-project.ts
- packages/domain/src/project-service.ts
- apps/app/src/routes/_app.projects.index.tsx
- apps/app/src/project-directory-route.spec.tsx

**Flow:**
List page loads -> publicListSearchSchema validates user filters -> listProjects loader calls ProjectService.listProjects -> service aggregates summary data and applies authorization gating -> client renders visible union entries or redacted placeholders via ProjectDirectoryPage.

**Timestamp:** 2026-04-05

**Author:** Parity Team

## Narrative
### Structure
Contracts define the visible and redacted list item schemas plus search input/output structures, the domain service applies record-to-response mapping and gating, and the React route renders cards with counts, labels, origin links, and placeholder rows for private data.

### Dependencies
UI uses publicListSearchSchema tied to contracts projectListInputSchema; ProjectService depends on db/org-project helpers for aggregation and authorizeProjectAccess for gating; component tests rely on deterministic react-router link mocking.

### Highlights
Visible cards show overview, scope badges, creation dates, member and watcher counts, searchable label badges, and safe origin project links, while private entries remain redacted yet keep parity of placement; service ensures watchers/member counts stay accurate for public items and uses placeholders for gated entries.

### Rules
ProjectService.listProjects must return redacted placeholder rows whenever authorizeProjectAccess denies visibility, preserving the total row count and placement for parity.

### Examples
A public project displays memberCount and watcherCount badges with a label filter link, whereas a non-authorized project renders "Project not visible" placeholder text.

## Facts
- **project_directory_rendering**: Public /projects directory renders a union of visible project cards (with memberCount, watcherCount, labels, originProject, label filters) and redacted placeholders for gated non-public results. [project]
- **project_list_service**: listProjects aggregates labels, memberCount, watcherCount, and originProject, then filters results by authorization before handing visible items or redacted placeholders back to the client. [project]
- **project_list_input_schema**: projectListInputSchema accepts search text plus labelIds, and publicListSearchSchema mirrors those filters for the UI search form. [project]
- **project_directory_tests**: ProjectDirectoryPage unit tests cover the visible public card rendering and the gated placeholder row to keep the UI parity branch covered. [project]
