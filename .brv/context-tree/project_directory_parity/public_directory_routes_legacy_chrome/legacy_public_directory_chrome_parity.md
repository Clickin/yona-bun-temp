---
title: Legacy Public Directory Chrome Parity
tags: []
related: [project_directory_parity/public_directory_routes/legacy_public_directory_routes.md, project_directory_parity/projects_route_parity/projects_route_parity.md, project_directory_parity/organization_directory_parity/organization_directory_parity.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-05T07:18:38.502Z'
updatedAt: '2026-04-05T07:18:38.502Z'
---
## Raw Concept
**Task:**
Capture Wave 0 parity effort for the public /projects and /orgs routes, emphasizing the legacy chrome structure, pagination behavior, and audit validation.

**Changes:**
- Moved /projects and /orgs routing logic into route-local loaders that still render the legacy all-projects/project/info-wrap markup.
- Kept legacy query parameter sanitization for filter, labelIds, and pageNum to mimic the old pagination behavior.
- Documented the semantic CSS variables and directory-specific classes in apps/app/src/styles/app.css to preserve the SiteShell appearance.
- Referenced the parity audit entry that marks the public directories as parity-complete.
- Added page-level tests in project-directory-route.spec.tsx to verify metadata, pagination, and placeholder expectations.

**Files:**
- apps/app/src/routes/_app.projects.index.tsx
- apps/app/src/routes/_app.orgs.index.tsx
- apps/app/src/styles/app.css
- docs/provenance/core-parity-audit.md
- apps/app/src/project-directory-route.spec.tsx

**Flow:**
Loader reads query params (filter, labelIds, pageNum) -> sanitize/normalize inputs -> clamp total pages -> build pagination window around current page -> render breadcrumb tabs, search form, legacy list rows, and pagination nav -> show error wrap when no projects/orgs.

**Timestamp:** 2026-04-05

**Author:** Parity Team

## Narrative
### Structure
ProjectDirectoryPage and OrganizationDirectoryPage render `.all-projects` containers filled with `.project` rows, each featuring an `.info-wrap` with avatar/metadata, `.name-tag` for owner/date, and stats badges. Breadcrumb tabs toggle between /projects and /orgs, while the search form posts to the active route to reuse legacy filtering behavior.

### Dependencies
Both routes use helpers like formatLegacyDate, toInitials, and getPaginationWindow. Projects also depend on publicListSearchSchema to trim filters, enforce unique positive labelIds, and default pageNum to 1. Styles depend on semantic CSS variables and class names defined in apps/app/src/styles/app.css to mirror gradients, cards, and pagination pills from the legacy shell.

### Highlights
The parity audit marks these directories as `parity` status, preserving metadata, member/watch stats, pagination counts (10 for projects, 30 for orgs), and placeholder rows only for projects. Tests in project-directory-route.spec.tsx assert rendering of metadata, pagination link parameters, placeholder copy, and absence of legacy SiteShell wrappers.

## Facts
- **projects_pagination**: The project directory renders ten projects per legacy page and constrains its pagination window to five pages around the selected page. [convention]
- **organizations_pagination**: The organization directory renders thirty rows per page, reuses the legacy date formatter, and omits placeholder rows because org data is readable by everyone via legacy AccessControl. [convention]
- **legacy_directory_styles**: The legacy directory chrome styling relies on apps/app/src/styles/app.css selectors like .all-projects, .info-wrap, and .legacy-directory-pagination to match the monolithic SiteShell look. [project]
