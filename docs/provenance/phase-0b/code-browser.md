# Code Browser Provenance

## Scope

- Phase 3A read-only Git code browser parity slice.
- Covers existing Git repository read paths only: no-head state, branch selector, breadcrumbs, folder listing, and text file view.
- Does not cover repository provisioning, Smart HTTP, raw/download/image routes, syntax highlighting, commit history/detail, branch administration, compare, inline edit, or SVN.

## Legacy Sources

- `yona-original/app/controllers/CodeApp.java`
- `yona-original/app/views/code/view.scala.html`
- `yona-original/app/views/code/partial_view_folder.scala.html`
- `yona-original/app/views/code/partial_view_file.scala.html`
- `yona-original/app/playRepository/GitRepository.java`
- `yona-original/test/playRepository/GitRepositoryTest.java`

## Translation Rule

- Legacy `CodeApp.codeBrowser` redirects to the default branch when a repository has `HEAD`; Rust keeps `/code` as the mounted SPA route and renders the default branch result directly from `ReadCodeBrowser`.
- Legacy repository metadata is translated through `crates/vcs` using the system `git` executable with explicit argv and `--git-dir`.
- Rust repository location is `YONA_DATA/repo/<project_id>.git`, matching prior repository path hardening evidence while avoiding owner/project rename coupling.
- Missing or empty repositories return `noHead` and render the legacy no-head empty repository state.
- File path traversal is rejected before invoking Git.

## Phase 3A Evidence

| Evidence | Rust target |
| --- | --- |
| Contract expansion | `proto/yona/pilot/v1/pilot.proto` `ReadCodeBrowser` |
| Git read adapter | `crates/vcs/src/lib.rs` |
| Server behavior | `crates/server/src/lib.rs` |
| UI route surface | `frontend/src/routes/$owner/$projectName/code/**`, `frontend/src/routes/-code-views.tsx` |
| Regression tests | `cargo test -p yona-rust-pilot-server --test code_browser_contract`; `pnpm --dir frontend test:e2e` |

## Remaining Phase 3 Follow-ups

- Repository provisioning on project creation.
- Raw file, browser-open file, image preview, and archive download routes.
- Syntax highlighting and line-number parity.
- Commit history, commit detail/diff, commit comments, compare, and branch management.
- Smart HTTP clone/pull/push and post-receive hooks.
- SVN remains deferred.

