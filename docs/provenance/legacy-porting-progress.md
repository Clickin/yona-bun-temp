# Legacy Yona Porting Progress

> Status dashboard. This document is a progress mirror for humans and agents.
> Source of truth remains `AGENTS.md`, `SPEC.md`, and the narrower provenance docs under `docs/provenance/**`.

Last updated: 2026-06-01

## Progress Estimate

| Scope                                   | Estimate | Basis                                                                                                                         |
| --------------------------------------- | -------: | ----------------------------------------------------------------------------------------------------------------------------- |
| Full legacy Yona parity                 |     ~50% | Weighted by legacy product capability, including VCS, PR/review, board, search, notifications, webhooks, admin, and separate migrator/external API compatibility. |
| Current first-priority conversion scope |     ~58% | Same as above, but excluding explicitly deferred second-priority items such as remaining broader SVN edge work, LDAP, import/export tooling, and legacy external API compatibility. |
| Mechanical SPEC row count               |     ~49% | Phase -1 moved implemented application flows to `/api/v1` REST and removed runtime RPC; Phase 3L closes Git browser/history/compare/branch-admin/provisioning/Smart HTTP transport and push post-receive rows, Phase 3N mounts the SVN auth/DAV boundary, Phase 4B closes PR interaction rows, the fork/clone slice closes native bare-repo fork creation, Phase 5B closes board/posting core rows, Phase 5C closes app search rows, and project webhook CRUD, transfer request/accept/mail, legacy project statistics shell, public `/:user` profile route, user statistics counts, plus site-admin mail/mass-mail are now implemented while many product rows remain gaps. |

Interpretation:

