# Differential Behavior Coverage — Sweep-Excluded Behaviors & Follow-up (2026-08-24, rev.7)

Status: historical/interim evidence. 이 문서는 differential sweep이 자동
비교하지 **않는** 행위와 그 이유를 기록한다. **중요(rev.4 정정): 아래 §1 행위는 대부분 Yoram에 이미 구현되어
있다** — SVN은 `crates/server/src/svn_protocol/*` + `crates/vcs`(svn executable),
git smart-http는 `crates/server/src/smart_http.rs` + git executable, migration/
import는 migrator 도구(`crates/migration`, `crates/yona-migrate`)로 구현돼 있다.
미커버의 원인은 미구현이 아니라 **자동 비교 수단의 부재**(프로토콜 클라이언트,
SMTP 토큰 전달, 공유 시드 상태 보호)다. rev.3의 "미구현(gap)" 표기는 잘못된
것이며 이번 판에서 정정했다. Companion artifacts:
`.agent/differential/behavior-coverage.json`, `.agent/differential/report.json`,
`docs/provenance/behavior-inventory.json` (immutable B-id inventory).

2026-08-23 결정: 기존 deferred 분류는 폐지됐다. 위 행위는 전부 당시
1차 릴리즈 범위로 기록됐으며, 이 artifact는 최종 release 승인이 아니다.
남은 작업은 "기능 구현"이 아니라 **스윕 하네스가 해당 행위를 자동
비교할 수 있게 만드는 것**(예: svn/git 클라이언트 페어 세션, 메일 catch-box,
격리 프로젝트 생성-삭제 라이프사이클)이다.

## 0. Intentional deviations — interim delegated surfaces (최종 제외 아님)

아래는 미구현이 아니라 **SPEC.md 결정에 따라 app runtime이 아니라 migrator
딜리버러블이 소유하는** `-_-api/v1/**` 행이다. migrator 도구 자체는
`crates/migration` + `crates/yona-migrate`로 구현돼 있고 legacy Yona의 실제
`/-_-api/v1` 엔드포인트를 호출한다. 스윕이 이 영역 divergence를 발견하면
패리티 gap이 아니라 당시 ownership deviation으로 기록한다. `scripts/differential/report.mjs`의
migrator-scope 규칙이 `ACCEPTED_DIVERGENCE`로 자동 분류하더라도 이는
interim evidence일 뿐이며, user-visible legacy behavior를 최종 scope에서
제외하거나 일반적인 observable divergence를 승인하지 않는다.

- `-_-api/v1/owners/:o/:p/exports` (B-0036) — export는 migrator/export tool 소유.
  yoram은 `/api/v1/owners/{o}/projects/{p}/exports`를 별도로 서빙한다(P15 확인).
- `-_-api/v1/owners/:o/:p/issues/imports` (B-0214 계열) — 게시글→이슈 변환 import.
  스윕은 P17/I18 boundary probe로 상태 차이만 기록한다.
- `-_-api/v1/owners/:o/:p/projects POST` (bulk import-style 생성) — 일반 프로젝트
  생성은 `/api/v1/owners/:o/projects`가 canonical이다.


## 1. Previously sweep-excluded behaviors — now covered

### SVN protocol (5) — covered by `P22-svn-client-pair`
- B-0021/B-0170/B-0294/B-0314 (`/svn/*path`) and B-0271
  (`/!svn-fake/sevice/`) are driven through real `svn 1.14.5` checkout +
  commit sessions against both instances. Commit log message state matches;
  Yoram's missing `<author>` XML field is documented as a known divergence.

### Git smart-http (2) — covered by `R17-git-client-pair`
- Real `git clone --depth 50` + identical commit + push runs against both
  throwaway projects; post-push refs match after ignoring the optional HEAD
  symref line. No client execution errors in the final sweep.

### Migration / import / export pages — invalid-boundary probes covered
- B-0025/B-0200 are covered by `P26-residual-branch-import-probes`.
- B-0286 and B-0159 are covered by `U25-residual-site-user-probes`.
- Probes intentionally submit empty/invalid payloads; no import state is written.

### Email-token flows (5) — covered by SMTP-backed fixtures
- B-0175 is covered by `U23-email-validation-lifecycle`; Yoram's unsupported
  send path remains a recorded known gap.
