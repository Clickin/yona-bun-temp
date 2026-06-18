Status: Current execution plan
Date: 2026-06-18

# Persistence Repository Diet

## Goal

Reduce the compile-time blast radius of `crates/persistence/src/repo.rs` without changing the public persistence API, database behavior, or legacy Yona feature parity.

This is a move-only refactor first. Functional changes, new repository traits, generic storage abstractions, and cross-crate ownership changes are out of scope.

Current status: the large repository file has been decomposed into legacy-model-oriented child modules. Private cross-module repository helpers use `pub(super)` so visibility stays limited to `repo`.
SeaORM generated entities now live in `crates/persistence-entities`; `crates/persistence` re-exports them while owning repository code and repo DTOs. This keeps generated entity derive macro expansion in a separate crate so repository-only edits can reuse the entity crate artifact.

## Constraints

- Keep persistence ownership inside `crates/persistence`.
- Keep generated SeaORM entity ownership inside `crates/persistence-entities`; `crates/persistence` may re-export those modules for compatibility but should not regain generated entity files.
- Keep current public names and re-export behavior from `crates/persistence/src/lib.rs`.
- Keep `AppRepository`, `AppUserRepository`, and `DefaultLandingRepository` as the externally visible repository entry points.
- Preserve existing method signatures unless a later compile error proves that a visibility-only adjustment is required.
- Prefer multiple inherent `impl AppRepository` blocks split by module over new traits or service abstractions.
- Compile after each meaningful move before moving on.

## Fixed Split Format

Legacy Yona divides backend code mostly by `yona-original/app/models/*.java`, with controller files such as `yona-original/app/controllers/IssueApp.java` and `yona-original/app/controllers/ProjectApp.java` acting as route/use-case entry points. Persistence modules should follow legacy model/table names first, not new service-style groups.

`repo.rs` becomes a `repo/` module tree. Repository implementation files are real child modules loaded from the legacy-model-oriented file names. Shared helpers live in `repo/common.rs` and are re-exported only inside `repo`.

- `repo/mod.rs`: repository structs, module declarations, shared imports, and repo-private common helper imports.
- `repo/app_user.rs`: `AppUserRepository` wrapper implementation.
- `repo/default_landing.rs`: `DefaultLandingRepository` wrapper implementation.
- `repo/user.rs`: `User.java`, `UserCredential.java`, `UserVerification.java`, `Email.java`, `UserSetting.java`.
- `repo/site_admin.rs`: `SiteAdmin.java` and site user administration behavior.
- `repo/search.rs`: `Search.java`, `SearchResult.java`, and app-wide ranked search.
- `repo/issue.rs`: `Issue.java` core issue list/detail/mutation and issue summaries.
- `repo/issue_list.rs`: project and organization issue list/filter/export/parent-option queries.
- `repo/issue_mutation.rs`: issue create/update/delete/state/watch mutations.
- `repo/issue_picker.rs`: issue assignable/shareable/mention picker queries.
- `repo/issue_reference.rs`: issue reference search and issue-number lookup.
- `repo/issue_user_list.rs`: user aggregate issue candidates, sharer, and favorite issue behavior.
- `repo/issue_comment.rs`: `IssueComment.java` comments, comment origins, comment voters, comment notifications.
- `repo/issue_event.rs`: `IssueEvent.java`, issue timeline, issue state/event notification helpers.
- `repo/issue_label.rs`: `IssueLabel.java`, `IssueLabelCategory.java`, issue/posting label joins, label cache helpers.
- `repo/issue_relation.rs`: `Assignee.java`, `IssueSharer.java`, `IssueVoter.java`, `RecentIssue.java`, parent/child/reference/share/vote/assign behavior.
- `repo/posting.rs`: `Posting.java`, `PostingComment.java`, board/non-issue posting list/mutation/comments.
- `repo/posting_comment.rs`: `PostingComment.java` comment origin and board/non-issue posting comment mutations.
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
- `repo/pull_request_review_actions.rs`: pull-request review/comment/thread mutation entry points.
- `repo/mailbox.rs`: `OriginalEmail.java`, `mailbox/*`, inbound mail target planning and normalized message processing.
- `repo/attachment.rs`: `Attachment.java`, avatar/logo/container binding.
- `repo/notification.rs`: `NotificationEvent.java`, `NotificationMail.java`, `Watch.java`, `Unwatch.java`, `UserProjectNotification.java`.
- `repo/notification_event.rs`: notification event row creation and merge/dedup helpers.
- `repo/notification_receivers.rs`: project, issue, posting, pull-request, and commit notification receiver calculation.
- `repo/notification_targets.rs`: notification target route/title projection.
- `repo/mention_sync.rs`: mention row synchronization and mention-triggered notification fan-out.
- `repo/posting_event_helpers.rs`: posting event helpers retained separately from board posting mutation code.
- `repo/pull_request_event.rs`: pull-request event row helpers.
- `repo/common.rs`: repo-private pure helpers, constants, query row structs, and small record conversion functions shared across child modules.
- `repo/*_helpers.rs`: helper buckets created during the move-only pass. These are allowed to shrink or merge into narrower modules later, but should not accumulate unrelated new behavior.

