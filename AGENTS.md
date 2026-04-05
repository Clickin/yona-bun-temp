# AGENTS.md: Yona

## 변환 원칙 (Conversion Principles) — 최우선

**이 프로젝트는 기능 변환 프로젝트다. 새로운 구조를 제안하는 프로젝트가 아니다.**

1. **기능 동등성만이 목표다.** 레거시 Yona가 제공하는 동일한 기능을 동일한 UX로 구현한다.
2. **1:1 기술적 대응이 아니다.** Play controller -> 특정 Go handler/RPC 매핑 같은 기술적 대응이 아니라, 사용자 관점에서 동일한 기능과 경험을 제공하는 것이 목표다.
3. **새로운 구조를 제안하지 않는다.** 기능 구현에 필요한 최소 구조만 사용한다. 아키텍처 개선, 새로운 패턴, 추상화 제안은 변환 완료 후에만 검토한다. 여기서 "최소 구조"란 `SPEC.md` Section 3의 고정 결정에 명시된 구조를 의미한다.
4. **기존 UI/UX를 그대로 구현한다.** 화면, 레이블, 동선, 기능은 `yona-original`을 기준으로 한다. "개선"을 이유로 임의로 변경하지 않는다.
5. **에이전트의 역할은 구현이다.** "더 나은 구조를 설계하는 것"이 아니라 "기존 기능을 새 스택으로 구현하는 것"이다.

### 우선순위 분리

| 순위  | 범위                                                                                     | 시기         |
| ----- | ---------------------------------------------------------------------------------------- | ------------ |
| 1순위 | 레거시 Yona 핵심 기능 동등 구현 (인증, 프로젝트, 이슈, 보드, PR/리뷰, 검색, 알림, 관리)  | 현재         |
| 2순위 | SVN, LDAP, Import/Export, 마이그레이션 도구 등 구현 난이도가 높거나 우선순위가 낮은 기능 | 변환 완료 후 |
| 3순위 | 아키텍처 개선, 성능 최적화, 새로운 기능 추가                                             | 개선 단계    |

> **"변환 완료" 기준:** `SPEC.md` Section 19 Definition of Done 충족 시.

### 명시적 금지

- `SPEC.md` Section 3의 고정 결정에 명시된 구조 외의 새로운 패턴/추상화 제안 금지
- 레거시에 없는 기능을 "개선"이라는 이름으로 추가하는 행위 금지
- 기존 UI/UX를 "개선"한다는 이유로 임의로 변경하는 행위 금지
- 변환 범위를 벗어난 아키텍처 논의 금지

## Canonical Order

- `AGENTS.md`는 에이전트 실행 규칙의 메인 source of truth다.
- 이 문서의 **변환 원칙**은 `SPEC.md`를 포함한 모든 문서에 우선한다.
- `SPEC.md`는 기술적 상세의 canonical execution spec이다.
- `docs/agents/*.md`는 이 문서와 `SPEC.md`를 에이전트 실행 관점으로 요약한 운영 mirror다.
- `docs/workflow/*`는 문서가 명시적으로 현재 규칙이라고 선언하지 않는 한 historical artifact로 본다.
- 하위 문서가 변환 원칙 또는 `SPEC.md`와 충돌하면 변환 원칙 -> `SPEC.md` 순으로 우선하고, 하위 문서를 즉시 갱신한다.

## Project Goal

- Yona를 `Go + React + TanStack Router + TanStack Query` 기반의 단일 배포 단위 애플리케이션으로 전면 재작성해 레거시 Yona의 기능을 동일한 UX로 변환 구현한다.
- 목표는 issue tracker 축소판이 아니라 legacy Yona functional parity와 UX parity다.
- 배포는 OS별 단일 실행 파일(SFX)과 Docker/Kubernetes를 모두 지원한다.

## Fixed Decisions

