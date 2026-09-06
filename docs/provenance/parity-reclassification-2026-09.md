# Accepted-Divergence Reclassification Ledger (2026-09-03)

Status: active evidence. 이 문서는
`/tmp/yoram/yoram-parity-closure-fix-plan.md` Phase D의 실행 기록이며, final
sweep 전 마지막으로 갱신된다. 대상 raw artifact는
`.agent/differential/full-post-commit-5db580a63/report.json`
(`runId=sweep-mtk4hpxy`, 2026-09-02)의 122개 `ACCEPTED_DIVERGENCE` rows다.

## 1. Classification vocabulary alignment

The differential harness enum has been aligned to the closure contract
vocabulary (`scripts/differential/report.mjs` `CLASSIFICATIONS`):

| old harness name | final contract name | blocking? |
| --- | --- | --- |
| `ACCEPTED_DIVERGENCE` | `IMPLEMENTATION_DIFFERENCE` | no |
| `LEGACY_BUG` | `LEGACY_BUG_NOT_REPRODUCED` | no |
| `PRODUCT_GAP` | `REAL_OBSERVABLE_MISMATCH` | yes |
| `UNVERIFIED` / `HARNESS_ERROR` / `INFRA_ERROR` | (unchanged) | yes |

The rename is not a mechanical relabel of rows: every carried-over row below
was individually reviewed against its violation payload plus repository
evidence (shard audits over all 122 rows, integrator arbitration of the 27
disputed rows, and two healthy-capture verification runs). The final gate is:
`REAL_OBSERVABLE_MISMATCH = 0`, `UNVERIFIED = 0`, `HARNESS_ERROR = 0`,
evidence-blocking `INFRA_ERROR = 0`, and every remaining
`IMPLEMENTATION_DIFFERENCE` / `LEGACY_BUG_NOT_REPRODUCED` row keeping its
evidence-backed reason.

## 2. Method

1. All 122 rows were extracted to a working set and audited by 8 independent
   read-only reviewers sharded by domain (issues, projects A/B, pull requests,
   code browser, auth screens, user A/B). Each row returned: classification,
   evidence (file:line actually opened), rationale, product-fix flag.
2. The integrator arbitrated the 27 rows where reviewers disagreed — all
   disputes were `dom` rows whose `firstDiffs` contain text-bearing entries
   (watcher counts, author names, footer links).
3. Arbitration findings (source-level, decisive):
   - `a.btn.watcher-count` is rendered by both sides in the shared project
     header (`yona-original/app/views/project/header.scala.html`,
     `frontend/src/routes/$ownerName/$projectName.tsx:2755-2764`); the PR/
     commit-page "watcher count missing" diffs were skeleton-alignment
     artifacts, not missing UI.
   - `a.naver-cloud-platform` exists in both footers
     (`yona-original/app/views/common/footer.scala.html:12`,
     `frontend/src/routes/__root.tsx`); same for the skeleton diff shape.
4. Two capture-quality defects were found and fixed in the runner (see §4);
   the disputed rows were then re-verified with stable captures in
   `.agent/differential/focused-phase-d/report.json`
   (`runId=sweep-mtl4mrea`, 18 scenarios, 0 UNVERIFIED, 0 PRODUCT_GAP) and
   `.agent/differential/focused-phase-d2/report.json`
   (`runId=sweep-mtm3unw9`).

## 3. Dispositions

### `REAL_OBSERVABLE_MISMATCH` — 1 row, fixed (Phase E)

| row | route | defect | fix |
| --- | --- | --- | --- |
| S2 DOM `/users/login` | `GET /users/login` | Yoram answered `405` (POST-only compat route shadowed the SPA fallback); a browser deep link got Chrome's error page where legacy renders the login page. The prior `neterror` capture in sweep-mtk4hpxy was this defect, not noise. | `crates/server/src/routes/auth.rs` serves the login page shell for `GET /users/login` (React router owns the alias, `frontend/src/routes/users/login.tsx`); `crates/server/src/anonymous_access.rs` adds `/users/login` to the public paths. Contract test `users_login_deep_link_serves_login_page_shell`. Verified in sweep-mtm3unw9: real page skeleton on both sides. |

