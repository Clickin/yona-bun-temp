# 05) Agent Execution Guidelines

## 기본 절차

1. 관련 `SPEC.md` 섹션과 `docs/agents/*` mirror를 읽는다.
2. 대응 legacy reference를 `yona-original/`에서 식별한다.
3. 보호해야 하는 intent, permission result, state transition을 추출한다.
4. failing Red test를 먼저 작성한다.
5. target package 경계 안에서 Green 구현을 작성한다.
6. dialect/auth/asset/VCS/worker 영향이 있는지 점검한다.
7. 필요한 문서와 deviation 기록을 갱신한다.

## 코드 배치 규칙

- 새 장기 구현은 `apps/app`과 target packages에 둔다.
- `apps/web`, `packages/api`, `packages/core`, `packages/infra`에는 extraction 또는 compatibility shim 외의 새 ownership을 추가하지 않는다.
- app layer는 orchestration만 하고 domain invariant를 가지지 않는다.
- loader, `beforeLoad`, component, `serverFunction` adapter는 DB client를 직접 호출하지 않고 `tRPC` backend boundary를 통해서만 domain/db로 진입한다.
- `apps/app`에서 이미 구현된 frontend screen은 `yona-original`의 layout과 information architecture를 기본값으로 보존해야 하며, 의도적 차이가 있으면 deviation을 명시적으로 기록한다.
- screen-level UI copy, label, CTA, section title도 `yona-original` template/message wording을 기본값으로 사용한다.
- legacy template를 React로 옮길 때는 reusable shell/section/form/menu component 조합으로 분해해서 남긴다. parity를 이유로 screen별 static HTML clone을 늘리지 않는다.
- branding delta는 logo, color palette, typography token, 동등한 design token 수준까지만 허용하며, major region 배치, menu 위치, primary action, permission-driven visibility를 임의로 바꾸면 안 된다.

## DB 작업 규칙

- query를 작성할 때는 처음부터 `PostgreSQL`, `MySQL/MariaDB`, `SQLite`를 모두 고려한다.
- 단순 Drizzle query라도 timestamp, sorting, null semantics, FTS 영향이 없는지 확인한다.
- dialect-specific SQL이 필요하면 세 DB별 의도와 fallback을 같이 기록한다.

## Auth 작업 규칙

- `Better Auth`를 thin integration layer로 유지한다.
- canonical user/credential/linked-account model은 Yona domain으로 둔다.
- DB session을 재도입하지 않는다.
- secondary storage가 필요하면 동일 추상화 뒤에 붙인다.

## VCS / Asset / Integration 규칙

- VCS subprocess는 safe argv execution만 허용한다.
- asset delivery는 항상 Yona ACL 아래에서 처리한다.
- integration delivery는 request path에서 감당 가능한 async I/O면 inline으로 처리하고, 장시간 retry/polling/CPU-bound work만 별도 runtime 경로를 검토한다.

## 금지 사항

- 새 `SvelteKit` page/route를 target architecture로 추가하는 행위
- 새 `Hono` sub-app을 canonical API로 확장하는 행위
- 단일 DB만 생각하고 raw SQL을 추가하는 행위
- legacy provenance 없이 feature를 완료 처리하는 행위
- arbitrary runtime plugin execution을 허용하는 행위
