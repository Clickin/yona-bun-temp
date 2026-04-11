---
title: Rust Foundation Baseline
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-07T12:18:39.798Z'
updatedAt: '2026-04-07T12:18:39.798Z'
---
## Raw Concept
**Task:**
Document the R0-1 Rust foundation baseline that anchors proto ownership, build tooling, frontend bootstraps, runtime config tests, and Ralph packet readiness documentation.

**Changes:**
- Verified anchor files exist via tests/yona-rust-foundation.test.mjs to protect foundational contracts and docs.
- Repointed yona-rust/crates/server/build.rs to compile pilot proto from the local yona-rust proto root and include assets for embedded resources.
- Added runtime config helpers that normalize base paths, derive API/RPC URLs, and respect window overrides in yona-rust/frontend.
- Captured Ralph agent tier guidance and PRD/test-spec acceptance criteria to keep future packets aligned with packet-local execution rules.

**Files:**
- tests/yona-rust-foundation.test.mjs
- yona-rust/crates/server/build.rs
- yona-rust/frontend/src/runtime-config.ts
- docs/shared/agent-tiers.md
- .omx/plans/prd-rust-foundation-baseline.md

**Flow:**
Anchor verification tests -> Server build proto configuration -> Runtime config normalization -> Ralph-tier documentation and PRD/test-spec deliverables

**Timestamp:** 2026-04-07

**Author:** Rust foundation delivery team

## Narrative
### Structure
The baseline starts with tests that assert anchors such as proto files, frontend package descriptors, agent tiers, and PRD/test-spec artifacts exist. Server build.rs uses connectrpc_build to compile pilot.proto from the yona-rust/proto tree and then renders embedded assets for runtime bundling. The frontend runtime config module normalizes requested base paths, derives apiBaseUrl and rpcBaseUrl, and respects window overrides so bridges can bootstrap against whichever base path the runtime provides. Agent tiers documentation defines LOW, STANDARD, and THOROUGH execution tiers along with Ralph lane mappings to guide subsequent packet runs.

### Dependencies
connectrpc_build relies on the ../../proto path and YONA_EMBED_ASSET_ROOT/testdata for asset copying, the runtime config helpers depend on global window.__YONA_RUNTIME_CONFIG__ for runtime overrides, and Ralph packets depend on docs/shared/agent-tiers.md plus the PRD/test-spec requirements listed in .omx/plans for compliance.

### Highlights
Anchor existence test targets files such as yona-rust/buf.yaml, proto/pilot.proto, frontend/package.json, agent tiers doc, and the PRD/test-spec set to prevent drift. PRD US-001 through US-003 enforce local proto ownership, frontend bootstrap readiness, and Ralph loop packet readiness with clear acceptance criteria. Non-goals emphasize no feature parity beyond bootstrap/session foundations, avoiding root mixed-code cleanup, and not shipping full auth/org/project implementations in this packet.

### Rules
Non-goals: no feature parity beyond bootstrap/session foundations; Non-goals: no root mixed-code cleanup; Non-goals: no full auth/org/project implementation in this packet; US-001 Acceptance: yona-rust/proto/yona/pilot/v1/pilot.proto exists; build.rs reads from ../../proto; cargo test -p yona-rust-pilot-server passes from yona-rust/; US-002 Acceptance: yona-rust/frontend package.json, tsconfig.json, vite.config.ts, index.html exist; runtime config normalization is tested; main entry exposes stable bootstrap surface; US-003 Acceptance: docs/shared/agent-tiers.md defines tiers and lane mappings; .omx/context/rust-foundation-baseline-*.md snapshot exists; first three packet PRDs/test specs present clear in/out/verification rules

### Examples
tests/yona-rust-foundation.test.mjs iterates requiredPaths and asserts existsSync(fromRoot(file)) for each anchor, then matches build.rs contents to ensure connectrpc_build.files and includes point to the yona-rust proto root.

## Facts
- **proto_ownership**: R0-1 foundation baseline requires local proto ownership at yona-rust/proto/yona/pilot/v1/pilot.proto to stop depending on the workspace proto root. [project]
- **server_build_proto**: yona-rust/crates/server/build.rs compiles the pilot proto with connectrpc_build Config using files("../../proto/yona/pilot/v1/pilot.proto") and includes("../../proto"), ensuring the server build reads from the local proto tree. [project]
- **runtime_config**: Runtime config helpers normalize basePath to "/" when empty and derive apiBaseUrl and rpcBaseUrl by joining leaf names to the normalized base path, falling back to window.__YONA_RUNTIME_CONFIG__ overrides. [project]
- **agent_tiers**: docs/shared/agent-tiers.md defines LOW, STANDARD, and THOROUGH tiers plus Ralph lane mappings that assign STANDARD implementation, frontend, persistence, evidence, and THOROUGH architect sign-off roles. [project]
