---
children_hash: 9256e9fd1b90fe6f814b9158efa57db6c12e7983bda181be495fc0e025f0d4d6
compression_ratio: 0.5038759689922481
condensation_order: 1
covers: [legacy_project_directory_pagination.md, project_directory_feature_parity.md]
covers_token_total: 1548
summary_level: d1
token_count: 780
type: summary
---
# Legacy Project Directory Pagination & Feature Parity (projects/public_directory_parity)
- **Legacy Project Directory Pagination** (`legacy_project_directory_pagination.md`)
  - Task: Reintroduce deterministic /projects pagination with 10-item windows so the UI slices locally while keeping filter/labelIds state in prev/next links via `buildProjectsHref`.
  - Files: `apps/app/src/routes/_app.projects.index.tsx`, `apps/app/src/project-directory-route.spec.tsx`, `docs/provenance/core-parity-audit.md`.
  - Flow: GET `/projects` → `publicListSearchSchema` validates `filter/labelIds/pageNum` → loader `listProjects` returns full set → `ProjectDirectoryPage` calculates `currentPageNum`, slices into 10-row window, renders `ContentCard`/redacted rows, then legacy pagination (window of five pages with disabled bounds).
  - Narrative: `ProjectDirectoryPage` inside `SiteShell` renders search form, tabs, and either visible ContentCards or redacted placeholders before pagination; dependencies include schema, loader, build/helpers. Highlights cover metadata display, preserved filter links, redacted placeholders, parity audit snapshot.
  - Facts: fixed `projects_per_page=10`, pagination window of five centered pages, `publicListSearchSchema` sanitizes filters and coerces `pageNum` ≥1.

- **Project Directory Feature Parity** (`project_directory_feature_parity.md`)
  - Task: Document parity across contracts, domain, and UI for public `/projects`.
  - Changes: discriminated union for visible vs. gated list items, DB aggregation + authorization gating in `listProjects`, mirrored contracts input schema in UI search form, preserved route tests.
  - Files: `packages/db/src/org-project.ts`, `packages/domain/src/project-service.ts`, route + specs.
  - Flow: list page load → `publicListSearchSchema` validates filters → `ProjectService.listProjects` aggregates + gates → UI renders union entries (visible or redacted) via `ProjectDirectoryPage`.
  - Narrative: Contracts define schemas, domain service maps and gates, React route renders cards with counts/badges or placeholders; dependencies include schema, `ProjectService`, DB helpers, `authorizeProjectAccess`, deterministic tests.
  - Highlights/Rules: visible cards show counts, badges, origin links; gated entries render placeholders with parity placement; service must return placeholders when access denied.
  - Facts: rendering consists of visible cards + redacted placeholders, `listProjects` aggregates labels/counts and filters by authorization, `projectListInputSchema` controls search/label filters mirrored in UI, tests cover both branches.

- **Structural Relationship**
  - Feature parity entry defines the contracts/domain/UI split, shared schema, gating rules, and facts that underpin the legacy pagination behavior described in the pagination entry.
  - Pagination entry documents legacy UI behavior, windowing, and spec coverage that realizes the parity rules and schema defined in the feature parity context.
  - Together they span contracts → domain service → UI rendering → pagination, all referencing the same route/files for traceability.