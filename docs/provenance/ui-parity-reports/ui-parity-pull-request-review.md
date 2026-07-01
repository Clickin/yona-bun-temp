# UI Parity Audit: Pull Request / Review

Status: Wave 3 proof refinement updated
Date: 2026-06-26
Packet: `ui-parity-pull-request-review`
Write scope: PR review bounded implementation packet

2026-07-01 current-state correction: the active React route tree contains the
flat PR list routes (`pullRequests`, `closedPullRequests`, `sentPullRequests`)
and the reintroduced PR create/edit/overview route files under
`frontend/src/routes/$ownerName/$projectName/**`. Active route evidence now
comes from the `project-pullrequests`, `project-pullrequest-create-form`,
`project-pullrequest-edit-form`, and `project-pullrequest-overview` E2E files;
older nested `$owner/$projectName/pullRequest/...` rows remain historical unless
they are explicitly reverified by those active route tests.

## Scope And Evidence

Phase contract: `docs/plans/2026-06-26-full-ui-parity-subagent-phase.md`.

Legacy evidence checked:

- `yona-original/app/views/git/list.scala.html`
- `yona-original/app/views/git/partial_search.scala.html`
- `yona-original/app/views/git/partial_list.scala.html`
- `yona-original/app/views/git/partial_recently_pushed_branches.scala.html`
- `yona-original/app/views/git/create.scala.html`
- `yona-original/app/views/git/edit.scala.html`
- `yona-original/app/views/git/view.scala.html`
- `yona-original/app/views/git/viewChanges.scala.html`
- `yona-original/app/views/git/partial_info.scala.html`
- `yona-original/app/views/git/partial_state.scala.html`
- `yona-original/app/views/git/partial_merge_result.scala.html`
- `yona-original/app/views/git/partial_reviewlist.scala.html`
- `yona-original/app/views/reviewthread/list.scala.html`
- `yona-original/app/views/reviewthread/partial_list.scala.html`
- `yona-original/conf/routes`
- `yona-original/conf/messages`, `yona-original/conf/messages.ko-KR`

Current evidence checked:

- `frontend/src/routes/-pull-request-views.tsx`
- `frontend/src/routes/$owner/$projectName/pullRequests/route.tsx`
- `frontend/src/routes/$owner/$projectName/closedPullRequests/route.tsx`
- `frontend/src/routes/$owner/$projectName/sentPullRequests/route.tsx`
- `frontend/src/routes/$owner/$projectName/newPullRequestForm/route.tsx`
- `frontend/src/routes/$owner/$projectName/pullRequest/$pullRequestNumber/route.tsx`
- `frontend/src/routes/$owner/$projectName/pullRequest/$pullRequestNumber/changes/route.tsx`
- `frontend/src/routes/$owner/$projectName/pullRequest/$pullRequestNumber/changes/$commitId/route.tsx`
- `frontend/src/routes/$owner/$projectName/pullRequest/$pullRequestNumber/editform/route.tsx`
- `frontend/src/routes/$owner/$projectName/reviews/route.tsx`
- `frontend/src/routes/organizations/$organizationName/pullrequests.tsx`
- `frontend/src/routes/organizations/$organizationName/closedPullrequests.tsx`
- `frontend/src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber.tsx`
- `frontend/src/api/pull-requests.ts`
- `frontend/tests/project-pullrequest-overview.e2e.ts`
- `frontend/src/route-parity.spec.tsx`
- `frontend/src/pull-request-list-form-review-i18n.spec.tsx`
- `frontend/src/pull-request-review-i18n.spec.tsx`
- `frontend/src/project-reviews-export.spec.tsx`
- `frontend/tests/pull-request-review-read-parity.e2e.ts`
- `frontend/tests/pull-request-interaction-parity.e2e.ts`
- `crates/server/src/routes/pull_requests.rs`
- `crates/server/src/routes/pull_requests/review_comments.rs`
- `crates/server/tests/pull_request_read_contract.rs`
- `crates/server/tests/pull_request_mutation_contract.rs`
- `.agent/legacy-html-page-audit/{route-coverage,e2e-render-coverage,parity-spec-coverage}.json`
- `output/playwright/visual-sweep/latest.json`

