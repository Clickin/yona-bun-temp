# Chrome full gate 대조 리포트 — 2026-08-22: 차등 패리티 전환 Phase E 흡수/폐기 판정

Status: active provenance (`docs/plans/2026-08-22-differential-parity-verification.md` Phase E —
레인 재배치 이후 full gate를 실행해 baseline-known 실패를 흡수/폐기 판정. 코드 수정 없음, 보고만)

## 실행 개요

- 명령: `WTR_METRICS=1 pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend test:e2e`
- runId: `mt4ark0h-37832`, exit code 1 (baseline-known 실패 포함의 예상 실패), 단일 인스턴스(무 샤딩)
- 소요 시간: 총 8,705,639 ms (≈ 2 h 25 m, prod 빌드 포함). 게이트 자체 8,690,061 ms.
  계획 문서의 52–61분 추정은 과거 2-shard 861-file 런 기준 — 이번 무샤딩 866-file 런과는 직접 비교 불가.
- 로그: `/tmp/chrome-gate-2026-08-22.log` (전체 리다이렉트, 콘솔에는 tail 요약만)
  메트릭스: `.agent/wtr-metrics/mt4ark0h-37832-{run,1}.json`

## 수치

| 구분 | 값 |
|---|---|
| 스펙 파일 | 866 스케줄 / 868 runnable (`_diag-*` 2종이 WTR config glob으로 추가 기동) |
| 테스트 | 3091 runnable |
| 통과 | 2985 |
| 실패 | 96 (고유 실패 95 + 1회 재시도 끝에 통과한 flake 1) |
| skip | 10 (real-instance 프로브군 — legacy 인스턴스 환경 변수 부재 스킵, 판정 대상 아님) |

## 스코프 주의 2건 (발견 사항, 수정 없음)

1. **runner ↔ lane manifest 불일치** — `scripts/run-wtr-e2e.mjs`의 `specFiles()`는
   `frontend/tests/e2e-lane-manifest.json`(chrome 663 / dom 205)을 읽지 않고 `tests/wtr/*.e2e.ts`
   전체 866 파일을 실행한다. pivot 문서의 "specFiles() returns the manifest chrome list" 서술과
   현재 코드가 다르다. 이번 gate는 chrome 레인의 상위집합이며, 아래 분류에 레인 소속을 병기했다.
2. **baseline 파일 소실** — `/tmp/baseline-failures.txt`(frozen pre-merge baseline)는 없어져
   `.agent/baseline/wtr-baseline.json`(runId `mt09pt1a-44259`, gitHead `d047ec595`, 2026-08-19,
   861 파일 / 3051 테스트 / 이름 있는 실패 116)에서 재생성했다. 1차 baseline은 직전 full gate
   `mt1ipwg4-26975`(post-merge, 861 파일, 고유 실패 48 — 당시 리포트는 "58 baseline-known" 표기)의
   샤드 메트릭스에서 재구성했다.

## 3-부류 대조 (1차 baseline: 직전 gate `mt1ipwg4-26975`)

| 부류 | 건수 | 비고 |
|---|---|---|
| baseline-known (유지) | 39 | 전원이 frozen pre-merge baseline(`mt09pt1a`)에서도 실패 — 재현 확인, 유지 |
| 신규 실패 (회귀 기록) | 56 | 이전 gate 통과 → 이번 실패. 이 중 2건은 frozen baseline에서도 실패했던 재-회귀 |
| 회복 (recovered) | 9 | 이전 gate 실패 → 이번 통과. 폐기(retire) 후보 |

참고: pivot 문서가 선언한 "58 baseline-known"과 재구성된 48(직전 gate 관측)의 차이는
당시 리포트가 flake/재시도를 다르게 집계했기로 추정 — 본 리포트는 샤드 메트릭스의 고유 실패만 세었다.

### baseline-known 39 — 유지 목록 (파일 :: 테스트)

