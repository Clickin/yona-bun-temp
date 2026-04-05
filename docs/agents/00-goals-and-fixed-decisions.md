# 00) 목표와 고정 의사결정

## Canonical Source

- `AGENTS.md`가 에이전트 실행 규칙의 메인 Source of Truth다.
- `AGENTS.md`의 변환 원칙은 `SPEC.md`를 포함한 모든 문서에 우선한다.
- `SPEC.md`는 기술적 상세의 canonical source다.
- 이 문서는 `AGENTS.md`와 `SPEC.md`를 실행 규칙 중심으로 요약한 mirror다.

## 변환 원칙

- 기능 동등성이 유일한 목표다.
- 새 구조 제안이 목적이 아니다.
- UI/UX는 `yona-original` 기준을 유지한다.
- 현재 TS 구현은 버려야 할 적이 아니라 migration source material이다.

## 목표

- Yona를 `Go backend + React + TanStack Router + TanStack Query` 기반으로 전면 재작성한다.
- frontend build output은 최종적으로 Go 배포 단위에 static embed 하거나 동일 배포 단위에서 함께 제공한다.
- 결과물은 OS별 단일 실행 파일(SFX)과 Docker/Kubernetes를 모두 지원해야 한다.

## 고정 의사결정

- **재작성 방식:** 현재 `SvelteKit + Hono`와 현재 `Bun + TanStack Start + tRPC` 구현을 확장하지 않고, Go backend + React frontend target architecture로 명시적으로 전환한다.
- **프런트엔드 모델:** `React + TanStack Router + TanStack Query + Vite` SPA.
- **앱 경계:** frontend read/mutation의 canonical backend boundary는 Go HTTP/RPC endpoint다.
- **tRPC 전환 입장:** 현재 TS `tRPC` procedure 이름과 input/output shape는 migration input이다. frontend call site를 덜 흔들기 위해 tRPC-compatible Go adapter를 우선 검토한다.
- **tRPC Go 후보:** `github.com/befabri/trpcgo`는 호환성 spike 후보다. `github.com/trpc-group/trpc-go`는 별도 Go RPC framework로 보고, current TS client의 drop-in replacement로 가정하지 않는다.
- **인증 경계:** 인증/세션은 Yona가 직접 소유한다. `Better Auth`는 target baseline이 아니다.
- **세션:** DB session persistence는 금지한다. 기본은 secure cookie 또는 in-memory이며 `Redis/Valkey` secondary storage를 허용한다.
- **VCS:** Git/SVN은 system executable 기반으로 유지하고 FFI는 범위 밖이다.
- **VCS 참고 자료:** `Gitea`, `Forgejo`, `Masterminds/vcs`는 참고 자료로만 쓰고, Yona의 subprocess/audit 정책이 source of truth다.
- **DB 런타임:** Go `database/sql` + `uptrace/bun`.
- **지원 DB:** `PostgreSQL`, `MySQL/MariaDB`, `SQLite`를 모두 first-class로 지원한다.
- **Schema parity:** table/column/nullability/index/fk/timestamp semantics는 세 dialect에서 동등해야 한다.
- **Query 작성 규칙:** query를 작성할 때부터 세 dialect를 동시에 고려한다. 특히 datetime, FTS, raw SQL은 dialect 차이를 명시적으로 검토한다.
- **Asset delivery:** user-uploaded asset은 Yona-controlled route로만 제공한다.
- **Plugin model:** arbitrary runtime plugin은 금지하고 out-of-process integration provider만 허용한다.
- **AI surface:** `llms.txt`와 AI datasource endpoint는 Phase 6 hardening 범위로 취급한다.

## 전환 입장

- 현재 `apps/app`은 frontend migration source이자 향후 React SPA ownership 후보다.
- 현재 `packages/auth`, `packages/db`, `packages/domain`, `packages/integrations`, `packages/vcs`, `apps/app/src/lib/*-trpc*`는 backend migration source material이다.
- 장기 backend ownership은 `cmd/yona`와 `internal/*`로 이동한다.

## 참고 자료

- `SPEC.md`
- https://bun.uptrace.dev/
- https://github.com/uptrace/bun
- https://github.com/befabri/trpcgo
- https://github.com/trpc-group/trpc-go
- https://docs.gitea.com/
- https://forgejo.org/
- https://github.com/Masterminds/vcs
