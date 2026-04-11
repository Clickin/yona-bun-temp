---
title: Legacy Directory List Parity
tags: []
related: [project_directory_parity/projects_parity_baseline/projects_parity_baseline.md, project_directory_parity/projects_route_parity/projects_route_parity.md, project_directory_parity/public_directory_routes/legacy_public_directory_routes.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-05T07:17:50.975Z'
updatedAt: '2026-04-05T07:17:50.975Z'
---
## Raw Concept
**Task:**
Document the parity implementation of legacy project and organization directories that replicate the route-local legacy list chrome while using core legacy helpers for pagination, date display, and search.

**Changes:**
- Routed /projects and /orgs through their own legacy View route components instead of the generic SiteShell/ContentCard wrapper.
- Kept the legacy all-projects/project/info-wrap semantics, placeholder rows for private projects, and the date and metadata formatting helper logic.
- Aligned styling with the legacy CSS tokens and layout helpers in apps/app/src/styles/app.css so the directory lists keep the legacy surface feel.
- Established parity expectations via docs/provenance/core-parity-audit.md so the Wave 0 audit confirms the list structure, metadata, pagination, and placeholder rules.
- Added a focused unit test suite (project-directory-route.spec.tsx) that checks for the legacy metadata, pagination controls, placeholder text, and absence of the modern header shell.

**Files:**
- apps/app/src/routes/_app.projects.index.tsx
- apps/app/src/routes/_app.orgs.index.tsx
- apps/app/src/styles/app.css
- docs/provenance/core-parity-audit.md
- apps/app/src/project-directory-route.spec.tsx

**Flow:**
Request hits /projects or /orgs route -> validates search/query params -> loader pulls project/org list -> ProjectDirectoryPage/OrganizationDirectoryPage enforces legacy structure (all-projects list, info-wrap, metadata, stats) -> renders pagination nav using buildProjectsHref/buildOrganizationsHref -> CSS from app.css applies legacy tokens and layout.

**Timestamp:** 2026-04-05

**Author:** Parity Team

## Narrative
### Structure
Project and organization directory routes each expose a dedicated file route (_app.projects.index.tsx, _app.orgs.index.tsx) that hosts a loader, legacy search form, and list rendering logic. Both pages render the legacy container classes (all-projects, info-wrap, legacy-directory-pagination) so frontend parity tests can assert DOM structure.

### Dependencies
Both routes share helper functions: formatLegacyDate, toInitials, getPaginationWindow, and the pagination window constants. CSS tokens from apps/app/src/styles/app.css (nav-pill, directory-pagination, legacy-directory-pagination) must stay in sync because the parity tests assert visual styles, while docs/provenance/core-parity-audit.md sets the expectations for data fidelity and pagination counts.

### Highlights
Projects page maintains owner/members metadata, placeholder rows for private projects, label links, and stats (members/watch counts). Organizations page reuses the same helper logic, omits placeholder rows due to universal READ, and keeps pagination at 30 per page. Tests in project-directory-route.spec.tsx verify both metadata blocks and pagination behavior so regressions on parity surfaces are caught early.

## Facts
- **projects_pagination**: Public /projects uses pageNum-based pagination with 10 projects per legacy page and a 5-page pagination window to mirror the legacy list pagination. [project]
- **organizations_pagination**: Public /orgs uses pageNum-based pagination with 30 organizations per page and the same 5-page window, omitting placeholder rows because legacy AccessControl grants org READ globally. [project]
