---
title: Inventory Generator Freeze
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-06T11:45:37.304Z'
updatedAt: '2026-04-06T11:45:37.304Z'
---
## Raw Concept
**Task:**
Document the deterministic inventory generator and its semantic diff gate for Go + Connect.

**Changes:**
- Added deterministic extraction of createServerFn wrappers, TRPC procedures, query keys, and invalidation dependencies.
- Persisted artifacts to inventory JSON files and the legacy surface module under packages/contracts.
- Built a Vitest semantic diff gate to prevent unchecked drift between generated artifacts and source code.

**Files:**
- tools/api-transport-spike/inventory/inventory-generator.mjs
- tools/api-transport-spike/inventory/surface.json
- tools/api-transport-spike/inventory/query-keys.json
- tools/api-transport-spike/inventory/inventory.spec.ts
- packages/contracts/src/legacy-surface.ts

**Flow:**
Scan apps/app/src/lib for server functions and TRPC files -> normalize items and reconcile delegations -> generate surface and query-key inventories -> build legacy surface module and write JSON assets -> run Vitest semantic diff gate (inventory.spec.ts).

**Timestamp:** 2026-04-06

**Author:** API transport spike tooling

## Narrative
### Structure
The generator exposes constants (INVENTORY_VERSION = 1, explicit paths, auth overrides) and helpers for file walking, AST collection, and query key normalization, mixing serverFn collectors with TRPC and query-key collectors to synthesize complete inventories.

### Dependencies
Relies on AST inspection of .ts/.tsx sources under apps/app/src, the zod schema declarations referenced by handler input/output shapes, and Vitest inventory.spec.ts to guard semantic diff regressions.

### Highlights
Surface inventory captures 162 entries (authRequirement, errorMapping, httpMethod, input/output schemas, usage sites) while query key inventory records definitions, invalidations, and usage (e.g., app-shell/session, repo-browser repo-id). Legacy surface module mirrors JSON assets and is exported for downstream contracts.

### Rules
Scripts that update these artifacts must pass the inventory.spec.ts semantic diff gate to be considered valid.

### Examples
An example surface entry such as assignIssue pairs serverFn and TRPC representations, attaches authRequirement, errorMapping, httpMethod, zod input/output schemas, and usageSites. Query-key entries like repo-browser/branches normalize $expr segments and track invalidateQueries/removeQueries/setQueryData callers.

## Facts
- **inventory_artifacts**: Inventory generator emits surface.json, query-keys.json, and packages/contracts/src/legacy-surface.ts artifacts for the Go + Connect baseline. [project]
- **inventory_validation**: Vitest inventory.spec.ts enforces a semantic diff gate by checking surface coverage, query key invalidation, and artifact sync after regeneration. [project]
- **auth_requirement_overrides**: Auth requirement overrides define handler-level requirements such as changeCurrentUserPassword requiring authenticated-session + csrf while readPublicUserProfile allows anonymous access. [project]
