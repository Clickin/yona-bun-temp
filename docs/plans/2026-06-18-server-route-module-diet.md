# Server Route Module Diet

Status: Current execution plan
Date: 2026-06-18

## Purpose

`crates/server/src/lib.rs` is too large for fast review and safe agent iteration. This plan defines how to split it while preserving Yona conversion rules: legacy functional parity first, no new product behavior, and no architecture outside the fixed workspace ownership in `AGENTS.md` and `SPEC.md`.

The external reference is `bulletproof-rust-web`:

- <https://github.com/gruberb/bulletproof-rust-web>
- <https://gruberb.github.io/bulletproof-rust-web/>

Only the structural principles that fit this repository are adopted: thin Axum handlers, separation by reason to change, and deliberate incremental evolution. This is not a rewrite to that guide's sample architecture.

## Boundary Rules

Keep code in `crates/server` when it owns any of these concerns:

- Axum routing, extractors, middleware, request guards, redirects, headers, cookies, or response mapping.
- Session bootstrap, CSRF/auth bootstrap, anonymous access gate, or browser runtime config.
- REST JSON request/response compatibility under `/api/v1` or legacy compatibility routes.
- Embedded frontend assets, SPA fallback, base-path injection, or web runtime delivery.

Move code to existing crates only when the dependency direction is clean:

- `crates/domain`: ACL decisions, invariants, resource state transitions, and parity-first behavior that does not depend on Axum, SeaORM entities, or HTTP response types.
- `crates/persistence`: SeaORM queries, transactions, dialect handling, repository DTO mapping, and DB-backed lookup helpers.
- `crates/integrations`: SMTP/mailbox/webhook command execution and external integration protocol logic that does not need route/session state.
- `crates/vcs`: Git/SVN command, repository path, diff, commit, ref, blame, and protocol helpers that do not need Axum request/response types.
- `crates/search`: indexing/query behavior and search result assembly that is independent from route serialization.

Do not create a new crate unless the extracted logic is independently testable, has no HTTP/session dependency, and cannot naturally live in one of the fixed crates above.

## Module Shape

The near-term server layout should stay simple:

```text
crates/server/src/
  lib.rs                    # runtime wiring and top-level router assembly
  assets.rs                 # embedded/filesystem asset serving
  mailbox.rs                # mailbox polling runtime bridge
  server_config.rs          # server-facing config defaults and re-exports
  routes/
    mod.rs                  # route group assembly
    auth.rs
    workspace.rs
    projects.rs
    issues.rs
    boards.rs
    pull_requests.rs
    code.rs
    notifications.rs
    search.rs
    site_admin.rs
```

Route modules should expose route builders or tightly scoped handlers. They should avoid generic framework abstractions. Handler helpers can remain private to their route module unless tests or existing public compatibility require a re-export.

## Extraction Order

1. Keep the already extracted modules stable: `protocol`, `mailbox`, `server_config`, and `assets`.
2. Introduce `routes/mod.rs` as a shallow assembly layer, moving route group registration before moving handler bodies.
3. Split low-risk standalone handler groups first: notifications, search, site admin utility routes, and workspace/account helpers.
4. Split project-scoped groups by legacy URL/resource boundary: projects, issues, boards, pull requests, code/repository.
5. After route adapters are thin, evaluate pure logic for existing crate promotion: VCS logic to `crates/vcs`, integration logic to `crates/integrations`, search logic to `crates/search`, and ACL/invariants to `crates/domain`.
6. Record every moved legacy parity surface in provenance when behavior is intentionally unchanged but ownership changes.

## Acceptance Criteria

- `lib.rs` shrinks through real module ownership, not `include!` or mechanical hiding.
- Public API compatibility remains intact for existing tests unless a narrower public surface is explicitly updated with tests.
- Every extraction has focused contract coverage or preserves an existing contract test.
- `cargo check` and the affected `pnpm agent:cargo-test -- ...` target pass before committing.
- No legacy route, label, UX flow, or REST compatibility behavior changes as part of this refactor.

## Verification Log

