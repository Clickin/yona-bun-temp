# Pull Request and Review Provenance

## Scope

- Bounded exemplar only
- Open, close, reopen authorization semantics
- Read-only review-thread list and filter semantics
- Full pull-request/review parity는 주장하지 않는다

## Legacy Sources

- `yona-original/test/controllers/PullRequestAppTest.java`
- `yona-original/test/controllers/ReviewThreadAppTest.java`
- `yona-original/test/models/PullRequestTest.java`
- `yona-original/test/models/PullRequestEventTest.java`
- `yona-original/test/models/ReviewCommentTest.java`
- `yona-original/test/models/support/ReviewSearchConditionTest.java`

## Current Baseline And Canonical Target

- current mixed-code reference: `reference/mixed-code/frontend/src/lib/pull-request-trpc.ts`, `reference/mixed-code/packages/domain/*pull-request*`
- canonical implementation path: `repo root`
- canonical owner path: `frontend`, `crates/server`, `crates/domain`

## Extracted Intent

| Legacy source | Intent | Rust translation target |
| --- | --- | --- |
| `PullRequestAppTest.testCloseAnonymous` and `testOpenAnonymous` | anonymous open/close attempts redirect or deny rather than mutating state | auth gate in `crates/server` plus frontend page guard |
| `PullRequestAppTest.testCloseNotExistProject` and `testCloseNotExistPullRequest` | close rejects missing project or missing pull request with distinct error outcomes | `crates/server` error mapping backed by domain lookup result |
| `PullRequestAppTest.testClosePullRequest` and `testClosePullRequestNotAllow` | authorized actors can close; unauthorized actors cannot mutate state | transition policy in `crates/domain` plus mutation contract test |
| `PullRequestAppTest.testOpenPullRequest`, `testOpenPullRequestBadRequest`, and `testOpenRoute` | authorized reopen succeeds; already-open reopen is bad request | transition policy in `crates/domain` plus `crates/server` contract test |
| `ReviewThreadAppTest.projectNotFound` and `projectForbidden` | review-thread listing respects project existence and project visibility before returning data | query authorization in `crates/server` plus frontend route test |
| `ReviewSearchConditionTest.*` | review-thread list/filter semantics cover text, commit id, path, author, participant, and thread state filtering | query contract in `proto`, domain query service in `crates/domain`, list UI in `frontend` |

## Explicit Phase 4 Deferrals

- merge acceptance and merge-conflict flow
- reviewer threshold and reviewer assignment lifecycle
- review comment create/edit/delete
- diff composition and PR event timeline
- fork/clone workflow and branch cleanup

이 항목들은 bounded exemplar 밖의 `deferred` scope다.
