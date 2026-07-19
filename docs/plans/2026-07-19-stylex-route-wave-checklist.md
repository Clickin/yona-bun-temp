# StyleX Route Wave Checklist

Status: **active canonical target inventory**  
Parent plan: `docs/plans/2026-07-13-frozen-css-to-stylex-migration.md`  
Snapshot: 2026-07-19, `frontend/src/routes/**/*.tsx` 116 files

이 문서는 매 turn마다 다음 화면을 다시 탐색하지 않기 위한 Wave 1 실행 queue다. 새 wave는 아래 `NEXT`에서만 고른다. 현재 코드나 fallback 소비자가 바뀌었을 때만 해당 행을 재검증하고, 전 route inventory를 반복하지 않는다.

## Status rules

- `NEXT`: active React consumer와 route-local legacy selector가 확인되어 2~6 owner wave를 바로 구성할 수 있다.
- `BLOCKED`: shared fallback, 다른 visible state, 또는 공용 component 선행 작업이 필요하다. 선행조건이 해소될 때만 재분류한다.
- `DONE`: 현재 route-local active owner 후보가 없다. 새 consumer가 생기지 않는 한 재조사하지 않는다.
- `DEAD`: runtime consumer가 없는 residual이다. active owner migration과 섞지 않고 별도 cleanup batch에서만 다룬다.

## NEXT execution queue

한 행은 한 route/visible-state wave다. 서로 다른 파일의 행은 worker 3개까지 병렬 구현하고, browser/build/Vitest는 integration batch당 한 번 실행한다.

| Done | Batch | Route/state | React owners (2~6) | Exact legacy selectors to retire | Legacy evidence |
| --- | --- | --- | --- | --- | --- |
| [x] | A1 | `/$ownerName/$projectName/issue/$issueNumber` populated body/sidebar | `issueBoardAuthor`, `issueBoardContent`, `issueBoardActions`, `issueBoardFooter`, `issueInfo` | `.issue-detail-page .board-body .author-info`, `.board-body .content`, `.board-actrow`, `.board-footer`, `.issue-info` | `issue/view.scala.html:138-206,294-330,454+`; frozen `_page.less` issue-detail rules |
| [x] | A2 | `/$ownerName/$projectName/issues` populated list | `issuePostItem`, `issueTitleWrap`, `issuePostId`, `issueSubtaskProgress`, `issueChildDate` | `.issue-list-page .post-item`, `.title-wrap`, `.title-wrap .post-id`, `.for-subtask-progressbar`, `.child-issue .child-issue-date` | `issue/partial_list.scala.html`, `partial_list_draft.scala.html`, `partial_view_childIssueList.scala.html`; `_page.less:3312-3559` |
| [ ] | A3 | `/$ownerName/$projectName/setting` authenticated setting boxes | `settingBox`, `settingLogoDesc`, `settingDescs`, `settingPoint`, `settingNote` | `.box-wrap .setting-box` and its route-local left/right descendants | `project/setting.scala.html:30-169`; `_page.less:2213-2270` |
| [ ] | B1 | `/$ownerName/$projectName/issueform` remaining editor/option shell | `issueEditorCell`, `issueEditorTabContent`, `rightMenu`, `issueCombobox`, `titleHeadCombobox` | `.issue-form-page-wrap .issue-editor-cell`, `.issue-editor-tab-content`, `.right-menu`, `.issue-combobox`, `.title-head-combobox` | `common/editor.scala.html`, `issue/create.scala.html`; frozen editor/issue-option chain |
| [ ] | B2 | `/$ownerName/$projectName/pullRequest/$pullRequestNumber` overview branches/actions | `pullRequestActions`, `pullRequestBranches`, `pullRequestBranchLabel`, `pullRequestBranchSelect` | `.pull-request-actions`, `.pull-request-branches`, `.pull-request-branches label`, `.pull-request-branches select` | `git/view.scala.html`, `git/partial_state.scala.html`; `_page.less:4296-4314` |
| [ ] | B3 | `/$ownerName/$projectName/search` populated/empty project search | `searchCategory`, `searchBox`, `searchResultTitle`, `searchListItem`, `emptyResult` | `.search-category-wrap`, `.search-box-wrap`, `.search-result-title`, `.search-list-wrap`, `.search-list-item`, `.empty-result` | `search/partial_search.scala.html` and result partials; `_page.less:6375-6415` |
| [ ] | C1 | `/search` populated/empty/error global search family | category base/active/empty, result heading/list, result body/meta, empty result | `.search-category-wrap` subtree, `.search-result-title`, `.search-list-wrap`, `.search-list-item`, `.search-content-body`, `.search-meta-info`, `.empty-result` | `search/result.scala.html`, `partial_search.scala.html`, all result partials; `_page.less:6383-6491` |