### `IMPLEMENTATION_DIFFERENCE` — 117 rows (unchanged from §4 of
`differential-behavior-coverage-excluded.md`, re-verified)

- 108 DOM shell rows: raw SSR-vs-SPA skeleton comparisons whose visible
  surface is owned by the focused WTR suites (`frontend/tests/wtr/*.e2e.ts`)
  and the frozen visual baseline
  (`docs/provenance/frontend-visual-parity-baseline-2026-07-11.md`).
  Disputed rows (PR/commit list and detail pages, auth screens, org screens)
  were re-checked against rendered Yoram output with the stable-capture
  runner; the surviving diffs are structural (selector/wiring/order), not
  missing visible content.
- 9 non-DOM rows (B-0006 imports ownership, B-0276 markdown preview client
  ownership, B-0225 changeVCS, B-0019 site project purge, B-0187 login
  transport, B-0024 `/_init`, B-0298 settings tab probes, and the two
  behavior-less shell rows at `/` and `/admin/sample`) keep their §4
  evidence; cited sources were re-opened and still hold.

### `LEGACY_BUG_NOT_REPRODUCED` — 4 rows (prior §4 families, evidence re-opened)

- B-0002 missing-branch delete redirect
  (`yona-original/app/controllers/BranchApp.java:71-78`,
  `app/playRepository/GitRepository.java:1230-1236`).
- B-0003 HEAD pseudo-ref commit comments
  (`yona-original/app/controllers/CodeHistoryApp.java:102-114,251-260`).
- B-0221 `defultLoginPage` permissive 200
  (`yona-original/app/controllers/UserApp.java:1372-1380` vs
  `crates/server/src/routes/workspace.rs:1905-1930`).
- B-0159 `/sites/import` redirect-on-missing-file
  (`yona-original/app/controllers/SiteApp.java:368-387`).

### New `LEGACY_BUG_NOT_REPRODUCED` rule added (Phase C rerun finding)

- B-0016 / U20 `DELETE /organizations/:name/member/leave` — legacy 403 vs
  Yoram 200. Legacy's `Operation.LEAVE` handling covers only PROJECT
  (`yona-original/app/utils/AccessControl.java:176-183`), so an organization
  leave is authorized as `OrganizationUser.isAdmin`
  (`AccessControl.java:197`) and `validateForLeave`
  (`OrganizationApp.java:297-311`) blocks a plain member of a single-admin
  org with the `atLeastOneAdmin` message while still letting the last admin
  leave. Yoram implements the protection's intent (blocks the last admin,
  members leave with redirect; contract test
  `organization_leave_mutation_redirects_members_and_blocks_last_admins`).

## 4. Harness/fixture repairs made during this phase (evidence quality, not product)

1. `hoverAnchor` polls for the anchor (up to 5s) instead of a one-shot
   `querySelector` — closes S6/B-0091 `INFRA_ERROR` (SPA render timing).
2. `renderSkeleton` waits for two identical consecutive skeleton samples
   (up to 8s) on SPA targets — removes mid-hydration phantom content diffs.
3. `resolveLegacyIssueId` resolves the favorite target row id from the issue
   detail page's `data-issue-id`
   (`yona-original/app/views/issue/view.scala.html:123`; the favorite API
   matches `Issue.finder.byId`, `User.java:1081`), replacing the broken
   `result.json` read (`LegacySession` exposes no parsed json) over a
   number-keyed payload.
4. `resolveLegacyOrganizationId` reads the numeric id from the organization
   settings form hidden field
   (`yona-original/app/views/organization/setting.scala.html:33`) — legacy
   pages never render `data-organization-id`.
5. `delete-org-member` resolves member ids itself instead of requiring a
   prior `edit-org-member` cache entry.
