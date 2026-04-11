# API Transport Decision Data Collection

> Status: `superseded`
> This data report reflects the pre-Rust-pivot Go transport evaluation. It remains useful as historical evidence for why the repository explored `chi`/`connect-go`, but the current canonical implementation path is `yona-rust/` and the root mixed code is reference-only.

Date: 2026-04-06

## 목적

이 문서는 Rust pivot 이전에 `chi + connect-go + Protobuf`, `chi + JSON REST + 수동 TS 타입`, `chi + JSON REST + OpenAPI codegen`을 비교하던 당시의 데이터 리포트다.

현재 canonical 결정을 고정하는 문서는 아니다. 지금 읽을 때는 old-stack 근거 수집 기록으로만 사용한다.

## 현재 코드베이스 사실

### 1. 내부 app-facing surface는 이미 넓다

`frontend/src/lib` 기준:

- `*-trpc.ts` 파일 수: `13`
- `t.procedure` 수: `84`
- `createServerFn(...)` 호출 수: `78`

의미:

- 이 앱의 browser-only business query/mutation surface는 작지 않다.
- 따라서 transport 선택에서 “타입 drift 방지”와 “frontend 변경량”은 매우 중요한 기준이다.
- `REST + 수동 TS 타입`은 이 규모에서 유지 비용이 커질 가능성이 높다.

세부 파일:

- `auth-trpc.ts`
- `enrollment-trpc.ts`
- `issue-trpc.ts`
- `label-trpc.ts`
- `me-trpc.ts`
- `milestone-trpc.ts`
- `organization-trpc.ts`
- `posting-trpc.ts`
- `project-trpc.ts`
- `pull-request-trpc.ts`
- `repo-trpc.ts`
- `resource-trpc.ts`
- `search-trpc.ts`

### 2. raw HTTP route도 이미 별도 surface로 존재한다

`frontend/src/routes/api` 기준:

- raw route implementation 파일 수: `20`
- raw route spec 파일 수: `9`

구성:

- assets: `2`
- auth: `3`
- me: `5`
- repos: `7`
- uploads: `1`

구체적 route:

- `/api/uploads`
- `/api/uploads/$uploadId/finalize`
- `/api/assets/$assetId`
- `/api/assets/$assetId/download`
- `/api/auth/$`
- `/api/auth/session`
- `/api/auth/provider/$provider/callback`
- `/api/me/*`
- `/api/projects/$owner/$projectName/repo-id`
- `/api/repos/$repoId/*`
- `/api/repos/$repoId/smart-http/$`

의미:

- Yona는 이미 “모든 것을 하나의 internal RPC로 감싸는 앱”이 아니다.
- uploads, assets, smart-http, OAuth callback 같은 surface는 본질적으로 raw HTTP semantics가 중요하다.
- 따라서 canonical 구조는 `internal business API 1개 + raw route 다수`의 혼합형이 자연스럽다.

### 3. 현재 frontend는 이미 TanStack Router와 가까운 구조다

- `frontend/src/router.tsx`는 `createRouter`와 `setupRouterSsrQueryIntegration`을 직접 사용한다.
- app router는 `QueryClient`와 auth caller를 context에 주입한다.
- 즉, 현재 `TanStack Start`를 제거하더라도 router/query 계층 자체는 이미 독립적인 편이다.

의미:

- `TanStack Router only SPA` 이관은 현실적인 작업이다.
- transport 선택은 frontend 전체 재설계보다 backend boundary 재설계에 더 가깝다.

### 4. 현재 tooling은 아직 Bun 중심이다

root `package.json`:

- `dev`, `build`, `check`, `test`가 `bun run` 기준
- `bun.lock` 존재
- `packageManager` 필드 없음

`frontend/package.json`:

- `dev`는 `bun --bun vite dev`
- `test`도 Bun 호출 포함
- `@tanstack/react-start` 의존 존재

의미:

- frontend를 `Node.js + pnpm + Vite + TanStack Router`로 고정하려면 tooling migration 작업이 별도 필요하다.
- transport 스파이크는 package manager/tooling 이관과 독립적으로 볼 수 있지만, 최종 canonical 고정 전에는 함께 고려해야 한다.

## 공통 baseline spike 결과

비교 후보 3개 모두가 공유해야 하는 최소 전제인 `chi + runtime basepath + raw route 공존`을 별도 스파이크로 먼저 검증했다.

스파이크 경로:

- [tools/api-transport-spike/README.md](/G:/programming/yona/tools/api-transport-spike/README.md)
- [main.go](/G:/programming/yona/tools/api-transport-spike/server/main.go)
- [main_test.go](/G:/programming/yona/tools/api-transport-spike/server/main_test.go)