- 현재 `SvelteKit + Hono` 코드와 현재 `Bun + TanStack Start + tRPC` 코드는 모두 migration source material이다. target baseline이 아니다.
- 프런트엔드 baseline은 `React + TanStack Router + TanStack Query` SPA다. 빌드 산출물은 단일 Go 배포 단위에 static embed 하거나 동일한 배포 아티팩트에서 함께 제공한다.
- 백엔드 baseline은 하나의 Go 애플리케이션이며, app-facing read/mutation은 Go HTTP/RPC endpoint로 제공한다.
- 현재 TS `tRPC` procedure 이름과 input/output shape는 migration input이다. 가능한 경우 frontend call site 보존을 위해 tRPC-compatible Go adapter를 우선 검토한다.
- `github.com/befabri/trpcgo`는 현재 frontend `@trpc/client`/`@trpc/react-query` call site를 가장 적게 흔드는 호환성 spike 후보로 본다. `github.com/trpc-group/trpc-go`는 강한 Go RPC 프레임워크이지만 현재 TS tRPC client의 drop-in replacement로 가정하지 않는다.
- 외부/프로토콜 endpoint는 Go HTTP route가 canonical이다.
- 인증과 세션은 Yona가 직접 소유한다. DB session persistence는 금지한다. 기본은 secure cookie 또는 in-memory session이며 `Redis/Valkey` secondary storage를 허용한다.
- `PostgreSQL`, `MySQL/MariaDB`, `SQLite`를 day 1부터 동등한 지원 대상으로 취급한다.
- 새 schema/query는 처음부터 3개 DB를 함께 고려해 작성한다. 특히 timestamp, FTS, raw SQL은 dialect 차이를 명시적으로 검토한다.
- Go 데이터 접근의 baseline은 `database/sql` 위의 `uptrace/bun` 계층으로 둔다. legacy active record를 번역하는 과정에서 query를 새로 작성할 수 있다면 SQL-first 접근을 우선한다.
- Git/SVN 연동은 system executable만 사용한다.
- user-uploaded asset은 Yona-controlled route로만 전달한다.
- `llms.txt`와 AI datasource endpoint는 Phase 6 hardening 범위로 취급한다.
- notification/integration delivery는 기본적으로 같은 Go process 안에서 처리하고, polling, retry chain, CPU-bound work처럼 분리가 필요한 경우에만 별도 runtime 경로를 둔다.

## Execution Rules

- 작업 전 이 문서의 변환 원칙, 관련 `SPEC.md` 섹션, `docs/agents/*` 요약 문서를 먼저 확인한다.
- `brv`/ByteRover CLI는 반드시 sandbox 바깥 shell에서 실행한다. sandbox 안에서의 실패를 기준으로 `brv` 상태를 판단하지 말고, 먼저 sandbox 바깥에서 재시도한 뒤 결과를 기록한다.
- 구현 전 대응 legacy route/test/model과 기존 UI/UX 기준을 `yona-original/`에서 식별한다.
- 구현 전 현재 TS/TanStack/tRPC 경로도 함께 읽고 migration source material로 활용한다.
- failing Red test 없이 Green 구현부터 시작하지 않는다.
- 새 ownership은 `apps/app`, `cmd/yona`, `internal/auth`, `internal/db`, `internal/domain`, `internal/httpapi`, `internal/integrations`, `internal/search`, `internal/vcs`, `packages/contracts`, `packages/i18n`, `packages/ui`에 둔다.
- 현재 `packages/auth`, `packages/db`, `packages/domain`, `packages/integrations`, `packages/vcs`, `apps/app/src/lib/*-trpc*`는 migration source material이다. 새 장기 backend ownership을 추가하지 않는다.
- `apps/web`, `packages/api`, `packages/core`, `packages/infra`는 extraction/deletion 대상이므로 새 장기 ownership을 추가하지 않는다.
- 변환 완료 전에는 기능 구현에 필요한 최소 구조만 사용하고, 추가 구조/패턴 제안은 하지 않는다.
- legacy와 의도적으로 달라지는 의미가 있으면 deviation을 문서화한다.

## Document Index

- `docs/agents/00-goals-and-fixed-decisions.md`
- `docs/agents/01-frontend-architecture.md`
- `docs/agents/02-testing-migration.md`
- `docs/agents/03-repo-structure.md`
- `docs/agents/04-architecture-guardrails.md`
- `docs/agents/05-agent-execution-guidelines.md`
- `docs/agents/06-phase-plan.md`
- `docs/agents/07-bun-sfx-deployment.md`
- `docs/agents/08-sveltekit-deployment-strategy.md`
- `docs/agents/09-llm-onboarding-checklist.md`
- `docs/agents/10-legacy-provenance-baseline.md`
