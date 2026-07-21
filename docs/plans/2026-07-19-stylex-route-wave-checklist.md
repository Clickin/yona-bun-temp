# StyleX Screen Migration Checklist

Status: **active canonical target inventory**  
Parent plan: `docs/plans/2026-07-13-frozen-css-to-stylex-migration.md`  
Snapshot: 2026-07-19 (`frontend/src/routes/**/*.tsx`: 116; routable entries: 110; legacy Scala templates: 242)

### 2026-07-20 Batch 658 search empty-result image-owner proof

- [x] Global, project, and organization search empty-result owners emit the
  frozen `no_contents.jpg` background through runtime base-path-aware StyleX.
- [x] Retain the legacy empty-result element/class contract and frozen/generated
  fallback evidence; no `yona-original` source changed.
- [x] Focused E2E assertions cover all three image owners; unrelated baseline
  failures remain explicitly recorded in the parity report.

### 2026-07-20 Batch 659 project error-wrap owner proof

- [x] Project reviews empty, project posts empty, and project members
  authorization states own the frozen `.error-wrap` geometry, sprite icon
  geometry, and message typography through colocated StyleX.
- [x] Legacy classes/DOM/copy remain intact; the shared fallback stays active
  for other error states.
- [x] Normal and fallback-off focused Playwright checks pass for all three
  owners at desktop and mobile viewports.

### 2026-07-20 Batch 660 organization error-wrap owner proof

- [x] Organization boards, issues, and pull-request empty states own the
  frozen `.error-wrap`, `ico-err1` sprite, and message declarations through
  existing route-local StyleX modules.
- [x] Legacy classes/DOM/copy remain intact; the shared fallback remains for
  other error states and parent list geometry.
- [x] Normal and fallback-off focused Playwright checks pass for all three
  owners at desktop and mobile viewports.

### 2026-07-20 Batch 661 project/organization error-wrap owner proof

- [x] Project issue-list empty, project pull-request-list empty, and
  organization-members forbidden states own the frozen `.error-wrap`, sprite,
  and message declarations through colocated StyleX.
- [x] Legacy classes/DOM/copy remain intact; the shared fallback remains for
  all remaining error states.
- [x] Normal and fallback-off focused Playwright checks pass 3/3 for the three
  owners at desktop and mobile viewports.

### 2026-07-21 Batch 662 project detail error-wrap owner proof

- [x] Project issue-detail not-found, pull-request detail error, and
  pull-request changes error states own the frozen `.error-wrap`, `ico-err2`,
  and message declarations through colocated StyleX.
- [x] Legacy DOM/classes/copy, list navigation, and 403/404 branches remain
  intact; the shared fallback remains for other error consumers.
- [x] Serial managed Playwright checks pass 3/3 in normal and 3/3 with
  `VITE_DISABLE_LEGACY_FALLBACK=1`, covering desktop/mobile geometry.

이 문서는 매 turn의 대상 화면 재탐색을 없애는 실행 source of truth다. 다음 작업은 아래 ID 중 미완료 항목에서만 고른다. route 전체 검색은 `Refresh trigger`가 발생할 때만 수행한다.

## Completion model

각 화면은 아래 여섯 gate를 순서대로 통과한다. `StyleX` 파일이 있거나 route-local 후보가 없다는 이유만으로 완료 처리하지 않는다.

- `L`: legacy root/partials/LESS와 visible-state matrix 확인
- `O`: 모든 frozen-backed visual owner를 StyleX로 이전
- `E`: desktop/mobile 및 interaction focused E2E 통과
- `C`: exact source/DOM search로 해당 fallback 소비자 0 확인
- `R`: 소비자 0인 fallback declaration/block 삭제
- `✓`: L/O/E/C/R 모두 완료

상태값은 `NEXT`, `READY`, `DEPENDENCY`, `DEFERRED`, `INVALID`, `COMPLETE`만 사용한다. `className`은 legacy DOM 계약일 수 있으므로 완료 판정 근거가 아니라 조사 우선순위 proxy다.

## Immediate queue

한 batch는 서로 다른 screen ID 3개, 총 12~18 owner를 기본으로 한다. worker는 독립 worktree에서 병렬 구현하고 integration worktree에서 browser/typecheck/Vitest/build를 한 번 실행한다.

| Order | IDs | Work | Dependency |
| --- | --- | --- | --- |
| 1 | FALLBACK-OFF-01 | unlink only the React-served fallback asset, run global desktop/mobile E2E, and record a dated classification report | Batch 532 runtime toggle; default fallback stays enabled |
| 2 | StyleX owner / global bridge / parity defect | repair the classified failure in the owning lane; use one focused fallback-off E2E per assembled 2–6-owner wave | frozen `yona-original` CSS/LESS stays immutable |
| 3 | C/R selector families | retire only after a green global fallback-off run plus exact multi-route consumer proof | shared fallback retirement, not new screen ownership |
| 4 | SITE-04 / ROOT-01 / PROJECT-01 | last-consumer lanes after all shared-family proof | no isolated route owner remains |

## Canonical screen checklist

`Gates`의 `L-----`은 legacy mapping만 확인됐다는 뜻이다. 이전 ledger로 owner가 일부 존재하더라도 전체 state의 C/R gate가 증명되지 않았다면 `O`를 올리지 않는다.

### Shared, top-level, auth

| ID | Route / visible states | Legacy root and principal partials | Status | Gates |
| --- | --- | --- | --- | --- |
| HOME-01 | `/`: anonymous intro; authenticated dashboard; project/org/recent lists; flashes | `index/index.scala.html`, `partial_intro`, `sidebar`, `myProjectList*`, `allProjectList*`, `allOrganizationList*`, `myRecentIssueList*` | DEPENDENCY | L----- |
| HOME-02 | `/notifications`, `/notification`: empty/populated/expanded notification states | `index/notifications.scala.html`, `partial_notifications.scala.html` | DEPENDENCY | L----- |
| ROOT-01 | global navbar/usermenu/sidebar; anonymous/authenticated; login dialog/error | `common/navbar.scala.html`, `usermenu*.scala.html`, `loginDialog.scala.html`, site layout | DEPENDENCY | L----- |
| HELP-01 | `/_help`: TOC/FAQ closed/open and sprite states | `help/toc.scala.html` | COMPLETE | LOECR✓ |
| HELP-02 | shared markdown help navigation active/inactive | `help/markdown.scala.html` | DEPENDENCY | LOE--- |
| HELP-03 | markdown pane/table/code/task-list responsive states | `help/markdown.scala.html`; `_markdown.less`, `_responsive.less` | DEPENDENCY | LOE--- |
| SEARCH-01 | `/search`: residual category/avatar/content/body/meta/link/empty/error states | `search/result.scala.html`, `partial_search` and all result partials | DEPENDENCY | LOE--- |
| SEARCH-02 | `-search-screen`: dead `LegacySearchBody` removed; imported error bodies/predicates retained | same search templates | COMPLETE | L--CR✓ |
| SEARCH-03 | `/organizations/$organizationName/search`: categories, populated result types, empty | search templates and organization result partials | DEPENDENCY | LOE--- |
| SEARCH-04 | no safe retirement: bridge-only flex/reset/spacing, legacy DOM classes, and empty image/geometry remain | `_page.less:6375-6505`; generated frozen Yobi remains whole-module fallback | DEPENDENCY | ---C-- |
| SEARCH-05 | project search residual input/avatar/title/content/body/meta/link states | project search template and result partials | DEPENDENCY | LOE--- |
| DIR-01 | `/projects`: populated/empty/filter/pagination/fork/member states | `project/list.scala.html` | DEPENDENCY | L----- |
| DIR-02 | `/orgs`: populated/empty/filter/pagination | `organization/list.scala.html` | DEPENDENCY | L----- |
| CREATE-01 | `/projectform`: owner/scope/VCS/options/validation | `project/create.scala.html`, `common/select2.scala.html` | DEPENDENCY | L----- |
| IMPORT-01 | `/_import`: owner/scope/VCS/repo-auth/validation/submission | `project/importing.scala.html`, `common/select2.scala.html` | DEPENDENCY | L----- |
| MIG-01 | `/migration`: disabled/forbidden plus reachable source/destination/progress states | `migration/home.scala.html`, `migrationPageLayout.scala.html` | DEFERRED | L----- |
| AUTH-01 | `/users/loginform`: login/error/OAuth/already-authenticated redirect | `user/login.scala.html`, `common/loginDialog.scala.html` | DEPENDENCY | LOE--- |
| AUTH-02 | `/users/signupform`: validation/OAuth/restricted/success/error | `user/signup.scala.html` | DEPENDENCY | LOE--- |
| AUTH-03 | `/lostPassword`: anonymous/authenticated/requested/error | `site/lostPassword.scala.html` | DEPENDENCY | LOE--- |
| AUTH-04 | `/resetPassword`: valid form/validation/invalid token | `user/resetPassword.scala.html` | DEPENDENCY | LOE--- |
| AUTH-05 | `/restricted`, `/secret`, `/restart`: standalone restricted/setup/result states | `restricted.scala.html`, `welcome/secret.scala.html`, `welcome/restart.scala.html` | DEPENDENCY | LOE--- |
| UIKIT-01 | `/_UIKit`: controls, tabs/switches, labels/message demo states | `help/UIKit.scala.html` | DEFERRED | L----- |

