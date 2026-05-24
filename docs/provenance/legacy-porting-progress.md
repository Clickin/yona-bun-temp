# Legacy Yona Porting Progress

> Status dashboard. This document is a progress mirror for humans and agents.
> Source of truth remains `AGENTS.md`, `SPEC.md`, and the narrower provenance docs under `docs/provenance/**`.

Last updated: 2026-05-25

## Progress Estimate

| Scope                                   | Estimate | Basis                                                                                                                         |
| --------------------------------------- | -------: | ----------------------------------------------------------------------------------------------------------------------------- |
| Full legacy Yona parity                 |     ~50% | Weighted by legacy product capability, including VCS, PR/review, board, search, notifications, webhooks, admin, and separate migrator/external API compatibility. |
| Current first-priority conversion scope |     ~58% | Same as above, but excluding explicitly deferred second-priority items such as SVN, LDAP, import/export tooling, and legacy external API compatibility. |
| Mechanical SPEC row count               |     ~49% | Phase -1 moved implemented application flows to `/api/v1` REST and removed runtime RPC; Phase 3L closes Git browser/history/compare/branch-admin/provisioning/Smart HTTP transport and push post-receive rows, Phase 3N mounts the SVN auth/DAV boundary, Phase 4B closes PR interaction rows, the fork/clone slice closes native bare-repo fork creation, Phase 5B closes board/posting core rows, Phase 5C closes app search rows, and project webhook CRUD, transfer request/accept/mail, legacy project statistics shell, public `/:user` profile route, user statistics counts, plus site-admin mail/mass-mail are now implemented while many product rows remain gaps. |

Interpretation:

