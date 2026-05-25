# Code Browser Provenance

## Scope

- Phase 3A/3B/3C/3D/3E/3F/3G read-only Git code browser parity, Phase 3H branch administration parity, Phase 3I Git commit discussion parity, Phase 3J repository provisioning, Phase 3K Smart HTTP transport, and Phase 3L push post-receive side effects.
- Covers Git repository paths: project creation provisioning, no-head state, branch selector, breadcrumbs, folder listing, text file view, React-side Markdown file rendering with local image path rewrite, raw file streaming, browser-open file streaming, image preview streaming, branch archive download, numbered syntax-highlighted text rendering, commit history listing, commit detail/diff rendering with file added/deleted counts, commit non-ranged comments/replies/delete/thread open-close, single-line and same-file multi-line inline code comment creation/readback, commit comment and inline ranged reply/edit image paste/drop upload, commit comment counts, commit compare rendering, branch list rendering, branch-row latest PR links, default branch mutation, non-default branch delete, native `git http-backend` upload-pack/receive-pack transport for `/:owner/:project.git`, and receive-pack post-receive metadata/event/webhook records.
- Does not cover PR merge/commit-changed VCS lifecycle side effects or the full SVN executable WebDAV bridge.

## Legacy Sources

- `yona-original/app/controllers/CodeApp.java`
- `yona-original/app/controllers/CodeHistoryApp.java`
- `yona-original/app/controllers/BranchApp.java`
- `yona-original/app/controllers/CompareApp.java`
- `yona-original/app/controllers/ProjectApp.java`
- `yona-original/app/controllers/api/ProjectApi.java`
- `yona-original/app/views/code/view.scala.html`
- `yona-original/app/views/code/history.scala.html`
- `yona-original/app/views/code/branches.scala.html`
- `yona-original/app/views/code/partial_branchrow.scala.html`
- `yona-original/app/views/code/compare.scala.html`
- `yona-original/app/views/code/partial_view_folder.scala.html`
- `yona-original/app/views/code/partial_view_file.scala.html`
- `yona-original/app/playRepository/RepositoryService.java`
- `yona-original/app/playRepository/GitRepository.java`
- `yona-original/test/playRepository/GitRepositoryTest.java`

## Translation Rule