- The Rust port has a solid foundation for auth, workspace/public profile, organization/project ownership, issue-tracker core behavior, Git read/admin surfaces, PR/review interaction surfaces including create/edit merge preflight, and board/posting core app behavior.
- SVN executable bridge parity now has current local `svn`/`svnadmin`/`svnlook` 1.14.5 verification: `svn_protocol_contract` passes all 35 mounted DAV/external-client smokes.
- The largest remaining gaps are still board/posting follow-ups, optional webhook signature compatibility if external evidence requires it, full-text/indexed search hardening, broader VCC/baseline PROPFIND edge completeness beyond the mounted auth/DAV, and separate migrator/external API compatibility.
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
| Organization / Project core             | [~] Partially implemented | CRUD, organization home legacy wrapper/project-list/roster anchors, project create legacy shell/menu/scope-radio/select2 owner/VCS anchors with `/projects/new?owner=` and `/_import?owner=` owner handoff, legacy `/_import` Git import form shell plus native `git clone --bare` import mutation into ID-based storage, direct SVN provisioning, members, enrollment, watch/favorite, webhook CRUD plus issue/comment, PR create/review/comment fan-out, DETAIL_HANGOUT_CHAT thread name reuse, git-push JSON fan-out, HTTP/HTTPS webhook delivery, transfer request/accept/mail, change VCS shell/metadata reset, Smart HTTP clone/push transport, SVN storage creation plus `/svn/$path` auth/DAV boundary, WebDAV `OPTIONS` capability response, `DAV: 1,2`/`MS-Author-Via: DAV` discovery headers, root `PROPFIND`, default VCC `PROPFIND` multistatus with executable-backed youngest revision and repository UUID metadata plus baseline resource `PROPFIND` verified with local `svnlook` 1.14.5, executable `GET`/`HEAD` file content, file `PROPFIND` content-length/content-type/etag/displayname/supportedlock/version/checked-in/baseline-relative-path metadata plus live/custom property value/name projection for normal and `!svn/rvr`/`!svn/bc`/`!svn/ver` revision resources via `svnlook cat`/`youngest`, Label revision selection for root/VCC/file `PROPFIND`, request-aware collection tree and revision-pinned baseline collection `PROPFIND` directory/child metadata plus child file content-type/etag/displayname/supportedlock/version/checked-in metadata via `svnlook tree`/`youngest`, collection `Depth: 0`/`Depth: infinity` handling, `log-report`/`dated-rev-report` revision metadata via `svnlook log`/`author`/`date`, `get-locks-report` lock metadata via `svnlook lock`, `get-locations-report`/`get-location-segments-report` path metadata plus copied-path ancestry via `svnlook cat`/`tree`/`changed --copy-info`, `update-report` checkout/update/switch target revision/file fetch metadata plus send-all txdelta diff payloads via `svnlook tree`/`cat`, `file-revs-report` file revision metadata plus txdelta content via `svnlook log`/`cat`, `mergeinfo-report` mergeinfo metadata via `svnlook propget`, `get-deleted-rev-report` deleted-path revision lookup via `svnlook` path existence, `list-report` directory entry metadata via `svnlook tree`/`cat`, `inherited-props-report` inherited regular property metadata via `svnlook proplist`/`propget`, WebDAV `LOCK`/`UNLOCK` via `svnadmin lock`/`unlock`, WebDAV `PUT` file updates, `DELETE` removals, `MKCOL` collection creation, `PROPPATCH` property set/remove, `MKACTIVITY`/`CHECKOUT`/`MERGE` commit choreography via `svn checkout`/`commit`, actual external `svn info`/recursive-svn-ls/`svn ls`/revision-pinned `svn cat -r`/`svn cat`/`svn log`/`svn blame`/`svn diff`/export/revision-pinned-checkout/checkout/commit/switch/update/add/delete/mkdir/direct-url-mkdir/direct-url-delete/direct-url-import/direct-url-file-copy/direct-url-directory-copy/direct-url-file-move/direct-url-directory-move/property/direct-file-url-property/lock/copy/move/mergeinfo HTTP smoke coverage, and the legacy project statistics shell exist; remaining broader VCC/baseline PROPFIND edge completeness remains. |
| Issue tracker core                      | [~] Strong partial        | CRUD/comment/timeline/watch/vote/comment vote/label/milestone/sharer/org/user issue lists, favorite issue, direct/project sharer effects, issue/comment mention row effects, and legacy `.posting-history` / `#-yona-posting-history` change-history modal anchors exist over `/api/v1`; legacy external REST parity is separate migrator scope. |
| VCS / Code hosting                      | [~] Strong partial        | Git code browser with branch/tag selector refs, React-side Markdown file rendering with local image path rewrite, raw/open/image streaming, archive download, syntax/line rendering, commit history/detail/compare, commit diff file added/deleted counts plus inline commentable row triggers, commit discussion with same-file multi-line code-comment selection plus comment edit/delete, branch admin, Git and SVN project-create provisioning from the legacy VCS selector, Smart HTTP upload-pack/receive-pack transport, push post-receive records/webhooks, SVN repository storage creation plus direct `/svn/$path` auth/status boundary, WebDAV `OPTIONS` capability response, `DAV: 1,2`/`MS-Author-Via: DAV` discovery headers, root `PROPFIND`, default VCC `PROPFIND` multistatus with executable-backed youngest revision and repository UUID metadata plus baseline resource `PROPFIND` verified with local `svnlook` 1.14.5, read-only `GET`/`HEAD` file content, file `PROPFIND` content-length/content-type/etag/displayname/supportedlock/version/checked-in/baseline-relative-path metadata plus live/custom property value/name projection for normal and `!svn/rvr`/`!svn/bc`/`!svn/ver` revision resources via `svnlook cat`/`youngest`, request-aware collection tree and revision-pinned baseline collection `PROPFIND` directory/child metadata plus child file content-type/etag/displayname/supportedlock/version/checked-in metadata via `svnlook tree`/`youngest`, collection `Depth: 0`/`Depth: infinity` handling, `log-report`/`dated-rev-report` revision metadata via `svnlook log`/`author`/`date`, `get-locks-report` lock metadata via `svnlook lock`, `get-locations-report`/`get-location-segments-report` path metadata plus copied-path ancestry via `svnlook cat`/`tree`/`changed --copy-info`, read-only `update-report` checkout/update/switch target revision/file fetch metadata via `svnlook tree`, `file-revs-report` file revision metadata plus txdelta content via `svnlook log`/`cat`, `mergeinfo-report` mergeinfo metadata via `svnlook propget`, `get-deleted-rev-report` deleted-path revision lookup via `svnlook` path existence, `list-report` directory entry metadata via `svnlook tree`/`cat`, `inherited-props-report` inherited regular property metadata via `svnlook proplist`/`propget`, WebDAV `LOCK`/`UNLOCK` via `svnadmin lock`/`unlock`, WebDAV `PUT` file updates, `DELETE` removals, `MKCOL` collection creation, `PROPPATCH` property set/remove, `MKACTIVITY`/`CHECKOUT`/`MERGE` commit choreography via `svn checkout`/`commit`, actual external `svn info`/recursive-svn-ls/`svn ls`/revision-pinned `svn cat -r`/`svn cat`/`svn log`/`svn blame`/`svn diff`/export/revision-pinned-checkout/checkout/commit/`svn status -u`/switch/update/add/delete/mkdir/direct-url-mkdir/direct-url-delete/direct-url-import/direct-url-file-copy/direct-url-directory-copy/direct-url-file-move/direct-url-directory-move/property/direct-file-url-property/lock/copy/move/mergeinfo HTTP smoke coverage, reviewer-threshold-gated conflict-free PR merge accept, conflict-state merge disable/help, PR source branch cleanup/restore, and PR commit-changed lifecycle records exist; remaining broader VCC/baseline PROPFIND edge completeness remains. |
| Pull Request / Review                   | [~] Strong partial        | Phase 4A restores read surfaces, Phase 4B restores create/edit, close/reopen, review/unreview, general PR comments, and thread open/close, the fork/clone slice restores legacy `newFork` plus native bare-repo clone, merge/branch lifecycle slices restore reviewer-threshold-gated conflict-free accept plus source branch delete/restore, PR create/edit forms restore legacy `mergeResultURL` preflight anchors (`#__commits`, `#numOfCommits`, `#mergeResult`) backed by a non-mutating native Git preview endpoint, project settings restores default reviewer threshold lifecycle, PR detail projects required/lacking reviewer state and legacy watcher projection plus `#watch-button` watch/unwatch mutation, PR source pushes record commit-changed events/webhooks, project review list restores the legacy `format=xls` Excel-compatible export action, and PR changes supports specific commit routes/filters, PRIOR selected commit outdated markers, selected commit `.commitInfo`/`.commitMsg.mt5` metadata, current-changes inline filtering that excludes outdated/commit-only review threads, legacy review-card show/hide anchors plus open/closed review-card tabs with outdated markers, and side-aware single/multi-line ranged inline comment create/edit/delete from line clicks or same-file diff text selection. Legacy generated routes expose no separate per-PR reviewer assignment endpoint beyond `ReviewApp.review`/`unreview`. |
| Board / Posting                         | [~] Strong partial        | Project board CRUD/comment/watch/notice/README/label flows, body history modal anchors, Git README fallback/write-back React-side Markdown rendering, issue template edit, online code file create/edit, and organization board list exist over `/api/v1`; legacy external API compatibility remains migrator/deferred scope. |
| Search                                  | [~] Strong partial        | Global/project/organization app search exists over `/api/v1` with all legacy result tabs, counts, snippets, pagination, ACL filtering, lightweight relevance ordering, and borrowed legacy `SearchResultTests` coverage for Korean snippet boundaries; full-text/indexed search and external API compatibility remain deferred. |
| Markdown rendering                      | [~] Strong partial        | React-side Markdown now follows legacy `marked` behavior for heading ids, inline links/images, reference links, issue/mention/commit autolinks, case-insensitive bare URL schemes, extended bare email autolinks, tables, lists, task lists, blockquotes, code fences, and common syntax highlighting aliases including Go, C#, Elixir, Haskell, Lua, CMake, Gradle, Makefile, Perl, Basic, AsciiDoc, Arduino, CoffeeScript, and XML/HTML; full GFM/Highlight.js breadth remains follow-up. |
| Notifications / Webhooks / Admin / External REST | [~] Partially implemented | Notification inbox/list with legacy route wrapper anchors and core event icon/message projection, mail queue staging/drain plus startup-scheduled due-row outbound fan-out helper, allowed-domain receiver filtering, BCC hide-address mode, recipientLimit partitioning, preferred-language receiver grouping, legacy external-link `noreferrer` handling for notification mail HTML, legacy `notificationMail.scala.html` body shell/view-link/resource-unwatch/settings-footer structure, DB-backed mailbox creation/reply target orchestration including legacy enum-style recipient detail resource names, executable-backed mailbox polling through `YONA_MAILBOX_FETCH_COMMAND`, site-admin mail test/mass-mail recipient lookup plus direct `/sites/mailList`, direct site-admin user/project mutation aliases, no-avatar user JSON/avatar repair, configured update status/download-link shell plus metadata URL/file discovery, `/sites/update/download` app-owned redirect, `/sites/update/download-file` file/plain-HTTP/HTTPS binary proxy, and `/sites/unwatchUpdate`, data management shell plus site-admin-only `/sites/export` `yobi-data-*.json` download with post/issue/comment attachment metadata, optional portable attachment `contentBase64` payloads, and issue milestone titles, and `/sites/import` supported user/project/post/issue body metadata plus post/issue label/comment/body-history/milestone-title/existing attachment-id relationship and portable attachment file restore, webhook CRUD, issue/comment plus PR create/review/comment/merge/commit-changed webhook fan-out, DETAIL_HANGOUT_CHAT thread name persistence/reuse, git-push JSON webhook fan-out, webhook delivery history rows/settings read surface, webhook retry behavior, private/internal endpoint delivery guard, HTTP/HTTPS delivery, and `GET /-_-api/v1/hello` external health compatibility exist; other `/-_-api/v1` compatibility is separate migrator scope. |

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
- [ ] Production migration/import tooling and full-fidelity restore tooling
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
- [x] Project Git import form and clone mutation (`/_import` preserves legacy `project/importing.scala.html` anchors and owner handoff; `POST /_import` creates the project/menu settings and clones the supplied Git source into ID-based bare storage through native `git clone --bare`)
- [x] Project settings legacy shell anchors (`project/setting.scala.html`: `#saveSetting`, `.bubble-wrap.gray`, `.setting-box`, project scope/code-access radios, reviewer count panel, menu checkbox layout, `#save`)
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
- [x] Issue Excel export: legacy `/:owner/:project/issues?format=xls` link restored with the project issue list filters and Excel-compatible `.xls` download response
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
- [x] REST milestone API parity (`/api/v1/**` app runtime)
- [ ] Milestone migration/export parity (deferred migrator scope)
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
- [x] Git-backed README commit/sync
- [x] Issue template edit / online code file edit through posting forms
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
- [x] Branch/tag selector refs on code browser/history/detail read surfaces
- [x] Commit history
- [x] Commit detail/diff
- [x] Commit diff file added/deleted line counts and inline commentable row triggers
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
- [~] SVN support: storage lifecycle, `/svn/$path` auth/DAV boundary, WebDAV `OPTIONS` capability response, `DAV: 1,2`/`MS-Author-Via: DAV` discovery headers, root `PROPFIND`, default VCC `PROPFIND` multistatus with executable-backed youngest or Label-selected revision and repository UUID metadata plus baseline resource `PROPFIND` when `svnlook` is available, root/default VCC `activity-collection-set` discovery, root/default VCC/baseline `supported-report-set` REPORT discovery, executable `GET`/`HEAD` file content, file `PROPFIND` content-length/content-type/etag/displayname/supportedlock/version/checked-in/baseline-relative-path metadata plus requested `creationdate`/`creator-displayname`/`getlastmodified`, live/custom property value/name projection for normal and `!svn/rvr`/`!svn/bc`/`!svn/ver` revision resources via `svnlook cat`/`youngest`/`log`, request-aware default VCC child file and collection metadata projection with requested `!svn/vcc/default/<path>` href preservation, request-aware VCC file metadata projection plus default VCC requested `creationdate`/`creator-displayname`/`getlastmodified`, request-aware collection tree and revision-pinned baseline collection `PROPFIND` directory/child metadata plus child file content-type/etag/displayname/supportedlock/version/checked-in and requested `creationdate`/`creator-displayname`/`getlastmodified` metadata on collection and child-file responses via `svnlook tree`/`youngest`/`log`, baseline resource requested `creationdate`/`creator-displayname`/`getlastmodified`/`repository-uuid`, collection `Depth: 0`/`Depth: infinity` handling, `log-report`/`dated-rev-report` revision metadata via `svnlook log`/`author`/`date`, `get-locks-report` lock metadata via `svnlook lock`, `get-locations-report`/`get-location-segments-report` metadata and copied-path ancestry via `svnlook cat`/`tree`/`changed --copy-info`, `update-report` checkout/update/switch target revision/file fetch metadata plus send-all txdelta diff payloads via `svnlook tree`/`cat`, `file-revs-report` file revision metadata plus txdelta content via `svnlook log`/`cat`, `mergeinfo-report` mergeinfo metadata via `svnlook propget`, `get-deleted-rev-report` deleted-path revision lookup via `svnlook` path existence, `list-report` directory entry metadata via `svnlook tree`/`cat`, `inherited-props-report` inherited regular property metadata via `svnlook proplist`/`propget`, WebDAV `LOCK`/`UNLOCK` via `svnadmin lock`/`unlock`, WebDAV `PUT` file updates, `DELETE` removals, `MKCOL` collection creation, `PROPPATCH` property set/remove, `MKACTIVITY`/`CHECKOUT`/`MERGE` commit choreography via `svn checkout`/`commit`, and actual external `svn info`/recursive-svn-ls/`svn ls`/revision-pinned `svn cat -r`/`svn cat`/`svn log`/`svn blame`/`svn diff`/export/revision-pinned-checkout/checkout/commit/`svn status -u`/switch/update/add/delete/mkdir/direct-url-mkdir/direct-url-delete/direct-url-import/direct-url-file-copy/direct-url-directory-copy/direct-url-file-move/direct-url-directory-move/property/direct-file-url-property/lock/copy/move/mergeinfo HTTP smoke coverage implemented; broader VCC/baseline PROPFIND edge completeness remains deferred
- [x] External `svn checkout --depth empty` smoke coverage against `/svn/$path`, proving depth-limited checkout creates only the working-copy root and suppresses direct files/directories with the installed native client.
- [x] External `svn checkout --depth files` smoke coverage against `/svn/$path`, proving depth-limited checkout materializes direct files and suppresses child directories with the installed native client.
- [x] External `svn checkout --depth immediates` smoke coverage against `/svn/$path`, proving non-recursive update-report directory entries expose checked-in metadata, materialize direct child directories, and suppress nested files with the installed native client.

