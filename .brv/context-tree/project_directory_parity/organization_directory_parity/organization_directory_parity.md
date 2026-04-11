---
title: Organization Directory Parity
tags: []
related: [project_directory_parity/projects_parity_baseline/projects_parity_baseline.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-05T06:18:16.602Z'
updatedAt: '2026-04-05T06:18:16.602Z'
---
## Raw Concept
**Task:**
Document the restored /orgs organization directory parity and its supporting contracts, database helpers, domain service, and UI route.

**Changes:**
- Restored legacy-style pageNum pagination (page size 30 + Prev/Next links) while carrying filter query state across navigations.
- Organization summaries include organizationLogoAssetId derived from latest attachment rows with containerType=organization so cards can render logos or initials.
- Validation, listing, and authorization logic in contracts, db helpers, and OrganizationService ensure the directory aligns with legacy behavior and provides viewerCanUpdate indicators.

**Files:**
- packages/contracts/src/org.ts
- packages/db/src/org-project.ts
- packages/domain/src/organization-service.ts
- apps/app/src/routes/_app.orgs.index.tsx
- docs/provenance/core-parity-audit.md

**Flow:**
User hits /_app/orgs -> search schema validates filter/pageNum -> loader calls listOrganizations -> summaries include logos/initials and viewer flags -> OrganizationDirectoryPage paginates results (30 per page, five page window) with Prev/Next keeping filter state -> content cards show logo or initials, name, description, created date -> pagination links render as numbers plus Prev/Next spans according to current page.

**Timestamp:** 2026-04-05

**Author:** Wave 0 Parity Team

## Narrative
### Structure
Contracts define unified validation schemas for organization names, descriptions, member roles, summaries, and detail outputs. Db helpers normalize text, enforce role IDs (project manager/member, org admin/member) and resolve organization/project metadata plus logo assets via joins. OrganizationService composes these helpers, enforces update permissions, and maps domain entities to summary/detail DTOs before the route renderer consumes them.

### Dependencies
OrganizationDirectoryPage depends on OrganizationService.listOrganizations, the paginated loader in apps/app/src/routes/_app.orgs.index.tsx, and the pagination helpers (buildOrganizationsHref, getPaginationWindow). The page also relies on listOrganizationSummaries fetching the latest organization attachment where containerType=organization to determine logo rendering, plus the contracts that vet user input (name pattern, length limits, normalized text).

### Highlights
Pagination resurrects numbered Prev/Next navigation with filter persistence, Organizations are represented as logo-or-initial cards with name/description/created date, and viewerCanUpdate metadata appears consistently when organization admins or site admins view/edit the directory. The Wave 0 parity audit marks the /orgs capability as restoring logo/date/pagination but notes additional chrome and read-gating drift still remain.

### Rules
Rule 1: Validation schemas require organization names matching /^[a-zA-Z0-9가-힣-]+([_.][a-z_.A-Z0-9가-힣-]+)*$/ and descriptions <= 255 characters.
Rule 2: Pagination navigation shows Prev/Next disabled spans when the current page is at either boundary while maintaining the filter query string.

### Examples
Example pagination URLs: /_app/orgs/?pageNum=1&filter=infra (Prev disabled, Next points to page 2). For organizations with organizationLogoAssetId, OrganizationDirectoryPage renders an <img> tag; otherwise it falls back to initials extracted via toInitials.

## Facts
- **organization_pagination**: OrganizationDirectoryPage renders organizations in pages of 30 rows with a five-page pagination window and preserves the current filter query parameter when rendering Prev/Next or numbered links. [project]
- **organization_logo_lookup**: listOrganizationSummaries fetches the latest attachment row where containerType=organization to populate organizationLogoAssetId for each summary card. [project]
- **organization_service_authorization**: OrganizationService enforces org-update guard rails (site admins or organization admins) before write operations and mirrors viewerCanUpdate flags on the detail DTO. [project]
