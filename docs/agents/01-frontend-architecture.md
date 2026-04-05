# 01) 프런트엔드 아키텍처

`apps/app`은 `React + TanStack Router + TanStack Query` 기반 SPA로 유지한다. frontend는 Go backend와 HTTP/RPC 경계로 분리되지만, 최종 배포에서는 build output을 Go binary에 static embed 하거나 동일한 배포 단위에서 함께 제공한다.

## 기술 스택

1. **UI:** `React`
2. **라우팅:** `TanStack Router`
3. **서버 상태:** `TanStack Query`
4. **번들링/개발 서버:** `Vite`
5. **스타일링:** `Tailwind CSS`
6. **공통 UI:** `packages/ui`
7. **공통 text/i18n 자원:** `packages/i18n`

## 데이터 규칙

- route loader와 component는 backend를 직접 알지 않고 typed client 계층만 호출한다.
- 현재 `apps/app/src/lib/*-trpc.ts`는 migration source material이다.
- frontend call site를 덜 흔드는 것이 목표이므로, 가능하면 현재 procedure 이름과 query key를 유지한다.
- route-level data prefetch와 component query consumption 규칙은 유지하되, backend transport는 Go HTTP/RPC로 바뀐다.

## 앱 경계 규칙

- frontend는 직접 DB를 알지 않는다.
- frontend가 아는 backend contract는 Go HTTP/RPC endpoint와 asset/VCS/protocol route뿐이다.
- OAuth callback, asset delivery, smart HTTP, webhook ingress, AI endpoint는 Go HTTP route로 구현한다.
- user-uploaded asset은 frontend bundle에 포함하지 않는다.

## 화면 구조 원칙

- legacy Yona의 정보 구조와 사용자 행위 의미를 유지한다.
- `apps/app`에서 이미 구현된 frontend screen은 `yona-original`의 layout과 information architecture를 기본값으로 보존해야 하며, 의도적 차이가 있으면 deviation을 명시적으로 기록한다.
- screen-level UI copy, label, CTA, section title도 `yona-original` template/message wording을 우선 사용한다.
- legacy template HTML을 React로 옮길 때는 reusable shell/section/form/menu component 조합으로 재구성한다.
- parity 이후 첫 개선 우선순위는 `live markdown preview`다. 따라서 markdown editor/preview UX는 client render와 server authoritative render의 drift를 최소화하는 방향으로 설계한다.

## Migration 규칙

- `TanStack Start`, `serverFunction`, current in-process `tRPC` wiring은 target baseline이 아니라 migration source material이다.
- current React route structure, query usage, screen composition은 재사용 대상이다.
- backend 분리 이후에도 `apps/app`은 실행/검증 대상으로 유지한다.
