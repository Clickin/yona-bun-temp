# AGENTS.md: Yona → SvelteKit SSR(Bun) + Hono Type-Contract 포팅 마스터플랜

> **문서 목적:** 이 문서는 Yona 포팅 프로젝트에 참여하는 모든 AI 서브 에이전트와 개발자가 준수해야 하는 최고 수준의 아키텍처 헌법이자 실행 가이드라인입니다. 모든 에이전트는 코드 생성 전 반드시 이 문서를 숙지해야 합니다.

> **변경 이력**
>
> - v7: Git 이력 분리 및 `yona-original` 레퍼런스 격리
> - v8: 다중 서브 에이전트 병렬 작업을 위한 `git worktree` 개발 파이프라인 도입
> - v9: 프론트엔드 아키텍처 확립 (Svelte 5 Runes, shadcn, Tailwind v4, Carta 등)
> - **v10(최종):** 공식 `AGENTS.md` 지정 및 프론트엔드 에이전트를 위한 View-First 마크업 번역 전략(Scala 템플릿 → Svelte/Tailwind) 추가
> - **v11(최신):** Git backend를 git executable로 변경, Session을 in-memory로 변경, DB 다이얼렉트 지원(Postgres/MySQL/SQLite), Import 컨벤션 일원화

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
- **Git 조작:** 시스템 `git` executable 경로를 사용한다. `libgit2-ffi`는 이 작업 패키지 범위 제외.
- **SVN 조작:** FFI를 배제하고, `Bun.spawn` 기반의 외부 `svn` CLI 호출 방식을 고정한다.
- **Hono 1급 시민 채택**: 도메인별 sub-app 분할 강제. tRPC 미도입.
- **DB 드라이버:** `Bun.SQL` + Drizzle ORM `1.0.0-rc`\*\* 확정. 다이얼렉트 지원(Postgres/MySQL/SQLite)을 `drizzle-orm/bun-sql`로 통합.

### Overrides / Decisions (Session: monorepo-sessions-bunsql-multidialect)

- **Monorepo adoption is mandatory:** `apps/web`, `packages/api`, `packages/core`, `packages/infra`, `tools/*`.
- **Git backend choice:** 시스템 `git` executable path 사용. `packages/libgit2-ffi`는 이 작업 패키지 범위 제외.
- **Session management:** DB session 배제. in-memory session storage 사용 (Redis/Valkey는 나중에 동일한 추상화 뒤에 추가 가능).
- **DB runtime access:** Bun.SQL with Drizzle `drizzle-orm/bun-sql` 사용. Postgres/MySQL/SQLite 세 다이얼렉트 선택 가능.
- **Schema parity:** 모든 다이얼렉트 스키마 모듈에서 동일한 table name, column name, nullability, index/unique index definitions, foreign key 참조 대상과 onDelete/onUpdate 시맨틱스 유지.

### Schema parity bar

- Table names and column names must be equivalent across Postgres/MySQL/SQLite schema modules.
- Nullability must match per column across all dialect schema modules.
- Index and unique index definitions (name + indexed columns + uniqueness) must match across dialects.
- Foreign keys must preserve referenced targets and onDelete/onUpdate semantics (SQLite onUpdate caveat is handled explicitly in parity tests/app layer).
- Timestamp semantics must preserve Date at TypeScript boundary (PG `timestamp`, MySQL `datetime`, SQLite `integer({ mode: 'timestamp' | 'timestamp_ms' })`).

### References

- Drizzle bun-sql multi-dialect context: https://github.com/drizzle-team/drizzle-orm/issues/4937#issuecomment-3707293427
- Bun SQL runtime documentation: https://bun.com/docs/runtime/sql
- Bun SQL SQLite filename reference: https://bun.com/reference/bun/SQL/SQLiteOptions/filename

### Overrides / Decisions (Session: user-authentication)