- Legacy `CodeApp.codeBrowser` redirects to the default branch when a repository has `HEAD`; Rust keeps `/code` as the mounted SPA route and renders the default branch result directly from `GET /api/v1/projects/:owner/:project/code`.
- Legacy repository metadata is translated through `crates/vcs` using the system `git` executable with explicit argv and `--git-dir`.
- Rust repository location is `YONA_DATA/repo/<project_id>.git`, matching prior repository path hardening evidence while avoiding owner/project rename coupling.
- Legacy `ProjectApp.newProject` and `ProjectApi.newProject` call `RepositoryService.createRepository(project)` after `Project.create(project)`. Rust maps this to `POST /api/v1/owners/:owner/projects`, stores the legacy default `vcs = GIT`, and initializes an empty bare repository at `YONA_DATA/repo/<project_id>.git`.
- Missing or empty repositories return `noHead` and render the legacy no-head empty repository state.
- File path traversal is rejected before invoking Git.
- Legacy `rawcode`, `files`, and `image` direct routes stream Git blobs through the same project read/code-menu authorization used by the REST code browser endpoint.
- Legacy `code/:branch/download` streams a Git archive zip through the same project read/code-menu authorization and rejects missing Git revisions.
- Legacy text file rendering used `#showCode` plus Ace; Rust keeps the same `#showCode`/`.code-wrap` anchors and renders line-numbered syntax token spans without adding a frontend dependency.
- Legacy Markdown file rendering uses `#codeVal.markdown-wrap.codebrowser-markdown` and `Markdown.renderFileInCodeBrowser`, which rewrites only local image paths to the project file route. Rust now maps renderable Markdown code files to a REST `file.text` Markdown projection with local image paths rewritten to `/:owner/:project/files/:branch/...`, leaves `file.html` empty for this surface, preserves normal local links, and lets React render the legacy wrapper.
- Legacy project home uses `Markdown.renderFileInReadme` for repository README files, rewriting local images to the project file route and normal local links to the code-browser route. Rust now keeps that link rewrite in the REST-only `readmeFile.bodyMarkdown` projection, leaves `readmeFile.bodyHtml` empty for this fallback, and lets the React project home render the Markdown when no README posting is present.
- Legacy `CodeHistoryApp.historyUntilHead` and `CodeHistoryApp.history` map to `GET /api/v1/projects/:owner/:project/commits` plus SPA file routes. Rust uses the system `git log` wrapper with explicit argv, keeps the legacy 25-item page size, supports branch and path-scoped history, and exposes `hasOlder`/`hasNewer` instead of fabricating commits.
- Legacy `CodeHistoryApp.show` and `code/diff.scala.html` map to `GET /api/v1/projects/:owner/:project/commit/:id` plus SPA route `/:owner/:project/commit/:id`. Rust reads real Git commit metadata, first-parent metadata, unified diff patches, and non-ranged Git commit discussion threads through explicit git argv plus `comment_thread`/`review_comment` persistence. It keeps the legacy diff shell anchors such as `#code-browse-wrap`, `.codediff-wrap`, `.commitInfo`, `.diff-body`, `.board-comment-wrap`, `.comment-thread-wrap`, `.review-form`, and review card containers.
- Legacy `partial_diff.scala.html`, `partial_diff_line.scala.html`, `partial_diff_comment_on_line.scala.html`, `partial_comment_thread.scala.html`, and `common/reviewForm.scala.html` render line-numbered diff rows with `.linenum`, `.diff-partial-codeline`, `.comments.board-comment-wrap`, `.comment-thread-wrap`, and `#review-form`/`.review-form` anchors. Rust parses unified patches into equivalent table rows, renders file-level added/deleted line counts from the patch, lets a project code commenter open a single-line inline review form from the line number gutter or a same-file text-selected multi-line form, posts `path/startLine/endLine` through the existing commit-comment REST mutation, and renders returned ranged threads under the matching diff line.
- Legacy `yobi.code.Diff.js`, `yobi.code.SvnDiff.js`, and `yobi.CodeCommentBox.js` attach `yobi.Files`/`yobi.Attachments` to code-comment markdown forms. Rust reuses the shared `/files` upload path for non-ranged Git commit comment and reply editors: pasted or dropped images insert `![name](url)` at the cursor and submit uploaded `attachmentIds` with the comment mutation.
- Legacy `CodeHistoryApp.newComment`, `CommentApp.delete`, and `CommentThreadApp.open/close` map to `POST /api/v1/projects/:owner/:project/commit/:id/comments`, `DELETE /api/v1/projects/:owner/:project/commit/:id/comments/:commentId`, and `POST /api/v1/projects/:owner/:project/commit/:id/threads/:threadId/open|close`. Rust implements Git non-ranged commit comments and replies as `NonRangedCodeCommentThread` plus `ReviewComment`, preserves author/project-update delete and thread-state authorization, records `NEW_REVIEW_COMMENT` and `REVIEW_THREAD_STATE_CHANGED` notification rows, stages notification mail, exposes legacy `original_email` provenance as `viaEmail`/`data-via-email` on commit discussion comments, returns `contentsMarkdown` with empty `contentsHtml`, and lets React render the comment Markdown. SVN `CommitComment` remains deferred.
- Git commit discussion issue-link title/state enrichment now flows through the shared React Markdown reference metadata payload.
- Legacy `CompareApp.compare` and `code/compare.scala.html` map to `GET /api/v1/projects/:owner/:project/compare/:revA..:revB` plus SPA route `/:owner/:project/compare/:revA..:revB`. Rust verifies both revisions as Git commits, returns 404 for missing revisions, and renders the read-only `.commitInfo`, `.commitId`, and `.diff-body.discommentable` compare shell without enabling comments.
- Legacy `BranchApp.branches`, `BranchApp.setAsDefault`, and `BranchApp.deleteBranch` map to `GET /api/v1/projects/:owner/:project/branches`, `POST /api/v1/projects/:owner/:project/branches/default`, and `DELETE /api/v1/projects/:owner/:project/branches` plus SPA route `/:owner/:project/branches`. Rust keeps branch names in JSON bodies so names containing `/` do not depend on route segment decoding, projects the latest matching branch pull request like `PullRequest.findTheLatestOneFrom`, requires project update permission for mutations, rejects deleting the default branch, and mutates real bare-repository refs through explicit git argv.
- Legacy `GitApp` Smart HTTP routes map to the clone URL shape `/:owner/:project.git`, with fallback support for non-`.git` service paths. Rust delegates to the native `git http-backend` executable with `GIT_PROJECT_ROOT = YONA_DATA/repo` and `PATH_INFO = /<project_id>.git/...`, rejects getanyfile-style `info/refs`, preserves `git-protocol`, exposes public upload-pack for public repositories, accepts Basic password/API-token or session principals, and applies repository read/write role checks before receive-pack. After successful receive-pack ref changes, Rust records legacy push side effects: `project.last_pushed_date`, `project_pushed_branch`, `NEW_COMMIT` notification/mail rows for project watchers, and git-push JSON webhook outbox payloads for `gitPush` hooks.

## Phase 3A/3B/3C/3D/3E/3F/3G/3H/3I/3J/3K/3L Evidence