- B-0275/B-0154 are covered by `S17-lost-password-flow` using per-side reset
  links; B-0285 is covered by `U24-signup-email-verification`.
- B-0192 is covered by `U24-signup-email-verification`: the fixture waits for
  both side-specific signup mails, opens both `/verify/:loginId/:code` links,
  and follows Yoram's SPA-owned REST verification mutation.

### Destructive on shared parity state — throwaway coverage
- B-0002 is covered by `P26-residual-branch-import-probes` as a missing-branch
  direct probe.
- B-0019 is covered by `P24-site-project-purge`; B-0225/B-0226/B-0236 are
  covered by `P23-wave-d-project-destructive`, with generated projects deleted
  and absence checked.
- B-0001 is covered by `R18-throwaway-branch-thread-lifecycle`: the fixture
  creates a unique Git project, pushes `parity-source`, merges the PR, deletes
  only that source branch, verifies `git ls-remote` absence, and removes the
  project. Seeded `feature/ui` is never touched.

### Misc — covered probes
- B-0199 is covered by `P25-empty-root-post`.
- B-0287/B-0288 and B-0303 are covered by `U25-residual-site-user-probes`.
- B-0289 is covered by `U26-avatar-capture-restore` using a deterministic
  offline 1×1 PNG attachment, capture, restore, and attachment cleanup.
- B-0295/B-0296 are covered by `R18-throwaway-branch-thread-lifecycle`, which
  creates a review comment thread, discovers the legacy/Yoram thread ids,
  closes and reopens each thread, and cleans the throwaway PR/project.

## 2. Runtime divergences found by the mutation sweeps (2026-08-23 해소)

The 49 needs-review violations from the first mutation sweep are resolved.
Harness defects fixed in `scripts/differential/` (each verified by probe against
the live instances before the fix):

1. `run.mjs` `stepHelpers.sendRaw` dropped its fetch `headers` (cookies and
   content-type never sent) — root cause of the legacy anonymous-403 and yoram
   415 cascades; promoted to the canonical helper together with `pairLenient`.
2. Body-less yoram mutations (watch/unwatch/enroll/DELETE family) never carried
   the CSRF header; yoram validates CSRF on every session mutation while legacy
   ignores it — fixed in `YoramSession.request`.
3. `YoramSession` now merges session and CSRF cookies after sign-in and after
   every response; `LegacySession` preserves its cookie jar as well.
4. `LegacySession` supports the URL-encoded signup payload required by the
   legacy Play binder; U24 waits for both asynchronous signup mails before
   claiming verification.
5. Legacy PR creation submits the full `refs/heads/*` branch values expected
   by `PullRequest.fetchSourceBranchTo`; R18 falls back to the legacy reviews
   list when the changes page omits the thread markup.
6. Yoram's `/verify/:loginId/:verificationCode` remains SPA-owned; R18/U24
   fixtures translate the browser route to the existing `/api/v1` mutation
   after checking the linked page response.
7. `pairRequest`/`pairLenient` now treat agreed outcomes (including identical
   error statuses) as parity; only disagreement is reported.
The current artifact classified 127
`ACCEPTED_DIVERGENCE` rows and 8 `LEGACY_BUG` rows in
`.agent/differential/report.json` (`sweep-mt6npd2a`, 2026-08-24). The only
blocking row is B-0039/I13 `sharableUsers`; its implementation and focused
empty-query contract are present, but the two sweep fixtures expose different
users, public projects, avatar URLs, and observed ordering. This is a
human fixture/catalog decision, not an automatically safe product patch or
final accepted divergence;
`docs/provenance/human-verification-2026-08.md` records it.

## 3. Harness status

The historical report has no `HARNESS_ERROR`, `INFRA_ERROR`, or `UNVERIFIED`
classification. The historical issue-id, label-residue, SMTP-token, CDP, and
PR-seed items from the previous sweep were resolved or reclassified and are
not open work in that run. Step errors remain separately reported by the runner
and do not reduce the behavior-row count.

Historical artifact summary:

- behavior rows: 315/315 IDs (discovery count, not a product parity percentage);
- violations: 136 (`ACCEPTED_DIVERGENCE` 127, `LEGACY_BUG` 8,
  `PRODUCT_GAP` 1);
