# 05) Agent Execution Guidelines

## 변환 원칙

1. 기능 동등성만이 목표다.
2. 새 구조 제안이 목적이 아니다.
3. 기존 UI/UX를 유지한다.
4. 구현에 집중한다.

## 기본 절차

1. 관련 `AGENTS.md`, `SPEC.md`, `docs/agents/*` mirror를 읽는다.
2. `yona-original/`에서 대응 legacy reference를 찾는다.
3. current TS/TanStack/tRPC 구현도 migration source material로 읽는다.
4. 보호해야 하는 intent, permission result, state transition을 추출한다.
5. failing Red test를 먼저 작성한다.
6. target ownership 경계 안에서 Green 구현을 작성한다.
7. dialect/auth/asset/VCS 영향과 deviation을 기록한다.

## 코드 배치 규칙

- 새 frontend 장기 구현은 `apps/app`, `packages/ui`, `packages/i18n`, `packages/contracts`에 둔다.
- 새 backend 장기 구현은 `cmd/yona`, `internal/auth`, `internal/db`, `internal/domain`, `internal/httpapi`, `internal/integrations`, `internal/search`, `internal/vcs`에 둔다.
- current TS backend package와 `*-trpc*` 코드는 migration source material이다.
- frontend는 DB client를 직접 호출하지 않는다.
- frontend는 client contract 계층만 통해 Go backend로 진입한다.

## DB 작업 규칙

- query를 작성할 때는 처음부터 `PostgreSQL`, `MySQL/MariaDB`, `SQLite`를 모두 고려한다.
- Go query baseline은 `database/sql` + `uptrace/bun`이다.
- timestamp, sorting, null semantics, FTS 영향이 없는지 확인한다.

## Auth 작업 규칙

- 인증/세션은 Yona-owned Go implementation으로 둔다.
- DB session을 재도입하지 않는다.
- secure cookie 또는 in-memory를 기본으로 두고, secondary storage는 같은 추상화 뒤에 붙인다.

## VCS / Asset / Integration 규칙

- VCS subprocess는 safe argv execution만 허용한다.
- git/svn은 system executable만 사용한다.
- `Gitea`, `Forgejo`, `Masterminds/vcs`는 참고 자료일 뿐이며, Yona의 timeout/env/audit 정책이 source of truth다.
- asset delivery는 항상 Yona ACL 아래에서 처리한다.
- integration delivery는 request path에서 감당 가능한 async I/O면 inline으로 처리하고, 장시간 retry/polling/CPU-bound work만 별도 runtime 경로를 검토한다.

## 금지 사항

- 새 `TanStack Start`, `serverFunction`, `Better Auth`, current in-process `tRPC`를 target architecture로 되살리는 행위
- 단일 DB만 생각하고 schema/query를 추가하는 행위
- legacy provenance 없이 feature를 완료 처리하는 행위
- arbitrary runtime plugin execution을 허용하는 행위
