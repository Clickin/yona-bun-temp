# Yona

Yona는 legacy Yona의 기능과 UX parity를 목표로 재구성 중인 워크스페이스다.

현재 canonical 구현 경로는 [`yona-rust/`](/G:/programming/yona/yona-rust)다. 이 workspace가 `frontend/`, `proto/`, `crates/*`를 포함하는 Rust + React 기준선이다.

## Canonical Order

1. [`yona-original/`](/G:/programming/yona/yona-original): 기능/UX parity의 1차 source of truth
2. [`yona-rust/`](/G:/programming/yona/yona-rust): current canonical implementation baseline
3. root mixed code (`frontend/`, `packages/*`, `cmd/`, `internal/`, `apps/*`, `proto/`): reference-only migration material

## Workspace Landmarks

- [`yona-rust/frontend/`](/G:/programming/yona/yona-rust/frontend): canonical React SPA ownership
- [`yona-rust/proto/`](/G:/programming/yona/yona-rust/proto): canonical contract source
- [`yona-rust/crates/server/`](/G:/programming/yona/yona-rust/crates/server): runtime bootstrap, HTTP/RPC, asset delivery, session/auth bootstrap
- [`yona-rust/crates/domain/`](/G:/programming/yona/yona-rust/crates/domain): domain behavior, ACL, invariant
- [`yona-rust/crates/persistence/`](/G:/programming/yona/yona-rust/crates/persistence): DB access and repositories
- [`yona-rust/crates/migration/`](/G:/programming/yona/yona-rust/crates/migration): schema, seed, migration
- [`docs/agents/`](/G:/programming/yona/docs/agents): 실행 mirror 문서
- [`docs/provenance/`](/G:/programming/yona/docs/provenance): legacy source, gap, deviation, deferred scope 근거

## Working Rules

- canonical execution rules는 [`AGENTS.md`](/G:/programming/yona/AGENTS.md)와 [`SPEC.md`](/G:/programming/yona/SPEC.md)에 있다.
- 구현 전에는 `yona-original/`에서 대응 legacy route/test/model을 먼저 식별한다.
- root mixed code는 reference-only migration material로 읽고, 새 canonical ownership은 `yona-rust/`에 둔다.
- 일부 기능 누락은 허용되지만 반드시 `deferred`, `gap`, `deviation`으로 기록한다.