- `ownership-left-sidebar-motion.e2e.ts` :: left framed sidebar keeps legacy geometry while opening and closing with CSS motion
- `ownership-project-code-browser-header-floats.e2e.ts` :: project code-browser header preserves branch/actions and stays contained
- `ownership-project-code-file-comment-count.e2e.ts` :: populated code-file comment count owns the legacy revision span
- `ownership-project-issue-editform-error-wrap.e2e.ts` :: project issue edit not-found error wrap keeps legacy source, paint, navigation, and containment
- `ownership-projects-search.e2e.ts` :: filter submit preserves the query contract
- `ownership-signup-validation-popover-position.e2e.ts` :: signup validation popover coordinates use Dynamic Style
- `ownership-standalone-login-form.e2e.ts` :: declares globally themed standard-login ownership while retaining shared fallback consumers
- `ownership-user-profile-google-provider-logo.e2e.ts` :: empty providers and guest viewer preserve the bounded provider behavior
- `ownership-user-profile-google-provider-logo.e2e.ts` :: public-profile Google provider logo owns its imported legacy asset and final cascade
- `ownership-user-profile-guest-stream-shell.e2e.ts` :: guest viewer owns the legacy empty public-profile stream shell
- `ownership-user-profile-issue-label-presentation.e2e.ts` :: public profile parent and child issue labels own their complete final presentation
- `ownership-user-profile-sidebar-leaf-classes.e2e.ts` :: populated public-profile sidebar leaf classes are retired with exact Style parity
- `ownership-user-profile-status-since-wrappers.e2e.ts` :: four identity wrappers preserve desktop output and geometry
- `ownership-user-profile-status-since-wrappers.e2e.ts` :: four identity wrappers preserve mobile output and geometry
- `project-code-view-folder.e2e.ts` :: project code branch root folder matches legacy code/view.scala.html DOM
- `project-code-view-folder.e2e.ts` :: project code root redirects non-empty repository to default branch folder
- `project-issue-detail-4.e2e.ts` :: project issue detail renders legacy commit referred timeline event
- `project-issues-empty.e2e.ts` :: closed project issue row preserves legacy weight arrow and due-date styling
- `project-issues-empty.e2e.ts` :: empty project issue list matches legacy issue/list.scala.html DOM
- `project-issues-empty.e2e.ts` :: populated project issue list matches legacy partial_list.scala.html DOM
- `project-issues-empty.e2e.ts` :: project issue draft row renders before normal list like legacy partial_list_draft.scala.html
- `project-issues-empty.e2e.ts` :: project issue list bracketed title prefix matches legacy title helpers
- `project-issues-empty.e2e.ts` :: project issue list child rows match legacy partial_view_childIssueListOnly.scala.html DOM
- `project-issues-empty.e2e.ts` :: project issue list hides other users' draft rows like legacy partial_list_draft.scala.html
- `project-issues-empty.e2e.ts` :: project issue list hides row milestone when project milestone menu is disabled
- `project-issues-empty.e2e.ts` :: project issue list mass update toolbar matches legacy partial_massupdate.scala.html DOM
- `project-issues-empty.e2e.ts` :: project issue list open due date shows legacy relative until text
- `project-issues-empty.e2e.ts` :: project issue list sharer count matches legacy common/sharerCount.scala.html DOM
- `project-issues-empty.e2e.ts` :: project issue list sorts labels like legacy partial_list.scala.html
- `project-issues-empty.e2e.ts` :: project issue list subtask row matches legacy partial_list_subtask.scala.html DOM
- `project-labels-form.e2e.ts` :: project labels renders legacy project/partial_issuelabels_list.scala.html populated list
- `project-labels-form.e2e.ts` :: project labels renders read-only label management state from legacy permission gates
- `project-milestone-edit-form.e2e.ts` :: project milestone edit form matches legacy milestone/edit.scala.html core form DOM
- `project-pullrequest-create-form.e2e.ts` :: pull request create form preserves legacy yobi.git.Write submit validation
- `project-pullrequest-edit-form.e2e.ts` :: project pull request edit form matches legacy git/edit.scala.html core DOM
- `user-direct-issue-form.e2e.ts` :: user direct issue form keeps /user/issues/new while rendering the selected project shell
- `user-direct-issue-form.e2e.ts` :: user direct mine issue form keeps /user/issues/new/mine while selecting the mine project
- `user-public-profile.e2e.ts` :: public user profile renders legacy connected social provider logos
- `user-public-profile.e2e.ts` :: public user profile route source keeps navigation on TanStack Link

