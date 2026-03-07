# AGENTS.md: Yona

## Canonical Order

- `SPEC.md`는 이 저장소의 canonical execution spec이다.
- `docs/agents/*.md`는 `SPEC.md`를 에이전트 실행 관점으로 요약한 운영 mirror다.
- `docs/workflow/*`는 문서가 명시적으로 현재 규칙이라고 선언하지 않는 한 historical artifact로 본다.
- 하위 문서가 `SPEC.md`와 충돌하면 `SPEC.md`를 따르고, 하위 문서를 즉시 갱신한다.

## Project Goal

- Yona를 `TanStack Start + React + Bun` 기반의 단일 애플리케이션으로 전면 재작성한다.
- 목표는 issue tracker 축소판이 아니라 legacy Yona behavior parity다.
- 배포는 일반 Bun 실행, `bun compile` 기반 SFX, Docker를 모두 지원한다.

## Fixed Decisions

- 현재 `SvelteKit + Hono` 코드는 target baseline이 아니라 migration source material이다.
- 내부 앱 read/mutation은 `createServerFn`, 외부/프로토콜 endpoint는 server route가 canonical이다.
- 인증 프레임워크는 `Better Auth`를 우선 사용하되, canonical identity, ACL, audit, domain permission은 Yona가 직접 소유한다.
- DB session persistence는 금지한다. 기본은 in-memory session이며 `Redis/Valkey` secondary storage를 허용한다.
- `PostgreSQL`, `MySQL/MariaDB`, `SQLite`를 day 1부터 동등한 지원 대상으로 취급한다.
- 새 schema/query는 처음부터 3개 DB를 함께 고려해 작성한다. 특히 timestamp, FTS, raw SQL은 dialect 차이를 명시적으로 검토한다.
- Git/SVN 연동은 system executable만 사용한다.
- user-uploaded asset은 Yona-controlled route로만 전달한다.
- `llms.txt`와 AI datasource endpoint는 Phase 6 hardening 범위로 취급한다.
- notification/integration delivery 같은 async 작업은 Bun process 내부의 별도 worker 경로에서 처리한다.

## Execution Rules

- 작업 전 관련 `SPEC.md` 섹션과 `docs/agents/*` 요약 문서를 먼저 확인한다.
- 구현 전 대응 legacy route/test/model을 `yona-original/`에서 식별한다.
- failing Red test 없이 Green 구현부터 시작하지 않는다.
- 새 ownership은 `apps/app`, `packages/auth`, `packages/contracts`, `packages/db`, `packages/domain`, `packages/integrations`, `packages/i18n`, `packages/ui`, `packages/vcs`에 둔다.
- `apps/web`, `packages/api`, `packages/core`, `packages/infra`는 extraction/deletion 대상이므로 새 장기 ownership을 추가하지 않는다.
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