- **OAuth providers:** GitHub OAuth, Google OAuth, Email/Password (세 제공자 모두 필수).
- **Email verification:** Registration 시 이메일 인증 불필요. 이메일은 비밀번호 재설정 전용으로만 사용.
- **Email usage:** SMTP 미설정 시 auth 시스템 비활성화 (단, OAuth는 이메일 자동 검증).
- **Password reset:** admin-driven flow. admin 사용자가 모든 사용자의 비밀번호 재설정 가능.
- **Account linking:** OAuth 로그인은 기존 이메일 계정에 자동 연결 (한 n4user가 여러 OAuth 제공자 보유 가능).
- **Session cookies:** HttpOnly, SameSite=Lax (개발), Secure (프로덕션).

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
    - Play Controller 테스트 ➡️ Hono API 통합 테스트
    - Ebean Model 테스트 ➡️ Drizzle Schema / Core Domain 테스트
    - Service 테스트 ➡️ Usecase 단위 테스트
2.  **E2E 테스트 (Playwright):** 주요 유저 플로우 브라우저 관점 검증.

---

## 3) 리포 구조(모노레포 스타일)

- `yona-original/` : **[Git Ignore 대상]** 기존 Yona 원본 소스코드 (레퍼런스)
- `yona-original/` must stay local-only read-only reference data; agents must never modify or commit its contents.
- `apps/web/` : SvelteKit SSR, Storybook, Playwright E2E 테스트, Carta Editor 설정
- `packages/api/` : Hono app (도메인별 sub-app)
- `packages/core/` : 도메인 모델 + 유스케이스 + VcsService Port
- `packages/infra/` : DB/VCS/FS 구현체
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

**G7) 세션 관리:** DB session 배제. in-memory session 또는 redis/valkey session 제공. 단일 instance의 경우 in-memory session으로 충분하지만 높은 동시성을 위해서는 redis session 사용을 권장. 특정한 기준선은 정하지 않고 테스트 후 결정하도록 설정.

**G8) Import 컨벤션(팀 고정 규칙):**

- 패키지 경계(import across packages)는 반드시 `@yona/*` 사용 (`@yona/core`, `@yona/api`, `@yona/infra`).
- 앱 내부 소스 참조는 `@web/*` 또는 SvelteKit 기본 alias(`$lib`, `$app`) 사용.
- 루트 스키마/설정 참조는 `@drizzle/*` 사용.
- `../../../` 형태의 깊은 상대경로 import는 금지(동일 디렉토리/인접 파일의 짧은 상대경로만 허용).
- 새 코드 작성 시 alias 우선, 기존 코드 수정 시 상대경로를 alias로 함께 정리.

---

## 5) 🎯 [Agent Execution Guidelines & Samples]

이 섹션은 AI 서브 에이전트가 코드를 작성할 때 반드시 지켜야 하는 프롬프트 수칙입니다.

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

### G-D) Git backend 전략

**시스템 git executable 사용:**

- Git 연동은 시스템에 설치된 `git` executable을 호출하는 방식으로 구현합니다.
- `packages/libgit2-ffi` 패키지는 이 작업 범위 제외합니다.
- `packages/infra/src/git/executable.ts`에서 `child_process.spawn('git', ...)`을 사용하여 Git CLI를 래핑합니다.
- `packages/infra/src/git/index.ts`에서 Git 기능을 export하여 `@yona/infra` 패키지로 제공합니다.

**Git HTTP backend (전용):**

- Git http-backend는 전용 레이어로만 사용합니다.
- web inline edit, commit creation, branch protection 등은 application mutation 레이어에서 처리합니다.
- 이 방식은 clone/fetch/push 등 repository 전송 작업에 사용하지 않습니다.

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
- **인프라:** Drizzle RC+Bun.SQL, git executable backend 레이아웃 확립.

### Phase 2 & 3

- Phase 2: Git 통합(git executable 브라우징), SVN CLI 연동. S3 첨부파일 통합. OAuth.
- Phase 3: 검색 엔진(FTS), PR/코드리뷰, LDAP.

