---
children_hash: 24c46f10438ca19124006b71faa61ab487948d2873bcdfe21f0bd7092b9763fa
compression_ratio: 0.5869311551925321
condensation_order: 2
covers: [public_directory_parity/_index.md]
covers_token_total: 857
summary_level: d2
token_count: 503
type: summary
---
# projects/public_directory_parity
- **Legacy Project Directory Pagination (`legacy_project_directory_pagination.md`)**
  - Reintroduces deterministic `/projects` pagination (10-item windows) so filtering/label state persists in prev/next links via `buildProjectsHref`.
  - Flow: loader validates `filter/labelIds/pageNum` with `publicListSearchSchema`, fetches all projects, `ProjectDirectoryPage` slices into 10-row windows, renders `ContentCard` or redacted placeholders, and presents legacy five-page windowing with disabled bounds.
  - Key facts: `projects_per_page = 10`, pagination window of five, schema enforces `pageNum ≥ 1`, placeholders precede pagination when gating is active; dependencies include schema, loader, route files, and parity audit documentation.

- **Project Directory Feature Parity (`project_directory_feature_parity.md`)**
  - Documents end-to-end parity: contracts (schemas), domain (`ProjectService.listProjects` aggregates and authorization gating), and UI (React route mirroring schema and rendering union of visible vs. gated entries).
  - Highlights: `listProjects` aggregates label counts, applies `authorizeProjectAccess`, and returns placeholder entries when access is denied; UI renders metadata/badges for visible entries and consistent redacted placeholders with counts for gated entries; deterministic tests cover both branches.
  - Facts: shared `publicListSearchSchema` and `projectListInputSchema`, rendering mix of real and placeholder cards, and preservation of search/label filters across domain/UI.

- **Structural Relationship**
  - Feature parity context defines schemas, gating rules, and domain contracts that drive the behavior documented in the pagination entry.
  - Pagination entry captures the legacy UI mechanics (windowing, placeholder handling, spec coverage) that realize the parity rules.
  - Combined coverage traces contracts → domain service → UI rendering → pagination behavior for `/projects`, centered on the shared route files and schemas.