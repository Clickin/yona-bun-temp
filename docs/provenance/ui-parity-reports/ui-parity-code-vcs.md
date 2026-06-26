# UI Parity Report: Code / VCS

Status: explorer report only
Date: 2026-06-26
Scope: `ui-parity-code-vcs`

## Scope And Boundary

This audit is limited to legacy Yona code browser, commit history/detail, compare, and branch-list UX parity. It does not propose redesigns. The app-runtime boundary remains REST JSON/API-return plus React render; legacy direct raw/open/archive/ajax/comment routes are compatibility evidence only.

## 2026-06-27 Branch List Layout Follow-Up

- Moved project branch list shell ownership into `frontend/src/routes/$owner/$projectName/route.tsx` for `/branches`, keeping the code menu active with no extra shell class or keymap.
- Scope: `frontend/src/routes/-code-views.tsx` adds `renderShell={false}` for `CodeBranchListPage`; the branches leaf route passes that flag while retaining branch list query and default/delete REST mutation boundaries.
- Verification: `pnpm --dir frontend exec tsc --noEmit`; `pnpm --dir frontend exec vitest run src/code-views.spec.tsx -t "branch list shell"`.

Legacy evidence inspected:

- `yona-original/app/views/code/view.scala.html`
- `yona-original/app/views/code/partial_view_folder.scala.html`
- `yona-original/app/views/code/partial_view_file.scala.html`
- `yona-original/app/views/code/nohead.scala.html`
- `yona-original/app/views/code/nohead_svn.scala.html`
- `yona-original/app/views/code/history.scala.html`
- `yona-original/app/views/code/diff.scala.html`
- `yona-original/app/views/code/branches.scala.html`
- `yona-original/app/views/code/partial_branchrow.scala.html`
- `yona-original/app/views/code/compare.scala.html`
- `yona-original/conf/routes` code/commit/branch/compare routes

Current evidence inspected:

- `frontend/src/routes/-code-views.tsx`
- `frontend/src/routes/$owner/$projectName/code/**`
- `frontend/src/routes/$owner/$projectName/commits/**`
- `frontend/src/routes/$owner/$projectName/commit/$commitId/route.tsx`
- `frontend/src/routes/$owner/$projectName/compare/$revisionRange/route.tsx`
- `frontend/src/routes/$owner/$projectName/branches/route.tsx`
- `frontend/src/api/code-commits.ts`
- `frontend/src/api/code-branches.ts`
- `crates/server/src/routes/code.rs`
- `crates/server/tests/code_browser_contract.rs`
- `frontend/src/code-views.spec.tsx`
- `frontend/src/project-code-browser-routing.spec.ts`
- `frontend/tests/shell-routing-smoke.e2e.ts`
- `frontend/tests/project-code-comment-upload-parity.e2e.ts`
- `docs/provenance/core-parity-audit.md`
- `.agent/legacy-html-page-audit/*`
- `output/playwright/visual-sweep/latest.json`

## Route Inventory Summary

Total rows: 20

| status | count |
| --- | ---: |
| covered | 19 |
| gap | 0 |
| deviation | 0 |
| deferred | 0 |
| not-applicable | 1 |
| weak evidence | 0 |
| needs-parent-decision | 0 |

## Result Inventory

