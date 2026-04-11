---
title: Public Projects List Parity
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-05T05:43:06.420Z'
updatedAt: '2026-04-05T05:43:06.420Z'
---
## Raw Concept
**Task:**
Document the public /projects directory parity flow that coordinates schemas, DB aggregations, service gating, and UI rendering.

**Changes:**
- Introduced the projectListItem union so the loader can return Member/Watches/Label metadata for public projects and redacted placeholders for gated results.
- Updated ProjectService.listProjects to aggregate counts from packages/db/src/org-project.ts and enforce authorization, returning either visible items or placeholders.
- Reworked the ProjectDirectoryPage and its tests to render the enriched public cards, search filters, and locked placeholder rows.

**Files:**
- packages/db/src/org-project.ts
- packages/domain/src/project-service.ts
- apps/app/src/routes/_app.projects.index.tsx
- apps/app/src/project-directory-route.spec.tsx

**Flow:**
Browser GET /_app/projects -> listProjects loader -> ProjectService.listProjects -> packages/db/src/org-project.ts listProjectSummaries -> authorization gating -> return visible or redacted list items -> ProjectDirectoryPage renders cards/placeholders with label filters.

**Timestamp:** 2026-04-05

## Narrative
### Structure
The /_app/projects route uses the listProjects loader to fetch a discriminated union of visible cards and placeholder rows, then renders ProjectDirectoryPage with site shell, search form, badges, and cards. Public cards display overview text, creation date, origin project link, scope badge, label filter badges, and member/watcher statistics derived from the aggregated summary data.

### Dependencies
Depends on contracts/src/project.ts for list filtering validation, packages/db/src/org-project.ts for membership/watcher aggregation, and packages/domain/src/project-service.ts for authorization and mapping between records and response schemas.

### Highlights
Label filtering works via labelIds parsed by publicListSearchSchema, member/watcher counts appear on visible cards, and placeholder rows show permission text while still occupying the result slot; tests in apps/app/src/project-directory-route.spec.tsx assert both a public card and a gated placeholder render correctly.

## Facts
- **list_item_schema**: ProjectVisibleListItem now surfaces memberCount, watcherCount, labels, originProject, and labelIds filtering while ProjectRedactedListItem supplies placeholder rows for gated results. [project]
- **project_list_authorization**: ProjectService.listProjects aggregates label, member, and watcher counts from packages/db/src/org-project.ts and returns redacted placeholders whenever domain gating denies read access. [project]
- **project_directory_ui**: ProjectDirectoryPage renders label filters, origin project links, member/watcher counts, and scoped badges for public projects while showing permission placeholder text for non-public entries. [project]
