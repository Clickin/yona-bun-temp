# Pull Request and Review Provenance

## Scope

- Bounded exemplar only
- Open, close, reopen authorization semantics
- Create/edit form and mutation surface
- Review/unreview mutation surface
- General PR review comment creation
- Review-thread list/filter semantics plus open/close mutation
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

## Phase 4A Read Surface Rules

- Pull-request read queries preserve legacy persisted state values: `OPEN = 1`,
  `CLOSED = 2`, and `MERGED = 6`. `ALL = 0` is a search bucket in legacy code,
  not an open pull-request row state.
- Review-thread read queries accept both legacy enum-string values
  `OPEN`/`CLOSED` and already-lowercase migrated data. Missing thread state is
  treated as open for read compatibility.
- Pull-request changes read from the stored merged commit id pair, not from
  current branch heads. Missing Git repositories or missing stored revisions
  keep the Phase 4A empty-diff fallback instead of inventing a synthetic diff.
- Organization pull-request lists preserve `filter` and `pageNum` through
  category tab navigation and search forms.

## Phase 4B Interaction Surface Rules

- App runtime PR interactions use `/api/v1/**` only. Legacy external
  `/-_-api/v1/**` compatibility stays outside the Rust app server and belongs to
  separate migrator/export/import scope if reopened.
- Create/edit form-options read Git branch names from `YONA_DATA/repo/<project_id>.git`.
  Missing or empty repositories return a 400-style form failure rather than
  synthetic branch choices.
- Edit form parity keeps from/to project and branch controls visible but disabled;
  branch/project changes are not accepted by the edit mutation.
- Create rejects missing title/body/from branch/to branch and returns the existing
  PR detail when an open duplicate from/to project+branch pair already exists.
- State/review/comment/thread mutations project the updated normalized PR detail or
  review thread and record legacy event types:
  `NEW_PULL_REQUEST`, `PULL_REQUEST_STATE_CHANGED`,
  `PULL_REQUEST_REVIEW_STATE_CHANGED`, `NEW_REVIEW_COMMENT`, and
  `REVIEW_THREAD_STATE_CHANGED`.
- Project webhooks now follow the observed legacy model for DB-backed PR
  interactions: `NEW_PULL_REQUEST`, `PULL_REQUEST_REVIEW_STATE_CHANGED`, and
  `NEW_REVIEW_COMMENT` fan out to non-JSON webhooks with the legacy PR link/text
  shape. Plain close/reopen records PR state events but did not call project
  webhooks in the observed legacy code.
- PR create/edit body editors and general review comment editors preserve the
  legacy `yobi.git.Write` / `yobi.git.View` image paste/drop path by posting
  image files to `/files`, inserting `![name](url)`, and submitting uploaded
  attachment ids with the matching `/api/v1` PR mutation.
- PR bodies and general review comments now use the project Markdown projection
  for sanitized `@username`, same-project `#123`, `owner/project#123`, and
  bare `http://`/`https://` URL autolinks. Legacy issue-link title/state
  enrichment remains a Markdown renderer follow-up.

## Extracted Intent

| Legacy source | Intent | Rust translation target |
| --- | --- | --- |
| `PullRequestAppTest.testCloseAnonymous` and `testOpenAnonymous` | anonymous open/close attempts redirect or deny rather than mutating state | auth gate in `crates/server` plus frontend page guard |
| `PullRequestAppTest.testCloseNotExistProject` and `testCloseNotExistPullRequest` | close rejects missing project or missing pull request with distinct error outcomes | `crates/server` error mapping backed by domain lookup result |
| `PullRequestAppTest.testClosePullRequest` and `testClosePullRequestNotAllow` | authorized actors can close; unauthorized actors cannot mutate state | transition policy in `crates/domain` plus mutation contract test |
| `PullRequestAppTest.testOpenPullRequest`, `testOpenPullRequestBadRequest`, and `testOpenRoute` | authorized reopen succeeds; already-open reopen is bad request | transition policy in `crates/domain` plus `crates/server` contract test |
| `PullRequestApp.create`, `newPullRequestForm`, and `editform` | create/edit forms expose from/to project and branch controls while edit keeps branch/project selection immutable | `/api/v1/owners/:owner/projects/:project/pull-requests/*form-options`, frontend form route parity |
| `PullRequestEventTest` | PR creation, state changes, review actions, comments, and thread state changes append legacy event rows | `pull_request_mutation_contract` event assertions |
| `ReviewApp.review` and `unreview` | reviewers can mark and cancel review state when detail permissions allow it | `/review` and `/unreview` REST mutation contracts plus frontend action controls |
| `PullRequestApp.newComment` and `CommentThreadApp.open/close` | authenticated readable PR users can add a general review comment; thread owners/reviewers/updaters can close/open threads | review comment and thread state REST mutations plus Playwright interaction smoke |
| `ReviewThreadAppTest.projectNotFound` and `projectForbidden` | review-thread listing respects project existence and project visibility before returning data | query authorization in `crates/server` plus frontend route test |
| `ReviewSearchConditionTest.*` | review-thread list/filter semantics cover text, commit id, path, author, participant, and thread state filtering | query contract in `proto`, domain query service in `crates/domain`, list UI in `frontend` |

## Explicit Phase 4 Deferrals

- merge acceptance and merge-conflict flow
- reviewer threshold and reviewer assignment lifecycle
- ranged inline review comment create/edit/delete
- diff composition and PR event timeline
- fork/clone workflow and branch cleanup
- Smart HTTP, merge/commit-changed/push webhook delivery, and legacy external
  `/-_-api/v1/**` compatibility

이 항목들은 bounded exemplar 밖의 `deferred` scope다.
