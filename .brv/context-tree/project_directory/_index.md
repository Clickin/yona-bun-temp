---
children_hash: 8c745fdc244fa97d8d7862bf27f7dbb95c300a7ea2a978fe54623e03983cb33b
compression_ratio: 0.6615831517792302
condensation_order: 2
covers: [context.md, public_projects/_index.md, public_projects_parity/_index.md]
covers_token_total: 1377
summary_level: d2
token_count: 911
type: summary
---
# Structural Summary (Level d2)

## Domain: project_directory
- **Purpose & Ownership (`context.md`)**: Houses all knowledge for ensuring `/projects` directory parity across backend, domain, and UI layers, maintained by the Project Directory Team. Use this domain for any `/projects` directory investigations or changes.
- **Scope Highlights**:
  - **Backend/Domain**: Schema definitions, normalization helpers, DB aggregation/links, CRUD helpers for projects/organizations, and domain services that authorize, build visible/redacted responses, and expose listing/detail/member endpoints.
  - **UI**: Routing, loaders, and tests covering rendering/verification of visible and redacted project cards.
- **Usage Guidance**: Reference for any feature touching `/projects`, especially when coordinating schema, domain, and UI parity.

## Topic: public_projects (`public_projects/_index.md`)
- **Summary Focus (`context.md`)**: Explains how the `/projects` loader orchestrates contracts, DB aggregation, domain services, and UI rendering to deliver parity between visible and redacted cards. Key exploration areas are union schema, normalization/enrichment, authorization-driven redaction, and ProjectDirectoryPage render/tests.
- **Parity Experience Detail (`public_projects_directory_parity.md`)**:
  - **Flow**: Loader validates filters/labelIds → `ProjectService.listProjects` → DB aggregation/normalization (`packages/db/src/org-project.ts`) → discriminated contract shapes (`packages/contracts/src/project.ts`) → UI displays cards + spec tests.
  - **Patterns & Rules**: Project names must match `^[a-zA-Z0-9-_.가-힣]+$`; reserved names `.`, `..`, `.git` are forbidden.
  - **Highlights**: Visible cards surface owner/date, label/scope badges, member/watcher counts, origin/project links; redacted entries show scope label and placeholders. Loader trims search input and enforces label filtering.
  - **Dependencies**: Authorization helpers, domain normalization, project/membership DB interfaces, React loader hooks, I18nProvider, mocked Link in specs.
  - **Facts**: Member/watcher counts, label badges, and origin links appear on visible cards; unauthorized projects render redacted placeholders; naming conventions enforced by regex & reserved name checks; UI ties badges to filters and displays scope/label/member info.

## Topic: public_projects_parity (`public_projects_parity/_index.md`)
- **Objective (`context.md`)**: Align `/projects` route with aggregated counts, label filtering, and gate-aware placeholders so the public directory reflects sanctioned visibility and metadata.
- **Key Concepts (`public_projects_list_parity.md`)**:
  - **Schemas & Visibility**: `listProjects` returns a discriminated union of `ProjectVisibleListItem` (memberCount, watcherCount, labels, origin links, labelIds filter context) and `ProjectRedactedListItem` placeholders for gated results.
  - **Service Flow**: Browser hits `_app/projects` → loader → `ProjectService.listProjects` → aggregation via `packages/db/src/org-project.ts` → authorization gating → visible/redacted output → `ProjectDirectoryPage`.
  - **UI Rendering**: Page renders site shell, search form, badges, filter chips, stats, origin/scope badges, and placeholder permission text; tests validate both cards/placeholders.
- **Dependencies**: `contracts/src/project.ts` (filter validation), `packages/db/src/org-project.ts` (aggregation), `packages/domain/src/project-service.ts` (authorization/mapping).
- **Related Topic**: `release/demo_ready_pr_merge_review/landing_plan_2026_04_05_demo_ready_pr_merge_review` connects deployment readiness to the public directory parity efforts.