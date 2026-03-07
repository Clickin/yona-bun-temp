# 01) 프런트엔드 아키텍처

`apps/app`은 `TanStack Start + React` 기반의 단일 앱으로 구성한다.

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
- router context에 auth/session projection과 `queryClient`를 주입한다.
- `setupRouterSsrQueryIntegration` 패턴을 baseline으로 사용한다.
- route loader는 cache authority가 아니라 `ensureQueryData` 역할만 수행한다.
- above-the-fold critical data는 component에서 `useSuspenseQuery`로 소비한다.
- secondary panel처럼 첫 render 이후 로드해도 되는 데이터만 `useQuery`를 사용한다.

## Route와 Action 규칙

- 내부 read/mutation은 `createServerFn`으로 구현한다.
- OAuth callback, asset delivery, smart HTTP, inbound webhook처럼 HTTP semantics가 중요한 surface는 server route로 구현한다.
- 보호된 화면은 `beforeLoad`로 인증/권한 경계를 건다.

## 화면 구조 원칙

- legacy Yona의 정보 구조와 사용자 행위 의미를 유지한다.
- issue detail, PR detail, organization overview, project dashboard는 streaming SSR을 우선 적용한다.
- markdown 기반 resource는 human-readable UI와 machine-readable surface가 공존하도록 설계한다.

## Migration 규칙

- 새 장기 코드에서 `SvelteKit`, `Hono`, `@web`, `$lib`, `$app`를 새 baseline으로 도입하지 않는다.
- 기존 `apps/web` UI는 copy, field contract, test intent를 추출하기 위한 reference다.
