# Final Parity Acceptance Package (2026-09-03)

> **SUPERSEDED / INVALIDATED (Phase G, 2026-09-04):** This historical
> `40e1bb42c` package is invalidated by the corrective plan and MUST NOT be
> treated as acceptance or release evidence. Preserve this document for
> provenance only. The replacement machine-readable package will live at
> `.agent/differential/final-corrected-20260904/acceptance-package.json`.

Status: historical closure evidence for human review. This package records the final
same-HEAD differential state for the fix plan
`/tmp/yoram/yoram-parity-closure-fix-plan.md`. `yona-bun-temp` itself is NOT
a release repository: per `AGENTS.md`, repository migration and the first
release happen only after human acceptance, in a new canonical repository.

## 1. Final candidate HEAD

- Commit: `40e1bb42c453b63df8c2f326b5520f481fef6e49` (worktree clean at run
  start; no source changes after the sweep).
- Final full differential sweep: exactly one run,
  `.agent/differential/final-sweep-40e1bb42c/report.json`
  (`runId=sweep-mtm43abc`, started `2026-09-03T22:43:45.528Z`, finished
  `2026-09-03T22:57:24.974Z`, wall ~13.7 min).
- Artifact SHA-256:
  `c2c909863b7e9a01fc06e30aac9bbf2fd772c563fa882f0dc7f1810f63b09513`.
- Scenario accounting: registered 117, attempted 117, 0 scenario-level
  failures. Behavior accounting: 315/315 behavior IDs covered.
- DB projections (issues/comments/labels) compared after teardown on both
  sides; no projection violations.
- Global infra errors: 0. Residual step errors: 69 across 41 scenarios
  (recorded per scenario; each is a one-side strict-handler failure or a
  legacy-side degenerate response, none produced a violation row).

## 2. Final differential state (strict closure contract)

| classification | rows | gate |
| --- | ---: | --- |
| `REAL_OBSERVABLE_MISMATCH` | 0 | required 0 — met |
| `UNVERIFIED` | 0 | required 0 — met |
| `HARNESS_ERROR` | 0 | required 0 — met |
| `INFRA_ERROR` | 0 | required 0 — met |
| `IMPLEMENTATION_DIFFERENCE` | 121 | every row carries a reason; DOM rows are SSR/SPA skeleton structure whose visible surface is owned by the focused WTR suites (`frontend/tests/wtr/*.e2e.ts`) and the frozen visual baseline (`docs/provenance/frontend-visual-parity-baseline-2026-07-11.md`); API rows are intentional `-_-api/v1` migrator-scope or ownership boundaries with per-rule rationale |
| `LEGACY_BUG_NOT_REPRODUCED` | 9 | every row carries exact legacy source evidence (see `docs/provenance/parity-reclassification-2026-09.md` §3 and `report.mjs` classification rules) |

The 9 legacy-bug rows: B-0002 (missing-branch delete redirect), B-0003 (HEAD
pseudo-ref comments), B-0221 (`defultLoginPage` permissive 200), B-0159
(`/sites/import` redirect-on-missing-file), the legacy issue-share 500, the
legacy postlabel 500, the legacy DELETE label-category 400, the legacy
setting-form NPE on headless payloads (P18), and the org-leave authorization
defect (B-0016 family; blocks a member in a single-admin org while letting
the last admin leave — `AccessControl.java:176-183,197`,
`OrganizationApp.java:297-311`).

## 3. Defects fixed in this closure effort (focused tests + focused reruns)

1. Root/base-path flash cookies: both emitters (`/authenticate/:provider/denied`,
   `/restricted`) normalize the cookie path via `normalize_base_path`
   (empty/root → `/`); contract tests cover `/`, `/yona`, `/team/yoram`.
2. Migration `withWikiCommit` parsing now matches legacy exactly
   (`isNotBlank(v) && v.endsWith("true")` on the raw value);
   `MigrationApp.java:345-346`.
3. Migration link/attachment encoding verified legacy-exact (`#`→`%23` only;
   raw text injected into wiki commit paths) with regression tests; the
   legacy non-wiki attachment `//files/{id}` protocol-relative URL is
   documented `LEGACY_BUG_NOT_REPRODUCED`.
4. Legacy parity fixture: H2 `role` rows 1–7 seeded (fixes P13/P18 member
   lifecycle); `weblabs` organization mirrored onto the Yoram side (fixes
   U12 org favorite).
5. Harness evidence quality: SPA hover anchor polling (S6/B-0091), stable
   skeleton captures, `data-issue-id` row-id resolution for favorite
   toggles, settings-form organization id resolver, self-resolving
   delete-org-member, canonical project read path, PR state endpoint
   special-case.
6. Product fix from reclassification: `GET /users/login` deep link now
   serves the login page shell (was a POST-only 405);
   `users_login_deep_link_serves_login_page_shell` contract test.

All closures were verified by focused reruns
(`.agent/differential/focused-phase-c`, `focused-phase-d`,
`focused-phase-d2`) before the single final sweep.

## 4. Real environment / integration checks

Executed locally: SVN client pair (real `svn` checkout/commit), Git Smart
HTTP pair (real `git` clone/push), SMTP catch-box email flows, OAuth
authorization round trips against local provider fixtures, context paths
`/` + `/yona` + `/team/yoram`, filesystem/upload and throwaway repo
identity lanes with residue checks.

Operator prerequisites (not convertible into accepted parity; require
credentials/services outside this environment): real GitHub/Google OAuth
round trips, external LDAP directory, external migration destination,
external SMTP relay, existing Yona MariaDB adoption + supported DB matrix,
existing SVN repository identity, Linux deployment, Windows MSVC binary.
Details: `docs/provenance/parity-reclassification-2026-09.md` §6.

## 5. Evidence documents

- Reclassification ledger and arbitration evidence:
  `docs/provenance/parity-reclassification-2026-09.md`
- Prior classification ledger (§4) and sweep history:
  `docs/provenance/differential-behavior-coverage-excluded.md`
- Visual parity baseline: `docs/provenance/frontend-visual-parity-baseline-2026-07-11.md`
- Core parity audit (WTR/route ownership): `docs/provenance/core-parity-audit.md`

## 6. Acceptance statement

On the evidence above, the differential sweep at frozen HEAD `40e1bb42c`
records zero `REAL_OBSERVABLE_MISMATCH`, zero `UNVERIFIED`, zero
`HARNESS_ERROR`, zero `INFRA_ERROR`, and 315/315 behavior coverage with 117/
117 scenarios attempted; every remaining row is an evidence-backed
`IMPLEMENTATION_DIFFERENCE` or `LEGACY_BUG_NOT_REPRODUCED`. Sweep-level
coverage counts are discovery evidence, not a coverage KPI. Desktop/mobile
visual parity is enforced by the WTR suites and the frozen visual baseline
referenced above. Human acceptance of this package is the gate for
repository migration and any future release work in the new canonical
repository; `yona-bun-temp` must not produce a release.
