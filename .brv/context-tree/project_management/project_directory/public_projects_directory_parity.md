---
title: Public Projects Directory Parity
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-05T05:42:07.067Z'
updatedAt: '2026-04-05T05:42:07.067Z'
---
## Raw Concept
**Task:**
Document how the public /projects directory stays parity aware by combining schemas, DB aggregation, service authorization, and UI rendering for visible and redacted list items.

**Changes:**
- Clarified the projectListItem discriminated union for visible vs redacted payloads
- Captured ProjectService.listProjects gating logic for authorized detail and placeholder rows
- Explained how the route loader and ProjectDirectoryPage render visible metadata and placeholder text with label filters

**Files:**
- packages/db/src/org-project.ts
- apps/app/src/routes/_app.projects.index.tsx
- apps/app/src/project-directory-route.spec.tsx

**Flow:**
publicListSearchSchema -> listProjects loader -> ProjectService.listProjects -> listProjectSummaries (DB aggregation) -> union of visible/redacted list items -> ProjectDirectoryPage renders cards/placeholders -> project-directory-route.spec.tsx verifies parity

**Timestamp:** 2026-04-05

## Narrative
### Structure
Contracts define the projectListItem discriminated union along with normalization helpers and schemas that the loader and service consume, db helpers aggregate labels, counts, and scope, and ProjectDirectoryPage renders the resulting cards or placeholder rows with formatting helpers (formatDate, renderScopeLabel).

### Dependencies
Public list filters rely on publicListSearchSchema validation, ProjectService depends on authorization utilities and db CRUD helpers in packages/db/src/org-project.ts, and tests mock router components to assert deterministic links.

### Highlights
Visible entries now uniformly show member and watcher totals plus label badges, redacted entries consistently display permission placeholders, and loader/service alignment keeps the public /projects route parity tested.

### Rules
Rule: Non-public projects must never expose metadata in the directory and must present the redacted placeholder text instead.

## Facts
- **visible_project_card**: Public /projects cards display memberCount, watcherCount, labels, creation date, origin project link, and label filter badges, while redacted rows only show placeholder text for gated projects. [project]
- **redacted_project_display**: Non-public projects render as redacted placeholder rows to hide details from unauthorized users. [project]
- **project_list_schema**: contracts/src/project.ts defines projectVisibleListItemSchema, projectRedactedListItemSchema, and the projectListItemSchema discriminated union plus normalization helpers (normalizeOptionalText, normalizeOptionalFilter, normalizeLabelIds) for list payloads. [project]
- **list_projects_loader**: listProjects loader depends on publicListSearchSchema to validate filters and labelIds before calling ProjectService.listProjects. [convention]
- **project_service_listing**: ProjectService.listProjects aggregates listProjectSummaries (labels, memberCount, watcherCount, originProject) and, after authorization, returns either visible list items or redacted placeholders for gated projects. [project]
- **db_project_summaries**: packages/db/src/org-project.ts provides normalization helpers and CRUD functions that power listProjectSummaries and supply the base data for project cards. [project]
- **directory_tests**: ProjectDirectoryPage tests assert that a visible public project shows labels, origin, counts, and filter links while a private project renders redacted permission text. [project]
