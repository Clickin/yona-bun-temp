# Yona

Yona는 legacy Yona의 기능과 UX parity를 목표로 재구성 중인 워크스페이스다.

현재 canonical 구현 경로는 repo root다. 이 workspace가 `frontend/`, `proto/`, `crates/*`를 포함하는 Rust + React 기준선이다.

## Canonical Order

1. [`yona-original/`](/G:/programming/yona/yona-original): 기능/UX parity의 1차 source of truth
2. [repo root](/G:/programming/yona): current canonical implementation baseline
3. `reference/mixed-code/**`: reference-only migration material
4. `reference/spikes/**`: historical spike archive

## Workspace Landmarks

- [`frontend/`](/G:/programming/yona/frontend): canonical React SPA ownership
- [`proto/`](/G:/programming/yona/proto): canonical contract source
- [`crates/server/`](/G:/programming/yona/crates/server): runtime bootstrap, HTTP/RPC, asset delivery, session/auth bootstrap
- [`crates/domain/`](/G:/programming/yona/crates/domain): domain behavior, ACL, invariant
- [`crates/persistence/`](/G:/programming/yona/crates/persistence): DB access and repositories
- [`crates/migration/`](/G:/programming/yona/crates/migration): schema, seed, migration
- [`docs/agents/`](/G:/programming/yona/docs/agents): 실행 mirror 문서
- [`docs/provenance/`](/G:/programming/yona/docs/provenance): legacy source, gap, deviation, deferred scope 근거

## Working Rules

- canonical execution rules는 [`AGENTS.md`](/G:/programming/yona/AGENTS.md)와 [`SPEC.md`](/G:/programming/yona/SPEC.md)에 있다.
- 구현 전에는 `yona-original/`에서 대응 legacy route/test/model을 먼저 식별한다.
- `reference/mixed-code/**`는 reference-only migration material로 읽고, 새 canonical ownership은 repo root에 둔다.
- 일부 기능 누락은 허용되지만 반드시 `deferred`, `gap`, `deviation`으로 기록한다.


