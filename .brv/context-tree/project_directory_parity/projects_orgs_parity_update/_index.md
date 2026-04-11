---
children_hash: 7504d0d0911a50a17942fd591d6d9ef438262d59d9c956d7f4916ebfede7ffcf
compression_ratio: 0.6212804328223624
condensation_order: 1
covers: [2026_04_05_projects_and_organizations_route_parity.md]
covers_token_total: 1109
summary_level: d1
token_count: 689
type: summary
---
# Structural Summary – 2026-04-05 Projects and Organizations Route Parity

- **Legacy UI Parity Restoration (`2026_04_05 Projects and Organizations Route Parity`)**
  - **Scope & Task**: Documented the Wave 0 effort to rebuild `/projects` and `/orgs` flows on 2026-04-05 using the legacy UI components, preserving all project/organization metadata, helper functions, CSS, tests, and parity audit coverage.
  - **Flow Overview**: Query params validated → `listProjects`/`listOrganizations` produce lists → render breadcrumbs and legacy search → render `.all-projects`/`.project` card hierarchy with logos, scope badges (member/watch, lock, redacted placeholders), label links, origin badges, exec owner links, formatted dates, and paginated legacy structure → paginate within 10-project / 30-organization windows while retaining shared CSS/tests/audit protections.
  - **Dependencies & Files**: Routes rely on shared helpers (`formatLegacyDate`, `getPaginationWindow`, `buildProjectsHref`), `AccessControl.isGlobalResourceAllowed`, translation keys, CSS (`apps/app/src/styles/app.css`), route components (`_app.projects.index.tsx`, `_app.orgs.index.tsx`), tests (`project-directory-route.spec.tsx`), and the Wave 0 parity audit doc (`docs/provenance/core-parity-audit.md`).
  - **Highlights & Governance**: Legacy styling (grid, badges, pagination breakpoints at 1100px/720px), member/watch counts, origin metadata, responsive CSS, and pagination parameters with `filter=alpha`, `labelIds=700`, `pageNum` are guarded by automated route tests and the parity audit matrix, keeping the legacy directory UI flagged as a parity risk requiring “green” test coverage.
  - **Key Facts & Constraints**:
    - `/projects` route enforces trimmed filters, deduped positive `labelIds`, and `pageNum ≥ 1` before loading.
    - Pagination: 10 projects per page, 30 organizations, 5-page window centered on current page.
    - `formatLegacyDate` renders relative text for items ≤7 days old and `MM-DD`/`YYYY-MM-DD` for older dates.
    - Legacy CSS classes (`.all-projects`, `.project`, `.info-wrap`, `.owner-avatar-wrap`, `.directory-pagination`) preserve the original card styling with responsive breakpoints.
    - `project-directory-route.spec.tsx` asserts container/card structure, member/watch counts, origin metadata, and pagination parameter behavior.
    - Core parity audit keeps these directories marked as parity risks, mandating audit-driven UI/test coverage.

*Drill-down*: See `project_directory_parity/projects_route_parity/projects_route_parity.md`, `project_directory_parity/organization_directory_parity/organization_directory_parity.md`, and `project_directory_parity/projects_parity_baseline/context.md` for related parity guidance and broader context.