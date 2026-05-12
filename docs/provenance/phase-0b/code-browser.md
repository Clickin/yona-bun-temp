# Code Browser Provenance

## Scope

- Phase 3A/3B read-only Git code browser parity slice.
- Covers existing Git repository read paths only: no-head state, branch selector, breadcrumbs, folder listing, text file view, raw file streaming, browser-open file streaming, and image preview streaming.
- Does not cover repository provisioning, Smart HTTP, archive download routes, syntax highlighting, commit history/detail, branch administration, compare, inline edit, or SVN.

## Legacy Sources

- `yona-original/app/controllers/CodeApp.java`
- `yona-original/app/views/code/view.scala.html`
- `yona-original/app/views/code/partial_view_folder.scala.html`
- `yona-original/app/views/code/partial_view_file.scala.html`
- `yona-original/app/playRepository/GitRepository.java`
- `yona-original/test/playRepository/GitRepositoryTest.java`

## Translation Rule

- Legacy `CodeApp.codeBrowser` redirects to the default branch when a repository has `HEAD`; Rust keeps `/code` as the mounted SPA route and renders the default branch result directly from `GET /api/v1/projects/:owner/:project/code`.
- Legacy repository metadata is translated through `crates/vcs` using the system `git` executable with explicit argv and `--git-dir`.
- Rust repository location is `YONA_DATA/repo/<project_id>.git`, matching prior repository path hardening evidence while avoiding owner/project rename coupling.
- Missing or empty repositories return `noHead` and render the legacy no-head empty repository state.
- File path traversal is rejected before invoking Git.
- Legacy `rawcode`, `files`, and `image` direct routes stream Git blobs through the same project read/code-menu authorization used by the REST code browser endpoint.

## Phase 3A Evidence

| Evidence | Rust target |
| --- | --- |
| REST contract | `GET /api/v1/projects/:owner/:project/code` guarded by `crates/server/tests/code_browser_contract.rs` |
| Git read adapter | `crates/vcs/src/lib.rs` |
| Server behavior | `crates/server/src/lib.rs` |
| UI route surface | `frontend/src/routes/$owner/$projectName/code/**`, `frontend/src/routes/-code-views.tsx` |
| Regression tests | `cargo test -p yona-rust-pilot-server --test code_browser_contract`; `pnpm --dir frontend test:e2e` |

## Remaining Phase 3 Follow-ups

- Repository provisioning on project creation.
- Archive download route.
- Syntax highlighting and line-number parity.
- Commit history, commit detail/diff, commit comments, compare, and branch management.
- Smart HTTP clone/pull/push and post-receive hooks.
- SVN remains deferred.