- blocking finding in this artifact: B-0039/I13 only;
- database projections compared after teardown: yes;
- step errors: 108, reported separately from findings.

This artifact does not authorize final parity or release closure. Final closure
requires all user-visible deferred/gap work to reach zero and no ordinary
accepted observable divergence to remain under `AGENTS.md` and `SPEC.md`.

## 4. Finite classification of the current accepted rows (2026-09-02)

This section is the finite review ledger for the prior raw report archived at
`.agent/differential/archive/sweep-mtk2chyb/report.json`
(`runId=sweep-mtk2chyb`, `finishedAt=2026-09-02T12:33:21.107Z`; SHA-256
`40c83ac87ecafe9119f938e32efce8f66f9aaa404f95f2042b8750ad47d6b224`). The
original `.agent/differential/report.json` was later overwritten by the failed
focused run `sweep-mtk3s3e8` (mail sink startup failure, zero scenarios
attempted); that failed report is not parity evidence. The archived report
remains the raw sweep artifact (125 `ACCEPTED_DIVERGENCE`, 8 `LEGACY_BUG`, 1
`INFRA_ERROR`, and 4 `UNVERIFIED`); this ledger does not rewrite or suppress
those observations.
It classifies all 125 accepted rows against the frozen contract:

| classification | rows | disposition |
| --- | ---: | --- |
| `IMPLEMENTATION_DIFFERENCE` | 117 | non-observable on the supported user-visible surface; retained only with the evidence below |
| `LEGACY_BUG_NOT_REPRODUCED` | 4 | legacy-side permissive/error behavior has concrete legacy source evidence and no Yoram state divergence |
| `REAL_OBSERVABLE_MISMATCH` | 4 | unresolved until the assigned minimum fixes are rerun |
| **total accepted rows reviewed** | **125** | no parity-complete or release-closure claim |

### `IMPLEMENTATION_DIFFERENCE` — 117 rows

#### DOM shell rows — 108

The sweep's `dom` findings compare raw SSR/SPA skeleton entries. They do not
show a user-visible mismatch on the preserved target surface: the focused WTR
route suites and the production visual baseline compare the visible legacy
roots/geometry, while direct route contracts cover the stateful boundaries.
Evidence: `docs/provenance/core-parity-audit.md` (React route/WTR ownership and
direct route contracts), `docs/provenance/frontend-visual-parity-baseline-2026-07-11.md`
(the route rows marked `CLOSED`), and the focused files under
`frontend/tests/wtr/`.

The exact 108 rows are:

