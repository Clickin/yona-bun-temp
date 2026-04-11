---
children_hash: c800ed96db2d17be50d3c71f532d8463904cc353e012a78f907cf0f8b235fe6d
compression_ratio: 0.6807228915662651
condensation_order: 1
covers: [context.md, projects_parity_baseline.md]
covers_token_total: 830
summary_level: d1
token_count: 565
type: summary
---
### projects_parity_baseline (domain-level structural summary)

- **Scope & Purpose**: Captures the parity surface for the `/projects` experience—from schema through UI and audit—highlighting what remains to align with contracts and audit expectations (`projects_parity_baseline.md`).

- **Core Flow & Architecture**:
  - **Contracts → DB → Service → UI → Audit** (`projects_parity_baseline.md`): Contract schemas normalize project/member data, feed DB helpers and domain services (list/detail/settings/members), power the `/projects` loader plus card rendering, and finally feed the Wave 0 parity audit matrix and its verification commands.
  - **Last-pushed propagation** ensures `lastPushedAt` moves from contracts through DB and domain mapping into the UI cards to show code-update dates on public entries (`projects_parity_baseline.md`).

- **Key Relationships**:
  - **Contracts**: Provide normalization, `PROJECT_NAME_PATTERN`, authorization inputs, and search schema expectations for `listProjects` (`projects_parity_baseline.md`).
  - **DB helpers (`db/src/org-project.ts`)**: Manage URL construction, membership guards, CRUD flows, and uniqueness checks for project records (`projects_parity_baseline.md`).
  - **UI Cards**: Depend on `renderScopeLabel`, `formatDate`, and `projectScope` metadata to render badges, locks, and code-update dates; private cards keep lock affordances while public show `lastPushedAt` (`projects_parity_baseline.md`).
  - **Audit & Verification**: Wave 0 audit statuses (`parity`, `ux-drift`, `semantic-drift`, `missing`, `deferred-2nd-priority`) are recorded and validated via `bun run verify:agents`, `bun run check`, and `bun run test:unit` using `docs/provenance/core-parity-audit.md` evidence (`projects_parity_baseline.md`).

- **Highlights & Drift**:
  - Public cards now surface `lastPushedAt` as a code-update date; remaining UI drift is limited to logos/avatars and legacy card chrome (`projects_parity_baseline.md`).
  - Audit matrix documents semantic/UX gaps and deferred tooling needs (`projects_parity_baseline.md`).

- **Referenced Files**:
  - Application route: `apps/app/src/routes/_app.projects.index.tsx`
  - Audit documentation: `docs/provenance/core-parity-audit.md` (`projects_parity_baseline.md`).