### 신규 실패 56 — 파일 :: 테스트 :: 에러 요약

#### 하니스 진단 (_diag-*) — 회귀 판정 제외 (2건)

- `_diag-highlight.e2e.ts` :: diag: highlight DOM
  - `Error: DIAG highlight=NO PRE | at tests/wtr/_diag-highlight.e2e.ts:86:8 | at async n.<anonymous> (tests/wtr-compat.ts:3924:6)`
- `_diag-sharer.e2e.ts` :: diag: sharer search requests
  - `Error: button, input[type="button"], input[type="submit"], [role="button"]: element not found | at Locator.waitForElement (tests/wtr-compat.ts:1111:10) | at async Locator.click (tests/wtr-compat.ts:1607:18)`

#### 개별 파일 (17건)

- `organization-home.e2e.ts` :: organization home matches legacy organization/view.scala.html DOM
  - `Error: expect: toEqual diff@1265 exp[..."uid user-menu-wrap\"><span class=\"user-menu\"><a href=\"/yona/admin\">Profile</a></span><span class=\"user-menu\"><a href=\"/yona/user/editform\">Account</a></span><a href=\"/yona/users/log"] act[..."uid user-menu-wrap\"><span class=\"user-menu\"><a href=\"/`
- `project-issues-empty.e2e.ts` :: project issue list mass update toolbar affixes on scroll like legacy issue.MassUpdate.js
  - `Error: expect: toHaveClass(/(?:^|\s)affix(?:\s|$)/u) — actual: mass-update-wrap hide-in-mobile | at tests/wtr-compat.ts:2848:10 | at async Object.toHaveClass (tests/wtr-compat.ts:3317:6)`
- `project-members-form.e2e.ts` :: project members parent fallback retains legacy forbidden shell **[frozen baseline에서도 실패했던 재-회귀]**
- `project-pullrequest-create-form.e2e.ts` :: SVN pull request create route renders the legacy Git-only bad request
  - `Error: expect: toEqual keys=error,page,projectPage exp=[{"height":390,"width":1346,"x":10,"y":93},{"height":450,"width":1366,"x":0,"y":93},{"height":390,"width":1346,"x":10,"y":93}] act=[{"height":390,"width":1346,"x":10,"y":50},{"height":450,"width":1366,"x":0,"y":50},{"height":390,"width":1346,"x"`
- `project-pullrequests.e2e.ts` :: protected org-owned project pull request restores legacy title and search-scope header
  - `Error: expect: toBeVisible | at tests/wtr-compat.ts:2848:10 | at async Object.toBeVisible (tests/wtr-compat.ts:2877:6)`
- `project-reviews.e2e.ts` :: review pagination preserves the legacy two-page SPA controls
  - `Error: expect: toBeVisible | at tests/wtr-compat.ts:2848:10 | at async Object.toBeVisible (tests/wtr-compat.ts:2877:6)`
- `project-settings-form.e2e.ts` :: project settings menu links preserve legacy hrefs with SPA transition
  - `Error: strict mode violation: #subMenuProjectMember resolved to 2 elements | at Locator.current (tests/wtr-compat.ts:1080:12) | at actualClass (tests/wtr-compat.ts:3312:25)`
- `project-settings-form.e2e.ts` :: project settings navbar search scope matches legacy projectLayout common navbar
  - `Error: expect: toBeVisible | at tests/wtr-compat.ts:2848:10 | at async Object.toBeVisible (tests/wtr-compat.ts:2877:6)`
- `project-settings-form.e2e.ts` :: project settings reviewer count dropdown uses route-local open state
  - `Error: expect: poll().toEqual({"menuDisplay":"block","menuFloat":"none","menuPosition":"absolute","menuInsideGroup":true,"menuBelowToggle":true,"toggleOpenBackground":"rgb(242, 242, 242)"}) | at tests/wtr-compat.ts:2848:10 | at async Object.toEqual (tests/wtr-compat.ts:3746:4)`
