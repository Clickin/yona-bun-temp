# 04) 아키텍처 가드레일 (위반 금지)

- **G1) 레이어 책임:** SvelteKit은 뷰 SSR 전담, DB/Drizzle/VCS 직접 호출 금지.
- **G2) Hono Type-Contract:** `packages/api`의 Hono app 타입이 유일한 API 계약.
- **G3) Hybrid SSR 모델:** 기본 `+page.ts`, 세션/비밀정보만 `+page.server.ts`.
- **G4) DTO 직렬화 규약:** JSON-only.
- **G5) 마크다운 렌더링 규약:** SSR 우선 렌더링.
- **G6) VCS DI:** 프로젝트 단위로 Git/SVN 선택 주입.
- **G7) 세션 관리:** DB session 배제, in-memory 또는 redis/valkey 사용.

## G8) Import 컨벤션

- 패키지 경계 import는 `@yona/*` 사용.
- 앱 내부는 `@web/*`, `$lib`, `$app` alias 사용.
- 루트 스키마/설정 참조는 `@drizzle/*` 사용.
- 깊은 상대경로(`../../../`) 금지, alias 우선.