6. Yoram parity fixture seeds the legacy `role` rows 1–7
   (`yona-original/conf/initial-data.yml`) and the `weblabs` organization
   with admin (org_admin) + carol (org_member), matching the legacy
   foundation (`scripts/legacy-localhost.mjs`); U12/U20 lifecycle steps run
   against real state on both sides.
7. `view-project` uses the canonical `/api/v1/owners/{o}/projects/{p}` read;
   `view-pullrequest-state` compares the PR detail page (legacy `/state` is
   an XHR polling fragment, not a page).
8. SPA DOM captures use per-side page paths
   (`readPageHandler` in `pullrequest-code.mjs`), and the project home DOM
   target captures after hydration.

## 5. Gate for the final sweep (Phase H)

The final same-HEAD full sweep must record, after the enum rename:

- `REAL_OBSERVABLE_MISMATCH = 0`
- `UNVERIFIED = 0`, `HARNESS_ERROR = 0`, evidence-blocking `INFRA_ERROR = 0`
- every `IMPLEMENTATION_DIFFERENCE` row carrying a reason (and, where the
  row originates from a classification rule, a rationale reference)
- every `LEGACY_BUG_NOT_REPRODUCED` row carrying source evidence.

Residual step errors (e.g. the legacy-side 500 on
`/admin/sample/pullRequest/1/changes` in a throwaway-free fixture, legacy
enroll/cancel 400 agreement on carol) are recorded per-scenario and do not
produce violations; scenario-level completion is required for the closure
claim.

## 6. Real environment / integration checks (Phase F disposition)

Executed on this host (evidence: final sweep lanes and contract tests):

- SVN executable-backed flows: real `svn` client checkout/commit pair
  against both instances (P22 sweep lane).
- Git Smart HTTP: real `git clone` + commit + push pair (R17 lane).
- Email flows: SMTP-backed catch-box fixtures (signup verification, lost
  password, notification mail lanes).
- OAuth authorization round trips against local provider fixtures (S11,
  U24).
- Supported context paths: root `/`, `/yona`, and nested `/team/yoram`
  contract tests (`auth_workspace_contract.rs`) plus sweep execution at the
  root mount.
- Filesystem/upload identity and throwaway Git repository identity:
  exercised by the sweep's generated-entity lifecycle lanes with residue
  checks.

Operator prerequisites (not executable in this environment; missing
credentials/services are recorded, not converted into accepted parity):

- Real GitHub / Google OAuth authorization round trips (real client
  credentials and external network consent required).
- External LDAP directory bind/search/account mapping (no LDAP service on
  this host; the sweep uses the local LDAP fixture).
- External migration destination behavior.
- External SMTP relay delivery (the sweep uses the local SMTP catch-box).
- Existing Yona MariaDB adoption and the supported DB matrix (no MySQL/
  MariaDB server available on this macOS arm64 host).
- Existing SVN repository identity adoption.
- Linux deployment and Windows MSVC binary verification (no cross target
  executed here).

## 7. U18 site-admin body fingerprints (2026-09-06)

The focused U18 artifact
`.agent/differential/site-admin-body-proof/report.json` (`runId=sweep-mtp4ggxm`)
contains eight route-body DOM findings. Seven are implementation-only
SSR-vs-SPA identity/class differences already covered by exact full-body WTR
contracts. The differential classifier accepts only the exact route, state,
legacy skeleton count, Yoram skeleton count, and complete `firstDiffs` signature
recorded in `scripts/differential/report.mjs`; it does not accept a route
family, class prefix, or generic visible-loss rule. Any changed or missing
visible control, text, or row changes that fingerprint and remains
`UNVERIFIED`.

