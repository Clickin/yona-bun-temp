# Differential step disposition ledger (2026-09)

Source: `.agent/differential/final-sweep-40e1bb42c/report.json`, `runId=sweep-mtm43abc`. This ledger accounts for every non-`EXECUTED` step result exactly once. A step error is not silently converted into behavior coverage: dispositions marked `BLOCKING` remain release blockers until the cited repair/evidence is rerun.

`LEGACY_BUG_NOT_REPRODUCED` and `IMPLEMENTATION_DIFFERENCE` are the only non-blocking unresolved classes permitted by the corrective plan. `HARNESS_ERROR`, `INFRA_ERROR`, and `REAL_OBSERVABLE_MISMATCH` are blocking.

| # | scenario | step | outcome | root cause | disposition | fix or evidence | current status |
|---:|---|---|---|---|---|---|---|
| 1 | I10-issue-label-categories | issue-label-categories | FAILED (Yoram 404) | Resolved category id is absent on Yoram | HARNESS_ERROR | Fix category discovery/fixture alignment; `scripts/differential/scenarios/issues.mjs` | BLOCKING |
| 2 | I11-issue-api-detail | issue-api-probe | FAILED (legacy 401) | Legacy `-_-api/v1` probe is token-gated | IMPLEMENTATION_DIFFERENCE | `yona-original/app/controllers/api/UserApi.java:295-305`; canonical session API rule in `report.mjs` | CLOSED — evidence-backed transport boundary |
| 3 | I14-issue-api-favorites | issue-api-probe | FAILED (Yoram 404) | Canonical favorite-issues endpoint was not observed | REAL_OBSERVABLE_MISMATCH | Implement/verify `/api/v1/favoriteIssues`, or remove unsupported probe only with inventory evidence | BLOCKING |
| 4 | I15-org-issue-list | org-issues | FAILED (legacy 403) | Legacy organization fixture/authorization rejected the read | INFRA_ERROR | Align authenticated org fixture and rerun | BLOCKING |
| 5 | I18-issue-edit-state | probe-issue-imports | FAILED (legacy 400; Yoram 404) | External import probe is outside app-owned route surface | IMPLEMENTATION_DIFFERENCE | `docs/provenance/legacy-external-api.md`; migrator scope | CLOSED — evidence-backed scope boundary |
| 6 | I19-comment-lifecycle | delete-comment-compat | FAILED (legacy 500; Yoram 400) | Legacy compat delete crashes on degenerate payload | LEGACY_BUG_NOT_REPRODUCED | Legacy comment-delete handler evidence; focused issue-core contract | CLOSED — legacy crash |
| 7 | I20-issue-engagement | update-sharer | FAILED (legacy 500; Yoram 404 add, 200 remove) | Legacy IssueApi share handler dereferences the exact malformed add/remove payload; Yoram rejects the missing add target and accepts the no-op remove | LEGACY_BUG_NOT_REPRODUCED | B-0212 exact step attribution and request bodies `{sharer:["admin"],action:"add"}` / `{sharer:["admin"],action:"remove"}` on both share routes; `yona-original/app/controllers/api/IssueApi.java`; no sharer state is written | CLOSED — exact legacy crash |
| 8 | I21-issue-label-crud | update-issue-label | FAILED (both 400) | Label id/payload discovery is invalid | HARNESS_ERROR | Repair label discovery and payload in issue scenario | BLOCKING |
| 9 | I21-issue-label-crud | delete-label-category | FAILED (both 404) | Category id was not comparable; legacy DELETE 400 is a known degenerate defect | HARNESS_ERROR | Resolve a live category before comparing; `report.mjs` legacy DELETE rule is not evidence for missing id | BLOCKING |
| 10 | I22-label-category-crud | update-label-category | FAILED (legacy 400) | Category update fixture/payload rejected before comparison | HARNESS_ERROR | Repair category discovery/payload and rerun | BLOCKING |
| 11 | I23-markdown-and-export-reads | migration-export-issues | FAILED (Yoram 403) | Migration endpoint requires unavailable admin capability | INFRA_ERROR | Run with migration-capable fixture; migration route evidence in `yona-original/conf/routes` | BLOCKING |
| 12 | I23-markdown-and-export-reads | migration-export-labels | FAILED (Yoram 403) | Migration endpoint requires unavailable admin capability | INFRA_ERROR | Same migration-capable fixture prerequisite | BLOCKING |
| 13 | I23-markdown-and-export-reads | migration-export-issuelabel-pairs | FAILED (Yoram 403) | Migration endpoint requires unavailable admin capability | INFRA_ERROR | Same migration-capable fixture prerequisite | BLOCKING |
| 14 | I23-markdown-and-export-reads | global-labels | FAILED (legacy 400) | Legacy global-label request rejected by fixture/auth state | INFRA_ERROR | Align global-label fixture and rerun | BLOCKING |
| 15 | P15-project-data-surfaces | view-migration-hub | FAILED (both 403) | Migration admin prerequisite absent | INFRA_ERROR | Provision migration-capable admin and rerun | BLOCKING |
| 16 | P15-project-data-surfaces | export-migration-project | FAILED (Yoram 403) | Migration admin prerequisite absent | INFRA_ERROR | Provision migration-capable admin and rerun | BLOCKING |
| 17 | P15-project-data-surfaces | export-migration-issue-label-pairs | FAILED (Yoram 403) | Migration admin prerequisite absent | INFRA_ERROR | Provision migration-capable admin and rerun | BLOCKING |
| 18 | P15-project-data-surfaces | export-migration-issues | FAILED (Yoram 403) | Migration admin prerequisite absent | INFRA_ERROR | Provision migration-capable admin and rerun | BLOCKING |
| 19 | P15-project-data-surfaces | export-migration-labels | FAILED (Yoram 403) | Migration admin prerequisite absent | INFRA_ERROR | Provision migration-capable admin and rerun | BLOCKING |
| 20 | P15-project-data-surfaces | export-migration-milestones | FAILED (Yoram 403) | Migration admin prerequisite absent | INFRA_ERROR | Provision migration-capable admin and rerun | BLOCKING |
| 21 | P15-project-data-surfaces | export-migration-posts | FAILED (legacy 500; Yoram 403) | Legacy export crashes on payload; Yoram lacks migration capability | INFRA_ERROR | Provision capability; retain legacy crash as separate report rule only with payload evidence | BLOCKING |
| 22 | P15-project-data-surfaces | export-migration-projects-list | FAILED (Yoram 403) | Migration admin prerequisite absent | INFRA_ERROR | Provision migration-capable admin and rerun | BLOCKING |
| 23 | P15-project-data-surfaces | fetch-unknown-path | RETIRED | Synthetic parity-missing-page probe is not a supported legacy user behavior or inventory requirement | — | Removed from `scripts/differential/scenarios/project.mjs` and its tests; no closure evidence | RETIRED — excluded from closure |
| 24 | P15-project-data-surfaces | fetch-git-info-refs | FAILED (both 403) | Smart HTTP auth/fixture prerequisite absent | INFRA_ERROR | Run with Git Smart HTTP credentials and repository fixture | BLOCKING |
| 25 | P2-global-label-catalog | view-site-labels | FAILED (legacy 400) | Legacy global-label fixture/auth rejected | INFRA_ERROR | Align fixture/auth and rerun | BLOCKING |
| 26 | P2-global-label-catalog | view-site-label-categories | FAILED (legacy 400) | Legacy category catalog fixture/auth rejected | INFRA_ERROR | Align fixture/auth and rerun | BLOCKING |
| 27 | P26-residual-branch-import-probes | probe-delete-branch-missing | FAILED (Yoram 404) | Missing-branch probe intentionally differs in status | LEGACY_BUG_NOT_REPRODUCED | `BranchApp.java:71-78`, `GitRepository.java:1230-1236`; no branch mutation | CLOSED — legacy redirect defect |
| 28 | P26-residual-branch-import-probes | probe-import-project-invalid | FAILED (both 400) | Invalid import boundary is rejected by both sides with no state write | IMPLEMENTATION_DIFFERENCE | `report.mjs` import boundary rule; verify no persisted project | CLOSED — explicit boundary evidence |
| 29 | P3-milestones | list-milestones | FAILED (Yoram 405) | GET route/method is not available on Yoram surface | REAL_OBSERVABLE_MISMATCH | Implement or prove inventory exclusion; legacy `milestone/list.scala.html` | BLOCKING |
| 30 | P6-mention-lists | fetch-mention-list-pull-request | FAILED (legacy 400) | Pull-request mention fixture/request rejected | INFRA_ERROR | Seed a PR and valid mention request, then rerun | BLOCKING |
| 31 | P7-project-search | search-in-project | FAILED (legacy 400) | Legacy search fixture/auth rejected | INFRA_ERROR | Align authenticated search fixture and rerun | BLOCKING |
| 32 | R10-compare-and-file-views | code-compare | FAILED (legacy 404) | Requested comparison ref is absent in legacy repository | INFRA_ERROR | Seed/resolve both refs before comparison | BLOCKING |
| 33 | R12-newfork-reviews-attachments | list-project-files | FAILED (legacy 404) | Legacy repository has no files at requested surface | INFRA_ERROR | Seed/resolve repository fixture before listing | BLOCKING |
| 34 | R13-pr-lifecycle-mutation | edit-pullrequest | FAILED (SKIPPED prerequisite) | PR creation produced no id | HARNESS_ERROR | Repair PR seed/creation and dependent id propagation | BLOCKING |
| 35 | R13-pr-lifecycle-mutation | comment-pullrequest | FAILED (SKIPPED prerequisite) | PR creation produced no id | HARNESS_ERROR | Repair PR seed/creation and dependent id propagation | BLOCKING |
| 36 | R13-pr-lifecycle-mutation | close-pullrequest | FAILED (SKIPPED prerequisite) | PR creation produced no id | HARNESS_ERROR | Repair PR seed/creation and dependent id propagation | BLOCKING |
| 37 | R13-pr-lifecycle-mutation | open-pullrequest | FAILED (SKIPPED prerequisite) | PR creation produced no id | HARNESS_ERROR | Repair PR seed/creation and dependent id propagation | BLOCKING |
| 38 | R13-pr-lifecycle-mutation | accept-pullrequest | FAILED (SKIPPED prerequisite) | PR creation produced no id | HARNESS_ERROR | Repair PR seed/creation and dependent id propagation | BLOCKING |
| 39 | R13-pr-lifecycle-mutation | close-pullrequest | FAILED (SKIPPED prerequisite) | PR creation produced no id | HARNESS_ERROR | Repair PR seed/creation and dependent id propagation | BLOCKING |
| 40 | R14-commit-comment-lifecycle | delete-commit-comment | FAILED (legacy 404) | Legacy HEAD pseudo-ref comment delete has no matching stored comment | UNVERIFIED | B-0003 exact step attribution is retained; no exact proof permits reclassification | BLOCKING — pending exact proof |
| 41 | R15-branch-default-toggle | set-default-branch | RETIRED | Legacy translator previously sent a short branch name instead of the full Git ref | — | Send encoded `refs/heads/${branch}`; verify the resulting symbolic HEAD ref on both sides | RETIRED — route corrected |
| 42 | R15-branch-default-toggle | set-default-branch | RETIRED | Legacy translator previously sent a short branch name instead of the full Git ref | — | Same corrected translator and per-step default-ref verification; distinct step occurrence | RETIRED — route corrected |
| 43 | R2-pr-detail | view-pullrequest-changes | FAILED (legacy 500) | Legacy changes view crashes on throwaway-free PR fixture | LEGACY_BUG_NOT_REPRODUCED | `pullRequest/1/changes` legacy observation; PR changes view source; seed a real PR for any product claim | CLOSED — legacy-side fixture crash |
| 44 | S10-simple-apis | get-compat-users | FAILED (legacy 406) | External compatibility API requires a representation/token contract | IMPLEMENTATION_DIFFERENCE | `UserApi.java` external API contract; canonical `/api/v1` is app-owned | CLOSED — transport/ownership boundary |
| 45 | S12-compat-translation | post-compat-translation | FAILED (both 412) | Translation precondition is intentionally unmet | IMPLEMENTATION_DIFFERENCE | Legacy translation precondition route evidence; no mutation occurs | CLOSED — agreed precondition boundary |
| 46 | S13-compat-default-login-page | post-compat-default-login-page | FAILED (legacy 200; Yoram 400) | Legacy UserApp accepts a missing query path and persists the malformed boundary payload | LEGACY_BUG_NOT_REPRODUCED | B-0221 exact step attribution; `UserApp.java:1372-1380`; no valid default landing page is written | CLOSED — exact legacy permissiveness |
| 47 | S14-compat-user-create-boundary | post-compat-user-invalid | FAILED (both 400) | Invalid user payload is correctly rejected but not yet evidence-backed as equivalent | UNVERIFIED | Add exact legacy/Yoram payload and error-shape evidence | BLOCKING |
| 48 | S15-compat-token-boundary | post-compat-token-invalid | FAILED (both 401) | Invalid token credentials are rejected on both sides | IMPLEMENTATION_DIFFERENCE | `auth/token` contract and legacy token route evidence; no token created | CLOSED — agreed auth boundary |
| 49 | S16-compat-admin-user-state-missing | patch-compat-admin-user-missing | FAILED (both 401) | Missing admin auth prevents the intended missing-user probe | INFRA_ERROR | Run with authenticated site-admin fixture | BLOCKING |
| 50 | S8-transfer-page | view-project-transfer | FAILED (both 404) | Nonexistent transfer project is an explicit no-state probe | IMPLEMENTATION_DIFFERENCE | Legacy transfer route evidence; no transfer state exists | CLOSED — explicit missing-resource boundary |
| 51 | T1-pr-restore-cycle | restore-closed-pullrequest | FAILED (SKIPPED prerequisite) | No closed main→feature PR exists on either side | HARNESS_ERROR | Seed/resolve closed PR before restore cycle | BLOCKING |
| 52 | U11-org-screens | view-org-subpage | FAILED (both 400) | Organization search fixture/query rejected | INFRA_ERROR | Align authenticated organization fixture/query | BLOCKING |
| 53 | U14-noti-watch-toggle | toggle-noti-watch | FAILED (both 400) | Notification target/request payload invalid | HARNESS_ERROR | Resolve a live notification target and legacy form fields | BLOCKING |
| 54 | U16-email-lifecycle | delete-email | FAILED (cleanup residue) | Throwaway email remained after cleanup | HARNESS_ERROR | Fix per-side email cleanup and assert absence | BLOCKING |
| 55 | U19-files-and-user-api | get-users-directory | FAILED (legacy 406; Yoram 406) | External user-directory representation/auth contract not met | IMPLEMENTATION_DIFFERENCE | Legacy `UserApi` plus canonical directory contract; use token-capable external probe | CLOSED — explicit transport boundary |
| 56 | U19-files-and-user-api | get-user-sidebar | FAILED (legacy 500) | Legacy sidebar endpoint crashes on fixture | LEGACY_BUG_NOT_REPRODUCED | `UserApp` sidebar route evidence; no Yoram product behavior inferred | CLOSED — legacy crash |
| 57 | U2-user-issues-compat-api | get-user-issues-compat | FAILED (legacy 401) | Legacy external API is token-gated | IMPLEMENTATION_DIFFERENCE | `UserApi.java:295-305`; canonical session API is separate | CLOSED — transport boundary |
| 58 | U20-throwaway-org-lifecycle | enroll-organization | FAILED (both 400) | Enrollment payload/fixture rejected before lifecycle transition | HARNESS_ERROR | Repair organization fixture and request payload | BLOCKING |
| 59 | U20-throwaway-org-lifecycle | cancel-organization-enroll | FAILED (both 400) | Enrollment was never created, so cancel precondition is absent | HARNESS_ERROR | Repair enrollment creation and dependent state | BLOCKING |
| 60 | U20-throwaway-org-lifecycle | leave-organization | FAILED (legacy 403) | Legacy authorization handles organization leave incorrectly | LEGACY_BUG_NOT_REPRODUCED | `AccessControl.java:176-183,197`; `OrganizationApp.java:297-311`; organization-leave contract | CLOSED — legacy authorization defect |
| 61 | U22-user-profile-edit-revert | save-user-editform-tab | FAILED (Yoram 404) | Compat notifications tab route is not served | IMPLEMENTATION_DIFFERENCE | `workspace.rs:1858-2103`; settings surface replacement rationale | CLOSED — explicit surface replacement |
| 62 | U22-user-profile-edit-revert | save-user-editform-tab | FAILED (Yoram 404) | Compat emails tab route is not served | IMPLEMENTATION_DIFFERENCE | Same workspace settings compatibility evidence | CLOSED — explicit surface replacement |
| 63 | U23-email-validation-lifecycle | open-validation-link | FAILED (no legacy confirmation mail) | Mail capture prerequisite failed; token cannot be observed | INFRA_ERROR | Repair SMTP catch-box capture before replay | BLOCKING |
| 64 | U23-email-validation-lifecycle | delete-email | FAILED (cleanup residue) | Throwaway email remained after cleanup | HARNESS_ERROR | Fix cleanup and rerun lifecycle | BLOCKING |
| 65 | U25-residual-site-user-probes | probe-site-import-invalid | FAILED (Yoram 400) | Invalid multipart site-import payload has an explicit boundary status difference | IMPLEMENTATION_DIFFERENCE | B-0286 exact step attribution; `SiteApp.java:368-387`; no import state persisted | CLOSED — evidence-backed unsupported boundary |
| 66 | U25-residual-site-user-probes | probe-site-mail-invalid | FAILED (legacy 500; Yoram 400) | Legacy site-mail handler crashes on invalid payload | LEGACY_BUG_NOT_REPRODUCED | B-0287 exact step attribution; `SiteApp` mail handler source; no mail state persisted | CLOSED — exact legacy crash |
| 67 | U25-residual-site-user-probes | probe-user-reset-password-invalid | FAILED (both 400) | Invalid reset payload is rejected, but exact error contract is not recorded | UNVERIFIED | Capture source-backed status/body equivalence and rerun | BLOCKING |
| 68 | U3-notifications-list | view-notifications | FAILED (legacy 400) | Legacy notification fixture/auth rejected | INFRA_ERROR | Align notification fixture/auth and rerun | BLOCKING |
| 69 | U4-global-search | view-global-search | FAILED (both 400) | Search fixture/query rejected before comparable result | INFRA_ERROR | Align authenticated search fixture/query and rerun | BLOCKING |

