---
children_hash: 01820f5752939b35601d0844ffca7f0c676a3dbc9f75e8fdc5c7f2e9539c16da
compression_ratio: 0.5401929260450161
condensation_order: 1
covers: [legacy_directory_list_parity.md]
covers_token_total: 933
summary_level: d1
token_count: 504
type: summary
---
## Legacy Directory List Parity Overview
- **Purpose & Task:** `Legacy Directory List Parity` captures the effort to mirror the legacy project and organization directories by reusing legacy helpers for pagination, metadata formatting, search, and styling while routing through dedicated legacy view components instead of the modern SiteShell/ContentCard wrapper.
- **Implementation Highlights:**
  - Routes: `/projects` and `/orgs` now resolve via `_app.projects.index.tsx` and `_app.orgs.index.tsx`, each exposing loaders, legacy search forms, and rendering logic that emits the legacy container classes (`all-projects`, `info-wrap`, `legacy-directory-pagination`) to satisfy frontend parity assertions.
  - Styling: CSS tokens and layout helpers continue to live in `apps/app/src/styles/app.css`, ensuring the legacy surface feel required by parity tests.
  - Helpers & Pagination: Shared functions (e.g., `formatLegacyDate`, `toInitials`, `getPaginationWindow`) plus constants drive metadata display and pagination links (`buildProjectsHref`, `buildOrganizationsHref`). Projects list uses 10 items/page with a 5-page window and private-project placeholders; organizations list uses 30 items/page without placeholders due to legacy read access.
  - Documentation & Testing: Parity expectations are codified in `docs/provenance/core-parity-audit.md`, and `apps/app/src/project-directory-route.spec.tsx` asserts metadata blocks, pagination controls, placeholder text, and absence of modern headers to prevent regressions.
- **Flow Summary:** Requests hit `/projects` or `/orgs`, validate params, loader fetches the list, the legacy page component enforces container semantics and metadata formatting, renders pagination nav with legacy helpers, and styles are applied via legacy CSS tokens.
- **Facts Preserved:** Projects pagination mirrors legacy 10-per-page with a 5-page window and placeholder rows; organizations pagination uses 30 per page with the same window and no placeholders, matching legacy access rules.