---
children_hash: c730fd2faacec4578ff9594f6bb8a4c0a7352a2f5253279795df02574c41526d
compression_ratio: 0.5755868544600939
condensation_order: 1
covers: [organization_directory_parity.md]
covers_token_total: 1065
summary_level: d1
token_count: 613
type: summary
---
# Organization Directory Parity Overview

- **Entry:** `organization_directory_parity.md`  
- **Scope:** Captures the restored `/orgs` directory parity, encompassing contracts, database helpers, domain services, and the UI route that delivers legacy behavior plus viewer controls.

## Key Structural Elements
- **Contracts & Validation:** Unified schemas validate organization names (regex `/^[a-zA-Z0-9가-힣-]+([_.][a-z_.A-Z0-9가-힣-]+)*$/`), descriptions (≤255 chars), roles (project manager/member, org admin/member), summaries, and detail outputs, feeding `packages/contracts/src/org.ts`.
- **Database & Domain Services:** `packages/db/src/org-project.ts` normalizes text, enforces role IDs, resolves metadata, and joins latest organization attachment rows (`containerType=organization`) to provide `organizationLogoAssetId`. `packages/domain/src/organization-service.ts` composes these helpers, enforces viewer/write permissions (site admins or org admins), and maps domain entities to summary/detail DTOs carrying `viewerCanUpdate`.
- **Route & UI:** `apps/app/src/routes/_app.orgs.index.tsx` loader validates filters/page numbers via contracts, calls `OrganizationService.listOrganizations`, and renders `OrganizationDirectoryPage`. Pagination helpers (`buildOrganizationsHref`, `getPaginationWindow`) ensure 30-row pages with a five-page window, Prev/Next spans that disable at boundaries, and preservation of filter query parameters. Cards display logo (via `organizationLogoAssetId`) or initials, name, description, created date, and viewer metadata.

## Highlights & Rules
- **Highlights:** Legacy pagination (numbered links plus Prev/Next), logo-or-initial cards, and consistent `viewerCanUpdate` flags; documented status in `docs/provenance/core-parity-audit.md`.
- **Rules:** (1) Name regex and 255-character description limit; (2) Prev/Next links rendered as disabled spans at boundaries while keeping filters in the query string.

## Facts (Drill-down references)
- `organization_pagination`: 30-row pages with five-page windows and filter-preserving pagination links (`organization_directory_parity.md`).
- `organization_logo_lookup`: Latest organization attachment used to populate `organizationLogoAssetId` for card rendering (`organization_directory_parity.md`).
- `organization_service_authorization`: `OrganizationService` enforces site/org admin write guards and mirrors `viewerCanUpdate` on DTOs (`organization_directory_parity.md`).