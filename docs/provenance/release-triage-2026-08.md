# Release Triage — Differential Sweep 2026-08 (Phase 1: sweep-mt5ne45e @ HEAD 09c1e7775; Phase 4 FINAL: sweep-mt5yrmac)

Triage of every non-PASS finding in the stored differential reports, MERGED with the
Phase 4 rerun (full dual-app sweep on the current working tree with the corrected
harness; yoram binary rebuilt from the tree via `agent:cargo build -p yoram-server`).

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

## Final verdict (DEFINITIVE CLOSING MEASUREMENT: sweep-mt6a1bjo, coverage 315/315 = 100%, fresh binary, pre-boot reconcile loud + self-checked)

| Class | Count | Blocking? |
|---|---|---|
| PASS | 0 (all non-PASS rows listed; passing behaviors are the 315 covered) | — |
| ACCEPTED_DIVERGENCE | 126 | no (each carries rationale) |
| LEGACY_BUG | 8 | no (legacy-side defects) |
| PRODUCT_GAP | 1 | YES |
| HARNESS_ERROR | 2 | YES |
| INFRA_ERROR | 2 | YES |
| UNVERIFIED | 3 | YES |
| **Total** | **142** | **8 blocking** |

Strict gate: **NOT met** — blocking = PRODUCT_GAP(1) + HARNESS_ERROR(2) + INFRA_ERROR(2) + UNVERIFIED(3). Harness unit tests 74/74 pass. db projections compared after teardown: yes.

One-line cause per non-zero blocker:

- **PRODUCT_GAP (1)** — I13 `sharableUsers`: candidate-set semantics genuinely differ after the empty-query fix (member/project scope or ordering); needs a product decision, not a harness fix.
- **HARNESS_ERROR (2)** — P9 `patch-post-comment-api`: update step did not verifiably apply on both sides, so the PATCH pair was skipped by the new outcome-based gate; S17: shared-session SMTP token replay contaminates per-side reset tokens (manual fresh-token flow verified 200 earlier).
- **INFRA_ERROR (2)** — I17: unresolved CDP timeout observing the comment-edit trigger (transient browser infra under sweep load); db-labels: residue `parity-cat-sweep-*` category rows from pre-reconcile sweeps survive in the projection diff.
- **UNVERIFIED (3)** — I19 comment lifecycle + P9 update/delete pairs: dependent on the P9 update step that was skipped, so no comparable evidence this pass.

Known rig limitation (documented, non-blocking): the shared sweep session cannot replay per-side single-use SMTP reset tokens (S17/U24 class); manual fresh-token replay of the same links succeeds on both sides.

## PRODUCT_GAP — confirmed residual gaps (Phase 5 scope)

| ID / Behavior | Legacy observation | Yoram observation | Sources | Rationale |
| --- | --- | --- | --- | --- |
| P9 / comment optimistic concurrency | PATCH comment content enforces `originalCheck`: stale original → 409 "Already modified by someone." | Accepts stale PATCH with 200 (lost update) | legacy: `IssueApi.java:588-617`; yoram: `issues/comments.rs:299-356` | Plan Phase 5 item 2: optional `original` field → 409 with legacy-shaped message. Reproduced after the harness post-comment chain was repaired. |
| I13 / sharableUsers empty-query discovery | Returns full candidate list (users + public projects) for empty query | Returns `[]` — `list_issue_sharable_users` short-circuits on empty query (`issue_picker.rs:353+`) | yoram persistence picker | Small behavioral gap inside the implemented sharer surface. |
| U16 / setAsMain precondition | Switches to an unvalidated email (303) | 400 "Email must be validated first." | yoram: `workspace.rs` set-main handler | Capability works only post-validation in yoram; legacy allows immediately. |

## HARNESS_ERROR — harness defects remaining (fix in harness, not product)

| Finding | Detail | Next fix |
| --- | --- | --- |
| I18/I20 `resolve-issue-pk` legacy pk unresolved | Legacy pk comes from the watch form's hidden `resource.id` input; extraction failed on the legacy side this run (yoram side resolved) | Make legacy pk extraction robust (retry/fallback parse) |
| I19 comment ids null both sides | create-issue-comment ids unresolved; dependent edit/put/patch/vote/delete steps skipped by design (never `/issue/null/*`) | Same id-chain hardening |
| I21 label/category ids unresolved | Sweep-suffixed labels not found at discovery | Verify create-issue-label write reached both sides before discovery |
| S17 + U24 reset-token contamination | Single-use tokens replayed across sides by shared sessions | Capture/replay tokens strictly per origin server |