확인한 사실:

- `chi` 단독으로 business endpoint와 raw HTTP route를 같은 router에서 무리 없이 공존시킬 수 있다.
- `normalizeBasePath()` 단위 테스트가 `/`, `/yona`, `/tools/yona`를 모두 커버한다.
- `go test ./...` 통과
- 실제 runtime에서도 `-base-path=/yona` 기준:
  - `GET /yona/api/session` -> `200`
  - `GET /yona/api/repos/repo-1/smart-http/info/refs` -> `200`

의미:

- `chi`와 runtime basepath 조합은 이번 결정의 blocker가 아니다.
- 따라서 남은 비교의 핵심은 router가 아니라 app-facing business API transport와 codegen/tooling 쪽이다.

## 후보별 실행 증거

### REST + 수동 TS 타입

실행 경로:

- [rest-manual.ts](/G:/programming/yona/tools/api-transport-spike/web/src/rest-manual.ts)

검증 결과:

- baseline JSON server에 대해 정상 동작
- runtime basepath `/yona` 기준에서도 정상 동작
- TanStack Query `queryOptions()`와 수동 fetch wrapper 조합으로 구현 가능
- read + mutation(`updateIssueState`) 모두 성공

대략적 실행 시간:

- local Node script end-to-end 약 `667.7 ms`
- cookie + `X-CSRF-Token`이 필요한 `POST /api/issues/{issueId}/state` mutation도 정상 동작
- rough local runner 시간: 약 `667.7 ms`

대략적 구현 표면:

- manual client 코드: `60` lines

장점:

- 가장 단순하다.
- 디버깅이 가장 직관적이다.

약점:

- 이 단순함은 코드 생성이 없기 때문에 가능한 것이다.
- current Yona의 `84 procedure + 78 createServerFn` 규모에서는 drift 방지 비용이 급격히 커질 가능성이 높다.

### REST + OpenAPI + Orval

실행 경로:

- [spike.openapi.yaml](/G:/programming/yona/tools/api-transport-spike/web/openapi/spike.openapi.yaml)
- [orval.config.ts](/G:/programming/yona/tools/api-transport-spike/web/orval.config.ts)
- [spike-client.ts](/G:/programming/yona/tools/api-transport-spike/web/src/generated/spike-client.ts)
- [rest-openapi.ts](/G:/programming/yona/tools/api-transport-spike/web/src/rest-openapi.ts)

검증 결과:

- `pnpm run generate:openapi` 성공
- generated client로 baseline JSON server 호출 성공
- runtime basepath `/yona` 기준에서도 정상 동작
- manual 경로와 동일한 JSON payload를 받았고 TanStack Query에서 재사용 가능했다
- read + mutation(`updateIssueState`) 모두 성공

대략적 실행 시간:

- local Node script end-to-end 약 `683.6 ms`
- cookie + `X-CSRF-Token`이 필요한 mutation도 generated client로 정상 동작
- rough local runner 시간: 약 `683.6 ms`

대략적 구현 표면:

- 총 `264` lines
- breakdown:
  - spec `95`
  - config `19`
  - fetch mutator `14`
  - generated client `98`
  - runner `38`

장점:

- codegen으로 drift를 줄인다.
- JSON/HTTP 디버깅성이 좋다.

약점:

- internal business API 기준으로는 spec/operation 관리 부담이 있다.
- current TS `tRPC` naming을 자연스럽게 재현하려면 추가 매핑 설계가 필요하다.

### Connect + Protobuf + connect-query

실행 경로:

- [spike.proto](/G:/programming/yona/tools/api-transport-spike/connect/proto/yona/spike/v1/spike.proto)
- [buf.gen.yaml](/G:/programming/yona/tools/api-transport-spike/connect/buf.gen.yaml)
- [main.go](/G:/programming/yona/tools/api-transport-spike/connect/server/main.go)
- [spike.connect.go](/G:/programming/yona/tools/api-transport-spike/connect/gen/go/yona/spike/v1/spikev1connect/spike.connect.go)
- [spike_pb.ts](/G:/programming/yona/tools/api-transport-spike/web/src/generated-connect/yona/spike/v1/spike_pb.ts)
- [spike-SpikeService_connectquery.ts](/G:/programming/yona/tools/api-transport-spike/web/src/generated-connect/yona/spike/v1/spike-SpikeService_connectquery.ts)
- [connect-client.ts](/G:/programming/yona/tools/api-transport-spike/web/src/connect-client.ts)