## Pull Request / Review

- [x] PR open list
- [x] PR closed list
- [x] PR sent list
- [x] PR creation
- [x] PR create/edit merge preflight `mergeResultURL` / `#mergeResult` / `#numOfCommits`
- [x] PR detail read
- [x] PR watcher projection + watch/unwatch mutation
- [x] PR diff read
- [x] PR changes specific commit route/filter, selected PRIOR commit outdated marker, selected commit `.commitInfo`/`.commitMsg.mt5` metadata, current-changes inline outdated-thread filtering, and review-card show/hide/open/closed outdated markers
- [x] Project review list read and legacy `format=xls` Excel-compatible export
- [x] Organization PR open/closed aggregate read
- [x] Open/close/reopen
- [x] Merge: reviewer-threshold-gated conflict-free native merge accept implemented; legacy route/view evidence exposes only `#btnAccept` and no squash/strategy selector
- [x] Merge conflict handling: native conflict detection, PR conflict state, create/edit non-mutating merge preview, merge disable, and legacy `.howto-resolve-conflict` contributor guide implemented; no separate in-app conflict editor route/test is present in legacy evidence
- [x] Reviewer lifecycle: legacy has no separate per-PR assignment route beyond review/unreview, and reviewer threshold projection/settings are implemented
- [x] Required/lacking reviewer status projection
- [x] Review approve/reject reclassified: legacy routes/tests expose review/unreview reviewer membership, not a separate approve/reject action, and Rust covers review/unreview events plus required/lacking reviewer status
- [x] Inline review comments: side-aware single-line add/context/deleted create/edit/delete and same-file text-selection multi-line creation implemented
- [x] Review thread lifecycle
- [x] Fork and PR workflow: fork form/clone, reviewer-threshold-gated conflict-free merge accept, conflict-state merge disable/help, source branch cleanup/restore, and PR commit-changed lifecycle implemented
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
- [x] Legacy Korean snippet window and overlap behavior borrowed from `SearchResultTests`
- [x] Legacy issue, issue-comment, post, post-comment, milestone, and review search public/private ACL behavior borrowed from `SearchTests`
- [x] Legacy protected project issue/issue-comment/post/post-comment/milestone/review search ACL borrowed from `SearchTests`: anonymous/outsider users see public resources only, while organization members also see protected resources.
- [x] Legacy project-scoped issue/issue-comment/post/post-comment/milestone/review search borrowed from `SearchTests`: read-authorized public/protected/private project searches stay bound to the selected project and return matching resources.
- [x] Legacy organization-scoped issue/issue-comment/post/post-comment/milestone/review search borrowed from `SearchTests`: group search excludes matching personal projects and applies public/protected organization visibility.
- [x] Legacy user search by login ID and display name borrowed from `SearchTests.findUsersByLoginId` / `findUsersByName`
- [ ] Full-text/index-backed search, async indexing, and index-backed ranking beyond the lightweight scorer
- [ ] Legacy external search API compatibility (separate migrator/deferred scope)