| route/state | exact WTR contract |
|---|---|
| `/sites/userList` / populated | `frontend/tests/wtr/site-admin-user-list.e2e.ts:176-458`, `site admin user list matches legacy site/userList.scala.html populated DOM` |
| `/sites/projectList` / populated | `frontend/tests/wtr/site-admin-project-list.e2e.ts:158-295`, `site admin project list matches legacy site/projectList.scala.html populated DOM` |
| `/sites/data` / default | `frontend/tests/wtr/site-admin-data.e2e.ts:124-188`, `site admin data matches legacy site/data.scala.html DOM` |
| `/sites/issueList` / open-populated | `frontend/tests/wtr/site-admin-issue-list.e2e.ts:142-360`, `site admin issue list matches legacy site/issueList.scala.html open populated DOM` |
| `/sites/postList` / populated | `frontend/tests/wtr/site-admin-post-list.e2e.ts:140-331`, `site admin post list matches legacy site/postList.scala.html populated DOM` |
| `/sites/mail` / not-configured | `frontend/tests/wtr/site-admin-mail.e2e.ts:154-242`, `site admin mail matches legacy site/mail.scala.html not-configured DOM` |
| `/sites/massmail` / default | `frontend/tests/wtr/site-admin-massmail.e2e.ts:131-246`, `site admin mass mail matches legacy site/massMail.scala.html DOM` |

`/sites/update` is a separate exact product-identity fingerprint, not a WTR
plugin/class exception. Legacy declares `version := "1.16.0"` in
`yona-original/build.sbt:6`. Yoram's workspace declares `version = "0.1.0"` in
`Cargo.toml:15-18`; `crates/server/src/app_config.rs:229-250` defaults the site
update current version from `CARGO_PKG_VERSION`, and
`crates/server/src/routes/site_admin/update.rs:105-151` returns that configured
identity. Only the exact `1.16.0` versus `0.1.0` no-update body signature is
classified; any other version or status-copy mismatch remains `UNVERIFIED`.

## 8. Project pull-request list body fingerprints (2026-09-06)

The focused blocker artifact
`.agent/differential/focused-blockers-8c83/report.json`
(`runId=sweep-mtp4njvh`) retains three route-body DOM findings for the
open/closed/sent project pull-request list states. The classifier now accepts
only the exact route, state, legacy skeleton count, Yoram skeleton count, and
complete `firstDiffs` signature from that artifact. These are
`IMPLEMENTATION_DIFFERENCE`, not missing product behavior: the legacy side's
`div.select2-container`, `select2-drop`, `select2-search`, and
`select2-chosen` nodes are owned by the legacy Select2 view/plugin
(`yona-original/app/views/common/select2.scala.html`,
`yona-original/public/javascripts/lib/select2/select2.js`), while the React
route owns the equivalent control and list behavior in
`frontend/src/routes/$ownerName/$projectName/pullRequests.tsx`. The focused
WTR suite proves the rendered contract and interaction; any missing button,
text, row, or changed skeleton count remains `UNVERIFIED`.

| route/state | exact skeleton counts | exact WTR contract |
|---|---:|---|
| `/admin/sample/pullRequests` / populated | legacy `68`, Yoram `73` | `frontend/tests/wtr/project-pullrequests.e2e.ts:307-347`, `project pull request populated list matches legacy git/partial_list.scala.html DOM` |
| `/admin/sample/closedPullRequests` / empty | legacy `45`, Yoram `50` | `frontend/tests/wtr/project-pullrequests.e2e.ts:166-238`, `project closed pull request empty list matches legacy git/list.scala.html DOM` |
| `/admin/sample/sentPullRequests` / empty | legacy `49`, Yoram `49` | `frontend/tests/wtr/project-pullrequests.e2e.ts:240-305`, `project sent pull request empty list matches legacy git/list.scala.html DOM` |

The shared focused contract
`project pull request list keeps legacy filters, wrappers, and compact dates`
(`frontend/tests/wtr/project-pullrequests.e2e.ts:749-773`) additionally proves
the React-owned Select2-shaped contributor control, legacy wrappers, and
current-year date rendering. The differential unit tests exercise missing
button, missing text, and count near-misses for each fingerprint; each remains
`UNVERIFIED` so a future visible regression cannot be hidden by this narrow
reclassification.