---

## 7) Bun SFX (Single-File Executable) 배포 가이드

### 7-1) Cross-Compilation 지원

`--target` 플래그를 사용하여 현재 머신과 다른 OS, 아키텍처, Bun 버전용 실행 파일을 컴파일할 수 있습니다.

**지원되는 타겟:**

| --target             | 운영체제 | 아키텍처 | Modern | Baseline | Libc  |
| -------------------- | -------- | -------- | ------ | -------- | ----- |
| bun-linux-x64        | Linux    | x64      | ✅     | ✅       | glibc |
| bun-linux-arm64      | Linux    | arm64    | ✅     | N/A      | glibc |
| bun-windows-x64      | Windows  | x64      | ✅     | ✅       | -     |
| bun-windows-arm64    | Windows  | arm64    | ✅     | N/A      | -     |
| bun-darwin-x64       | macOS    | x64      | ✅     | ✅       | -     |
| bun-darwin-arm64     | macOS    | arm64    | ✅     | N/A      | -     |
| bun-linux-x64-musl   | Linux    | x64      | ✅     | ✅       | musl  |
| bun-linux-arm64-musl | Linux    | arm64    | ✅     | N/A      | musl  |

**Baseline vs Modern:**

- `baseline` (nehalem): 2013년 이전 CPU 지원, 더 호환성 높음
- `modern` (haswell): 2013년 이후 CPU 전용, 더 빠름
- x64 플랫폼에서 AVX2 SIMD 최적화를 위해 modern 권장 (단, 오래된 서버에서는 baseline 사용)

**CLI 예시:**

```bash
# Linux x64 (표준)
bun build --compile --target=bun-linux-x64 ./index.ts --outfile yona-server

# Linux x64 baseline (오래된 서버용)
bun build --compile --target=bun-linux-x64-baseline ./index.ts --outfile yona-server

# Windows x64
bun build --compile --target=bun-windows-x64 ./index.ts --outfile yona.exe

# macOS ARM64 (Apple Silicon)
bun build --compile --target=bun-darwin-arm64 ./index.ts --outfile yona-server

# Linux ARM64 (Graviton/Raspberry Pi)
bun build --compile --target=bun-linux-arm64 ./index.ts --outfile yona-server
```

**JavaScript API:**

```typescript
await Bun.build({
  entrypoints: ["./index.ts"],
  compile: {
    target: "bun-linux-x64",
    outfile: "./yona-server",
  },
});
```

### 7-2) 정적 리소스 임베딩 (Embed Assets)

`with { type: "file" }` import attribute를 사용하여 이미지, JSON 설정, 템플릿 등의 정적 파일을 실행 파일에 직접 임베드할 수 있습니다.

**기본 사용법:**

```typescript
// 이미지 파일 임베드
import icon from "./public/icon.png" with { type: "file" };
import { file } from "bun";

// 읽기 (Buffer, Text, Blob)
const bytes = await file(icon).arrayBuffer();
const text = await file(icon).text();
const blob = file(icon);

// HTTP 서버에서 스트리밍
export default {
  fetch(req) {
    return new Response(file(icon), {
      headers: { "Content-Type": "image/png" },
    });
  },
};
```

**JSON 설정 파일 임베드:**

```typescript
import configPath from "./default-config.json" with { type: "file" };
import { file } from "bun";

const defaultConfig = await file(configPath).json();
```

**디렉토리 임베드 (glob 패턴):**

```bash
# CLI: public 디렉토리의 모든 PNG 파일 임베드
bun build --compile ./index.ts ./public/**/*.png --outfile yona-server
```

**SQLite DB 임베드 (읽기 전용):**

```typescript
import myEmbeddedDb from "./my.db" with { type: "sqlite", embed: "true" };

// 임베드된 DB는 읽기-쓰기 가능하지만, 프로세스 종료 시 변경 사항이 손실됨
console.log(myEmbeddedDb.query("select * from users LIMIT 1").get());
```