| Evidence | Rust target |
| --- | --- |
| REST contract | `POST /api/v1/owners/:owner/projects`, `GET /api/v1/projects/:owner/:project/code`, `GET /api/v1/projects/:owner/:project/commits`, `GET/POST/DELETE /api/v1/projects/:owner/:project/commit/:id/comments`, `POST /api/v1/projects/:owner/:project/commit/:id/threads/:threadId/open|close`, `GET /api/v1/projects/:owner/:project/compare/:revA..:revB`, `GET /api/v1/projects/:owner/:project/branches`, `POST /api/v1/projects/:owner/:project/branches/default`, and `DELETE /api/v1/projects/:owner/:project/branches` guarded by `crates/server/tests/code_browser_contract.rs`; Smart HTTP direct transport guarded by `crates/server/tests/smart_http_contract.rs` |
| Git read / Smart HTTP adapter | `crates/vcs/src/lib.rs` |
| Server behavior | `crates/server/src/lib.rs` |
| UI route surface | `frontend/src/routes/$owner/$projectName/code/**`, `frontend/src/routes/-code-views.tsx` |
| Commit history route surface | `frontend/src/routes/$owner/$projectName/commits/**`, `frontend/src/routes/-code-views.tsx` |
| Commit detail route surface | `frontend/src/routes/$owner/$projectName/commit/$commitId/route.tsx`, `frontend/src/api/code-commits.ts`, `frontend/src/routes/-code-views.tsx` |
| Compare route surface | `frontend/src/routes/$owner/$projectName/compare/$revisionRange/route.tsx`, `frontend/src/routes/-code-views.tsx` |
| Branch administration route surface | `frontend/src/routes/$owner/$projectName/branches/route.tsx`, `frontend/src/api/code-branches.ts`, `frontend/src/routes/-code-views.tsx` |
| Regression tests | `cargo test -p yona-rust-pilot-server --test code_browser_contract`; `cargo test -p yona-rust-pilot-server --test smart_http_contract`; `pnpm --dir frontend test`; `pnpm --dir frontend test:e2e`; `frontend/src/code-views.spec.tsx`; `frontend/tests/project-code-comment-upload-parity.e2e.ts` |

## Remaining Phase 3 Follow-ups

- PR merge/commit-changed VCS lifecycle side effects remain a Pull Request follow-up.
- Git README write-back/sync through board README editing remains a board/VCS lifecycle follow-up.
- The legacy project preview route now validates read access and returns Markdown source instead of server-rendered HTML; project-home Git README, code-browser Markdown files, issue body/comments/history modal, PR body/review comments, Git commit discussion comments, board post/comment/history modal/DB README postings, and milestone detail descriptions now render Markdown in React.
- SVN repository storage lifecycle has started: changeVCS now uses the local `svnadmin create` executable for `YONA_DATA/repo/<project_id>.svn` and project deletion removes stale SVN storage. The legacy `/svn/$path<.+>` boundary is mounted with Basic/session auth, Subversion-only project filtering, DAV response metadata, root/default VCC `PROPFIND` with executable-backed youngest revision and repository UUID metadata, executable-backed `GET`/`HEAD` file content, file `PROPFIND` content-length/version/checked-in/baseline-relative-path metadata for normal and revision-pinned `!svn/rvr/:rev/*` / `!svn/bc/:rev/*` / `!svn/ver/:rev/*` paths through `svnlook cat`/`youngest`, collection and revision-pinned baseline collection `PROPFIND` directory/child metadata plus child file version/checked-in metadata through `svnlook tree`/`youngest`, `log-report`/`dated-rev-report` revision metadata through `svnlook log`/`author`/`date`, `get-locks-report` lock metadata through `svnlook lock`, `get-locations-report`/`get-location-segments-report` path metadata through `svnlook cat`/`tree`, read-only `update-report` target revision/file fetch metadata through `svnlook tree`, `file-revs-report` file revision metadata through `svnlook log`/`cat`, `mergeinfo-report` mergeinfo metadata through `svnlook propget`, `get-deleted-rev-report` deleted-path revision lookup through `svnlook` path existence, `list-report` directory entry metadata through `svnlook tree`/`cat`, `inherited-props-report` inherited regular property metadata through `svnlook proplist`/`propget`, WebDAV `LOCK`/`UNLOCK` through `svnadmin lock`/`unlock`, WebDAV `PUT` file updates, `DELETE` removals, `MKCOL` collection creation, `PROPPATCH` property set/remove, `MKACTIVITY`/`CHECKOUT`/`MERGE` commit choreography through `svn checkout`/`commit`, and actual external `svn info`/`svn checkout` HTTP smoke coverage; write-client matrix and other REPORT bodies remain deferred.

