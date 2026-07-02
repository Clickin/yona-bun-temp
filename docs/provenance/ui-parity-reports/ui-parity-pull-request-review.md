# UI Parity Audit: Pull Request / Review

Status: Wave 3 proof refinement updated
Date: 2026-06-26
Packet: `ui-parity-pull-request-review`
Write scope: PR review bounded implementation packet

2026-07-02 current-state correction: the active React route tree contains the
flat PR list routes (`pullRequests`, `closedPullRequests`, `sentPullRequests`),
PR create/edit/overview/changes routes, project reviews route, and organization
PR aggregate routes under `frontend/src/routes/**`. Active route evidence now
comes from the `project-pullrequests`, `organization-pullrequests`,
`project-pullrequest-create-form`, `project-pullrequest-edit-form`,
`project-pullrequest-overview`, `project-pullrequest-changes`, and
`project-reviews` E2E files.

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

- `frontend/src/routes/$ownerName/$projectName/pullRequests.tsx`
- `frontend/src/routes/$ownerName/$projectName/closedPullRequests.tsx`
- `frontend/src/routes/$ownerName/$projectName/sentPullRequests.tsx`
- `frontend/src/routes/$ownerName/$projectName/newPullRequestForm.tsx`
- `frontend/src/routes/organizations/$organizationName/pullrequests.tsx`
- `frontend/src/routes/organizations/$organizationName/closedPullrequests.tsx`
- `frontend/src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber.tsx`
- `frontend/src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes.tsx`
- `frontend/src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes/$commitId.tsx`
- `frontend/src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/editform.tsx`
- `frontend/src/routes/$ownerName/$projectName/reviews.tsx`
- `frontend/src/api/pull-requests.ts`
- `frontend/tests/project-pullrequests.e2e.ts`
- `frontend/tests/organization-pullrequests.e2e.ts`
- `frontend/tests/project-pullrequest-create-form.e2e.ts`
- `frontend/tests/project-pullrequest-edit-form.e2e.ts`
- `frontend/tests/project-pullrequest-overview.e2e.ts`
- `frontend/tests/project-pullrequest-changes.e2e.ts`
- `frontend/tests/project-reviews.e2e.ts`
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
| `/:owner/:project/pullRequests`, `closedPullRequests`, `sentPullRequests` | `git/list.scala.html` includes `partial_search`; `partial_search.scala.html` renders `#search`, `input[name=filter]`, tabs `.pullrequeset-tab-menu`, `#contributors` except sent tab | `frontend/src/routes/$ownerName/$projectName/pullRequests.tsx` restores the flat open route, `frontend/src/routes/$ownerName/$projectName/closedPullRequests.tsx` restores the flat closed route, and `frontend/src/routes/$ownerName/$projectName/sentPullRequests.tsx` restores the fork-only sent route; `frontend/tests/project-pullrequests.e2e.ts` whole-screen asserts open/closed/sent empty shells plus populated, reviewer-count, conflict/non-default branch, recently pushed prompt, and multi-page open rows on the active flat route, active project menu, category-specific `#search` form actions, `.pullrequeset-tab-menu` active state, sent-only `#advanced-search-form` omission, `#contributors` on non-sent categories, New PR link, two-column checkbox, REST categories `open`, `closed`, and `sent`, and no raw message keys. | covered in 2026-07-01 template-first reset slice | none |
| PR list rows, empty state, and pagination | `partial_list.scala.html` renders populated `.post-item` rows, title-prefix anchors, review progress, reviewer-count branch, receiver/state cells, `#pagination`, or `.error-wrap` with `pullRequest.is.empty` when empty; JS calls `yobi.Pagination.update` | `frontend/tests/project-pullrequests.e2e.ts` asserts the active flat open, closed, and sent routes render `.post-list-wrap > .error-wrap` with "No pull requests have been received", omit `.post-item`, and omit `#pagination` when the REST page has no rows. The populated `/admin/sample/pullRequests?filter=row` route renders one legacy row with contributor avatar/link, post id, `title-prefix`, stripped title link, author/date infos, closed/total review progress bar, default branch badge, receiver avatar, open state, and empty one-page `#pagination`. The conflict `/admin/sample/pullRequests?filter=conflict` route renders the legacy conflict title/state classes and non-default `.to-branch` branch badge on the active flat route. The reviewer-count `/admin/sample/pullRequests?filter=reviewer` route renders the legacy `.yobicon-preview` reviewer count branch with `data-html`, joined `data-title`, `#reviewers` href, current-user `over` class, default branch badge, open state, and pagination. The multi-page `/admin/sample/pullRequests?filter=pages&pageNum=1` route renders the legacy `.page-navigation-wrap` pagination with numeric `pageNum`, total pages, disabled prev, and next link preserving the filter. | covered in 2026-07-01 template-first reset slice | none |
| PR list contributor special option | `partial_search.scala.html` adds current-user option with `pullRequest.sentByMe` when contributor list contains current user | `frontend/tests/project-pullrequests.e2e.ts` proves the active flat list route projects `currentUserId` through the REST list response, renders the legacy `Sent by me` option before contributor rows when that user is in `contributors`, keeps the browser-visible selected contributor row stable, and changes `contributorId` through the route query without raw message keys. | covered | none |
| Recently pushed branch prompt | `partial_search.scala.html` includes `partial_recently_pushed_branches`; routes link to `newPullRequestForm?fromBranch=&toBranch=` and delete pushed branch | `frontend/tests/project-pullrequests.e2e.ts` covers the `ProjectRecentlyPushedBranches` prompt on the active flat route, including title copy, `newPullRequestForm?fromBranch=feature/ui&toBranch=main` link, close button request method/URI, REST `DELETE /api/v1/owners/:owner/projects/:project/pushed-branches/:id`, and React removal after close. | covered | none |
| Organization PR list | `organization/group_pullrequest_list.scala.html` has open/closed tabs, search, project-name rows | `frontend/src/routes/organizations/$organizationName/pullrequests.tsx` and `frontend/src/routes/organizations/$organizationName/closedPullrequests.tsx` render the concrete open/closed PR aggregate flat routes from `organization/group_pullrequest_list.scala.html` plus `group_pullrequest_list_partial.scala.html`; `frontend/tests/organization-pullrequests.e2e.ts` whole-screen proves the org chrome, category-specific left search form action, open/closed active tabs, project-name rows, review progress, assignee/state cells, and REST/TanStack organization pull-request query boundary. | covered in 2026-07-01 template-first reset slice | `frontend/tests/organization-pullrequests.e2e.ts` |
| PR create/edit branch selectors and merge-result block | `create.scala.html` uses `#fromProjectId`, `#fromBranch`, `#toProjectId`, `#toBranch`, hidden `#pullRequestState`, visible merge-check `#status`, commit tab `#__commits`, async merge result | `ProjectPullRequestFormPage` renders selectors, `#__commits`, `#mergeResult`, REST merge-result query, and e2e verifies commit table | covered | none |
| PR create/edit selector/id semantics | Legacy `#pullRequestState` is a hidden state span and `#status` is the merge-check alert; title input is `#title`; body editor is generated by `common.editor("body", ...)` and includes `help.markdown()`; uploader is `common.fileUploader(ResourceType.PULL_REQUEST, ...)`. | Active create/edit routes restore hidden `#pullRequestState`, visible merge-check `#status`, title `#title`, the legacy editor shell with normalized stable `#editor-body-body`, injected markdown help, and `#upload[data-resource-type=PULL_REQUEST]` with the edit resource id. Browser E2E fills `#title` / `#editor-body-body` and compares the full form DOM. | covered | none |
| PR create/edit body validation | Legacy message keys `pullRequest.title.required` and `pullRequest.body.required` exist and server rejects invalid create/edit forms; create/edit pages submit legacy form fields. | `frontend/tests/project-pullrequest-create-form.e2e.ts` and `frontend/tests/project-pullrequest-edit-form.e2e.ts` browser-prove empty title/body submits surface resolved legacy in-page validation alerts, preserve the visible URL, block REST create/edit mutation, and keep raw `pullRequest.*`/`review.*`/`title.*` keys out of the page. | covered in current follow-up | none |
| PR edit disabled controls | `edit.scala.html` disables from/to project and branch selects and includes hidden fields | Current form disables all four selects in edit mode; e2e asserts disabled controls | covered | none |
| PR detail header, branch info, state block, overview/changes tabs | `view.scala.html`, `partial_info.scala.html`, `partial_branch.scala.html`, `partial_state.scala.html` | `ProjectPullRequestDetailPage`, `PullRequestBranchInfo`, `PullRequestStateNotice`, `PullRequestOverviewTabs`, render/e2e specs | covered | none |
| PR watch/close/reopen/review/unreview/accept/source branch actions | `view.scala.html` has `#watch-button`, edit, close/reopen; `partial_info.scala.html` has `#reviewers`, review/unreview and `#btnAccept`; `partial_state.scala.html` has delete/restore source branch | `frontend/tests/project-pullrequest-overview.e2e.ts` covers watch/edit/close/reopen/review/unreview/accept controls on the active overview route and merged source-branch delete/restore controls, preserving `#watch-button`, `#reviewers`, `#btnAccept`, delete `button[data-request-method=delete][data-request-uri]`, restore `a[data-request-method=post]`, and the corresponding REST mutation boundaries. | covered in current follow-up | none |
| PR delete action | Legacy routes expose no pull-request delete route; only source-branch delete is present at `DELETE /pullRequest/:id/deletefrombranch` | Current exposes source-branch delete/restore only | not-applicable | none |
| PR event timeline i18n | `TemplateHelper.renderEventsOnPullRequest`, `git/partial_pull_request_event.scala.html`, and message keys such as `pullRequest.event.message.commit = {0} has committed.` render interpolated user/action text plus commit rows. | `frontend/tests/project-pullrequest-overview.e2e.ts` covers the active overview empty-event state and populated `partial_pull_request_event.scala.html` rows for `PULL_REQUEST_COMMIT_CHANGED`, `PULL_REQUEST_REVIEW_STATE_CHANGED` DONE/CANCEL, `PULL_REQUEST_STATE_CHANGED` closed/merged/conflict/resolved, and `PULL_REQUEST_MERGED`, preserving `ul#comments`, `li.event#comment-*`, state label classes/copy, sender avatar/user links from REST event metadata, date anchors, `Additional changes` compare link, `ul.commit-list`, outdated/current commit row classes, PR-specific change links, commit author profile link/email text, author date, `common.commitMsg` short-link output, and merged commit link title/href/text. REST projects `senderLabel` and `senderAvatarUrl` for event rows through `frontend/src/api/pull-requests.ts` and `crates/server/src/routes/pull_requests.rs`; React uses legacy message placeholders to insert sender and commit links without adding wrapper DOM. | covered in current follow-up | none for the current overview event states |
| PR merge disabled copy/state | `partial_info.scala.html` disables merge with `pull.getMessageForDisabledAcceptButton`; conflict uses `pullRequest.not.acceptable.because.is.conflict`, reviewer shortage uses `pullRequest.not.acceptable.because.is.not.enough.review.point` | `PullRequestReviewMergeControls` computes conflict/reviewer/open disabled titles; conflict e2e checks disabled merge and guide | covered | none |
| PR changes commit dropdown | `viewChanges.scala.html` uses `#commits`, `pullRequest.changes.all`, current commit list, selected outdated label | `PullRequestChangesPage` renders `#commits`, selected commit info, current-only dropdown, outdated selected marker; render/e2e specs cover selected outdated path | covered | none |
| PR changes general comments, inline comments, thread replies, edit/delete | `viewChanges.scala.html` renders `.non-ranged-threads-wrap`, `common.commentForm`, `common.reviewForm`; review thread partials use `.comment-thread-wrap`, delete modal, close/open thread controls | `PullRequestChangesPage`, `ReviewThreadItem`, `PullRequestBlockReviewForm`, route mutations; interaction e2e covers general comment, inline comment, thread reply, edit, delete, close/open | covered | none |
| PR review cards | `viewChanges.scala.html` renders `.review-wrap`, `#reviewcards-open`, `#reviewcards-closed`; `partial_reviewlist.scala.html` renders `.review-card`, `.outdated-label` | `ReviewThreadCards`, `ReviewThreadCard`, render/e2e specs cover open/closed/outdated cards | covered | none |
| Project review-thread list filters/export | `reviewthread/list.scala.html` renders all/participant/author filters, hidden `#search` fields, state tabs, date sort, `format=xls` export | `frontend/src/routes/$ownerName/$projectName/reviews.tsx` and `frontend/tests/project-reviews.e2e.ts` cover the active flat review route filters, hidden `#search` fields, state tabs, pagination placeholder, row variants, Excel `format=xls` link, all/participant filters, date sort, closed state, and search query preservation through REST `/api/v1/owners/:owner/projects/:project/reviews`. | covered | none |
| Browser proof for legacy-vs-current interaction parity | Legacy visual artifacts exist for route entry pages; current Playwright e2e uses mocked REST APIs and selectors | Current mocked-browser proof lives in `frontend/tests/project-pullrequests.e2e.ts`, `frontend/tests/organization-pullrequests.e2e.ts`, `frontend/tests/project-pullrequest-create-form.e2e.ts`, `frontend/tests/project-pullrequest-edit-form.e2e.ts`, `frontend/tests/project-pullrequest-overview.e2e.ts`, `frontend/tests/project-pullrequest-changes.e2e.ts`, and `frontend/tests/project-reviews.e2e.ts`, covering contributor option, selector semantics, event interpolation, PR/commit href variants, recently pushed branch delete/navigation, `/reviews` filter/sort/state/search/export query preservation, and route-entry raw-key absence. Direct legacy form/fragment routes remain compatibility evidence only. | covered in current follow-up | none |
| Direct legacy form/fragment routes | Legacy create/edit/comment/review routes are form/fragment-compatible server endpoints | Current app runtime is React SPA with REST JSON/API-return plus React render; direct legacy HTML fragments are compatibility evidence, not a new frontend data source | not-applicable | none |
| E2E expectation copy drift | Legacy English keys are `pullRequest.is.safe = This pull request can be merged safely.`, `pullRequest.review = Approve`, `pullRequest.merge = Merge`; Korean differs as expected by message files | Wave 3 classifies this as stale test drift and updates the interaction e2e to legacy copy/selectors: safe merge text, `Approve`, `Merge`, reviewer shortage tooltip, and no `.reviewer-status` dependency. | covered | none |
| Review-thread list row visual fidelity | `reviewthread/partial_list.scala.html` renders `.post-list-wrap > .post-item`, `.avatar-wrap.mlarge.hide-in-mobile`, `.title-wrap`, `.post-id`, `a.title`, `.infos`, `.infos-item.item-count-groups`; `_page.less` applies nowrap ellipsis to `.post-item .title-wrap`; `ReviewSearchCondition` includes project comment threads without restricting to pull requests | `/reviews` rows now keep legacy nowrap ellipsis through `.review-list-wrap .post-item .title-wrap`, and REST `/reviews` includes non-PR commit review threads by querying project comment threads without `PullRequestId.is_not_null()`. Focused backend contract asserts a non-PR commit review item with null `pullRequestNumber`; `frontend/tests/project-reviews.e2e.ts` asserts browser-computed `white-space: nowrap`, `overflow: hidden`, and `text-overflow: ellipsis` on `.review-list-wrap .post-item .title-wrap`. | covered in current follow-up | none |

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
| `/:owner/:project/newPullRequestForm` | create form loaded | `#fromProjectId`, `#fromBranch`, `#toProjectId`, `#toBranch`, hidden `#pullRequestState`, alert `#status`, `#__commits` | same selector semantics; title is `#title`, body editor is stable `#editor-body-body`, markdown help is injected, uploader is `#upload[data-resource-type=PULL_REQUEST]` | select branches, check merge result | REST form-options/merge-result/create + React render | covered |
| `/:owner/:project/newPullRequestForm` | empty title/body validation | `pullRequest.title.required`, `pullRequest.body.required` | resolved legacy title/body validation copy appears in-page before REST submit | submit empty form, assert zero REST POST | React render blocks REST create mutation | covered in current follow-up |
| `/:owner/:project/pullRequest/:n/editform` | edit existing PR | disabled `#fromProjectId`, `#fromBranch`, `#toProjectId`, `#toBranch`; hidden original fields | disabled selects are rendered and e2e-covered; create/edit ID semantics now match legacy anchors; empty title/body validation blocks REST PATCH with resolved legacy copy | edit title/body and save; submit empty title/body | REST form-options/edit + React render; invalid submit blocks mutation | covered in current follow-up |
| `/:owner/:project/pullRequest/:n` | open safe PR | `.board-header.issue`, `.pullRequest-branchInfo`, `#state .alert-success`, overview/changes tabs | same shell; inactive overview/changes tab navigation uses TanStack Router `Link` while preserving the legacy rendered `href`; active tab stays a plain legacy anchor to avoid TanStack active attributes in the compared DOM | initial render; click rendered Changes tab and assert SPA transition without leaked project-home search defaults | REST detail/changes + React render | covered in current follow-up |
| `/:owner/:project/pullRequest/:n` | watch/unwatch | `#watch-button`, `project.watch`, `project.unwatch` | `#watch-button`, `data-watching`, REST mutations | click watch twice | REST watch/unwatch + React render | covered |
| `/:owner/:project/pullRequest/:n` | review/unreview and accept | `#reviewers`, `pullRequest.review` / "Approve", `pullRequest.unreview`, `#btnAccept` / `pullRequest.merge` | `#reviewers`, review/unreview buttons, `#btnAccept` | click review, unreview, accept | REST review/unreview/accept + React render | covered |
| `/:owner/:project/pullRequest/:n` | closed/reopened | footer links `data-request-method=post`, `pullRequest.close`, `pullRequest.reopen` | same href/request-method pattern | click close, click reopen | REST close/open + React render | covered |
| `/:owner/:project/pullRequest/:n` | conflict by contributor | `#state .alert-error`, `.howto-resolve-conflict`, `pullRequest.is.not.safe`, resolver git commands | conflict guide renders commands and refresh link; e2e covers disabled merge | initial render, refresh link | REST detail + React render | covered |
| `/:owner/:project/pullRequest/:n` | event timeline | `ul#comments`, interpolated `pullRequest.event.message.*` copy, review approve/cancel rows, state-change rows, commit-change rows | timeline renders interpolated sender/action text, commit-change list rows, review approve/cancel rows, state closed/merged rows, and linked merged commit without raw message keys | initial render with populated event fixtures | REST detail + React render | covered in current follow-up |
| `/:owner/:project/pullRequest/:n` | merged source branch actions | `partial_state.scala.html`: `alert alert-info`, receiver `.usf-group`, `pullRequest.merged.the.pullrequest`, branch `<code>`, `pullRequest.delete.branch`, `pullRequest.restore.branch` | `frontend/tests/project-pullrequest-overview.e2e.ts` compares the active overview route for merged delete and restore source-branch states, preserving `#state .alert-info`, receiver avatar/name/login, accepted copy, branch `<code>`, delete `button[data-request-method=delete][data-request-uri$="/deletefrombranch"]`, and restore `a[data-request-method=post][href$="/restorefrombranch"]`. | initial render with permission/source-branch fixtures | REST detail + React render | covered in current follow-up |
| `/:owner/:project/pullRequest/:n/changes` | all changes | `#commits`, `pullRequest.changes.all`, `.diff-body.diffs-wrap-scroll`, `.btnPop` | same selectors; e2e covers default and selected commit | open dropdown/select commit route | REST changes + React render | covered |
| `/:owner/:project/pullRequest/:n/changes/:commitId` | selected outdated commit | selected dropdown label has `review.outdated`; outdated side card appears under closed tab | selected label/outdated card covered by e2e | direct route | REST changes with `commitId` + React render | covered |
| `/:owner/:project/pullRequest/:n/changes` | general comment | `.non-ranged-threads-wrap`, `common.commentForm`, `button.comment.new` | `#comment-form`, `.non-ranged-threads-wrap`, `button.comment.new` | submit comment | REST comments POST + React render | covered |
| `/:owner/:project/pullRequest/:n/changes` | inline review | `common.reviewForm`, line/range thread data attrs, `.comment-thread-wrap` | `.line-comment-trigger`, `.inline-review-form`, `data-range-*`, `.comment-thread-wrap` | click line comment, submit; select range, submit | REST comments POST + React render | covered |
| `/:owner/:project/pullRequest/:n/changes` | thread reply/edit/delete/open/close | legacy comment thread controls, `commentThread.close/open`, `data-toggle=comment-delete` | same controls; e2e covers reply, edit, delete, close/open | click controls and submit forms | REST comments PATCH/DELETE and thread open/close + React render | covered |
| `/:owner/:project/pullRequest/:n/changes` | review cards | `.review-wrap`, `#reviewcards-open`, `#reviewcards-closed`, `.review-card`, `review.outdated` | same selectors and copy | show/hide side cards, tab selection | REST changes + React render | covered |
| `/:owner/:project/reviews?state=open` | filters/search/export | `.lst-stacked`, `review.allReview`, `review.involvingYou`, `review.createdByYou`, hidden form fields, state tabs, `issue.downloadAsExcel` | same selectors/copy, Excel href includes `format=xls` | click all/participant filters, sort, closed state, search submit, export href | REST reviews list/export compatibility + React render | covered |
| `/:owner/:project/reviews?state=open` | row variants | `reviewthread/partial_list.scala.html` row target via `DiffRenderer.urlToCommentThread`, including non-PR commit threads, with nowrap title truncation | `ProjectReviewListRows` creates PR changes and commit anchors, CSS preserves nowrap truncation, and REST includes non-PR commit rows with `pullRequestNumber: null` | initial render with PR and commit threads | REST reviews + React render | covered in current follow-up |

