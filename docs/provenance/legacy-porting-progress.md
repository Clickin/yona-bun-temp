# Legacy Yona Porting Progress

> Status dashboard. This document is a progress mirror for humans and agents.
> Source of truth remains `AGENTS.md`, `SPEC.md`, and the narrower provenance docs under `docs/provenance/**`.

Last updated: 2026-04-19

## Progress Estimate

| Scope                                   | Estimate | Basis                                                                                                                         |
| --------------------------------------- | -------: | ----------------------------------------------------------------------------------------------------------------------------- |
| Full legacy Yona parity                 |     ~35% | Weighted by legacy product capability, including VCS, PR/review, board, search, notifications, webhooks, admin, and REST API. |
| Current first-priority conversion scope |     ~40% | Same as above, but excluding explicitly deferred second-priority items such as SVN, LDAP, and import/export tooling.          |
| Mechanical SPEC row count               |     ~27% | `SPEC.md` feature/status rows: 38 implemented, 103 gap, 8 deferred, plus supporting/non-feature rows.                         |

Interpretation:

- The Rust port has a solid foundation for auth, workspace, organization/project ownership, and issue-tracker core behavior.
- The largest remaining gaps are still code hosting/VCS, pull requests/reviews, board/posting, search, notification fan-out, webhooks, site admin, and legacy REST API compatibility.
- Percentages are approximate. Update them only when a slice lands with tests and provenance updates.

## Update Protocol

- Check an item only when the Rust implementation has code, tests, and provenance or SPEC status evidence.
- Use `[~]` for intentionally partial support that is useful but not parity-complete.
- Keep deferred second-priority scope visible, but do not count it as a blocker for first-priority conversion unless `SPEC.md` changes.
- When a slice lands, update:
  - this document,
  - `SPEC.md`,
  - `docs/agents/06-phase-plan.md`,
  - the relevant provenance file under `docs/provenance/**`.

## High-Level Areas

| Area                                    | Status                    | Notes                                                                                                                    |
| --------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Foundation / DB / runtime               | [~] Mostly implemented    | Schema, migrations, runtime, RPC, assets are strong; production migration/import/export is not.                          |
| Auth / Workspace                        | [~] Partially implemented | Core account and settings flows exist; remember-me/admin approval/guest/OAuth/LDAP remain.                               |
| Organization / Project core             | [~] Partially implemented | CRUD, members, enrollment, watch/favorite basics exist; project admin surfaces remain.                                   |
| Issue tracker core                      | [~] Strong partial        | CRUD/comment/timeline/watch/vote/label/milestone/sharer/org issue list exist; mention/favorite/comment vote/REST remain. |
| VCS / Code hosting                      | [ ] Mostly missing        | Code routes are placeholders; smart HTTP is not parity-ready.                                                            |
| Pull Request / Review                   | [ ] Mostly missing        | PR routes are placeholders.                                                                                              |
| Board / Posting                         | [ ] Mostly missing        | Board/post routes are placeholders.                                                                                      |
| Search                                  | [ ] Mostly missing        | Search route is placeholder.                                                                                             |
| Notifications / Webhooks / Admin / REST | [ ] Mostly missing        | Some infrastructure exists, but parity surfaces are mostly gaps.                                                         |

## Foundation / Deployment / DB

- [x] Rust workspace canonical root
- [x] Axum + ConnectRPC server
- [x] React SPA route foundation
- [x] Legacy schema based SeaORM entities
- [x] SQLite runtime migration/adopt/validate
- [x] MySQL runtime migration/adopt/validate
- [x] PostgreSQL runtime migration/adopt/validate
- [x] Embedded/static asset serving
- [x] Session/CSRF infrastructure
- [~] Repository layer for implemented vertical slices
- [ ] Production migration/import/export tooling
- [ ] H2 compatibility
- [ ] Full operational hardening

## Auth / Account