- 2026-06-19: moved notification REST query/response DTOs and `rest_list_notifications` from `crates/server/src/lib.rs` into `crates/server/src/routes/notifications.rs`, reducing `lib.rs` from 12,912 to 12,812 lines. `cargo check --locked --offline -p yona-rust-pilot-server --lib` passed in 4m08.09s; `pnpm agent:cargo-test -- -p yona-rust-pilot-server --test notification_contract notification_contract_lists_current_user_notifications_with_paging` passed in 56.1s; `pnpm agent:cargo-test -- -p yona-rust-pilot-server --test notification_contract notification_contract_direct_notification_route_returns_legacy_partial_fragment` passed in 1.4s.
- 2026-06-19: moved site-admin REST/direct DTOs from `crates/server/src/lib.rs` into `crates/server/src/routes/site_admin.rs`, reducing `lib.rs` from 12,812 to 12,408 lines. The first `cargo check --locked --offline -p yona-rust-pilot-server --lib` failed after 2m55.67s because a duplicate `RestProjectPostsQuery` derive/serde boundary attribute remained after the move; after fixing that and making moved site-admin handlers module-private, the same check passed in 4.056s. Focused checks passed: `site_admin_user_list_and_toggles_follow_legacy_state_buckets` in 37.6s, `site_admin_export_download_follows_legacy_site_data_route` in 1.5s, and `site_admin_mail_send_and_recipient_lookup_follow_legacy_surface` in 2.0s.
- 2026-06-19: moved board REST query/response DTOs, posting list/detail mappers, and direct posting-comment helpers from `crates/server/src/lib.rs` into `crates/server/src/routes/boards.rs`, reducing `lib.rs` from 12,408 to 11,809 lines. The first `cargo check --locked --offline -p yona-rust-pilot-server --lib` failed after 3m52.57s because the root direct posting-comment helper still accessed moved private response internals; after moving those helpers into the board route module, the same check passed in 4m06.75s, and the final incremental recheck after visibility/import cleanup passed in 0.576s. Focused checks passed: `board_contract_manages_project_posts_comments_watch_and_notifications` in 29.1s, `organization_board_contract_lists_visible_cross_project_posts_without_notice_pin` in 10.9s, and `board_readme_posting_commits_git_readme_file` in 1.5s.
- 2026-06-19: moved PR REST query/response DTOs, pull-request/review-thread list/detail/changes mappers, and shared commit-discussion review-thread projection helpers from `crates/server/src/lib.rs` into `crates/server/src/routes/pull_requests.rs`, reducing `lib.rs` from 11,809 to 10,923 lines. The first `cargo check --locked --offline -p yona-rust-pilot-server --lib` failed after 4m30.96s on moved review-thread visibility for `excel_export` and `code.rs`; follow-up checks failed in 7.461s and 7.102s while narrowing the same visibility boundary, then passed in 7.333s. The final post-format incremental recheck passed in 6.087s. Focused checks passed: `pull_request_read_surface_returns_lists_detail_changes_reviews_and_org_aggregate` in 36.1s, `pull_request_interaction_surface_mutates_state_review_comments_threads_and_events` in 69.7s, and `rest_commit_detail_creates_comments_and_updates_threads_from_git_repo` in 17.7s.
- 2026-06-19: moved auth REST request DTOs and sign-in/register/sign-out/verify/capability handlers from `crates/server/src/lib.rs` into `crates/server/src/routes/auth.rs`, reducing `lib.rs` from 10,923 to 10,817 lines. `cargo check --locked --offline -p yona-rust-pilot-server --lib` passed in 4m21.05s after the move, and the final post-format recheck passed in 3m38.68s. Focused check passed: `rest_auth_routes_round_trip_with_shared_session_and_error_envelope` in 36.1s.
- 2026-06-19: moved user statistics REST response DTO, handler, and mapper from `crates/server/src/lib.rs` into `crates/server/src/routes/users.rs`, reducing `lib.rs` from 10,817 to 10,758 lines. `cargo check --locked --offline -p yona-rust-pilot-server --lib` passed in 3m48.70s after the move, and the final post-format recheck passed in 3m35.23s. Focused checks passed: `rest_user_statistics_counts_legacy_activity_rows` in 37.7s, `legacy_external_users_search_preserves_members_helper_contract` in 19.0s, and `site_admin_user_list_and_toggles_follow_legacy_state_buckets` in 23.4s.
- 2026-06-19: moved issue meta REST body/query DTOs and participation, assignment, sharing, favorite, and comment-vote wrapper handlers from `crates/server/src/lib.rs` into `crates/server/src/routes/issues.rs`, reducing `lib.rs` from 10,758 to 10,467 lines. The first `cargo check --locked --offline -p yona-rust-pilot-server --lib` failed after 5m29.07s because the moved DTOs were missing the local `serde::Deserialize` import; after fixing the import and module-local visibility, the same check passed in 7.667s. The final post-format recheck passed in 4m04.99s. Focused checks passed: `rest_issue_meta_routes_manage_participation_assignment_sharing_and_comment_votes` in 71.2s and `issue_comment_vote_legacy_post_routes_redirect_and_preserve_unvote_policy` in 279.7s.
- 2026-06-19: moved issue label/category and project milestone REST body/query DTOs plus wrapper handlers from `crates/server/src/lib.rs` into `crates/server/src/routes/issues.rs`, reducing `lib.rs` from 10,467 to 10,020 lines. `cargo check --locked --offline -p yona-rust-pilot-server --lib` passed in 3m38.85s after the move, and the final post-format recheck passed in 1.164s. Focused checks passed: `issue_label_rpc_manages_labels_categories_and_cleanup` in 44.3s and `milestone_rpc_manages_crud_state_sorting_and_linked_issues` in 16.0s.
- 2026-06-19: moved public user profile REST query/response DTOs and handler from `crates/server/src/lib.rs` into `crates/server/src/routes/users.rs`, reducing `lib.rs` from 10,020 to 9,871 lines. `cargo check --locked --offline -p yona-rust-pilot-server --lib` passed in 3m10.34s after the move, and the final post-format recheck passed in 3m41.20s. Focused checks passed: `rest_public_user_profile_reads_legacy_single_segment_profile` in 43.1s and `site_admin_user_list_and_toggles_follow_legacy_state_buckets` in 241.1s.
