---
children_hash: ff072e5167c8c45bf8076e5b1c1940090ff97d1a5fad39cc7740f92841479464
compression_ratio: 0.5270413573700954
condensation_order: 1
covers: [context.md, inventory_generator_freeze.md]
covers_token_total: 943
summary_level: d1
token_count: 497
type: summary
---
# Inventory Domain Overview

- **inventory/context.md** defines the inventory generator’s remit: walking `apps/app/src/lib` to extract API surfaces, normalize query keys, track invalidation dependencies, and produce artifacts aligned with the Go + Connect baseline while guarding drift via the Vitest semantic diff gate (`inventory.spec.ts`). Key concepts include surface inventory extraction, query key normalization/invalidation tracking, legacy surface module generation, and the Vitest semantic diff gate.

- **inventory/inventory_generator_freeze.md** documents the deterministic pipeline:
  - **Task and Flow:** Scan `apps/app/src/lib` for server functions and TRPC procedures → normalize and reconcile delegations → emit surface/query-key inventories and legacy surface module → run `inventory.spec.ts` to block regressions.
  - **Artifacts & Files:** `surface.json`, `query-keys.json`, and `packages/contracts/src/legacy-surface.ts` mirror extracted metadata from `tools/api-transport-spike/inventory/*`.
  - **Structure & Dependencies:** Generator exposes constants (e.g., `INVENTORY_VERSION = 1`), path helpers, AST collectors, zod schema references, and Vitest-based diff validation.
  - **Highlights & Rules:** Surface inventory records 162 entries encompassing auth requirements, error mappings, HTTP methods, input/output schemas, and usage sites; query keys detail definitions, invalidations, and usage (e.g., `app-shell/session`, `repo-browser repo-id`). Auth overrides (e.g., `changeCurrentUserPassword` vs. `readPublicUserProfile`) and semantic diff gate requirements are explicitly preserved.
  - **Facts:** Artifacts emitted for Go + Connect baseline, Vitest diff gate enforces artifact parity, and auth requirement overrides are documented.

- **Relationships:** See `release/demo_ready_pr_merge_review` for artifact parity plans and `project_directory_parity/projects_parity_baseline` for surface coverage tracking, providing downstream context for inventory outputs.