# Release Triage — Differential Sweep 2026-08 (baseline: 189ec2479; report: sweep-mt6npd2a)

Triage of every non-PASS finding in the current differential artifact. The
artifact is a full dual-app sweep with the corrected harness; the Yoram binary
was rebuilt from the differential baseline before the run. The current tree adds
only unused frontend-code cleanup, documentation/provenance updates,
verification-contract maintenance, and release build fixes after that behavioral
sweep; no differential behavior was changed.

One unified classification enum is used everywhere (this triage AND the harness in
`scripts/differential/report.mjs` / `verdict.mjs`):

```
PASS | PRODUCT_GAP | ACCEPTED_DIVERGENCE | LEGACY_BUG | HARNESS_ERROR | INFRA_ERROR | UNVERIFIED
```

Legacy-term mapping applied: `REAL_PRODUCT_GAP`→PRODUCT_GAP, `HARNESS_BUG`→HARNESS_ERROR,
`FIXED_ON_CURRENT_HEAD`→PASS (only where the rerun CONFIRMS fixed behavior),
`PRESENTATION_ONLY_DIFFERENCE`→ACCEPTED_DIVERGENCE (subtype: presentation-only).
"known-gap" and every other non-enum name is banned. The harness rules in report.mjs
mirror these classifications one-to-one.

## Final verdict (current report `sweep-mt6npd2a`, 2026-08-24, coverage 315/315 = 100%)

| Class | Count | Blocking? |
|---|---:|---|
| PASS | 0 (all non-PASS rows listed; passing behaviors are the 315 covered) | — |
| ACCEPTED_DIVERGENCE | 127 | no (each carries rationale) |
| LEGACY_BUG | 8 | no (legacy-side defects) |
| PRODUCT_GAP | 1 | YES |
| HARNESS_ERROR | 0 | no |
| INFRA_ERROR | 0 | no |
| UNVERIFIED | 0 | no |
| **Total** | **136** | **1 blocking** |

Strict gate: **NOT met** — the only blocking finding is PRODUCT_GAP(1).
The report has no HARNESS_ERROR, INFRA_ERROR, or UNVERIFIED classifications;
database projections were compared after teardown. Step errors are reported
separately and are not findings or coverage failures.

## PRODUCT_GAP — current residual requiring a human decision

| ID / Behavior | Legacy observation | Yoram observation | Sources | Disposition |
| --- | --- | --- | --- | --- |
| I13 / B-0039 `sharableUsers` empty-query candidate set | Active users and public projects are returned; legacy `IssueApi.java:828-850` has no explicit ordering. | The same user/public-project filters are implemented in `crates/persistence/src/repo/issue_picker.rs:353-409`, and empty-query contract coverage is in `crates/server/tests/issue_sharer_contract.rs:269-357`. The differential pair differs in persisted users, project catalog, avatar URLs, and observed ordering. | `.agent/differential/report.json` (`sweep-mt6npd2a`), legacy `IssueApi.java:828-850`, the source/test paths above | **Human decision:** align the parity fixtures/catalog, or explicitly approve the observed fixture-dependent difference. Do not change candidate filtering without this decision. See `human-verification-2026-08.md`. |

## Closed findings at current HEAD

- P9 comment optimistic concurrency now rejects a stale `original` with
  `409 {message, storedContent}`; focused coverage:
  `crates/server/tests/issue_core_contract.rs:2615-2733` and
  `crates/server/tests/rest_contract.rs:2515-2525`.
- U16 `setAsMain` now allows an unvalidated address like legacy; focused
  coverage: `crates/server/tests/auth_workspace_contract.rs:3940-4000`.
- I23 markdown preview is intentionally client-owned by `react-markdown`;
  the absent legacy server-render endpoint is an accepted divergence, not a
  product gap.
- The prior P9/I19 harness chain, SMTP token replay, CDP observation, PR seed,
  and label-residue findings do not appear in the current report's
  classification counts. Their old entries were stale triage, not open work.

Known environment-dependent follow-ups remain outside the strict differential
gate. They are listed for a human in `docs/provenance/human-verification-2026-08.md`.

## ACCEPTED_DIVERGENCE (127)

- DOM skeleton drift: presentation-only legacy SSR vs React SPA structure;
  user-visible parity remains owned by WTR lanes.
- B-0035 assignable-user i18n keys: Yoram returns stable keys and the React
  client localizes them.
- B-0117 OAuth denied route shape, settings-surface replacement, restricted
  guard, auth-shell, `/_init`, attachment trailing slash, HEAD pseudo-ref,
  site-import boundary, throwaway mutation status, and migrator-owned
  `-_-api/v1` export/import rows retain their documented rationales.
- I23 markdown preview is intentionally client-owned by `react-markdown`;
  the missing legacy server-render endpoint is not a product gap.

## LEGACY_BUG (8)

The current report records only legacy-side defects: setting-form NPE,
label-category DELETE 400, empty postlabel 500, issue-share 500 (two rows),
comment-delete 500, and setAsDefault 500 (two rows). These are not Yoram
release blockers.

## Current sweep notes

- `sweep-mt6npd2a` covers all 315 behavior IDs.
- The report records 108 step errors separately; they do not become findings
  or reduce coverage.
- Harness unit tests and report classification integrity remain separate
  checks; the current report has no HARNESS_ERROR, INFRA_ERROR, or UNVERIFIED
  rows.
- The only unresolved decision is B-0039/I13 candidate-set comparison. It is
  documented in `human-verification-2026-08.md`.

## Disposition

- PRODUCT_GAP ×1: hold for the human fixture/catalog decision in
  `human-verification-2026-08.md`; no ungrounded product patch was applied.
- ACCEPTED_DIVERGENCE ×127 and LEGACY_BUG ×8: non-blocking with rationale.
- Coverage is 315/315; the strict differential gate remains blocked only by
  B-0039/I13.
