# 06) Phase 계획

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
- Phase 2B complete: project issue label/category management screens, RPC CRUD, legacy direct label/category routes, and label CSS.
- Phase 2C complete: milestone management screens/RPC, legacy direct mutation routes, state toggles, issue aggregation, Markdown description rendering, and milestone attachment binding.
- Phase 2E complete: core issue sharer read/comment ACL, ConnectRPC share/unshare by login ID, and issue detail sharer sidebar controls.
- Remaining Phase 2 packets: REST issue/milestone API parity, sharable autocomplete/shared-with-me/sharer notification follow-ups, mention/comment-vote/favorite issue, organization/user aggregate issue lists, and Phase 6 label copy flow.

## Phase 3: 저장소와 VCS

- repository browser
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
