---
title: Legacy Directory Route Parity
tags: []
related: [project_directory_parity/public_directory_routes/context.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-05T07:19:37.691Z'
updatedAt: '2026-04-05T07:19:37.691Z'
---
## Raw Concept
**Task:**
Document the route-level legacy parity for public project and organization directories in apps/app

**Changes:**
- Rebuilt /projects and /orgs routes around their legacy list chrome rather than the generic SiteShell/ContentCard shell
- Locked pagination, search parameters, and UI scaffolding to match the legacy experience (pageNum, filter, labelIds, placeholders, metadata badges)
- Expressed the expected visual rules through shared CSS selectors and verified them via project-directory-route.spec.tsx

**Files:**
- apps/app/src/routes/_app.projects.index.tsx
- apps/app/src/routes/_app.orgs.index.tsx
- apps/app/src/project-directory-route.spec.tsx
- apps/app/src/styles/app.css
- docs/provenance/core-parity-audit.md

**Flow:**
Loader listProjects/listOrganizations -> ProjectDirectoryPage/OrganizationDirectoryPage -> legacy search form -> ul.all-projects list items -> legacy-directory-pagination nav

**Timestamp:** 2026-04-05

## Narrative
### Structure
Both Route components render an ul.all-projects list with li.project entries that wrap their metadata inside an info-wrap, apply avatar fallbacks, and include stats badges, while the shared app.css defines the legacy directory chrome (breadcrumbs, search block, pagination) and responsive breakpoints that keep the chrome intact.

### Dependencies
ProjectDirectoryPage and OrganizationDirectoryPage rely on loader data from listProjects and listOrganizations, the publicListSearchSchema (zod) transformations, formatLegacyDate helpers, and translated scope labels so the UI stays faithful to the legacy access-control messaging.

### Highlights
Wave 0 parity is considered complete for these directories because the code now mirrors legacy list structure, metadata, filter behavior, pagination counts (10/30), placeholders, and styles, which is reinforced by the project-directory-route.spec.tsx validations and the core-parity-audit entry covering the same rows.

## Facts
- **projects_pagination**: The /projects directory enforces route-local pageNum pagination with 10 rows per page and a sliding window of 5 while the search form posts back to /projects with filter and repeated labelIds [project]
- **project_row_layout**: Each project row follows the legacy all-projects/info-wrap layout (avatar, header, stats, owner/date name tag) and injects a redacted placeholder row for private entries when AccessControl hides details [project]
- **orgs_pagination**: The /orgs directory paginates in 30-item pages with the same window sizing but omits placeholder rows because legacy AccessControl already grants global READ to organizations [project]
