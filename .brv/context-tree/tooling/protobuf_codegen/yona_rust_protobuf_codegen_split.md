---
title: Yona Rust Protobuf Codegen Split
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-07T12:33:36.102Z'
updatedAt: '2026-04-07T12:33:36.102Z'
---
## Raw Concept
**Task:**
Document the canonical protobuf codegen workflows for yona-rust to keep Rust and browser responsibilities unambiguous.

**Changes:**
- Added tests to enforce that Rust build.rs uses connectrpc_build and Buf is limited to frontend TS generation.
- Pinned Buf tooling and scripts in the frontend package so Buf:generate produces checked-in artifacts.
- Authoritative docs describe the split and the reasoning behind keeping Rust codegen build-time and frontend artifacts checked in.

**Files:**
- tests/yona-rust-codegen-contract.test.mjs
- yona-rust/buf.gen.yaml
- yona-rust/frontend/package.json
- yona-rust/crates/server/build.rs
- docs/shared/protobuf-codegen.md

**Flow:**
Browser frontend: buf gen -> protoc-gen-es/connect-query -> frontend/src/gen (checked in) -> tests verify files exist; Rust server: crates/server/build.rs -> connectrpc_build::Config -> compile proto stubs during cargo build without buf.

## Narrative
### Structure
The documentation defines two parallel flows: the Rust server uses connectrpc_build in crates/server/build.rs to generate pilot proto files at build time and then compiles embedded assets, while the browser client relies on buf generate (configured in yana-rust/buf.gen.yaml) to emit TypeScript clients under frontend/src/gen that are checked into git.

### Dependencies
Rust build avoids buf entirely in favor of the anthropics/connect-rust crates (connectrpc + connectrpc-build). The frontend depends on @bufbuild/buf, @bufbuild/protoc-gen-es, and @connectrpc/protoc-gen-connect-query as devDependencies invoked by the buf:generate script.

### Highlights
Contract tests (tests/yona-rust-codegen-contract.test.mjs) guard the split by ensuring buf.gen.yaml only lists the TS plugins, build.rs configures connectrpc_build without any use_buf calls, and the generated pilot client files live under frontend/src/gen/yona/pilot/v1. docs/shared/protobuf-codegen.md explains the rationale and why Option B was chosen for Rust while the frontend keeps Buf-generated outputs.

## Facts
- **rust_codegen**: Rust server uses connectrpc_build::Config::new() in crates/server/build.rs and explicitly avoids Buf tooling to generate pilot proto stubs. [project]
- **frontend_codegen**: Browser frontend owns Buf-based generation via yana-rust/buf.gen.yaml, which runs protoc-gen-es and protoc-gen-connect-query, emitting TypeScript to frontend/src/gen. [project]
- **frontend_tooling**: Frontend package.json defines buf:generate plus devDependencies on @bufbuild/buf, @bufbuild/protoc-gen-es, and @connectrpc/protoc-gen-connect-query. [project]
- **codegen_contract_tests**: tests/yona-rust-codegen-contract.test.mjs asserts the Buf config includes the two TS generators, build.rs references connectrpc_build without use_buf, and the generated files exist under frontend/src/gen/yona/pilot/v1. [project]
- **doc_rationale**: docs/shared/protobuf-codegen.md describes why the repo keeps Rust codegen build-time-only while checking in the Buf-generated browser client artifacts. [project]