- The Rust port has a solid foundation for auth, workspace/public profile, organization/project ownership, issue-tracker core behavior, Git read/admin surfaces, PR/review interaction surfaces, and board/posting core app behavior.
- The largest remaining gaps are still PR/review in-app conflict resolution workflow, board/posting follow-ups, notification fan-out/mail delivery, webhook delivery hardening/history, full-text/indexed search hardening, executable SVN WebDAV bridging beyond the mounted auth/DAV boundary, and separate migrator/external API compatibility.
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
| Foundation / DB / runtime               | [~] Mostly implemented    | Schema, migrations, `/api/v1` REST runtime, assets, and config compatibility for base path/session/project default scope/project default menus/languages are strong; production migration/import/export is not. |
| Auth / Workspace                        | [~] Partially implemented | Core account, direct login/signup form posts, password-reset mail format, admin signup approval state, guest-prefix account classification, global anonymous-access gate, remember-me session persistence, login placeholder config, settings, public profile, user statistics count flows, and the legacy user attachment list exist; full guest permission matrix/OAuth/LDAP remain. |
| Organization / Project core             | [~] Partially implemented | CRUD, organization home legacy wrapper/project-list/roster anchors, members, enrollment, watch/favorite, webhook CRUD plus issue/comment, PR create/review/comment fan-out, DETAIL_HANGOUT_CHAT thread name reuse, git-push JSON fan-out, transfer request/accept/mail, change VCS shell/metadata reset, Smart HTTP clone/push transport, SVN storage creation plus `/svn/$path` auth/DAV boundary, and the legacy project statistics shell exist; executable SVN WebDAV bridging and remaining webhook delivery hardening remain. |
| Issue tracker core                      | [~] Strong partial        | CRUD/comment/timeline/watch/vote/comment vote/label/milestone/sharer/org/user issue lists, favorite issue, direct/project sharer effects, issue/comment mention row effects, and legacy `.posting-history` / `#-yona-posting-history` change-history modal anchors exist over `/api/v1`; legacy external REST parity is separate migrator scope. |
| VCS / Code hosting                      | [~] Strong partial        | Git code browser, React-side Markdown file rendering with local image path rewrite, raw/open/image streaming, archive download, syntax/line rendering, commit history/detail/compare, commit discussion with same-file multi-line code-comment selection plus comment edit/delete, branch admin, project-create provisioning, Smart HTTP upload-pack/receive-pack transport, push post-receive records/webhooks, SVN repository storage creation plus direct `/svn/$path` auth/status boundary, reviewer-threshold-gated conflict-free PR merge accept, conflict-state merge disable/help, PR source branch cleanup/restore, and PR commit-changed lifecycle records exist; executable SVN WebDAV bridging and PR in-app conflict resolution workflow remain. |
| Pull Request / Review                   | [~] Strong partial        | Phase 4A restores read surfaces, Phase 4B restores create/edit, close/reopen, review/unreview, general PR comments, and thread open/close, the fork/clone slice restores legacy `newFork` plus native bare-repo clone, merge/branch lifecycle slices restore reviewer-threshold-gated conflict-free accept plus source branch delete/restore, project settings restores default reviewer threshold lifecycle, PR detail projects required/lacking reviewer state and legacy watcher projection plus `#watch-button` watch/unwatch mutation, PR source pushes record commit-changed events/webhooks, and PR changes supports specific commit routes/filters, PRIOR selected commit outdated markers, selected commit `.commitInfo`/`.commitMsg.mt5` metadata, current-changes inline filtering that excludes outdated/commit-only review threads, legacy review-card show/hide anchors plus open/closed review-card tabs with outdated markers, and side-aware single/multi-line ranged inline comment create/edit/delete from line clicks or same-file diff text selection. Legacy generated routes expose no separate per-PR reviewer assignment endpoint beyond `ReviewApp.review`/`unreview`. |
| Board / Posting                         | [~] Strong partial        | Project board CRUD/comment/watch/notice/README/label flows, body history modal anchors, read-only Git README fallback React-side Markdown rendering, and organization board list exist over `/api/v1`; Git README write-back/sync, issue template/file edit, and legacy external API compatibility remain. |
| Search                                  | [~] Strong partial        | Global/project/organization app search exists over `/api/v1` with all legacy result tabs, counts, snippets, pagination, and ACL filtering; full-text/indexed search and external API compatibility remain deferred. |
| Notifications / Webhooks / Admin / External REST | [~] Partially implemented | Notification inbox/list with legacy route wrapper anchors and core event icon/message projection, mail queue staging/drain plus startup-scheduled due-row outbound fan-out helper, allowed-domain receiver filtering, BCC hide-address mode, recipientLimit partitioning, and preferred-language receiver grouping, site-admin mail test/mass-mail recipient lookup plus direct `/sites/mailList`, direct site-admin user/project mutation aliases, no-avatar user JSON/avatar repair, update shell plus `/sites/unwatchUpdate`, data management shell, webhook CRUD, issue/comment plus PR create/review/comment/merge/commit-changed webhook fan-out, DETAIL_HANGOUT_CHAT thread name persistence/reuse, git-push JSON webhook fan-out, and `GET /-_-api/v1/hello` external health compatibility exist while full SMTP template parity, delivery history/hardening, live update check/download, and live admin data import/export remain gaps; other `/-_-api/v1` compatibility is separate migrator scope. |

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
- [x] Runtime language configuration preservation (`application.langs` / `YONA_LANGS`)
- [x] SMTP config aliases (`YONA_SMTP_HOST`, `YONA_SMTP_PORT`, `YONA_SMTP_SSL`, `YONA_SMTP_USER`, `YONA_SMTP_PASSWORD`) for outbound sender config
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
- [x] Signup Ajax validators (`/user/isUsed`, `/user/isEmailExist`)
- [x] Direct legacy logout routes (`/users/logout`, `/logout`)
- [x] Password reset
- [x] Email verification
- [x] Profile update basics, including direct `/user/edit` route
- [x] API token reset
- [x] Auth UI capability flags
- [x] Admin signup approval
- [x] Remember-me long session parity
- [x] Direct legacy login/signup form posts (`/users/login`, `/users/signup`)
- [x] Configurable session timeout parity
- [~] Guest user prefix classification
- [~] Global anonymous-access configuration parity
- [x] Custom login placeholder configuration
- [ ] OAuth social login
- [ ] LDAP

## Workspace / User

