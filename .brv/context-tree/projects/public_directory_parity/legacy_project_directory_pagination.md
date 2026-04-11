---
title: Legacy Project Directory Pagination
tags: []
related: [projects/public_directory_parity/project_directory_feature_parity.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-05T06:10:03.599Z'
updatedAt: '2026-04-05T06:10:03.599Z'
---
## Raw Concept
**Task:**
Document the reinstated legacy pagination and content parity for the public /projects directory.

**Changes:**
- Reintroduced pageNum pagination with a fixed 10-item window at the route layer so the UI slices lists locally rather than relying on variable backend responses.
- Preserved filter and labelIds state in numbered Prev/Next links through buildProjectsHref, keeping the contracts surface unchanged while matching the legacy flow.
- Added spec coverage for metadata display, public label links, redacted placeholders, and pagination that retains filter/label query parameters.

**Files:**
- apps/app/src/routes/_app.projects.index.tsx
- apps/app/src/project-directory-route.spec.tsx
- docs/provenance/core-parity-audit.md

**Flow:**
GET /projects -> publicListSearchSchema validates filter/labelIds/pageNum -> loader listProjects returns full set -> ProjectDirectoryPage calculates currentPageNum and slices projects for the 10-item window -> renders visibility/redacted cards and Prev/Next pagination links built via buildProjectsHref.

**Timestamp:** 2026-04-05

## Narrative
### Structure
ProjectDirectoryPage lives inside SiteShell, renders navigation tabs to /projects and /orgs, includes a search form that submits via GET, and maps either visible ContentCards (with logos, owners, overviews, dates, label badges, avatars, and member/watch counts) or redacted placeholders before rendering the pagination nav when totalPageCount > 1.

### Dependencies
Depends on publicListSearchSchema for validating requests, listProjects loader data, ContentCard for visible rows, SiteShell for chrome, and helper utilities like buildProjectsHref, getPaginationWindow, formatDate, toInitials, and renderScopeLabel.

### Highlights
Tests confirm the UI shows public metadata, label filter links, private placeholders, and a legacy-styled pagination experience where moving to page 2 keeps the filter, label, and pageNum query; docs capture the parity audit matrix noting semantic drift, required Red tests, and the Wave 0 exit snapshot that certifies readiness to remediate remaining gaps.

## Facts
- **projects_per_page**: The public /projects page enforces a fixed 10-project page size so totalPageCount = ceil(projects.length / 10). [project]
- **pagination_window**: Pagination buttons show a window of 5 page numbers centered on the current page, with Prev/Next links disabled at bounds. [project]
- **public_search_schema**: publicListSearchSchema trims optional filter input, sanitizes labelIds into unique ints > 0, and coerces pageNum to an integer >= 1 before calling listProjects. [project]
