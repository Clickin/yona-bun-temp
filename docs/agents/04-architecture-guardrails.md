# 04) 아키텍처 가드레일

## G1) Canonical App Model

- target baseline은 `Go backend + React + TanStack Router + TanStack Query`다.
- current `TanStack Start`, `serverFunction`, in-process `tRPC`는 migration source material이다.
- frontend build output은 최종적으로 Go 배포 단위에 static embed 하거나 동일 아티팩트에서 함께 제공한다.

## G2) Transport Boundary

- 내부 앱 read/mutation의 canonical backend boundary는 Go HTTP/RPC endpoint다.
- current TS `tRPC` procedure 이름과 input/output shape는 migration input으로 취급한다.
- frontend call site를 최대한 유지할 수 있으면 tRPC-compatible Go adapter를 우선 검토한다.
- `github.com/befabri/trpcgo`는 compatibility spike 후보로 보고, `github.com/trpc-group/trpc-go`는 별도 Go RPC framework로 본다.
- smart HTTP, OAuth callback, asset download, webhook ingress, AI endpoint는 Go HTTP route로 구현한다.

## G3) Ownership Boundary

- `apps/app`은 route tree, query integration, client contract 호출, 화면 composition만 소유한다.
- `cmd/yona`는 서버 bootstrap, asset embed, config loading을 소유한다.
- `internal/domain`은 ACL, aggregate behavior, invariant를 소유한다.
- `internal/db`는 schema, migration, query layer를 소유한다.
- `internal/httpapi`는 app-facing handler와 protocol route를 소유한다.
- `internal/vcs`는 git/svn executable policy와 protocol helper를 소유한다.

## G4) Auth / Session Boundary

- 인증과 세션은 Yona가 직접 소유한다.
- `Better Auth`는 target baseline이 아니다.
- DB session persistence는 금지한다.
- 기본 session store는 secure cookie 또는 in-memory이며 secondary storage는 추상화 뒤에 붙인다.

## G5) DB Discipline

- `PostgreSQL`, `MySQL/MariaDB`, `SQLite`를 day 1부터 동등한 지원 대상으로 취급한다.
- Go query baseline은 `database/sql` + `uptrace/bun`이다.
- 새 query는 처음부터 세 dialect를 동시에 고려한다.
- datetime, FTS, raw SQL, migration lock, timestamp round-trip은 dialect별 검토를 명시적으로 남긴다.

## G6) VCS Process Safety

- 모든 git/svn subprocess는 argv array만 사용한다.
- shell string 실행을 금지한다.
- timeout, environment whitelist, output size limit, error normalization을 적용한다.
- write/conflict action은 audit 가능해야 한다.
- Git 구현은 `Gitea`/`Forgejo`처럼 executable pattern을 따르되, Yona가 직접 보안/감사 정책을 소유한다.

## G7) Asset / File Delivery

- user-uploaded asset을 static bundle 또는 public directory에 포함하지 않는다.
- metadata ACL 판단은 항상 Yona가 수행한다.
- inline preview와 download response policy를 분리한다.

## G8) Background Work

- notification/integration delivery는 기본적으로 같은 Go process에서 처리한다.
- polling, durable retry, CPU-bound transform처럼 분리가 필요한 workload만 별도 runtime 경로로 분리한다.

## G9) Test Provenance

- feature 완료 판정은 UI가 아니라 legacy intent parity 기준으로 한다.
- primary legacy reference, failing Red test, passing Green tests, deviation 기록이 없으면 완료로 인정하지 않는다.