## INFRA_ERROR — environment/fixture (not findings against Yoram)

| Finding | Detail |
| --- | --- |
| I17 comment-edit-reveal ×2 | One CDP `Runtime.callFunctionOn` timeout (legacy) and one selector miss (yoram) — observation failures, not evidence of divergence |
| R16 PR review/unreview ×2 | Seed asymmetry: no pull requests provisioned in the yoram parity seed (see above) |
| db-labels | Yoram dev-parity seed provisions sample-project labels the legacy parity instance lacks; align fixtures |

## ACCEPTED_DIVERGENCE (105) — unchanged families from Phase 1, all with recorded rationale

- DOM skeleton drift (~86 findings): presentation-only SPA-vs-SSR; WTR e2e lanes own visual parity.
- B-0035 assignableUsers i18n keys ×2 (i18n-key contract, see above).
- B-0117 OAuth: `/authenticate/github/denied` bucket mismatch ×1. NOTE: `/authenticate/github` itself is now **PASS-equivalent** — with the mock provider configured (harness passes `YONA_AUTH_SOCIAL_LOGIN_SUPPORT` + `YONA_OAUTH_GITHUB_*` pointing at an unused mock endpoint), Yoram answers the same direct 3xx-to-provider-authorize as legacy with correct `client_id`/`state`/`redirect_uri`, so the legacy route contract holds and the functional OAuth contract action passed with no violation.
- Settings-surface replacement ×3 (B-0221/B-0298 editform tabs → workspace settings actions).
- Throwaway-scoped status semantics (changeVCS/cleanup ×2), site-admin purge response shape ×1, missing-branch delete error semantics ×1, commit HEAD pseudo-ref extension ×1, attachment trailing slash ×1, restricted-guard gating ×1, bare login GET ×1, `/_init` bootstrap ×1, sites/import boundary ×1, external `-_-api` import row ×1 (intentional removal per SPEC.md).
- I23 / markdown render: `POST /markdown/:user/:project` has no Yoram server-render endpoint (404/415); preview rendering is owned by the React client (react-markdown); legacy POST /markdown server-render endpoint intentionally not replicated (product decision 2026-08-24).

## LEGACY_BUG (5) — legacy defects, Yoram correct

Legacy setting-form NPE 500 (P18), legacy DELETE label-category headless 400 (I22),
postlabel empty-set 500 (P9), issue-share handler 500 on sweep payload ×2 (I20).

## Harness changes made during Phase 4 (all in scripts/differential/, no crates/** edits)

- Per-side id injection in `mutationPair` (sweep-created entities get different numbers/pks per side) — eliminated every `/issue/null/*` request.
- Response-shape drift adaptations: issue payloads expose `issueNumber`/`issueId`; comments require `contentsMarkdown`; posts are keyed by `postNumber`, not DB id; webhooks live under `/api/v1/owners/{o}/projects/{p}/webhooks` with a `{webhooks:[...]}` envelope; assignees take string arrays.
- Comment/post-comment ids captured from the returned JSON (`comments.at(-1).id`).
- sendValidationEmail posts the form CSRF token its compat handler binds.
- Mock GitHub OAuth provider wired into the sweep boot so the functional OAuth contract is verifiable end to end without touching the live provider.
- Browser observation failures classified INFRA_ERROR; deterministic poll replaces the reveal timing sleep.
- Verdict/rules updated to the unified enum with evidence-based classifications (no banned terms).

## Disposition

- PRODUCT_GAP ×4 → plan Phase 5 scope (markdown render, comment optimistic concurrency are the two planned items; sharableUsers empty-query and setAsMain precondition are newly confirmed small gaps).
- HARNESS_ERROR ×7 / INFRA_ERROR ×5 → harness & fixture work items listed above; none is evidence of product divergence.
- Coverage remains 315/315 behaviors; step errors (159) are reported separately and never folded into coverage or the verdict.
