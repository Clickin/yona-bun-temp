# 05) Agent Execution Guidelines & Samples

## G-A) 프론트엔드 에이전트: View-First 마크업 번역

1. **Semantic 구조 존중:** 기존 Yona 마크업의 UX 흐름을 최대한 유지.
2. **템플릿 문법 치환:** `@if` -> `{#if}`, `@for` -> `{#each}`, `@messages` -> Paraglide `m.key()`.
3. **스타일링 치환:** 기존 CSS를 Tailwind v4 유틸리티로 치환, 핵심 UI는 `shadcn-svelte` 사용.
4. **Mock 데이터 활용:** `$state` 기반 mock으로 UI 인터랙션 우선 검증.
5. **Svelte 5 Runes 강제:** Svelte 4 문법 사용 금지.

## G-B) 백엔드/도메인 에이전트: 레퍼런스 조회 및 TDD

1. `yona-original/`의 테스트/비즈니스 코드를 의미 기반으로 분석.
2. Vitest 형식의 실패하는 테스트(Red)를 먼저 작성.
3. 테스트를 통과시키는 구현(Green) 후 리팩토링.

## G-C) Worktree 기반 병렬 작업 규칙

1. 할당된 `git worktree` 경로에서만 작업.
2. `yona-original/`은 read-only 접근만 허용.

## G-D) Git backend 전략

- 시스템 `git` executable 사용.
- `packages/libgit2-ffi` 범위 제외.
- `packages/infra/src/git/executable.ts`에서 `spawn('git', ...)` 래핑.
- `packages/infra/src/git/index.ts`에서 export.

### Git HTTP backend (전용)

- clone/fetch/push 전송은 일반 Git 경로를 사용.
- web inline edit, commit creation, branch protection은 application mutation 레이어에서 처리.

## G-E) SVN CLI 호출 제약

- SVN 연동에서 FFI 시도 금지.
- 반드시 `Bun.spawn` 기반 CLI 래핑 사용.