- [x] `/me` workspace shortcut
- [x] Workspace overview shell
- [x] Recent project list basics, including direct reset route
- [x] Favorite project list basics
- [x] User settings legacy paths under `/user/editform`
- [x] Default landing direct route (`/user/defultLoginPage`)
- [x] Email management, including direct add/delete/set-main routes
- [x] Password settings, including direct reset route
- [x] Token settings, including direct `/user/editform/token_reset` route
- [x] Avatar upload/crop/display
- [x] Watched project notification preference basics
- [x] Public profile route `/:user`
- [x] User activity statistics
- [x] Legacy global user menu tab fragment (`/user/usermenuTabContentList`)
- [x] Legacy user attachment list (`/user/files`, `/api/v1/workspace/files`)
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
- [x] Update project overview (`PUT /:owner/:project` direct legacy route plus `/api/v1` overview REST)
- [x] Public/protected/private read authorization
- [x] Site-admin project read/update authorization bypass
- [x] Public project directory fixed 10-item `pageNum` pagination
- [x] Project watch toggle
- [x] Favorite project toggle
- [x] Recent project visit recording
- [x] Member list read
- [x] Full project member management, including direct `/info/leave/:owner/:project` self-leave route
- [x] Project delete confirmation flow
- [x] Project watchers page
- [x] Webhook CRUD
- [x] Project transfer request/accept/mail
- [x] Project default scope configuration (`project.default.scope.when.create` / `YONA_PROJECT_DEFAULT_SCOPE`)
- [x] Project default menu configuration and create/settings checkbox persistence (`project.creation.default.menus` / `YONA_PROJECT_DEFAULT_MENUS`)
- [~] Git/SVN type change shell, metadata toggle, README flag clear, and repository reset
- [x] Project statistics under-construction shell
- [x] Project home legacy header/menu/page shell anchors
- [x] Project home `tabId=history|dashboard` selection and legacy history/dashboard shell anchors
- [x] Project home dashboard open issue counts by label
- [x] Project home dashboard open issue counts by assignee
- [x] Project home history issue/post/pull-request activity rows
- [x] Project home history commit activity rows
- [x] Project home overview edit-flow direct route and response shape

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
- [x] Project issue list state/author/assignee/label/milestone filter form wiring
- [x] Issue sharer direct share/unshare
- [x] Issue sharer public project target expansion
- [x] Private issue read/comment ACL for directly shared users
- [x] Parent-shared child issue read-only inheritance
- [x] Organization issue aggregate list
- [x] Comment vote
- [x] Legacy direct comment-vote POST routes
- [x] Legacy direct issue comment create/update/delete form routes
- [x] Mention autocomplete
- [x] Mention notification semantics
- [x] Shared-with-me issue filter
- [x] Sharable user autocomplete/search
- [x] Issue sharer timeline events
- [x] Issue sharer notifications
- [x] Favorite issue
- [x] User aggregate issue list
- [x] Issue body change-history modal anchors
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
- [x] Legacy direct posting comment create/update/delete form routes
- [x] Notice posts
- [x] README posting (DB-backed, no Git commit/sync)
- [x] Posting labels
- [x] Organization board list
- [x] REST board API (`/api/v1/**` only)
- [x] Dedicated board Playwright parity spec
- [x] Posting body change-history modal anchors
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
- [x] Commit diff multi-line ranged code-comment selection
- [x] Commit diff inline code-comment edit
- [x] Branch management
- [x] Compare view
- [x] Bare repository creation on project create
- [x] Smart HTTP clone/pull
- [x] Smart HTTP push transport
- [x] Basic Auth/token auth for Git HTTP
- [x] Post-receive hooks/events
- [~] SVN support: storage lifecycle and `/svn/$path` auth/DAV boundary implemented; executable WebDAV bridge deferred

## Pull Request / Review

- [x] PR open list
- [x] PR closed list
- [x] PR sent list
- [x] PR creation
- [x] PR detail read
- [x] PR watcher projection + watch/unwatch mutation
- [x] PR diff read
- [x] PR changes specific commit route/filter, selected PRIOR commit outdated marker, selected commit `.commitInfo`/`.commitMsg.mt5` metadata, current-changes inline outdated-thread filtering, and review-card show/hide/open/closed outdated markers
- [x] Project review list read
- [x] Organization PR open/closed aggregate read
- [x] Open/close/reopen
- [~] Merge: reviewer-threshold-gated conflict-free native merge accept implemented; squash/strategy and in-app conflict workflow remain gaps
- [~] Merge conflict handling: native conflict detection, PR conflict state, merge disable, and help text implemented; in-app resolution remains a gap
- [x] Reviewer lifecycle: legacy has no separate per-PR assignment route beyond review/unreview, and reviewer threshold projection/settings are implemented
- [x] Required/lacking reviewer status projection
- [~] Review approve/reject
- [x] Inline review comments: side-aware single-line add/context/deleted create/edit/delete and same-file text-selection multi-line creation implemented
- [x] Review thread lifecycle
- [~] Fork and PR workflow: fork form/clone, reviewer-threshold-gated conflict-free merge accept, conflict-state merge disable/help, source branch cleanup/restore, and PR commit-changed lifecycle implemented; in-app conflict resolution workflow remains a gap
- [x] Source branch cleanup

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
- [x] Legacy `YONA_SMTP_*` environment aliases for mail configuration and delivery
- [x] Project notification settings basics
- [x] Project watch toggle basics
- [x] Notification event list and legacy `/notification` + `/notifications` route shell parity
- [~] Issue/post/comment event notifications: mention/direct notification rows and single/mass-update issue state-change receiver fan-out exist, list messages follow legacy `NotificationEvent.getMessage` direct payload/state projection, and full mail/delivery parity remains
- [~] PR/review notifications: PR receivers now include review comment authors via legacy watcher participation and active users mentioned in the PR body, and list projection uses legacy PR state/review/thread message keys/icons; full mail/delivery parity remains
- [~] Email notification fan-out parity: startup scheduler, due-row outbound fan-out, allowed sending-domain filtering, BCC hide-address mode, recipientLimit partitioning, and preferred-language receiver grouping exist; template parity remains
- [x] BCC mode
- [x] Notification interval batching scheduler and queue/drain helper
- [x] Draft-time merge
- [x] Recipient limit
- [x] Issue comment `original_email` / `data-via-email` marker parity
- [x] Board comment `original_email` / `data-via-email` marker parity
- [x] Code discussion and PR review comment `original_email` / `data-via-email` marker parity
- [x] Mailbox plus-address detail parser parity
- [x] Mailbox DB-backed `CreationViaEmailTest` resource creation parity for issue, issue comment, and review comment
- [ ] Mailbox/reply threading parity