**정적 라우트 자동 생성 (Bun.serve):**

```typescript
import "./public/favicon.ico" with { type: "file" };
import "./public/logo.png" with { type: "file" };
import { embeddedFiles, serve } from "bun";

// 모든 임베드된 파일로 정적 라우트 생성
const staticRoutes: Record<string, Blob> = {};
for (const blob of embeddedFiles) {
  const name = blob.name.replace(/-[a-f0-9]+\./, "."); // 해시 제거
  staticRoutes[`/${name}`] = blob;
}

serve({
  static: staticRoutes,
  fetch(req) {
    return new Response("Not found", { status: 404 });
  },
});
```

### 7-3) Full-Stack Executable (서버 + 클라이언트)

서버 코드에서 HTML 파일을 import하면 Bun이 자동으로 프론트엔드 자산(JS, CSS 등)을 번들하고 실행 파일에 임베드합니다.

**예시:**

```typescript
// server.ts
import { serve } from "bun";
import index from "./index.html"; // HTML import

const server = serve({
  routes: {
    "/": index, // 자동 번들된 프론트엔드 자산 제공
    "/api/hello": { GET: () => Response.json({ message: "Hello from API" }) },
  },
});
```

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
  <head>
    <title>Yona</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <h1>Yona Issue Tracker</h1>
    <script src="./app.ts"></script>
  </body>
</html>
```

**빌드:**

```bash
bun build --compile ./server.ts --outfile yona-server
```

결과는 서버 코드, Bun 런타임, 모든 프론트엔드 자산(HTML, CSS, JS), npm 패키지를 포함하는 단일 실행 파일입니다.

### 7-4) 프로덕션 배포 최적화

**권장 빌드 명령어:**

```bash
bun build --compile --minify --sourcemap --bytecode ./path/to/server.ts --outfile yona-server
```

**플래그 설명:**

| 플래그        | 설명                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------- |
| `--minify`    | 코드 최소화. 대규모 앱에서 수 MB 크기 절약.                                                                         |
| `--sourcemap` | zstd로 압축된 소스맵 임베드. 에러/스택트레이스가 원본 위치를 가리킴. **버그 리포트 시 원본 코드 위치 파악에 필수.** |
| `--bytecode`  | 바이트코드 컴파일. 파싱 오버헤드를 빌드타임으로 이동하여 2배 빠른 시작시간.                                         |

**JavaScript API:**

```typescript
await Bun.build({
  entrypoints: ["./path/to/server.ts"],
  compile: {
    outfile: "./yona-server",
  },
  minify: true,
  sourcemap: "linked",
  bytecode: true,
});
```

**빌드타임 상수 주입 (`--define`):**

```bash
bun build --compile \
  --define BUILD_VERSION='"1.0.0"' \
  --define BUILD_TIME='"2024-03-01T00:00:00Z"' \
  ./server.ts --outfile yona-server
```

### 7-5) 빌드 자동화 스크립트

`package.json`에 다중 타겟 빌드 스크립트 추가:

```json
{
  "scripts": {
    "build:sfx": "bun build --compile --minify --sourcemap --bytecode ./apps/web/index.ts --outfile dist/yona-server",
    "build:sfx:linux": "bun build --compile --minify --sourcemap --bytecode --target=bun-linux-x64 ./apps/web/index.ts --outfile dist/yona-server-linux",
    "build:sfx:linux-arm": "bun build --compile --minify --sourcemap --bytecode --target=bun-linux-arm64 ./apps/web/index.ts --outfile dist/yona-server-linux-arm",
    "build:sfx:windows": "bun build --compile --minify --sourcemap --bytecode --target=bun-windows-x64 ./apps/web/index.ts --outfile dist/yona-server.exe",
    "build:sfx:darwin-arm": "bun build --compile --minify --sourcemap --bytecode --target=bun-darwin-arm64 ./apps/web/index.ts --outfile dist/yona-server-darwin-arm"
  }
}
```

### 7-6) 런타임 설정

**환경 변수:**

- `.env` 및 `bunfig.toml` 로딩은 기본적으로 활성화됨
- 배포 시 결정적 실행을 위해 `--no-compile-autoload-dotenv` 및 `--no-compile-autoload-bunfig` 사용 가능

**BUN_OPTIONS로 런타임 플래그 전달:**

```bash
# 프로파일링 활성화 (재컴파일 불필요)
BUN_OPTIONS="--cpu-prof" ./yona-server