### User and organization

| ID | Route / visible states | Legacy root and principal partials | Status | Gates |
| --- | --- | --- | --- | --- |
| USER-01 | `/$user`: profile plus issues/PR/projects populated/empty/not-found | `user/view.scala.html`, `partial_issues`, `partial_pullRequests`, `partial_projectlist` | DEPENDENCY | LOE--- |
| USER-02 | `/user/editform`: settings shell/profile/avatar upload-crop | `user/edit.scala.html`, `partial_edit_tabmenu` | DEPENDENCY | LOE--- |
| USER-03 | editform emails/password/notifications/token state matrices | `user/edit_{emails,password,notifications,token}.scala.html`, tab menu | DEPENDENCY | LOE--- |
| USER-04 | `/user/files`: empty/populated/search/actions/pagination | `user/userFiles.scala.html`, `common/mySeriesMenuTab.scala.html` | DEPENDENCY | LOE--- |
| USER-05 | `/user/issues`: open/closed/filter/quick-search/subtasks/pagination | `issue/my_list.scala.html`, `my_partial_*` | DEPENDENCY | LOE--- |
| USER-06 | direct issue form new/mine/comment-derived states | `issue/create.scala.html` | INVALID | L----- |
| ORG-01 | `/organizations/new`: form/validation/success/error | `organization/create.scala.html` | DEPENDENCY | LOE--- |
| ORG-02 | organization layout/home: header/menu/project/member/filter states | `organizationLayout`, `header`, `menu`, `view.scala.html` | DEPENDENCY | LOE--- |
| ORG-03 | settingform/members/delete: logo, enrollment, roles, modals | `organization/{setting,members,deleteForm}.scala.html`, `partial_settingmenu` | DEPENDENCY | LOE--- |
| ORG-04 | boards/issues/pullrequests open/closed/populated/empty/pagination | `group_{board,issue,pullrequest}_list*.scala.html` | DEPENDENCY | L----- |

### Project settings and home

| ID | Route / visible states | Legacy root and principal partials | Status | Gates |
| --- | --- | --- | --- | --- |
| PROJECT-01 | project layout/home readme/dashboard/history/nohead | `projectLayout`, `header`, `projectMenu`, `home`, `partial_readme`, `partial_dashboard*`, `partial_history` | DEPENDENCY | L----- |
| PROJECT-02 | setting/settingform loaded/error/validation | `project/setting.scala.html`, `partial_settingmenu` | DEPENDENCY | LOE--- |
| PROJECT-03 | changeVCS/delete/transfer/members | corresponding project templates plus setting menu | DEPENDENCY | L----- |
| PROJECT-04 | issue labels categories/labels CRUD | `project/issuelabels.scala.html`, `partial_issuelabels_*` | DEPENDENCY | L----- |
| PROJECT-05 | webhooks list/create/delete/test | `project/webhooks.scala.html`, `partial_webhooks_list` | DEPENDENCY | L----- |
| PROJECT-06 | watchers and statistics/chart states | `project/watchers.scala.html`, `project/statistics.scala.html` | DEPENDENCY | LOE--- |

### Issue, milestone, board

| ID | Route / visible states | Legacy root and principal partials | Status | Gates |
| --- | --- | --- | --- | --- |
| ISSUE-01 | issues filter shell/list/draft/empty/paging/mass-update | `issue/list.scala.html`, `partial_list*`, `partial_searchform`, `partial_massupdate` | DEPENDENCY | LOE--- |
| ISSUE-02 | issue create form/editor/options/upload/validation | `issue/create.scala.html`, assignee/label/subtask partials | DEPENDENCY | LOE--- |
| ISSUE-03 | issue detail header/body/sidebar/open-closed/error | `issue/view.scala.html` | DEPENDENCY | LOE--- |
| ISSUE-04 | issue comments/events/child/voter/attachment/modal states | `partial_comments`, `partial_history`, `partial_index_comments`, child/voter partials | DEPENDENCY | L----- |
| ISSUE-05 | issue edit loaded/editor/options/error | `issue/edit.scala.html`, assignee/label/subtask partials | DEPENDENCY | L----- |
| MILE-01 | milestone list open/closed/empty | `milestone/list.scala.html`, `partial_status` | COMPLETE | LOECR✓ |
| MILE-02 | milestone create/edit forms and validation | `milestone/create.scala.html`, `edit.scala.html` | COMPLETE | LOECR✓ |
| MILE-03 | milestone detail/progress/issues/mass-update/empty | `milestone/view.scala.html`, issue list/mass-update partials | DEPENDENCY | L----- |
| BOARD-01 | board list populated/empty/filter/paging | `board/list.scala.html`, `partial_list` | DEPENDENCY | LOE--- |
| BOARD-02 | board create/edit editor/upload/validation | `board/create.scala.html`, `edit.scala.html` | DEPENDENCY | L----- |
| BOARD-03 | post detail/body/sidebar/error | `board/view.scala.html` | DEPENDENCY | LOE--- |
| BOARD-04 | post comments/history/labels/attachments states | board comment/history and issue label partials | DEPENDENCY | L----- |

### Code, pull request, fork

| ID | Route / visible states | Legacy root and principal partials | Status | Gates |
| --- | --- | --- | --- | --- |
| CODE-01 | branches list/default/delete/error | `code/branches.scala.html`, `partial_branchrow` | COMPLETE | LOECR✓ |
| CODE-02 | repository/nohead/folder/tree/branch selector | `code/view.scala.html`, `nohead*.scala.html`, `partial_view_folder` | DEPENDENCY | L----- |
| CODE-03 | file/binary/rendered/code/error states | `partial_view_file.scala.html` | DEPENDENCY | L----- |
| CODE-04 | commit history root/branch/file/empty/paging | `code/history.scala.html` | DEPENDENCY | L----- |
| CODE-05 | commit detail metadata/diff/comments/binary | `code/diff.scala.html`, code-comment/shared diff partials | DEPENDENCY | L----- |
| CODE-06 | compare valid/empty/invalid/SVN | `code/compare.scala.html`, `compare_svn.scala.html` | DEPENDENCY | L----- |
| PR-01 | open/sent/closed lists/filter/paging/empty | `git/list.scala.html`, `partial_search`, `partial_list`, `partial_state` | DEPENDENCY | LOE--- |
| PR-02 | create/edit branch/source/form/validation | `git/create.scala.html`, `edit.scala.html`, branch partials | DEPENDENCY | L----- |
| PR-03 | detail open/merged/closed/info/state | `git/view.scala.html`, `partial_branch`, `partial_info`, `partial_state` | DEPENDENCY | L----- |
| PR-04 | detail events/reviews/merge outcomes/modals | `partial_pull_request_event`, `partial_reviewlist`, `partial_merge_result` | DEPENDENCY | L----- |
| PR-05 | changes aggregate/commit diff/comments/reviews | `git/viewChanges.scala.html`, shared diff and review partials | DEPENDENCY | L----- |
| PR-06 | reviews list populated/empty/filter/paging | `reviewthread/list.scala.html`, `partial_list`, `common/reviewForm` | DEPENDENCY | L----- |
| FORK-01 | fork owner choice/progress/error/list | `git/fork.scala.html`, `partial_forklist` | COMPLETE | LOECR✓ |

### Site administration

| ID | Route / visible states | Legacy root and principal partials | Status | Gates |
| --- | --- | --- | --- | --- |
| SITE-01 | user/project/issue/post lists: filters, states, empty, pagination, modals | `site/{userList,projectList,issueList,postList}.scala.html`, pagination partials | READY | L----- |
| SITE-02 | mail/massmail form, selection, preview/result/error | `site/mail.scala.html`, `massMail.scala.html` | READY | L----- |
| SITE-03 | data/diagnostic/update result and error states | `site/{data,diagnostic,update}.scala.html`, update notification | READY | L----- |
| SITE-04 | shared site management layout/sidebar/pagination retirement | `siteMngLayout.scala.html`, pagination partials | DEPENDENCY | ------ |

## Resolved execution map

This is the lookup table used to select future work. It deliberately records the actual React
screen owner rather than a TanStack wrapper path; wrappers are listed only in **Non-screen route
files**. Counts are conservative logical owner groups, not `className` counts. A row with existing
StyleX owners still stays in this map until its `C/R` gates are proven.

