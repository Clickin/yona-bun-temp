---
children_hash: b45d45821002cc261d0ea9d989ae567399c6945fbc5181a067bfc01c0dfb9376
compression_ratio: 0.45422535211267606
condensation_order: 1
covers: [context.md, public_projects_list_parity.md]
covers_token_total: 852
summary_level: d1
token_count: 387
type: summary
---
### Domain: public_projects_parity
- **Objective**: Align the `/projects` route with aggregated counts, label filtering, and gate-aware placeholders so the public directory mirrors sanctioned visibility and metadata (see `context.md`).
- **Key Concepts**:
  - **Schemas & Visibility**: `listProjects` returns a discriminated union of `ProjectVisibleListItem` (with memberCount, watcherCount, labels, origin project link, labelIds filter info) and `ProjectRedactedListItem` placeholders for gated results (`public_projects_list_parity.md` raw concept and facts).
  - **Service Flow**: Browser GET `/ _app/projects` → `listProjects` loader → `ProjectService.listProjects` → `packages/db/src/org-project.ts` for aggregated counts → authorization gating → visible/redacted output → `ProjectDirectoryPage` rendering (flow detailed in `public_projects_list_parity.md`).
  - **UI Rendering & Filtering**: `ProjectDirectoryPage` renders site shell, search form, badges, label filter chips, member/watcher stats, origin links, scoped badges, and placeholder permission text for gated entries, with tests validating both cards and placeholders (`public_projects_list_parity.md` narrative/highlights).
- **Dependencies**: Relies on `contracts/src/project.ts` for filter validation, `packages/db/src/org-project.ts` for aggregation, and `packages/domain/src/project-service.ts` for authorization/mapping (`public_projects_list_parity.md` narrative).
- **Related Topic**: `release/demo_ready_pr_merge_review/landing_plan_2026_04_05_demo_ready_pr_merge_review`.