- [x] Current session projection
- [x] CSRF-protected cookie session
- [x] Password login
- [x] Signup
- [x] Password reset
- [x] Email verification
- [x] Profile update basics
- [x] API token reset
- [x] Auth UI capability flags
- [ ] Admin signup approval
- [ ] Remember-me long session parity
- [ ] Configurable session timeout parity
- [ ] Guest user model
- [ ] Global anonymous-access configuration parity
- [ ] Custom login placeholder configuration
- [ ] OAuth social login
- [ ] LDAP

## Workspace / User

- [x] `/me` workspace shortcut
- [x] Workspace overview shell
- [x] Recent project list basics
- [x] Favorite project list basics
- [x] User settings legacy paths under `/user/editform`
- [x] Email management
- [x] Password settings
- [x] Token settings
- [x] Avatar upload/crop/display
- [x] Watched project notification preference basics
- [ ] Public profile route `/:user`
- [ ] User activity statistics
- [ ] Favorite issue management
- [ ] User aggregate issue list

## Organization

- [x] Organization create
- [x] Public organization detail/home
- [x] Organization settings update
- [x] Organization delete guards
- [x] Members admin view
- [x] Add organization member
- [x] Update organization member role
- [x] Delete organization member
- [x] Enrollment request
- [x] Enrollment cancel
- [x] Enrollment accept
- [x] Leave organization
- [x] Organization issue list body parity
- [ ] Organization board list body
- [ ] Organization pull request list body
- [ ] Organization scoped search

## Project

- [x] Create project
- [x] Read project detail
- [x] Read project settings
- [x] Read project container/header data
- [x] Update project settings
- [x] Update project overview
- [x] Public/protected/private read authorization
- [x] Project watch toggle
- [x] Favorite project toggle
- [x] Recent project visit recording
- [x] Member list read
- [ ] Full project member management
- [ ] Project delete confirmation flow
- [ ] Project watchers page
- [ ] Webhooks
- [ ] Project transfer
- [ ] Git/SVN type change
- [ ] Project statistics
- [ ] Full legacy project home/dashboard/history composition

## Issues

- [x] Project issue list
- [x] Issue create
- [x] Issue detail read
- [x] Issue update
- [x] Issue delete
- [x] Issue state open/close
- [x] Issue comment create
- [x] Issue comment update
- [x] Issue comment delete
- [x] Markdown render + sanitization for implemented issue surfaces
- [x] Issue timeline basics
- [x] Watch issue
- [x] Unwatch issue
- [x] Vote issue
- [x] Unvote issue
- [x] Assignee assign/unassign basics
- [x] Mass update
- [x] Issue label consumption in list/detail
- [x] Issue milestone consumption in list/detail
- [x] Issue sharer direct share/unshare
- [x] Private issue read/comment ACL for directly shared users
- [x] Parent-shared child issue read-only inheritance
- [x] Organization issue aggregate list
- [ ] Comment vote
- [ ] Mention autocomplete
- [ ] Mention notification semantics
- [ ] Shared-with-me issue filter
- [ ] Sharable user autocomplete/search
- [ ] Issue sharer timeline events
- [ ] Issue sharer notifications
- [ ] Favorite issue
- [ ] User aggregate issue list
- [ ] Issue Excel export
- [ ] REST issue API parity

## Labels

- [x] Project issue label list
- [x] Label create
- [x] Label update
- [x] Label delete
- [x] Label category create
- [x] Label category update
- [x] Label category delete
- [x] Exclusive category flag
- [x] Label CSS generation/direct legacy routes
- [x] Label filtering basics on issue routes
- [ ] Copy labels between projects

## Milestones

- [x] Milestone list
- [x] Milestone detail
- [x] Milestone create
- [x] Milestone update
- [x] Milestone delete
- [x] Open milestone
- [x] Close milestone
- [x] Linked issue aggregation
- [x] Markdown description rendering
- [x] Milestone attachment binding
- [ ] REST milestone API parity
- [ ] Milestone migration/export parity
- [ ] Milestone search result type