## Route Inventory Summary

Total rows: 22

| status | count |
| --- | ---: |
| covered | 20 |
| gap | 0 |
| deviation | 0 |
| deferred | 0 |
| not-applicable | 2 |
| weak evidence | 0 |
| needs-parent-decision | 0 |

## Result Inventory

| path | legacy evidence | current evidence | status | proposed owner |
| --- | --- | --- | --- | --- |
| `/:owner/:project/pullRequests`, `closedPullRequests`, `sentPullRequests` | `git/list.scala.html` includes `partial_search`; `partial_search.scala.html` renders `#search`, `input[name=filter]`, tabs `.pullrequeset-tab-menu`, `#contributors` except sent tab | `frontend/src/routes/$ownerName/$projectName/pullRequests.tsx` restores the flat open route, `frontend/src/routes/$ownerName/$projectName/closedPullRequests.tsx` restores the flat closed route, and `frontend/src/routes/$ownerName/$projectName/sentPullRequests.tsx` restores the fork-only sent route; `frontend/tests/project-pullrequests.e2e.ts` whole-screen asserts open/closed/sent empty shells plus populated, reviewer-count, and multi-page open rows on the active flat route, active project menu, category-specific `#search` form actions, `.pullrequeset-tab-menu` active state, sent-only `#advanced-search-form` omission, `#contributors` on non-sent categories, New PR link, two-column checkbox, REST categories `open`, `closed`, and `sent`, and no raw message keys. Historical shared PR view evidence remains for additional populated/category variants. | partially covered in 2026-07-01 template-first reset slice | Additional populated variants such as conflict, alternate branch, and recently-pushed prompt should stay follow-up unless separately reverified against the active route tree. |
| PR list rows, empty state, and pagination | `partial_list.scala.html` renders populated `.post-item` rows, title-prefix anchors, review progress, reviewer-count branch, receiver/state cells, `#pagination`, or `.error-wrap` with `pullRequest.is.empty` when empty; JS calls `yobi.Pagination.update` | `frontend/tests/project-pullrequests.e2e.ts` asserts the active flat open, closed, and sent routes render `.post-list-wrap > .error-wrap` with "No pull requests have been received", omit `.post-item`, and omit `#pagination` when the REST page has no rows. The populated `/admin/sample/pullRequests?filter=row` route renders one legacy row with contributor avatar/link, post id, `title-prefix`, stripped title link, author/date infos, closed/total review progress bar, default branch badge, receiver avatar, open state, and empty one-page `#pagination`. The reviewer-count `/admin/sample/pullRequests?filter=reviewer` route renders the legacy `.yobicon-preview` reviewer count branch with `data-html`, joined `data-title`, `#reviewers` href, current-user `over` class, default branch badge, open state, and pagination. The multi-page `/admin/sample/pullRequests?filter=pages&pageNum=1` route renders the legacy `.page-navigation-wrap` pagination with numeric `pageNum`, total pages, disabled prev, and next link preserving the filter. | partially covered in 2026-07-01 template-first reset slice | Reverify conflict/non-default branch variants on the active flat route. |
| PR list contributor special option | `partial_search.scala.html` adds current-user option with `pullRequest.sentByMe` when contributor list contains current user | Wave 3 projects `currentUserId` through the REST list response and renders the legacy `pullRequest.sentByMe` option before contributor rows when that user is in `contributors`; the React select now avoids `<option selected>` props while marking the actual contributor row with `data-selected="true"` and selecting it after mount, so the browser-visible choice stays on the contributor row without React console noise. `route-parity.spec.tsx` and `pull-request-review-read-parity.e2e.ts` pin the option and selected contributor state. | covered | none |
| Recently pushed branch prompt | `partial_search.scala.html` includes `partial_recently_pushed_branches`; routes link to `newPullRequestForm?fromBranch=&toBranch=` and delete pushed branch | `ProjectRecentlyPushedBranches` renders title `pullRequest.pushed.branches.title`, branch link, close/delete URI; render spec covers prompt; `pull-request-interaction-parity.e2e.ts` now clicks the PR link, asserts preserved `fromBranch`/`toBranch`, clicks close, and proves REST `DELETE /api/v1/owners/:owner/projects/:project/pushed-branches/:id` plus React re-render removal | covered | none |
| Organization PR list | `organization/group_pullrequest_list.scala.html` has open/closed tabs, search, project-name rows | `frontend/src/routes/organizations/$organizationName/pullrequests.tsx` and `frontend/src/routes/organizations/$organizationName/closedPullrequests.tsx` render the concrete open/closed PR aggregate flat routes from `organization/group_pullrequest_list.scala.html` plus `group_pullrequest_list_partial.scala.html`; `frontend/tests/organization-pullrequests.e2e.ts` whole-screen proves the org chrome, category-specific left search form action, open/closed active tabs, project-name rows, review progress, assignee/state cells, and REST/TanStack organization pull-request query boundary. | covered in 2026-07-01 template-first reset slice | `frontend/tests/organization-pullrequests.e2e.ts` |
| PR create/edit branch selectors and merge-result block | `create.scala.html` uses `#fromProjectId`, `#fromBranch`, `#toProjectId`, `#toBranch`, hidden `#pullRequestState`, visible merge-check `#status`, commit tab `#__commits`, async merge result | `ProjectPullRequestFormPage` renders selectors, `#__commits`, `#mergeResult`, REST merge-result query, and e2e verifies commit table | covered | none |
| PR create/edit selector/id semantics | Legacy `#pullRequestState` is a hidden state span and `#status` is the merge-check alert; title input is `#title`; body editor is generated by `common.editor("body", ...)` | Wave 3 restores hidden `#pullRequestState`, visible merge-check `#status`, title `#title`, and a body editor id outside those legacy selectors. Render specs and interaction e2e now fill `#title` / `#editor-body-content-body`. | covered | none |
| PR create/edit body validation | Legacy message keys `pullRequest.title.required` and `pullRequest.body.required` exist and server rejects invalid create/edit forms; create/edit pages submit legacy form fields. | Wave 3 React submit blocks blank title/body before REST mutation and surfaces resolved legacy in-page validation alerts. `frontend/tests/pull-request-interaction-parity.e2e.ts` now browser-proves empty create and edit submits for title/body, asserts zero REST POST/PATCH mutations, preserves the visible URL, and checks absence of raw `pullRequest.*`/`review.*`/`title.*` keys. | covered in current follow-up | none |
| PR edit disabled controls | `edit.scala.html` disables from/to project and branch selects and includes hidden fields | Current form disables all four selects in edit mode; e2e asserts disabled controls | covered | none |
| PR detail header, branch info, state block, overview/changes tabs | `view.scala.html`, `partial_info.scala.html`, `partial_branch.scala.html`, `partial_state.scala.html` | `ProjectPullRequestDetailPage`, `PullRequestBranchInfo`, `PullRequestStateNotice`, `PullRequestOverviewTabs`, render/e2e specs | covered | none |
| PR watch/close/reopen/review/unreview/accept/source branch actions | `view.scala.html` has `#watch-button`, edit, close/reopen; `partial_info.scala.html` has `#reviewers`, review/unreview and `#btnAccept`; `partial_state.scala.html` has delete/restore source branch | Detail route mutations plus `PullRequestReviewMergeControls`, `PullRequestActionBar`, `PullRequestStateNotice`; interaction e2e covers watch, review/unreview, close/reopen, accept, delete/restore source branch | covered | none |
| PR delete action | Legacy routes expose no pull-request delete route; only source-branch delete is present at `DELETE /pullRequest/:id/deletefrombranch` | Current exposes source-branch delete/restore only | not-applicable | none |
| PR event timeline i18n | `TemplateHelper.renderEventsOnPullRequest`, `git/partial_pull_request_event.scala.html`, and message keys such as `pullRequest.event.message.commit = {0} has committed.` render interpolated user/action text plus commit rows. | `frontend/tests/project-pullrequest-overview.e2e.ts` covers the active overview empty-event state and a populated `PULL_REQUEST_COMMIT_CHANGED` row, preserving `ul#comments`, `li.event#comment-*`, sender avatar/user links from REST event metadata, date anchor, `Additional changes` compare link, `ul.commit-list`, outdated/current commit row classes, PR-specific change links, author avatar placeholder, author date, and `common.commitMsg` short-link output. REST now projects `senderLabel` and `senderAvatarUrl` for event rows through `frontend/src/api/pull-requests.ts` and `crates/server/src/routes/pull_requests.rs`; review/unreview, state-changed, and merged event variants remain separate route states. | covered in current follow-up | review/unreview, state-changed, and merged event variants |
| PR merge disabled copy/state | `partial_info.scala.html` disables merge with `pull.getMessageForDisabledAcceptButton`; conflict uses `pullRequest.not.acceptable.because.is.conflict`, reviewer shortage uses `pullRequest.not.acceptable.because.is.not.enough.review.point` | `PullRequestReviewMergeControls` computes conflict/reviewer/open disabled titles; conflict e2e checks disabled merge and guide | covered | none |
| PR changes commit dropdown | `viewChanges.scala.html` uses `#commits`, `pullRequest.changes.all`, current commit list, selected outdated label | `PullRequestChangesPage` renders `#commits`, selected commit info, current-only dropdown, outdated selected marker; render/e2e specs cover selected outdated path | covered | none |
| PR changes general comments, inline comments, thread replies, edit/delete | `viewChanges.scala.html` renders `.non-ranged-threads-wrap`, `common.commentForm`, `common.reviewForm`; review thread partials use `.comment-thread-wrap`, delete modal, close/open thread controls | `PullRequestChangesPage`, `ReviewThreadItem`, `PullRequestBlockReviewForm`, route mutations; interaction e2e covers general comment, inline comment, thread reply, edit, delete, close/open | covered | none |
| PR review cards | `viewChanges.scala.html` renders `.review-wrap`, `#reviewcards-open`, `#reviewcards-closed`; `partial_reviewlist.scala.html` renders `.review-card`, `.outdated-label` | `ReviewThreadCards`, `ReviewThreadCard`, render/e2e specs cover open/closed/outdated cards | covered | none |
| Project review-thread list filters/export | `reviewthread/list.scala.html` renders all/participant/author filters, hidden `#search` fields, state tabs, date sort, `format=xls` export | `ProjectReviewsPage`, `projectReviewExcelExportHref`, `project-reviews-export.spec.tsx`, render/e2e specs cover filters, state tabs, pagination and Excel link; `pull-request-review-read-parity.e2e.ts` now browser-clicks all/participant filters, date sort, closed state, search submit, and export href while proving query preservation through REST `/api/v1/owners/:owner/projects/:project/reviews`; search submit and page-input Enter keep legacy GET/pagination attributes but route through TanStack navigation and router-location refetch, with React submit handlers preventing native document navigation before optional callbacks. | covered | none |
| Browser proof for legacy-vs-current interaction parity | Legacy visual artifacts exist for route entry pages; current Playwright e2e uses mocked REST APIs and selectors | Wave 3 adds current mocked-browser proof for contributor special option, selector semantics, stale copy, event interpolation, PR/commit href variants, recently pushed branch close/delete navigation, and `/reviews` filter/sort/state/search/export query preservation. Current follow-up adds browser-visible raw-key absence checks for PR list, closed/sent list, create/edit validation, detail/changes, and `/reviews` route-entry surfaces. Direct legacy form/fragment routes remain compatibility evidence only. | covered in current follow-up | none |
| Direct legacy form/fragment routes | Legacy create/edit/comment/review routes are form/fragment-compatible server endpoints | Current app runtime is React SPA with REST JSON/API-return plus React render; direct legacy HTML fragments are compatibility evidence, not a new frontend data source | not-applicable | none |
| E2E expectation copy drift | Legacy English keys are `pullRequest.is.safe = This pull request can be merged safely.`, `pullRequest.review = Approve`, `pullRequest.merge = Merge`; Korean differs as expected by message files | Wave 3 classifies this as stale test drift and updates the interaction e2e to legacy copy/selectors: safe merge text, `Approve`, `Merge`, reviewer shortage tooltip, and no `.reviewer-status` dependency. | covered | none |
| Review-thread list row visual fidelity | `reviewthread/partial_list.scala.html` renders `.post-list-wrap > .post-item`, `.avatar-wrap.mlarge.hide-in-mobile`, `.title-wrap`, `.post-id`, `a.title`, `.infos`, `.infos-item.item-count-groups`; `_page.less` applies nowrap ellipsis to `.post-item .title-wrap`; `ReviewSearchCondition` includes project comment threads without restricting to pull requests | `/reviews` rows now keep legacy nowrap ellipsis through `.review-list-wrap .post-item .title-wrap`, and REST `/reviews` includes non-PR commit review threads by querying project comment threads without `PullRequestId.is_not_null()`. Focused backend contract asserts a non-PR commit review item with null `pullRequestNumber`; `frontend/tests/pull-request-review-read-parity.e2e.ts` now asserts browser-computed `white-space: nowrap`, `overflow: hidden`, and `text-overflow: ellipsis` on `.review-list-wrap .post-item .title-wrap`. | covered in current follow-up | none |

