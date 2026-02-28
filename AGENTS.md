# AGENTS.md: Yona → SvelteKit SSR(Bun) + Hono Type-Contract 포팅 마스터플랜

> **문서 목적:** 이 문서는 Yona 포팅 프로젝트에 참여하는 모든 AI 서브 에이전트와 개발자가 준수해야 하는 최고 수준의 아키텍처 헌법이자 실행 가이드라인입니다. 모든 에이전트는 코드 생성 전 반드시 이 문서를 숙지해야 합니다.

> **변경 이력**
> - v7: Git 이력 분리 및 `yona-original` 레퍼런스 격리
> - v8: 다중 서브 에이전트 병렬 작업을 위한 `git worktree` 개발 파이프라인 도입
> - v9: 프론트엔드 아키텍처 확립 (Svelte 5 Runes, shadcn, Tailwind v4, Carta 등)
> - **v10(최종):** 공식 `AGENTS.md` 지정 및 프론트엔드 에이전트를 위한 View-First 마크업 번역 전략(Scala 템플릿 → Svelte/Tailwind) 추가

---

## 0) 목표와 고정 의사결정

### 목표
- Yona를 **SvelteKit SSR + Bun** 기반으로 재개발한다.
- 런타임은 **단일(Bun)**, 배포는 **Bun SFX 생성**을 포함한다.
- 제품은 소규모 사내팀(≤100명) 이슈 트래커 중심으로 최적화한다.

### 고정 의사결정(변경 금지)
- **프론트엔드 스택:** Svelte 5 (Runes 전용), Tailwind CSS v4, `shadcn-svelte`.
- **다중 에이전트 병렬 개발:** 서브 에이전트들은 `git worktree`로 생성된 물리적으로 격리된 디렉토리/브랜치에서 병렬로 작업하여 간섭을 없애고 개발 기간을 단축한다.
- **Git 포크(Fork) 금지 및 이력 분리:** 이 프로젝트는 기존 Yona의 포크가 아닌 완전한 신규 포팅이다.
- **TDD (Red-Green) 강제:** 구현보다 **테스트 명세(Vitest)를 먼저 작성**하고 통과시킨다.
- **Git 조작(libgit2):** 사전 컴파일된 Shared Library를 `bun:ffi`(`dlopen`)로 로드한다.
- **SVN 조작:** FFI를 배제하고, `Bun.spawn` 기반의 외부 `svn` CLI 호출 방식을 고정한다.
- **Hono 1급 시민 채택**: 도메인별 sub-app 분할 강제. tRPC 미도입.
- **DB 드라이버는 `Bun.SQL` + Drizzle ORM `1.0.0-rc` 확정.**

---

## 1) 프론트엔드 아키텍처 (View Layer)

SvelteKit은 SSR 및 뷰 렌더링을 전담하며, 아래의 엄격한 기술 스택을 따른다.

1.  **UI 컴포넌트 & 스타일링:** `shadcn-svelte` + Tailwind CSS v4. 아이콘은 `lucide-svelte`로 마이그레이션. Storybook으로 UI 카탈로그 관리.
2.  **상태 관리 (Svelte 5):** 기존 Svelte 4 문법 전면 금지. **Svelte 5 Runes (`$state`, `$derived`, `$effect`, `$props`)**만 사용.
3.  **폼 핸들링:** **`sveltekit-superforms`** + Zod.
4.  **마크다운 에디터:** **`BearToCode/carta`**.
5.  **다국어 (i18n):** **`Paraglide JS`**. 기존 `conf/messages` 파싱 후 자동 변환.
6.  **코드 품질 관리:** **`oxlint`**와 **`oxfmt`** 강제.

---

## 2) 테스트 주도 마이그레이션 아키텍처

1.  **단위/통합 테스트 (Vitest):**
    * Play Controller 테스트 ➡️ Hono API 통합 테스트
    * Ebean Model 테스트 ➡️ Drizzle Schema / Core Domain 테스트
    * Service 테스트 ➡️ Usecase 단위 테스트
2.  **E2E 테스트 (Playwright):** 주요 유저 플로우 브라우저 관점 검증.

---

## 3) 리포 구조(모노레포 스타일)

- `yona-original/` : **[Git Ignore 대상]** 기존 Yona 원본 소스코드 (레퍼런스)
- `apps/web/` : SvelteKit SSR, Storybook, Playwright E2E 테스트, Carta Editor 설정
- `packages/api/` : Hono app (도메인별 sub-app)
- `packages/core/` : 도메인 모델 + 유스케이스 + VcsService Port
- `packages/infra/` : DB/VCS/FS 구현체
- **`packages/libgit2-ffi/`** : 사전 컴파일 C 래퍼(`wrapper.c`) 및 TS 바인딩. 
- `tools/h2-migrator/` : H2→SQLite 이관 CLI
- `tools/i18n-parser/` : Yona `conf/messages` → Paraglide 변환 스크립트