## 9. Project issue-detail body fingerprints (2026-09-06)

The I18-I21 issue-body findings in
`.agent/differential/focused-near-final-c680/report.json` (`runId=sweep-mtp6dtvw`)
are accepted only for the anchored issue route, scenario id/action/state,
legacy skeleton count, Yoram skeleton count, and complete normalized stable
`firstDiffs` tuple set recorded in `scripts/differential/report.mjs`. The
comment fingerprint normalizes only generated sweep identity and mutable
relative-time text; it does not wildcard controls, copy, or tuple membership.
The label-edit and comment-avatar rows are already represented by the issue-detail route contract: the focused WTR
`project issue detail matches legacy issue/view.scala.html voter state`
(`frontend/tests/wtr/project-issue-detail-1.e2e.ts:368-420`) canonicalizes the
populated comment/avatar timeline, and
`project issue detail renders legacy updateable labels without manager edit link`
(`frontend/tests/wtr/project-issue-detail-3.e2e.ts:347-390`) verifies the
permission boundary. These exact SSR-vs-SPA body fingerprints are therefore
`IMPLEMENTATION_DIFFERENCE`; changed counts, missing controls, missing rows,
or any other near-miss remain `UNVERIFIED`.

| route/state | exact skeleton counts | exact WTR contract |
|---|---:|---|
| `/admin/sample/issue/[1-9][0-9]*` / I18 `edit-issue-state` | legacy `325`, Yoram `300` | `frontend/tests/wtr/project-issue-detail-1.e2e.ts:368-420`, `project issue detail matches legacy issue/view.scala.html voter state`; permission boundary: `frontend/tests/wtr/project-issue-detail-3.e2e.ts:347-390` |
| `/admin/sample/issue/[1-9][0-9]*` / I19 `comment-lifecycle-initial` | legacy `325`, Yoram `300` | `frontend/tests/wtr/project-issue-detail-1.e2e.ts:368-420`, `project issue detail matches legacy issue/view.scala.html voter state`; permission boundary: `frontend/tests/wtr/project-issue-detail-3.e2e.ts:347-390` |
| `/admin/sample/issue/[1-9][0-9]*` / I19 `comment-created` | legacy `572`, Yoram `550` | `frontend/tests/wtr/project-issue-detail-1.e2e.ts:368-420`, `project issue detail matches legacy issue/view.scala.html voter state`; permission boundary: `frontend/tests/wtr/project-issue-detail-3.e2e.ts:347-390` |
| `/admin/sample/issue/[1-9][0-9]*` / I20 `issue-engagement` | legacy `325`, Yoram `300` | `frontend/tests/wtr/project-issue-detail-1.e2e.ts:368-420`, `project issue detail matches legacy issue/view.scala.html voter state`; permission boundary: `frontend/tests/wtr/project-issue-detail-3.e2e.ts:347-390` |
| `/admin/sample/issue/[1-9][0-9]*` / I21 `issue-label-crud` | legacy `325`, Yoram `300` | `frontend/tests/wtr/project-issue-detail-1.e2e.ts:368-420`, `project issue detail matches legacy issue/view.scala.html voter state`; permission boundary: `frontend/tests/wtr/project-issue-detail-3.e2e.ts:347-390` |

## 10. R3 pull-request form body fingerprints (2026-09-06)

The focused c63 artifact
`.agent/differential/focused-consolidated-c63a/report.json`
(`runId=sweep-mtp3jpbh`) contains the default create form and seeded edit-form
body findings from scenario `R3-pr-forms`. The classifier accepts only the
exact route, scenario state, legacy/Yoram skeleton counts, and complete
`firstDiffs` signatures recorded in `scripts/differential/report.mjs`.
They are `IMPLEMENTATION_DIFFERENCE` because the focused WTR contracts prove
the visible form controls while the residual entries are known renderer/plugin
structure: React owns the Select2-shaped closed controls and shared Markdown
editor buttons, and product-neutral Markdown examples intentionally use
`@example`/`example.com` in place of the legacy `@yobi`/`yobi.io` identity.
Any changed or missing visible control, text, or count remains `UNVERIFIED`.