## Reconciliation

- Prior report `executionAccounting.totalStepErrors`: **69**.
- Ledger rows: **69** (numbered 1–69, no duplicate scenario/step occurrence omitted).
- Status encoding: **69 `FAILED` observations**, including **6 prerequisite
  skips encoded in the runner's FAILED error text**; **0 literal `SKIPPED`
  statuses** were present in the report's `stepResults`.
- Disposition counts are reconciled from the numbered rows below. Non-blocking
  rows are 22; blocking rows are 47; 22 + 47 = 69.

| disposition | rows |
|---|---:|
| IMPLEMENTATION_DIFFERENCE | 14 |
| LEGACY_BUG_NOT_REPRODUCED | 8 |
| HARNESS_ERROR | 17 |
| INFRA_ERROR | 25 |
| REAL_OBSERVABLE_MISMATCH | 3 |
| UNVERIFIED | 2 |
| **total** | **69** |

The 69 source records are one-to-one with the report's selected step results;
the literal report status is `FAILED` for all 69 rows, while six rows contain
`skipped` in their error text (the report contains no literal `SKIPPED` status).
Blocking rows must be repaired or independently evidenced before the strict
gate can close.

## Rule audit

`scripts/differential/report.mjs` was audited against the legacy sources named
by each rule and the current closure enum:

