# 01) 프론트엔드 아키텍처 (View Layer)

SvelteKit은 SSR 및 뷰 렌더링을 전담한다.

## 기술 스택

1. **UI 컴포넌트 & 스타일링:** `shadcn-svelte` + Tailwind CSS v4, 아이콘은 `lucide-svelte`, UI 카탈로그는 Storybook.
2. **상태 관리:** Svelte 5 Runes (`$state`, `$derived`, `$effect`, `$props`)만 사용.
3. **폼 핸들링:** `sveltekit-superforms` + Zod.
4. **마크다운 에디터:** `BearToCode/carta`.
5. **다국어(i18n):** `Paraglide JS`.
6. **코드 품질:** `oxlint`, `oxfmt` 강제.

## 금지/강제 규칙

- Svelte 4 문법(`export let`, `$:`) 금지.
- API 완성 대기 없이 뷰 번역 가능하도록 View-First 전략을 따른다.
- 기존 Yona UI 의미론적 구조를 최대한 보존한다.