| scenario | rows | exact route(s) |
| --- | ---: | --- |
| I18-issue-edit-state | 2 | `/admin/sample/issue/302` ×2 |
| I19-comment-lifecycle | 3 | `/admin/sample/issue/303` ×3 |
| I20-issue-engagement | 1 | `/admin/sample/issue/304` |
| I21-issue-label-crud | 1 | `/admin/sample/issue/305` |
| P1-issue-labels | 3 | `/admin/sample/issue/labels`, `/admin/sample/issue/labelsform`, `/admin/sample/issue/label/categories` |
| P11-watch-toggle-watchers | 1 | `/admin/sample/watchers` |
| P15-project-data-surfaces | 2 | `/admin/sample/reviews`, `/info/leave/admin/sample` |
| P3-milestones | 3 | `/admin/sample/milestone/1`, `/admin/sample/milestone/1/editform`, `/admin/sample/newMilestoneForm` |
| P4-posts-and-board | 4 | `/admin/sample/posts`, `/admin/sample/postform`, `/admin/sample/post/1`, `/admin/sample/post/1/editform` |
| P5-project-home-subpages | 9 | `/admin/sample/members`, `/admin/sample/watchers`, `/admin/sample/settingform`, `/admin/sample/deleteform`, `/admin/sample/transfer`, `/admin/sample/webhooks`, `/admin/sample/statistics`, `/admin/sample/go`, `/admin/sample/changeVCS` |
| R1-pr-lists | 3 | `/admin/sample/pullRequests`, `/admin/sample/closedPullRequests`, `/admin/sample/sentPullRequests` |
| R11-code-ajax-nobranch | 3 | `/admin/sample/code/!`, `/admin/sample/code/!/`, `/admin/sample/code/!/README.md` |
| R12-newfork-reviews-attachments | 2 | `/admin/sample/newFork`, `/admin/sample/reviews` |
| R15-branch-default-toggle | 1 | `/admin/sample/branches` |
| R2-pr-detail | 3 | `/admin/sample/pullRequest/1`, `/admin/sample/pullRequest/1/state`, `/admin/sample/pullRequest/1/changes/HEAD` |
| R3-pr-forms | 3 | `/admin/sample/newPullRequestForm`, `/admin/sample/pullRequest/1/editform`, `/admin/sample/newPullRequest/mergeResult` |
| R4-commits-list | 3 | `/admin/sample/commits`, `/admin/sample/commits/main/`, `/admin/sample/commits/main/README.md` |
| R5-commit-detail | 1 | `/admin/sample/commit/HEAD` |
| R6-code-browser | 2 | `/admin/sample/code`, `/admin/sample/code/main` |
| R7-code-tree-entry | 1 | `/admin/sample/code/main/README.md` |
| R8-code-ajax | 3 | `/admin/sample/code/main/!`, `/admin/sample/code/main/!/`, `/admin/sample/code/main/!/README.md` |
| R9-branches | 1 | `/admin/sample/branches` |
| S2-login-forms | 2 | `/users/login`, `/users/loginform` |
| S2-view-project | 1 | `/admin/sample` |
| S3-create-issue | 1 | `/admin/sample/issue/307` |
| S3-signup-form | 1 | `/users/signupform` |
| S4-issue-comment | 2 | `/admin/sample/issue/308` ×2 |
| S4-lost-password | 1 | `/lostPassword` |
| S5-list-labels | 1 | `/admin/sample/labels` |
| S6-projectform | 1 | `/projectform` |
| S7-projects-listing | 1 | `/projects` |
| S9-help-init-uikit | 3 | `/_help`, `/_init`, `/_UIKit` |
| U1-user-issues-tabs | 6 | `/user/issues?tab=assigned`, `/user/issues?tab=authored`, `/user/issues?tab=commented`, `/user/issues?tab=mentioned`, `/user/issues?tab=shared`, `/user/issues` |
| U11-org-screens | 9 | `/organizations/weblabs/boards`, `/organizations/weblabs/pullrequests`, `/organizations/weblabs/closedPullrequests`, `/organizations/weblabs/members`, `/organizations/weblabs/issues`, `/organizations/weblabs/deleteForm`, `/organizations/weblabs/settingform`, `/organizations/weblabs/search?query=sample`, `/organizations/new` |
| U15-profile-editforms | 4 | `/user/editform`, `/user/editform/emails`, `/user/editform/notifications`, `/user/editform/token` |
| U18-site-admin-screens | 10 | `/sites/userList`, `/sites/projectList`, `/sites/data`, `/sites/diagnostic`, `/sites/issueList`, `/sites/postList`, `/sites/noAvatarUsers`, `/sites/mail`, `/sites/massmail`, `/sites/update` |
| U19-files-and-user-api | 1 | `/files` |
| U3-notifications-list | 2 | `/notifications`, `/notification` |
| U4-global-search | 1 | `/search?query=sample` |
| U5-orgs-list | 1 | `/orgs` |
| U6-org-home | 1 | `/organizations/weblabs` |
| U7-user-profile | 1 | `/admin` |
| U8-user-files | 1 | `/user/files` |
| U9-new-direct-issue-forms | 2 | `/user/issues/new`, `/user/issues/new/mine` |

#### Non-DOM implementation rows — 9

