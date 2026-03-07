# 02) 테스트 주도 마이그레이션 아키텍처

## 핵심 원칙

- 테스트 전략은 behavior-first이면서 legacy-provenance-first다.
- 구현자는 먼저 legacy source를 읽고 intent를 추출한 뒤 failing Red test를 작성한다.
- legacy build/test runtime을 실제로 재현하는 것은 선택 사항이고, semantic intent extraction이 필수다.
- legacy semantics와 다른 결정을 했다면 deviation을 남긴다.

## 계층 매핑 규칙

- Play controller test -> server function test 또는 server route test
- Play model test -> domain test
- `AccessControlTest` 류 -> domain ACL test + route authorization test
- `playRepository` test -> protocol integration test
- end-user flow -> Playwright E2E

## 필수 provenance

각 feature 또는 테스트 묶음은 최소한 아래를 남긴다.

- source legacy path
- extracted intent summary
- modern translation target layer
- intentionally dropped semantics
- newly introduced TS-only semantics

권장 템플릿:

```md
Legacy source:

- yona-original/test/controllers/IssueAppTest.java
- yona-original/test/models/IssueTest.java

Intent:

- nonmember cannot edit others' issue
- author/assignee/manager/admin can edit

Modern translation:

- domain permission test
- server-function authorization test

Deviation:

- typed redirect contract로 검증
```

## DB / Query 검증 규칙

- schema, migration, search, timestamp behavior는 `PostgreSQL`, `MySQL/MariaDB`, `SQLite` 모두에서 검증한다.
- datetime, FTS, raw SQL을 포함하는 change는 dialect별 행동을 문서화하거나 테스트로 고정한다.
- dialect-neutral Drizzle abstraction을 사용하더라도 작성자는 3개 DB parity를 명시적으로 점검해야 한다.

## Hard Gate

- primary legacy reference가 식별되어 있어야 한다.
- failing Red test가 먼저 존재해야 한다.
- Green 구현 후 translation target layer별 테스트가 통과해야 한다.
- legacy source가 없는 경우에만 spec-derived test를 단독 근거로 사용할 수 있다.

## Legacy 실행 재현 규칙

- `yona-original`의 test/controller/model/fixture를 읽고 의미를 추출하는 것은 필수다.
- legacy Java build, sbt 대체 환경, 로컬 라이브러리 배치까지 재현해서 원본 테스트를 실행하는 것은 필수 요구사항이 아니다.
- 원본 실행은 intent가 애매하거나 fixture/side effect 해석이 불충분할 때만 추가 증거로 검토한다.

## 우선 exemplar

- user workspace: favorite/recent/default landing page
- org/project enrollment request와 cancel, guest-only/idempotent/response contract
- commit discussion과 thread lifecycle
- inbound mailbox를 통한 issue/comment/review 생성
