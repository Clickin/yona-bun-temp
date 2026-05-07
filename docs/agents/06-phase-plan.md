# 06) Phase 계획

## Phase -1: refactor temp development

- 목적: REST pivot 이후 기존 임시 개발 내역을 새 canonical SPEC에 맞춰 재기준화한다.
- 신규 기능 phase를 시작하기 전에 완료해야 하는 선행 phase다.
- 구현 상태: `/api/v1` REST JSON + TanStack Query + typed frontend API client 기준으로 기존 application flows가 재기준화되었고, runtime ConnectRPC registration 및 frontend ConnectRPC dependencies는 제거되었다.
- `proto/`는 REST pivot 이전 message schema snapshot으로만 남기며 새 application API contract나 runtime surface로 취급하지 않는다.
- Phase 2/3에서 이미 구현된 issue, label, milestone, organization issue list, user issue list, code browser 흐름은 기능 의미를 유지하되 API/client 경계와 문서/provenance를 REST pivot 기준으로 다시 맞춘다.
- legacy direct form routes, file routes, Git/SVN transport routes, `/-_-api/v1/**` external compatibility routes는 application REST API와 분리해 보존/재구현 여부를 판단한다.
- 종료 조건:
  - `SPEC.md`, `docs/agents/*`, `README.md`, provenance 문서가 REST pivot과 충돌하지 않는다.
  - frontend server state가 TanStack Query provider/client/hook 경계로 이동한다.
  - implemented application flows가 `/api/v1/**` REST endpoint를 통해 동작한다.
  - frontend/server runtime RPC references가 제거되어 있다.
  - Phase 1~3의 기존 parity tests 또는 동등한 REST/route/Playwright tests가 통과한다.

## Phase 0: Rust Pivot 정리

- former Rust pilot 경로를 `repo root` canonical workspace로 승격
- root canonical 문서와 `docs/agents/*` mirror를 Rust 기준으로 재작성
- `docs/provenance/*` owner/target/current baseline을 Rust 기준으로 갱신
- historical 문서에 status banner와 Rust pivot 이후 설명 추가

## Phase 1: 신원과 핵심 소유권

- auth
- workspace
- organization
- project

## Phase 2: 이슈 추적

- Phase 2A complete: issue CRUD, comments, state mutation, watch/vote/assignee, mass update, Markdown rendering, and issue/comment attachment binding on Rust canonical stack.
- Phase 2B complete: project issue label/category management screens, REST CRUD, legacy direct label/category routes, and label CSS.
- Phase 2C complete: milestone management screens/REST CRUD, legacy direct mutation routes, state toggles, issue aggregation, Markdown description rendering, and milestone attachment binding.
- Phase 2E complete: core issue sharer read/comment ACL, REST share/unshare by login ID, and issue detail sharer sidebar controls.
- Phase 2F complete: organization issue listing body parity with visible-project aggregation, core filters, and organization shell route.
- Phase 2G complete: favorite issue toggle/detail projection and `/user/issues` personal aggregate list with assigned/authored/commented/mentioned/shared/favorite quick filters.
- Phase 2H complete: REST issue comment vote/unvote, legacy direct comment-vote POST route compatibility, comment voter projection, issue detail comment-row controls, and direct/inherited sharer ACL coverage.
- Phase 2J complete: issue detail assignee autocomplete/search over `/api/v1/owners/:owner/projects/:project/issues/:number/assignable-users`, with legacy visibility rules, current-assignee inclusion, and existing assignment mutation fallback.
- Phase 2K complete: issue create/edit assignee autocomplete/search over `/api/v1/owners/:owner/projects/:project/assignable-users`, with project-scoped visibility rules and unchanged create/update assignment mutation semantics.
- Remaining Phase 2 packets: legacy external `/-_-api/v1` issue API parity, sharable autocomplete/sharer notification follow-ups, mention creation/autocomplete/notification semantics, and Phase 6 label copy flow.

## Phase 3: 저장소와 VCS

- Phase 3A complete: read-only Git code browser with existing repo detection, no-head state, branch selector, breadcrumbs, folder entries, and text file view.
- smart HTTP
- commit discussion
- VCS flows

## Phase 4: 풀 리퀘스트와 리뷰

- PR lifecycle
- reviewer rules
- review thread lifecycle
- merge and conflict handling

## Phase 5: 검색, 보드, 알림, 연동

- search
- board
- notifications
- integrations

## Phase 6: 관리자 기능과 하드닝

- admin surface
- migration tooling
- deployment hardening
- remaining deferred scope review

## Phase Gate 규칙

- phase 종료 기준은 UI completeness가 아니라 legacy parity와 provenance completeness다.
- 같은 Phase에 남은 `gap`은 phase 종료 blocker다.
- phase를 종료하려면 해당 기능을 구현하거나, 이후 Phase/deferred로 재분류하고 root canonical 문서, provenance, phase plan에 사유를 남긴다.
- 누락 기능은 재분류된 phase의 follow-up item으로 남겨야 한다.