| behavior / scenario | exact route(s) | evidence for non-observable disposition |
| --- | --- | --- |
| B-0006 / I18 | `/-_-api/v1/owners/admin/projects/sample/issues/imports` | `SPEC.md:251-253` and `docs/provenance/legacy-external-api.md:138-153,217-219` assign this import namespace to migrator/export-import scope, not the app-server compatibility route. |
| B-0276 / P14 | `/markdown/admin/sample` | `docs/provenance/core-parity-audit.md:87-95` and the 2026-08-24 product decision make Markdown preview React-client-owned (`react-markdown`); the absent POST server renderer is not used by the supported UI. |
| B-0225 / P23 | `admin/parity-lc-sweep-mtk2chyb-39/changeVCS`; `admin/parity-fork-sweep-mtk2chyb-39 (cleanup)` | `scripts/differential/scenarios/project.mjs:1939-1948` translates the throwaway REST boundary; `crates/server/tests/project_change_vcs_contract.rs:216-292` proves the direct compatibility route and empty `204`; both generated entities are deleted and residue-checked. |
| B-0019 / P24 | `/sites/project/delete/:projectId` | `crates/server/src/routes/site_admin.rs:1767,2175` and `crates/server/tests/site_admin_contract.rs:813-850` prove the direct compatibility alias preserves deletion, `303`, and `/sites/projectList`; the sweep row compares the REST response shape instead. |
| B-0187 / S2 | `/users/login` | `frontend/tests/wtr/auth-aliases.e2e.ts:82-120` proves the browser route renders the original index screen at the original URL; the raw document transport is not the supported visual contract. |
| B-0024 / S9 | `/_init` | `crates/server/src/routes/legacy_runtime.rs:39-78,1074-1079` and `crates/server/tests/assets_contract.rs:1203-1249` cover provisioning and redirect state; the React shell does not consume the legacy bootstrap document. |
| B-0298 / U22 | `/user/editform/:tabId` ×2 | `frontend/src/routes/user/editform.tsx:16-47,374-384` and `crates/server/src/routes/workspace.rs:1082-1425` show the supported settings surface is workspace actions/tabs; the sweep's empty legacy POST tab probes are not UI mutations. |

### `LEGACY_BUG_NOT_REPRODUCED` — 4 rows

These are not accepted product behavior. They are legacy-side degenerate
semantics where the Yoram state remains unchanged or stricter:

| behavior / scenario | exact route | legacy source/runtime evidence | disposition |
| --- | --- | --- | --- |
| B-0002 / P26 | `/admin/sample/code/__parity_missing_branch__/` | `yona-original/app/controllers/BranchApp.java:71-78` calls `GitRepository.deleteBranch` and redirects without an existence check; `yona-original/app/playRepository/GitRepository.java:1230-1236` blindly invokes JGit branch deletion. | Treat legacy redirect-on-missing-branch as a legacy bug/quirk; Yoram's `404` reports the same no-op and no branch state is written. |
| B-0003 / R14 | `/admin/sample/commit/HEAD/comments/673/delete` | `yona-original/app/controllers/CodeHistoryApp.java:102-114` returns not-found for an unresolved commit object; the `HEAD` pseudo-ref is not a legacy commit object. | Treat legacy inability to resolve the pseudo-ref as a legacy limitation; the Yoram `200` extension does not mutate a legacy-visible comment. |
| B-0221 / S13 | `/user/editform/defultLoginPage` | `yona-original/app/controllers/UserApp.java:1372-1380` reads the query `path` and returns `200` even when it is absent; Yoram `crates/server/src/routes/workspace.rs:1905-1930` rejects the missing/invalid landing path. | Malformed empty boundary payload is not supported UI behavior; no default landing state is accepted by Yoram. |
| B-0159 / U25 | `/sites/import` | `yona-original/app/controllers/SiteApp.java:368-387` redirects to `/sites/data` when no multipart `data` file exists; invalid import errors use `400`. | Legacy permissive redirect and Yoram `400` both reject the invalid probe and persist no import state; the legacy fallback is not a supported success contract. |

### `REAL_OBSERVABLE_MISMATCH` — 4 historical rows, all fixed and verified

These four rows (B-0035 contributes two route rows; B-0117 and B-0155 contribute
one each) were deliberately not hidden under `ACCEPTED_DIVERGENCE`. The
post-commit rerun and direct contract evidence below verify the minimum fixes;
the archived pre-fix report retains these four historical classifications.

