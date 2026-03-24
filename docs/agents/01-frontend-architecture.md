# 01) 프런트엔드 아키텍처

`apps/app`은 `TanStack Start + React` 기반의 단일 앱으로 구성하며, 현재 active runtime도 `apps/app`을 기준으로 본다.

## 기술 스택

1. **앱 프레임워크:** `TanStack Start`
2. **UI:** `React`
3. **라우팅:** `TanStack Router`
4. **서버 상태:** `TanStack Query`
5. **스타일링:** `Tailwind CSS`
6. **공통 UI:** `packages/ui`
7. **공통 text/i18n 자원:** `packages/i18n`

## SSR / Query 규칙

- request마다 fresh `QueryClient`를 생성한다.
- router context에 auth/session projection, `queryClient`, `tRPC` caller를 주입한다.
- `setupRouterSsrQueryIntegration` 패턴을 baseline으로 사용한다.
- route loader는 cache authority가 아니라 `ensureQueryData` 역할만 수행한다.
- route loader, `beforeLoad`, component, `serverFunction` adapter는 DB client를 직접 import/call하지 않는다.
- above-the-fold critical data는 component에서 `useSuspenseQuery`로 소비한다.
- secondary panel처럼 첫 render 이후 로드해도 되는 데이터만 `useQuery`를 사용한다.
- session-aware route라고 해서 SSR을 강제하지 않는다. `ssr: true`, `ssr: 'data-only'`, `ssr: false`를 화면 목적에 맞게 선택한다.
- `ssr: true`는 SEO/above-the-fold 우선 화면, `ssr: 'data-only'`는 session gate + client render 화면, `ssr: false`는 순수 앱 화면에 사용한다.

## Route와 Action 규칙

- 내부 read/mutation의 canonical backend boundary는 in-process `tRPC`다.
- TanStack Start `serverFunction`은 slug/transport shell만 담당하고 handler는 `tRPC` procedure로 위임한다.
- app-internal RPC는 `superjson`을 기본 transformer로 사용한다.
- OAuth callback, asset delivery, smart HTTP, inbound webhook처럼 HTTP semantics가 중요한 surface는 server route로 구현한다.
- 보호된 화면은 `beforeLoad`로 인증 경계를 건다.
- session 조회, redirect, cookie/session rotation은 `beforeLoad` 또는 `serverFunction`이 맡고, feature-specific authorization source of truth는 `tRPC` procedure와 domain policy에 둔다.

## 화면 구조 원칙

- legacy Yona의 정보 구조와 사용자 행위 의미를 유지한다.
- `apps/app`에서 이미 구현된 frontend screen은 `yona-original`의 layout과 information architecture를 기본값으로 보존해야 하며, 의도적 차이가 있으면 deviation을 명시적으로 기록한다.
- screen-level UI copy, label, CTA, section title도 `yona-original` template/message wording을 우선 사용한다. 새 copy를 임의로 modernize하거나 요약하지 않는다.
- legacy template HTML을 React로 옮길 때는 reusable shell/section/form/menu component 조합으로 재구성한다. parity를 핑계로 screen마다 1회성 markup을 복제하지 않는다.
- branding delta는 logo, color palette, typography token, 동등한 design token 수준까지만 허용하며, major region 배치, menu 위치, primary action, permission-driven visibility를 임의로 바꾸면 안 된다.
- issue detail, PR detail, organization overview, project dashboard는 streaming SSR을 우선 적용한다.
- markdown 기반 resource는 human-readable UI와 machine-readable surface가 공존하도록 설계한다.

## Migration 규칙

- 새 장기 코드에서 `SvelteKit`, `Hono`, `@web`, `$lib`, `$app`를 새 baseline으로 도입하지 않는다.
- 제거된 `apps/web` UI의 semantics는 UX copy, field contract, test intent를 추출하기 위한 legacy reference로만 취급한다.
- operator 관점의 실행/검증 entry는 `apps/app`만 기준으로 본다.
- 현재 `apps/app`의 `serverFunction` 예제 코드는 pre-migration shell로 간주한다.
