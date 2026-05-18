# Legacy Yona Porting Progress

> Status dashboard. This document is a progress mirror for humans and agents.
> Source of truth remains `AGENTS.md`, `SPEC.md`, and the narrower provenance docs under `docs/provenance/**`.

Last updated: 2026-05-18

## Progress Estimate

| Scope                                   | Estimate | Basis                                                                                                                         |
| --------------------------------------- | -------: | ----------------------------------------------------------------------------------------------------------------------------- |
| Full legacy Yona parity                 |     ~49% | Weighted by legacy product capability, including VCS, PR/review, board, search, notifications, webhooks, admin, and separate migrator/external API compatibility. |
| Current first-priority conversion scope |     ~57% | Same as above, but excluding explicitly deferred second-priority items such as SVN, LDAP, import/export tooling, and legacy external API compatibility. |
| Mechanical SPEC row count               |     ~47% | Phase -1 moved implemented application flows to `/api/v1` REST and removed runtime RPC; Phase 3J closes Git browser/history/compare/branch-admin/provisioning rows, Phase 4B closes PR interaction rows, Phase 5B closes board/posting core rows, Phase 5C closes app search rows, and project webhook CRUD, transfer request/accept/mail, legacy project statistics shell, public `/:user` profile route, user statistics counts, plus site-admin mail/mass-mail are now implemented while many product rows remain gaps. |

Interpretation:

- The Rust port has a solid foundation for auth, workspace/public profile, organization/project ownership, issue-tracker core behavior, Git read/admin surfaces, PR/review interaction surfaces, and board/posting core app behavior.
- The largest remaining gaps are still Smart HTTP Git serve/write flows, PR/review merge/fork/reviewer lifecycle and ranged inline review CRUD, board/posting follow-ups, notification fan-out/read state, push/remaining PR webhook payload delivery plus delivery hardening/history, full-text/indexed search hardening, and separate migrator/external API compatibility.
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
| Auth / Workspace                        | [~] Partially implemented | Core account, password-reset mail format, admin signup approval state, guest-prefix account classification, global anonymous-access gate, remember-me session persistence, login placeholder config, settings, public profile, and user statistics count flows exist; full guest permission matrix/OAuth/LDAP remain. |
| Organization / Project core             | [~] Partially implemented | CRUD, members, enrollment, watch/favorite, webhook CRUD plus issue/comment and PR create/review/comment fan-out, transfer request/accept/mail, change VCS shell/metadata reset, and the legacy project statistics shell exist; Smart HTTP clone URL behavior, SVN executable-backed serve, and remaining webhook delivery hardening remain. |
| Issue tracker core                      | [~] Strong partial        | CRUD/comment/timeline/watch/vote/comment vote/label/milestone/sharer/org/user issue lists, favorite issue, direct/project sharer effects, and issue/comment mention row effects exist over `/api/v1`; legacy external REST parity is separate migrator scope. |
| VCS / Code hosting                      | [~] Strong partial        | Git code browser, Markdown file rendering with local image path rewrite, raw/open/image streaming, archive download, syntax/line rendering, commit history/detail/compare, commit discussion, branch admin, and project-create provisioning exist; Smart HTTP, push hooks, and SVN remain. |
| Pull Request / Review                   | [~] Strong partial        | Phase 4A restores read surfaces and Phase 4B restores create/edit, close/reopen, review/unreview, general PR comments, and thread open/close; merge/fork/reviewer lifecycle/ranged inline CRUD remain. |
| Board / Posting                         | [~] Strong partial        | Project board CRUD/comment/watch/notice/README/label flows, read-only Git README fallback rendering, and organization board list exist over `/api/v1`; Git README write-back/sync, issue template/file edit, and legacy external API compatibility remain. |
| Search                                  | [~] Strong partial        | Global/project/organization app search exists over `/api/v1` with all legacy result tabs, counts, snippets, pagination, and ACL filtering; full-text/indexed search and external API compatibility remain deferred. |
| Notifications / Webhooks / Admin / External REST | [~] Partially implemented | Notification inbox/list with legacy route wrapper anchors, mail queue staging, site-admin mail test/mass-mail recipient lookup, webhook CRUD, and issue/comment plus PR create/review/comment webhook fan-out exist while full SMTP batching, push JSON, PR merge/commit-changed delivery, delivery history/hardening, and admin update/data management remain gaps; `/-_-api/v1` compatibility is separate migrator scope. |

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
- [x] Legacy login failure message keys
- [x] Signup
- [x] Signup duplicate login/email rejection
- [x] Password reset
- [x] Email verification
- [x] Profile update basics
- [x] API token reset
- [x] Auth UI capability flags
- [x] Admin signup approval
- [x] Remember-me long session parity
- [ ] Configurable session timeout parity
- [~] Guest user prefix classification
- [~] Global anonymous-access configuration parity
- [x] Custom login placeholder configuration
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
- [x] Public profile route `/:user`
- [x] User activity statistics
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
- [x] Project transfer request/accept/mail
- [~] Git/SVN type change shell, metadata toggle, README flag clear, and repository reset
- [x] Project statistics under-construction shell
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

