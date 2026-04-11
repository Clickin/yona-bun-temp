---
title: Legacy Public Directory Routes Specs
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-05T07:19:09.431Z'
updatedAt: '2026-04-05T07:19:09.431Z'
---
## Raw Concept
**Task:**
Capture the legacy public /projects and /orgs directory parity implementation details so the platform can reason about UI structure, pagination, helper utilities, and audit coverage.

**Changes:**
- Adopted route-local legacy list chrome instead of SiteShell/ContentCard for public directories.
- Kept pageNum pagination with fixed page sizes (10 projects, 30 organizations) and rolling window logic.
- Preserved legacy info-wrap markup, avatar/label handling, and private project placeholder copy while skipping placeholders for organizations.
- Maintained shared helper functions for initials, scope labels, pagination windows, and date formatting.
- Linked provenance audit vocabulary and project-directory tests that defend the metadata/pagination behavior.

**Files:**
- apps/app/src/routes/_app.projects.index.tsx
- apps/app/src/routes/_app.orgs.index.tsx
- apps/app/src/styles/app.css
- docs/provenance/core-parity-audit.md
- apps/app/src/project-directory-route.spec.tsx

**Flow:**
Loader parses the legacy search schema -> listProjects/listOrganizations fetches data -> ProjectDirectoryPage calculates pages/window and slices items -> render uses legacy list markup, info-wrap, badges, stats, and pagination nav.

## Narrative
### Structure
Both routes render breadcrumb tabs for /projects and /orgs, display the legacy search form (POST to their route), and show ul.all-projects lists filled with li.project entries that include avatar + info-wrap + stats. The project route also injects private placeholder rows with redacted copy and scope-aware lock badges.

### Dependencies
Depends on shared helper utilities (formatLegacyDate, toInitials, renderScopeLabel, getPaginationWindow), the ProjectListOutput/OrganizationListOutput models, zod search schemas, and the legacy CSS tokens defined in apps/app/src/styles/app.css.

### Highlights
Projects route keeps the legacy all-projects/project/info-wrap structure, metadata badges, member avatars, label links, and pagination nav. Organizations reuse the same chrome but avoid placeholders because legacy AccessControl already exposes org READ.

### Examples
Pagination links build /projects or /orgs hrefs with repeated labelIds and the pageNum parameter, while formatLegacyDate translates a Date to "just now" or a formatted string depending on how recent it is.

## Facts
- **project_directory_pagination**: Project directory renders exactly 10 projects per page using pageNum pagination and a rolling window of five pages before slicing the data to the legacy page size. [project]
- **organization_directory_placeholder_policy**: Organization directory renders 30 organizations per page with pageNum pagination and intentionally omits placeholder rows because the legacy AccessControl grants global READ for orgs. [project]
- **legacy_date_formatting**: Legacy date helper outputs "-" for null timestamps, "just now"/"1 day"/"n days" for recent edits up to seven days, "MM-DD" if within the current year, and "YYYY-MM-DD" otherwise. [project]
- **route_loader_validation**: Both loaders use zod schemas that trim filter text, coerce labelIds to positive unique integers, and enforce pageNum >= 1 with a default of 1 before calling listProjects or listOrganizations. [project]