## Playwright Scenario Matrix

| path | state | legacy selector/copy | Rust selector/copy | interaction | API/direct boundary | status |
| --- | --- | --- | --- | --- | --- | --- |
| `/:owner/:project/pullRequests?pageNum=1` | authenticated project member, populated open list | `#search`, `.pullrequeset-tab-menu`, `#advanced-search-form #contributors`, `.post-list-wrap`, `#pagination` | same selectors in `ProjectPullRequestListPage`; e2e asserts tabs/search/pagination | submit search, tab links, page links | REST `GET /api/v1/owners/:owner/projects/:project/pull-requests?category=open` + React render | covered |
| `/:owner/:project/pullRequests?contributorId=:me` | current user is contributor | legacy option copy `pullRequest.sentByMe` / "Sent by me" under `#contributors` | `#contributors` includes "Sent by me" when REST `currentUserId` matches a contributor | open contributor select/change | REST list DTO + React render | covered |
| `/:owner/:project/pullRequests` | empty list | `.error-wrap`, `pullRequest.is.empty` / "No pull requests have been received" | `frontend/src/routes/$ownerName/$projectName/pullRequests.tsx` renders `.post-list-wrap > .error-wrap`, same message lookup, no rows, and no pagination for an empty REST page | initial render | REST `GET /api/v1/owners/:owner/projects/:project/pull-requests?category=open` + React render | covered in 2026-07-01 template-first reset slice |
| `/:owner/:project/pullRequests` | populated open list row | `.post-list-wrap > .post-item.title`, `showHeaderWordsInBracketsIfExist`, stripped `a.title`, review progress, receiver avatar, state rail, `#pagination` | `frontend/src/routes/$ownerName/$projectName/pullRequests.tsx` renders the active flat route row with `title-prefix`, stripped title, contributor/receiver anchors, review progress bar, default branch badge, open state, and pagination; `frontend/tests/project-pullrequests.e2e.ts` whole-screen compares `/admin/sample/pullRequests?filter=row` against the legacy list/search/row DOM. | initial render | REST `GET /api/v1/owners/:owner/projects/:project/pull-requests?category=open&filter=row` + React render | covered in 2026-07-01 template-first reset slice |
| `/:owner/:project/pullRequests` | reviewer-count open list row | `project.isUsingReviewerCount`, `.yobicon-preview`, `data-html=true`, `data-title` joined reviewer names, `#reviewers` anchor, `.over` when current user reviewed | `frontend/src/routes/$ownerName/$projectName/pullRequests.tsx` renders reviewer-count rows from REST `reviewerCount` / `reviewerNames` plus project `isUsingReviewerCount`; `frontend/tests/project-pullrequests.e2e.ts` whole-screen compares `/admin/sample/pullRequests?filter=reviewer` against the legacy list/search/row DOM. | initial render | REST `GET /api/v1/owners/:owner/projects/:project/pull-requests?category=open&filter=reviewer` + React render | covered in 2026-07-01 template-first reset slice |
| `/:owner/:project/pullRequests` | multi-page open list row | `yobi.Pagination.update($("#pagination"), totalPageCount)` fills `#pagination.page-navigation-wrap`, prev/next icons, numeric `input[name=pageNum]`, delimiter, total page count | `frontend/src/routes/$ownerName/$projectName/pullRequests.tsx` renders an empty `#pagination` for one-page lists and the legacy pagination shell for multi-page lists; `frontend/tests/project-pullrequests.e2e.ts` whole-screen compares `/admin/sample/pullRequests?filter=pages&pageNum=1` against the legacy list/search/row/pagination DOM. | initial render | REST `GET /api/v1/owners/:owner/projects/:project/pull-requests?category=open&filter=pages&pageNum=1` + React render | covered in 2026-07-01 template-first reset slice |
| `/:owner/:project/closedPullRequests` | empty list | `.error-wrap`, `pullRequest.is.empty` / "No pull requests have been received" plus closed tab active and search action pointing at `closedPullRequests` | `frontend/src/routes/$ownerName/$projectName/closedPullRequests.tsx` renders the same legacy shell with `form#search[action$="/closedPullRequests"]`, closed tab active, open tab inactive, `.post-list-wrap > .error-wrap`, no rows, and no pagination for an empty REST page | initial render | REST `GET /api/v1/owners/:owner/projects/:project/pull-requests?category=closed` + React render | covered in 2026-07-01 template-first reset slice |
| `/:owner/:project/sentPullRequests` | forked project empty list | `.error-wrap`, `pullRequest.is.empty` / "No pull requests have been received" plus sent tab active, sent search action, and no `#advanced-search-form` | `frontend/src/routes/$ownerName/$projectName/sentPullRequests.tsx` renders the legacy forked project shell with fork origin header, `form#search[action$="/sentPullRequests"]`, sent tab active, Open/Closed inactive, `Sent code` count pair, no advanced contributor filter, `.post-list-wrap > .error-wrap`, no rows, and no pagination for an empty REST page | initial render | REST `GET /api/v1/owners/:owner/projects/:project/pull-requests?category=sent` + React render | covered in 2026-07-01 template-first reset slice |
| `/:owner/:project/pullRequests` | recently pushed branch exists | `partial_recently_pushed_branches`, `pullRequest.pushed.branches.title`, close link with delete request | `ProjectRecentlyPushedBranches`, delete callback and `data-request-uri` | click PR link and close pushed branch, assert URL/query and row removal | REST list DTO/delete pushed-branch + React render | covered |
| `/:owner/:project/newPullRequestForm` | create form loaded | `#fromProjectId`, `#fromBranch`, `#toProjectId`, `#toBranch`, hidden `#pullRequestState`, alert `#status`, `#__commits` | same selector semantics; title is `#title`, body editor is `#editor-body-content-body` | select branches, check merge result | REST form-options/merge-result/create + React render | covered |
| `/:owner/:project/newPullRequestForm` | empty title/body validation | `pullRequest.title.required`, `pullRequest.body.required` | resolved legacy title/body validation copy appears in-page before REST submit | submit empty form, assert zero REST POST | React render blocks REST create mutation | covered in current follow-up |
| `/:owner/:project/pullRequest/:n/editform` | edit existing PR | disabled `#fromProjectId`, `#fromBranch`, `#toProjectId`, `#toBranch`; hidden original fields | disabled selects are rendered and e2e-covered; create/edit ID semantics now match legacy anchors; empty title/body validation blocks REST PATCH with resolved legacy copy | edit title/body and save; submit empty title/body | REST form-options/edit + React render; invalid submit blocks mutation | covered in current follow-up |
| `/:owner/:project/pullRequest/:n` | open safe PR | `.board-header.issue`, `.pullRequest-branchInfo`, `#state .alert-success`, overview/changes tabs | same shell, `PullRequestStateNotice`, `PullRequestOverviewTabs` | initial render | REST detail + React render | covered |
| `/:owner/:project/pullRequest/:n` | watch/unwatch | `#watch-button`, `project.watch`, `project.unwatch` | `#watch-button`, `data-watching`, REST mutations | click watch twice | REST watch/unwatch + React render | covered |
| `/:owner/:project/pullRequest/:n` | review/unreview and accept | `#reviewers`, `pullRequest.review` / "Approve", `pullRequest.unreview`, `#btnAccept` / `pullRequest.merge` | `#reviewers`, review/unreview buttons, `#btnAccept` | click review, unreview, accept | REST review/unreview/accept + React render | covered |
| `/:owner/:project/pullRequest/:n` | closed/reopened | footer links `data-request-method=post`, `pullRequest.close`, `pullRequest.reopen` | same href/request-method pattern | click close, click reopen | REST close/open + React render | covered |
| `/:owner/:project/pullRequest/:n` | conflict by contributor | `#state .alert-error`, `.howto-resolve-conflict`, `pullRequest.is.not.safe`, resolver git commands | conflict guide renders commands and refresh link; e2e covers disabled merge | initial render, refresh link | REST detail + React render | covered |
| `/:owner/:project/pullRequest/:n` | event timeline | `ul#comments`, interpolated `pullRequest.event.message.*` copy | timeline renders interpolated sender/action text and linked merged commit without raw message keys | initial render after event mutation | REST detail + React render | covered |
| `/:owner/:project/pullRequest/:n` | merged source branch actions | `pullRequest.merged.the.pullrequest`, `pullRequest.delete.branch`, `pullRequest.restore.branch` | `.pull-request-source-branch`, delete/restore button/link | click delete branch, restore branch | REST source-branch delete/post + React render | covered |
| `/:owner/:project/pullRequest/:n/changes` | all changes | `#commits`, `pullRequest.changes.all`, `.diff-body.diffs-wrap-scroll`, `.btnPop` | same selectors; e2e covers default and selected commit | open dropdown/select commit route | REST changes + React render | covered |
| `/:owner/:project/pullRequest/:n/changes/:commitId` | selected outdated commit | selected dropdown label has `review.outdated`; outdated side card appears under closed tab | selected label/outdated card covered by e2e | direct route | REST changes with `commitId` + React render | covered |
| `/:owner/:project/pullRequest/:n/changes` | general comment | `.non-ranged-threads-wrap`, `common.commentForm`, `button.comment.new` | `#comment-form`, `.non-ranged-threads-wrap`, `button.comment.new` | submit comment | REST comments POST + React render | covered |
| `/:owner/:project/pullRequest/:n/changes` | inline review | `common.reviewForm`, line/range thread data attrs, `.comment-thread-wrap` | `.line-comment-trigger`, `.inline-review-form`, `data-range-*`, `.comment-thread-wrap` | click line comment, submit; select range, submit | REST comments POST + React render | covered |
| `/:owner/:project/pullRequest/:n/changes` | thread reply/edit/delete/open/close | legacy comment thread controls, `commentThread.close/open`, `data-toggle=comment-delete` | same controls; e2e covers reply, edit, delete, close/open | click controls and submit forms | REST comments PATCH/DELETE and thread open/close + React render | covered |
| `/:owner/:project/pullRequest/:n/changes` | review cards | `.review-wrap`, `#reviewcards-open`, `#reviewcards-closed`, `.review-card`, `review.outdated` | same selectors and copy | show/hide side cards, tab selection | REST changes + React render | covered |
| `/:owner/:project/reviews?state=open` | filters/search/export | `.lst-stacked`, `review.allReview`, `review.involvingYou`, `review.createdByYou`, hidden form fields, state tabs, `issue.downloadAsExcel` | same selectors/copy, Excel href includes `format=xls` | click all/participant filters, sort, closed state, search submit, export href | REST reviews list/export compatibility + React render | covered |
| `/:owner/:project/reviews?state=open` | row variants | `reviewthread/partial_list.scala.html` row target via `DiffRenderer.urlToCommentThread`, including non-PR commit threads, with nowrap title truncation | `ProjectReviewListRows` creates PR changes and commit anchors, CSS preserves nowrap truncation, and REST includes non-PR commit rows with `pullRequestNumber: null` | initial render with PR and commit threads | REST reviews + React render | covered in current follow-up |