- `search-organization.e2e.ts` :: organization search forbidden keeps the legacy organization shell without the site-level error action
  - `Error: expect: toHaveCount(1) — actual: 0 [sel: .error-wrap .ico.ico-err2] | at tests/wtr-compat.ts:2848:10 | at async Object.toHaveCount (tests/wtr-compat.ts:3448:6)`
- `search-organization.e2e.ts` :: organization search internal server error keeps the legacy default error shell
  - `Error: expect: toHaveCount(1) — actual: 0 [sel: .error-wrap .ico-404] | at tests/wtr-compat.ts:2848:10 | at async Object.toHaveCount (tests/wtr-compat.ts:3448:6)`
- `site-admin-issue-list.e2e.ts` :: site admin issue list matches legacy site/issueList.scala.html open populated DOM **[frozen baseline에서도 실패했던 재-회귀]**
- `site-admin-user-list.e2e.ts` :: site admin user delete modal stays route-owned across open dismiss and confirm
  - `Error: expect: poll().toMatchObject({"backgroundColor":"rgb(241, 241, 241)","borderColor":"rgba(0, 0, 0, 0.25)","color":"rgb(41, 41, 41)"}) | at tests/wtr-compat.ts:2848:10 | at async Object.toMatchObject (tests/wtr-compat.ts:3752:4)`
- `site-admin-user-list.e2e.ts` :: site admin user reset-password alerts dismiss through route-owned state
  - `Error: expect: toHaveCSS(opacity) — actual: | at tests/wtr-compat.ts:2848:10 | at async Object.toHaveCSS (tests/wtr-compat.ts:2958:6)`
- `user-public-profile.e2e.ts` :: public user profile show-subtasks popover is React-owned
  - `Error: expect: toHaveCount(0) — actual: 1 [sel: .show-subtasks .popover.top] | at tests/wtr-compat.ts:2848:10 | at async Object.toHaveCount (tests/wtr-compat.ts:3448:6)`
- `user-public-profile.e2e.ts` :: public user profile two-column popover and storage are React-owned
  - `Error: expect: toHaveCount(0) — actual: 1 [sel: .two-column-icon .popover.top] | at tests/wtr-compat.ts:2848:10 | at async Object.toHaveCount (tests/wtr-compat.ts:3448:6)`
- `user-token-settings.e2e.ts` :: current-user token route body matches legacy user/edit_token.scala.html DOM
  - `Error: expect: toHaveCSS(background-color) — actual: rgb(255, 115, 50) | at tests/wtr-compat.ts:2848:10 | at async Object.toHaveCSS (tests/wtr-compat.ts:2958:6)`

#### project-nested-layout.e2e.ts — 파일 전체 (31건)

두 가지 실패 서명:
- `strict mode violation: <셀렉터> resolved to 2 elements` — `#subMenuIssueLabel`, `#subMenuProjectMember`,
  `#project-owner`, `.commitInfo .commitId`, `.search-category-wrap li.active` 등 프로젝트 셸/서브메뉴 DOM이
  2벌 렌더되는 시그니처. 레인 재배치 물리 분할 이후 첫 full gate이라 해당 변경대 회귀로 기록
  (원인 규명/수정은 이번 범위外 — 보고만).
- 같은 파일 나머지 테스트의 `toBeVisible` 실패.

- `project-nested-layout.e2e.ts` :: project branches to milestones keeps the legacy project shell DOM nodes mounted
  - `Error: expect: toBeVisible | at tests/wtr-compat.ts:2848:10 | at async Object.toBeVisible (tests/wtr-compat.ts:2877:6)`
- `project-nested-layout.e2e.ts` :: project change VCS to issue labels keeps the legacy project shell DOM nodes mounted
  - `Error: strict mode violation: #subMenuIssueLabel resolved to 2 elements | at Locator.current (tests/wtr-compat.ts:1080:12) | at actualClass (tests/wtr-compat.ts:3312:25)`
- `project-nested-layout.e2e.ts` :: project delete to change VCS keeps the legacy project shell DOM nodes mounted
  - `Error: strict mode violation: #subMenuProjectChangeVCS resolved to 2 elements | at Locator.current (tests/wtr-compat.ts:1080:12) | at actualClass (tests/wtr-compat.ts:3312:25)`
