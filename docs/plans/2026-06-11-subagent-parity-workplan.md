Status: Completed execution summary
Date: 2026-06-11

# Subagent Parity Workplan

이 문서는 남은 legacy Yona parity 작업을 subagent가 독립적으로 수행할 수 있는 단위로 정리한다. `AGENTS.md`와 `SPEC.md`의 기능 변환 원칙이 우선이며, 각 task는 legacy 근거를 먼저 확인하고 Rust/React 구현은 기존 ownership 경계 안에서만 수정한다.

## 병렬화 원칙

- 같은 파일 또는 같은 API contract를 두 subagent가 동시에 수정하지 않는다.
- `crates/server` route/API contract 변경은 충돌 위험이 높으므로 한 번에 하나의 worker만 소유한다.
- frontend shell/copy parity 작업은 해당 route/component/test 파일을 명시적으로 소유한 worker에게만 맡긴다.
- 문서/status 조정은 parent agent가 소유한다.
- `H2 compatibility`는 Rust runtime dialect로 구현하지 않는다. H2 DB는 별도 Java tool로 SQLite 파일로 변환하고, Rust는 SQLite adopt 경로만 지원한다.
- subagent 완료 확인은 반복 polling이 아니라 `subagent_notification` 완료 신호를 기준으로 통합/검증한다.

## 실행 순서

### 1. H2 to SQLite one-shot converter

Status: completed

Owner: `tools/h2-to-sqlite/**`

Scope:

- Java CLI로 H2 JDBC URL 또는 DB 파일을 읽고 SQLite DB 파일을 생성한다.
- schema와 row data를 가능한 단순하게 복사한다.
- unsupported H2 type, sequence, trigger, alias/function 등은 README의 limitation으로 명시한다.
- Rust runtime, SeaORM dialect, migration crate는 수정하지 않는다.

Independence: 다른 application feature와 파일 소유권이 겹치지 않는다.

Verification:

- `mvn -f tools/h2-to-sqlite/pom.xml test` passed with 2 smoke tests.

### 2. Legacy external API / migrator inventory

Status: completed read-only inventory

Owner: no writes

Scope:

- `yona-original/conf/routes`와 `yona-original/app/controllers/api/**`에서 `/-_-api/v1/**` legacy API를 domain별로 분류한다.
- 이미 app server에서 직접 제공하는 `hello`, favorite helpers, translation과 migrator/deferred 범위를 분리한다.
- 이후 구현 가능한 worker task를 disjoint write scope로 제안한다.

Independence: read-only라 모든 구현 작업과 병렬 가능하다.

Inventory result:

- App server exceptions already implemented by SPEC decision: `GET /-_-api/v1/hello`, `GET/POST /-_-api/v1/favoriteProjects`, `GET/POST /-_-api/v1/favoriteIssues`, `GET/POST /-_-api/v1/favoriteOrganizations`, and `POST /-_-api/v1/translation`.
- Users/auth token migrator scope: `GET /users`, `POST /users`, `POST /users/token`, `GET /user/issues`, `GET /users/:user/statistics`, `POST /user/defultLoginPage`, `GET /admin/users`, `PATCH /admin/users/:user`.
- Project migrator scope: `GET /owners/:owner/projects/:projectName/exports`, `POST /owners/:owner/projects`, `POST /owners/:owner/projects/:projectName/labels`, `GET /owners/:owner/projects/:projectName/titleHeads`.
- Issue/comment migrator scope: issue import/create/read/update/state/content, comment notification receivers/create/update, label update, assignable users, assignees, sharer search/update, and weight vote endpoints under legacy `IssueApi`.
- Board/post migrator scope: posting create, content update, comment create, and post label update endpoints under legacy `BoardApi`.
- Milestone migrator scope: `POST /owners/:owner/projects/:projectName/milestones`.
- Watcher migrator scope: `GET /owners/:owner/projects/:projectName/posts/:number/watchers`.
- `GET /-_-api/v1/` API index page is nonessential or migrator/deferred; it should not expand the app-facing REST surface.

Follow-up migrator worker split:

- Users/auth-token external API: `crates/migration/src/legacy_external/users.rs`, `crates/migration/tests/legacy_external_users.rs`.
- Project/export/label/titleHeads: `crates/migration/src/legacy_external/projects.rs`, `crates/migration/tests/legacy_external_projects.rs`.
- Issue/comment external API: `crates/migration/src/legacy_external/issues.rs`, `crates/migration/tests/legacy_external_issues.rs`.
- Board/post/comment external API: `crates/migration/src/legacy_external/boards.rs`, `crates/migration/tests/legacy_external_boards.rs`.
- Milestone external API: `crates/migration/src/legacy_external/milestones.rs`, `crates/migration/tests/legacy_external_milestones.rs`.
- Watcher external API: `crates/migration/src/legacy_external/watchers.rs`, `crates/migration/tests/legacy_external_watchers.rs`.

### 3. Search hardening

Status: completed

Suggested owner: `crates/search/**`, `docs/provenance/phase-0b/search.md`, and search-only tests.

Scope:

- app search의 legacy result ordering/snippet coverage를 추가로 고정한다.
- full-text/indexed search가 필요하면 existing `crates/search` 안에서만 최소 구현한다.
- server route shape와 frontend UI를 바꾸지 않는다.

Parallel rule: `crates/server/tests/search_contract.rs`를 수정해야 하면 다른 server-contract worker와 동시에 진행하지 않는다.

### 4. Mail notification format and batching closure

Status: completed

Suggested owner: `crates/integrations/**` plus notification/mail-only server tests.

Scope:

- legacy notification mail body, batching, recipient partitioning, language grouping의 남은 gap을 legacy evidence로 닫는다.
- SMTP config alias나 mailbox polling의 기존 동작을 바꾸지 않는다.

Parallel rule: webhook delivery worker와 동시에 `crates/integrations`를 공유하지 않는다.

### 5. SVN WebDAV edge completeness

Status: completed

Suggested owner: `crates/vcs/**` and `crates/server/tests/svn_protocol_contract.rs`.

Scope:

- 이미 passing인 external `svn` smoke를 유지하면서 남은 broader VCC/baseline `PROPFIND` edge를 좁힌다.
- stock SVN client 검증을 기준으로 한다.

Parallel rule: Smart HTTP/Git worker와 동시에 `crates/vcs`를 공유하지 않는다.

### 6. Admin/migration data management closure

Status: completed

Suggested owner: one of `crates/server` admin/data routes or a separate migrator tool, depending on inventory output.

Scope:

- site-admin data export/import과 legacy external API compatibility 중 app server에 남길 것과 migrator 도구로 분리할 것을 확정한다.
- app internal React API를 `/-_-api/v1/**`로 확장하지 않는다.

Parallel rule: `crates/server` API/router ownership이 필요하므로 다른 server-route worker와 병렬 진행하지 않는다.

Verification note:

- `cargo test -p yoram-server --test site_admin_contract site_admin_export_download_follows_legacy_site_data_route` passed.
- `cargo test -p yoram-server --test site_admin_contract site_admin_import_restores_supported_yobi_data_snapshot_sections` passed.
- `cargo test -p yoram-server --test site_admin_contract site_admin_diagnostics_are_site_admin_only_and_report_legacy_error_list` passed.

### 7. OAuth / LDAP deferred confirmation

Status: completed as deferred documentation only

Scope:

- OAuth와 LDAP는 현재 2차 범위다.
- config parsing, unsupported state, warning behavior만 유지한다.
- provider login 또는 LDAP auth flow를 현재 phase에 구현하지 않는다.

## Subagent execution log

| Agent | Task | Write scope |
| --- | --- | --- |
| H2 converter worker | H2 to SQLite one-shot Java CLI | completed: `tools/h2-to-sqlite/**` |
| External API explorer | Legacy `/-_-api/v1/**` inventory | completed read-only |
| Search worker | Search hardening slice | completed: `crates/search/**`, `docs/provenance/phase-0b/search.md` |
| Integrations worker | Notification mail format/batching closure | completed: `crates/integrations/**` |
| VCS worker | SVN WebDAV edge completeness | completed: `crates/vcs/**` |
| External API provenance worker | Legacy external API provenance document | completed: `docs/provenance/legacy-external-api.md` |
| Server notification worker | Wire integrations mail batching into runtime fan-out | completed: `crates/server/**` notification/mail path |
| Migration scaffold worker | Legacy external API migrator endpoint descriptors | completed first: shared `legacy_external` module scaffold before per-domain descriptor workers |
| Auth deferred doc worker | OAuth/LDAP deferred provenance note | completed: `docs/provenance/auth-deferred-oauth-ldap.md` |
| Admin/data server worker | Admin/data management closure audit and one minimal fix | completed: `crates/server/src/lib.rs`, `crates/server/tests/site_admin_contract.rs` |
| Migration users worker | Legacy external users/auth-token descriptor slice | completed: `crates/migration/src/legacy_external/users.rs` |
| Migration projects worker | Legacy external projects/export descriptor slice | completed: `crates/migration/src/legacy_external/projects.rs` |
| Issue API explorer | Legacy external IssueApi fixture inventory | completed read-only |
| Board/milestone/watcher API explorer | Legacy external BoardApi/MilestoneApi/WatcherApi fixture inventory | completed read-only |
| Remaining gap explorer | Next independent work-package inventory | completed read-only |
| Migration issues worker | Legacy external issues/comment descriptor slice | completed: `crates/migration/src/legacy_external/issues.rs` |
| H2 converter verification worker | Tool-local verification closure | completed: `tools/h2-to-sqlite/**` |
| Webhook signature explorer | Legacy webhook signature evidence audit | completed read-only; no HMAC implementation without external evidence |
| Markdown edge explorer | Remaining Markdown testcase inventory | completed read-only |
| Search deferred doc worker | Search index/full-text deferred evidence note | completed: `docs/provenance/phase-0b/search.md` |
| Migration board/milestone/watcher worker | Legacy external board/milestone/watcher descriptor slices | completed: board/milestone/watcher descriptors and focused migration tests |
| Markdown edge worker | Narrow Markdown legacy edge-case parity | completed: Hangul path autolinks plus collapsed/duplicate reference regression tests |