| behavior / scenario | exact route(s) | historical mismatch | verified disposition |
| --- | --- | --- | --- |
| B-0035 / I12 | `/-_-api/v1/owners/admin/projects/sample/issues/1/assignableUsers`; `/-_-api/v1/owners/admin/projects/sample/assignableUsers` | Legacy `IssueApi.java:789-930` emits localized custom rows without `pureNameOnly`/`type`; Yoram's `crates/persistence/src/repo/issue_picker.rs:35-68,250-344` emitted stable keys plus those fields, while `scripts/differential/run.mjs:509-540` added an extra `bob` project member. | Fixed fixture membership and external mapper/avatar localization. Post-commit I12 has zero violations; `issue_assignable_contract.rs` is 9/9 and `rest_contract.rs` is 20/20. |
| B-0117 / S11 | `/authenticate/github/denied` | Legacy answers `303` to `/` with denial flash semantics; the pre-fix sweep observed Yoram `200` without `Location`. | Fixed direct denied route. Post-commit S11 has zero violations and `auth_workspace_contract.rs` asserts raw `303`, `/yona/`, no-cache headers, exact `PLAY_FLASH`, and no session mutation. |
| B-0155 / S18 | `/restricted` | Legacy `Secured` redirects an anonymous request; the pre-fix sweep observed Yoram `200` auth shell with no `Location` when anonymous access was enabled. | Fixed route-specific gate. Post-commit S18 compares the same anonymous redirect and renders `/`; its only remaining row is behavior-less DOM shell drift (`route="/"`, `behaviorId=null`), not B-0155. `auth_workspace_contract.rs` asserts raw `303`, `/yona/`, and exact `PLAY_FLASH`. |

#### Post-commit verification artifact

The isolated post-commit run is archived at
`.agent/differential/archive/post-commit-b865e86f7/report.json` (also retained
at `.agent/differential/post-commit-b865e86f7/report.json`; `runId=sweep-mtk4a3fg`,
`startedAt=2026-09-02T13:13:30.845Z`,
`finishedAt=2026-09-02T13:16:21.820Z`; SHA-256
`1b8ee68effb10377abb964c4b0d2e677ce3af9150614e520b6f1e40a5ef73dc3`). All
3/3 scenarios and 5/5 covered behaviors attempted, with zero global
`INFRA_ERROR`s and zero step errors:

| scenario | result |
| --- | --- |
| I12 / B-0035 | zero violations; both issue/project external assignable-user API rows matched after fixture and mapper fixes |
| S11 / B-0117 | zero violations; OAuth denied action and provider-authorize contract executed |
| S18 / B-0155 | authentication status/location matched; one accepted DOM shell row at `/` has no behavior ID and is unrelated to the protected-route contract |

The earlier healthy-but-limited auth run
`.agent/differential` `runId=sweep-mtk3woq0` recorded S11's provider-authorize
step as `HARNESS_ERROR` because no provider URL was available and S18's old
adapter saw no deterministic Yoram `Location`; the canceled `auth2` attempt
produced no report. Neither is accepted product evidence. These limitations
are now superseded for S11/S18 by the post-commit report and direct raw
contract tests above. The remaining `S6/B-0091` `INFRA_ERROR` and four
unverified prerequisite rows below remain open; this is not a parity-complete
or 100% claim.

The current non-accepted rows remain actionable: `S6/B-0091` is
`INFRA_ERROR` because the browser/CDP selector `#two-column-mode-checkbox` was
not found; `P13/B-0008`, `P18/B-0004`, `U12/B-0201`, and `U20/B-0016` remain
`UNVERIFIED` because their per-side entity IDs were unresolved or fixture
state diverged. The prerequisite is a new isolated fixture/selector run, not
an accepted-divergence rationale. No parity-complete claim is made here.

## 5. Final same-HEAD sweep and focused blocker classification (2026-09-02)

The final isolated sweep was run at commit `5db580a63adf1c5863e881488b60b2bdebb9ff1b`
and is retained at
`.agent/differential/full-post-commit-5db580a63/report.json`
(`runId=sweep-mtk4hpxy`,
`startedAt=2026-09-02T13:19:26.614Z`,
`finishedAt=2026-09-02T13:33:32.853Z`;
SHA-256
`6ee84966058a828d40ed8a6e59507a541e498a67a926a566389710def60481a3`).
All 117 registered scenarios and 315 unique behavior IDs were attempted.
The report contains 134 violations: 122 `ACCEPTED_DIVERGENCE`, 8
`LEGACY_BUG`, 3 `UNVERIFIED`, and 1 `INFRA_ERROR`; it contains no
`PRODUCT_GAP` or `REAL_OBSERVABLE_MISMATCH` rows. There were no global
infra errors. The run recorded 47 scenarios with step errors and 88 failed
steps; these step errors are separate from the violation count.

