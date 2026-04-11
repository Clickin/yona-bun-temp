---
children_hash: b8349addc0e6e938eadca5f690771a0521bb6913804ab09da2b2d900447b78f3
compression_ratio: 0.5234460196292258
condensation_order: 1
covers: [context.md, yona_rust_protobuf_codegen_split.md]
covers_token_total: 917
summary_level: d1
token_count: 480
type: summary
---
# protobuf_codegen_split (Level d1 Summary)

- **Scope & Purpose**  
  - *context.md* frames the intentional divergence: Rust server generation via `connectrpc_build` vs. frontend TypeScript outputs produced through Buf, reinforced by contract tests and documentation.
  - *yona_rust_protobuf_codegen_split.md* chronicles the design, tooling residency, and verification steps for the split.

- **Key Architectural Decisions**
  - **Rust server path** (see *yona_rust_protobuf_codegen_split.md*): `crates/server/build.rs` calls `connectrpc_build::Config::new()` over shared `.proto` sources, embedding generated Rust helpers at compile time and explicitly avoiding Buf; this keeps server codegen local to the Rust build toolchain.
  - **Browser frontend path** (see both entries): Buf tooling (scripts/devDeps in `yona-rust/frontend/package.json`) drives `buf generate` with `protoc-gen-es` and `protoc-gen-connect-query`, writing TypeScript artifacts into `yona-rust/frontend/src/gen`, which are checked into the repo to stabilize client usage.

- **Supporting Infrastructure and Ownership**
  - Buf config (`yona-rust/buf.gen.yaml`) pins output to `src/gen`, ensuring deterministic placement of generated TS files (*yona_rust_protobuf_codegen_split.md*).
  - Documentation in `docs/shared/protobuf-codegen.md` narrates the twin workflows and explains why generators remain separate (*yona_rust_protobuf_codegen_split.md* and *context.md*).

- **Verification & Guardrails**
  - Contract tests (`tests/yona-rust-codegen-contract.test.mjs`) assert Buf config only targets JS plugins, confirm the Rust build avoids Buf, and ensure the generated TS files exist under `frontend/src/gen`, keeping both sides of the split enforced (*yona_rust_protobuf_codegen_split.md*).

- **Related Topics for Further Detail**
  - `tooling/inventory` (via *context.md*) for broader tooling inventory and freeze policies related to this split.