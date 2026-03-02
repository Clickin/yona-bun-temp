# 03) 리포 구조 (모노레포 스타일)

- `yona-original/`: 기존 Yona 원본 레퍼런스 (git ignore 대상, read-only).
- `apps/web/`: SvelteKit SSR, Storybook, Playwright E2E, Carta 설정.
- `packages/api/`: Hono app (도메인별 sub-app).
- `packages/core/`: 도메인 모델 + 유스케이스 + VcsService Port.
- `packages/infra/`: DB/VCS/FS 구현체.
- `tools/h2-migrator/`: H2 -> SQLite 이관 CLI.
- `tools/i18n-parser/`: `conf/messages` -> Paraglide 변환.

## 주의사항

- `yona-original/`은 로컬 참조 전용이며 수정/커밋 금지.