검증 결과:

- local `buf` + `protoc-gen-go` + `protoc-gen-connect-go` + `protoc-gen-es` + `protoc-gen-connect-query` 조합으로 codegen 성공
- `go test ./...` 통과
- generated TS client + `createConnectTransport` + `createQueryOptions` 조합으로 호출 성공
- runtime basepath `/yona` 기준에서도 정상 동작
- JSON `POST`로 Connect endpoint 직접 호출해도 응답 확인 가능
- read + mutation(`updateIssueState`) 모두 성공

대략적 실행 시간:

- local Node script end-to-end 약 `866.1 ms`
- `callUnaryMethod(..., { headers })`를 이용해 cookie + `X-CSRF-Token`이 필요한 mutation도 정상 동작
- rough local runner 시간: 약 `866.1 ms`

대략적 구현 표면:

- 총 `903` lines
- breakdown:
  - proto `32`
  - buf config `20`
  - server `84`
  - generated Go protobuf `397`
  - generated Go connect `150`
  - generated TS protobuf `166`
  - generated TS connect-query `16`
  - runner `38`

장점:

- `chi`와 충돌하지 않는다.
- generated Go + TS client가 모두 같은 schema에서 나온다.
- `connect-query`가 TanStack Query와 직접 연결된다.
- JSON `curl` 호출도 가능해 디버깅성이 예상보다 나쁘지 않았다.
- read path는 `createQueryOptions`, mutation path는 `callUnaryMethod`로 해결할 수 있어 frontend에서의 역할 분리가 명확하다.

약점:

- toolchain 진입 비용은 세 후보 중 가장 크다.
- generated 코드량이 가장 많다.
- protobuf/buf를 팀 표준으로 받아들여야 한다.
- mutation은 `callUnaryMethod + header injection`으로 해결되지만, 이 지점은 OpenAPI/manual보다 덜 직관적이다.

## 공식 문서에서 확인한 사실

### Connect / Connect Query

Connect 공식 문서와 README에서 확인한 사실:

- Go handler는 plain `net/http` 위에 바로 올라간다.
- Connect protocol은 plain HTTP와 JSON `curl` 호출이 가능하다.
- `@connectrpc/connect-query`는 TanStack Query wrapper를 공식 제공한다.
- TypeScript client는 `fetch`에 가까운 형태로 동작한다.

의미:

- `chi` 선호와 충돌하지 않는다.
- “protobuf를 쓰면 브라우저/디버깅이 불편하다”는 비용이 생각보다 작다.
- 내부 business API에 한정하면 `TanStack Query`와의 결합성이 강하다.

Sources:

- https://connectrpc.com/
- https://connectrpc.com/docs/web/query/getting-started/
- https://raw.githubusercontent.com/connectrpc/connect-go/main/README.md

### Orval / OpenAPI codegen

Orval 공식 문서에서 확인한 사실:

- OpenAPI spec으로부터 type-safe TypeScript client를 생성한다.
- 기본 client는 Fetch 기반이다.
- React Query support를 공식 제공한다.

의미:

- `REST + codegen` 경로의 frontend ergonomics는 생각보다 좋다.
- 따라서 OpenAPI codegen은 “낡은 대안”이 아니라 실제 비교 후보로 충분하다.

Sources:

- https://orval.dev/docs/

### TanStack Router basepath

로컬 설치된 `@tanstack/react-router` 문서에서 확인한 사실:

- router는 `basepath`를 지원한다.
- basepath는 router 내부에서 rewrite처럼 처리된다.
- custom rewrite가 있어도 basepath와 조합된다.

의미:

- runtime config 기반 subdirectory reverse proxy 요구사항은 TanStack Router와 잘 맞는다.
- frontend 쪽에서 basepath를 런타임 주입하는 설계는 도구 제약 때문에 막히지 않는다.

로컬 근거:

- `node_modules/.bun/@tanstack+react-router@1.167.0.../dist/llms/rules/guide.js`

## 비교 관점별 데이터 해석

### 1. 우리 use case에서 manual TS 타입은 가장 불리하다

근거:

- 현재 app-facing surface가 `84 procedure + 78 createServerFn` 수준이다.
- 이 규모에서 Go DTO와 TS 타입을 수동으로 같이 관리하면 drift 리스크가 크다.
- raw route처럼 surface가 적고 HTTP semantics가 분명한 영역은 수동 타입도 가능하지만, internal business API 전체에는 불리하다.

현재 순위:

- 1위 후보 아님

### 2. OpenAPI + Orval은 실전 대안이다

근거:

