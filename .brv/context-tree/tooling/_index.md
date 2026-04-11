---
children_hash: da349f40e64f5b02af0c24be7850ef778a0f9f1b0ede5cbfb38bddf7b8b187f4
compression_ratio: 0.3363733905579399
condensation_order: 2
covers: [context.md, inventory/_index.md, protobuf_codegen/_index.md, protobuf_codegen_split/_index.md]
covers_token_total: 1864
summary_level: d2
token_count: 627
type: summary
---
## Domain: tooling  
Capture of tooling knowledge aligned with the API transport spike, owned by the core tooling squad. Use when working on the inventory generator (surface/query-key extraction, auth/error heuristics, semantic diff gate) or its artifacts under `tools/api-transport-spike/inventory` and `packages/contracts`.

### Domain Structure (d2 overview)
- **inventory/**
  - `context.md` establishes the generator flow: scan `apps/app/src/lib` for server functions/TRPC procedures, normalize query keys, track invalidation metadata, emit `surface.json`, `query-keys.json`, and `packages/contracts/src/legacy-surface.ts` aligned with Go + Connect baselines, and gate regressions with `inventory.spec.ts`.
  - `inventory_generator_freeze.md` details the deterministic pipeline (AST collectors, zod schema validation, `INVENTORY_VERSION`, path helpers), documents the 162-element surface inventory (auth requirements, error mappings, HTTP methods, usage sites) plus query key definitions/invalidation info, and preserves auth overrides and Vitest diff-gate requirements. References release and project directory parity topics for downstream parity context.

- **protobuf_codegen/** & **protobuf_codegen_split/**
  - Both summaries reference `context.md` and `yona_rust_protobuf_codegen_split.md` for the canonical split.
  - Rust flow: `yona-rust/crates/server/build.rs` drives `connectrpc_build::Config`, avoids Buf tooling, and is enforced by `tests/yona-rust-codegen-contract.test.mjs`.
  - Browser flow: Buf pipeline (`yona-rust/buf.gen.yaml`, `@bufbuild/protoc-gen-es`, `@connectrpc/protoc-gen-connect-query`) emits TypeScript artifacts into `frontend/src/gen/yona/pilot/v1`, with `yona-rust/frontend/package.json` scripts/deps and contract tests ensuring TS-only Buf output and checked-in generated files.
  - Documentation in `docs/shared/protobuf-codegen.md` explains the rationale for split workflows.
  - Contract tests (`tests/yona-rust-codegen-contract.test.mjs`) guard both sides: ensuring Rust stays Buf-free and the frontend Buf run produces checked-in artifacts.

### Relationships & Drill-down Paths
- Inventory outputs relate to `release/demo_ready_pr_merge_review` (artifact parity) and `project_directory_parity/projects_parity_baseline` (surface coverage tracking).
- Protobuf split is documented across `context.md`, `yona_rust_protobuf_codegen_split.md`, and reinforced by shared documentation, testing, and Buf configs; see those entries for implementation and governance details.