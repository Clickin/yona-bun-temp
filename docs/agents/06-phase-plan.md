# 06) Phase 계획 (Vertical Slice)

## Phase 0 (Test Spec Translation & Foundation)

- `yona-original/test/` 분석 및 Vitest 테스트 명세 대량 생성.
- Storybook 기반 Yona 컬러 팔레트/테마 UI 시스템 구축.
- Yona `messages` 파일을 Paraglide 포맷으로 변환.

## Phase 1 (MVP)

- TDD 사이클로 계정, 프로젝트/이슈/게시판 CRUD 구현.
- View-First 방식으로 이슈 목록/상세 페이지 마크업 Svelte/Tailwind 번역.
- 인프라: Drizzle RC + Bun.SQL, git executable backend 레이아웃 확립.

## Phase 2 & 3

- Phase 2: Git 통합(git executable 브라우징), SVN CLI 연동, S3 첨부파일, OAuth.
- Phase 3: 검색 엔진(FTS), PR/코드리뷰, LDAP.
