# RC Release Scope

Status: current RC cut line
Date: 2026-06-23

This RC is not the modern-product roadmap. The first release goal is a
user-invisible replacement: if an administrator swaps legacy Yona for the Rust
port, normal users should not notice a functional, route, copy, or UX
difference. RC work is limited to that replacement guarantee plus stability
guards that prevent legacy failure modes from taking the service down.

## RC Blockers

| Scope                         | RC rule                                                                                                                                        | Evidence                                                                               |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Legacy MariaDB in-place adopt | Existing legacy MariaDB data must pass `validate_only`, then `adopt`, without treating validation as a write path.                             | `pnpm smoke:legacy-mariadb-dump`; `.agent/legacy-dumps/yona-dump.sql` remains ignored. |
| Supported DB matrix           | SQLite, PostgreSQL, and MariaDB/MySQL migration/search smoke must stay green.                                                                  | `db_matrix_env` / `db_matrix_testcontainers` with `--features db-matrix`.              |
| Release packaging             | Single binary and Docker image must serve the embedded frontend and REST API.                                                                  | `pnpm smoke:embedded-assets`; `pnpm smoke:docker`.                                     |
| Markdown stability            | Pathological Markdown must not crash the app. Very long fenced code blocks render as escaped plain source instead of syntax-highlighted spans. | `frontend/src/markdown-renderer.spec.tsx` long SQL fenced-block regression.            |
| Legacy page baseline          | Existing curl HTML page audit remains the UI parity baseline for RC.                                                                           | `pnpm smoke:legacy-html-pages` plus route/spec/anchor/e2e-render coverage smokes.      |

## Not In This RC

- Search ranking/product UX redesign.
- External search engines beyond DB-native FTS/query plus literal fallback.
- Mattermost or new Slack-compatible client integration.
- New calendar/schedule management beyond existing issue/milestone behavior.
- Markdown renderer rewrite, workerization, or server-side prerendering.

Those are post-RC product roadmap items.