| IDs | Actual React owner(s) | Scheduling lane / hard dependency | Remaining groups |
| --- | --- | --- | --- |
| HOME-01, HOME-02, ROOT-01 | `index.tsx`, `-home-route-screen.tsx`, `notifications.tsx`, `notification.tsx`, `__root.tsx` | final shared shell lane; ROOT-01 last | 4–8 each |
| HELP-02, HELP-03 | `[_]help.tsx`, `-legacy-markdown-help.tsx` | shared responsive `!important` fallback | 4–6 |
| SEARCH-01, SEARCH-03, SEARCH-05 | `search.tsx`, `organizations/$organizationName/search.tsx`, `$ownerName/$projectName/search.tsx` | schedule together before SEARCH-04 retirement decision | 5–6 each |
| DIR-01, DIR-02 | `projects.tsx`, `orgs.tsx` | shared list/pagination | 5 each |
| CREATE-01, IMPORT-01 | `projectform.tsx`, `[_]import.tsx` | shared form/Select2 | 5–6 each |
| AUTH-01..05 | `users/loginform.tsx`, `users/signupform.tsx`, `lostPassword.tsx`, `resetPassword.tsx`, `restricted.tsx`, `secret.tsx`, `restart.tsx` | shared auth/mobile fallback | 3–6 each |
| USER-01 | `$user.tsx`, `-user-profile.stylex.ts` | profile/list/tab fallback | 14–20 |
| USER-02, USER-03 | `user/editform.tsx`, `user/editform/{emails,password,notifications,token}.tsx` | same tab/form owner; serialize shared selector retirement | 8–14 total |
| USER-04, USER-05, USER-06 | `user/files.tsx`, `user/issues.tsx`, `user/issues/-direct-issue-form-screen.tsx` | USER-06 delegates project issue editor; files/issues share list controls | 6–22 |
| ORG-01 | `organizations/new.tsx` | shared form fallback | 4–7 |
| ORG-02 | `organizations/$organizationName.tsx` | parent owns legacy organization layout; `index.tsx` is wrapper only | 8–12 |
| ORG-03, ORG-04 | `organizations/$organizationName/{settingform,members,deleteForm,boards,issues,pullrequests}.tsx` | setting menu; then list/filter/pagination; closed PR is wrapper | 12–30 |
| PROJECT-01 | `$ownerName/$projectName.tsx` | project header/menu shared by all project routes; final project-shell lane | 6+ |
| PROJECT-02, PROJECT-03 | `$ownerName/$projectName/{setting,settingform,changeVCS,deleteform,transfer,members}.tsx` | shared setting menu/forms; serialize common selector retirement | 4–8 |
| PROJECT-04, PROJECT-05 | `$ownerName/$projectName/issue/labelsform.tsx`, `$ownerName/$projectName/webhooks.tsx` | Select2/label and list/form fallback | 4–6 |
| PROJECT-06 | `$ownerName/$projectName/{watchers,statistics}.tsx` | independent routes but currently retained as C/R evidence work, not a fresh skeleton target | 3–6 |
| ISSUE-01, ISSUE-02 | `$ownerName/$projectName/{issues,issueform}.tsx` | list/editor foundations | 6+ |
| ISSUE-03 → ISSUE-04 → ISSUE-05 | `$ownerName/$projectName/issue/$issueNumber.tsx`, `.../editform.tsx` | same detail owner: header/body before comments/events, then edit | 5–6 each |
| MILE-01, MILE-02, MILE-03 | `$ownerName/$projectName/{milestones,newMilestoneForm,milestone/$milestoneId, milestone/$milestoneId/editform}.tsx` | list/form parallel; detail waits issue mass-update/list | 4–6 each |
| BOARD-01, BOARD-02, BOARD-03 → BOARD-04 | `$ownerName/$projectName/{posts,postform,post/$postNumber,post/$postNumber/editform}.tsx` | board detail comments/history must follow detail; no `boards.tsx` exists for project posts | 5–6 each |
| CODE-01, CODE-02 → CODE-06 | `$ownerName/$projectName/{branches,code,code/$branch,code/$branch/$filePath,commits,commit/$commitId,compare/$revisionRange}.tsx` | branch/tree/file/history/diff/compare; tree and diff are prerequisite owners | 4–6 each |
| PR-01, PR-02, PR-03 → PR-04, PR-05, PR-06 | `$ownerName/$projectName/{pullRequests,newPullRequestForm,pullRequest/$pullRequestNumber,pullRequest/$pullRequestNumber/changes,reviews}.tsx` | detail events follow detail; changes/reviews wait code diff/review foundations | 5–6 each |
| FORK-01 | `$ownerName/$projectName/newFork.tsx` | use after project-shell contract is stable | 4–6 |
| SITE-01, SITE-02, SITE-03 → SITE-04 | `sites/{userList,projectList,issueList,postList,mail,massmail,data,diagnostic,update}.tsx`, `sites/-pagination.tsx` | shared site layout/sidebar/pagination is a strict last-consumer lane | 4–18 |
| MIG-01, UIKIT-01 | `migration.tsx`, `[_]UIKit.tsx` | deferred; never selected without an explicit scope change | n/a |

Selection protocol: choose only the first eligible IDs from **Immediate queue** and this map;
update the selected row after integration. Do not re-run a route-wide discovery scan unless a
**Refresh trigger** applies. A worker receives the exact owner path(s) above, legacy root,
permitted write scope, and the indicated serial edge.

### 2026-07-19 reconciliation evidence

The initial `READY` labels were disproved by commit/audit/E2E evidence during Batch 530. This
is a checklist correction, not completion inferred from a `className` count. The following
rows have already exhausted their isolated route-owner work: MILE-01 (`c6b811c10`), MILE-02
(`220b374a7`), CODE-01 (`9830dfd57`), CODE-02 (`998d2850e`), CODE-06 (`f49ef50e3`), ISSUE-02
(`d378c69ad`), ISSUE-05 (`c46b4c6d0`), BOARD-02 (`f9d91e9b4`), and FORK-01 (`982b58738`).
The remaining Issue/Milestone/Board/Code/PR rows have a route-local StyleX module, focused
E2E, Scala audit row, and ledger record; they are C/R or shared-fallback evidence lanes unless a
new exact legacy declaration is identified. They are not candidates for a duplicate route
skeleton or audit row.

Batch 530 adds the missing scoped owners for ORG-02 header/menu and BOARD-01 populated rows;
both retain shared or responsive fallback and therefore remain `DEPENDENCY | LOE---`. The next
worker allocation must make this narrow preflight check against the row's listed commit/audit/E2E
before editing. This replaces rediscovering the complete route universe each turn.

Batch 531 extends that correction. ORG-03's `settingform` loaded state is already fully
ownerized (`fec32816f`, `a25280f8f`, `ab73a957f`, `f2232a400`); PROJECT-03's `transfer` state
is C/R-only (`ebfd91c33`, `12edafb25`, `6753f0854`). USER-06 is invalid as a separate styling
target: both direct-user paths choose a project then delegate their complete visible surface to
the project issue form. HOME-01, HOME-02, and ROOT-01 are also C/R-only: their actual
authenticated/anonymous home, notification, navbar/usermenu/sidebar, toast, and login-dialog
owners already reside in `-home-route-screen.tsx`/`__root.tsx` with focused E2E and audit evidence.
Shared fallback is not authority to add duplicate wrapper StyleX owners. The next preflight is
therefore restricted to the unverified directory/create/import lane rather than these rows.

## Batch 531 full-refresh result

The narrow follow-up preflights disproved the last apparent leaf candidates: DIR-01,
CREATE-01, IMPORT-01, and BOARD-01 have complete route-local owner coverage. BOARD-01's
remaining empty result and pagination are global `.error-wrap` / `.page-navigation-wrap` families;
its filter/sort state is already StyleX-owned. Adding a board-only owner would duplicate shared
geometry and is forbidden. **There is no eligible independent route-owner migration remaining in
the 110 routable-entry inventory.**

This table supersedes stale `L-----`, `READY`, and grouped labels as a selection source. `C/R-only`
means the route's direct owner is migrated and its remaining work is exact shared-fallback consumer
proof/retirement; it does not mean the overall fallback module is retired.

### 2026-07-20 refresh after Batch 505

The declaration-level refresh found no additional safe route-local owner wave or dead fallback
arm. `.task-list-item*` and `.hljs-*` remain plugin-generated families and are deferred; the
nested `.issue-form-project-header` arm has neither a current emitter nor frozen legacy selector
evidence and is therefore not removable. The utility aliases `.ml20`, `.mr6`, `.mt4`, `.vtop`,
and `.vertical-top` were retired in bounded waves through commits `d06928c0a`, `e24cf4215`,
`1e3c8a60f`, `151268fcf`, and `2007c2fe8`. The next eligible work is an exact shared-fallback
consumer graph or an explicit deferred-scope decision; do not repeat route discovery or remove
plugin/global rules without that evidence.

The issue-state badge family is not a dead-arm candidate: issue/$issueNumber.tsx, milestone,
pull-request, and frozen git/partial_info.scala.html consumers emit the shared badge-issue-*
classes. Batch 655 now gives the milestone and pull-request owners the same base/state StyleX
declarations as the existing issue-detail owner; the shared family remains C/R work until an
exact all-consumer retirement proof is assembled.

