# 02) 테스트 주도 마이그레이션 아키텍처

## 핵심 원칙

- 테스트 전략은 behavior-first이면서 legacy-provenance-first다.
- 구현자는 먼저 legacy source를 읽고 intent를 추출한 뒤 failing Red test를 작성한다.
- current TS implementation도 migration source material로 읽고, Go translation의 비교 기준으로 활용한다.
- legacy semantics와 다른 결정을 했다면 deviation을 남긴다.

## 계층 매핑 규칙

- Play controller test -> Go handler/API contract test 또는 protocol route test
- Play model test -> domain test
- `AccessControlTest` 류 -> domain ACL test + route authorization test
- `playRepository` test -> protocol integration test
- end-user flow -> Playwright E2E

## 필수 provenance

각 feature 또는 테스트 묶음은 최소한 아래를 남긴다.

- source legacy path
- extracted intent summary
- current TS source path
- modern Go translation target layer
- intentionally dropped semantics

## DB / Query 검증 규칙

- schema, migration, search, timestamp behavior는 `PostgreSQL`, `MySQL/MariaDB`, `SQLite` 모두에서 검증한다.
- Go query baseline은 `uptrace/bun`이지만, ORM 선택보다 3개 DB parity가 우선이다.
- datetime, FTS, raw SQL을 포함하는 change는 dialect별 행동을 문서화하거나 테스트로 고정한다.

## Hard Gate

- primary legacy reference가 식별되어 있어야 한다.
- failing Red test가 먼저 존재해야 한다.
- Green 구현 후 translation target layer별 테스트가 통과해야 한다.
- legacy source가 없는 경우에만 spec-derived test를 단독 근거로 사용할 수 있다.

## 우선 exemplar

- user workspace: favorite/recent/default landing page
- org/project enrollment request와 cancel
- commit discussion과 thread lifecycle
- inbound mailbox를 통한 issue/comment/review 생성
- current TS `auth-trpc`, `project-trpc`, `issue-trpc`, `pull-request-trpc`, `repo-trpc` surface를 Go handler/API contract로 재번역하는 첫 migration test