| path | legacy evidence | current evidence | status | proposed owner |
| --- | --- | --- | --- | --- |
| `/:owner/:project/code` default branch | `code/view.scala.html` `CodeApp.codeBrowser`, `#branches`, `#breadcrumbs`, `code.files/code.commits/title.branches` tabs | `CodeBrowserRouteView`, `CodeBrowserPage`, `readCodeBrowser`, `shell-routing-smoke.e2e.ts`, visual sweep `/pilot/yona/code` 200 | covered | none |
| `/:owner/:project/code/:branch/*path` folder rows | `partial_view_folder.scala.html` `.list-wrap`, `.listitem`, `code.filename`, `code.commitMsg`, folders before files | `CodeFolderView`, `code-views.spec.tsx`, `project-code-browser-routing.spec.ts` | covered | none |
| `/:owner/:project/code/:branch/*path` text file rows | `partial_view_file.scala.html` `#fileInfo`, `#revisionNo`, `#codeVal.hidden`, `#showCode` | `CodeFileView`, `CodeTextView`, `code-views.spec.tsx` checks `#showCode`, syntax tokens, line numbers | covered | none |
| Markdown file rendering | `partial_view_file.scala.html` `#codeVal.markdown-wrap.codebrowser-markdown`, `Markdown.renderFileInCodeBrowser` | `CodeFileView` uses shared `MarkdownRenderer`; `project-code-browser-routing.spec.ts` checks `#codeVal`, local image rewrite, no `#showCode` | covered | none |
| raw/open/image/download links | `partial_view_file.scala.html`, `CodeApp.showRawFile`, `CodeApp.openFile`, `CodeApp.download` | direct routes in `crates/server/src/routes/code.rs`; `code_browser_contract` raw/open/image/archive tests; frontend anchor specs | covered | none |
| no-head Git state | `nohead.scala.html` `code.nohead`, clone/init/remote/pull-push blocks gated by update permission | `CodeNoHeadBlock`; `rest_project_create_provisions_empty_bare_git_repository`; `code-views.spec.tsx` Git no-head copy; `frontend/tests/project-code-comment-upload-parity.e2e.ts` now opens `/code` with `noHead=true` and update permission, then asserts the empty-repository warning, clone/init/remote guidance, and absence of visible `code.nohead` raw keys in the browser. | covered in current follow-up | none |
| no-head SVN state | `nohead_svn.scala.html` SVN checkout guidance | `CodeNoHeadBlock` SVN branch; `code-views.spec.tsx` SVN no-head copy; `frontend/tests/project-code-comment-upload-parity.e2e.ts` now reopens `/code` with a Subversion container, `noHead=true`, and update permission, then asserts SVN checkout/add/commit guidance and no visible `code.nohead` raw keys in the browser. | covered in current follow-up | none |
| `/:owner/:project/commits` and `/:owner/:project/commits/:branch/*path` | `history.scala.html` `#history`, `#branches`, path breadcrumbs, `code.showCode`, newer/older links, A/S shortcut | `CodeHistoryPage`, `CodeHistoryTable`, `readCodeHistory`, `code_browser_contract`, `shell-routing-smoke.e2e.ts`; email-only commit authors now render text/tooltip fallback without an empty avatar `src`, and the mobile code audit e2e re-run no longer emits the React empty `src` console error. | covered | none |
| `/:owner/:project/commit/:id` diff shell | `diff.scala.html` `.codediff-wrap`, `.commitInfo`, `.diff-body`, `.btnPop`, review cards | `CodeCommitDetailPage`, `CodeCommitDiffView`, `code-views.spec.tsx`, `project-code-browser-routing.spec.ts`, `code_browser_contract` | covered | none |
| commit comment forms and REST boundary | `diff.scala.html` `common.commentForm`, `common.reviewForm`, POST `/:owner/:project/commit/:commitId/comments` | `CodeCommitDiffView`, `frontend/src/api/code-commits.ts`, `crates/server/src/routes/code.rs`, `form-submit-boundary` provenance, `project-code-comment-upload-parity.e2e.ts` | covered | none |
| inline diff comments | legacy `partial_diff*`, `yobi.CodeCommentBlock`, `yobi.CodeCommentBox`; `diff.scala.html` `bCommentable` | `line-comment-trigger`, selection logic in `-code-views.tsx`; `project-code-comment-upload-parity.e2e.ts` line and multi-line create flows | covered | none |
| `/:owner/:project/compare/:revA..:revB` | `compare.scala.html` `.commitInfo`, `.diff-body.discommentable`, `code.noChanges` | `CodeComparePage`, `readCodeCompare`, `rest_compare_reads_commit_pair_and_diff_from_git_repo`, visual sweep `/pilot/yona/compare/main...main` 200 | covered | none |
| `/:owner/:project/branches` table | `branches.scala.html`, `partial_branchrow.scala.html`, `.branch-list-wrap`, `.headBranch`, PR link/state | Project layout owns the header/menu/page-wrap shell with active code menu; `CodeBranchListPage`, `CodeBranchTable`, `CodeBranchRow`, `code_browser_contract`, route/spec/e2e coverage preserve branch body selectors under the outlet. | covered | `frontend/src/routes/$owner/$projectName/route.tsx`, `frontend/src/routes/$owner/$projectName/branches/route.tsx`, `frontend/src/routes/-code-views.tsx`, `frontend/src/code-views.spec.tsx` |
| branch default/delete enabled states | `partial_branchrow.scala.html` set-default hidden for default branch; delete hidden for default/head; actions gated by update/delete ACL | `CodeBranchRow` mirrors hidden states and mutates REST; backend rejects default delete; `frontend/src/code-views.spec.tsx` pins admin/update-only/delete-only/read-only action cells and default-branch hidden actions | covered | none |
| commit watch/unwatch button | `diff.scala.html` `#watch-button` active class and `code.Diff` `sWatchUrl` / `sUnwatchUrl`; `Commit.asResource(project)` uses legacy `project.id:commitId`; `Watch.findActualWatchers` includes author, project watchers, commenters, and explicit commit watch rows minus explicit unwatch rows; `yobi.code.Diff.js` toggles `active ybtn-watching` after the watch/unwatch request succeeds | `frontend/tests/project-code-comment-upload-parity.e2e.ts` now opens commit detail under the mounted `/yona` base path with `branch`/`path` query, clicks `#watch-button`, asserts `POST /api/v1/projects/:owner/:project/commit/:id/watch` with CSRF, asserts the visible `active ybtn-watching` state after success, clicks again, asserts `DELETE` with CSRF, and asserts the state and URL query return. Implementation evidence remains REST commit detail `isWatching`, `POST`/`DELETE` persistence of legacy `COMMIT` watch/unwatch rows, and route wiring to `watchCommitRest`/`unwatchCommitRest`. | covered | none |
| commit detail anonymous author fallback | `diff.scala.html` renders `User.anonymous.name`; `NullUser` sets `name = Messages.get("user.notExists.name")`, default messages value `User exists not` | `CodeCommitDiffView` now renders legacy `user.notExists.name` through `legacyMessage` instead of visible `User.anonymous.name`; `frontend/src/code-views.spec.tsx` pins the fallback and absence of the raw model expression | covered | none |
| commit diff visual exactness | `diff.scala.html` uses `views.html.partial_diff` inside `.diff-body` plus `.btnPop`; legacy partials emit diff containers, row classes/gutters, and comment buttons | `CodeCommitDiffView` keeps `.codediff-wrap`, `.diff-body`, `.diff-file.diff-container`, `.diff-code.diff-table`, `add/remove/context/hunk` rows, `.linenum` gutters, `.diff-partial-codeline`, `.line-comment-trigger`, and `.btnPop`; `frontend/src/code-views.spec.tsx` pins those selectors | covered | none |
| SVN commit comments | `svnDiff.scala.html`, `CommitComment` legacy SVN path; `CodeHistoryApp.newComment` and `NotificationEvent.afterNewSVNCommitComment` create the same `CommitComment` model for SVN revisions | `rest_commit_detail_creates_comments_from_svn_revision` seeds an executable-backed SVN repository, reads the SVN revision detail, creates comments through REST and legacy direct routes, and verifies refreshed thread/comment counts. React `CodeCommitDiffView` renders the same `threads` payload for Git and SVN commit detail, with comment create/edit/delete controls proved by `project-code-comment-upload-parity.e2e.ts`. | covered | none |
| legacy `code/!` ajax JSON route | `conf/routes` `CodeApp.ajaxRequest*`, `code.Browser` metadata loader | `direct_code_ajax_compat` returns legacy-shaped JSON; app runtime uses REST + React | not-applicable | Compatibility route only; no React implementation owner |
| raw visible i18n/message keys | all inspected templates use `Messages(...)`, hardcoded `Raw`/`Edit`, or model fields whose values are populated from `Messages.get(...)`; raw keys/model expressions should not be visible | frontend specs check absence of key strings for code controls; commit anonymous fallback now renders `user.notExists.name` (`User exists not`) rather than the raw model expression `User.anonymous.name` | covered | none |