| Classification | IDs |
| --- | --- |
| Complete isolated owners | HELP-01, SEARCH-02, ISSUE-02, ISSUE-05, MILE-01, MILE-02, BOARD-02, CODE-01, FORK-01 |
| C/R-only or grouped shared-owner lanes | HOME-01/02, ROOT-01, HELP-02/03, SEARCH-01/03/04/05, DIR-01/02, CREATE-01, IMPORT-01, AUTH-01..05, USER-01..05, ORG-01..04, PROJECT-01..06, ISSUE-01/03/04, MILE-03, BOARD-01/03/04, CODE-02..06, PR-01..06, SITE-01..03 |
| Invalid independent screen | USER-06 (delegates entirely to project issue-form); SITE-04 (shared site layout/pagination last-consumer lane) |
| Deferred | MIG-01, UIKIT-01 |

The next execution unit is not another route discovery pass. It must be a declaration-level
shared-fallback retirement batch with an exact consumer graph that names every affected route,
or a deferred-scope decision for a plugin/global rule. A route TSX/E2E/audit row may be changed
only when that graph identifies an actual missing visible owner.

### 2026-07-20 Batch 656 issue-state badge C/R proof

The complete current React production emitter graph is exactly the issue-detail,
milestone-detail, and pull-request-overview state badges. Each keeps the legacy
badge element/classes and has a colocated StyleX base/state owner with the exact
frozen declarations, including the `#777` base. Retire only the React-side
`app.css` badge family; retain generic `.badge`, responsive `.badge-small`,
frozen LESS, and generated fallback evidence.

### 2026-07-20 Batch 657 search empty-result C/R proof

The complete current React production emitter graph for `.empty-result` is
global search, project search, and organization search. Each visible empty
state has a stable StyleX owner and preserves the legacy class/DOM. Retire
only the React-side `app.css` arm; retain frozen search partial/LESS and
generated fallback evidence.

## Non-screen route files

다음은 별도 migration target으로 세지 않는다. 해당 owner screen의 state로만 추적한다.

- index/splat/delegate wrappers under project code, commits, issue, milestone, post, PR changes, fork
- `users/login.tsx`, `user/issues_/new.tsx`, its `index.tsx` and `mine.tsx`
- organization index and closed-pull-request delegates
- `notifications.tsx`, `notification.tsx` wrappers
- `sites/-pagination.tsx`, `-last-outlet-transition.tsx`
- colocated `*.stylex.ts`, CSS, asset modules

## Dependency graph

```text
leaf route/state owners (parallel, 3 workers)
    ├─ forms → shared editor / Select2 / uploader
    ├─ lists → shared list / pagination
    ├─ code → tree / diff → PR changes / reviews
    └─ org/project/user settings → shared menu/tab
                         ↓
exact source + rendered DOM consumer audit
                         ↓
shared navbar/usermenu/layout/Bootstrap/plugin fallback retirement
```

## Already completed or invalidated waves

- A1 issue detail body/sidebar, A2 populated issue list, A3 project setting boxes
- B1 issueform editor shell, B3 project search
- C1 top-level search populated-family ownership (empty/error/shared retirement remains SEARCH-01/04)
- D1 organization setting top box
- SEARCH-02 dead shared renderer and its private subtree
- SEARCH-03 organization category/result-title/item-avatar/title/content-meta/empty owners; C/R waits for SEARCH-01/05
- SEARCH-01/05 global and project residual search owners; SEARCH-04 audit found no declaration-safe bridge retirement
- HELP-01 FAQ owner family, including corrected static → dynamic → conditional sprite composition
- HELP-02 markdown navigation and HELP-03 pane/content owners; frozen responsive important rules remain a shared dependency
- AUTH-01 standalone login residuals and AUTH-02 signup capability-state owners; shared form/login fallback remains a dependency
- AUTH-03 lost-password state family, AUTH-04 reset valid/validation/invalid-token family, and AUTH-05 restricted/secret/restart family owners; shared auth and frozen mobile important fallback remain dependencies
- USER-02 profile/avatar/upload/crop owners, USER-03 email valid/pending row completion with existing sibling-route owners, and USER-04 files empty/populated/search/action/pagination owners; shared form and current bridge fallback remain dependencies
- USER-01 public profile root, USER-05 current-user issue controls, and ORG-01 create duplicate-name validation ownership; shared tabs/forms/pagination/generated fallback remain dependencies
- B2 requested PR selectors: `INVALID`; cited LESS was unrelated posting-history diff CSS and must not count as completion

## Dead residual cleanup

Deletion-only candidates. Each requires declaration-level exact source/DOM proof; broad subtree deletion is forbidden.

- [x] `.milestones .desc` — Batch 538: the current React milestone list emits no `.desc`; only the exact rendered Yobi descendant rule is excluded while progress-wrap, actrow, and completion-rate remain.
- [x] `#notification-projects li button` base/hover/active — Batch 538: legacy and React notification tabs emit anchors/Links, and the React owner owns the corresponding list/link states.
- [x] `.profile-frmwrap .avatar-frm` — 2026-07-20 consumer graph: no legacy or React output
  emits the `profile-frmwrap` ancestor, and the deterministic generated-fallback exclusion already
  removes this root plus its descendants. Direct avatar StyleX owners retain the live geometry.
- [x] `.all-projects .project .forked` — 2026-07-20 consumer graph: no React `forked` output
  exists, and the exact compiled Yobi selector is already excluded from generated fallback; fork
  origin presentation uses separate React-owned output.
- [x] `.small-font` — 2026-07-20 organization-home consumer graph: the two live
  organization project-card spans now use the route-local `styles.smallFont`
  owner; the shared app.css arm is retired while frozen/generated evidence remains.
- [x] `.stats-wrap .like` variants — Batch 537: duplicate/consumer-free rendered Yobi selectors retired; no active module was unlinked.
- [ ] individual `.site-admin-page` declarations only after SITE-01..04 (never the subtree as one item).
  The 2026-07-20 graph confirms this is an inactive `app.css` bridge with no React DOM ancestor, but its
  declaration groups and static contracts must still retire one bounded group at a time.

## Refresh trigger

Full inventory refresh is allowed only when:

1. every `NEXT`/`READY` row is exhausted;
2. a shared selector loses its last consumer;
3. a route changes its visible DOM/state ownership;
4. the sorted route file set differs from the 116-file snapshot;
5. a checklist row is disproved by legacy or runtime evidence.

Otherwise update only the completed screen row and select the next IDs from this document. Do not rescan all routes per turn.

### 2026-07-20 declaration refresh decision (Batch 654)

The complete current React/TSX and frozen legacy inventory has no additional safe source-less
`app.css` bridge. The only unmatched selector families are plugin-generated `hljs-*` syntax
highlighting and `.issue-form-project-header`, which has no frozen legacy selector/declaration
evidence. Both remain deferred; no route-owner wave or fallback deletion is authorized without
new producer/source evidence.

### 2026-07-21 Batch 663 project error-wrap detail-state owner proof

Batch 663 adds exact route-local owners for the project-members error shell,
code-file branch-not-found state, and milestone not-found state. The workers
preserve the existing legacy classes and navigation while moving only the
frozen `_page.less`/`_sprites.less` declarations into colocated StyleX. The
shared `.error-wrap` fallback remains for the still-unmigrated React emitters;
normal and fallback-disabled focused runs both pass 3/3 serially.

### 2026-07-21 Batch 664 search/post error-wrap owner proof

Batch 664 adds exact route-local owners for project post not-found,
project-search forbidden, and organization-search error states. The frozen
`_page.less`/`_sprites.less` declarations are colocated without changing the
existing shells, copy, or login/list behavior. The shared `.error-wrap`
fallback remains for other React emitters; normal and fallback-disabled
focused runs both pass 3/3 serially.

### 2026-07-21 Batch 665 form error-wrap owner proof

Batch 665 adds exact route-local owners for project issue-edit not-found,
pull-request-edit 403/404, and new-pull-request 400 states. The frozen
`_page.less`/`_sprites.less` declarations are colocated without changing the
existing project shells, copy, or list/navigation behavior. The shared
`.error-wrap` fallback remains for other React emitters; normal and
fallback-disabled focused runs both pass 3/3 serially.

### 2026-07-21 Batch 666 error-wrap owner proof

Batch 666 adds exact route-local owners for secret not-found, project
issue-labels empty, and project webhooks empty states. The frozen
`_page.less`/`_sprites.less` declarations are colocated without changing the
existing global/project shells, copy, or settings navigation. The shared
`.error-wrap` fallback remains for other React emitters; normal and
fallback-disabled focused runs both pass 3/3 serially.

### 2026-07-21 Batch 667 error-wrap owner proof

Batch 667 adds exact route-local owners for project milestones empty and
organization directory empty states. The frozen `_page.less`/`_sprites.less`
declarations are colocated without changing the existing project/global
shells, tabs, search/navigation, or copy. The shared `.error-wrap` fallback
remains for other React emitters; normal and fallback-disabled focused runs
both pass 2/2 serially.

### 2026-07-21 Batch 668 error-wrap owner proof

Batch 668 adds an exact route-local owner for the current-user issues empty
state. The frozen `_page.less`/`_sprites.less` declarations are colocated
without changing the existing user issues shell, search/filter tabs,
interaction, or copy. The shared `.error-wrap` fallback remains for other
React emitters; normal and fallback-disabled focused runs both pass 1/1
serially.

### 2026-07-21 Batch 669 error-wrap owner proof

