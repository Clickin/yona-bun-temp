---
title: Legacy Public Directory Routes
tags: []
related: [project_directory_parity/organization_directory_parity/context.md, project_directory_parity/projects_parity_baseline/context.md]
keywords: []
importance: 55
recency: 1
maturity: draft
updateCount: 1
createdAt: '2026-04-05T07:13:50.586Z'
updatedAt: '2026-04-05T07:14:01.231Z'
---
## Raw Concept
**Task:**
Document the parity implementation for the public `/projects` and `/orgs` routes, including helpers, pagination, metadata layout, tests, and the audit that ingrains the legacy expectations.

**Changes:**
- Restored the legacy project and organization list DOM structure (`all-projects/project/info-wrap/owner-avatar-wrap/header/desc/name-tag/stats-wrap`).
- Reintroduced shared helpers (search schema, formatLegacyDate, toInitials, pagination builders) plus test fixtures to validate metadata, placeholders, and pagination state.
- Linked the behavior to the provenance core parity audit so governance verifies all rows that mention public directories remain at parity.

**Files:**
- apps/app/src/routes/_app.projects.index.tsx
- apps/app/src/routes/_app.orgs.index.tsx
- apps/app/src/project-directory-route.spec.tsx
- apps/app/src/organization-directory-route.spec.tsx
- docs/provenance/core-parity-audit.md

**Flow:**
Visitor hits `/projects`, loader runs `listProjects` with filter, labelIds, pageNum (>=1), the page renders search form/breadcrumbs, iterates visible, redacted, and placeholder project rows, shows metadata, stats, and pagination nav; `/orgs` shares helpers, lists organizations with avatar link, fallback text, legacy date, and pagination nav; tests mock router links to assert metadata, placeholders, pagination window, and fixture coverage; audit table records legacy parity status for public directories.

**Timestamp:** 2026-04-05

**Author:** Yona parity squad

## Narrative
### Structure
The `/projects` page rebuilds the legacy structure with `info-wrap`, `project` rows that include owner avatars (logo or initials), headers linking to project and origin, metadata rows with lock icons for private projects, label filter anchors, descriptions, and name-tags showing owner links plus `createdAt`/`lastPushedAt`. Stats rows show public member/watch counts with legacy separators while redacted rows show placeholder text rendered via `renderScopeLabel`. Breadcrumb tabs span `/projects` and `/orgs`, and the pagination helper builds `/projects` query strings, capping windows with the PAGINATION_WINDOW constant.

### Dependencies
Pagination logic, `formatLegacyDate`, and `toInitials` helpers are shared between `/projects` and `/orgs`, so changes must keep both routes aligned. Tests in `project-directory-route.spec.tsx` and `organization-directory-route.spec.tsx` rely on mocked `createFileRoute`/`Link` to assert pagination links carry filter and label query parameters and to verify placeholder/metadata counts. The provenance audit (`docs/provenance/core-parity-audit.md`) defines the parity statuses for public directories and links these code paths to the `parity` entry rows.

### Highlights
Tests assert metadata, label filters, redacted placeholders, owner links, pagination Prev/Next buttons, and legacy classes/icons. The audit enumerates parity/ux-drift expectations for public landing, project, and organization directories, and the Wave 0 snapshot (`bun run verify:agents`, `bun run check`, `bun run test:unit`) is the exit signal before capability remediation.

## Facts
- **projects_per_page**: PROJECTS_PER_PAGE is fixed to 10 when rendering the legacy `/projects` directory. [project]
- **organizations_per_page**: ORGANIZATIONS_PER_PAGE is fixed to 30 for the `/orgs` directory pagination. [project]
- **pagination_window**: Both directories reuse PAGINATION_WINDOW of 5 to determine which page numbers are shown around the current page. [convention]
- **format_legacy_date**: formatLegacyDate outputs “just now”, “1 day”, “n days” (<8 days), same-year dates as `MM-DD`, older dates as `YYYY-MM-DD`, and uses “-” for nulls. [project]
