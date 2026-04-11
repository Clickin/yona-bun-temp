---
title: projects_route_parity
tags: []
related: [project_directory_parity/projects_parity_baseline.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-05T05:56:16.709Z'
updatedAt: '2026-04-05T05:56:16.709Z'
---
## Raw Concept
**Task:**
Document Wave 0 /projects parity behaviors covering schema, service, and UI changes that restore logo/avatar display while tracking remaining drift.

**Changes:**
- Enabled list items to surface projectLogoAssetId, memberPreviews, and watcher counts backed by attachments.
- Traced listProjectSummaries attachments, authorization filtering, and redacted placeholder paths for non-public projects.
- Captured ProjectService schema validations, access checks, and ProjectDirectoryPage rendering logic plus remaining card chrome/pagination drift noted in the parity audit.

**Files:**
- packages/contracts/src/project.ts
- packages/db/src/org-project.ts
- packages/domain/src/project-service.ts
- apps/app/src/routes/_app.projects.index.tsx
- docs/provenance/core-parity-audit.md

**Flow:**
Client /projects request -> listProjects service -> listProjectSummaries (with attachments, logos, avatars) -> ProjectDirectoryPage renders cards via /api/assets and member previews, falling back to initials, while non-public entries emit redacted placeholders.

**Timestamp:** 2026-04-05

**Author:** Parity audit team

## Narrative
### Structure
The parity work touches contracts (schema validation and list item discriminated unions), db helpers (attachment-driven summaries plus organization/member queries), domain services (access control, visibility/redaction, converters), and the Remix route rendering ProjectDirectoryPage with search/filters, logos, badges, and member avatar strips.

### Dependencies
listProjects relies on listProjectSummaries authorization filtering, attachment lookups for project/user_avatar assets, and ProjectService converters that enforce schema constraints before the Remix loader feeds ProjectDirectoryPage.

### Highlights
Public /projects cards now include logos served from /api/assets, member previews, watcher counts, origin badges, and search/label filtering; the parity audit marks legacy card chrome and pagination as remaining drift items for subsequent waves.

## Facts
- **list_project_summaries_attachments**: listProjectSummaries now reads the latest attachment rows for containerType project and user_avatar so visible cards can display project logos and organization member avatars. [project]
- **project_directory_page_assets**: ProjectDirectoryPage renders logos and avatars from /api/assets/{assetId} with an initials fallback while member preview strips use avatar attachments and watcher counts for public projects. [project]
- **project_name_validation**: Project name validation trims 1–255 characters matching /^[a-zA-Z0-9-_.가-힣]+$/ and rejects reserved names ., .., .git in packages/contracts/src/project.ts. [project]