| route/state | exact skeleton counts | exact WTR contract |
|---|---:|---|
| `/admin/sample/newPullRequestForm` / `R3-pr-forms` default create form | legacy `266`, Yoram `294` | `frontend/tests/wtr/project-pullrequest-create-form.e2e.ts:473-725`, `project pull request create form matches legacy git/create.scala.html core DOM` |
| `/admin/sample/pullRequest/1/editform` / `R3-pr-forms` seeded PR 1 loaded edit form | legacy `264`, Yoram `237` | `frontend/tests/wtr/project-pullrequest-edit-form.e2e.ts:52-333`, `project pull request edit form matches legacy git/edit.scala.html core DOM` |

The create-form default state is also covered by
`project pull request create form resolves legacy defaults without query
parameters` (`frontend/tests/wtr/project-pullrequest-create-form.e2e.ts:190-299`).
Its selector replacement is covered by
`new pull request form owns legacy inline layout and preserves Select2 closed
state` (`frontend/tests/wtr/ownership-project-new-pull-request-form-inline-residual.e2e.ts:6-44`)
and `new pull-request Select2 button owns route-scoped geometry in Style`
(`frontend/tests/wtr/ownership-project-new-pull-request-select2-button.e2e.ts:4-27`).
The editor/checklist/help shell is covered by
`new pull request markdown editor keeps legacy mt10 ownership and tabs`
(`frontend/tests/wtr/ownership-project-new-pull-request-markdown-editor-mt10.e2e.ts:40-99`).
The edit-form selector and editor substitutions are covered by
`project pull request edit form drops only delegated select2 markers`
(`frontend/tests/wtr/project-pullrequest-edit-form.e2e.ts:334-376`),
`project pull request edit form drops markdown JS-only markers while preserving tabs`
(`frontend/tests/wtr/project-pullrequest-edit-form.e2e.ts:377-442`), and
`pull-request editform markdown editor keeps legacy mt10 ownership and tabs`
(`frontend/tests/wtr/ownership-project-pull-request-editform-markdown-editor-mt10.e2e.ts:35-102`).
The product-neutral link decision is recorded in
`frontend/src/rebrand.spec.ts:72-84` and
`docs/provenance/frontend-yoram-rebrand-2026-07-13.md:135-138`.
`scripts/differential/differential.test.mjs` exercises exact matches plus
missing visible control, changed visible text, changed count, and scenario
near-misses; every near-miss remains `UNVERIFIED`. The R16 pull-request detail
fingerprint is intentionally absent: its missing commit/event rows remain a
backend-owned blocker.

## 11. Project issue-label form identity-copy fingerprint (2026-09-06)

The focused P1 artifact records one remaining body-only difference for
`/admin/sample/issue/labelsform`: both sides contain 75 skeleton entries and
the complete `firstDiffs` pair is limited to the legacy `naver/yobi` copy versus
the current `Yoram/Yoram` copy. The category-id probe is a separate scenario
step and is not part of this body fingerprint.

The classifier accepts only the exact
`P1-issue-labels` `view-issue-labels-form` state, route, skeleton counts, and
full `firstDiffs` pair in
`scripts/differential/report.mjs`. Its rationale cites the existing Yoram
rebrand evidence in
`docs/provenance/frontend-yoram-rebrand-2026-07-13.md:135-138` and
`frontend/src/rebrand.spec.ts:72-84`; it does not alter the label messages or
category API. The focused WTR contract is
`project labels renders REST categoryName payloads with legacy control classes`
(`frontend/tests/wtr/project-labels-form.e2e.ts:1187-1215`).

`scripts/differential/differential.test.mjs` proves the exact fingerprint is
accepted while changed form, button, label, copy, count, and state near-misses
remain `UNVERIFIED`.