## Playwright Scenario Matrix

| path | state | legacy selector/copy | Rust selector/copy | interaction | API/direct boundary | status |
| --- | --- | --- | --- | --- | --- | --- |
| `/pilot/yona/code` | authenticated/member, populated Git root | `#branches`, `#breadcrumbs`, `.list-wrap`, `code.files`, `code.commits`, `title.branches` | `#branches`, `#breadcrumbs`, `.list-wrap`; visual sweep 200; shell E2E route | change branch select should navigate to selected branch | REST `/api/v1/projects/:owner/:project/code` + React render | covered |
| `/pilot/yona/code/main/README.md` | Markdown file | `#codeVal.markdown-wrap.codebrowser-markdown`; no `#showCode` | `#codeVal.markdown-wrap.codebrowser-markdown`; `MarkdownRenderer`; visual sweep 200 | open README route and inspect rendered Markdown/local image links | REST code payload + React `MarkdownRenderer`; direct `/files` for local images | covered |
| `/pilot/yona/code/main/src/main.rs` | text file | `#showCode.code-wrap`, `Raw`, `Edit`, `code.open`, `code.history` | `#showCode`, `#codeVal.hidden`, raw/open/history anchors | click raw/open/download as direct links | REST render; direct `rawcode`, `files`, `code/:branch/download` byte routes | covered |
| `/pilot/yona/code` | no-head Git/SVN | `code.nohead`, Git clone/init/remote/pull-push or SVN checkout blocks | `CodeNoHeadBlock` with same setup copy; browser proof now covers both Git and SVN no-head update-permitted guidance. SVN commit discussion is covered by the shared commit-detail REST payload plus SVN revision contract proof. | route entry and no-head Git/SVN browser proof; update permission gates setup commands | REST `noHead=true` + React render | covered |
| `/pilot/yona/commits` | root history | `#history`, `.code-table.commits`, `#branches`, `code.nocommits` when empty | `#history`, `.code-table.commits`, `#branches`; shell E2E route | branch select, copy commit id, A/S pagination shortcut | REST `/api/v1/projects/:owner/:project/commits` + React render | covered |
| `/pilot/yona/commits/main/src/main.rs` | path history | `#breadcrumbs`, `.browse` `code.showCode`, newer/older links | breadcrumbs, `.browse`, `Browse code`, `Older`; shell E2E route | click `Browse code`, pagination links | REST commits with `branch/path/page` + React render | covered |
| `/pilot/yona/commit/HEAD` | commit detail, commentable | `#code-browse-wrap`, `.codediff-wrap`, `.btnPop`, `.board-comment-form`, `#watch-button` | same shell IDs/classes; visual sweep 200; comment E2E covers line and selection comments | add non-ranged comment, line comment, multi-line comment, reply/edit/delete | REST `/api/v1/projects/:owner/:project/commit/:id/comments`; direct legacy form routes preserved as anchors/compat | covered |
| `/pilot/yona/commit/HEAD` | commit watch state | `#watch-button.active.ybtn-watching` toggles through `sWatchUrl`/`sUnwatchUrl`; `resource.type=commit&resource.id=projectId:commitId` | React button supports legacy active class and callback-driven class toggle; commit detail REST supplies `isWatching`; route callback calls `watchCommitRest`/`unwatchCommitRest`; backend stores legacy `COMMIT` watch/unwatch rows for `projectId:commitId`; focused Playwright proof in `frontend/tests/project-code-comment-upload-parity.e2e.ts` clicks the button under `/yona` and asserts POST/DELETE, CSRF, URL query stability, and `active ybtn-watching` transitions | click toggles watch/unwatch and updates `active ybtn-watching` after REST success | REST `/api/v1/projects/:owner/:project/commit/:id/watch`; direct legacy resource target resolution for `commit` resources | covered |
| `/pilot/yona/compare/main...main` | no changes | `.commitInfo`, `.alert` `code.noChanges` | `.commitInfo`, `.alert` `No changes`; visual sweep 200 | route entry | REST `/api/v1/projects/:owner/:project/compare/:range` + React render | covered |
| `/pilot/yona/branches` | branch list, admin | `.branch-list-wrap`, `.head`, `.headBranch`, `code.branches.setAsDefault`, `button.delete` | same table classes and action hooks; visual sweep 200; backend mutation contracts; `frontend/src/code-views.spec.tsx` pins admin/update-only/delete-only/read-only action visibility | click set-default/delete; default branch actions hidden | REST `/api/v1/projects/:owner/:project/branches/default` and DELETE | covered |
| `/pilot/yona/branches` | non-admin | action `<th>` absent unless update/delete allowed | `showActions` absent unless permissions allow; focused spec pins no `<th>`, no `.actions`, no set-default/delete copy for read-only permissions | load as read-only member/non-member | REST permissions projection + React render | covered |
| `/:owner/:project/code/!/*path` | legacy ajax compatibility | JSON consumed by legacy `code.Browser` | `direct_code_ajax_compat` legacy JSON; not app data source | direct GET compatibility only | direct compatibility JSON route | not-applicable |

## Notes For Parent Queue

- Closed in current follow-up: commit detail `#watch-button` now has focused Playwright proof for browser click watch/unwatch, POST/DELETE REST calls with CSRF, preserved branch/path query, and `active ybtn-watching` state transitions under the mounted `/yona` base path.
- Closed in Wave 4: commit detail `#watch-button` now has backend/API support for legacy commit watch state and `projectId:commitId` resource ids, and the route mutates real watch/unwatch rows through the existing React toggle.
- Closed in Wave 3: anonymous commit author fallback uses `NullUser`/`Messages.get("user.notExists.name")` evidence, branch action permission states have focused spec proof, and commit diff selector exactness has focused spec proof.
