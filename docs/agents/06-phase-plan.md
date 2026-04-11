# 06) Phase 계획

## Phase 0: Rust Pivot 정리

- former Rust pilot 경로를 `yona-rust/` canonical workspace로 승격
- root canonical 문서와 `docs/agents/*` mirror를 Rust 기준으로 재작성
- `docs/provenance/*` owner/target/current baseline을 Rust 기준으로 갱신
- historical 문서에 status banner와 Rust pivot 이후 설명 추가

## Phase 1: 신원과 핵심 소유권

- auth
- workspace
- organization
- project

## Phase 2: 이슈 추적

- issue CRUD
- comments
- labels
- milestones
- attachments

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
- 누락 기능은 각 phase의 follow-up item으로 남겨야 한다.