---

## 4) 아키텍처 가드레일(위반 금지)

**G1) 레이어 책임:** SvelteKit은 뷰 SSR 전담. DB/Drizzle/VCS 직접 호출 금지.
**G2) Hono Type-Contract:** `packages/api`의 Hono app 타입이 유일한 API 계약.
**G3) Hybrid SSR 운영 모델:** 기본은 `+page.ts`. 세션/비밀정보만 `+page.server.ts`.
**G4) DTO 직렬화 규약:** JSON-only 고정.
**G5) 마크다운 렌더링 규약:** SSR 우선 렌더링.
**G6) VCS는 프로젝트별 DI 주입:** 개별 프로젝트 단위로 Git/SVN 선택.

---

## 5) 🎯 [Agent Execution Guidelines & Samples]

이 섹션은 AI 서브 에이전트가 코드를 작성할 때 반드시 지켜야 할 프롬프트 수칙입니다.

### G-A) 프론트엔드 에이전트: View-First 마크업 번역 전략
프론트엔드 개발 시 백엔드 API 완성을 기다리지 않고, `yona-original/app/views/`의 Scala 템플릿(`.scala.html`)을 기반으로 독립적인 마크업 번역을 수행합니다.
1. **의미론적 구조(Semantic) 100% 존중:** 기존 Yona 마크업의 레이아웃, 태그 계층, 폼 구조 등 UX 흐름을 그대로 가져옵니다.
2. **템플릿 문법 치환:** `@if` ➡️ `{#if}`, `@for` ➡️ `{#each}`, `@messages` ➡️ Paraglide `m.key()`.
3. **스타일링 언어 번역:** 기존 커스텀 CSS 클래스는 시각적으로 동일한 결과를 내는 **Tailwind CSS v4 유틸리티 클래스**로 전면 치환합니다. 버튼/드롭다운 등은 `shadcn-svelte` 컴포넌트로 교체합니다.
4. **Mock 데이터 활용:** 컴포넌트 최상단에 `$state`로 Mock 데이터를 선언하여 UI 인터랙션을 우선 검증합니다.
5. **Svelte 5 Runes 강제:** Svelte 4 문법(`export let`, `$:` 등)을 절대 사용하지 마십시오.

### G-B) 백엔드/도메인 에이전트: 레퍼런스 조회 및 TDD 작성 지침
1. **의미 기반 번역:** `yona-original/`의 Java 테스트/비즈니스 코드를 분석하여, `Vitest` 형식의 실패하는 테스트(Red)를 우리의 새로운 아키텍처에 맞게 먼저 작성합니다.
2. **구현 및 리팩토링:** 테스트를 통과(Green)시키기 위한 로직을 작성합니다.

### G-C) Worktree 기반 병렬 작업 규칙
1. 서브 에이전트는 할당된 `git worktree` 경로에서만 작업을 수행합니다.
2. `yona-original/` 경로의 파일은 **Read-Only**로만 접근하여 도메인 행위를 분석합니다.

### G-D) libgit2 FFI 메모리 안전성 강제 (RAII 패턴)
TS 래퍼 클래스는 반드시 `[Symbol.dispose]()`를 구현하고, 서비스 레이어에서는 `using` 키워드를 사용하여 메모리 누수를 방어합니다.

### G-E) SVN CLI 호출 제약
SVN 연동 시 FFI 시도를 절대 금지합니다. 반드시 `Bun.spawn`을 사용하여 래핑합니다.

---

## 6) Phase 계획 (Vertical Slice)

### Phase 0 (Test Spec Translation & Foundation)
- `yona-original/test/` 분석 및 Vitest 테스트 명세 대량 생성 (TDD 기반 마련).
- Storybook 기반 Yona 컬러 팔레트/테마 UI 시스템 구축.
- Yona `messages` 파일을 Paraglide 포맷으로 변환.

### Phase 1 (MVP)
- **TDD 사이클 적용:** 계정, 프로젝트/이슈/게시판 CRUD 로직 구현.
- **View-First 개발:** 이슈 목록/상세 페이지 마크업 Svelte/Tailwind 번역 (`sveltekit-superforms` + `Carta` 연동).
- **인프라:** Drizzle RC+Bun.SQL, libgit2 FFI 레이아웃 확립.

### Phase 2 & 3
- Phase 2: Git 통합(libgit2 브라우징), SVN CLI 연동. S3 첨부파일 통합. OAuth2.
- Phase 3: 검색 엔진(FTS), PR/코드리뷰, LDAP.