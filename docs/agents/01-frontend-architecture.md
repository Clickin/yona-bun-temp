# 01) 프런트엔드 아키텍처

`frontend/`가 canonical frontend ownership이다. frontend는 `React` SPA 기준을 유지하며, route/query/screen composition은 legacy Yona UX parity를 우선한다.

## 기준선

- UI: `React`
- 라우팅과 서버 상태: 현재 root mixed code의 React/TanStack 자산을 reference material로 읽고 필요한 규칙만 가져온다.
- 라우팅 구현은 `frontend/src/routes/**` 기준의 file-based / directory-based TanStack Router로 고정한다.
- generated `routeTree.gen.ts`와 route modules만이 route source of truth다. static route table, manual matcher, route-kind registry는 금지한다.
- canonical contract source: `proto/`
- canonical implementation path: `frontend/`

## 데이터 경계

- frontend는 generated client와 route modules만 통해 backend와 통신한다.
- `frontend/`는 DB, repository, server bootstrap을 직접 알지 않는다.
- root `reference/mixed-code/frontend/src/lib/*-trpc*`, `createServerFn`, route/query wiring은 reference-only migration material이다.

## 화면 원칙

- 레이아웃, copy, CTA, 메뉴, deep-link flow는 `yona-original/` 기준을 우선한다.
- 의도적 차이는 provenance 문서에 `deviation`으로 남긴다.
- 임시 parity shell이나 축소형 UX를 canonical baseline으로 굳히지 않는다.