## Notifications / Mail

- [x] SMTP/integration infrastructure basics
- [x] Legacy `YONA_SMTP_*` environment aliases for mail configuration and delivery
- [x] Project notification settings basics
- [x] Project watch toggle basics
- [x] Notification event list and legacy `/notification` + `/notifications` route shell parity
- [~] Issue/post/comment event notifications: mention/direct notification rows and single/mass-update issue state-change receiver fan-out exist, list messages follow legacy `NotificationEvent.getMessage` direct payload/state projection, and full mail/delivery parity remains
- [~] PR/review notifications: PR receivers now include review comment authors via legacy watcher participation and active users mentioned in the PR body, and list projection uses legacy PR state/review/thread message keys/icons; full mail/delivery parity remains
- [x] Email notification fan-out and mailbox polling parity: startup scheduler, due-row outbound fan-out, allowed sending-domain filtering, BCC hide-address mode, recipientLimit partitioning, preferred-language receiver grouping, legacy `NotificationMail.handleLinks` external-link `noreferrer` handling, the legacy `notificationMail.scala.html` HTML shell/view-link/resource-unwatch/settings-footer body, and executable-backed mailbox polling over NUL-separated raw RFC822 messages exist
- [x] BCC mode
- [x] Notification interval batching scheduler and queue/drain helper
- [x] Draft-time merge
- [x] Recipient limit
- [x] Issue comment `original_email` / `data-via-email` marker parity
- [x] Board comment `original_email` / `data-via-email` marker parity
- [x] Code discussion and PR review comment `original_email` / `data-via-email` marker parity
- [x] Mailbox plus-address detail parser and Message-ID left-part parser parity
- [x] Mailbox `In-Reply-To`/`References` Message-ID token parser parity
- [x] Mailbox IMAP-recipient detail routing and project/resource detail parser parity
- [x] Mailbox READ-filtered project target lookup parity
- [x] Mailbox sender lookup parity for legacy From-address order, primary emails, and valid workspace emails
- [x] Mailbox MIME content selection parity for text, alternative, related, root-part, and joined multipart cases
- [x] Mailbox raw RFC822 header/MIME ingestion before app-level orchestration, including quoted-printable and base64 transfer decoding
- [x] Mailbox parsed-message normalization after raw/parsed ingestion
- [x] Mailbox app-level parsed/raw-message processing bridge
- [x] Mailbox exact `original_email.message_id` reply target lookup parity
- [x] Mailbox Message-ID-left direct resource-path fallback parity
- [x] Mailbox recipient detail resource-path lookup parity
- [x] Mailbox DB-backed resource action planning parity for legacy `EmailHandler.createResources`
- [x] Mailbox DB-backed resource action execution parity
- [x] Mailbox normalized-message orchestration
- [x] Mailbox duplicate inbound Message-ID idempotency before resource creation
- [x] Mailbox DB-backed `CreationViaEmailTest` resource creation parity for issue, issue comment, board comment, and review comment
- [x] Mailbox/reply threading parity across exact `original_email`, Message-ID-left resource fallback, recipient-detail resource lookup, action planning/execution, duplicate inbound Message-ID idempotency, and parsed/raw message processing bridge
- [x] Executable-backed mailbox polling runtime

