# Runtime Stack Decision Report

> Status: `superseded`
> This report records the 2026-04-06 stack decision before the Rust pivot. Keep it for historical rationale only. The current canonical implementation path is `yona-rust/`.

Date: 2026-04-06

## Decision

이 문서는 작성 당시 `Go backend + React/TanStack frontend`를 가장 합리적인 경로로 평가했던 기록이다.

현재 기준선은 더 이상 이 결정에 묶이지 않는다. 아래는 당시 판단 근거를 보존하기 위한 historical record다.

1. parity 완료 시점보다 장기 유지보수성과 운영 안정성이 더 중요해졌다.
2. on-prem SFX와 main site Docker/Kubernetes를 함께 고려할 때 Go binary 모델이 더 자연스럽다.
3. `Gitea`/`Forgejo` 같은 강한 reference implementation leverage가 있다.

frontend는 기존 React/TanStack 자산을 최대한 유지하고, backend만 Go로 재구축한다. 최종 배포에서는 frontend dist를 Go binary에 embed 하거나 동일 배포 단위에서 함께 제공한다. internal business API는 `chi + connect-go + Protobuf + connect-query`를 canonical로 둔다.

## Fixed Constraints

- 기능 동등성이 최우선이다.
- 현재 canonical target은 `Go backend + React + TanStack Router + TanStack Query`다.
- DB는 `PostgreSQL`, `MySQL/MariaDB`, `SQLite`를 day 1부터 함께 지원해야 한다.
- Git/SVN은 system executable 기반을 유지한다.
- 배포는 현장별 SFX와 메인 사이트의 Docker/Kubernetes 운영을 함께 고려한다.
- 잦은 scale-out/HPA는 전제하지 않는다.
- parity 이후 최우선 개선은 `live markdown preview`다.

## Candidate Conclusion

1. `Go + React/TanStack` : 1순위
2. `Bun + TypeScript full-stack` : 2순위
3. `Rust + React/TanStack` : 3순위

## Why Go Wins Now

### 1. 장기 유지보수 방향과 더 잘 맞는다

deadline보다 장기 유지보수가 중요하고, Java는 native/SFX와 reflection-heavy driver 문제 때문에 제외됐다. 이 전제에서는 Bun의 가장 큰 장점인 “이미 만든 PoC를 빠르게 살린다”의 비중이 크게 줄어든다.

### 2. 배포 모델이 목표와 맞는다

- 현장형 설치는 Go SFX가 자연스럽다.
- 메인 사이트는 Docker/Kubernetes 운영이 자연스럽다.
- frontend dist embed 모델도 깔끔하다.

### 3. reference implementation leverage가 강하다

- `Gitea`
- `Forgejo`

Go ecosystem에는 Git forge와 issue server를 실제로 오래 운영한 사례가 있다. 이는 단순 라이브러리 풍부함보다 더 강한 근거다.

### 4. VCS 방향과 잘 맞는다

Git/SVN을 직접 라이브러리로 다시 설계하지 않고 executable pattern을 유지하려는 목표와 잘 맞는다.

## Why Bun Falls To Second

Bun/TS는 여전히 강한 후보다.

장점:

- 현재 저장소 자산을 가장 많이 재사용한다.
- React/TanStack + current `tRPC` surface와 가장 가깝다.
- parity 이후 `live markdown preview`를 가장 빠르게 붙일 수 있다.

하지만 현재 우선순위에서는 1위가 아니다.

이유:

- 장기 유지보수성과 운영 안정성 비중이 더 커졌다.
- backend를 결국 Go로 옮길 가능성이 높다면, Bun으로 먼저 전부 완성하는 것은 사실상 두 번 구현에 가깝다.
- 로컬 측정상 Bun Windows SFX는 실행됐지만, 현재 Yona app에서 direct compile caveat가 있었다.

## Why Rust Is Still Third

Rust는 메모리와 효율 면에서는 가장 강하다.

하지만 현재 조건에서는 아래 이유로 3위다.

- 한국 인력풀과 유지보수 부담이 가장 크다.
- frontend를 React/TanStack으로 유지하면 full-stack 통일 이점이 줄어든다.
- `gitoxide`는 강점이지만, 현재 Yona의 Git/SVN executable 정책과 전체 VCS 범위를 바로 대체하진 못한다.

## Database Position

Go DB 계층은 `gorm`보다 `uptrace/bun` 쪽이 현재 조건에 더 적합하다.

이유:

- legacy active record를 그대로 옮기기보다 query를 새로 쓰는 편이 자연스럽다.
- SQL-first 접근이 intent 보존과 query control에 유리하다.
- `gorm`의 charset/overhead 우려를 피하고 싶다는 운영자 요구가 명확하다.

따라서 현재 baseline은 `database/sql` + `uptrace/bun`으로 본다.

## API Transport Position

현재 frontend는 이미 internal business query/mutation과 raw `/api` route가 분리돼 있다.

현재 결론:

- internal business API canonical은 `chi + connect-go + Protobuf + connect-query`
- fallback은 `chi + OpenAPI + Orval`
- `REST + manual TS types`는 현재 surface 규모에서 drift 비용이 커서 canonical로 채택하지 않는다.
- current TS `tRPC` procedure 이름과 input/output shape는 migration input이다.

## VCS Position

- Git도 Go에서 system executable을 사용한다.
- SVN도 같은 executable pattern으로 간다.
- `Gitea`, `Forgejo`는 reference precedent다.
- `Masterminds/vcs`는 참고 자료로 활용한다.

핵심은 라이브러리 선택이 아니라, subprocess timeout/env whitelist/output limit/audit policy를 Yona가 직접 소유하는 것이다.

## Markdown / Live Preview

`live markdown preview`는 parity 이후 최우선 개선이다.

이건 여전히 frontend React/TS를 유지하는 쪽이 유리하다. browser와 server authoritative render 사이의 규칙 drift를 최소화해야 하므로, backend만 Go로 바꾸고 frontend authoring 경험은 유지하는 전략이 가장 자연스럽다.

## Bottom Line

지금 Yona에 필요한 것은 “가장 빨리 현재 PoC를 살리는 언어”가 아니라 “장기 유지보수 관점에서 최종 목적지에 바로 올라타는 언어”다.

그 기준에서는:

- Go가 1위
- Bun/TS가 2위
- Rust가 3위

현재 권장 경로는:

1. React/TanStack frontend 유지
2. backend만 Go로 재구축
3. current TS/tRPC surface를 migration source material로 사용
4. 최종 dist는 Go binary embed 모델로 정리
