# Go Backend Migration Plan

Date: 2026-04-06

## Goal

- React/TanStack frontend는 최대한 유지한다.
- backend만 Go로 재구축한다.
- 최종 배포는 frontend dist를 Go binary에 embed 하거나 동일 배포 단위에서 함께 제공한다.
- current TS backend surface는 migration source material로 사용한다.

## Fixed Direction

- frontend baseline: `React + TanStack Router + TanStack Query + Vite`
- backend baseline: `Go`
- DB baseline: `database/sql` + `uptrace/bun`
- VCS baseline: `git` / `svn` system executable
- auth/session: Yona-owned Go implementation

## tRPC Migration Position

현재 TS backend는 `apps/app/src/lib/*-trpc.ts` 중심으로 frontend call site가 이미 형성되어 있다.

따라서 첫 migration 목표는 “transport를 완전히 새로 설계”하는 것이 아니라 “frontend call site와 procedure naming을 가능한 한 유지하면서 backend만 Go로 바꾸는 것”이다.

### Candidate A: `github.com/befabri/trpcgo`

장점:

- README 기준으로 `@trpc/client`와 `@trpc/react-query`를 지원한다.
- Go handler를 정의하고 current frontend call site를 상대적으로 덜 흔들 수 있다.
- current TS `tRPC` surface를 migration input으로 쓰기에 가장 유리하다.

리스크:

- active development 상태다.
- current Yona의 실제 input/output 패턴과 auth/error mapping을 바로 다 감당할지 별도 spike가 필요하다.

### Candidate B: `github.com/trpc-group/trpc-go`

장점:

- Go 쪽 RPC framework로는 강하다.
- 성능/서비스 프레임워크 관점에서는 매력적이다.

리스크:

- current TS `@trpc/client` continuation path로 보기엔 직접 호환성이 불분명하다.
- 따라서 migration acceleration 관점에서는 1순위가 아니다.

### Current Decision

- 호환성 spike 1순위는 `befabri/trpcgo`
- `trpc-group/trpc-go`는 별도 Go RPC architecture 후보
- 두 후보가 모두 migration 요구를 만족하지 못하면 custom HTTP/JSON contract + generated TS client로 간다.

## Migration Slices

### Slice 0: Contract Inventory Freeze

목표:

- current TS `tRPC` surface를 inventory로 고정한다.

대상:

- `apps/app/src/lib/auth-trpc.ts`
- `apps/app/src/lib/me-trpc.ts`
- `apps/app/src/lib/project-trpc.ts`
- `apps/app/src/lib/organization-trpc.ts`
- `apps/app/src/lib/issue-trpc.ts`
- `apps/app/src/lib/pull-request-trpc.ts`
- `apps/app/src/lib/repo-trpc.ts`
- `apps/app/src/lib/search-trpc.ts`
- `apps/app/src/lib/posting-trpc.ts`
- `apps/app/src/lib/enrollment-trpc.ts`
- `apps/app/src/lib/label-trpc.ts`
- `apps/app/src/lib/milestone-trpc.ts`

산출물:

- procedure name
- input shape
- output shape
- error mapping
- auth requirement
- query key / invalidation dependency

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

### Slice 2: Go API Adapter

목표:

- current frontend call site를 가능한 한 유지하는 Go handler/API adapter를 만든다.

ownership:

- `internal/httpapi`

원칙:

- procedure naming drift를 최소화한다.
- auth/error semantics를 TS 쪽과 맞춘다.
- frontend 수정량이 가장 적은 경로를 우선한다.

### Slice 3: Frontend Repoint

목표:

- current TS in-process backend call을 Go backend call로 교체한다.

대상:

- `apps/app/src/lib/*-trpc.ts`
- query helpers
- mutation invalidation wiring

원칙:

- UI는 그대로 두고 transport만 교체한다.
- query key naming과 optimistic update semantics를 먼저 보존한다.

### Slice 4: Delete Or Archive TS Backend

목표:

- Go로 옮겨진 backend ownership을 TS package에서 제거한다.

대상:

- `packages/auth`
- `packages/db`
- `packages/domain`
- `packages/integrations`
- `packages/vcs`
- `apps/app/src/lib/*-trpc.server.ts`

원칙:

- 한 slice가 완전히 parity 검증되기 전에는 삭제하지 않는다.
- source material 가치를 잃지 않도록 provenance를 남긴다.

## Feature Mapping

| Current TS surface              | Go target                                                      |
| ------------------------------- | -------------------------------------------------------------- |
| `auth-trpc`                     | `internal/auth` + `internal/httpapi/auth`                      |
| `me-trpc`                       | `internal/domain/workspace` + `internal/httpapi/me`            |
| `project-trpc`                  | `internal/domain/project` + `internal/httpapi/project`         |
| `organization-trpc`             | `internal/domain/org` + `internal/httpapi/org`                 |
| `issue-trpc`                    | `internal/domain/issue` + `internal/httpapi/issue`             |
| `pull-request-trpc`             | `internal/domain/pullrequest` + `internal/httpapi/pullrequest` |
| `repo-trpc` / `repo-http`       | `internal/vcs` + `internal/httpapi/repo`                       |
| `search-trpc`                   | `internal/search` + `internal/httpapi/search`                  |
| `posting-trpc`                  | `internal/domain/posting` + `internal/httpapi/posting`         |
| `label-trpc` / `milestone-trpc` | `internal/domain/issue-meta` + `internal/httpapi/issue-meta`   |

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
- 가능한 경우 current TS `tRPC` output을 contract snapshot으로 사용한다.
- migration slice별 필수 검증:
  - legacy provenance
  - current TS contract capture
  - Go domain test
  - Go handler/API contract test
  - frontend smoke / Playwright flow

## First Recommended Order

1. auth
2. me/workspace
3. project + organization
4. issue
5. search
6. repo/VCS
7. pull request/review

이 순서가 좋은 이유는 frontend 화면 연결 순서와 auth/dependency graph가 가장 자연스럽기 때문이다.
