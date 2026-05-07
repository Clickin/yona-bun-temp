# Protobuf Snapshot Contract

> Status: superseded by Phase -1 REST pivot
> This document records the remaining rule for `proto/` after runtime RPC retirement. It is not an application API guide.

## Current Rule

- Canonical application API contract lives at REST JSON `/api/v1` plus the typed frontend REST client and TanStack Query hooks.
- `proto/` is a historical message schema snapshot from the temporary pre-REST implementation.
- `frontend/` must not regenerate or consume protobuf/Connect clients for runtime application flows.
- `crates/server/build.rs` may generate Rust message structs from `proto/yona/pilot/v1/pilot.proto` only for the debug-only compatibility harness and old contract-test bridge.
- That generated message code is not a service stub, not a runtime RPC contract, and not a source for new feature work.

## Future Changes

- Add new application endpoints under `/api/v1`.
- Add request/response typing in the frontend REST client boundary.
- Touch `proto/` only when preserving or documenting the historical snapshot is required.