The focused S6 rerun is retained at
`.agent/differential/focused-s6-mtk4hpxy/report.json`
(`runId=sweep-mtl1iltz`; SHA-256
`4dd6076f9af0586324e707e28d3f2b46719e552d1b77c27fab520e09190858a8`).
It reproduced exactly one `INFRA_ERROR` for `S6/B-0091`: the Yoram browser
step at `http://127.0.0.1:3196/admin/sample/issues` could not find
`#two-column-mode-checkbox`. The selector is present in the project issue
route source and the focused run did not observe a product response
divergence; this remains a browser/fixture rendering blocker, not a product
gap.

The unresolved lifecycle rows remain coverage blockers, not actionable
product gaps: `P13/B-0008` (`legacy=null`, `yoram=4` member ID discovery),
`P18/B-0004` (`legacy=null`, `yoram=4` member ID discovery), and
`U20/B-0016` (legacy organization/member IDs unresolved). `U12/B-0201`
also remains unresolved through two step errors (legacy issue ID and legacy
organization ID discovery), although the final report emitted no separate
violation for it. The final report therefore does not authorize a parity or
100% claim.

Focused fixture inspection found the P13/P18 prerequisite is environmental:
the legacy parity H2 `ROLE` table had no rows even though
`yona-original/conf/initial-data.yml` defines role IDs 1–7. Consequently the
legacy add-member path inserted Bob with a null `role_id`, and the member page
omitted that row; Yoram returned member ID 4. This is fixture seeding/recovery
work, not evidence of a Yoram product gap. The U12/U20 organization-ID
prerequisite is a runner resolver issue: legacy `/orgs` and organization pages
do not render `data-organization-id`, while the organization setting form
does render a hidden numeric `id`; the current resolver scans only the absent
data attribute. These rows require harness/fixture correction and rerun.

## 6. Canonical parity closure status

**Status: incomplete; no human acceptance and no 100% claim.**

The closure target is implementation `HEAD
db777a1898a38e88dfd3f4873edb2025ab79ccfa`. The final same-HEAD sweep evidence is
the report in §5 (`sweep-mtk4hpxy`, 117/117 scenarios, 315/315 behaviors,
134 violations, SHA-256
`6ee84966058a828d40ed8a6e59507a541e498a67a926a566389710def60481a3`).
The four historical observable rows were fixed and verified by the focused
post-commit checks: B-0035/I12 (two assignable-user API rows), B-0117/S11
(OAuth denied redirect), and B-0155/S18 (anonymous restricted redirect).

Remaining evidence blockers are S6/B-0091 (browser/CDP cannot find
`#two-column-mode-checkbox`), P13/B-0008 and P18/B-0004 (legacy member ID
discovery diverges from Yoram), U12/B-0201 (legacy issue/organization IDs
unresolved without a report violation), and U20/B-0016 (legacy
organization/member IDs unresolved). These are harness/fixture prerequisites,
not accepted product parity. The final sweep also did not exercise unavailable
live integrations: real GitHub/Google OAuth authorization credentials,
external LDAP directory connectivity, or external migration destinations;
the sweep uses local provider/LDAP/SMTP fixtures and mock OAuth boundaries
instead. SVN and Git smart-HTTP client lanes did execute in the final sweep.

This status records evidence and open prerequisites only. It does not mark
human acceptance, release approval, parity completion, or a 100% result.

## 7. Phase D reclassification of the 122 accepted rows (2026-09-03)

The 122 `ACCEPTED_DIVERGENCE` rows of sweep-mtk4hpxy were individually
reviewed and reclassified under the final closure vocabulary
(`IMPLEMENTATION_DIFFERENCE` / `LEGACY_BUG_NOT_REPRODUCED` /
`REAL_OBSERVABLE_MISMATCH`); the harness enum was renamed accordingly. One
real observable mismatch was found and fixed (the `GET /users/login` deep
link answered `405` instead of the login page shell). The full ledger,
arbitration evidence, capture-quality repairs, and the Phase H gate are in
`docs/provenance/parity-reclassification-2026-09.md`.
