# 11. StyleX Best Practices

Status: current baseline
Date: 2026-08-03

공식 문서를 기준으로 한 StyleX authoring best practice 정리. 이 문서는 공식 가이드의
내용을 repo의 기존 StyleX 컨벤션(legacy parity, e2e canonicalizer, StyleX verifier)과
통합한 실행 규칙이다. AGENTS.md의 변환 원칙과 충돌하면 AGENTS.md > 이 문서 순서로
우선한다.

## Sources

- <https://stylexjs.com/docs/learn/thinking-in-stylex/> — core principles
- <https://stylexjs.com/docs/llm-resources> (stylex-authoring.md, stylex-installation.md) — authoring rules + 설치
- <https://typestyles.dev/docs/framework-comparison.md> — 결정 렌즈 (StyleX = compiler required, atomic hashed classes, deterministic merge)

## Core principles

1. **Co-location.** 스타일은 사용하는 markup과 같은 파일에서 작성한다. DRY보다
   가독성/로컬 추론이 우선이다.
2. **Deterministic resolution.** StyleX는 selector specificity가 아니라 병합 순서로
   결정한다. `stylex.props(styles.base, styles.highlighted)`에서 **마지막 인자가
   이긴다** (shorthand/longhand 충돌도 동일).
3. **Small API surface.** 사실상 `stylex.create` + `stylex.props` 두 개만 쓴다.
   조건부 스타일 전용 API가 없고 JS boolean/ternary로 처리한다.
4. **Low-cost abstractions.** 같은 파일 안에서 create/props를 함께 쓰면 런타임
   비용이 0이다. 파일 경계를 넘는 스타일만 최소 런타임이 든다.
5. **Type safety.** `StyleXStyles<{...}>`, `StyleXStylesWithout<{...}>`,
   `VarGroup<typeof vars>`로 컴포넌트가 받는 스타일 계약을 제한한다.
6. **Encapsulation.** 요소 스타일은 그 요소 자신의 class로만 발생해야 한다.
   descendant selector(`.a > *`, `.a:hover button`) 스타일-at-a-distance를 쓰지
   않는다. 상속 가능한 `color` 같은 속성만 예외다.
7. **Readability over terseness.** 유틸리티 클래스 나열 대신 의미 있는 이름
   (`styles.active` 등)을 쓴다. camelCase CSS 속성명을 그대로 사용한다.
8. **Avoid global configuration / magic strings.** 모든 스타일·변수·상수는 JS
   모듈에서 import한다. 프로젝트 전역 magic string을 만들지 않는다.
9. **One small file over many smaller files.** CSS를 lazy-load 하지 않는다.
   단일 최적화 CSS 번들을 앞서 로드하는 것이 INP에 유리하다.

## Authoring rules

```tsx
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
  container: {
    display: "flex",
    alignItems: "center",
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
});

function Component() {
  return <div {...stylex.props(styles.container)} />;
}
```

- **Longhand 우선.** multi-value shorthand(`margin: "8px 4px"`)보다 longhand
  (`marginBlock`, `marginInline` 등)를 쓴다. 단일 값 shorthand는 허용.
- **Unset은 `null`.** `margin: null` 로 스타일을 제거한다.
- **길이 기본 단위는 px.** 숫자는 px로 해석된다.
- **조건부 스타일은 JS 표현식.**

```tsx
<div
  {...stylex.props(
    styles.base,
    isActive && styles.active,
    variant === "primary" ? styles.primary : styles.secondary,
  )}
/>
```

- **`style`/`className` prop으로 받는 스타일**은 `stylex.props(styles.card, style)`
  형태로 로컬 스타일 뒤에 둬서 override를 허용한다. 타입은
  `StyleXStyles`/`StyleXStylesWithout`을 쓴다.
- **Pseudo-class는 속성값 안에 중첩.** top-level에 두지 않는다. `default` 키가
  필수다 (기본값이 없으면 `null`).

```tsx
button: {
  backgroundColor: {
    default: "lightblue",
    ":hover": "blue",
    ":active": "darkblue",
    ":disabled": "gray",
  },
}
```

- **Pseudo-element는 namespace top-level key.** `"::placeholder": {...}` 형태.
- **`:first-child`/`:nth-child`보다 JS 조건을 선호** (CSS 번들 크기).
  `::before`/`::after`보다 실제 HTML 요소를 선호 (접근성).
- **Media query는 속성값 안에 중첩, `default` 필수.** 앱 공용 브레이크포인트는
  `stylex.defineConsts()`로 공유한다.

```tsx
padding: {
  default: 8,
  "@media (min-width: 768px)": 16,
},
```

- **동적 스타일은 arrow function.** `bar: (width: number) => ({ width })`.
- **`defineConsts` vs `defineVars`:** 테마/런타임 override가 필요 없으면
  `defineConsts`, 필요하면 `defineVars`. 둘 다 `.stylex.ts` 파일에 named export
  단독으로만 둔다 (다른 export 금지). 테마는 `stylex.createTheme()`.
