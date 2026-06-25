# UI Parity Report: Code / VCS

Status: explorer report only
Date: 2026-06-26
Scope: `ui-parity-code-vcs`

## Scope And Boundary

This audit is limited to legacy Yona code browser, commit history/detail, compare, and branch-list UX parity. It does not propose redesigns. The app-runtime boundary remains REST JSON/API-return plus React render; legacy direct raw/open/archive/ajax/comment routes are compatibility evidence only.

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

| status | count |
| --- | ---: |
| covered | 13 |
| gap | 2 |
| deviation | 1 |
| deferred | 1 |
| not-applicable | 1 |
| weak evidence | 2 |
| needs-parent-decision | 1 |

## Result Table

| path | legacy evidence | current evidence | status | proposed owner |
| --- | --- | --- | --- | --- |
| `/:owner/:project/code` default branch | `code/view.scala.html` `CodeApp.codeBrowser`, `#branches`, `#breadcrumbs`, `code.files/code.commits/title.branches` tabs | `CodeBrowserRouteView`, `CodeBrowserPage`, `readCodeBrowser`, `shell-routing-smoke.e2e.ts`, visual sweep `/pilot/yona/code` 200 | covered | none |
| `/:owner/:project/code/:branch/*path` folder rows | `partial_view_folder.scala.html` `.list-wrap`, `.listitem`, `code.filename`, `code.commitMsg`, folders before files | `CodeFolderView`, `code-views.spec.tsx`, `project-code-browser-routing.spec.ts` | covered | none |
| `/:owner/:project/code/:branch/*path` text file rows | `partial_view_file.scala.html` `#fileInfo`, `#revisionNo`, `#codeVal.hidden`, `#showCode` | `CodeFileView`, `CodeTextView`, `code-views.spec.tsx` checks `#showCode`, syntax tokens, line numbers | covered | none |
| Markdown file rendering | `partial_view_file.scala.html` `#codeVal.markdown-wrap.codebrowser-markdown`, `Markdown.renderFileInCodeBrowser` | `CodeFileView` uses shared `MarkdownRenderer`; `project-code-browser-routing.spec.ts` checks `#codeVal`, local image rewrite, no `#showCode` | covered | none |
| raw/open/image/download links | `partial_view_file.scala.html`, `CodeApp.showRawFile`, `CodeApp.openFile`, `CodeApp.download` | direct routes in `crates/server/src/routes/code.rs`; `code_browser_contract` raw/open/image/archive tests; frontend anchor specs | covered | none |
| no-head Git state | `nohead.scala.html` `code.nohead`, clone/init/remote/pull-push blocks gated by update permission | `CodeNoHeadBlock`; `rest_project_create_provisions_empty_bare_git_repository`; `code-views.spec.tsx` Git no-head copy | covered | none |
| no-head SVN state | `nohead_svn.scala.html` SVN checkout guidance | `CodeNoHeadBlock` SVN branch; `code-views.spec.tsx` SVN no-head copy | covered | none |
| `/:owner/:project/commits` and `/:owner/:project/commits/:branch/*path` | `history.scala.html` `#history`, `#branches`, path breadcrumbs, `code.showCode`, newer/older links, A/S shortcut | `CodeHistoryPage`, `CodeHistoryTable`, `readCodeHistory`, `code_browser_contract`, `shell-routing-smoke.e2e.ts` | covered | none |
| `/:owner/:project/commit/:id` diff shell | `diff.scala.html` `.codediff-wrap`, `.commitInfo`, `.diff-body`, `.btnPop`, review cards | `CodeCommitDetailPage`, `CodeCommitDiffView`, `code-views.spec.tsx`, `project-code-browser-routing.spec.ts`, `code_browser_contract` | covered | none |
| commit comment forms and REST boundary | `diff.scala.html` `common.commentForm`, `common.reviewForm`, POST `/:owner/:project/commit/:commitId/comments` | `CodeCommitDiffView`, `frontend/src/api/code-commits.ts`, `crates/server/src/routes/code.rs`, `form-submit-boundary` provenance, `project-code-comment-upload-parity.e2e.ts` | covered | none |
| inline diff comments | legacy `partial_diff*`, `yobi.CodeCommentBlock`, `yobi.CodeCommentBox`; `diff.scala.html` `bCommentable` | `line-comment-trigger`, selection logic in `-code-views.tsx`; `project-code-comment-upload-parity.e2e.ts` line and multi-line create flows | covered | none |
| `/:owner/:project/compare/:revA..:revB` | `compare.scala.html` `.commitInfo`, `.diff-body.discommentable`, `code.noChanges` | `CodeComparePage`, `readCodeCompare`, `rest_compare_reads_commit_pair_and_diff_from_git_repo`, visual sweep `/pilot/yona/compare/main...main` 200 | covered | none |
| `/:owner/:project/branches` table | `branches.scala.html`, `partial_branchrow.scala.html`, `.branch-list-wrap`, `.headBranch`, PR link/state | `CodeBranchListPage`, `CodeBranchTable`, `CodeBranchRow`, `code_browser_contract`, route/spec/e2e coverage | covered | none |
| branch default/delete enabled states | `partial_branchrow.scala.html` set-default hidden for default branch; delete hidden for default/head; actions gated by update/delete ACL | `CodeBranchRow` mirrors hidden states and mutates REST; backend rejects default delete | weak evidence | `frontend/src/routes/-code-views.tsx`, `frontend/src/routes/$owner/$projectName/branches/route.tsx`, focused Playwright for admin/member/non-admin branch rows |
| commit watch/unwatch button | `diff.scala.html` `#watch-button` active class and `code.Diff` `sWatchUrl` / `sUnwatchUrl` | `CodeCommitDetailPage` renders static `#watch-button` with `Watch`; no REST/direct watch callback visible in code route | gap | `frontend/src/routes/-code-views.tsx`, `frontend/src/routes/$owner/$projectName/commit/$commitId/route.tsx`, commit watch REST/direct route if absent |
| commit detail anonymous author fallback | `diff.scala.html` renders `User.anonymous.name` model value when author unknown | current constant `LEGACY_ANONYMOUS_USER_NAME = "User.anonymous.name"` is visibly rendered and frontend tests assert it | needs-parent-decision | Parent decision: verify legacy live copy/model value; if legacy showed localized/English anonymous label, owner scope is `frontend/src/routes/-code-views.tsx` and focused specs |
| commit diff visual exactness | `diff.scala.html` uses `views.html.partial_diff` table/class structure from legacy diff partials | React parses unified patch into a simplified table; functional anchors exist, but full partial-diff class/copy parity was not browser-compared selector by selector | weak evidence | `frontend/src/routes/-code-views.tsx`, focused Playwright selector assertions for `.diff-body`, row classes, line gutters, comment buttons |
| SVN commit comments | `svnDiff.scala.html`, `CommitComment` legacy SVN path | core provenance says legacy SVN `CommitComment` remains deferred; Git commit discussion is implemented | deferred | `crates/server/src/routes/code.rs`, `frontend/src/routes/-code-views.tsx`, only if SVN commit discussion is reprioritized |
| legacy `code/!` ajax JSON route | `conf/routes` `CodeApp.ajaxRequest*`, `code.Browser` metadata loader | `direct_code_ajax_compat` returns legacy-shaped JSON; app runtime uses REST + React | not-applicable | Compatibility route only; no React implementation owner |
| raw visible i18n/message keys | all inspected templates use `Messages(...)` or hardcoded `Raw`/`Edit`; raw keys should not be visible | frontend specs check absence of key strings for code controls; potential `User.anonymous.name` is not a `Messages` key but needs parent verification above | deviation | Same as anonymous fallback row unless parent confirms legacy visible text matched exactly |