## Nested Layout Follow-Ups

- 2026-06-27 PR list project shell follow-up:
  `frontend/src/routes/$owner/$projectName/route.tsx` now owns the project
  header/menu/page-wrap shell for `/pullRequests`, `/closedPullRequests`, and
  `/sentPullRequests` with the pull request menu active and the legacy
  `pull-request-page` shell class. `ProjectPullRequestListPage` renders only
  the legacy PR list body through `renderShell={false}` for those TanStack
  child routes while preserving direct-render shell output for existing specs.
  Focused coverage:
  `pnpm --dir frontend exec vitest run src/pull-request-list-form-review-i18n.spec.tsx -t "PR list chrome"`.
- 2026-06-27 PR form project shell follow-up:
  `frontend/src/routes/$owner/$projectName/route.tsx` now owns the project
  header/menu/page-wrap shell for `/newPullRequestForm` and
  `/pullRequest/:pullRequestNumber/editform` with the pull request menu active
  and the legacy `pull-request-page` shell class. `ProjectPullRequestFormPage`
  renders only the legacy PR form body through `renderShell={false}` for those
  TanStack child routes while preserving direct-render shell output for
  existing specs. Focused coverage:
  `pnpm --dir frontend exec vitest run src/pull-request-list-form-review-i18n.spec.tsx -t "PR form chrome"`.