## Board / Posting

- [ ] Project board/post list
- [ ] Posting create
- [ ] Posting detail
- [ ] Posting update
- [ ] Posting delete
- [ ] Posting comment create/delete
- [ ] Notice posts
- [ ] README posting
- [ ] Posting labels
- [ ] Organization board list
- [ ] REST board API

## Repository / VCS / Code

- [ ] Repository browser
- [ ] Folder tree
- [ ] File content view
- [ ] Syntax highlight
- [ ] Raw download
- [ ] Image preview
- [ ] Branch/tag selector
- [ ] Commit history
- [ ] Commit detail/diff
- [ ] Commit comments
- [ ] Branch management
- [ ] Compare view
- [ ] Bare repository creation on project create
- [ ] Smart HTTP clone/pull
- [ ] Smart HTTP push
- [ ] Basic Auth/token auth for Git HTTP
- [ ] Post-receive hooks/events
- [ ] SVN support (deferred)

## Pull Request / Review

- [ ] PR open list
- [ ] PR closed list
- [ ] PR sent list
- [ ] PR creation
- [ ] PR detail
- [ ] PR diff
- [ ] Open/close/reopen
- [ ] Merge
- [ ] Merge conflict handling
- [ ] Reviewer assignment
- [ ] Review approve/reject
- [ ] Inline review comments
- [ ] Review thread lifecycle
- [ ] Fork and PR workflow
- [ ] Source branch cleanup

## Search

- [ ] Global search
- [ ] Project scoped search
- [ ] Organization scoped search
- [ ] Issue result type full parity
- [ ] Posting result type
- [ ] Issue comment result type
- [ ] Posting comment result type
- [ ] Milestone result type
- [ ] Review comment result type
- [ ] Result grouping/counts
- [ ] Pagination/snippets/access filtering

## Notifications / Mail

- [x] SMTP/integration infrastructure basics
- [x] Project notification settings basics
- [x] Project watch toggle basics
- [ ] Notification event list
- [ ] Issue event notifications
- [ ] PR/review notifications
- [ ] Email notification fan-out parity
- [ ] BCC mode
- [ ] Notification interval batching
- [ ] Draft-time merge
- [ ] Recipient limit
- [ ] Mailbox/reply threading parity

## Webhooks

- [ ] Webhook CRUD
- [ ] Event payload generation
- [ ] Secret/HMAC verification
- [ ] Issue event type
- [ ] Pull request event type
- [ ] Comment event type
- [ ] Review event type
- [ ] Delivery history/retry behavior

## Attachments / Files

- [x] File upload endpoint
- [x] File download endpoint
- [x] Avatar attachment flow
- [~] Issue attachment binding
- [~] Issue comment attachment binding
- [~] Milestone attachment binding
- [ ] File delete authorization
- [ ] Full container type parity across issue/board/PR/project
- [ ] Global file size policy parity
- [ ] MIME validation parity for all containers

## Site Admin

- [ ] User list/manage/search
- [ ] Admin toggle/account lock
- [ ] Project list/manage/delete
- [ ] Site-wide posting/issue management
- [ ] Mail settings/test/mass mail
- [ ] System diagnostics
- [ ] Data import/export (deferred)
- [ ] Update check (deferred)

## Markdown

- [x] Basic Markdown rendering on issue surfaces
- [x] Basic Markdown rendering on milestone surfaces
- [x] HTML sanitization on implemented render path
- [ ] Full legacy/GFM extension parity
- [ ] `@username` links
- [ ] `#123` issue links
- [ ] Autolink parity
- [ ] Syntax-highlighted code blocks
- [ ] Inline image behavior
- [ ] Task checklist rendering

## REST API Compatibility

- [ ] `GET /-_-api/v1/hello`
- [ ] User REST APIs
- [ ] Issue REST API
- [ ] Project REST API
- [ ] Board REST API
- [ ] Milestone REST API
- [ ] Watcher REST API
- [ ] Favorite REST API
