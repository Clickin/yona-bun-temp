Status: Current execution plan
Date: 2026-06-18

# Persistence Repository Diet

## Goal

Reduce the compile-time blast radius of `crates/persistence/src/repo.rs` without changing the public persistence API, database behavior, or legacy Yona feature parity.

This is a move-only refactor first. Functional changes, new repository traits, generic storage abstractions, and cross-crate ownership changes are out of scope.

Current status: the large repository file has been physically decomposed into legacy-model-oriented include files. Low-coupling files may later be promoted from `include!` files to child modules after their private helper dependencies are small enough to make `pub(super)` adjustments mechanical.

## Constraints

- Keep persistence ownership inside `crates/persistence`.
- Keep current public names and re-export behavior from `crates/persistence/src/lib.rs`.
- Keep `AppRepository`, `AppUserRepository`, and `DefaultLandingRepository` as the externally visible repository entry points.
- Preserve existing method signatures unless a later compile error proves that a visibility-only adjustment is required.
- Prefer multiple inherent `impl AppRepository` blocks split by module over new traits or service abstractions.
- Compile after each meaningful move before moving on.

## Fixed Split Format

Legacy Yona divides backend code mostly by `yona-original/app/models/*.java`, with controller files such as `yona-original/app/controllers/IssueApp.java` and `yona-original/app/controllers/ProjectApp.java` acting as route/use-case entry points. Persistence modules should follow legacy model/table names first, not new service-style groups.

`repo.rs` becomes a `repo/` file tree. Most files are included into the same Rust module first, preserving the old private visibility and keeping the first pass behavior-neutral.

- `repo/mod.rs`: repository structs, module declarations, shared imports, and any code not yet moved.
- `repo/app_user.rs`: `AppUserRepository` wrapper implementation.
- `repo/default_landing.rs`: `DefaultLandingRepository` wrapper implementation.
- `repo/user.rs`: `User.java`, `UserCredential.java`, `UserVerification.java`, `Email.java`, `UserSetting.java`.
- `repo/site_admin.rs`: `SiteAdmin.java` and site user administration behavior.
- `repo/search.rs`: `Search.java`, `SearchResult.java`, and app-wide ranked search.
- `repo/issue.rs`: `Issue.java` core issue list/detail/mutation and issue summaries.
- `repo/issue_comment.rs`: `IssueComment.java` comments, comment origins, comment voters, comment notifications.
- `repo/issue_event.rs`: `IssueEvent.java`, issue timeline, issue state/event notification helpers.
- `repo/issue_label.rs`: `IssueLabel.java`, `IssueLabelCategory.java`, issue/posting label joins, label cache helpers.
- `repo/issue_relation.rs`: `Assignee.java`, `IssueSharer.java`, `IssueVoter.java`, `RecentIssue.java`, parent/child/reference/share/vote/assign behavior.
- `repo/posting.rs`: `Posting.java`, `PostingComment.java`, board/non-issue posting list/mutation/comments.
- `repo/milestone.rs`: `Milestone.java` and milestone summaries.
- `repo/organization.rs`: `Organization.java`, `OrganizationUser.java`, `UserEnrolledOrganization.java`, organization membership/enrollment/favorites.
- `repo/project.rs`: `Project.java`, project CRUD, authorization, dashboards, VCS metadata, project title heads.
- `repo/project_user.rs`: `ProjectUser.java`, `UserEnrolledProject.java`, project membership/enrollment.
- `repo/project_setting.rs`: `ProjectMenuSetting.java`, project reviewer/menu settings.
- `repo/project_activity.rs`: `FavoriteProject.java`, `RecentProject.java`, `ProjectVisitation.java`, project watch/recent/favorite behavior.
- `repo/project_transfer.rs`: `ProjectTransfer.java`.
- `repo/webhook.rs`: `Webhook.java`, `WebhookThread.java`, webhook deliveries.
- `repo/pull_request.rs`: `PullRequest.java`, pull request list/detail/mutation/merge.
- `repo/pull_request_review.rs`: `PullRequestReviewers.java`, `ReviewComment.java`, `CommentThread.java`, review threads/comments.
- `repo/pull_request_commit.rs`: `PullRequestCommit.java`, `PullRequestEvent.java`, pushed branch and commit-change tracking.
- `repo/mailbox.rs`: `OriginalEmail.java`, `mailbox/*`, inbound mail target planning and normalized message processing.
- `repo/attachment.rs`: `Attachment.java`, avatar/logo/container binding.
- `repo/notification.rs`: `NotificationEvent.java`, `NotificationMail.java`, `Watch.java`, `Unwatch.java`, `UserProjectNotification.java`.
- `repo/common.rs`: small pure helpers and constants only after their callers have moved enough to make the extraction mechanical.
- `repo/*_helpers.rs`: temporary helper buckets created during the move-only pass. These are allowed to shrink or merge into child modules later, but should not accumulate new behavior.

`repo_types.rs` remains unchanged until the repository module split is stable. A later pass may apply the same module tree to `repo_types/` with public re-exports.

## Move Order

1. Create the `repo/` module shell and move wrapper repositories:
   - `AppUserRepository`
   - `DefaultLandingRepository`
2. Move narrow, mostly self-contained feature groups:
   - `site_admin.rs`
   - `search.rs`
   - `webhook.rs`
3. Move high-use vertical groups:
   - `user.rs`
   - `organization.rs`
   - `project.rs`
   - `project_user.rs`
   - `project_setting.rs`
   - `project_activity.rs`
   - `project_transfer.rs`
   - `issue_label.rs`
   - `milestone.rs`
   - `attachment.rs`
4. Move high-coupling collaboration groups:
   - `issue.rs`
   - `issue_comment.rs`
   - `issue_event.rs`
   - `issue_relation.rs`
   - `posting.rs`
   - `pull_request.rs`
   - `pull_request_review.rs`
   - `pull_request_commit.rs`
   - `mailbox.rs`
   - `notification.rs`
5. Extract `common.rs` only after moved modules reveal stable shared helper boundaries.
6. Re-evaluate compile timings with a source-touch incremental `cargo check`.

## TODO

- [x] Convert `repo.rs` to `repo/mod.rs`.
- [x] Move `AppUserRepository` implementation to `repo/app_user.rs`.
- [x] Move `DefaultLandingRepository` implementation to `repo/default_landing.rs`.
- [x] Compile `yona-rust-persistence` after the wrapper split.
- [x] Move `site_admin.rs`.
- [x] Move `search.rs`.
- [x] Move webhook-related methods into `project.rs` for the initial physical split.
- [x] Compile after narrow feature groups.
- [x] Move user/organization/project-related legacy model groups.
- [x] Move issue/posting/pull-request/mailbox/notification legacy model groups.
- [x] Extract `common.rs`.
- [x] Re-run incremental compile timing comparison.

## Verification

- 2026-06-18: `cargo check --locked --offline -p yona-rust-persistence --all-targets` passed after the full physical split in 56.86s.
- 2026-06-18: touching `crates/persistence/src/repo/search.rs` followed by `cargo check --locked --offline -p yona-rust-persistence --all-targets --timings` passed in 10.73s. Timing report: `target/cargo-timings/cargo-timing-20260617T235305655Z-bd4efcc15b512d74.html`.
