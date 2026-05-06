# 04) 아키텍처 가드레일

## G1) Canonical Baseline

- current canonical implementation baseline은 `repo root`다.
- legacy truth는 `yona-original/`에 있다.
- `reference/mixed-code/**`는 reference-only다.

## G2) Ownership Boundary

- `frontend/`는 UI composition, route tree, REST API client, TanStack Query server-state boundary를 소유한다.
- `proto/`는 기존 ConnectRPC 구현 snapshot/transition surface일 뿐 새 application contract의 canonical source가 아니다.
- `crates/server/`는 runtime bootstrap, HTTP/REST, asset delivery, session/auth bootstrap을 소유한다.
- `crates/domain/`은 ACL, invariant, domain behavior를 소유한다.
- `crates/persistence/`는 DB access와 repositories를 소유한다.
- `crates/migration/`은 schema와 migration을 소유한다.
- 새 application endpoint는 기본적으로 `/api/v1` REST JSON으로 구현한다.
- `/-_-api/v1/**` legacy external REST compatibility는 legacy external-tool compatibility 근거가 있을 때만 구현한다.
- 기존 RPC surface를 migration 중 명시적으로 보존하는 계획이 없는 한 feature work에서 새 ConnectRPC method를 추가하지 않는다.

## G3) Historical Discipline

- `TanStack Start`, in-process `tRPC`, `createServerFn`, Go backend, `connect-go`, `chi`, `uptrace/bun`, `Better Auth`를 current baseline처럼 되살리지 않는다.
- REST pivot 이후 ConnectRPC/protobuf를 future canonical application API처럼 서술하지 않는다.
- historical 문서는 status banner 없이 current guidance처럼 남겨 두지 않는다.

## G4) Parity Discipline

- legacy UX와 기능 의미를 임의로 바꾸지 않는다.
- 기능 누락은 `deferred`, `gap`, `deviation` 중 하나로 반드시 기록한다.
- `deviation`은 legacy 동작, Rust 동작, 사용자 영향, 허용 사유, provenance 위치를 남긴다. URL deviation은 legacy route, Rust route, redirect/alias 여부까지 기록한다.
- root canonical, provenance, plan docs 사이에 누락 항목 대응이 맞아야 한다.

