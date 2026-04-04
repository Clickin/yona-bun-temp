# Pull Request and Review Provenance

## Scope

- Bounded Phase 0B exemplar only
- Same-project PR open, close, reopen, and merge-entry semantics only
- PR-bound review-thread list/filter plus review comment write and thread close/reopen semantics only
- Merge preview and merge execution stay limited to same-project branch PRs
- This file does not claim full pull-request or review parity

## Legacy Sources

- `yona-original/test/controllers/PullRequestAppTest.java`
- `yona-original/test/controllers/ReviewThreadAppTest.java`
- `yona-original/test/models/CommentThreadTest.java`
- `yona-original/test/models/PullRequestTest.java`
- `yona-original/test/models/PullRequestEventTest.java`
- `yona-original/test/models/ReviewCommentTest.java`
- `yona-original/test/models/support/ReviewSearchConditionTest.java`

## Exemplar Boundary

- `SPEC.md:1338` assigns review list and filter ownership to `13.7`.
- `SPEC.md:1341` keeps generic commit comment and thread creation lifecycle ownership in `13.6`.
- This provenance freeze therefore covers a bounded same-project PR entry slice: open/close/reopen authorization, PR-bound review-thread read/filter, PR-bound review comment create/delete, PR-bound thread close/reopen, and dedicated merge preview/execute flows.
- Generic commit-thread lifecycle and non-PR repository discussion behavior stay outside this document, even when the close/reopen permission lattice is shared with `CommentThreadTest`.
- This bounded exemplar exists to reconcile the remaining Phase 0B blocker boundary. It is not a claim that Phase 4 PR or review parity is complete.

## Extracted Intent

| Legacy source                                                                                                                                     | Intent                                                                                                                                       | Modern translation target                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `PullRequestAppTest.testCloseAnonymous` and `PullRequestAppTest.testOpenAnonymous`                                                                | anonymous open/close attempts redirect instead of mutating state                                                                             | `apps/app` thin route or `serverFunction` auth gate over app-facing PR mutation                                                         |
| `PullRequestAppTest.testCloseNotExistProject` and `PullRequestAppTest.testCloseNotExistPullRequest`                                               | close rejects missing project with forbidden and missing pull request with not found                                                         | `apps/app` adapter error mapping backed by domain lookup result                                                                         |
| `PullRequestAppTest.testClosePullRequest` and `PullRequestAppTest.testClosePullRequestNotAllow`                                                   | authorized actors can close; unauthorized actors are forbidden and the PR remains open                                                       | `packages/domain` transition policy plus `apps/app` mutation adapter                                                                    |
| `PullRequestAppTest.testOpenPullRequest`, `PullRequestAppTest.testOpenPullRequestBadRequest`, and `PullRequestAppTest.testOpenRoute`              | authorized reopen succeeds, already-open reopen is bad request, and route-level reopen keeps the same outcome                                | `packages/domain` transition policy, `packages/contracts` mutation result shape, and `apps/app` adapter parity                          |
| `PullRequestAppTest.testAcceptAnonymous` and `PullRequestTest.initRepositories`                                                                    | anonymous merge attempts still redirect, while same-project merge preview can report clean or conflicted outcomes before mutation            | `apps/app` merge auth gate, `packages/domain` merge preview orchestration, `packages/contracts` merge result shape, and `packages/vcs` |
| `PullRequestTest.testReviewPoint` and `PullRequestTest.testReviewer`                                                                              | reviewer count and reviewer lifecycle exist in legacy, but they are broader than this exemplar                                               | cited provenance only, explicitly deferred to Phase 4                                                                                   |
| `PullRequestTest.getWatchers_*`                                                                                                                   | watcher projection exists around PR participation and project watching, but it is not part of this bounded exemplar                          | cited provenance only, explicitly deferred to later PR parity work                                                                      |
| `PullRequestEventTest.getPullRequestCommits`                                                                                                      | PR event history preserves commit ordering within PR activity                                                                                | cited provenance for later event timeline translation, not a Phase 0B implementation target                                             |
| `ReviewThreadAppTest.projectNotFound` and `ReviewThreadAppTest.projectForbidden`                                                                  | review-thread listing respects project existence and project visibility before returning data                                                | `apps/app` PR review-thread query loader or tRPC query auth gate                                                                        |
| `ReviewSearchConditionTest.filterForComment`, `filterForCommitId`, `filterForPath`, `filterForAll`, `searchingAuthor`, and `searchingParticipant` | review-thread list/filter semantics cover text, commit id, file path, author, participant, and thread state filtering                        | `packages/contracts` review-thread query contract, `packages/domain` review-thread query service, and `apps/app` PR review list adapter |
| `ReviewCommentTest.findByThread`, `saveReviewComment`, `deleteReviewComment`, and `deleteLastReviewComment`                                       | PR-bound review comment writes preserve comment persistence and delete-last-comment thread cleanup semantics                                  | `packages/domain` review comment mutation service, `packages/contracts` write contract, and `apps/app` mutation adapter                 |
| `CommentThreadTest.closeBy*` and `reopenBy*`                                                                                                      | PR-bound review threads preserve bounded close/reopen authorization semantics without re-owning generic commit discussion transport          | `packages/domain` PR review-thread state mutation and `apps/app` mutation adapter                                                       |

## Translation Layers For This Exemplar

- `packages/contracts`: typed query and mutation inputs for PR transition requests, review comment writes, thread state updates, review-thread filters, and merge preview/execute results, without committing to full PR surface coverage.
- `packages/domain`: the bounded PR transition policy for open/close/reopen authorization, PR-bound review comment and thread-state mutations, review-thread query service, and same-project merge preview/execute orchestration.
- `packages/vcs`: same-project merge preview/execute helper that reports conflicted files, writes merge audit records, and stays separate from generic commit discussion ownership.
- `apps/app`: app-facing `tRPC` procedures and thin route composition that map legacy auth and error outcomes without re-owning generic thread lifecycle.

## Explicit Phase 4 Deferrals

- Cross-project or fork merge acceptance, deferred because the landed slice only covers same-project branch PRs.
- Fork flow and clone workflow, deferred because the landed slice does not exercise branch-source provenance or repository-copy setup.
- Reviewer threshold and reviewer assignment lifecycle, deferred because the Phase 0B exemplar cites reviewer provenance but does not implement reviewer-state rules.
- Review comment edit permissions, stale-thread meaning, and broader reviewer state changes remain deferred because the landed write-side slice is narrower than the full review lifecycle.
- Diff composition, source-branch cleanup or restore, and full PR detail composition remain deferred because the landed slice only freezes the entry-level detail surface needed for demoable merge/review flows.
- PR event timeline translation, deferred because `PullRequestEventTest` evidence exists but the current exemplar does not freeze event-history rendering or delivery.

## Batch Boundary Rule

- Phase 0B uses this document only to freeze the bounded PR exemplar that was required for blocker reconciliation and is now landed.
- Full PR/review parity remains Phase 4 work under `SPEC.md:1297`, even after this provenance freeze lands.
- Generic commit comment and thread lifecycle remain owned by `13.6`, so they must not be relabeled as deferred PR parity work here.

## Out Of Scope

- Full pull-request parity
- Cross-project or fork merge parity
- Fork flow
- Reviewer threshold
- Reviewer assignment UI
- Review comment edit flow
- Source-branch cleanup or restore
- Full diff composition
- PR event timeline composition
- Generic commit-thread lifecycle from `13.6`