Batch 669 adds exact owners for the shared search error family, the four
public user-profile empty panels, and the root alias not-found state. The
frozen `_page.less`/`_sprites.less` declarations are colocated without
changing search variants/navigation, profile tab state/copy, or the root
not-found shell. Combined focused runs pass 3/3 normally and 3/3 with the
legacy fallback disabled; the shared `.error-wrap` fallback remains for
other React emitters.

### 2026-07-21 Batch 670 error-wrap owner proof

Batch 670 adds exact owners for the project generic internal-error shell and
the public missing-user not-found shell. The frozen `_page.less`/`_sprites.less`
declarations are colocated without changing project/profile shells, copy, or
home navigation. Focused runs pass 2/2 normally and 2/2 with the legacy
fallback disabled; an unreachable dead post-detail producer was inspected
and explicitly excluded from the wave.

### 2026-07-21 Batch 671 shared fallback retirement proof

Batch 671 removes only the React-side `app.css` `.error-wrap` wrapper/icon/
message bridge after the reachable consumer graph confirms colocated StyleX
ownership across 29 route/owner groups. Reset-password-specific selectors,
the frozen source, generated fallback, and the explicitly unreachable stale
post producer remain. Static/runtime proof passes 2/2 normally and 2/2 with
the legacy fallback disabled.

### 2026-07-21 Batch 672 organization home menu owner proof

ORG-02 organization home menu items now own the frozen menu `li` and Link
declarations through route-local StyleX: float, font weight/size, position,
inline-block display, line-height, desktop/mobile padding, and hover paint.
The legacy active classes and TanStack Router links remain unchanged. Focused
normal and fallback-off checks pass 1/1 each at desktop and mobile viewports.

### 2026-07-21 Batch 673 organization home project-card owner proof

ORG-02 project-card/filter output now owns the frozen `all-projects .project`
padding, overflow, and border declarations through conditional route-local
StyleX. The legacy class, item-search filtering, card order, and links remain
unchanged. Focused normal and fallback-off checks pass 3/3 each, covering
static source mapping plus desktop/mobile card geometry and filtering.

### 2026-07-21 Batch 674 organization home membership-panel owner proof

ORG-02 membership panels now own the frozen `.project-home` inner panel,
header, `.project-members`, and `.member` declarations through route-local
StyleX. Legacy classes, member links, labels, leave interaction, and panel
containment remain unchanged. Focused normal and fallback-off checks pass 5/5
each, covering source mapping plus desktop/mobile panel geometry and visible
member links.

### 2026-07-21 Batch 675 organization home header/overview owner proof

ORG-02 organization-home header and overview now own the frozen
`project-home-header`, `project-overview`, and overview `h3` declarations
through route-local StyleX. Legacy classes, description copy, ordering, and
responsive containment remain unchanged. Focused normal and fallback-off
checks pass 6/6 each, covering source mapping plus desktop/mobile computed
geometry and visible description copy.

### 2026-07-21 Batch 676 organization home project-card inner owner proof

ORG-02 loaded project cards now own the frozen avatar, header, description,
name-tag, and stats declarations through route-local StyleX. Clone/search and
member-panel declarations remain outside this wave; project links, filtering,
visibility branches, and responsive containment remain unchanged. Focused
normal and fallback-off checks pass 3/3 each, covering source mapping, all
inner owners, desktop/mobile computed geometry, visible content, and filter
interaction.

### 2026-07-21 Batch 678 organization home project-list outer owner proof

ORG-02 project-list output now owns the frozen `.all-projects` margin,
list-style, and clear declarations through the existing route-local StyleX
owner. Legacy list/card classes, DOM order, links, filtering, and responsive
containment remain unchanged. Focused normal and fallback-off checks pass
3/3 each, covering source mapping, computed list geometry, visible projects,
and filter interaction.

### 2026-07-21 Batch 680 organization home create-project owner proof

ORG-02 conditional Create new project output now owns the frozen Bootstrap
`pull-right` float through a route-local StyleX owner. The wrapper class,
Link/copy/query, conditional visibility, project filtering, and responsive
containment remain unchanged; generic button/grid declarations stay fallback-
owned. Focused normal and fallback-off checks pass 3/3 each, covering source
mapping, computed float/geometry, visible Link, and filtering.

### 2026-07-21 Batch 681 organization home project-card stats owner proof

ORG-02 project-card stats output now owns the frozen Bootstrap `.pull-right`
float through a route-local StyleX owner. The legacy wrapper class, counts,
icons, watch state, filtering, and responsive containment remain unchanged;
unrelated generic float consumers stay fallback-owned. Focused normal and
fallback-off checks pass 3/3 each, covering source mapping, computed
float/geometry, stats visibility, and filtering.

### 2026-07-21 Batch 682 organization home menu-inner owner proof

ORG-02 organization menu output now owns the frozen `.project-menu-inner`
`height: 39px` and `margin: 0 auto` declarations through a route-local
StyleX owner. Legacy menu classes, DOM order, links, active state, settings
visibility, and responsive containment remain unchanged. Focused normal and
fallback-off checks pass 1/1 each, covering source mapping, computed
desktop/mobile geometry, containment, and menu behavior.

### 2026-07-21 Batch 683 organization home menu-nav owner proof

ORG-02 organization menu main/settings lists now own the frozen
`.project-menu-nav` `list-style: none`, `margin: 0`, and `height: 39px`
declarations through one route-local StyleX owner. The main group's existing
`margin-left: 110px` offset, legacy classes, links, active state, settings
visibility, and responsive containment remain unchanged. Focused normal and
fallback-off checks pass 1/1 each, covering source mapping, computed
desktop/mobile list geometry, containment, and menu behavior.

### 2026-07-21 Batch 684 organization home page-wrapper owner proof

ORG-02 organization home output now owns the frozen `.page-wrap-outer` base
and effective responsive declarations through the existing route-local StyleX
owner: min-height, margin-top, min-width, padding, width, and box-sizing.
Legacy wrapper DOM/class, color, child layout, filtering, and responsive
containment remain unchanged. Focused normal and fallback-off checks pass 3/3
each, covering source mapping, computed desktop/mobile wrapper geometry, and
project filtering/visibility.

### 2026-07-21 Batch 685 organization home search-wrapper owner proof

ORG-02 organization home search output now owns the frozen `.mt10`
`margin-top: 10px` declaration through a route-local StyleX owner. Search
wrapper classes/DOM/order, controls, Create new project action, filtering, and
responsive containment remain unchanged; unrelated utility consumers stay
fallback-owned. Focused normal and fallback-off checks pass 3/3 each,
covering source mapping, computed desktop/mobile wrapper margin/containment,
and filtering/visibility.

### 2026-07-21 Batch 686 organization home search-column owner proof

ORG-02 organization home search output now owns the emitted Bootstrap `span7`
fluid-grid declarations through a route-local StyleX owner: desktop float,
fluid width, first-column margin behavior, min-height, box sizing, and the
mobile float/width/margin transition. Legacy class/DOM/order, controls,
Create new project action, filtering, and responsive containment remain
unchanged; unrelated grid consumers stay fallback-owned. Focused normal and
fallback-off checks pass 3/3 each, covering source mapping, computed
desktop/mobile column geometry, containment, and filtering/visibility.

### 2026-07-21 Batch 687 organization home outer-column owner proof

ORG-02 organization home main/member output now owns the emitted Bootstrap
`span9`/`span3` fluid-grid declarations and frozen `span-hard-wrap` responsive
min-width/viewport-width cascade through route-local StyleX owners. Legacy
classes, two-column DOM/order, header/search/project/member content, filtering,
and responsive containment remain unchanged; unrelated grid consumers stay
fallback-owned. Focused normal and fallback-off checks pass 3/3 each,
covering source mapping, computed desktop/mobile column geometry,
containment, and filtering/visibility.

### 2026-07-21 Batch 688 global fallback-off discovery classification

The complete managed fallback-off suite ran with desktop and mobile cases: 2,675 tests yielded
1,541 passed, 1 skipped, and 1,133 failed in 49.4 minutes. The failure artifacts are classified
in `docs/provenance/ui-parity-reports/fallback-off-2026-07-21.md` into 449 React StyleX owner
candidates, 40 global/shared bridge candidates, 641 route DOM/behavior/data parity failures, and
3 fallback-boundary/static contract failures. This is discovery evidence only: the fallback stays
enabled by default, no shared selector is retired, and the next repair wave must re-prove the
exact frozen consumer boundary.

### 2026-07-21 Batch 689 organization pull-request review-progress owner repair

The fallback-off organization PR artifact was repaired at the existing route owner. Frozen
`.infos .upload-progress` geometry (`display:inline-block`, `width:30px`, `height:7px`,
`vertical-align:middle`, `overflow:hidden`, `margin-top:3px`, `border-radius:5px`) and the
inner `.bar { height:100% }` now live in route-local StyleX; the API-derived percentage
continues through the dynamic StyleX width carrier. Focused normal and fallback-off checks pass
1/1 each at desktop and mobile viewports. The global fallback remains enabled by default.

### 2026-07-21 Batch 690 organization-members responsive row owner repair