## Webhooks

- [x] Webhook CRUD
- [~] Event payload generation
- [~] Secret token header
- [x] Issue event type
- [x] Pull request event type list projection
- [x] Comment event type
- [x] Review event type
- [x] Hangout Chat thread id persistence/reuse
- [x] Delivery history/retry behavior: delivery rows, settings read surface, and bounded transient-failure retry exist

## Attachments / Files

- [x] File upload endpoint
- [x] File list endpoint for `yobi.Files` / `yobi.Attachments` (`GET /files?containerType=&containerId=` → `attachments` / `tempFiles`)
- [x] File download endpoint, including legacy `GET /files/:id/` alias
- [x] Avatar attachment flow
- [x] Issue attachment binding and edit sync
- [x] Issue comment attachment binding and edit sync
- [x] Board post/comment attachment binding and edit sync
- [x] Milestone attachment binding
- [x] PR body attachment binding and edit sync
- [x] Project logo attachment binding and detail/container/public-directory `logoUrl` projection
- [x] Organization logo attachment binding and detail/container/public-directory `logoUrl` projection
- [x] File delete authorization, including legacy `POST /files/:id/` `_method=delete` alias
- [~] Full container type parity across issue/board/PR/project/organization (legacy enum names and current-user temporary binding for issue/board/PR/milestone/project logo/organization logo are covered; issue/board/PR edit sync removes omitted body/comment attachments; import relationship containers remain)
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
- [x] Update shell and notification hide (`/sites/update` legacy sidebar/title/no-update/update-available/error surface; configured metadata URL/file discovery; `POST /sites/unwatchUpdate`)
- [~] Data management shell/export/import (`/sites/data` legacy warning/export/import surface; `/sites/export` site-admin-only `yobi-data-*.json` download with post/issue/comment attachment metadata and issue milestone titles; `/sites/import` site-admin/CSRF-gated supported user/project/post/issue body metadata plus post/issue label/comment/body-history/milestone-title/existing attachment-id relationship restore)
- [x] No-avatar user JSON/avatar repair (`/sites/noAvatarUsers`, `/sites/setAttachmentToUserAvatar`, `/api/v1/site/no-avatar-users`, `/api/v1/site/users/avatar-from-attachment`)
- [x] Unknown `/sites/:pageName` fallback no longer renders a porting placeholder; legacy compiled routes have no catch-all site-admin page, so unmatched site pages close with the shared not-found shell
- [x] Data import restore: supported `yobi-data` user/project/post/issue body metadata sections plus post/issue label/comment/body-history/milestone-title/existing attachment-id relationships and portable `contentBase64` attachment files restore from JSON or multipart upload
- [x] Binary update proxy/fetch (file/plain-HTTP/HTTPS proxy exists with configured update status/download-link shell, metadata discovery, site-admin-gated app redirect, default local `curl` HTTPS fetch, and `YONA_UPDATE_HTTPS_FETCH_COMMAND` override)

