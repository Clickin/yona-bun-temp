---
children_hash: 14dc5b3cf0d32ff95f9bcf8d5b2c895f027b46891bd9059888f77c74d1fa302a
compression_ratio: 0.7043596730245232
condensation_order: 1
covers: [projects_route_parity.md]
covers_token_total: 734
summary_level: d1
token_count: 517
type: summary
---
### projects_route_parity (domain: project_directory_parity)
- **Objective:** Capture Wave 0 parity work for `/projects`, ensuring schema, service, and UI elements align to restore logo/avatar display and flag remaining drift (see `project_directory_parity/projects_parity_baseline.md` for related baseline).
- **Scope & Flow:** Client `/projects` request → `listProjects` service → `listProjectSummaries` (now honoring latest attachments for logos and avatars via `listProjectSummaries` attachments) → Remix `ProjectDirectoryPage` renders cards with logos/avatars sourced from `/api/assets/{assetId}`, member preview strips, watcher counts, origin badges, and search/label filters; non-public projects emit redacted placeholders. Remaining drift: legacy card chrome and pagination styles noted for future iterations.
- **Key Architectural Details:** Contracts (`packages/contracts/src/project.ts`) enforce name validation (1–255 chars, regex `^[a-zA-Z0-9-_.가-힣]+$`, disallowing `.`, `..`, `.git`); DB helpers (`packages/db/src/org-project.ts`) supply attachment-driven summaries plus org/member queries; domain service (`packages/domain/src/project-service.ts`) governs access/visibility and converters feeding the loader; Remix route (`apps/app/src/routes/_app.projects.index.tsx`) orchestrates rendering.
- **Dependencies:** `listProjects` depends on authorization-filtered `listProjectSummaries`, attachment lookups for `project`/`user_avatar`, and ProjectService schema converters before the loader serves `ProjectDirectoryPage`.
- **Highlights:** Public cards now show logos (via `/api/assets`), member previews, watcher counts, and origin badges; parity audit identifies remaining UI chrome/pagination drift.
- **Facts for Drill-down:** `listProjectSummaries` reads latest attachment rows for logos/user avatars (`list_project_summaries_attachments`); rendering uses `/api/assets/{assetId}` with initials fallback (`project_directory_page_assets`); strict project name validation rules reside in `packages/contracts/src/project.ts` (`project_name_validation`).