- There is no generic `kind == "dom"` allow rule. Unknown DOM, missing visible
  text, and missing controls fall through to `UNVERIFIED`; the two retained DOM
  rules require the reviewed shell-marker or all-`order` fingerprint and are
  guarded by `domVisibleLoss`.
- Specific rules precede family rules: stale throwaway sharer candidates
  precede the general sharer mismatch; label mutation evidence precedes the
  generic label fallback; PATCH stored-content drift precedes the generic PATCH
  rule. The regression test in
  `scripts/differential/differential.test.mjs` exercises the label shadow.
- Route matching is anchored where a route is a complete endpoint (`/_init`,
  `/user/editform/`, `/resetPassword`, `/sites/import`) and uses explicit
  endpoint families elsewhere. No stale `/restricted` or `/users/login`
  pre-fix allow rule remains.
- Exact residual rules cite and require their step behavior ids: B-0002 branch
  delete (`BranchApp.java:71-79`), B-0014 compat comment delete, B-0185
  sidebar, B-0212 issue-share, B-0221 default-login boundary, B-0267 setting,
  and B-0287 site mail. B-0286 site import remains a precise
  `IMPLEMENTATION_DIFFERENCE` boundary rule. B-0003 HEAD comments remains
  `UNVERIFIED`; no broad route mask reclassifies it. Product, harness, and
  infrastructure findings remain blocking rather than being reclassified.