# 여러 플래그 조합
BUN_OPTIONS="--smol --cpu-prof-md" ./yona-server
```

**런타임 인자 임베딩 (`--compile-exec-argv`):**

```bash
bun build --compile --compile-exec-argv="--smol --user-agent=YonaBot" ./server.ts --outfile yona-server
```

### 7-7) GitHub Actions를 이용한 Cross-Compile Release

Linux runner에서 모든 플랫폼을 cross-compile하여 자동으로 release를 생성합니다. `.github/workflows/release.yml`에 워크플로우를 추가하세요.

**GitHub Actions Workflow 예시:**

```yaml
name: Build and Release

on:
  push:
    tags:
      - "v*"
  workflow_dispatch:

permissions:
  contents: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Build for Linux x64
        run: bun build --compile --minify --sourcemap --bytecode --target=bun-linux-x64 ./apps/web/index.ts --outfile dist/yona-server-linux-x64

      - name: Build for Linux x64 (baseline)
        run: bun build --compile --minify --sourcemap --bytecode --target=bun-linux-x64-baseline ./apps/web/index.ts --outfile dist/yona-server-linux-x64-baseline

      - name: Build for Linux ARM64
        run: bun build --compile --minify --sourcemap --bytecode --target=bun-linux-arm64 ./apps/web/index.ts --outfile dist/yona-server-linux-arm64

      - name: Build for Linux ARM64 (musl)
        run: bun build --compile --minify --sourcemap --bytecode --target=bun-linux-arm64-musl ./apps/web/index.ts --outfile dist/yona-server-linux-arm64-musl

      - name: Build for Windows x64
        run: bun build --compile --minify --sourcemap --bytecode --target=bun-windows-x64 ./apps/web/index.ts --outfile dist/yona-server.exe

      - name: Build for Windows x64 (baseline)
        run: bun build --compile --minify --sourcemap --bytecode --target=bun-windows-x64-baseline ./apps/web/index.ts --outfile dist/yona-server-baseline.exe

      - name: Build for Windows ARM64
        run: bun build --compile --minify --sourcemap --bytecode --target=bun-windows-arm64 ./apps/web/index.ts --outfile dist/yona-server-arm64.exe

      - name: Build for macOS ARM64
        run: bun build --compile --minify --sourcemap --bytecode --target=bun-darwin-arm64 ./apps/web/index.ts --outfile dist/yona-server-darwin-arm64

      - name: Build for macOS x64
        run: bun build --compile --minify --sourcemap --bytecode --target=bun-darwin-x64 ./apps/web/index.ts --outfile dist/yona-server-darwin-x64

      - name: Make executables executable
        run: |
          chmod +x dist/yona-server-*

      - name: Generate checksums
        run: |
          cd dist
          sha256sum * > SHA256SUMS.txt
          md5sum * > MD5SUMS.txt

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            dist/yona-server-linux-x64
            dist/yona-server-linux-x64-baseline
            dist/yona-server-linux-arm64
            dist/yona-server-linux-arm64-musl
            dist/yona-server.exe
            dist/yona-server-baseline.exe
            dist/yona-server-arm64.exe
            dist/yona-server-darwin-arm64
            dist/yona-server-darwin-x64
            dist/SHA256SUMS.txt
            dist/MD5SUMS.txt
          draft: false
          prerelease: ${{ contains(github.ref, 'alpha') || contains(github.ref, 'beta') || contains(github.ref, 'rc') }}
          generate_release_notes: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Release 정책:**