## Playwright Scenario Table

| path | state | legacy selector/copy | Rust selector/copy | interaction | API/direct boundary | status |
| --- | --- | --- | --- | --- | --- | --- |
| `/pilot/yona/code` | authenticated/member, populated Git root | `#branches`, `#breadcrumbs`, `.list-wrap`, `code.files`, `code.commits`, `title.branches` | `#branches`, `#breadcrumbs`, `.list-wrap`; visual sweep 200; shell E2E route | change branch select should navigate to selected branch | REST `/api/v1/projects/:owner/:project/code` + React render | covered |
| `/pilot/yona/code/main/README.md` | Markdown file | `#codeVal.markdown-wrap.codebrowser-markdown`; no `#showCode` | `#codeVal.markdown-wrap.codebrowser-markdown`; `MarkdownRenderer`; visual sweep 200 | open README route and inspect rendered Markdown/local image links | REST code payload + React `MarkdownRenderer`; direct `/files` for local images | covered |
| `/pilot/yona/code/main/src/main.rs` | text file | `#showCode.code-wrap`, `Raw`, `Edit`, `code.open`, `code.history` | `#showCode`, `#codeVal.hidden`, raw/open/history anchors | click raw/open/download as direct links | REST render; direct `rawcode`, `files`, `code/:branch/download` byte routes | covered |
| `/pilot/yona/code` | no-head Git/SVN | `code.nohead`, Git clone/init/remote/pull-push or SVN checkout blocks | `CodeNoHeadBlock` with same setup copy; component tests for Git and SVN | route entry only; update permission gates setup commands | REST `noHead=true` + React render | covered |
| `/pilot/yona/commits` | root history | `#history`, `.code-table.commits`, `#branches`, `code.nocommits` when empty | `#history`, `.code-table.commits`, `#branches`; shell E2E route | branch select, copy commit id, A/S pagination shortcut | REST `/api/v1/projects/:owner/:project/commits` + React render | covered |
| `/pilot/yona/commits/main/src/main.rs` | path history | `#breadcrumbs`, `.browse` `code.showCode`, newer/older links | breadcrumbs, `.browse`, `Browse code`, `Older`; shell E2E route | click `Browse code`, pagination links | REST commits with `branch/path/page` + React render | covered |
| `/pilot/yona/commit/HEAD` | commit detail, commentable | `#code-browse-wrap`, `.codediff-wrap`, `.btnPop`, `.board-comment-form`, `#watch-button` | same shell IDs/classes; visual sweep 200; comment E2E covers line and selection comments | add non-ranged comment, line comment, multi-line comment, reply/edit/delete | REST `/api/v1/projects/:owner/:project/commit/:id/comments`; direct legacy form routes preserved as anchors/compat | covered |
| `/pilot/yona/commit/HEAD` | commit watch state | `#watch-button.active.ybtn-watching` toggles through `sWatchUrl`/`sUnwatchUrl` | static `#watch-button` only; no observed mutation or active state | click should toggle watch/unwatch and update copy/class | missing/unclear commit watch API boundary | gap |
| `/pilot/yona/compare/main...main` | no changes | `.commitInfo`, `.alert` `code.noChanges` | `.commitInfo`, `.alert` `No changes`; visual sweep 200 | route entry | REST `/api/v1/projects/:owner/:project/compare/:range` + React render | covered |
| `/pilot/yona/branches` | branch list, admin | `.branch-list-wrap`, `.head`, `.headBranch`, `code.branches.setAsDefault`, `button.delete` | same table classes and action hooks; visual sweep 200; backend mutation contracts | click set-default/delete; default branch actions hidden | REST `/api/v1/projects/:owner/:project/branches/default` and DELETE | weak evidence |
| `/pilot/yona/branches` | non-admin | action `<th>` absent unless update/delete allowed | `showActions` absent unless permissions allow | load as read-only member/non-member | REST permissions projection + React render | weak evidence |
| `/:owner/:project/code/!/*path` | legacy ajax compatibility | JSON consumed by legacy `code.Browser` | `direct_code_ajax_compat` legacy JSON; not app data source | direct GET compatibility only | direct compatibility JSON route | not-applicable |

## Notes For Parent Queue

- Queue as `gap`: commit detail `#watch-button` is visible but not stateful/wired. This is user-visible because legacy commit diff pages let users watch/unwatch the commit resource from the same button.
- Queue as `needs-parent-decision`: visible `User.anonymous.name` fallback should be checked against a live legacy page/model value. If legacy rendered a human label, current React copy is a parity failure.
- Queue as `weak evidence`: branch admin permission-state and diff row exactness are implemented by component/backend evidence, but route-entry visual sweeps do not prove admin/member/non-admin row states or the full diff partial selector surface.