`repo_types.rs` remains unchanged until the repository module split is stable. A later pass may apply the same module tree to `repo_types/` with public re-exports.

`crates/persistence-entities/src/*.rs` owns SeaORM generated entity modules, including `prelude.rs` and the historical `entities.rs` snapshot. `crates/persistence/src/lib.rs` re-exports this crate before exposing repository APIs, preserving existing `yona_rust_persistence::issue`-style imports.

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
- [x] Split the remaining large `issue.rs` implementation into focused child modules.
- [x] Split generated SeaORM entities into `crates/persistence-entities`.
- [x] Split the remaining large `project.rs` implementation into focused child modules.

## Verification

- 2026-06-18: `cargo check --locked --offline -p yona-rust-persistence --all-targets` passed after the full physical split in 56.86s.
- 2026-06-18: touching `crates/persistence/src/repo/search.rs` followed by `cargo check --locked --offline -p yona-rust-persistence --all-targets --timings` passed in 10.73s. Timing report: `target/cargo-timings/cargo-timing-20260617T235305655Z-bd4efcc15b512d74.html`.
- 2026-06-18: `repo/` implementation files were promoted from `include!` files to child modules; `cargo check --locked --offline -p yona-rust-persistence --all-targets` passed in 18.56s.
- 2026-06-18: touching `crates/persistence/src/repo/search.rs` after child-module promotion followed by `cargo check --locked --offline -p yona-rust-persistence --all-targets --timings` passed in 9.95s. Timing report: `target/cargo-timings/cargo-timing-20260618T001741584Z-bd4efcc15b512d74.html`.
- 2026-06-18: `pnpm agent:cargo-test -- -p yona-rust-persistence --test auth_workspace_repository` passed in 27.2s after child-module promotion.
- 2026-06-18: moved issue comments, posting comments, webhooks, pull-request review actions, and commit discussion methods into narrower child modules; `cargo check --locked --offline -p yona-rust-persistence --all-targets` passed in 3m46s.
- 2026-06-18: touching `crates/persistence/src/repo/search.rs` after the narrower child-module split followed by `cargo check --locked --offline -p yona-rust-persistence --all-targets --timings` passed in 10.18s. Timing report: `target/cargo-timings/cargo-timing-20260618T003304938Z-bd4efcc15b512d74.html`.
- 2026-06-18: focused tests passed after the narrower split:
  - `pnpm agent:cargo-test -- -p yona-rust-persistence --test auth_workspace_repository` in 25.4s.
  - `pnpm agent:cargo-test -- -p yona-rust-pilot-server --test issue_core_contract issue_core_contract_creates_reads_updates_and_deletes_over_rest` in 289.2s.
  - `pnpm agent:cargo-test -- -p yona-rust-pilot-server --test board_contract board_posting_contract_covers_labels_readme_notice_mentions_comments_email_and_legacy_direct_routes` in 290.6s.
  - `pnpm agent:cargo-test -- -p yona-rust-pilot-server --test pull_request_mutation_contract pull_request_interaction_surface_mutates_state_review_comments_threads_and_events` in 262.0s.
