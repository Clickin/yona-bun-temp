# Go Backend Migration Plan

> Status: `superseded`
> This migration plan captures the pre-Rust-pivot Go backend strategy. Keep it as historical evidence only. The current canonical implementation baseline is `yona-rust/`.

Date: 2026-04-06

## Goal

- 이 문서는 Go backend 재구축을 canonical path로 보던 시점의 계획이다.
- 현재 canonical 구현은 `yona-rust/`에서 진행한다.
- 아래 내용은 root mixed-code와 Go pivot 의사결정의 historical reference로만 사용한다.

## Fixed Direction

- frontend baseline: `React + TanStack Router + TanStack Query + Vite`
- frontend tooling: `Node.js + pnpm`
- backend baseline: `Go`
- internal business API: `chi + connect-go + Protobuf + connect-query`
- fallback transport: `chi + OpenAPI + Orval`
- DB baseline: `database/sql` + `uptrace/bun`
- VCS baseline: `git` / `svn` system executable
- auth/session: Yona-owned Go implementation
- runtime basepath: `YONA_BASE_PATH`

## Contract Migration Position

현재 TS backend는 `frontend/src/lib/*-trpc.ts`와 `createServerFn` 중심으로 frontend call site가 이미 형성되어 있다.

따라서 migration 목표는 “frontend call site와 query key를 가능한 한 유지하면서 backend contract source of truth를 Protobuf로 옮기는 것”이다.

현재 결정:

- internal business API contract source of truth는 `proto/`
- Go transport는 `connect-go`
- TS client는 generated `connect-web` + `connect-query`
- `OpenAPI + Orval`은 fallback
- current TS `tRPC` surface와 `createServerFn` surface는 migration input

## Migration Slices

### Slice 0: Contract Inventory Freeze

목표:

- current TS `tRPC` surface와 `createServerFn` surface를 inventory로 고정한다.

대상:

- `frontend/src/lib/auth-trpc.ts`
- `frontend/src/lib/me-trpc.ts`
- `frontend/src/lib/project-trpc.ts`
- `frontend/src/lib/organization-trpc.ts`
- `frontend/src/lib/issue-trpc.ts`
- `frontend/src/lib/pull-request-trpc.ts`
- `frontend/src/lib/repo-trpc.ts`
- `frontend/src/lib/search-trpc.ts`
- `frontend/src/lib/posting-trpc.ts`
- `frontend/src/lib/enrollment-trpc.ts`
- `frontend/src/lib/label-trpc.ts`
- `frontend/src/lib/milestone-trpc.ts`
- `frontend/src/lib/auth.ts`
- `frontend/src/lib/project.ts`
- `frontend/src/lib/issue.ts`
- `frontend/src/lib/pull-request.ts`

산출물:

- procedure name
- input shape
- output shape
- error mapping
- auth requirement
- query key / invalidation dependency
- existing client-side usage site

### Slice 1: Go Domain Port

목표:

- current TS domain/db behavior를 Go domain + db layer로 옮긴다.

대상 ownership:

- `internal/domain`
- `internal/db`

원칙:

- legacy intent가 source of truth다.
- current TS implementation은 translation hint다.
- TS service naming을 가능한 한 Go service naming에 반영한다.

### Slice 2: Protobuf / Connect Contract Layer

목표:

- current frontend call site를 가능한 한 유지하는 Protobuf/Connect layer를 만든다.

ownership:

- `proto`
- `internal/httpapi/connect`
- `packages/contracts`

원칙:

- procedure naming drift를 최소화한다.
- auth/error semantics를 TS 쪽과 맞춘다.
- frontend 수정량이 가장 적은 경로를 우선한다.
- `connect-query`와 TanStack Query를 기본 조합으로 사용한다.

### Slice 3: Frontend Repoint

목표:

- current TS in-process backend call을 generated Connect client 호출로 교체한다.

대상:

- `frontend/src/lib/*-trpc.ts`
- `frontend/src/lib/*.ts` (`createServerFn` wrappers)
- query helpers
- mutation invalidation wiring
- runtime config bootstrap

원칙:

- UI는 그대로 두고 transport만 교체한다.
- query key naming과 optimistic update semantics를 먼저 보존한다.
- runtime `basePath`, `rpcBaseUrl`, `apiBaseUrl`를 frontend bootstrap에서 주입한다.

### Slice 4: Delete Or Archive TS Backend

목표:

- Go로 옮겨진 backend ownership을 TS package에서 제거한다.

대상:

- `packages/auth`
- `packages/db`
- `packages/domain`
- `packages/integrations`
- `packages/vcs`
- `frontend/src/lib/*-trpc.server.ts`

원칙:

- 한 slice가 완전히 parity 검증되기 전에는 삭제하지 않는다.
- source material 가치를 잃지 않도록 provenance를 남긴다.

## Feature Mapping

| Current TS surface | Go target |
| --- | --- |
| `auth-trpc` / `auth.ts` | `internal/auth` + `internal/httpapi/connect/auth` |
| `me-trpc` / `me.ts` | `internal/domain/workspace` + `internal/httpapi/connect/me` |
| `project-trpc` / `project.ts` | `internal/domain/project` + `internal/httpapi/connect/project` |
| `organization-trpc` / `organization.ts` | `internal/domain/org` + `internal/httpapi/connect/org` |
| `issue-trpc` / `issue.ts` | `internal/domain/issue` + `internal/httpapi/connect/issue` |
| `pull-request-trpc` / `pull-request.ts` | `internal/domain/pullrequest` + `internal/httpapi/connect/pullrequest` |
| `repo-trpc` / `repo-http` | `internal/vcs` + `internal/httpapi/repo` |
| `search-trpc` / `search.ts` | `internal/search` + `internal/httpapi/connect/search` |
| `posting-trpc` / `posting.ts` | `internal/domain/posting` + `internal/httpapi/connect/posting` |
| `label-trpc` / `milestone-trpc` | `internal/domain/issue-meta` + `internal/httpapi/connect/issue-meta` |

## DB Translation Position

- current Drizzle schema와 helper는 source material이다.
- target query layer는 `uptrace/bun`으로 재작성한다.
- legacy active record semantics를 옮기며 query를 새로 짜는 것을 허용한다.
- ORM convenience보다 3개 DB parity와 readable SQL 의도가 우선이다.

## VCS Translation Position

- Git/SVN은 Go에서도 system executable을 사용한다.
- `Gitea`, `Forgejo`는 git executable pattern 참고 사례다.
- `Masterminds/vcs`는 multi-VCS wrapper 참고 자료다.
- Yona는 timeout, env whitelist, output limit, audit policy를 직접 소유한다.

## Testing

- legacy source -> current TS behavior -> Go behavior 순서로 검증한다.
- 가능한 경우 current TS `tRPC` output과 `createServerFn` output을 contract snapshot으로 사용한다.
- migration slice별 필수 검증:
  - legacy provenance
  - current TS contract capture
  - Go domain test
  - Connect handler/API contract test
  - frontend smoke / Playwright flow
  - runtime basepath `/` / subdirectory mount

## First Recommended Order

1. auth
2. me/workspace
3. project + organization
4. issue
5. search
6. repo/VCS
7. pull request/review

이 순서가 좋은 이유는 frontend 화면 연결 순서와 auth/dependency graph가 가장 자연스럽기 때문이다.