- **Fallback:** `stylex.firstThatWorks("sticky", "-webkit-sticky", "fixed")`.
- **Keyframes:** `stylex.keyframes({...})` 후 `animationName`에 참조.
- **관계 선택자:** `.marked:hover .btn` 형태의 `stylex.when.*` API는 그 대상
  요소에 명시적 class(`btn`)가 있을 때만 동작한다.

## Antipatterns (금지)

- `stylex.create` 안에 StyleX가 아닌 값을 import해 넣지 않는다
  (`import { PADDING } from "./constants"` 금지 — `tokens.stylex` 사용).
- `stylex.props(...)`를 spread한 요소에 `className`/`style` prop을 같이 쓰지
  않는다. **단, repo의 legacy parity 패턴은 예외(아래).**
- Media query / pseudo-class를 style object top-level에 두지 않는다.

## Repo-specific integration (Yona)

### 파일/명명

- 화면 단위 스타일은 `-route-name.stylex.ts` (예: `-issues.stylex.ts`)에 둔다.
- 색상 등 화면 공용 값은 `-route.stylex.ts`의 `export const routeColors` 형태로
  관리한다.
- `.stylex.ts` 파일은 named export만, `defineVars`/`defineConsts` 용도 외에는
  다른 파일에서 재사용 가능한 style object도 named export로 공유한다.

### data-stylex-owner 마커

- e2e canonicalizer가 스타일 토큰을 제거하므로, 화면 구조 식별은 class가 아닌
  `data-stylex-owner`를 안정적 마커로 사용한다. 값은 kebab-case
  (`global-gnb-search-box`, `project-issue-detail-...`)로 유지한다.
- canonicalizer 계약: 렌더된 DOM에서 `x…` atomic token, `…__…` namespace class,
  `data-style-src`, `data-stylex-owner`는 **DOM 계약이 아니다**. e2e fixture는
  이들을 포함하지 않고 canonicalizer가 양쪽에서 제거한다.

### Legacy class 보존 패턴 (공식 가이드의 명시적 예외)

이 repo는 frozen legacy CSS(`yobi.less`, bootstrap) cascade와 box model을
재현해야 하므로, legacy class를 StyleX class와 함께 렌더링해야 하는 경우가
있다. 이때는 공식 "className 금지" 규칙을 의도적으로 위반한다:

```tsx
<span
  {...stylex.props(styles.menu)}
  className={`user-menu ${stylex.props(styles.menu).className}`}
>
```

규칙:
- legacy class와 stylex class를 병합할 때, **stylex-to-stylex 조합은 `clsx`를
  쓰지 않는다** — 공식 가이드(stylex-authoring.md "Conditional styles" +
  "Don't use `className` with `stylex.props()`")에 따라 조건부/병합은
  `stylex.props(styles.base, isActive && styles.active)` 형태로 처리한다.
  `stylex.props`의 마지막 인자가 이기므로 조건부 override도 그대로 표현된다.
- legacy literal token(예: `user-menu`, `ybtn`, `pull-left`)은 StyleX가
  만들 수 없는 값이므로, 그 token이 필요한 요소에서만 최소한의 문자열 조합을
  쓴다: `` className={`user-menu ${stylex.props(styles.menu).className}`} ``.
  조건부 legacy token(`open`, `active`)은 JS 표현식
  `` className={`${isOpen ? "open" : ""} ${stylex.props(styles.x).className}`} ``로
  처리한다. **`clsx`는 사용하지 않는다** (의존성 금지; template literal + JS
  표현식이 충분하다). 이 병합은 공식 "className 금지" 규칙의 명시적 예외이며
  근거를 주석/provenance에 남긴다.
- `data-stylex-owner`는 그대로 둔다. 순수 stylex 소유 요소에는 className을
  추가하지 않는다 (StyleX verifier + e2e stylex 소유권 spec이 검증).

### 검증 게이트

- `pnpm --dir frontend build`가 StyleX verifier를 실행한다 (unlayered top-level
  CSS rule이 `index-*.css`에 남으면 실패).
- fallback-off 프로파일(`test:e2e:stylex-final`)에서 legacy CSS 없이
  pixel parity를 통과해야 최종 완료로 기록한다. 활성 wave 검증은
  `test:e2e:stylex-fast`로 빠르게 수행한다.
- e2e canonicalizer는 dev-mode 토큰(`x…`, `…__…`, `data-style-src`,
  `data-stylex-owner`)을 양쪽(실제 DOM + 기대 템플릿)에서 동일하게 제거해야
  한다.

## Quick checklist

- [ ] `stylex.create` + `stylex.props`만 사용했는가 (inline style 지양)
- [ ] multi-value shorthand 대신 longhand를 썼는가
- [ ] media/pseudo가 속성값 안에 `default`와 함께 중첩되었는가
- [ ] 조건부/변형은 JS 표현식(boolean/ternary)으로 처리했는가
- [ ] 테마/런타임 override가 필요한 값만 `defineVars`를 쓰는가
- [ ] legacy literal 병합은 최소 문자열 조합으로, 근거를 남겼는가 (clsx 금지)
- [ ] 새 `data-stylex-owner` 마커가 안정적 kebab-case인가
- [ ] `pnpm --dir frontend build` (StyleX verifier)와 fallback-off e2e가 통과하는가
