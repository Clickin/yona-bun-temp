# Legacy Yona Porting Progress

> Status dashboard. This document is a progress mirror for humans and agents.
> Source of truth remains `AGENTS.md`, `SPEC.md`, and the narrower provenance docs under `docs/provenance/**`.

Last updated: 2026-05-16

## Progress Estimate

| Scope                                   | Estimate | Basis                                                                                                                         |
| --------------------------------------- | -------: | ----------------------------------------------------------------------------------------------------------------------------- |
| Full legacy Yona parity                 |     ~46% | Weighted by legacy product capability, including VCS, PR/review, board, search, notifications, webhooks, admin, and separate migrator/external API compatibility. |
| Current first-priority conversion scope |     ~52% | Same as above, but excluding explicitly deferred second-priority items such as SVN, LDAP, import/export tooling, and legacy external API compatibility. |
| Mechanical SPEC row count               |     ~37% | Phase -1 moved implemented application flows to `/api/v1` REST and removed runtime RPC; Phase 5B closes board/posting core rows, Phase 5C closes app search rows, and project webhook CRUD plus transfer request/accept are now implemented while many product rows remain gaps. |

Interpretation:

- The Rust port has a solid foundation for auth, workspace, organization/project ownership, issue-tracker core behavior, PR/review read surfaces, and board/posting core app behavior.
- The largest remaining gaps are still code hosting/VCS write/serve flows, PR/review merge/fork lifecycle, board/posting follow-ups, notification fan-out/read state, webhook delivery/HMAC/history, site admin, full-text/indexed search hardening, and separate migrator/external API compatibility.
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
| Foundation / DB / runtime               | [~] Mostly implemented    | Schema, migrations, `/api/v1` REST runtime, assets are strong; production migration/import/export is not.                |
| Auth / Workspace                        | [~] Partially implemented | Core account and settings flows exist; remember-me/admin approval/guest/OAuth/LDAP remain.                               |
| Organization / Project core             | [~] Partially implemented | CRUD, members, enrollment, watch/favorite, webhook CRUD, transfer request/accept basics exist; change VCS/statistics and transfer mail/repository move remain. |
| Issue tracker core                      | [~] Strong partial        | CRUD/comment/timeline/watch/vote/comment vote/label/milestone/sharer/org/user issue lists, favorite issue, direct/project sharer effects, and issue/comment mention row effects exist over `/api/v1`; legacy external REST parity is separate migrator scope. |
| VCS / Code hosting                      | [~] Started               | Read-only Git code browser plus raw/open/image file streaming, branch archive download, and numbered syntax-highlighted text rendering exists; smart HTTP, history, branch admin, and provisioning remain. |
| Pull Request / Review                   | [~] Started               | Phase 4A restores read-only project/org PR lists, PR detail, changes, and review lists; PR/review mutations remain deferred. |
| Board / Posting                         | [~] Strong partial        | Project board CRUD/comment/watch/notice/README/label flows and organization board list exist over `/api/v1`; Git README sync, issue template/file edit, and legacy external API compatibility remain. |
| Search                                  | [~] Strong partial        | Global/project/organization app search exists over `/api/v1` with all legacy result tabs, counts, snippets, pagination, and ACL filtering; full-text/indexed search and external API compatibility remain deferred. |
| Notifications / Webhooks / Admin / External REST | [~] Partially implemented | Notification inbox/list and mail queue staging exist; webhook CRUD exists while delivery/HMAC/history and admin remain gaps; `/-_-api/v1` compatibility is separate migrator scope. |

## Foundation / Deployment / DB

- [x] Rust workspace canonical root
- [x] Axum + `/api/v1` REST server
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
- [x] Favorite issue management
- [x] User aggregate issue list

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
- [x] Organization pull request list body
- [x] Organization board list body
- [x] Organization scoped search

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
- [x] Full project member management
- [x] Project delete confirmation flow
- [x] Project watchers page
- [x] Webhook CRUD
- [~] Project transfer request/accept
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
- [x] Issue detail assignee autocomplete/search
- [x] Create/edit assignee autocomplete/search
- [x] Mass update
- [x] Issue label consumption in list/detail
- [x] Issue milestone consumption in list/detail
- [x] Issue sharer direct share/unshare
- [x] Issue sharer public project target expansion
- [x] Private issue read/comment ACL for directly shared users
- [x] Parent-shared child issue read-only inheritance
- [x] Organization issue aggregate list
- [x] Comment vote
- [x] Legacy direct comment-vote POST routes
- [x] Mention autocomplete
- [x] Mention notification semantics
- [x] Shared-with-me issue filter
- [x] Sharable user autocomplete/search
- [x] Issue sharer timeline events
- [x] Issue sharer notifications
- [x] Favorite issue
- [x] User aggregate issue list
- [ ] Issue Excel export
- [ ] REST issue API parity (separate migrator/external compatibility scope)

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
- [x] Copy labels between projects

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
- [x] Milestone search result type

## Board / Posting

- [x] Project board/post list
- [x] Posting create
- [x] Posting detail
- [x] Posting update
- [x] Posting delete
- [x] Posting comment create/update/delete
- [x] Notice posts
- [x] README posting (DB-backed, no Git commit/sync)
- [x] Posting labels
- [x] Organization board list
- [x] REST board API (`/api/v1/**` only)
- [x] Dedicated board Playwright parity spec
- [ ] Git-backed README commit/sync
- [ ] Issue template edit / online code file edit through posting forms
- [ ] Legacy external `/-_-api/v1/**` board compatibility (migrator/deferred)
- [x] Posting/comment app search

## Repository / VCS / Code

- [~] Repository browser
- [x] Folder tree
- [x] File content view
- [x] Syntax highlight
- [x] Line numbers
- [x] Raw download
- [x] Image preview
- [x] Archive download
- [~] Branch/tag selector
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

- [x] PR open list
- [x] PR closed list
- [x] PR sent list
- [ ] PR creation
- [x] PR detail read
- [~] PR diff read
- [x] Project review list read
- [x] Organization PR open/closed aggregate read
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

- [x] Global search
- [x] Project scoped search
- [x] Organization scoped search
- [x] Issue result type full parity
- [x] Project result type
- [x] Posting result type
- [x] Issue comment result type
- [x] Posting comment result type
- [x] Milestone result type
- [x] Review comment result type
- [x] Result grouping/counts
- [x] Pagination/snippets/access filtering
- [ ] Full-text/index-backed search and ranking beyond legacy sort
- [ ] Legacy external search API compatibility (separate migrator/deferred scope)

## Notifications / Mail

- [x] SMTP/integration infrastructure basics
- [x] Project notification settings basics
- [x] Project watch toggle basics
- [x] Notification event list
- [~] Issue event notifications
- [ ] PR/review notifications
- [ ] Email notification fan-out parity
- [ ] BCC mode
- [~] Notification interval batching queue/drain helper
- [ ] Draft-time merge
- [ ] Recipient limit
- [ ] Mailbox/reply threading parity

## Webhooks

- [x] Webhook CRUD
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
- [ ] Issue REST API (separate migrator scope)
- [ ] Project REST API
- [ ] Board REST API
- [ ] Milestone REST API
- [ ] Watcher REST API
- [ ] Favorite REST API
