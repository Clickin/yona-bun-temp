---
children_hash: dda73945b666da7721354746a4592b219b3088d225cc2bdc987585084e7c6b9d
compression_ratio: 0.32878411910669975
condensation_order: 2
covers: [context.md, landing_navigation_wave1_parity/_index.md, legacy_directory_list_parity/_index.md, organization_directory_parity/_index.md, projects_orgs_parity_update/_index.md, projects_parity_baseline/_index.md, projects_route_parity/_index.md, public_directory_parity/_index.md, public_directory_routes/_index.md, public_directory_routes_legacy_chrome/_index.md]
covers_token_total: 5642
summary_level: d2
token_count: 1855
type: summary
---
# project_directory_parity Structural Summary

## Domain Purpose & Scope
- **Purpose**: Maintain `/projects` parity across contracts, DB, domain services, UI, and audits for release planning.  
- **Scope**: Includes parity rules for contracts, database helpers, CRUD flows, UI routes/cards, and audit matrices for the project directory; excludes non-/projects directories and obsolete legacy cards.  
- **Ownership/Usage**: Managed by Release Engineering/Platform Parity team; consult when evaluating drift, planning remediation, or onboarding on project directory topics (`context.md`).

## Subtopics Overview (Drill-down references)

### 1. Landing & Navigation Parity
- **entry**: `landing_navigation_wave_1_parity/_index.md` → `landing_navigation_wave_1_parity.md`
- Defines Wave 1 landing/navigation parity: anonymous-only hero, route/layout enforcement, locale switcher, global search, and rejection of legacy entry points.
- Flow: Parity spec → landing enforcement → `-public-landing-parity.spec.tsx` validation → baseline audit (`docs/provenance/core-parity-audit.md`).
- Highlights: Layout/routing split between `_app.tsx` and `_app.index.tsx`, global search, locale toggles, and constraint rules enforced via specs.

### 2. Legacy Directory List Parity
- **entry**: `legacy_directory_list_parity/_index.md` → `legacy_directory_list_parity.md`
- Mirrors legacy `/projects` and `/orgs` directories with shared helpers, navigation, styles, pagination (10 projects/30 orgs, 5-page window), and placeholders.
- Route specifics: `_app.projects.index.tsx` and `_app.orgs.index.tsx` loaders, legacy containers (`all-projects`, `info-wrap`, `legacy-directory-pagination`).
- Tests/audit: `project-directory-route.spec.tsx` asserts metadata, pagination, placeholders; baseline audit doc covers requirements.

### 3. Organization Directory Parity
- **entry**: `organization_directory_parity/_index.md` → `organization_directory_parity.md`
- Contracts validate name/description/role schemas; DB/domain services enforce normalization, role IDs, `viewerCanUpdate`, and logo assets.
- Route/UI: `_app.orgs.index.tsx` loader + `OrganizationDirectoryPage`, pagination helpers (`buildOrganizationsHref`, `getPaginationWindow`), cards with logo/initial fallback, descriptions, creation date, viewer metadata.
- Key rules: Name regex, description max length, pagination window, Prev/Next span handling, filter persistence; audit anchored in `core-parity-audit.md`.

### 4. Projects & Organizations Route Parity Update
- **entry**: `projects_orgs_parity_update/_index.md` → `2026_04_05_projects_and_organizations_route_parity.md`
- Documents Wave 0 restoration of legacy `/projects` and `/orgs` flows on 2026-04-05: query validation, helper reuse, CSS, tests, audit coverage.
- Flow: Validate params → list via services → render breadcrumbs/search and legacy card hierarchy (`.all-projects`, logos, badges, pagination).
- Dependencies: `formatLegacyDate`, `getPaginationWindow`, `buildProjectsHref`, AccessControl guards, translation keys, CSS, route components, tests, audit doc.
- Facts: Pagination counts (10/30), filter handling, date formatting rules, and parity audit status.

