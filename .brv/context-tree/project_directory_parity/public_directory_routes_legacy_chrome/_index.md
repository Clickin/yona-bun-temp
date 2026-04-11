---
children_hash: 5e91c18b72ee0873f2178ae20f8e3609338d6ff3de2a5e7b24afd88a2ea3c05f
compression_ratio: 0.5778801843317972
condensation_order: 1
covers: [context.md, legacy_public_directory_chrome_parity.md]
covers_token_total: 1085
summary_level: d1
token_count: 627
type: summary
---
# public_directory_routes_legacy_chrome
- **Purpose:** Captures Wave 0 parity work for the `/projects` and `/orgs` public directory routes to align loaders, pagination, and styling with the legacy all-projects chrome (see `context.md`).
- **Structure & Flow (context.md):**
  - Shared loaders sanitize legacy query params (`filter`, `labelIds`, `pageNum`), clamp page bounds, compute pagination window, and render breadcrumb tabs + legacy list markup (info-wrap rows, stats, tabs).
  - Styling tokens and classes live in `apps/app/src/styles/app.css` to mirror SiteShell chrome gradients/cards/pills.
  - Parity verification references `docs/provenance/core-parity-audit.md` and `project-directory-route.spec.tsx`; tests validate metadata, pagination parameters, placeholders, and chrome fidelity.
- **Key Concepts (context.md):**
  - Legacy list markup/pagination reused for both routes with shared CSS tokens.
  - Loader/pagination behavior and styling targets documented for downstream audits (see related parity topics for deeper dive).
- **Raw Parity Details (legacy_public_directory_chrome_parity.md):**
  - **Task & Flow:** Loader -> sanitize -> clamp pages -> build pagination window -> render legacy structure -> show error wrap when empty.
  - **Changes:** Route-local loaders, legacy query sanitization, documented CSS selectors, parity audit linkage, and page-level tests.
  - **Files involved:** `_app.projects.index.tsx`, `_app.orgs.index.tsx`, `app.css`, `core-parity-audit.md`, `project-directory-route.spec.tsx`.
  - **Dependencies:** Formatters (`formatLegacyDate`, `toInitials`), pagination helper (`getPaginationWindow`), schema (`publicListSearchSchema`), and CSS variables/class selectors.
  - **Highlights & Facts:**
    - Projects render 10 rows/page with 5-page pagination window and placeholders; organizations render 30 rows/page without placeholders.
    - Legacy styles rely on selectors like `.all-projects`, `.info-wrap`, `.legacy-directory-pagination`.
    - Parity audit status: directories marked `parity`, metadata/member/watch stats, pagination counts preserved.

**Drill-down:** Read `context.md` and `legacy_public_directory_chrome_parity.md` for full loader, styling, and testing specifics plus related parity topics (`project_directory_parity/public_directory_routes/legacy_public_directory_routes.md`, `project_directory_parity/projects_route_parity/projects_route_parity.md`, `project_directory_parity/organization_directory_parity/organization_directory_parity.md`).