The organization-members fallback-off owner now carries the exact frozen responsive
`.span-hard-wrap { min-width:95%; width:100vw; }` cascade alongside the existing desktop row
width and legacy `margin-left:5px`. The focused list test verifies populated/empty output,
desktop/mobile row/list geometry, source mapping, and six existing owner boundaries; normal and
fallback-off checks pass 3/3 each. The remaining outer document overflow is not assigned to this
route owner and remains part of the global/shared bridge classification.

### 2026-07-21 Batch 679 organization home search-shell owner proof

ORG-02 search output now owns the frozen `.search-bar`, `.textbox.full`, and
`.search-btn` declarations through route-local StyleX, including the exact
mobile `margin: 5px 0` rule. Input/button DOM, placeholder, filtering, project
output, and responsive containment remain unchanged; search icon styling stays
fallback-owned. Focused normal and fallback-off checks pass 3/3 each,
covering source mapping, computed desktop/mobile geometry, visible controls,
and filter interaction.

### 2026-07-21 Batch 677 organization home project-card stats owner proof

ORG-02 project-card stats now own the emitted `.members`, member-list `ul`,
and count `strong` declarations through route-local StyleX, resolving the
frozen `@secondary -> @blue2 -> #51AACC` chain. The non-emitted member-avatar
`li` rule remains fallback-owned. Focused normal and fallback-off checks pass
3/3 each, covering source/variable mapping, counts/icons/watch state,
desktop/mobile geometry, and filtering.

### 2026-07-21 Batch 700 projects populated row-content line-box proof

- [x] The existing projects directory header, description, name-tag, and stats
  owners carry the frozen Bootstrap 20px body line-height without adding offsets
  or changing the legacy row DOM.
- [x] Focused source, computed declaration, containment, and desktop/mobile row
  geometry checks pass 3/3 in normal and fallback-off modes.

### 2026-07-21 Batch 701 global GNB search-form semantic/icon proof

- [x] The existing GNB search form retains the semantic `gnb-search-form` class,
  while plugin-only `input-prepend` remains removed.
- [x] The frozen Yobicon font and search glyph declarations are owned at the
  existing React icon boundary without invented geometry or changed GET behavior.
- [x] Focused source, frozen-hash, desktop/mobile geometry, scope interaction,
  and GET payload checks pass 10/10 in normal and fallback-off modes.

### 2026-07-21 Batch 702 global GNB search icon declaration proof

- [x] The existing search-icon owner uses the frozen Yobicon `font-weight:normal`
  declaration without changing DOM, geometry, glyph, or GET behavior.
- [x] Adjacent input and submit focused contracts accept the current generated
  fallback hash and StyleX semantic class composition.
- [x] Normal and fallback-off input/submit checks pass 8/8 and 9/9.

### 2026-07-21 Batch 703 global GNB nav inherited-font proof

- [x] The existing global nav owner no longer introduces a font-weight absent
  from frozen `.gnb-nav`; typography remains inherited from the legacy baseline.
- [x] The focused contract distinguishes the migrated restricted nav from the
  retained raw-class consumers without changing their DOM or fallback boundary.
- [x] Normal and fallback-off nav checks pass 8/8 with desktop/mobile geometry
  and paint-isolation coverage.

### 2026-07-21 Batch 704 global GNB inner box-model proof

- [x] The existing global GNB-inner owner no longer introduces `border-box`,
  which is absent from frozen `.gnb-inner`; computed desktop/mobile state is
  `content-box` as in the legacy output.
- [x] The focused contract distinguishes the migrated restricted inner owner
  from retained raw-class consumers without changing DOM or fallback behavior.
- [x] Home, project, and organization inner geometry checks report green in
  fallback-off mode; the assembled five-owner wave reports 38/38 green before
  managed cleanup interruption.
- [x] The unsupported `.gnb-inner` fallback `box-sizing` bridge is retired;
  source-backed width/height/margin/color and neighboring pseudo-element rules
  remain retained for non-migrated consumers.
### 2026-07-21 Batch 705 global GNB outer responsive-padding proof

- [x] The existing outer owner carries the frozen `padding:0 10px` cascade;
  mobile remains `10px` and project-header remains `0px`.
- [x] The focused contract distinguishes the migrated restricted outer owner
  from retained raw-class consumers and preserves frozen source hashes.
- [x] Normal and fallback-off outer checks pass 9/9 with desktop/mobile
  geometry, responsive padding, and paint-isolation coverage.

### 2026-07-21 Batch 706 global GNB project-list divider owner-boundary proof

- [x] The existing List All divider owner retains only frozen `.gnb-nav`/divider
  declarations; unsupported `backgroundColor`, `backgroundImage`, `height:auto`,
  and `width:auto` declarations are removed.
- [x] The focused contract records the current `.gnb-nav > li {` fallback bridge,
  preserves conditional visibility and DOM order, and passes desktop/mobile
  geometry and paint isolation 10/10 in normal and fallback-off modes.

### 2026-07-21 Batch 707 global GNB nav browser-default proof

- [x] The existing nav owner carries only frozen `.gnb-nav` declarations;
  unsupported `boxSizing` and `position` declarations are removed while the
  Bootstrap-backed `lineHeight:20px` baseline remains.
- [x] The focused source contract and computed desktop/mobile/consumer-isolation
  checks preserve the legacy nav geometry and raw-class fallback boundary.

### 2026-07-21 Batch 708 global GNB feedback-link browser-default proof

- [x] The existing feedback-link owner removes only redundant `display` and
  `float` declarations absent from frozen `.gnb-nav a`; source-backed paint,
  line-height, padding, transition, and external navigation remain.
- [x] The focused contract preserves conditional visibility, desktop/mobile
  geometry, and paint isolation in normal and fallback-off modes (10/10 each).

### 2026-07-21 Batch 709 global GNB project-list link browser-default proof

- [x] The existing List All link owner removes only redundant `display` absent
  from frozen `.gnb-nav a`; source-backed `float:none`, active triangle,
  navigation, visibility, and link paint remain.
- [x] The focused contract preserves active state, conditional visibility,
  desktop/mobile geometry, SPA navigation, and paint isolation in normal and
  fallback-off modes (8/8 each).

### 2026-07-21 Batch 710 global GNB brand-link browser-default proof

- [x] The existing brand owner removes only redundant `display` and `float`
  declarations absent from the brand-specific legacy source; background,
  padding, typography, pseudo-elements, and responsive state remain.
- [x] The focused contract preserves active routing, desktop/mobile home and
  project-header geometry, interaction, and pseudo isolation in normal and
  fallback-off modes (6/6 each).

### 2026-07-21 Batch 711 global GNB search-box browser-default proof

- [x] The existing search-box owner removes only redundant `borderStyle`,
  `borderWidth`, and `boxSizing` declarations absent from frozen `.search-box`;
  radii, background, height, display, and vertical alignment remain.
- [x] Paired submit/scope-menu contracts preserve desktop/project/organization
  geometry, menu interaction, GET behavior, responsive hiding, and paint
  isolation in normal and fallback-off modes (16/16 each).

### 2026-07-21 Batch 712 global GNB search-submit browser-default proof

- [x] The existing submit owner removes only unsupported `boxSizing`; frozen
  button appearance, border, color, cursor, typography, margin, outline,
  padding, alignment, and Yobicon declarations remain.
- [x] The focused submit contract preserves desktop/project/organization
  geometry, hover/focus, responsive hiding, isolation, and GET behavior in
  normal and fallback-off modes (9/9 each).

### 2026-07-21 Batch 713 global GNB search-scope browser-default proof

- [x] The existing scope toggle and menu-button owners remove only unsupported
  `boxSizing` declarations; frozen dropdown/button colors, borders, shadows,
  typography, padding, caret, and positioning remain.
- [x] The focused scope-menu contract preserves closed/hover/focus/open paint,
  copy/order, interaction, mobile hiding, and isolation in normal and
  fallback-off modes (7/7 each).

### 2026-07-21 Batch 714 global GNB search-scope menu browser-default proof

- [x] The existing scope-menu owner removes only unsupported `boxSizing`;
  frozen float/position, border, shadow, padding, opacity/transition,
  pseudo-elements, z-index, DOM, and responsive behavior remain.
- [x] The focused scope-menu contract preserves closed/hover/focus/open paint,
  copy/order, interaction, mobile hiding, and isolation in normal and
  fallback-off modes (7/7 each).

### 2026-07-21 Batch 715 global GNB search-scope menu float proof

- [x] The existing menu owner maps frozen Bootstrap `float:left`, while the
  emitted menu-item owner drops only its redundant browser-default
  `float:none`; menu position, dimensions, paint, DOM/order, and responsive
  behavior remain unchanged.
- [x] The focused scope-menu contract preserves computed open-menu behavior,
  copy/order, interaction, mobile hiding, and isolation in normal and
  fallback-off modes (7/7 each).

### 2026-07-21 Batch 716 shared fallback consumer-graph refresh

- [x] The generic `.dropdown-menu` bridge is confirmed to have live consumers
  across project/org members, settings/forms, issue/milestone mass-update,
  pull-request changes, commit selectors, home user-menu, typeahead, and
  Select2 surfaces.
