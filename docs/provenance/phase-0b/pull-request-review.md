# Pull Request and Review Provenance

## Scope

- Bounded Phase 0B exemplar only
- Open, close, and reopen authorization semantics only
- Read-only review-thread list and filter semantics only
- This file does not claim full pull-request or review parity

## Legacy Sources

- `yona-original/test/controllers/PullRequestAppTest.java`
- `yona-original/test/controllers/ReviewThreadAppTest.java`
- `yona-original/test/models/PullRequestTest.java`
- `yona-original/test/models/PullRequestEventTest.java`
- `yona-original/test/models/ReviewCommentTest.java`
- `yona-original/test/models/support/ReviewSearchConditionTest.java`

## Exemplar Boundary

- `SPEC.md:1338` assigns review list and filter ownership to `13.7`.
- `SPEC.md:1341` keeps generic commit comment and thread creation lifecycle ownership in `13.6`.
- This provenance freeze therefore covers PR-facing composition only: open/close/reopen authorization plus review-thread read and filter semantics.
- Generic commit-thread lifecycle, write-side thread mutation, and non-PR repository discussion behavior stay outside this document.
- This bounded exemplar exists to reconcile the remaining Phase 0B blocker boundary. It is not a claim that Phase 4 PR or review parity is complete.

## Extracted Intent

| Legacy source                                                                                                                                     | Intent                                                                                                                                       | Modern translation target                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `PullRequestAppTest.testCloseAnonymous` and `PullRequestAppTest.testOpenAnonymous`                                                                | anonymous open/close attempts redirect instead of mutating state                                                                             | `apps/app` thin route or `serverFunction` auth gate over app-facing PR mutation                                                         |
| `PullRequestAppTest.testCloseNotExistProject` and `PullRequestAppTest.testCloseNotExistPullRequest`                                               | close rejects missing project with forbidden and missing pull request with not found                                                         | `apps/app` adapter error mapping backed by domain lookup result                                                                         |
| `PullRequestAppTest.testClosePullRequest` and `PullRequestAppTest.testClosePullRequestNotAllow`                                                   | authorized actors can close; unauthorized actors are forbidden and the PR remains open                                                       | `packages/domain` transition policy plus `apps/app` mutation adapter                                                                    |
| `PullRequestAppTest.testOpenPullRequest`, `PullRequestAppTest.testOpenPullRequestBadRequest`, and `PullRequestAppTest.testOpenRoute`              | authorized reopen succeeds, already-open reopen is bad request, and route-level reopen keeps the same outcome                                | `packages/domain` transition policy, `packages/contracts` mutation result shape, and `apps/app` adapter parity                          |
| `PullRequestTest.testReviewPoint` and `PullRequestTest.testReviewer`                                                                              | reviewer count and reviewer lifecycle exist in legacy, but they are broader than this exemplar                                               | cited provenance only, explicitly deferred to Phase 4                                                                                   |
| `PullRequestTest.getWatchers_*`                                                                                                                   | watcher projection exists around PR participation and project watching, but it is not part of this bounded exemplar                          | cited provenance only, explicitly deferred to later PR parity work                                                                      |
| `PullRequestEventTest.getPullRequestCommits`                                                                                                      | PR event history preserves commit ordering within PR activity                                                                                | cited provenance for later event timeline translation, not a Phase 0B implementation target                                             |
| `ReviewThreadAppTest.projectNotFound` and `ReviewThreadAppTest.projectForbidden`                                                                  | review-thread listing respects project existence and project visibility before returning data                                                | `apps/app` PR review-thread query loader or tRPC query auth gate                                                                        |
| `ReviewSearchConditionTest.filterForComment`, `filterForCommitId`, `filterForPath`, `filterForAll`, `searchingAuthor`, and `searchingParticipant` | review-thread list/filter semantics cover text, commit id, file path, author, participant, and thread state filtering                        | `packages/contracts` review-thread query contract, `packages/domain` review-thread query service, and `apps/app` PR review list adapter |
| `ReviewCommentTest.findByThread`, `saveReviewComment`, `deleteReviewComment`, `deleteLastReviewComment`, and edit/delete permission tests         | review comments and thread mutation permissions define the broader review lifecycle, but write-side lifecycle is outside this bounded freeze | cited provenance only, thread and comment lifecycle remain owned by `13.6` or deferred Phase 4 work depending on capability             |

## Translation Layers For This Exemplar

- `packages/contracts`: typed query and mutation inputs for PR transition requests and review-thread filter parameters, without committing to full PR surface coverage.
- `packages/domain`: the bounded PR transition policy for open/close/reopen authorization plus a PR-facing review-thread query service that preserves list and filter semantics.
- `apps/app`: app-facing `tRPC` procedures and thin `serverFunction` or route adapters that map legacy auth and error outcomes without re-owning generic thread lifecycle.

## Explicit Phase 4 Deferrals

- Merge acceptance and merge conflict flow, deferred because the Phase 0B exemplar freezes only open/close/reopen authorization outcomes.
- Fork flow and clone workflow, deferred because the Phase 0B exemplar does not exercise branch-source provenance or repository-copy setup.
- Reviewer threshold and reviewer assignment lifecycle, deferred because the Phase 0B exemplar cites reviewer provenance but does not implement reviewer-state rules.
- Full review lifecycle, including comment creation, edit, delete, stale-thread meaning, and broader reviewer state changes, deferred because write-side review behavior is broader than read-only review-thread list and filter semantics.
- Diff composition, source-branch cleanup, and full PR detail composition, deferred because the Phase 0B exemplar does not cover the full PR detail page contract.
- PR event timeline translation, deferred because `PullRequestEventTest` evidence exists but the current exemplar does not freeze event-history rendering or delivery.

## Batch Boundary Rule

- Phase 0B uses this document only to freeze the bounded PR exemplar that was required for blocker reconciliation and is now landed.
- Full PR/review parity remains Phase 4 work under `SPEC.md:1297`, even after this provenance freeze lands.
- Generic commit comment and thread lifecycle remain owned by `13.6`, so they must not be relabeled as deferred PR parity work here.

## Out Of Scope

- Full pull-request parity
- Merge
- Fork flow
- Reviewer threshold
- Reviewer assignment UI
- Diff composition
- PR event timeline composition
- Generic commit-thread lifecycle from `13.6`