- OpenAPI를 source of truth로 두면 Go/TS drift를 줄일 수 있다.
- Orval이 Fetch + React Query를 공식 지원한다.
- raw JSON/HTTP 디버깅성이 가장 좋다.
- read와 mutation 모두 generated client로 실제 성공했다.

주의:

- Yona 내부 app-facing API가 browser-only query/mutation 중심이라는 점을 감안하면, path/verb/operation 문서화와 codegen boilerplate는 Connect보다 더 클 수 있다.
- current `tRPC` naming을 얼마나 자연스럽게 옮길지는 별도 spike가 필요하다.

현재 순위:

- 2위 후보

### 3. Connect는 현재 use case와 가장 자연스럽게 맞는다

근거:

- Go 쪽은 `net/http` 위에 그대로 올라간다.
- frontend는 `connect-query`로 TanStack Query를 공식 지원한다.
- JSON `curl` 호출이 가능해서 debugging story가 생각보다 나쁘지 않다.
- current Yona는 external public API보다 internal app API 비중이 훨씬 크다.
- read와 mutation 모두 generated code 기반으로 실제 성공했다.
- basepath `/yona`에서도 generated client와 server가 정상 동작했다.

추가 근거:

- local codegen과 runtime 호출이 이미 성공했다.
- basepath `/yona`에서도 generated client가 정상 동작했다.

주의:

- Protobuf/buf/codegen toolchain을 팀 표준으로 받아들일지 결정해야 한다.
- auth/cookie/CSRF/interceptor 설계는 아직 mutation spike가 남아 있다.

현재 순위:

- 1위 후보

## 현재 시점의 예비 결론

수집된 데이터만 놓고 보면:

1. `chi + connect-go + Protobuf + connect-query`
2. `chi + REST + OpenAPI + Orval`
3. `chi + REST + manual TS types`

순으로 적합하다.

이 결론은 아직 최종 확정이 아니다. 하지만 현재 Yona의 surface 규모, raw route 분리 상태, TanStack Query 사용 방식, reverse proxy 요구사항, 그리고 실제 local spike 성공 여부를 함께 보면 Connect가 가장 유력한 1차 후보라는 근거는 충분히 모였다.

현재까지의 practical reading:

- manual은 가장 짧지만 scale이 커질수록 drift 리스크가 너무 크다.
- OpenAPI는 안정적이고 디버깅성이 좋으며, fallback으로 매우 강하다.
- Connect는 toolchain 비용이 가장 크지만 current use case 기준에서 Query integration과 internal API 적합성이 가장 좋다.

추가 해석:

- `manual`과 `OpenAPI`의 runtime 성능 차이는 이 스파이크에서는 거의 의미 있는 수준으로 벌어지지 않았다.
- `Connect`는 local runner 시간이 더 길었지만, 이 수치는 codegen/generated object shape와 Node-side harness 비용을 포함한 것으로 transport 자체의 definitive benchmark로 보기 어렵다.
- 현재 단계에서는 raw timing보다 contract coherence와 frontend integration shape가 더 중요한 판단 근거다.

## 아직 필요한 추가 데이터

최종 canonical 고정을 위해 아래 spike가 남아 있다.

### 필수 spike

- `readCurrentSession`
- `listProjects`
- `readIssueDetail`

각 후보에 대해 아래를 실제로 비교해야 한다.

- frontend 변경량
- generated client 사용감
- cookie-session 전달
- CSRF 적용 난이도
- domain error -> wire error mapping
- basepath `/` / `/yona` mount 동작
- 브라우저 devtools와 `curl` 디버깅성

### 최종 결정 전에 확인할 것

- Connect에서 auth/cookie/interceptor 설계가 current Yona flow와 맞는지
- OpenAPI + Orval에서 current query key/invalidation 패턴을 얼마나 보존할 수 있는지
- basepath 런타임 주입과 generated client base URL 구성이 얼마나 깔끔한지
- mutation 하나를 넣었을 때 Connect와 REST 경로의 CSRF/auth/debugging 차이가 어떻게 드러나는지

## Sources

### 로컬

- [package.json](/G:/programming/yona/package.json)
- [frontend/package.json](/G:/programming/yona/frontend/package.json)
- [router.tsx](/G:/programming/yona/frontend/src/router.tsx)
- [queries.ts](/G:/programming/yona/frontend/src/lib/queries.ts)

### 공식 문서

- https://connectrpc.com/
- https://connectrpc.com/docs/web/query/getting-started/
- https://raw.githubusercontent.com/connectrpc/connect-go/main/README.md
- https://orval.dev/docs/
