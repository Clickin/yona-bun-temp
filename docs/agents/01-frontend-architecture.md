# 01) 프런트엔드 아키텍처

`frontend/`가 canonical frontend ownership이다. frontend는 `React` SPA 기준을 유지하며, route/query/screen composition은 legacy Yona UX parity를 우선한다.

## 기준선

- UI: `React`
- 라우팅과 서버 상태: TanStack Router와 TanStack Query를 canonical frontend boundary로 사용한다.
- 라우팅 구현은 `frontend/src/routes/**` 기준의 file-based / directory-based TanStack Router로 고정한다.
- generated `routeTree.gen.ts`와 route modules만이 route source of truth다. static route table, manual matcher, route-kind registry는 금지한다.
- canonical API contract: REST JSON API(`/api/v1`) + frontend typed API client/TanStack Query hooks
- `proto/` generated clients는 기존 ConnectRPC 코드의 transition-only surface이며 새 feature work의 기본값이 아니다.
- canonical implementation path: `frontend/`

## 데이터 경계

- frontend는 REST API client, TanStack Query hooks, route modules만 통해 backend와 통신한다.
- `frontend/`는 DB, repository, server bootstrap을 직접 알지 않는다.
- root `reference/mixed-code/frontend/src/lib/*-trpc*`, `createServerFn`, route/query wiring은 reference-only migration material이다.
- 기존 ConnectRPC wrapper code는 호환성 slice가 명시적으로 보존하지 않는 한 migration debt로 취급한다.

## 화면 원칙

- 레이아웃, copy, CTA, 메뉴, deep-link flow는 `yona-original/` 기준을 우선한다.
- 의도적 차이는 provenance 문서에 `deviation`으로 남긴다.
- 임시 parity shell이나 축소형 UX를 canonical baseline으로 굳히지 않는다.