### 5. Projects Parity Baseline
- **entry**: `projects_parity_baseline/_index.md` → `context.md` + `projects_parity_baseline.md`
- Captures `/projects` parity surface from contracts → DB → services → UI → audit (Wave 0 status matrix and verification commands).
- Highlights: `lastPushedAt` propagation, project metadata normalization, helper dependencies, UI badge rendering (scope, lock, code-update).
- Relationships: Contracts feed `listProjects`, DB helpers ensure uniqueness, UI cards use shared formatters, audit doc maintains statuses/commands.

### 6. Projects Route Parity
- **entry**: `projects_route_parity/_index.md` → `projects_route_parity.md`
- Focused parity effort for `/projects`: contracts (`project.ts`) enforce naming regex, DB helpers supply attachments for logos/avatars, domain service controls access.
- Remix route renders `ProjectDirectoryPage` with logos, member/watch counts, origin badges, placeholder handling, and search/label filters.
- Highlights: Logo rendering via `/api/assets/{assetId}`, member previews, watcher counts, audit-documented UI drift.

### 7. Public Directory Parity Snapshot
- **entry**: `public_directory_parity/_index.md` → `public_directory_parity_snapshot_2026_04_05.md`
- Snapshot of Wave 0 parity restore for `/projects` & `/orgs`: loader validation, pagination constants (`PROJECTS_PER_PAGE=10`, `ORGANIZATIONS_PER_PAGE=30`, `PAGINATION_WINDOW=5`), legacy helpers (`formatLegacyDate`, `toInitials`).
- Testing: `project-directory-route.spec.tsx`, `organization-directory-route.spec.tsx`, and audit doc record statuses and verification commands.

### 8. Public Directory Routes (Legacy)
- **entry**: `public_directory_routes/_index.md` → multi-file cover
- Context emphasizes `/projects` & `/orgs` mirroring legacy structure, pagination, metadata, auditing, shared helpers (`formatLegacyDate`, `build*Href`), and CSS.
- Route parity: loaders output legacy markup (`ul.all-projects`, `li.project`, info wraps, placeholders) with pagination rules (10/30 rows, 5-page window).
- Specs reinforce structure, pagination, placeholders, and date formatting aligned with audit vocabulary.

### 9. Public Directory Routes Legacy Chrome
- **entry**: `public_directory_routes_legacy_chrome/_index.md` → `context.md`, `legacy_public_directory_chrome_parity.md`
- Captures loaders sanitizing legacy query params, pagination windows, and legacy chrome styling (`app.css` selectors like `.all-projects`, `.info-wrap`, `.directory-pagination`).
- Task flow: loader → sanitize → clamp → render legacy structure → error handling.
- Facts: Projects use placeholders (private only), orgs no placeholders, pagination counts (10/30), parity audit statuses, shared helper dependencies, and test coverage via `project-directory-route.spec.tsx`.

## Summary Relationships & Patterns
- **Contracts → Services → Routes**: Contracts (`packages/contracts/src/project.ts` and `org.ts`) guide loaders (`_app.projects.index.tsx`, `_app.orgs.index.tsx`) through services that normalize data and enforce authorization; legacy helpers/pagination are reused across routes.
- **Legacy Styling & Helpers**: Shared CSS (`apps/app/src/styles/app.css`), metadata helpers (`formatLegacyDate`, `toInitials`, pagination builders), and class names (`.all-projects`, `.info-wrap`, `.legacy-directory-pagination`) ensure visual parity across `/projects` and `/orgs`.
- **Audit Governance**: `docs/provenance/core-parity-audit.md` repeatedly anchors coverage with statuses (`parity`, `ux-drift`, `semantic-drift`, `missing`, `deferred-2nd-priority`), verification commands, and parity risk tracking for directories.
- **Pagination & Placeholders**: Consistent constants (10 projects, 30 orgs, window=5) with placeholder policy (projects only) and disabled Prev/Next spans at boundaries preserve legacy navigation semantics.
- **Testing & Parity Rules**: Specs (`project-directory-route.spec.tsx`, `organization-directory-route.spec.tsx`, `-public-landing-parity.spec.tsx`) enforce metadata blocks, pagination, placeholders, and forbidden legacy surface elements, ensuring compliance documented at domain level.

For deeper detail on each architectural component, helpers, rules, and audit linkages, drill into the referenced child entries.