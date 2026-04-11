---
title: R0-1 Rust Foundation Baseline Verification
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-07T12:25:51.486Z'
updatedAt: '2026-04-07T12:25:51.486Z'
---
## Raw Concept
**Task:**
Document the R0-1 Rust foundation baseline verification assets that keep yona-rust self-contained for proto/build inputs, enforce canonical crates, expose a standalone React frontend, and orient Ralph agent tiers.

**Changes:**
- Made the Rust workspace self-sufficient by materializing crates/domain, persistence, vcs, search, and integrations alongside server/migration members.
- Recorded anchor checks in tests/yona-rust-foundation.test.mjs that assert required proto, frontend, docs, and plan files exist before progressing.
- Pinned connectrpc_build in yona-rust/crates/server/build.rs to compile ../../proto/yona/pilot/v1/pilot.proto with an includes root at ../../proto and generated embedded assets keyed by YONA_EMBED_ASSET_ROOT relative paths.
- Bootstrapped the React frontend in yona-rust/frontend with pnpm-managed scripts that cover dev/build/check/test/test:watch, TypeScript type checking, and runtime configuration validation.
- Captured Ralph agent tier guidance for LOW/ STANDARD/ THOROUGH verification and mapped those tiers to the 3-lane R0 packets plus the 5-lane R1+ packets in docs/shared/agent-tiers.md.

**Files:**
- tests/yona-rust-foundation.test.mjs
- yona-rust/Cargo.toml
- yona-rust/crates/server/build.rs
- yona-rust/frontend/package.json
- docs/shared/agent-tiers.md

**Flow:**
Run anchor verification -> enforce local proto compilation and include root -> generate embedded assets -> exercise frontend dev/build/check/test scripts -> align packet proofs with Ralph agent tiers.

**Timestamp:** 2026-04-07

**Author:** Rust foundation engineering

## Narrative
### Structure
The baseline verification starts with the tests suite that confirms all anchor files exist and the plan/spec documents are available, continues with the server build.rs that compiles the pilot proto from the yana-rust/proto tree and copies embed-assets via the render_embedded_assets_module helper, and finishes with the frontend package manifest that exposes runtime configuration scripts and the agent tier doc that spells out verification lanes.

### Dependencies
The server build pipeline relies on protoc_bin_vendored, connectrpc_build::Config, and the YONA_EMBED_ASSET_ROOT/OUT_DIR pairing, while the frontend assets target pnpm 10.32.1, React 19, Vite 8, TypeScript 5.9.3, and Vitest 4.1.0. Ralph lane guidance depends on the tier definitions in docs/shared/agent-tiers.md for packet sign-off.

### Highlights
Baseline verification binds proto ownership, canonical workspace membership, frontend parity scripts, and Ralph tier mappings into a single narrative so future work can grip the R0-1 foundation state quickly.

### Rules
LOW tier exercises narrow lookup/inventory/document extraction/simple validation roles; STANDARD tier handles bounded implementation, regression evidence, and packet-local review; THOROUGH tier covers architecture review, cross-boundary verification, and high-risk refactor sign-off. Ralph lane mapping for R0-1 uses Lane A=STANDARD implementation, B=STANDARD frontend/provenance, C=STANDARD evidence + THOROUGH architect sign-off; for R1+ lanes, A=STANDARD frontend, B=STANDARD server/domain, C=STANDARD persistence/migration, D=STANDARD evidence/regression, E=THOROUGH architect sign-off.

## Facts
- **baseline_anchor_files**: tests/yona-rust-foundation.test.mjs asserts the presence of anchor files required by the baseline, including yona-rust/buf.yaml, yona-rust/buf.gen.yaml, the pilot proto, the frontend package manifest, docs/shared/agent-tiers.md, and the PRD/test-spec planners for foundation, auth, and org/project baselines. [project]
- **server_proto_root**: yona-rust/crates/server/build.rs uses connectrpc_build to compile ../../proto/yona/pilot/v1/pilot.proto and sets ../../proto as the include root, guaranteeing the server build depends on the local proto tree rather than a remote artifact. [project]
- **workspace_members**: The workspace manifest (yona-rust/Cargo.toml) includes canonical member crates: domain, persistence, vcs, search, and integrations alongside server and migration, and each member exposes Cargo.toml and src/lib.rs files. [project]
- **frontend_stack**: yona-rust/frontend/package.json pins pnpm@10.32.1, React 19, Vite 8, TypeScript 5.9.3, and Vitest 4.1.0 scripts for dev/build/check/test/test:watch workflows, supporting the standalone runtime config surface for frontend parity tests. [project]
- **agent_tiers**: docs/shared/agent-tiers.md defines LOW, STANDARD, and THOROUGH tiers along with Ralph lane mappings for 3-lane R0 packets (A=STANDARD implementation, B=STANDARD frontend/provenance, C=STANDARD evidence + THOROUGH architect) and 5-lane R1+ packets (A=STANDARD frontend, B=STANDARD server/domain, C=STANDARD persistence/migration, D=STANDARD evidence/regression, E=THOROUGH architect sign-off). [convention]
