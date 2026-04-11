# 04) 아키텍처 가드레일

## G1) Canonical Baseline

- current canonical implementation baseline은 `repo root`다.
- legacy truth는 `yona-original/`에 있다.
- `reference/mixed-code/**`는 reference-only다.

## G2) Ownership Boundary

- `frontend/`는 UI composition, route tree, client contract consumption만 소유한다.
- `proto/`는 canonical contract source를 소유한다.
- `crates/server/`는 runtime bootstrap, HTTP/RPC, asset delivery, session/auth bootstrap을 소유한다.
- `crates/domain/`은 ACL, invariant, domain behavior를 소유한다.
- `crates/persistence/`는 DB access와 repositories를 소유한다.
- `crates/migration/`은 schema와 migration을 소유한다.

## G3) Historical Discipline

- `TanStack Start`, in-process `tRPC`, `createServerFn`, Go backend, `connect-go`, `chi`, `uptrace/bun`, `Better Auth`를 current baseline처럼 되살리지 않는다.
- historical 문서는 status banner 없이 current guidance처럼 남겨 두지 않는다.

## G4) Parity Discipline

- legacy UX와 기능 의미를 임의로 바꾸지 않는다.
- 기능 누락은 `deferred`, `gap`, `deviation` 중 하나로 반드시 기록한다.
- root canonical, provenance, plan docs 사이에 누락 항목 대응이 맞아야 한다.