`C1` spans `search.tsx` and `-search-screen.tsx`; before implementation it must be split into one audit-safe screen-state change or assigned to one worker with guard-compatible evidence. It is not permission for a global search-selector rewrite.

## Current wave

- [x] Batch 515: issueform assignee control, hidden focus-input display, and selected-value ellipsis owners. The hidden input remains 1px under frozen `.select2-offscreen`; shared Select2/combobox fallback remains.

## Coverage ledger

The inventory was produced in one O(n) pass over the 116 route TSX files and checked against the sorted `rg --files frontend/src/routes | rg '\\.tsx$'` set.

### Project family — 57 files

- `NEXT` 6: the six project rows `A1`–`B3` above.
- `DEAD` 1: `milestones.tsx` (`.milestones .desc` has no active React consumer).
- `DONE` 26: `branches`, `changeVCS`, code/commit index wrappers, `deleteform`, project `index`, issue index, `issue/labelsform`, `members`, milestone index, new-fork wrappers, post index, pull-request changes/index wrappers, `statistics`, `transfer`, `watchers`, `webhooks`.
- `BLOCKED` 24: project root plus `closedPullRequests`, code/file/commit detail routes, compare, issue edit, milestone detail/edit/new, PR create/edit/changes/list variants, post detail/edit/form/list, reviews, sent PRs, and `settingform`. Their remaining selectors are shared code/editor/uploader/post-list/Select2/Bootstrap/modal fallbacks or need another state first.

### Top-level, auth, user, verify — 37 files

- `NEXT` 2 files forming `C1`: `search.tsx`, `-search-screen.tsx`.
- `DEAD` 1: `[_]UIKit.tsx` demo-only surface.
- `DONE` 11: outlet transition helper, help, index wrapper, notification wrappers, migration, direct issue-form wrappers, and `users/login.tsx` alias.
- `BLOCKED` 23: `$user`, home/root/global shell, markdown help, import, auth forms, org/project directory/form, restart/restricted/secret, user settings/files/issues, and verification state branches. Remaining selectors are shared or state-prerequisite boundaries.

### Organization, site-admin, redirect-only — 22 files

- `NEXT` 0.
- `DEAD` 3: leave redirect, organization closed-PR delegate, site pagination helper.
- `DONE` 3: organization delete form, organization index alias, new organization form.
- `BLOCKED` 16: organization home/boards/issues/members/PR/search/settings and nine site-admin screens. Their remaining selectors are shared across sibling routes.

## Dead residual cleanup queue

These are deletion-only candidates, not StyleX owners. Before removal, rerun an exact source/DOM consumer search and add a focused static contract.

- [ ] `.milestones .desc`
- [ ] `#notification-projects li button` base/hover/active blocks
- [ ] `.profile-frmwrap .avatar-frm` residual with no emitted ancestor
- [ ] `.all-projects .project .forked`
- [ ] `.stats-wrap .like` variants
- [ ] `.site-admin-page` subtree

## Refresh trigger

Do not repeat full inventory per turn. Refresh only when one of these occurs:

1. all `NEXT` rows are checked;
2. a shared selector's last consumer is retired;
3. a route changes its visible DOM/state ownership;
4. the route-file set differs from the recorded 116-file snapshot.
