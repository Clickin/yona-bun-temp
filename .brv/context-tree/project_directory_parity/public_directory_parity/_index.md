---
children_hash: 13ca25e9cda3727f1dacaa2dd73f4f7b0c0cc056430b8759dbc6a4e42a041474
compression_ratio: 0.29324699352451433
condensation_order: 1
covers: [public_directory_parity_snapshot_2026_04_05.md]
covers_token_total: 1081
summary_level: d1
token_count: 317
type: summary
---
## Public Directory Parity Snapshot (2026‑04‑05)

- **Objective & scope**: Wave 0 snapshot documents restoring legacy parity for `/projects` and `/orgs` directory views, validating UI rendering, metadata, pagination, placeholders, and provenance requirements (see `public_directory_parity_snapshot_2026_04_05.md`).
- **Architecture & flow**: Loaders in `apps/app/src/routes/_app.projects.index.tsx` and `_app.orgs.index.tsx` validate `filter`, `labelIds`, and `pageNum` via Zod before invoking `listProjects/listOrganizations`; components slice results, render breadcrumbs/search/stats, and build pagination links through `buildProjectsHref`, `buildOrganizationsHref`, `formatLegacyDate`, and `toInitials`, applying `PROJECTS_PER_PAGE=10`, `ORGANIZATIONS_PER_PAGE=30`, and `PAGINATION_WINDOW=5` constants.
- **Testing & assurance**: Specs in `project-directory-route.spec.tsx` and `organization-directory-route.spec.tsx` replay legacy rendering scenarios, pagination link propagation, placeholder visibility, and legacy date formats; the `docs/provenance/core-parity-audit.md` captures the Wave 0 exit criteria (statuses: parity, ux-drift, semantic-drift, missing, deferred-2nd-priority) and records `bun run verify:agents`, `bun run check`, and `bun run test:unit`.