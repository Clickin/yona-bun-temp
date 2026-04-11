---
children_hash: c8c1af893a515a3930acbcd8cc933844e0215b83d2e9ee0937f6c82fd330f0b9
compression_ratio: 0.5893254262416605
condensation_order: 1
covers: [context.md, rust_foundation_baseline.md]
covers_token_total: 1349
summary_level: d1
token_count: 795
type: summary
---
# Rust Foundation Baseline (context.md & rust_foundation_baseline.md)

## Overview
- Anchors R0-1 delivery by enforcing proto ownership, build/config normalization, runtime bootstrapping, and Ralph packet readiness; see `context.md` for baseline scope and `rust_foundation_baseline.md` for the detailed task definition, changes, and files.
- Flow: anchor existence tests → server build proto wiring (`yona-rust/crates/server/build.rs`) → frontend `runtime-config.ts` normalization → Ralph tier documentation/PRD/test spec alignment.

## Key Components & Relationships
- **Proto ownership & server build** (`rust_foundation_baseline.md`): `yona-rust/crates/server/build.rs` uses `connectrpc_build` pointing at `yona-rust/proto/yona/pilot/v1/pilot.proto`, with embedded asset copying from `../../proto` to keep the pilot server self-contained; verified by `tests/yona-rust-foundation.test.mjs`.
- **Frontend runtime config**: `yona-rust/frontend/src/runtime-config.ts` normalizes empty `basePath` to `/`, derives `apiBaseUrl`/`rpcBaseUrl` from that normalized path, and honors `window.__YONA_RUNTIME_CONFIG__` overrides to allow runtime-specific bootstrapping.
- **Agent tiers & Ralph guidance**: `docs/shared/agent-tiers.md` defines LOW, STANDARD, THOROUGH tiers plus mappings to Ralph lanes for implementation, frontend, persistence, evidence, and architect sign-off; tied to `.omx/plans/prd-rust-foundation-baseline.md` for PRD/test-spec deliverables aligning with Ralph packet readiness.

## Rules & Non-goals
- Anchor tests ensure presence of `yona-rust/buf.yaml`, `proto/pilot.proto`, frontend configs, agent tiers doc, and `.omx` PRD/test-spec snapshots.
- Non-goals (preserved verbatim): no feature parity beyond bootstrap/session foundations, no root mixed-code cleanup, no full auth/org/project implementation in this packet.
- Acceptance criteria:
  - US-001: local pilot proto exists and server build reads from it; `cargo test -p yona-rust-pilot-server` from `yona-rust/`.
  - US-002: frontend package files exist, runtime config normalization tested, main entry exposes stable bootstrap surface.
  - US-003: agent tiers doc defines tiers and lane mappings; `.omx/context/rust-foundation-baseline-*.md` snapshots present; first three packet PRDs/test specs have clear in/out/verification rules.

## Highlights & Dependencies
- Dependencies: `connectrpc_build` needs `../../proto` plus `YONA_EMBED_ASSET_ROOT/testdata` for assets, runtime config depends on `window.__YONA_RUNTIME_CONFIG__`, Ralph packets depend on `docs/shared/agent-tiers.md` and `.omx/plans/prd-rust-foundation-baseline.md`.
- Highlights captured in `rust_foundation_baseline.md`: anchor existence tests, PRD US-001 through US-003 enforcement, and explicit non-goals to prevent scope creep.

## Facts for Drill-down
- Proto ownership ensures `yona-rust/proto/yona/pilot/v1/pilot.proto` is compiled locally and included in server build (see `rust_foundation_baseline.md` facts).
- Runtime config logic joins normalized base path with `api`/`rpc` endpoints and respects window overrides (facts section).
- Agent tiers doc maps implementing teams/lane responsibilities for STANDARD and THOROUGH packets.