- [x] Remaining `.ybtn`, `.label`/`.badge`, `.alert`, `.nav-tabs`, `.modal`,
  grid, and pagination families are multi-consumer or incomplete; `.hljs-*`
  remains plugin-generated and deferred.
- [x] No complete safe retirement group is proven. Fallback remains enabled;
  no route TSX, focused E2E, frozen source, or shared selector changed.

### 2026-07-21 Batch 717 project-settings reviewer-count dropdown proof

- [x] The existing reviewer-count dropdown group, toggle/open state, label,
  caret wrapper/glyph, menu visibility/geometry, and option-item margin own
  only the exact frozen `_yobiUI.less`/Bootstrap declarations through
  route-local StyleX; unrelated dropdown fallback consumers remain.
- [x] The focused project-settings contract preserves desktop/mobile closed
  and open geometry, copy/order, selection state, URL/session stability, and
  viewport containment in isolated normal and fallback-off runs (1/1 each).

### 2026-07-21 Batch 718 project-settings default-branch Select2 proof

- [x] The existing default-branch Select2 container, choice, chosen label,
  arrow/glyph, search, drop, results, result items, and result labels own only
  frozen Select2/`_override.less` declarations through route-local StyleX;
  unrelated Select2 fallback consumers remain.
- [x] The focused contract preserves desktop/mobile closed/open geometry,
  computed ownership, branch search/filter interaction, selected-value
  synchronization, and viewport containment in normal and fallback-off runs
  (1/1 each).

### 2026-07-21 Batch 719 project-settings MenuCheckbox proof

- [x] The six menu-setting label/input pairs own only frozen `.radio-btn` and
  `label.inline-list` declarations through route-local StyleX, including the
  first-label margin rule; unrelated radio/inline-list fallback consumers
  remain.
- [x] The focused contract preserves label/input order and copy, checked
  state, desktop/mobile containment, and code-dependent visibility behavior in
  normal and fallback-off runs (1/1 each).

### 2026-07-21 Batch 720 project-settings radio-input proof

- [x] The six visible project-settings radio inputs own only frozen
  `.radio-btn` `vertical-align:top` and `margin:2px` declarations through
  route-local StyleX; the organization-only protected raw consumer and other
  fallback consumers remain.
- [x] The focused contract preserves owner/order, checked state,
  desktop/mobile containment, and reviewer enable/disable panel behavior in
  normal and fallback-off runs (1/1 each).

### 2026-07-21 Batch 721 project-settings Save button proof

- [x] The existing Save owner carries only frozen `.ybtn` base,
  `.ybtn-success`, and hover/focus/active declarations with resolved legacy
  values; generic `.ybtn` fallback consumers remain.
- [x] The focused contract preserves legacy classes/type/copy, default and
  interaction paint, desktop/mobile containment, and validation submit
  behavior in normal and fallback-off runs (1/1 each).

### 2026-07-21 Batch 722 project-settings Issue Template Edit proof

- [x] The Issue Template Edit anchor owns only the frozen generic `.ybtn`
  base and hover/focus/active declarations through a route-local StyleX owner;
  generic `.ybtn` fallback consumers remain.
- [x] The focused contract preserves the legacy class/copy/target/issue-template
  URL, default and interaction paint, desktop/mobile geometry, and viewport
  containment in normal and fallback-off runs (1/1 each).

### 2026-07-21 Batch 723 project-settings subnavigation proof

- [x] All seven settings subnavigation `li` owners carry only the frozen
  route-specific `margin-bottom:-2px` declaration; Bootstrap’s generic
  `.nav-tabs` fallback and unrelated consumers remain.
- [x] The focused contract preserves tab DOM/order/copy, Link hrefs, active
  state, count badge, conditional Change VCS visibility, desktop/mobile
  containment, and computed margin in normal and fallback-off runs (1/1 each).

### 2026-07-21 Batch 724 project-settings middle-row label/description proof

- [x] Six label, six description, and three note owners carry the frozen
  inline-block, width/padding/alignment, and note color/size declarations;
  legacy `vmiddle` and empty-note behavior remain intact.
- [x] Desktop/mobile computed declarations and menu/reviewer dependencies pass
  in normal and fallback-off runs (1/1 each); generic `.cu-*` fallback remains.

### 2026-07-21 Batch 725 project-settings middle-row shell proof

- [x] Six middle-row shell owners carry frozen `.box-wrap` border/padding,
  `:last-of-type` border removal, and responsive mobile padding declarations;
  legacy classes, order, and conditional panels remain intact.
- [x] Desktop/mobile computed declarations, row geometry, and dependency
  interaction pass in normal and fallback-off runs (1/1 each); generic
  `.box-wrap` fallback consumers remain.

### 2026-07-21 Batch 726 project-settings top/bottom shell proof

- [x] Top and bottom shell owners preserve Scala classes/order, top padding
  semantics, Save classes/submit behavior, and frozen desktop/mobile
  border/padding/alignment declarations.
- [x] The focused contract passes desktop/mobile geometry and Save ownership in
  normal and fallback-off runs (1/1 each); generic shell fallback remains.

### 2026-07-21 Batch 727 project-settings form/frame shell proof

- [x] Form and frame owners preserve Scala `nm`/`bubble-wrap gray` classes,
  overflow-visible behavior, shell geometry, and Save interaction while
  carrying exact frozen margin/radius/background declarations.
- [x] Desktop/mobile computed output and fallback boundary pass in normal and
  fallback-off runs (1/1 each); generic shell fallback remains.

### 2026-07-21 Batch 728 project-settings definition-list field proof

- [x] The top `dl`, two `dt` rows, two `dd` rows, and two labels preserve
  native DOM/copy/order and carry exact frozen `.frm-wrap` declarations.
- [x] Desktop/mobile computed margin/padding/label geometry, popover/textarea
  behavior, and fallback-off ownership pass in normal and fallback-off runs
  (1/1 each).

### 2026-07-21 Batch 729 project-settings logo upload proof

- [x] The left-column upload button and transparent file input preserve native
  classes, icon/copy, identity, and exact frozen `.nbtn`/`.fake-file-wrap`/
  `.file` geometry through route-local StyleX owners.
- [x] Desktop/mobile computed upload geometry, viewport containment, and
  invalid-image validation/reset pass in normal and fallback-off runs (1/1
  each); generic upload fallback consumers remain.

### 2026-07-21 Batch 730 project-settings logo-description list proof

- [x] The native top-left `ul.unstyled descs` owner carries only frozen
  Bootstrap `margin-left:0` and `list-style:none`; item spacing, copy/order,
  points, and upload owners remain intact.
- [x] Desktop/mobile computed list reset, item containment, and upload
  validation pass in normal and fallback-off runs (1/1 each); generic
  `unstyled` fallback consumers remain.

### 2026-07-21 Batch 731 project-settings subnavigation list proof

- [x] The native seven-item `ul.nav.nav-tabs` owner carries only frozen
  Bootstrap `.nav` margin/list reset declarations; item margin, Link routes,
  active/count/conditional state, and tab fallback remain intact.
- [x] Desktop/mobile computed reset, item containment, navigation, and Change
  VCS visibility pass in normal and fallback-off runs (1/1 each).

### 2026-07-21 Batch 732 project-settings subnavigation clearfix proof

- [x] The existing subnavigation list owner carries only frozen Bootstrap
  `.nav-tabs` `::before`/`::after` table/zero-line-height/empty-content
  declarations and `clear:both` on `::after`.
- [x] Desktop/mobile computed pseudo styles, tab geometry, navigation, and
  conditional state pass in normal and fallback-off runs (1/1 each).

### 2026-07-21 Batch 733 project-settings tab-anchor proof

- [x] Seven native tab anchors preserve Scala DOM/copy/order/hrefs, count,
  active/conditional state, and carry exact Bootstrap base/hover/focus/active
  declarations through route-local StyleX owners.
- [x] Desktop/mobile computed anchor geometry/interaction, SPA navigation,
  and containment pass in normal and fallback-off runs (1/1 each); generic tab
  fallback consumers remain.
- [x] Batch 734: commit-detail ranged thread badge preserves the legacy
  `.thread-header`/`.badge state` DOM and owns only frozen `margin:0` and
  `padding:2px 10px`; focused desktop/390px normal and fallback-off runs pass
  1/1 each.

### 2026-07-21 Batch 735 commit-detail ranged thread header/badge proof

- [x] The ranged commit discussion header and badge preserve the Scala
  `.thread-header`/`.badge state` DOM, state copy, and controls while owning
  only frozen header padding and badge margin/padding through route-local
  StyleX; shared thread/badge fallback consumers remain.
- [x] The focused contract passes source mapping, computed declarations,
  desktop/390px geometry, and containment in normal and fallback-off runs
  (1/1 each).

### 2026-07-21 Batch 736 commit-detail thread-shell proof

- [x] Commit-detail ranged and non-ranged thread wrappers preserve the legacy
  `.comment-thread-wrap` DOM/classes/state hooks while the route-local StyleX
  owner carries only frozen shell border/padding/background/max-width/position
  and open/closed inset shadows; PR changes/shared fallback remain untouched.
