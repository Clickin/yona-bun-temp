# 01) 프런트엔드 아키텍처

`frontend/`가 canonical frontend ownership이다. frontend는 `React` SPA 기준을 유지하며, route/query/screen composition은 legacy Yona UX parity를 우선한다.

## 기준선

- UI: `React`
- 라우팅과 서버 상태: TanStack Router와 TanStack Query를 canonical frontend boundary로 사용한다.
- 라우팅 구현은 `frontend/src/routes/**` 기준의 file-based / directory-based TanStack Router로 고정한다.
- generated `routeTree.gen.ts`와 route modules만이 route source of truth다. static route table, manual matcher, route-kind registry는 금지한다.
- canonical API contract: REST JSON API(`/api/v1`) + frontend typed API client/TanStack Query hooks
- generated ConnectRPC clients are removed from `frontend/`; `proto/` stays outside frontend runtime as a historical schema snapshot.
- canonical implementation path: `frontend/`
- component design 기준선: repo root `DESIGN.md` + `yona-original/app/views/**` + legacy LESS
- pixel parity styling 기준선: 수정 불가로 동결한 `yona-original/app/assets/stylesheets/yobi.less` 전체 import graph + legacy `bootstrap.css`/`bootstrap-responsive.css`. 화면 보정에는 이 CSS/LESS만 사용한다.
- StyleX 점진 변환: 활성 legacy/plugin stylesheet는 생성형 lower `legacy` layer에서 fallback으로 유지하고, StyleX는 ledger에 기록한 React owner만 상위 priority layer로 소유한다. 같은 slice에서 E2E locator를 semantic/stable locator로 옮기고 desktop/390px 및 fallback 검증을 통과해야 한다.

## 데이터 경계

- frontend는 REST API client, TanStack Query hooks, route modules만 통해 backend와 통신한다.
- `frontend/`는 DB, repository, server bootstrap을 직접 알지 않는다.
- root `reference/mixed-code/frontend/src/lib/*-trpc*`, `createServerFn`, route/query wiring은 obsolete pre-Rust residual code이며 parity reference가 아니다.
- ConnectRPC wrapper code는 Phase -1에서 제거된 migration debt다. 새 frontend data flow는 REST API client와 TanStack Query hook으로만 추가한다.

## 화면 원칙

- 레이아웃, copy, CTA, 메뉴, deep-link flow는 `yona-original/` 기준을 우선한다.
- 화면 styling/component design 작업은 먼저 `DESIGN.md`의 legacy Yona baseline을 확인하고, `tools/yona-design-harness.mjs` precommit gate를 통과해야 한다.
- screenshot/geometry diff는 legacy element 역할, DOM nesting/order, class composition, cascade, asset/font, box model을 복원해 해결한다. 원본에 없는 route 전용 margin/padding/position/transform/fixed-size/viewport 수치 추가는 parity 보정으로 인정하지 않는다.
- React가 legacy plugin을 대체할 때 필요한 selector 번역은 동결된 원본 rule의 값을 바꾸지 않고 React 소유 경계로 좁힌 경우만 허용하며, 원본 file/selector/rule을 provenance와 focused test에 기록한다.
- 의도적 차이는 provenance 문서에 `deviation`으로 남긴다.
- 임시 parity shell이나 축소형 UX를 canonical baseline으로 굳히지 않는다.
