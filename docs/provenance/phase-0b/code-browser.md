# Code Browser Provenance

## Scope

- Phase 3A/3B/3C/3D/3E/3F/3G read-only Git code browser parity plus Phase 3H branch administration parity slice.
- Covers existing Git repository paths: no-head state, branch selector, breadcrumbs, folder listing, text file view, raw file streaming, browser-open file streaming, image preview streaming, branch archive download, numbered syntax-highlighted text rendering, commit history listing, read-only commit detail/diff rendering, read-only commit compare rendering, branch list rendering, branch-row latest PR links, default branch mutation, and non-default branch delete.
- Does not cover repository provisioning, Smart HTTP, commit comments/thread lifecycle, inline edit, or SVN.

## Legacy Sources

- `yona-original/app/controllers/CodeApp.java`
- `yona-original/app/controllers/CodeHistoryApp.java`
- `yona-original/app/controllers/BranchApp.java`
- `yona-original/app/controllers/CompareApp.java`
- `yona-original/app/views/code/view.scala.html`
- `yona-original/app/views/code/history.scala.html`
- `yona-original/app/views/code/branches.scala.html`
- `yona-original/app/views/code/partial_branchrow.scala.html`
- `yona-original/app/views/code/compare.scala.html`
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
- Legacy `code/:branch/download` streams a Git archive zip through the same project read/code-menu authorization and rejects missing Git revisions.
- Legacy text file rendering used `#showCode` plus Ace; Rust keeps the same `#showCode`/`.code-wrap` anchors and renders line-numbered syntax token spans without adding a frontend dependency.
- Legacy `CodeHistoryApp.historyUntilHead` and `CodeHistoryApp.history` map to `GET /api/v1/projects/:owner/:project/commits` plus SPA file routes. Rust uses the system `git log` wrapper with explicit argv, keeps the legacy 25-item page size, supports branch and path-scoped history, and exposes `hasOlder`/`hasNewer` instead of fabricating commits.
- Legacy `CodeHistoryApp.show` and `code/diff.scala.html` map to `GET /api/v1/projects/:owner/:project/commit/:id` plus SPA route `/:owner/:project/commit/:id`. Rust reads real Git commit metadata, first-parent metadata, and unified diff patches through explicit git argv and keeps the legacy diff shell anchors such as `#code-browse-wrap`, `.codediff-wrap`, `.commitInfo`, `.diff-body`, `.board-comment-wrap`, and review card containers. Commit comment creation and thread lifecycle remain outside this read-only slice.
- Legacy `CompareApp.compare` and `code/compare.scala.html` map to `GET /api/v1/projects/:owner/:project/compare/:revA..:revB` plus SPA route `/:owner/:project/compare/:revA..:revB`. Rust verifies both revisions as Git commits, returns 404 for missing revisions, and renders the read-only `.commitInfo`, `.commitId`, and `.diff-body.discommentable` compare shell without enabling comments.
- Legacy `BranchApp.branches`, `BranchApp.setAsDefault`, and `BranchApp.deleteBranch` map to `GET /api/v1/projects/:owner/:project/branches`, `POST /api/v1/projects/:owner/:project/branches/default`, and `DELETE /api/v1/projects/:owner/:project/branches` plus SPA route `/:owner/:project/branches`. Rust keeps branch names in JSON bodies so names containing `/` do not depend on route segment decoding, projects the latest matching branch pull request like `PullRequest.findTheLatestOneFrom`, requires project update permission for mutations, rejects deleting the default branch, and mutates real bare-repository refs through explicit git argv.

## Phase 3A/3B/3C/3D/3E/3F/3G/3H Evidence

| Evidence | Rust target |
| --- | --- |
| REST contract | `GET /api/v1/projects/:owner/:project/code`, `GET /api/v1/projects/:owner/:project/commits`, `GET /api/v1/projects/:owner/:project/commit/:id`, `GET /api/v1/projects/:owner/:project/compare/:revA..:revB`, `GET /api/v1/projects/:owner/:project/branches`, `POST /api/v1/projects/:owner/:project/branches/default`, and `DELETE /api/v1/projects/:owner/:project/branches` guarded by `crates/server/tests/code_browser_contract.rs` |
| Git read adapter | `crates/vcs/src/lib.rs` |
| Server behavior | `crates/server/src/lib.rs` |
| UI route surface | `frontend/src/routes/$owner/$projectName/code/**`, `frontend/src/routes/-code-views.tsx` |
| Commit history route surface | `frontend/src/routes/$owner/$projectName/commits/**`, `frontend/src/routes/-code-views.tsx` |
| Commit detail route surface | `frontend/src/routes/$owner/$projectName/commit/$commitId/route.tsx`, `frontend/src/routes/-code-views.tsx` |
| Compare route surface | `frontend/src/routes/$owner/$projectName/compare/$revisionRange/route.tsx`, `frontend/src/routes/-code-views.tsx` |
| Branch administration route surface | `frontend/src/routes/$owner/$projectName/branches/route.tsx`, `frontend/src/api/code-branches.ts`, `frontend/src/routes/-code-views.tsx` |
| Regression tests | `cargo test -p yona-rust-pilot-server --test code_browser_contract`; `pnpm --dir frontend test`; `pnpm --dir frontend test:e2e` |

## Remaining Phase 3 Follow-ups

- Repository provisioning on project creation.
- Commit comments/thread lifecycle.
- Smart HTTP clone/pull/push and post-receive hooks.
- SVN remains deferred.

