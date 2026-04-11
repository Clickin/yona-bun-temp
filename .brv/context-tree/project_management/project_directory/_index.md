---
children_hash: f88a28397d1dff28936804a8b6e79e318cb5cb16e958fb63adbfc76fe62c9c2b
compression_ratio: 0.5812854442344045
condensation_order: 1
covers: [context.md, public_projects_directory_parity.md]
covers_token_total: 1058
summary_level: d1
token_count: 615
type: summary
---
# project_directory Structural Overview

- **Purpose & Flow** – The domain captures how the public `/projects` directory stays parity-aware: request flows from `publicListSearchSchema` through the loader (`apps/app/src/routes/_app.projects.index.tsx`), into `ProjectService.listProjects`, and onward to DB aggregation (`packages/db/src/org-project.ts`) before rendering via `ProjectDirectoryPage` (`apps/app/src/routes/_app.projects.index.tsx`), with `project-directory-route.spec.tsx` validating parity expectations.

- **Contracts & Schemas** – `context.md` and `public_projects_directory_parity.md` emphasize the `projectListItemSchema` discriminated union (originating in `contracts/src/project.ts`) that distinguishes visible vs. redacted payloads, supported by normalization helpers (`normalizeOptionalText`, `normalizeOptionalFilter`, `normalizeLabelIds`) to keep payloads consistent across loader, service, and UI.

- **Service & DB Coordination** – `ProjectService.listProjects` uses `publicListSearchSchema` for filter validation, applies authorization utilities, and relies on DB CRUD helpers and normalization logic from `packages/db/src/org-project.ts` to assemble `listProjectSummaries` (labels, member/watcher counts, origin link). After aggregation, the service returns either fully detailed visible cards or permission-gated redacted placeholders.

- **UI Rendering & Rules** – `ProjectDirectoryPage` renders visible cards with memberCount, watcherCount, label badges, creation date, and origin links, while gated projects become consistent redacted placeholder rows (rule enforcing no metadata leaks for private projects). Formatting helpers like `formatDate` and `renderScopeLabel` keep presentation uniform.

- **Testing & Parity Assurance** – `project-directory-route.spec.tsx` verifies that visible entries expose labels, origin, and counts, whereas private entries are rendered solely as redacted permission text, confirming alignment between loader, service, and UI.

- **Key Relationships for Drill-Down**
  - Contracts & normalization: `public_projects_directory_parity.md` (Raw Concept + Facts)
  - DB aggregation logic: `public_projects_directory_parity.md` Facts (`db_project_summaries`)
  - Service flow & authorization: both entries (ProjectService details)
  - UI rendering & placeholders: both entries (ProjectDirectoryPage responsibilities)
  - Testing parity: `public_projects_directory_parity.md` Facts (`directory_tests`)