- [x] Repository browser
- [x] Folder tree
- [x] File content view
- [x] Syntax highlight
- [x] Line numbers
- [x] Raw download
- [x] Image preview
- [x] Archive download
- [~] Branch/tag selector
- [x] Commit history
- [x] Commit detail/diff
- [x] Commit comments
- [x] Branch management
- [x] Compare view
- [x] Bare repository creation on project create
- [ ] Smart HTTP clone/pull
- [ ] Smart HTTP push
- [ ] Basic Auth/token auth for Git HTTP
- [ ] Post-receive hooks/events
- [ ] SVN support (deferred)

## Pull Request / Review

- [x] PR open list
- [x] PR closed list
- [x] PR sent list
- [x] PR creation
- [x] PR detail read
- [x] PR diff read
- [x] Project review list read
- [x] Organization PR open/closed aggregate read
- [x] Open/close/reopen
- [ ] Merge
- [ ] Merge conflict handling
- [ ] Reviewer assignment
- [~] Review approve/reject
- [~] Inline review comments
- [x] Review thread lifecycle
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
- [~] Event payload generation
- [~] Secret token header
- [x] Issue event type
- [~] Pull request event type
- [x] Comment event type
- [x] Review event type
- [ ] Delivery history/retry behavior

## Attachments / Files

- [x] File upload endpoint
- [x] File download endpoint
- [x] Avatar attachment flow
- [~] Issue attachment binding
- [~] Issue comment attachment binding
- [~] Milestone attachment binding
- [x] File delete authorization
- [~] Full container type parity across issue/board/PR/project (legacy enum names and current-user temporary binding for issue/board/PR/milestone; project logo/deferred containers remain)
- [x] Global file size policy parity
- [ ] MIME validation parity for all containers

## Site Admin

- [x] User list/manage/search (`/sites/userList` core UI + `/api/v1/site/users`)
- [x] Admin/guest/account-lock/password-reset/delete actions (`/sites/userList` action controls + `/api/v1/site/users/:loginId*`)
- [x] Project list/manage/delete (`/sites/projectList` + `/api/v1/site/projects`)
- [x] Site-wide posting list (`/sites/postList` + `/api/v1/site/posts`)
- [x] Site-wide issue list (`/sites/issueList` + `/api/v1/site/issues`)
- [x] System diagnostics (`/sites/diagnostic` + `/api/v1/site/diagnostics`)
- [x] Mail settings/test/mass mail (`/sites/mail`, `/sites/massmail`, `/api/v1/site/mail*`)
- [ ] Data import/export (deferred)
- [ ] Update check (deferred)

## Markdown

- [x] Basic Markdown rendering on issue surfaces
- [x] Basic Markdown rendering on milestone surfaces
- [x] HTML sanitization on implemented render path
- [x] Basic project Markdown autolinks for `@username`, same-project `#123`, and `owner/project#123` on issue/post/milestone bodies and comments, PR bodies/general review comments, Git non-ranged commit comments, and preview output
- [x] Basic bare `http://`/`https://`, `ftp://`, `www.`, and email autolinks on the project Markdown render path
- [x] Legacy marked-style soft line breaks render as `<br>` on the project Markdown render path
- [x] Basic task checklist rendering with sanitized disabled checkboxes
- [x] Basic safe inline image rendering on the project Markdown render path
- [x] Basic fenced-code token highlighting on the project Markdown render path
- [x] Code-browser Markdown files render with legacy `.codebrowser-markdown` and rewrite local `./...` image paths to the project file route
- [x] Project-home Git README fallback renders with the legacy readme body wrapper and rewrites local images/normal links to project file/code routes
- [x] Legacy `POST /markdown/:owner/:project` preview renderer returns raw sanitized project-context HTML
- [ ] Full legacy/GFM extension parity
- [~] Legacy issue-link title/state enrichment
- [~] Remaining legacy autolink edge-case parity if evidence requires it
- [~] Full Highlight.js-equivalent language coverage for Markdown code blocks
- [~] Task checklist progress-bar integration polish

## REST API Compatibility

- [ ] `GET /-_-api/v1/hello`
- [ ] User REST APIs
- [ ] Issue REST API (separate migrator scope)
- [ ] Project REST API
- [ ] Board REST API
- [ ] Milestone REST API
- [ ] Watcher REST API
- [ ] Favorite REST API
