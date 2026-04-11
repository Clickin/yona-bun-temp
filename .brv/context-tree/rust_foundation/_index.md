---
children_hash: 4c2d91476a513ea58a0de73721882665fdfd5f3cd26de27e15d721da96496582
compression_ratio: 0.5175590097869891
condensation_order: 2
covers: [baseline/_index.md, context.md, r0_1_baseline_verification/_index.md]
covers_token_total: 1737
summary_level: d2
token_count: 899
type: summary
---
# Rust Foundation Domain Summary

## Purpose & Scope (context.md)
- Domain captures R0-1 Rust foundation anchors that make `yona-rust` the canonical implementation reference for future Ralph packets.
- Includes proto ownership/build configuration, minimal frontend runtime bootstrap, agent tier guidance, and PRD/test-spec artifacts.
- Excludes scope beyond the R0-1 baseline and non-Rust release decisions; owned by the Rust foundation delivery team.

## Baseline Deliverables (baseline/_index.md covering context.md & rust_foundation_baseline.md)
- **Flow**: anchor existence tests → server build proto wiring (`yona-rust/crates/server/build.rs`) → frontend runtime-config normalization (`runtime-config.ts`) → Ralph packet/PRD/test-spec readiness.
- **Key components**:
  - Local proto compilation via `connectrpc_build` targeting `proto/yona/pilot/v1/pilot.proto`, embedding assets and verified by `tests/yona-rust-foundation.test.mjs`.
  - Frontend runtime config normalizes base paths, derives `apiBaseUrl`/`rpcBaseUrl`, and respects `window.__YONA_RUNTIME_CONFIG__` overrides for bootstrapping.
  - Agent tiers doc (`docs/shared/agent-tiers.md`) defines LOW/STANDARD/THOROUGH tiers with Ralph lane mappings and aligns with `.omx/plans/prd-rust-foundation-baseline.md` deliverables.
- **Rules & acceptance**:
  - Anchor tests ensure `buf.yaml`, `pilot.proto`, frontend configs, agent tiers doc, and `.omx` snapshots exist.
  - Non-goals: no feature parity beyond bootstrap/session, no mixed-code cleanup, no full auth/org/project implementation in this packet.
  - Acceptance criteria US-001 through US-003 enforce proto build, frontend runtime surface, and agent tier documentation/verifications.
- **Dependencies & highlights**:
  - Server build relies on `connectrpc_build`, proto root includes, and asset/test data.
  - Frontend stack relies on runtime overrides and runtime-config scripts.
  - Highlights include anchor existence tests and explicit non-goals preventing scope creep.

## Baseline Verification (r0_1_baseline_verification/_index.md covering context.md & r0_1_rust_foundation_baseline_verification.md)
- **Scope**: Verifies proto, frontend, docs, plans, canonical workspace membership, connectrpc build rigour, runtime-config scripts, and Ralph tier mappings.
- **Flow**: anchor verification → proto compilation/embedded assets → frontend tooling → Ralph tier alignment for packet verification.
- **Key artifacts**:
  - `tests/yona-rust-foundation.test.mjs` for anchor file checks.
  - `yona-rust/Cargo.toml` ensuring canonical workspace crates (domain, persistence, vcs, search, integrations, server, migration).
  - `yona-rust/crates/server/build.rs` pinning proto compile with local include root and embedded asset output.
  - `yona-rust/frontend/package.json` locking pnpm 10.32.1, React 19, Vite 8, TypeScript 5.9.3, Vitest 4.1.0, plus runtime config validation scripts.
  - `docs/shared/agent-tiers.md` detailing lane mappings for LOW/STANDARD/THOROUGH across R0/R1 and integrating architect sign-off.
- **Dependencies & highlights**:
  - Server build uses `protoc_bin_vendored`, `connectrpc_build::Config`, and `YONA_EMBED_ASSET_ROOT`.
  - Frontend relies on specific pnpm/React/Vite/TypeScript/Vitest versions.
  - Verification narrative ties proto ownership, canonical crates, frontend parity tooling, and tier/lane definitions into a reference point.
- **Facts & rules**:
  - Maintains exact agent tier rules and lane mappings, anchor file assertions, proto root enforcement, workspace composition, frontend stack versions, and tier definitions for traceability.