1. **트리거**: Git tag (`v*`)를 push하거나 `workflow_dispatch`로 수동 실행
2. **빌드 플랫폼**: 단일 Linux runner에서 모든 플랫폼 cross-compile
3. **배포 파일**:
   - Linux x64 (modern, baseline)
   - Linux ARM64 (glibc, musl)
   - Windows x64/ARM64 (modern, baseline)
   - macOS ARM64/x64
   - SHA256SUMS.txt, MD5SUMS.txt (무결성 검증용)
4. **Prerelease 태그**: `alpha`, `beta`, `rc` 포함 시 자동으로 prerelease로 표시

**사용 방법:**

```bash
# Release 생성
git tag v1.0.0
git push origin v1.0.0

# Prerelease 생성
git tag v1.0.0-beta.1
git push origin v1.0.0-beta.1
```

---

## 8) SvelteKit 배포 전략

Yona의 배포 시나리오에 따라 두 가지 상반된 접근 방식을 제공합니다.

### 8-1) SFX 배포 (단일 실행 파일)

**대상:** 일반 사용자, 온프레미스, 단일 서버 배포

**어댑터:** `@jesterkit/exe-sveltekit` 사용

```javascript
// svelte.config.js
import adapter from "@jesterkit/exe-sveltekit";

export default {
  kit: {
    adapter: adapter({
      embedStatic: true, // 정적 자산을 바이너리에 임베드
      target: "linux-x64", // 크로스-컴파일 타겟
      binaryName: "yona-server",
      volume: "/data", // 지속성 스토리지 마운트 포인트
    }),
  },
};
```

**빌드 및 실행:**

```bash
# 개발
bun run dev

# 프로덕션 빌드 (자동으로 단일 바이너리 생성)
bun run build

# 실행
./dist/yona-server
```

**주요 특징:**

- ✅ **정적 자산 임베딩**: 모든 `public/` 디렉토리 자산이 바이너리에 포함
- ✅ **전체 스택 보존**: SSR, API 라우트, 서버 훅, 서버 사이드 인증
- ✅ **크로스-컴파일 네이티브 지원**: Linux, Windows, macOS, x64/ARM64, baseline/modern
- ✅ **런타임 의존성 없음**: Bun 설치 필요 없이 바이너리 실행 가능
- ✅ **Bun의 공식 `build --compile` API 사용**: 최적화된 SFX 생성

**장점:**

- 🎯 단일 파일 배포 (복사만으로 배포 완료)
- 🚀 빠른 시작 시간 (바이트코드 컴파일)
- 📦 런타임 의존성 없음
- 🔒 Bun의 네이티브 성능 활용

---

### 8-2) Docker 배포 (CI/CD 및 클라우드)

**대상:** CI/CD 파이프라인, 클라우드 플랫폼, 멀티 스테이지 빌드

**어댑터:** `svelte-adapter-bun` 사용 (Bun 공식 권장)

```javascript
// svelte.config.js
import adapter from "svelte-adapter-bun";

export default {
  kit: {
    adapter: adapter({
      out: "build",
      serveAssets: true, // 정적 자산 제공
      precompress: {
        // 압축 활성화
        brotli: true,
        gzip: true,
        files: ["html", "js", "json", "css", "svg", "xml", "wasm"],
      },
    }),
  },
};
```

**Dockerfile 예시:**

```dockerfile
# Multi-stage build for smaller image
FROM oven/bun:latest AS builder
WORKDIR /app

# 의존성 설치
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# 소스 코드 복사
COPY . .

# 프로덕션 빌드
RUN bun run build

# Runtime stage
FROM oven/bun:latest
WORKDIR /app

# 빌드 결과물만 복사 (의존성 제외)
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./package.json

# 환경 변수
ENV NODE_ENV=production
ENV PORT=3000

# 포트 노출
EXPOSE 3000

# 실행
CMD ["bun", "run", "start"]
```

