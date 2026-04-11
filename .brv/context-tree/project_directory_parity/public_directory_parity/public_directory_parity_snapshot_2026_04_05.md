---
title: Public Directory Parity Snapshot 2026-04-05
tags: []
related: [project_directory_parity/public_directory_routes/context.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-05T07:25:52.998Z'
updatedAt: '2026-04-05T07:25:52.998Z'
---
## Raw Concept
**Task:**
Document the Wave 0 snapshot for public project and organization directory parity, covering legacy UI reproduction, validation, and testing coverage.

**Changes:**
- Restored legacy `/projects` and `/orgs` list container/item structures, member avatars/counts, search block, label filters, origin/fork badges, and fixed-size pagination.
- Preserved legacy date rendering (just now, 1 day, N days, MM-DD current year, YYYY-MM-DD otherwise) and redacted placeholder rows for private projects/orgs.
- Implemented zod validation for filter, labelIds, and pageNum before calling listProjects/listOrganizations, then computed pagination windows via shared helpers.
- Captured comprehensive specs that assert list rendering, metadata, pagination, and placeholder behavior, plus the provenance audit matrix and exit tests.

**Files:**
- apps/app/src/routes/_app.projects.index.tsx
- apps/app/src/routes/_app.orgs.index.tsx
- apps/app/src/project-directory-route.spec.tsx
- apps/app/src/organization-directory-route.spec.tsx
- docs/provenance/core-parity-audit.md

**Flow:**
Request -> loader validates query (filter, labelIds, pageNum) with zod before calling listProjects/listOrganizations -> page component slices projects/orgs, renders breadcrumbs/search, and builds pagination links via buildProjectsHref/buildOrganizationsHref using formatLegacyDate/toInitials -> pagination/nav rendering follows PROJECTS_PER_PAGE/ORGANIZATIONS_PER_PAGE and PAGINATION_WINDOW settings -> specs replay rendering and pagination scenarios to ensure parity.

**Timestamp:** 2026-04-05

**Author:** Parity governance team

## Narrative
### Structure
Project and organization directory pages now replicate the legacy card-with-avatar layout, showing owner avatars or logos, origin/fork badges, scope labels, member/watch counts, and placeholder rows for redacted entries, all consumed via ProjectDirectoryPage/OrganizationDirectoryPage with breadcrumb tabs, search forms, and stats wraps.

### Dependencies
Pages depend on shared helpers (`formatLegacyDate`, `toInitials`, `getPaginationWindow`, `buildProjectsHref`, `buildOrganizationsHref`), listProjects/listOrganizations data loaders, and zod schemas validating filter, labelIds, and pageNum before rendering.

### Highlights
Pagination is capped at 10 projects or 30 organizations per page with window 5; legacy date formats cover relative and absolute dates; specs validate pagination link query params and placeholder visibility; Wave 0 parity audit defines status vocabulary (parity, ux-drift, semantic-drift, missing, deferred-2nd-priority) and records bun run verify:agents, bun run check, bun run test:unit as the exit snapshot.

### Examples
A private project row renders only a scope label initial, placeholder text, and lock emoji without the legacy header block, while org-31 renders with its logo and MM-DD created date; pagination test ensures page 2 shows projects 11-12 and pagination links preserve filters/labels.

## Facts
- **projects_pagination**: PROJECTS_PER_PAGE=10 and PAGINATION_WINDOW=5 drive legacy project pagination in apps/app/src/routes/_app.projects.index.tsx [project]
- **orgs_pagination**: ORGANIZATIONS_PER_PAGE=30 and PAGINATION_WINDOW=5 drive legacy organization pagination in apps/app/src/routes/_app.orgs.index.tsx [project]
- **directory_loader_validation**: Loaders validate filter/labelIds/pageNum via zod before calling listProjects or listOrganizations [project]
- **project_directory_tests**: Project directory specs cover header, metadata, label links, pagination, legacy dates, asset rendering, placeholder rows, and pagination parameter propagation [project]
- **organization_directory_tests**: Organization directory specs assert list structure, pagination with page 2 active, and legacy created-date formatting for org 31 [project]
- **parity_audit_status**: Core parity audit uses statuses parity, ux-drift, semantic-drift, missing, and deferred-2nd-priority and records bun run verify:agents/check/test:unit as the Wave 0 exit snapshot [project]