- `project-nested-layout.e2e.ts` :: project home to issues and forbidden pull request keeps the legacy project shell DOM nodes mounted
  - `Error: expect: toBeVisible | at tests/wtr-compat.ts:2848:10 | at async Object.toBeVisible (tests/wtr-compat.ts:2877:6)`
- `project-nested-layout.e2e.ts` :: project issue detail to edit form keeps the legacy project shell DOM nodes mounted
  - `Error: expect: toBeVisible | at tests/wtr-compat.ts:2848:10 | at async Object.toBeVisible (tests/wtr-compat.ts:2877:6)`
- `project-nested-layout.e2e.ts` :: project issues to branches keeps the legacy project shell DOM nodes mounted
  - `Error: expect: toBeVisible | at tests/wtr-compat.ts:2848:10 | at async Object.toBeVisible (tests/wtr-compat.ts:2877:6)`
- `project-nested-layout.e2e.ts` :: project issues to exact compare range keeps the legacy project shell DOM nodes mounted
  - `Error: strict mode violation: .code-browse-wrap .commitInfo .commitId resolved to 2 elements | at Locator.current (tests/wtr-compat.ts:1080:12) | at textOf (tests/wtr-compat.ts:2885:29)`
- `project-nested-layout.e2e.ts` :: project issues to exact single commit detail keeps the legacy project shell DOM nodes mounted
  - `Error: expect: toBeVisible | at tests/wtr-compat.ts:2848:10 | at async Object.toBeVisible (tests/wtr-compat.ts:2877:6)`
- `project-nested-layout.e2e.ts` :: project issues to new issue form keeps the legacy project shell DOM nodes mounted
  - `Error: expect: toBeVisible | at tests/wtr-compat.ts:2848:10 | at async Object.toBeVisible (tests/wtr-compat.ts:2877:6)`
- `project-nested-layout.e2e.ts` :: project issues to statistics keeps the legacy menu-less shell DOM nodes mounted
  - `Error: expect: toBeVisible | at tests/wtr-compat.ts:2848:10 | at async Object.toBeVisible (tests/wtr-compat.ts:2877:6)`
- `project-nested-layout.e2e.ts` :: project issues to valid search keeps the legacy project shell DOM nodes mounted
  - `Error: strict mode violation: .search-category-wrap li.active resolved to 2 elements | at Locator.current (tests/wtr-compat.ts:1080:12) | at textOf (tests/wtr-compat.ts:2885:29)`
- `project-nested-layout.e2e.ts` :: project issues to watchers keeps the legacy project shell DOM nodes mounted
  - `Error: expect: toHaveCount(2) — actual: 4 [sel: .members.project .member] | at tests/wtr-compat.ts:2848:10 | at async Object.toHaveCount (tests/wtr-compat.ts:3448:6)`
- `project-nested-layout.e2e.ts` :: project members to webhooks keeps the legacy project shell DOM nodes mounted
  - `Error: strict mode violation: #subMenuWebhook resolved to 2 elements | at Locator.current (tests/wtr-compat.ts:1080:12) | at actualClass (tests/wtr-compat.ts:3312:25)`
- `project-nested-layout.e2e.ts` :: project milestone detail to edit form keeps the legacy project shell DOM nodes mounted
  - `Error: expect: toBeVisible | at tests/wtr-compat.ts:2848:10 | at async Object.toBeVisible (tests/wtr-compat.ts:2877:6)`
- `project-nested-layout.e2e.ts` :: project milestones to new milestone form keeps the legacy project shell DOM nodes mounted
  - `Error: expect: toBeVisible | at tests/wtr-compat.ts:2848:10 | at async Object.toBeVisible (tests/wtr-compat.ts:2877:6)`
- `project-nested-layout.e2e.ts` :: project milestones to posts keeps the legacy project shell DOM nodes mounted
  - `Error: expect: toBeVisible | at tests/wtr-compat.ts:2848:10 | at async Object.toBeVisible (tests/wtr-compat.ts:2877:6)`
- `project-nested-layout.e2e.ts` :: project open pull requests to closed pull requests keeps the legacy project shell DOM nodes mounted
  - `Error: strict mode violation: .pullrequeset-tab-menu li resolved to 2 elements | at Locator.current (tests/wtr-compat.ts:1080:12) | at actualClass (tests/wtr-compat.ts:3312:25)`