## Markdown

- [x] Basic Markdown rendering on issue surfaces
- [x] Basic Markdown rendering on milestone surfaces
- [x] HTML sanitization on implemented render path
- [x] Marked-style leading-space ATX and setext heading ids, repeated-heading slug de-duplication, `.head-anchor` links, and `#` through `######` heading levels on the project Markdown render path
- [x] Inline emphasis/strong/delete renders nested inline Markdown and `<em>`/`<strong>`/`<del>` for supported delimiters on the project Markdown render path
- [x] Inline code spans preserve legacy marked matching backtick-run delimiters, newline normalization, and single-space trimming semantics
- [x] Basic project Markdown autolinks for `@username`, legacy `@owner/project` project mentions, same-project `#123`, legacy `owner#123`, and `owner/project#123` on issue/post/milestone bodies and comments, PR bodies/general review comments, Git non-ranged commit comments, and preview output
- [x] Legacy `MarkdownAppTest.test_issueNumber` existence behavior on project Markdown: same-project, owner-scoped, and owner/project issue refs link only when resolved issue metadata exists, while missing refs stay plain text
- [x] Legacy `MarkdownAppTest.test_WrappedPattern` behavior on project Markdown: wrapped owner-scoped issue refs such as `_owner#123-` and `Aowner#123AA` remain plain text even when the underlying issue metadata exists
- [x] Legacy `MarkdownAppTest.testMention` existence behavior on issue body/comment/history, board/posting including project-home DB README postings, milestone, PR detail, and Git commit discussion Markdown: REST/proto `mentionReferences` metadata links existing `@user` / `@owner/project` targets while unresolved mentions remain plain text in React
- [x] Metadata-backed legacy commit SHA autolinks for raw `SHA`, `@SHA`, `owner@SHA`, and `owner/project@SHA` on PR body/review comments and Git commit discussion comments
- [x] Legacy `MarkdownAppTest.test_ignorePattern` behavior for raw HTML-like blocks: escaped `<a>`, `<code>`, and `<div>` content remains opaque to `#123`/URL autolinks
- [x] Basic bare `http://`/`https://`, `ftp://`, `www.`, and email autolinks on the project Markdown render path
- [x] Legacy marked angle-bracket URL/email autolinks strip brackets, preserve `mailto:` targets, and accept uppercase URL schemes
- [x] Legacy marked bare URL/email autolinks trim trailing punctuation and entity-like suffixes outside the rendered link
- [x] Inline Markdown links and images preserve legacy marked angle-wrapped targets, escaped target/title punctuation, and `title` attributes, including double-quoted, single-quoted, and parenthesized delimiters
- [x] Inline Markdown links and images accept safe uppercase URL schemes while preserving React-side unsafe scheme blocking
- [x] Reference-style Markdown links and images resolve legacy marked definitions without rendering definition lines, including escaped reference labels, newline-split target/title definitions, escaped target/title punctuation, and fenced-code exclusion for backtick/tilde fences
- [x] Legacy marked-style soft line breaks render as `<br>` on the project Markdown render path, while legacy `readme-body` surfaces keep marked `breaks: false` soft-line behavior
- [x] Legacy hard-break markers (`\` or two trailing spaces before newline) are consumed before rendering `<br>`
- [x] GFM strikethrough renders `~~deleted~~` as `<del>` on the project Markdown render path
- [x] Basic GFM pipe tables render as `<table>` on the project Markdown render path, including escaped `\|` pipes inside cells, one-or-more dash separators, row cell padding/truncation, block interruption, and left/center/right alignment attributes
- [x] Basic smart-list rendering emits `<ul>` / `<ol>` on the project Markdown render path, preserves nested child lists, indented continuation lines including blank-line-separated continuations, loose-list paragraph wrappers including nested loose-list propagation, task-list checkbox placement in loose first paragraphs, and non-1 ordered-list start numbers
- [x] Basic blockquotes render as `<blockquote>` on the project Markdown render path, keep marked-style lazy continuation lines and quoted list-item lazy continuations inside the quote, split blank-line paragraphs, and parse nested ATX/setext heading, list including loose-list continuations, table, horizontal-rule, indented-code, and fenced-code blocks
- [x] Marked-style backslash escapes keep punctuation literal before inline Markdown and autolink parsing
- [x] Basic task checklist rendering with sanitized disabled checkbox inputs
- [x] Marked-style triple-emphasis inline rendering nests `<em>` inside `<strong>` for `***text***` and `___text___`
- [x] Marked-style inline link/image targets preserve balanced parentheses in URL/path destinations
- [x] Horizontal rules render as `<hr>` on the project Markdown render path, including legacy spaced marker forms
- [x] Basic safe inline image rendering on the project Markdown render path
- [x] Basic indented code blocks plus backtick and tilde fenced-code block rendering with optional separating space, EOF closure, backtick-fence indent compensation, first info-string token language class preservation, and matching closing-fence length on the project Markdown render path
- [x] React-side fenced code blocks share the code browser `syntax-token` span highlighter while preserving marked fence parsing and code opacity to issue/mention autolinks
- [x] React-side fenced code highlighting recognizes the legacy Highlight.js `py`/`python` alias surface for Python keywords
- [x] React-side fenced code highlighting recognizes legacy Highlight.js shell aliases (`sh`/`bash`/`shell`/`zsh`) for shell keywords
- [x] React-side fenced code highlighting recognizes legacy Highlight.js SQL keyword coverage
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Ruby aliases (`rb`/`ruby`) for Ruby keywords
- [x] React-side fenced code highlighting recognizes legacy Highlight.js PHP aliases (`php`/`php3`/`php4`/`php5`/`php6`) for PHP keywords
- [x] React-side fenced code highlighting recognizes legacy Highlight.js C/C++ aliases (`c`/`cc`/`h`/`c++`/`h++`/`hpp`) for C++ keywords
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Go aliases (`go`/`golang`) for Go keywords
- [x] React-side fenced code highlighting recognizes legacy Highlight.js C# aliases (`cs`/`csharp`) for C# keywords
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Elixir language keywords
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Haskell aliases (`haskell`/`hs`) for Haskell keywords
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Lua language keywords
- [x] React-side fenced code highlighting recognizes legacy Highlight.js CMake aliases (`cmake`/`cmake.in`) for CMake keywords
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Gradle language keywords
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Makefile aliases (`makefile`/`mk`/`mak`) for Makefile keywords
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Perl aliases (`perl`/`pl`/`pm`) for Perl keywords
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Basic language keywords
- [x] React-side fenced code highlighting recognizes legacy Highlight.js AsciiDoc aliases (`asciidoc`/`adoc`) for admonition symbols
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Arduino language built-ins and literals
- [x] React-side fenced code highlighting recognizes legacy Highlight.js CoffeeScript aliases (`coffeescript`/`coffee`/`cson`/`iced`) for CoffeeScript-specific keywords
- [x] React-side fenced code highlighting recognizes legacy Highlight.js YAML aliases (`yml`/`YAML`/`yaml`) for YAML literals
- [x] React-side fenced code highlighting recognizes legacy Highlight.js XML aliases (`xml`/`html`/`xhtml`/`rss`/`atom`/`xjb`/`xsd`/`xsl`/`plist`) for tag-name and attribute/string tokens
- [x] Code-browser Markdown files render in React with legacy `.codebrowser-markdown` while the REST payload rewrites local `./...` image paths to the project file route as Markdown
- [x] Project-home Git README fallback renders in React with the legacy readme body wrapper and `breaks: false` soft-line behavior while the REST payload rewrites local images/normal links to project file/code routes as Markdown
- [x] Legacy `POST /markdown/:owner/:project` preview renderer validates project read access and returns Markdown source for React-side preview rendering instead of server-rendered HTML
- [x] Readable issue references expose title/state metadata on project Markdown render paths
- [ ] Full legacy/GFM extension parity
- [~] Remaining legacy autolink edge-case parity if evidence requires it; `MarkdownAppTest` issue reference existence, wrapped owner-scoped issue refs, owner-scoped issue refs, and issue body/comment/history, board/project-home README/milestone/PR/commit discussion mention existence checks are covered
- [~] Full Highlight.js-equivalent language coverage for Markdown code blocks
- [x] Task checklist progress-bar integration for issue/board Markdown surfaces, including ordered task-list item counts

## REST API Compatibility

- [x] `GET /-_-api/v1/hello`
- [ ] User REST APIs
- [ ] Issue REST API (separate migrator scope)
- [ ] Project REST API
- [ ] Board REST API
- [ ] Milestone REST API (legacy external `/-_-api/v1/**`, separate migrator scope)
- [ ] Watcher REST API
- [ ] Favorite REST API
