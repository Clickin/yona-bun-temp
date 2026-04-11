---
title: 2026_04_05 Projects and Organizations Route Parity
tags: []
related: [project_directory_parity/projects_route_parity/projects_route_parity.md, project_directory_parity/organization_directory_parity/organization_directory_parity.md, project_directory_parity/projects_parity_baseline/context.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-05T07:21:41.414Z'
updatedAt: '2026-04-05T07:21:41.414Z'
---
## Raw Concept
**Task:**
Document the Wave 0 legacy parity restoration for the /projects and /orgs directories on 2026-04-05.

**Changes:**
- Rebuilt /projects and /orgs UI flows with the legacy all-projects/project/info-wrap cards, metadata line, labels, origin badges, scope indicators, and redacted placeholders.
- Preserved legacy pagination, helper functions, date formatting, search schema, and CSS to keep the directories visually consistent with the Yona baseline.
- Captured the supporting CSS styles, route tests, and core parity audit entries that guard the parity status for these directories.

**Files:**
- apps/app/src/routes/_app.projects.index.tsx
- apps/app/src/routes/_app.orgs.index.tsx
- apps/app/src/styles/app.css
- apps/app/src/project-directory-route.spec.tsx
- docs/provenance/core-parity-audit.md

**Flow:**
Validate query params -> build projects/org list via listProjects/listOrganizations -> render breadcrumbs/search -> render legacy list cards with metadata and scope indicators -> paginate within the legacy window -> maintain CSS/tests/audit coverage

**Timestamp:** 2026-04-05

**Author:** Release Parity Team

## Narrative
### Structure
Both /projects and /orgs expose breadcrumb tabs (Projects active when on /projects), legacy search blocks, and card lists using the .all-projects/.project container hierarchy. Each card renders logos or initials, scope metadata (member/watch badges for public projects, lock icon for private projects, redacted placeholders), label filter links, origin badges, exec owner links, description fallback text, and formatted creation or code update dates produced by formatLegacyDate. Pagination nav uses legacy directory-pagination classes with disabled Prev/Next at bounds.

### Dependencies
These routes rely on listProjects/listOrganizations for data, translation keys such as project.is.empty and organization.is.empty, AccessControl.isGlobalResourceAllowed for organization read gating, shared helper functions (formatLegacyDate, getPaginationWindow, buildProjectsHref), the shared CSS variables and layout grids in apps/app/src/styles/app.css, and the core parity audit document that defines the status vocabulary and required parity tests.

### Highlights
Legacy UI parity is maintained: projects show member avatars/counters, watch counts, origin badges, and public/private affordances, while organizations keep the same list layout, search, logos, and date presentation. CSS reintroduces the legacy grid, badge, and pagination styling with responsive adjustments at 1100px and 720px. Automated tests assert the legacy container structure and pagination query parameters, and the audit matrix explicitly marks these routes as parity risks requiring green parity UI tests.

## Facts
- **projects_route_search_schema**: The /projects route enforces filter (trimmed string), deduped positive labelIds, and a coerced pageNum >= 1 before loading the legacy list. [project]
- **pagination_settings**: Legacy pagination keeps 10 projects per page and 30 organizations per page with a pagination window of 5 pages centered on the current page. [project]
- **legacy_date_formatting**: formatLegacyDate renders "just now", "1 day", or "N days" when entities are <=7 days old, and uses MM-DD/ YYYY-MM-DD slices for older timestamps. [project]
- **directory_css**: CSS for .all-projects, .project, .info-wrap, .owner-avatar-wrap, and .directory-pagination preserves the legacy directory card styling with breakpoints at 1100px and 720px. [project]
- **project_directory_tests**: The project directory spec asserts the legacy container/card structure, member/watch counts, origin metadata, and pagination links carrying filter=alpha, labelIds=700, and pageNum parameters with Prev/Next controls. [project]
- **core_parity_audit**: The Wave 0 core parity audit keeps the project and organization directories marked as parity, mandating the legacy list structure and metadata presentation remain covered by route/UI tests. [project]
