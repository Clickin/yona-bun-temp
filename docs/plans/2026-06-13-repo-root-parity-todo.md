Status: Completed execution summary
Date: 2026-06-13

# Repo Root Legacy Parity TODO

This plan records the current repo-root parity estimate and the independent
subagent split for closing the next user-facing legacy Yona gaps. `AGENTS.md`,
`SPEC.md`, and `yona-original/` remain authoritative.

## Current Estimate

Source: `docs/provenance/legacy-porting-progress.md` as of 2026-06-12, checked
against repo-root routes and legacy `yona-original/conf/routes`.

| Scope | Estimate | Notes |
| --- | ---: | --- |
| Full legacy Yona parity | ~50% | Includes all legacy product capability, VCS, PR/review, board, search, notifications, webhooks, admin, migration/import/export, and external API compatibility. |
| Current first-priority conversion scope | ~58% | Excludes explicitly deferred second-priority items such as LDAP, OAuth provider runtime flow, remaining broader SVN edge work, and full production migration hardening. |
| Mechanical SPEC row count | ~49% | Strong app slices exist for auth/workspace/project/issue/VCS/PR/board/search/notification/admin, but many rows remain partial or deferred. |

Interpretation:

- Auth, workspace, project/organization core, issue tracker, board, Git code
  browser, PR/review, search, notifications, webhooks, files, and site admin are
  broad but still partial parity.
- The largest documented gaps remain broader SVN VCC/baseline PROPFIND edge
  completeness, production migration/import hardening, and deferred LDAP/OAuth
  provider runtime flows.
- H2 is intentionally not a Rust runtime dialect. Legacy H2 data goes through
  the standalone Java H2-to-SQLite tool and then the SQLite adopt path.

## Active User-Facing TODO

These items are selected because they are visible legacy routes or route-backed
UI surfaces and can be handled independently. UI/copy/flow must follow
`yona-original/` exactly; do not improve or redesign.

| Priority | Item | Legacy evidence | Owner | Status |
| --- | --- | --- | --- | --- |
| 1 | `/_init` and `/_UIKit` route parity | `yona-original/conf/routes`, `Application.init`, `Application.UIKit`, `welcome/*.scala.html`, `help/UIKit.scala.html` | subagent `019ebec5-b832-72f0-b93b-e0db9b19353c` | completed |
| 2 | `/migration` route shell and migration export route policy | `MigrationApp.java`, `migration/home.scala.html`, `migrationPageLayout.scala.html` | subagent `019ebec5-e4e0-7733-bf09-67846112218d` | completed |
| 3 | Code browser Ajax compatibility for `code/!` routes | `CodeApp.ajaxRequest*`, `code/view.scala.html`, `partial_view_folder.scala.html`, `partial_view_file.scala.html` | subagent `019ebec6-1353-7f33-90f8-4e5bbe964dd1` | completed |

## Deferred / Not In This Batch

| Item | Treatment |
| --- | --- |
| OAuth provider login | Deferred second-priority. Keep unsupported-provider warning state only. |
| LDAP login/runtime auth | Deferred second-priority. Do not implement in this batch. |
| Full external `/-_-api/v1/**` runtime API | Migrator/export descriptor scope only, except already documented app-owned helpers. |
| Full-text/index-backed search | Deferred/search hardening follow-up. Current app search is lightweight parity. |
| Full GFM/Highlight.js breadth | Follow-up only when legacy evidence requires a concrete edge. |
| Full production migration/import hardening | Follow-up beyond current site-admin `yobi-data` import/export and H2-to-SQLite bridge. |
| Broad SVN VCC/baseline PROPFIND edge completeness | VCS follow-up; not a UI 1:1 slice in this batch. |

## Parallelization Rules

- A subagent owns its assigned files while running. The parent does not edit
  those files until the completion signal arrives.
- If a subagent change breaks compilation before it finishes, notify that
  subagent with an interrupt instead of fixing its owned files locally.
- Documentation/status integration belongs to the parent.
- No repeated `wait_agent` polling; rely on subagent completion notifications
  unless the parent is blocked on an immediate result.

## Verification Plan

Focused checks run by subagents or parent:

- `pnpm --dir frontend exec tsc --noEmit` passed.
- `pnpm --dir frontend exec vitest run src/ui-kit-route-parity.spec.tsx src/route-parity.spec.tsx` passed.
- `pnpm --dir frontend build` passed with an existing chunk-size warning.
- `cargo test -p yona-rust-pilot-server --test router_contract legacy_migration -- --nocapture` passed.
- `cargo test -p yona-rust-pilot-server --test assets_contract --no-run` passed after the code Ajax partial-move fix.
- `cargo test -p yona-rust-pilot-server --test assets_contract legacy_init_redirects_home_and_recreates_project_repositories` passed.
- `cargo test -p yona-rust-pilot-server --test code_browser_contract direct_code_ajax_compat_routes_return_legacy_metadata_json` passed.
- `cargo test -p yona-rust-pilot-server --test code_browser_contract direct_code_file_routes_stream_raw_open_and_image_bytes` passed.

Remaining follow-up remains limited to the deferred items above.