## Webhooks

- [x] Webhook CRUD
- [~] Event payload generation
- [~] Secret token header
- [x] Issue event type
- [x] Pull request event type list projection
- [x] Comment event type
- [x] Review event type
- [x] Hangout Chat thread id persistence/reuse
- [ ] Delivery history/retry behavior

## Attachments / Files

- [x] File upload endpoint
- [x] File list endpoint for `yobi.Files` / `yobi.Attachments` (`GET /files?containerType=&containerId=` → `attachments` / `tempFiles`)
- [x] File download endpoint, including legacy `GET /files/:id/` alias
- [x] Avatar attachment flow
- [~] Issue attachment binding
- [~] Issue comment attachment binding
- [~] Milestone attachment binding
- [x] File delete authorization, including legacy `POST /files/:id/` `_method=delete` alias
- [~] Full container type parity across issue/board/PR/project (legacy enum names and current-user temporary binding for issue/board/PR/milestone; project logo/deferred containers remain)
- [x] Global file size policy parity
- [x] MIME validation/detection parity for uploaded attachments

## Site Admin

- [x] User list/manage/search (`/sites/userList` core UI + `/api/v1/site/users`)
- [x] Admin/guest/account-lock/password-reset/delete actions (`/sites/userList` action controls, `/sites/toggleSiteAdminRole/:loginId`, `/sites/toggleAccountLock`, `/sites/toggleGuestMode`, `POST /:user`, `/sites/user/delete:id`, and `/api/v1/site/users/:loginId*`)
- [x] Project list/manage/delete (`/sites/projectList` + `/api/v1/site/projects`)
- [x] Site-wide posting list (`/sites/postList` + `/api/v1/site/posts`)
- [x] Site-wide issue list (`/sites/issueList` + `/api/v1/site/issues`)
- [x] System diagnostics (`/sites/diagnostic` + `/api/v1/site/diagnostics`)
- [x] Mail settings/test/mass mail (`/sites/mail`, `/sites/massmail`, `/sites/mailList`, `/api/v1/site/mail*`)
- [x] Update shell and notification hide (`/sites/update` legacy sidebar/title/no-update surface; `POST /sites/unwatchUpdate`)
- [x] Data management shell (`/sites/data` legacy warning/export/import surface)
- [x] No-avatar user JSON/avatar repair (`/sites/noAvatarUsers`, `/sites/setAttachmentToUserAvatar`, `/api/v1/site/no-avatar-users`, `/api/v1/site/users/avatar-from-attachment`)
- [x] Unknown `/sites/:pageName` fallback no longer renders a porting placeholder; legacy compiled routes have no catch-all site-admin page, so unmatched site pages close with the shared not-found shell
- [ ] Data import/export (deferred)
- [ ] Live update check/download (deferred)

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
- [x] Code-browser Markdown files render in React with legacy `.codebrowser-markdown` while the REST payload rewrites local `./...` image paths to the project file route as Markdown
- [x] Project-home Git README fallback renders in React with the legacy readme body wrapper while the REST payload rewrites local images/normal links to project file/code routes as Markdown
- [x] Legacy `POST /markdown/:owner/:project` preview renderer returns raw sanitized project-context HTML
- [x] Readable issue references expose title/state metadata on project Markdown render paths
- [ ] Full legacy/GFM extension parity
- [~] Remaining legacy autolink edge-case parity if evidence requires it
- [~] Full Highlight.js-equivalent language coverage for Markdown code blocks
- [~] Task checklist progress-bar integration polish

## REST API Compatibility

- [x] `GET /-_-api/v1/hello`
- [ ] User REST APIs
- [ ] Issue REST API (separate migrator scope)
- [ ] Project REST API
- [ ] Board REST API
- [ ] Milestone REST API
- [ ] Watcher REST API
- [ ] Favorite REST API
