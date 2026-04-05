# 09) LLM 온보딩 체크리스트

## 목적

- 이 문서는 Yona에 처음 투입된 LLM/에이전트가 `SPEC.md`를 바로 실행 가능한 작업 규칙으로 압축한 체크리스트다.
- 메인 Source of Truth는 `AGENTS.md`이며, 기술적 상세의 canonical source는 `SPEC.md`다.

## 빠른 상황 인식

- 목표는 legacy Yona 기능과 UX parity다.
- 최종 baseline은 `Go backend + React + TanStack Router + TanStack Query` 단일 배포 단위다.
- 현재 operator가 실행/검증 대상으로 삼아야 할 frontend는 `apps/app`이다.
- current `TanStack Start`, `serverFunction`, `Better Auth`, in-process `tRPC`, TS backend package는 migration source material이다.

## 추천 읽기 순서

1. `AGENTS.md` 변환 원칙과 고정 결정을 읽는다.
2. `SPEC.md`의 `2. 요약`, `3. 고정 결정`, `5. 목표 모노레포 구조`, `7. 아키텍처 개요`, `17. 테스트 전략`, `18. 전달 로드맵`, `19. Definition of Done`를 읽는다.
3. 작업 대상에 맞는 `SPEC.md` feature 섹션과 current TS source material을 함께 읽는다.
4. `docs/agents/00`, `03`, `04`, `05`, `06`, `07`을 읽는다.
5. `yona-original/`에서 대응 legacy test/controller/model/route를 찾는다.

## 구현 위치 체크리스트

- [ ] frontend route tree, query integration, 화면 composition은 `apps/app`에 둔다.
- [ ] 서버 bootstrap과 embed wiring은 `cmd/yona`에 둔다.
- [ ] auth/session은 `internal/auth`에 둔다.
- [ ] domain invariant, ACL, lifecycle rule은 `internal/domain`에 둔다.
- [ ] schema, migration, query layer는 `internal/db`에 둔다.
- [ ] app-facing API/route adapter는 `internal/httpapi`에 둔다.
- [ ] integration provider와 email/integration delivery runtime은 `internal/integrations`에 둔다.
- [ ] Git/SVN executable integration과 smart HTTP helper는 `internal/vcs`에 둔다.
- [ ] current TS backend package와 `*-trpc*` 코드는 migration source material로만 다룬다.

## Transport 체크리스트

- [ ] frontend read/mutation의 canonical entry는 Go HTTP/RPC endpoint다.
- [ ] current TS `tRPC` procedure 이름과 shape를 migration input으로 읽었다.
- [ ] frontend call site를 최대한 유지할 수 있는지 먼저 검토했다.
- [ ] full HTTP semantics가 필요한 경우는 Go route로 분리한다.

## 고정 제약 체크리스트

- [ ] DB session persistence를 재도입하지 않는다.
- [ ] 기본 session storage는 secure cookie 또는 in-memory로 유지한다.
- [ ] `PostgreSQL`, `MySQL/MariaDB`, `SQLite`를 처음부터 함께 고려한다.
- [ ] Go query baseline은 `database/sql` + `uptrace/bun`이다.
- [ ] user-uploaded asset은 항상 Yona-controlled route로 제공한다.
- [ ] Git/SVN은 system executable만 사용한다.
- [ ] notification/integration delivery가 same-process로 충분한지 먼저 판단했다.

## 테스트 프로토콜 체크리스트

- [ ] failing Red test 없이 Green 구현부터 시작하지 않는다.
- [ ] legacy test가 있으면 그것을 1차 입력으로 쓴다.
- [ ] legacy controller intent는 Go handler/API contract test 또는 protocol route test로 번역한다.
- [ ] legacy model intent는 domain test로 번역한다.
- [ ] ACL matrix는 domain ACL test와 route authorization test로 확인한다.
- [ ] protocol은 route/protocol integration test로 확인한다.
- [ ] end-user flow는 필요한 경우 Playwright E2E로 고정한다.

## 종료 전 체크리스트

- [ ] feature별 legacy provenance를 남겼다.
- [ ] relevant domain/handler/route/E2E test가 통과했다.
- [ ] 3개 DB 영향이 있는 경우 parity 확인 근거를 남겼다.
- [ ] 문서와 deviation 기록을 갱신했다.

## 한 줄 원칙

- 구현보다 먼저 provenance.
- 편의보다 먼저 ownership.
- 화면보다 먼저 behavior parity.
- Green보다 먼저 failing Red.