- [x] The focused contract passes source mapping, computed shell declarations,
  desktop/390px containment, and open-state interaction in normal and
  fallback-off runs (1/1 each).

### 2026-07-21 Batch 737 commit-detail thread-inner proof

- [x] Commit-route thread comments preserve the Scala list/row/media DOM and
  the ranged minimize control while route-local StyleX carries only frozen
  comments margin, comment padding, media background, and minimize position;
  the folded here affordance and shared fallback remain intact.
- [x] The focused contract passes source mapping, computed declarations,
  desktop/390px containment, and visible minimize geometry in normal and
  fallback-off runs (1/1 each).

### 2026-07-21 Batch 738 commit-detail thread-action proof

- [x] The commit-route thread reply action container preserves its React
  buttons/copy/order and toggle/submit behavior while carrying only frozen
  `thread-actrow` padding plus existing right alignment; shared fallback and
  fold behavior remain intact.
- [x] The focused contract passes partial/source mapping, computed padding and
  alignment, desktop/390px containment, and visible action geometry in normal
  and fallback-off runs (1/1 each).

### 2026-07-21 Batch 739 commit-detail closed ranged-thread fold proof

- [x] The commit-route closed ranged thread preserves the Scala `fold` class,
  hidden header/comments/reply state, folded-here red affordance, and React
  fold/unfold interaction while carrying only frozen fold declarations through
  route-local StyleX; shared fallback remains intact.
- [x] The focused contract passes source mapping, computed fold geometry,
  desktop/390px containment, and fold/unfold interaction in normal and
  fallback-off runs (1/1 each).

### 2026-07-21 Batch 740 commit-detail adjacent ranged-thread spacing proof

- [x] Adjacent ranged review threads preserve the legacy sibling spacing:
  `margin-top:10px` after a normal thread and `margin-top:0` after a folded
  thread, with React fold state updating the existing DOM and no legacy DOM
  control script copied.
- [x] The focused contract passes source mapping, computed spacing at
  desktop/390px, and live fold transition in normal and fallback-off runs
  (1/1 each).

### 2026-07-21 Batch 741 commit-detail review-form shell proof

- [x] The block review form preserves the Scala review-form, author-info,
  write-comment-box, and block-button DOM/interaction while route-local
  StyleX carries exact form shell, author-row, write-box, display, and
  720px responsive margin declarations; fallback consumers remain retained.
- [x] The focused contract passes source mapping, hidden/visible interaction,
  desktop/390px computed geometry, and viewport containment in normal and
  fallback-off runs (1/1 each).
- [x] Batch 742 review-card rail: verify source mapping, desktop/390px computed
  geometry, hover, state rail, and hash interaction in normal and fallback-off
  runs (1/1 each).
- [x] Batch 743 review-card inner content/date/comments: source mapping,
  truncation, computed metadata colors/spacing, desktop/390px geometry, and
  hash interaction pass in normal and fallback-off runs (1/1 each).
- [x] Batch 744 diff-body font owner: frozen source mapping, exact computed
  monospace family, desktop/390px coverage, and fallback-off independent
  focused contract pass 1/1 each; nested partial-diff fallback remains scoped
  separately.
- [x] Batch 745 diff-body layout owner: frozen source mapping, exact relative
  position/radius/min-height, desktop/390px computed coverage, and independent
  fallback-off focused contract pass 1/1 each.
- [x] Batch 746 partial-filediff row/cell owners: frozen source mapping, exact
  line-number/code-cell/code-line declarations, desktop/390px computed coverage,
  and independent fallback-off focused contract pass 1/1 each; outer file/meta
  and other nested partial-diff declarations remain separately scoped.
- [x] Batch 747 partial-filediff file-header owners: frozen source mapping, exact
  header/filename declarations, desktop/390px computed coverage, preserved commit
  links, and independent fallback-off focused contract pass 1/1 each; commit-id,
  utility, comments, range/color, and other nested declarations remain scoped.
- [x] Batch 748 partial-filediff commit-id owners: frozen source mapping, exact
  wrapper/cell declarations, desktop/390px computed coverage, visible shortened
  IDs, Link behavior, and independent fallback-off focused contract pass 1/1
  each; file-header, utility, comments, range/color, and other declarations remain
  scoped.
- [x] Batch 749 emitted `.isBinary` file-mode owner: frozen source mapping, exact
  color/text-shadow/padding, desktop/390px computed coverage, visible copy, and
  independent fallback-off focused contract pass 1/1 each; non-emitted utility,
  btnPop, outer/meta, comments, ranges/colors, and unrelated consumers remain
  scoped.
- [x] Batch 750 partial-filediff border repair: frozen outer/meta/code-line source
  mapping, exact longhand border geometry, desktop/390px computed coverage, and
  independent fallback-off focused contract pass 1/1 each; unrelated consumers
  remain scoped.
- [x] Batch 751 emitted inline comment row/cell owners: frozen Scala/LESS mapping,
  exact row/cell declarations, desktop/390px geometry, visible thread copy, and
  independent fallback-off focused contract pass 1/1 each; nested li width,
  non-emitted selectors, ranges/colors, and unrelated comments remain scoped.
- [x] Batch 752 emitted inline-comment nested list-item owner: frozen Scala/LESS
  mapping, conditional `max-width:1150px`, owner/no-inline-style proof,
  desktop/390px containment, visible thread copy, and independent normal and
  fallback-off focused runs pass 1/1 each; shared thread padding, non-emitted
  selectors, ranges/colors, and unrelated consumers remain scoped.
- [x] Batch 753 emitted partial-diff line-number comment-icon owner: frozen
  Scala/LESS mapping, exact base position/cursor/opacity/margin/width
  declarations, no-inline-style proof, desktop/390px computed geometry and
  containment, and independent normal and fallback-off focused runs pass 1/1
  each; hover/discommentable and unrelated icon consumers remain fallback-owned.
- [x] Batch 754 emitted partial-diff code/table shell owners: frozen
  Scala/LESS mapping, exact overflow and table width/separation/spacing
  declarations, StyleX/legacy class composition, visible rows, owner-relative
  desktop/390px geometry, and independent normal and fallback-off focused runs
  pass 1/1 each; patch-header paths, utility, range/colors, and unrelated table
  consumers remain scoped.
- [x] Batch 755 authenticated SVN commit-detail `.diff-wrap` owner: frozen
  Scala/LESS mapping, exact width/overflow/bottom-margin declarations,
  StyleX/legacy class composition, visible patch text, no-inline-style proof,
  desktop/390px owner-relative geometry, and independent normal/fallback-off
  focused runs pass 1/1 each; Git diff wrappers and unrelated fallback
  consumers remain scoped.
- [x] Batch 756 authenticated Git commit-detail metadata owners: frozen
  Scala/LESS/variable mapping, exact author/avatar/id declarations, fixed-font
  computed proof, preserved copy/link behavior, no-inline-style and
  owner-relative desktop/390px geometry, plus independent normal/fallback-off
  focused runs pass 1/1 each; `commitMsg-wrap` remains retired and SVN state
  stays separately scoped.
- [x] Batch 757 authenticated SVN commit-detail metadata owners: frozen
  Scala/LESS mapping, exact shared commit-info/ago/commit-id declarations,
  preserved SVN metadata DOM/copy, no-inline-style and desktop/390px geometry,
  plus independent normal/fallback-off focused runs pass 1/1 each; plain
  `.commitMsg`, generic avatar styling, and the already-owned diff wrapper stay
  fallback- or separately-owned.
- [x] Batch 758 source-less React-side `.right-txt` fallback bridge retirement:
  current `frontend/src` has no React emitter, only the exact `app.css` arm is
  removed, generated legacy fallback retention is asserted, and the focused
  fallback-off static contract passes 1/1. Frozen legacy utility sources remain
  unchanged.
- [x] Batch 759 source-less React-side `.blue-txt` fallback bridge retirement:
  current `frontend/src` has no React emitter, only the exact `app.css` color arm
  is removed, generated legacy fallback retention is asserted, and the focused
  normal/fallback-off static contracts pass 1/1 each. Frozen legacy color
  consumers remain unchanged.
- [x] Batch 761 authenticated project-posts two-column checkbox label StyleX ownership: frozen `twoColumnModeCheckboxArea.scala.html` and `_page.less:835-839` remain unchanged, the shared `.checkbox` fallback stays for unrelated consumers, and normal/fallback-off focused parity verifies declarations, geometry, no-inline-style, toggle, and popover interaction 1/1 each.
- [x] Batch 762 authenticated project-issues due-date clock `.mr3` StyleX ownership: frozen issue partials and `_common.less:221` remain unchanged, generic `.mr3` fallback stays for unrelated consumers, and normal/fallback-off focused parity verifies source/declarations, computed margin, desktop/mobile geometry, no-inline-style, and overdue copy 1/1 each.
- [x] Batch 760 authenticated profile/organization `.yobicon-middle` StyleX ownership and React-side fallback bridge retirement: frozen legacy icon consumers and `_common.less:191-194` remain unchanged, while normal/fallback-off static contracts verify StyleX ownership and generated fallback retention.
