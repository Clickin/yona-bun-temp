# Topic: protobuf_codegen_split

## Overview
Captures the locked-in separation between Rust server proto generation via connectrpc_build and the browser client buf-based TypeScript output, along with the reinforcing contract tests and documentation.

## Key Concepts
- Rust connectrpc_build workflow in crates/server/build.rs
- Buf tooling and scripts owned by the frontera frontend
- Checked-in TS artifacts under yona-rust/frontend/src/gen
- End-to-end contract tests protecting the split

## Related Topics
- tooling/inventory - for general tooling inventory and freezes