- `project-nested-layout.e2e.ts` :: project open pull requests to sent pull requests keeps the legacy project shell DOM nodes mounted
  - `Error: strict mode violation: .pullrequeset-tab-menu li resolved to 2 elements | at Locator.current (tests/wtr-compat.ts:1080:12) | at actualClass (tests/wtr-compat.ts:3312:25)`
- `project-nested-layout.e2e.ts` :: project posts to new post form keeps the legacy project shell DOM nodes mounted
  - `Error: expect: toBeVisible | at tests/wtr-compat.ts:2848:10 | at async Object.toBeVisible (tests/wtr-compat.ts:2877:6)`
- `project-nested-layout.e2e.ts` :: project posts to pull requests keeps the legacy project shell DOM nodes mounted
  - `Error: expect: toBeVisible | at tests/wtr-compat.ts:2848:10 | at async Object.toBeVisible (tests/wtr-compat.ts:2877:6)`
- `project-nested-layout.e2e.ts` :: project pull request default changes to a specific commit keeps the legacy project shell DOM nodes mounted
  - `Error: expect: toBeVisible | at tests/wtr-compat.ts:2848:10 | at async Object.toBeVisible (tests/wtr-compat.ts:2877:6)`
- `project-nested-layout.e2e.ts` :: project pull request overview to edit form keeps the legacy project shell DOM nodes mounted
  - `Error: expect: toBeVisible | at tests/wtr-compat.ts:2848:10 | at async Object.toBeVisible (tests/wtr-compat.ts:2877:6)`
- `project-nested-layout.e2e.ts` :: project pull requests to fork owner keeps the legacy project shell DOM nodes mounted
  - `Error: strict mode violation: #project-owner resolved to 2 elements | at Locator.current (tests/wtr-compat.ts:1080:12) | at Locator.inputValue (tests/wtr-compat.ts:1585:25)`
- `project-nested-layout.e2e.ts` :: project pull requests to new pull request form keeps the legacy project shell DOM nodes mounted
  - `Error: expect: toBeVisible | at tests/wtr-compat.ts:2848:10 | at async Object.toBeVisible (tests/wtr-compat.ts:2877:6)`
- `project-nested-layout.e2e.ts` :: project pull requests to pull request overview and missing detail keep the legacy project shell DOM nodes mounted
  - `Error: strict mode violation: .project-page-wrap > .error-wrap p resolved to 2 elements | at Locator.current (tests/wtr-compat.ts:1080:12) | at textOf (tests/wtr-compat.ts:2885:29)`
- `project-nested-layout.e2e.ts` :: project pull requests to reviews keeps the legacy project shell DOM nodes mounted
  - `Error: expect: toBeVisible | at tests/wtr-compat.ts:2848:10 | at async Object.toBeVisible (tests/wtr-compat.ts:2877:6)`
- `project-nested-layout.e2e.ts` :: project reviews to settings keeps the legacy project shell DOM nodes mounted
  - `Error: expect: toBeVisible | at tests/wtr-compat.ts:2848:10 | at async Object.toBeVisible (tests/wtr-compat.ts:2877:6)`
- `project-nested-layout.e2e.ts` :: project settings alias to canonical settings form keeps the legacy project shell DOM nodes mounted
  - `Error: expect: toBeVisible | at tests/wtr-compat.ts:2848:10 | at async Object.toBeVisible (tests/wtr-compat.ts:2877:6)`
- `project-nested-layout.e2e.ts` :: project settings to members keeps the legacy project shell DOM nodes mounted
  - `Error: strict mode violation: #subMenuProjectMember resolved to 2 elements | at Locator.current (tests/wtr-compat.ts:1080:12) | at actualClass (tests/wtr-compat.ts:3312:25)`
- `project-nested-layout.e2e.ts` :: project transfer to delete keeps the legacy project shell DOM nodes mounted
  - `Error: strict mode violation: #subMenuProjectDelete resolved to 2 elements | at Locator.current (tests/wtr-compat.ts:1080:12) | at actualClass (tests/wtr-compat.ts:3312:25)`
