---
children_hash: cca536a1db95c4f5ff3791a0517f89ac4b5ae360089e8b97ade78998b7dcdc23
compression_ratio: 0.6420021762785637
condensation_order: 2
covers: [context.md, project_directory/_index.md]
covers_token_total: 919
summary_level: d2
token_count: 590
type: summary
---
# project_management (d2 structural summary)

- **Domain Purpose & Scope** (`context.md`)
  - Captures the public `/projects` directory pipeline from schema definitions, ProjectService list/load/update operations, and DB aggregations through to route-level loaders/components, focusing solely on public listing behavior.
  - Excludes project creation/edit flows and internal admin dashboards; owned by the Projects feature team and used to describe the full stack supporting consistent directory rendering.

- **Request-to-Render Flow** (`project_directory/_index.md`)
  - Incoming requests validated against `publicListSearchSchema`, routed through `apps/app/src/routes/_app.projects.index.tsx` loader, forwarded to `ProjectService.listProjects`, and aggregated via `packages/db/src/org-project.ts` before `ProjectDirectoryPage` renders the cards.
  - Normalization helpers (`normalizeOptionalText`, `normalizeOptionalFilter`, `normalizeLabelIds`) keep payloads consistent across schema, service, and UI layers.

- **Contract & Payload Structure** (`project_directory/_index.md`)
  - `contracts/src/project.ts` defines `projectListItemSchema` discriminated union to distinguish visible vs. redacted entries, ensuring loader, service, and UI agree on shared fields.
  - Aggregated `listProjectSummaries` include member counts, watcher counts, labels, origin project links, and creation dates necessary for card rendering.

- **UI Rendering Rules & Helpers** (`project_directory/_index.md`)
  - `ProjectDirectoryPage` renders visible cards (memberCount, watcherCount, label badges, formatted creation date, origin link) and enforces redacted placeholder rows with no metadata for gated projects; helpers like `formatDate` and `renderScopeLabel` maintain presentation uniformity.

- **Parity Testing** (`project_directory/_index.md`)
  - `project-directory-route.spec.tsx` confirms visible entries expose labels/origin/counts while private entries appear as redacted permission text, verifying loader-service-UI alignment and guarding against metadata leaks.

- **Drill-Down References**
  - Schema + normalization: `context.md`, `project_directory/_index.md`
  - Service + DB aggregation flow: `project_directory/_index.md`
  - UI rendering rules and presentation helpers: `project_directory/_index.md`
  - Parity-oriented tests: `project_directory/_index.md`