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
