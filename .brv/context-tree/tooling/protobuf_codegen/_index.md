---
children_hash: fefe5e29a5aeb251603bf1f17a4b431ad637f2715062eb5b3938a341b28b191f
compression_ratio: 0.5410733844468785
condensation_order: 1
covers: [context.md, yona_rust_protobuf_codegen_split.md]
covers_token_total: 913
summary_level: d1
token_count: 494
type: summary
---
# protobuf_codegen Overview
- **Domain split (context.md)**: Yona’s Rust and browser stacks each follow distinct protobuf codegen workflows, documented in `context.md` and the detailed split article `yona_rust_protobuf_codegen_split.md`.

## Rust Server Flow
- **Entry point**: `yona-rust/crates/server/build.rs` invokes `connectrpc_build::Config` to generate pilot proto stubs at Cargo build time.
- **Tooling decision**: Rust codegen deliberately avoids Buf tooling, relying solely on `connectrpc`/`connectrpc-build` dependencies (Documented in `yona_rust_protobuf_codegen_split.md` and supported by the `doc_rationale` fact).
- **Verification**: `tests/yona-rust-codegen-contract.test.mjs` asserts `build.rs` uses `connectrpc_build` without `use_buf`, ensuring Rust stays Buf-free.

## Browser Frontend Flow
- **Buf pipeline**: `yana-rust/buf.gen.yaml` drives Buf generation for frontend clients, running `@bufbuild/protoc-gen-es` and `@connectrpc/protoc-gen-connect-query`.
- **Generated artifacts**: Outputs land in `frontend/src/gen/yona/pilot/v1` and are checked into Git, reflecting the contract tests’ expectations (`frontend_codegen` and `codegen_contract_tests` facts).
- **Package wiring**: `yona-rust/frontend/package.json` defines a `buf:generate` script plus the devDependencies required for the Buf pipeline (`frontend_tooling` fact).

## Contract Enforcement & Documentation
- **Tests**: `tests/yona-rust-codegen-contract.test.mjs` simultaneously ensures the frontend Buf config remains TS-only and that generated files exist, preserving the split.
- **Documentation**: `docs/shared/protobuf-codegen.md` provides rationale for “Option B”, detailing why Rust codegen stays build-time while frontend artifacts stay Buf-generated and checked in.

> **Drill-down**: Refer to `context.md` for the high-level overview and `yona_rust_protobuf_codegen_split.md` for the canonical workflows, dependencies, highlights, and facts that lock in this architectural decision.