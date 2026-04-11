---
children_hash: 9b1bb63a99fec1d2d96e76de45aff662b9a1a630b5faa891b48a09db6042209f
compression_ratio: 0.20614359733530718
condensation_order: 1
covers: [context.md, legacy_directory_route_parity.md, legacy_public_directory_routes.md, legacy_public_directory_routes_specs.md]
covers_token_total: 2702
summary_level: d1
token_count: 557
type: summary
---
# public_directory_routes Summary (Level d1)

- **Context (context.md)**  
  - Describes how `/projects` and `/orgs` now mirror the legacy directory structure, pagination, metadata, and styling, with audits/docs/tests locking the parity contract. Key concepts include shared date helpers, pagination rules, parity tests, and provenance audit traceability.

- **Legacy Directory Route Parity (legacy_directory_route_parity.md)**  
  - Documents the route-level implementation: `/projects` and `/orgs` loaders render legacy lists (`ul.all-projects` → `li.project` with `info-wrap`, avatars, stats, placeholders) driven by loader data, shared schemas/helpers, and responsive `app.css`.  
  - Highlights route-local pagination (10 rows per page with sliding window for projects; 30 for orgs), metadata badges, placeholder rows for private projects, and verification via `project-directory-route.spec.tsx` plus `docs/provenance/core-parity-audit.md`.

- **Legacy Public Directory Routes (legacy_public_directory_routes.md)**  
  - Captures the broader parity implementation: RESTORED DOM structure, shared helpers (search schema, pagination builders, formatLegacyDate, toInitials), test fixtures (`project-directory-route.spec.tsx`, `organization-directory-route.spec.tsx`), and link to the provenance audit.  
  - Flow: visitor hits route → loader with filters/pageNum → legacy chrome rendering → metadata/stats/pagination with audit ties.  
  - Facts reinforce constants: PROJECTS_PER_PAGE=10, ORGANIZATIONS_PER_PAGE=30, PAGINATION_WINDOW=5, and formatLegacyDate behavior.

- **Legacy Public Directory Routes Specs (legacy_public_directory_routes_specs.md)**  
  - Reinforces the same parity story: route-local legacy chrome, fixed page sizes, rolling window pagination, shared helper utilities, legacy CSS tokens, and audit vocabulary alignment.  
  - Emphasizes structure (breadcrumb tabs, legacy search form, `ul.all-projects`, placeholders for private projects only) and dependencies (shared helpers, models, zod schemas, `app.css`).  
  - Highlights include precise pagination links, metadata badges, and placeholders, with facts reiterating pagination counts, placeholder policy, legacy date formatting, and loader validation.