- 2026-06-27 PR detail project shell follow-up:
  `frontend/src/routes/$owner/$projectName/route.tsx` now owns the project
  header/menu/page-wrap shell for `/pullRequest/:pullRequestNumber` with the
  pull request menu active and the legacy `pull-request-page` shell class.
  `ProjectPullRequestDetailPage` renders only the legacy PR overview body
  through `renderShell={false}` for that TanStack child route while preserving
  direct-render shell output for existing specs. Focused coverage:
  `pnpm --dir frontend exec vitest run src/pull-request-review-i18n.spec.tsx -t "PR detail chrome"`.
- 2026-06-27 PR changes project shell follow-up:
  `frontend/src/routes/$owner/$projectName/route.tsx` now owns the project
  header/menu/page-wrap shell for `/pullRequest/:pullRequestNumber/changes` and
  `/pullRequest/:pullRequestNumber/changes/:commitId` with the pull request
  menu active and the legacy `pull-request-page` shell class.
  `PullRequestChangesPage` renders only the legacy changes/diff body through
  `renderShell={false}` for those TanStack child routes while preserving
  direct-render shell output for existing specs. Focused coverage:
  `pnpm --dir frontend exec vitest run src/pull-request-review-i18n.spec.tsx -t "PR changes chrome"`.
- 2026-06-27 review-list project shell follow-up:
  `frontend/src/routes/$owner/$projectName/route.tsx` now owns the project
  header/menu/page-wrap shell for `/reviews` with the review menu active and
  the legacy `pull-request-page` shell class. `ProjectReviewsPage` renders only
  the legacy review list body through `renderShell={false}` for that TanStack
  child route while preserving direct-render shell output for existing specs.
  Focused coverage:
  `pnpm --dir frontend exec vitest run src/pull-request-list-form-review-i18n.spec.tsx -t "review-list chrome"`.

## Follow-Up Queue Proposal

1. Reintroduce the active React PR overview/changes/edit route files from legacy `git/view.scala.html`, `git/viewChanges.scala.html`, and `git/edit.scala.html`, then reverify `partial_pull_request_event.scala.html` through rendered `li.event#comment-*` rows.
2. If exact legacy timeline author labels are required beyond login id text, add a focused sender display-name/avatar projection to the PR event DTO.
