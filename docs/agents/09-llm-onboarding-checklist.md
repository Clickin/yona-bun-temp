# 09) LLM 온보딩 체크리스트

## 목적

- 이 문서는 Yona에 처음 투입된 LLM/에이전트가 `SPEC.md`를 바로 실행 가능한 작업 규칙으로 압축한 체크리스트다.
- canonical source는 항상 `SPEC.md`이며, 이 문서는 실행용 mirror다.

## 빠른 상황 인식

- 목표는 legacy Yona behavior parity이며, 축소판 issue tracker를 만드는 작업이 아니다.
- 최종 baseline은 `TanStack Start + React + Bun` 단일 애플리케이션이다.
- 현재 `SvelteKit + Hono` 코드는 target baseline이 아니라 migration source material이다.

## 추천 읽기 순서

1. `SPEC.md`의 `2. 요약`, `3. 고정 결정`, `5. 목표 모노레포 구조`, `7. 아키텍처 개요`, `17. 테스트 전략`, `18. 전달 로드맵`, `19. Definition of Done`를 읽는다.
2. 작업 대상에 맞는 `SPEC.md`의 `13.x` feature 섹션을 읽는다.
3. `docs/agents/00-goals-and-fixed-decisions.md`, `03-repo-structure.md`, `05-agent-execution-guidelines.md`, `06-phase-plan.md`를 읽는다.
4. `yona-original/`에서 대응 legacy test/controller/model/route를 찾는다.

## 작업 시작 전 체크리스트

- [ ] 관련 `SPEC.md` feature 섹션과 `docs/agents/*` mirror를 읽었다.
- [ ] 대응 legacy test/controller/model/route를 `yona-original/`에서 식별했다.
- [ ] 보호해야 할 intent, permission result, state transition, side effect를 적었다.
- [ ] target package ownership을 결정했다.
- [ ] intentional deviation 필요 여부를 먼저 판단했다.

## 구현 위치 체크리스트

- [ ] route tree, SSR wiring, orchestration, `tRPC` context/caller/adapter wiring은 `apps/app`에 둔다.
- [ ] auth bridge와 session secondary storage는 `packages/auth`에 둔다.
- [ ] domain invariant, ACL, lifecycle rule은 `packages/domain`에 둔다.
- [ ] schema, migration, parity test는 `packages/db`에 둔다.
- [ ] Zod schema, DTO, error code, `tRPC` procedure contract는 `packages/contracts`에 둔다.
- [ ] integration provider, outbox/worker는 `packages/integrations`에 둔다.
- [ ] Git/SVN executable integration과 smart HTTP helper는 `packages/vcs`에 둔다.
- [ ] `apps/web`, `packages/api`, `packages/core`, `packages/infra`에 새 장기 ownership을 추가하지 않는다.

## Transport 선택 체크리스트

- [ ] 내부 앱 read/mutation의 canonical entry는 `tRPC` procedure로 둔다.
- [ ] TanStack Start `serverFunction`은 thin adapter로만 쓰고, 완전한 HTTP semantics가 필요한 경우만 server route를 쓴다.
- [ ] session 조회/redirect는 app layer에서 처리하되, feature-specific authorization source of truth는 `tRPC`/domain에 둔다.
- [ ] app-internal RPC에는 `superjson`을 기본 transformer로 사용한다.
- [ ] `Hono` sub-app을 새 canonical API로 확장하지 않는다.

## 고정 제약 체크리스트

- [ ] DB session persistence를 재도입하지 않는다.
- [ ] 기본 session storage는 in-memory로 유지한다.
- [ ] `PostgreSQL`, `MySQL/MariaDB`, `SQLite`를 처음부터 함께 고려한다.
- [ ] timestamp, FTS, raw SQL, null/sort semantics의 dialect 차이를 점검한다.
- [ ] user-uploaded asset은 항상 Yona-controlled route로 제공한다.
- [ ] asset ACL, cache header, content disposition은 Yona가 직접 통제한다.
- [ ] Git/SVN은 system executable만 사용한다.
- [ ] notification/integration delivery는 request path에서 오래 실행하지 않고 worker/outbox로 보낸다.

## 테스트 프로토콜 체크리스트

- [ ] failing Red test 없이 Green 구현부터 시작하지 않는다.
- [ ] legacy test가 있으면 그것을 1차 입력으로 쓴다.
- [ ] legacy controller intent는 `tRPC` procedure test + `serverFunction` adapter test 또는 server route test로 번역한다.
- [ ] legacy model intent는 domain test로 번역한다.
- [ ] ACL matrix는 domain ACL test와 route authorization test로 확인한다.
- [ ] protocol은 route/protocol integration test로 확인한다.
- [ ] end-user flow는 필요한 경우 Playwright E2E로 고정한다.
- [ ] legacy source가 없을 때만 spec-derived test를 단독 근거로 쓴다.

## 구현 중 점검 체크리스트

- [ ] permission matrix가 보존되는지 확인했다.
- [ ] state transition과 lifecycle invariant가 보존되는지 확인했다.
- [ ] notification, audit, asset binding, worker 같은 side effect를 확인했다.
- [ ] visibility와 search filtering 영향이 있는지 확인했다.
- [ ] TanStack Query를 유일한 cache authority로 유지했다.
- [ ] loader는 `ensureQueryData`, component는 `useSuspenseQuery` 중심 규칙을 따랐다.
- [ ] loader, `beforeLoad`, component, `serverFunction` adapter가 DB client를 직접 import/call하지 않음을 확인했다.
- [ ] feature가 project home, issue detail, PR detail, org overview라면 streaming SSR 적용 여부를 검토했다.
- [ ] session-aware route라는 이유만으로 SSR을 강제하지 않았고, `ssr: true`, `ssr: 'data-only'`, `ssr: false` 중 하나를 의도적으로 선택했다.

## 금지 사항 체크리스트

- [ ] 새 `SvelteKit` page/route를 target architecture로 추가하지 않는다.
- [ ] 새 `Hono` sub-app을 canonical API로 확장하지 않는다.
- [ ] 단일 DB만 생각하고 schema/query를 작성하지 않는다.
- [ ] legacy provenance 없이 feature를 완료 처리하지 않는다.
- [ ] arbitrary runtime plugin execution을 허용하지 않는다.
- [ ] asset delivery를 정적 파일 제공으로 우회하지 않는다.

## 종료 전 체크리스트

- [ ] feature별 legacy provenance를 남겼다.
- [ ] Red test와 Green 구현 trace를 남겼다.
- [ ] relevant domain/`tRPC` procedure/`serverFunction` adapter/server-route/E2E test가 통과했다.
- [ ] 3개 DB 영향이 있는 경우 parity 확인 근거를 남겼다.
- [ ] 문서와 deviation 기록을 갱신했다.
- [ ] 해당 `SPEC.md` feature 섹션의 완료 기준을 다시 확인했다.

## 한 줄 원칙

- 구현보다 먼저 provenance.
- 편의보다 먼저 ownership.
- 화면보다 먼저 behavior parity.
- Green보다 먼저 failing Red.
