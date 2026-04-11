---
title: yona-rust Protobuf Codegen Split
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-07T12:33:02.141Z'
updatedAt: '2026-04-07T12:33:02.141Z'
---
## Raw Concept
**Task:**
Document the intentional protobuf codegen split between the Rust server and browser client in yona-rust.

**Changes:**
- Enforced Rust proto generation through connectrpc_build::Config in crates/server/build.rs without invoking buf.
- Centralized buf tooling, scripts, and devDependencies in the frontend package.json while checking in the generated TS output under yona-rust/frontend/src/gen.
- Added targeted contract tests to prove buf.gen.yaml only references protoc-gen-es and protoc-gen-connect-query while the Rust artifacts continue using connectrpc-build.

**Files:**
- tests/yona-rust-codegen-contract.test.mjs
- yona-rust/buf.gen.yaml
- yona-rust/frontend/package.json
- yona-rust/crates/server/build.rs
- docs/shared/protobuf-codegen.md

**Flow:**
Rust server build.rs invokes connectrpc_build::Config::new over the shared proto sources, embedding generated Rust helpers at compile time, while the browser/front-end buf workflow runs buf generate using protoc-gen-es and protoc-gen-connect-query and commits the resulting TypeScript under yona-rust/frontend/src/gen; contract tests guard the split, and docs explain the rationale.

**Timestamp:** 2026-04-07

**Author:** Rust pilot spike team

## Narrative
### Structure
docs/shared/protobuf-codegen.md and the Rust and frontend build files describe the twin workflows: the server path uses anthropics/connect-rust crates inside crates/server/build.rs, and the frontend path owns buf tooling plus checked-in TS outputs, preventing duplicate generator dependencies.

### Dependencies
Rust connects to connectrpc_build along with protoc_bin_vendored via build.rs, while the browser client relies on @bufbuild/buf, @bufbuild/protoc-gen-es, and @connectrpc/protoc-gen-connect-query declared in yona-rust/frontend/package.json; buf.gen.yaml pins the out folder to src/gen, ensuring consistent placement.

### Highlights
Contract tests in tests/yona-rust-codegen-contract.test.mjs assert buf.gen.yaml only lists the JS plugins, ensure Rust build.rs runs connectrpc_build::Config::new without use_buf, and verify generated files exist under yona-rust/frontend/src/gen so the split stays enforced.

## Facts
- **rust_server_codegen**: Rust server proto generation uses connectrpc_build::Config::new() inside crates/server/build.rs and explicitly avoids the buf workflow, keeping Rust artifacts generated at build time. [project]
- **browser_client_codegen**: Browser client codegen runs buf generate with protoc-gen-es and protoc-gen-connect-query, so the TypeScript outputs under yona-rust/frontend/src/gen are checked in alongside the buf toolchain. [project]
- **codegen_contract_tests**: Contract tests in tests/yona-rust-codegen-contract.test.mjs assert buf.gen.yaml only references the JS tooling plugins and guard frontend package.json for buf scripts and devDependencies, ensuring the split stays enforced. [project]
