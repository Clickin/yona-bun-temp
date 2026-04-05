# 06) Phase 계획

## Phase 0A: 아키텍처 리셋

산출물:

- `apps/app`를 React SPA 기준으로 정리
- `cmd/yona` Go server scaffold
- static embed 배포 baseline
- Go auth/session baseline
- Go DB baseline (`uptrace/bun`)과 3개 DB 연결 검증
- VCS executable baseline 고정
- current TS `tRPC` surface inventory

완료 기준:

- frontend build output을 Go에서 서빙할 수 있다.
- Go app이 부팅된다.
- SQLite/PG/MySQL 최소 연결이 검증된다.
- auth/session baseline이 작동한다.
- asset/VCS route baseline이 검증된다.

## Phase 0B: 레거시 + TS 번역 골격

산출물:

- legacy test inventory table
- current TS backend surface inventory
- feature-to-legacy-test mapping baseline
- feature-to-current-TS-surface mapping baseline
- provenance template
- auth/ACL/issue/project/PR/git/search exemplar translation

완료 기준:

- implementer가 대응 legacy source와 current TS source를 바로 찾을 수 있다.
- 최소 exemplar set이 Red -> Green trace를 가진다.
- TS -> Go translation rule이 문서화된다.

## Phase 1: 신원과 핵심 소유권

- 사용자 인증 흐름
- 사용자 작업공간 기본선
- 조직/프로젝트 기본선
- 조직/프로젝트 가입 요청 기본선
- ACL 핵심
- 아바타/로고 asset 흐름

## Phase 2: 이슈 추적

- 이슈 CRUD
- 댓글
- 라벨
- 마일스톤
- 첨부파일
- watch/vote/share
- markdown authoring과 authoritative render baseline

## Phase 3: 저장소와 VCS

- 저장소 브라우저
- raw 파일 route
- 인라인 편집
- 커밋 토론 / 스레드 생명주기
- smart HTTP
- SVN baseline

## Phase 4: 풀 리퀘스트와 리뷰

- PR 생명주기
- 리뷰어 규칙
- 리뷰 스레드
- 병합 동작

## Phase 5: 검색, 보드, 연동 전송

- 범위 제한 검색
- 보드
- 알림
- 인바운드 메일박스 / 이메일 답장
- 연동 전송
- Slack / Google Chat adapter

## Phase 6: 관리자 기능, 마이그레이션, LLMO 하드닝

- 관리자 도구
- 마이그레이션 도구
- `llms.txt`
- AI datasource endpoint
- 배포 하드닝
- parity 이후 `live markdown preview`

## Phase Gate 규칙

- phase 종료 기준은 UI completeness가 아니라 behavior parity와 provenance completeness다.
- AI surface는 Phase 6 범위이며 초기 phase blocker로 취급하지 않는다.