- 2026-06-18: split `event_notification_helpers.rs` into issue/pull-request event helpers, notification events, receiver calculation, mention sync, and target projection modules; `cargo check --locked --offline -p yona-rust-persistence --all-targets` passed in 4m49s.
- 2026-06-18: touching `crates/persistence/src/repo/notification_receivers.rs` followed by `cargo check --locked --offline -p yona-rust-persistence --all-targets --timings` passed in 42.37s. Timing report: `target/cargo-timings/cargo-timing-20260618T010744732Z-bd4efcc15b512d74.html`.
- 2026-06-18: Rosetta check for the persistence compile path found native Apple Silicon toolchain evidence: `uname -m` returned `arm64`, `rustc -vV` and `cargo -vV` reported host `aarch64-apple-darwin`, `rustup show active-toolchain` reported `stable-aarch64-apple-darwin`, and `file $(which rustc) $(which cargo)` reported Mach-O `arm64` binaries.
- 2026-06-18: `cargo build --locked --offline -p yona-rust-persistence --timings` passed in 1m00s. Timing report: `target/cargo-timings/cargo-timing-20260618T012110664Z-bd4efcc15b512d74.html`. The critical dependency chain is SeaORM/SQLx multi-dialect work rather than Rosetta: `sea-query` 26.0s with MySQL/PostgreSQL/SQLite backends, `sqlx-core` 3.6s, `sqlx-postgres` 4.3s, `sqlx-sqlite` 3.7s, `sqlx-mysql` 3.6s, `sqlx` 2.8s, `sea-query-binder` 2.5s, `sea-orm` 4.9s, then `yona-rust-persistence` 6.7s.
- 2026-06-18: focused notification tests passed after receiver/mention split:
  - `pnpm agent:cargo-test -- -p yona-rust-persistence --test auth_workspace_repository` in 295.4s.
  - `pnpm agent:cargo-test -- -p yona-rust-pilot-server --test pull_request_mutation_contract pull_request_state_notifications_include_legacy_review_comment_watchers` in 147.9s.
  - `pnpm agent:cargo-test -- -p yona-rust-pilot-server --test issue_core_contract issue_core_contract_creates_reads_updates_and_deletes_over_rest` in 274.8s.
  - `pnpm agent:cargo-test -- -p yona-rust-pilot-server --test board_contract board_contract_manages_project_posts_comments_watch_and_notifications` in 18.9s.
- 2026-06-18: split `repo/issue.rs` into `issue.rs`, `issue_list.rs`, `issue_mutation.rs`, `issue_picker.rs`, `issue_reference.rs`, and `issue_user_list.rs`; `cargo check --locked --offline -p yona-rust-persistence --all-targets` passed in 4m38s, and `pnpm agent:cargo-test -- -p yona-rust-pilot-server --test issue_core_contract issue_core_contract_creates_reads_updates_and_deletes_over_rest` passed in 59.9s.
- 2026-06-18: split `repo/project.rs` into `project.rs`, `project_membership.rs`, `project_delete.rs`, and `project_watchers.rs`; `cargo check --locked --offline -p yona-rust-persistence --all-targets` passed in 3m20s.
- 2026-06-18: moved generated SeaORM entity modules from `crates/persistence/src` into new `crates/persistence-entities`; `crates/persistence/src` now only contains `lib.rs`, `repo_types.rs`, and `repo/**`, while `crates/persistence/src/lib.rs` re-exports `yona_rust_persistence_entities::*` for compatibility.
- 2026-06-18: `pnpm agent:cargo-test -- -p yona-rust-persistence --no-run --timings` passed in 110.6s. Timing report: `target/cargo-timings/cargo-timing-20260618T015542557Z-bd4efcc15b512d74.html`. Targets were the persistence lib plus three integration test binaries; `yona-rust-persistence-entities` compiled as a separate 4.6s unit, `yona-rust-persistence` as a separate 5.0s unit, and each persistence integration test binary as about 4.4s.
- 2026-06-18: cached compile-only splits passed after entity crate separation: `pnpm agent:cargo-test -- -p yona-rust-persistence --lib --no-run --timings` in 0.4s (`target/cargo-timings/cargo-timing-20260618T015827380Z-bd4efcc15b512d74.html`) and `pnpm agent:cargo-test -- -p yona-rust-persistence --tests --no-run --timings` in 0.2s (`target/cargo-timings/cargo-timing-20260618T015849048Z-bd4efcc15b512d74.html`).
- 2026-06-18: `cargo tree -p yona-rust-persistence -e features -i sea-orm`, `cargo tree -p yona-rust-persistence -e features -i sqlx`, and `cargo tree -p yona-rust-persistence --duplicates` confirmed the active SeaORM/SQLx surface is still the intended Day-1 MySQL/PostgreSQL/SQLite feature set, with duplicate transitive versions around proc-macro dependencies rather than a duplicate SeaORM/SQLx version.
- 2026-06-18: `cargo check --locked --offline -p yona-rust-persistence-entities -p yona-rust-persistence --all-targets` passed in 6m25s after profile and crate-boundary changes.
- 2026-06-18: `pnpm agent:cargo-test -- -p yona-rust-persistence --test auth_workspace_repository` passed in 279.5s after adding the entity re-export contract assertion.
- 2026-06-18: `cargo check --locked --offline -p yona-rust-pilot-server --tests` passed in 3m10s, confirming server test targets still resolve the persistence entity re-exports.
- 2026-06-18: `pnpm agent:cargo-test -- -p yona-rust-pilot-server --test issue_core_contract issue_entity_reexport_preserves_legacy_table_name` passed in 479.0s.
- 2026-06-18: `pnpm agent:cargo-test -- -p yona-rust-persistence --test org_project_repo_contract project_entity_reexport_preserves_legacy_table_name` passed in 114.4s.
