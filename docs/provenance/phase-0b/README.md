# Phase 0B Provenance Home

This directory is the feature-level provenance home for Phase 0B core completion and the Phase 1 Org/Project CRU kickoff.

Canonical execution rules still live in [`SPEC.md`](/G:/programming/yona/SPEC.md). [`docs/agents/10-legacy-provenance-baseline.md`](/G:/programming/yona/docs/agents/10-legacy-provenance-baseline.md) remains the mirror summary. The files here hold the deeper feature traces used by Red to Green implementation work.

## Contents

- [`legacy-test-inventory.md`](/G:/programming/yona/docs/provenance/phase-0b/legacy-test-inventory.md): scan of `yona-original/test/**` grouped by capability, target layer, owner package, and current migration status.
- [`organization.md`](/G:/programming/yona/docs/provenance/phase-0b/organization.md): organization create/read/update provenance and deviations.
- [`project.md`](/G:/programming/yona/docs/provenance/phase-0b/project.md): project create/read/update, visibility, and recent-visit provenance.
- [`issue.md`](/G:/programming/yona/docs/provenance/phase-0b/issue.md): first issue edit-authorization exemplar only.
- [`pull-request-review.md`](/G:/programming/yona/docs/provenance/phase-0b/pull-request-review.md): bounded same-project PR merge/review entry slice for open/close/reopen, PR-bound review write/list/filter, and merge preview/execute provenance.
- [`search.md`](/G:/programming/yona/docs/provenance/phase-0b/search.md): bounded internal search exemplar for `global`, `organization`, and `project` scopes, with API-level parity only.
- [`fixture-strategy.md`](/G:/programming/yona/docs/provenance/phase-0b/fixture-strategy.md): canonical TS fixture names and factory mapping from `conf/test-data.yml`.

## Batch Boundary

- This batch does not claim full Phase 0B exit.
- This batch closes Phase 0B core provenance and traceability for Org/Project, then starts Phase 1 with a thin Org/Project CRU + visibility slice.
- This batch also refreshes stale blocker wording after the bounded PR provenance exemplar and the bounded search provenance exemplar landed, while keeping the remaining blocker boundary explicit.
- Evidence-backed landed slices already present in the repo:
  - project enrollment request/cancel is implemented in `packages/domain/src/enrollment-service.ts`, covered by `packages/domain/src/enrollment-service.spec.ts` and `apps/app/src/lib/enrollment-trpc.spec.ts`
  - organization enrollment request/cancel is implemented through `packages/domain/src/enrollment-service.ts`, `packages/domain/src/enrollment-service.spec.ts`, and `apps/app/src/lib/enrollment-trpc.spec.ts`
  - workspace favorite/recent is implemented through `packages/domain/src/user-workspace-service.ts`, `packages/db/src/personal-workspace.spec.ts`, `apps/app/src/lib/me-trpc.spec.ts`, and `apps/app/src/routes/me.tsx`
  - workspace default landing is implemented through `packages/domain/src/default-landing.ts`, `packages/domain/src/default-landing.spec.ts`, `packages/auth/src/app-service.ts`, and `apps/app/src/routes/_app.index.tsx`
- remaining true blockers kept out of scope here:
  - org/project delete
  - organization enrollment request/cancel
  - workspace default landing page implementation, while favorite/recent are already implemented
- Full PR/review parity remains Phase 4 work, because `SPEC.md:1297` still includes cross-project or fork merge behavior, reviewer rules, stale-thread meaning, richer review lifecycle, source-branch cleanup, and full PR detail composition beyond the bounded same-project entry slice.
- Full internal search parity remains Phase 5 work, because `SPEC.md:1359` includes the broader multi-type search surface, type-specific coverage, and three-dialect field/filter parity that are intentionally larger than the bounded Phase 0B exemplar.
- AI-facing search surfaces remain Phase 6 hardening work, not a Phase 0B or Phase 5 exit condition.

## Explicit Deferred Items

- PR items deferred to Phase 4: cross-project or fork merge acceptance, reviewer threshold and assignment lifecycle, review comment edit flows, stale-thread meaning, full PR detail or diff composition, source-branch cleanup or restore, fork or clone workflow, and PR event timeline translation. Each is deferred because the current Phase 0B batch freezes only a bounded same-project merge/review entry slice.
- Search items deferred to Phase 5: `issue_comment`, `posting_comment`, and `milestone` result types, broader review-search-condition behavior beyond internal `review_comment` results, type-specific result counts, and full three-dialect searchable-field coverage for the complete internal type set. Each is deferred because the current Phase 0B batch freezes only the minimal internal exemplar over `user`, `project`, `issue`, `posting`, and `review_comment`.
- Search items deferred to Phase 6: `llms.txt`, AI datasource endpoints, and other AI-facing or machine-facing search routes. They are deferred because `AGENTS.md` reserves those surfaces for hardening rather than Phase 0B blocker reconciliation.

- This directory keeps the wording bounded: it still does not claim full Phase 0B exit, but the previously stale org-enrollment/default-landing blocker pair is now implemented while org/project delete remains separately deferred.