- `project-nested-layout.e2e.ts` :: project webhooks to transfer keeps the legacy project shell DOM nodes mounted
  - `Error: strict mode violation: #subMenuProjectTransfer resolved to 2 elements | at Locator.current (tests/wtr-compat.ts:1080:12) | at actualClass (tests/wtr-compat.ts:3312:25)`

#### project-posts.e2e.ts — board comment/watch 군 (6건)

- `project-posts.e2e.ts` :: authenticated populated board post owns open parent comment update form in Style
  - `Error: expect: toHaveCSS(background-color) — actual: rgb(238, 238, 238) | at tests/wtr-compat.ts:2848:10 | at async Object.toHaveCSS (tests/wtr-compat.ts:2958:6)`
- `project-posts.e2e.ts` :: project board detail owns legacy Watch button paint in Style
  - `Error: expect: poll().toMatchObject({"backgroundColor":"rgb(241, 241, 241)","borderColor":"rgba(0, 0, 0, 0.25)","color":"rgb(41, 41, 41)"}) | at tests/wtr-compat.ts:2848:10 | at async Object.toMatchObject (tests/wtr-compat.ts:3752:4)`
- `project-posts.e2e.ts` :: project board detail owns parent comment action and reply controls in Style
  - `Error: expect: toBeFocused | at tests/wtr-compat.ts:2848:10 | at async Object.toBeFocused (tests/wtr-compat.ts:2877:6)`
- `project-posts.e2e.ts` :: project board detail renders legacy child comments
  - `Error: expect: toBeFocused | at tests/wtr-compat.ts:2848:10 | at async Object.toBeFocused (tests/wtr-compat.ts:2877:6)`
- `project-posts.e2e.ts` :: project board detail submits legacy comment form through REST
  - `Error: expect: poll().toBeGreaterThan(0) | at tests/wtr-compat.ts:2848:10 | at async Object.toBeGreaterThan (tests/wtr-compat.ts:3722:4)`
- `project-posts.e2e.ts` :: project board-post comment editor meets its upload boundary
  - `Error: expect: toHaveCSS(border-color) — actual: rgb(204, 204, 204) | at tests/wtr-compat.ts:2848:10 | at async Object.toHaveCSS (tests/wtr-compat.ts:2958:6)`

### recovered 9 — 폐기 후보 (파일 :: 테스트)

- `organizations-new.e2e.ts` :: organization create form matches legacy organization/create.scala.html DOM
- `ownership-lost-password-authenticated-prefill.e2e.ts` :: matches legacy desktop prefill form geometry and paint
- `ownership-secret-setup.e2e.ts` :: preserves legacy desktop setup geometry and form order
- `ownership-secret-setup.e2e.ts` :: preserves legacy mobile setup geometry and form order
- `ownership-user-files-search.e2e.ts` :: pins the empty-state search output and React navigation
- `project-import.e2e.ts` :: project import form matches legacy project/importing.scala.html DOM
- `project-issue-detail-2.e2e.ts` :: project issue detail shows notification receiver on editor focus
- `project-members-form.e2e.ts` :: project members matches legacy project/members.scala.html DOM
- `project-posts.e2e.ts` :: project board list empty state matches legacy board/list.scala.html DOM

## 판정 (Phase E 관점)

- baseline-known 39건은 두 baseline(frozen pre-merge + 직전 gate)에서 모두 재현 — "그대로 유지" 목록 확정.
  이번 gate로 유지 목록이 58(문서 표기) → 39로 확정되어 나머지는 흡수/회복으로 정리된다.
- 신규 실패 56건 중 31건이 `project-nested-layout.e2e.ts` 파일 전체(DOM 2벌 렌더 시그니처)로 집중 —
  단일 원인 회귀일 가능성이 높다. 최우선 조사 대상.
- `_diag-*` 2건은 WTR 하니스 자체 진단 스펙(앱 DOM 아님)이라 회귀 판정에서 제외.
- recovered 9건은 폐기(retire) 후보로 레져 반영을 권한다.
- real-instance 프로브 10건은 이번 런에서 skip되어 판정 불가 — legacy 인스턴스 구동 환경에서 별도 실행 필요.