**Docker Compose 예시:**

```yaml
version: "3.8"
services:
  yona:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
    volumes:
      - ./data:/app/data # 지속성 스토리지
    restart: unless-stopped
```

**장점:**

- 🐳 Docker layer caching 활용 (빌드 속도 향상)
- 🔄 CI/CD 친화적 (GitHub Actions, GitLab CI 등)
- 📦 의존성 격리 (reproducible builds)
- 🌐 표준화된 배포 (클라우드 플랫폼 호환)

---

### 8-3) 배포 전략 선택 가이드

| 비교 항목          | SFX 배포                         | Docker 배포                          |
| ------------------ | -------------------------------- | ------------------------------------ |
| **대상**           | 일반 사용자, 온프레미스          | CI/CD, 클라우드                      |
| **어댑터**         | `@jesterkit/exe-sveltekit`       | `svelte-adapter-bun`                 |
| **이점**           | 단일 파일, 런타임 의존성 없음    | Docker layer caching, 표준화된 배포  |
| **단점**           | 크로스 컴파일 시 Bun 런타임 필요 | 이미지 사이즈 큼, 런타임 의존성 있음 |
| **GitHub Actions** | SFX 생성 가능                    | 도커 이미지 빌드 및 푸시             |
| **클라우드 호환**  | 수동 배포 필요                   | 모든 주요 클라우드 지원              |

**추천 사항:**

1. **SFX 배포**:
   - 소규모 팀 (≤100명) 내부 배포
   - 온프레미스 환경
   - 단일 서버 운영
   - 빠른 배포 필요한 경우

2. **Docker 배포**:
   - CI/CD 파이프라인 통합
   - 클라우드 배포 (AWS, GCP, Azure, Vercel 등)
   - 멀티 환경 운영 (dev/staging/prod)
   - 스케일링 필요한 경우

---

### 8-4) GitHub Actions 워크플로우 (이중 배포 지원)

SFX와 Docker 배포를 모두 지원하는 워크플로우 예시:

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]
    tags:
      - "v*"
  workflow_dispatch:

permissions:
  contents: write

jobs:
  # Job 1: SFX 빌드 (일반 사용자용)
  build-sfx:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Build for Linux x64
        run: bun build --compile --minify --sourcemap --bytecode --target=bun-linux-x64 ./dist/index.ts --output dist/yona-server-linux-x64

      - name: Build for Windows x64
        run: bun build --compile --minify --sourcemap --bytecode --target=bun-windows-x64 ./dist/index.ts --output dist/yona-server.exe

      - name: Generate checksums
        run: |
          cd dist
          sha256sum yona-server-* > SHA256SUMS.txt

      - name: Upload SFX artifacts
        uses: actions/upload-artifact@v4
        with:
          name: yona-server-sfx
          path: dist/yona-server-*
          retention-days: 90

  # Job 2: Docker 이미지 빌드 (CI/CD용)
  build-docker:
    runs-on: ubuntu-latest
    needs: build-sfx # SFX 빌드 먼저 완료
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and push Docker image
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: |
            ghcr.io/${{ github.repository }}:latest
            ghcr.io/${{ github.repository }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # Job 3: GitHub Release (SFX만)
  release:
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/v')
    needs: build-sfx
    permissions:
      contents: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Download SFX artifacts
        uses: actions/download-artifact@v4
        with:
          name: yona-server-sfx
          path: dist

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: dist/yona-server-*
          draft: false
          prerelease: false
          generate_release_notes: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

Linux runner에서 모든 플랫폼을 cross-compile하여 자동으로 release를 생성합니다. `.github/workflows/release.yml`에 워크플로우를 추가하세요.