## Active Route Shell Evidence

- 2026-07-02 PR list shell:
  `frontend/src/routes/$ownerName/$projectName/pullRequests.tsx`,
  `closedPullRequests.tsx`, and `sentPullRequests.tsx` own the active flat
  list routes. `frontend/tests/project-pullrequests.e2e.ts` proves the project
  header/menu/page-wrap shell, pull request menu active state, legacy search
  rail, tabs, empty/populated rows, pagination, contributor filter, and
  recently pushed branch prompt.
- 2026-07-02 PR form shell:
  `frontend/src/routes/$ownerName/$projectName/newPullRequestForm.tsx` and
  `pullRequest/$pullRequestNumber/editform.tsx` own the create/edit flat
  routes. `frontend/tests/project-pullrequest-create-form.e2e.ts` and
  `frontend/tests/project-pullrequest-edit-form.e2e.ts` prove the project
  shell plus legacy form selectors, editor/uploader DOM, merge-result area, and
  validation behavior.
- 2026-07-02 PR detail and changes shells:
  `frontend/src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber.tsx`,
  `pullRequest/$pullRequestNumber/changes.tsx`, and
  `pullRequest/$pullRequestNumber/changes/$commitId.tsx` own the active flat
  overview and changes routes. `frontend/tests/project-pullrequest-overview.e2e.ts`
  and `frontend/tests/project-pullrequest-changes.e2e.ts` prove the project
  shell, overview/changes tab hrefs, state blocks, PR actions, event timeline,
  diff dropdown, comment forms, inline thread controls, and review cards.
- 2026-07-02 project and organization review shells:
  `frontend/src/routes/$ownerName/$projectName/reviews.tsx`,
  `frontend/src/routes/organizations/$organizationName/pullrequests.tsx`, and
  `frontend/src/routes/organizations/$organizationName/closedPullrequests.tsx`
  own the active review and organization PR aggregate routes.
  `frontend/tests/project-reviews.e2e.ts` and
  `frontend/tests/organization-pullrequests.e2e.ts` prove legacy filters, tabs,
  row DOM, export link, and SPA tab transitions.

## Follow-Up Queue Proposal

1. If exact legacy timeline author labels are required beyond login id text, add a focused sender display-name/avatar projection to the PR event DTO and extend `frontend/tests/project-pullrequest-overview.e2e.ts`.
