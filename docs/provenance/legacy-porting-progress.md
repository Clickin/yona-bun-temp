# Legacy Yona Porting Progress

> Status dashboard. This document is a progress mirror for humans and agents.
> Source of truth remains `AGENTS.md`, `SPEC.md`, and the narrower provenance docs under `docs/provenance/**`.

Last updated: 2026-06-12

## Progress Estimate

| Scope                                   | Estimate | Basis                                                                                                                         |
| --------------------------------------- | -------: | ----------------------------------------------------------------------------------------------------------------------------- |
| Full legacy Yona parity                 |     ~50% | Weighted by legacy product capability, including VCS, PR/review, board, search, notifications, webhooks, admin, and separate migrator/external API compatibility. |
| Current first-priority conversion scope |     ~58% | Same as above, but excluding explicitly deferred second-priority items such as remaining broader SVN edge work, LDAP, import/export tooling, and legacy external API compatibility. |
| Mechanical SPEC row count               |     ~49% | Phase -1 moved implemented application flows to `/api/v1` REST and removed runtime RPC; Phase 3L closes Git browser/history/compare/branch-admin/provisioning/Smart HTTP transport and push post-receive rows, Phase 3N mounts the SVN auth/DAV boundary, Phase 4B closes PR interaction rows, the fork/clone slice closes native bare-repo fork creation, Phase 5B closes board/posting core rows, Phase 5C closes app search rows, and project webhook CRUD, transfer request/accept/mail, legacy project statistics shell, public `/:user` profile route, user statistics counts, plus site-admin mail/mass-mail are now implemented while many product rows remain gaps. |

Interpretation:

- The Rust port has a solid foundation for auth, workspace/public profile, organization/project ownership, issue-tracker core behavior, Git read/admin surfaces, PR/review interaction surfaces including create/edit merge preflight, and board/posting core app behavior.
- SVN executable bridge parity now has current local `svn`/`svnadmin`/`svnlook` 1.14.5 verification: `svn_protocol_contract` passes all 42 mounted DAV/external-client smokes, including remote-delete `svn update` working-copy removal, `svn update --set-depth infinity` checkout deepening, `svn update --set-depth empty` / `files` checkout shrinking, `svn update --set-depth exclude` child-directory exclusion, and revision-targeted `svn update -r REV` downgrade/HEAD restore.
- Markdown fenced-code highlighting now includes legacy Highlight.js C/C++ preprocessor meta lines and class/function declaration titles in addition to the existing C++ alias and numeric-literal coverage.
- Markdown fenced-code highlighting now includes legacy Highlight.js XML/HTML unquoted attribute value string tokens in addition to existing tag, comment, meta declaration, CDATA, and sublanguage block coverage.
- The largest remaining gaps are now broader VCC/baseline PROPFIND edge completeness beyond the mounted auth/DAV, full production migration/import hardening beyond the implemented site-admin data import/export and descriptor inventory, and explicitly deferred LDAP/OAuth-provider runtime flows. Legacy external `/-_-api/v1/**` compatibility is documented as migrator scope with descriptor coverage for users/projects/issues/board/milestones/watchers; optional webhook signature compatibility remains excluded unless external evidence requires it. H2 is not a runtime dialect and is covered by the standalone Java H2-to-SQLite bridge into the SQLite adopt path.

## Public Landing

- [x] Legacy `index/partial_intro.scala.html` intro and feature-grid shell without the temporary `Yona Rust Frontend` / route-foundation copy
- [x] Public project/organization directory list shell parity: `/projects` and `/orgs` preserve legacy `project/list.scala.html` / `organization/list.scala.html` tab labels, search placeholders, icon-only search buttons, `ico-err1` empty states, `ul.all-projects`, and non-empty `div#pagination` placeholders.
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
| Foundation / DB / runtime               | [~] Mostly implemented    | Schema, migrations, `/api/v1` REST runtime, assets, legacy `/messages.js` global message script, anonymous legacy `/_help` FAQ shell, legacy `/migration` disabled compatibility shell/route boundary, and config compatibility for env plus sectioned `yona.toml` site/auth/session/database/issue/project/SMTP/webhook/notification/mailbox/update startup keys covering base path/session timeout/auth form placeholders/project default scope/project default menus/languages/profile-email visibility/mail sender derivation/mail domain filtering/mail scheduling/mailbox polling/update checks/webhook delivery controls/notification and issue-event draft-time are strong; production migration/import/export is not. |
| Auth / Workspace                        | [~] Partially implemented | Core account, legacy login/signup/lost-password/reset-password form shells, direct login/signup form posts, password-reset mail format, admin signup approval state, guest-prefix account classification, legacy public-project READ denial for nonmember guest users plus READ-gated watch/vote mutation denial with issue author/assignee resource-READ exceptions, issue/board post/board comment/issue comment/fork/commit/review comment create exceptions and issue author/assignee update precedence, organization creation/direct organization member-add/directory-list guest prohibitions including `/projects` and `/orgs` page-level forbidden handling, project/organization enrollment guest-only gates, project guest/nonmember PR form/preflight/create rejection, global anonymous-access gate, remember-me session persistence, login placeholder config, unsupported OAuth provider warning state, restricted sample page, settings, public profile plus `/me` legacy issue stream row anchors, user statistics count flows, the legacy user-menu/sidebar frame, and the legacy user attachment list exist; remaining OAuth/LDAP gaps remain. |
| Organization / Project core             | [~] Partially implemented | CRUD, organization home legacy wrapper/project-list/card/roster anchors including `ul.all-projects > li.project`, `.info-wrap`, `.owner-avatar-wrap`, `.name-tag`, `.stats-wrap`, and right-pane member avatar links, project create legacy shell/menu/scope-radio/select2 owner/VCS anchors with `/projects/new?owner=` and `/_import?owner=` owner handoff, legacy `/_import` Git import form shell plus native `git clone --bare` import mutation into ID-based storage, direct SVN provisioning, members, enrollment, legacy organization delete confirmation shell, watch/favorite, webhook CRUD plus issue/comment, PR create/review/comment fan-out, DETAIL_HANGOUT_CHAT thread name reuse, git-push JSON fan-out, HTTP/HTTPS webhook delivery, transfer request/accept/mail, change VCS shell/metadata reset, Smart HTTP clone/push transport, SVN storage creation plus `/svn/$path` auth/DAV boundary, WebDAV `OPTIONS` capability response, `DAV: 1,2`/`MS-Author-Via: DAV` discovery headers, root `PROPFIND`, default VCC `PROPFIND` multistatus with executable-backed youngest revision and repository UUID metadata plus baseline resource `PROPFIND` verified with local `svnlook` 1.14.5, executable `GET`/`HEAD` file content, file `PROPFIND` content-length/content-type/etag/displayname/supportedlock/version/checked-in/baseline-relative-path metadata plus live/custom property value/name projection for normal and `!svn/rvr`/`!svn/bc`/`!svn/ver` revision resources via `svnlook cat`/`youngest`, Label revision selection for root/VCC/file `PROPFIND`, request-aware collection tree and revision-pinned baseline collection `PROPFIND` directory/child metadata plus child file content-type/etag/displayname/supportedlock/version/checked-in metadata via `svnlook tree`/`youngest`, collection `Depth: 0`/`Depth: infinity` handling, `log-report`/`dated-rev-report` revision metadata via `svnlook log`/`author`/`date`, `get-locks-report` lock metadata via `svnlook lock`, `get-locations-report`/`get-location-segments-report` path metadata plus copied-path ancestry via `svnlook cat`/`tree`/`changed --copy-info`, `update-report` checkout/update/switch target revision/file fetch metadata plus send-all txdelta diff payloads via `svnlook tree`/`cat`, `file-revs-report` file revision metadata plus txdelta content via `svnlook log`/`cat`, `mergeinfo-report` mergeinfo metadata via `svnlook propget`, `get-deleted-rev-report` deleted-path revision lookup via `svnlook` path existence, `list-report` directory entry metadata via `svnlook tree`/`cat`, `inherited-props-report` inherited regular property metadata via `svnlook proplist`/`propget`, WebDAV `LOCK`/`UNLOCK` via `svnadmin lock`/`unlock`, WebDAV `PUT` file updates, `DELETE` removals, `MKCOL` collection creation, `PROPPATCH` property set/remove, `MKACTIVITY`/`CHECKOUT`/`MERGE` commit choreography via `svn checkout`/`commit`, actual external `svn info`/recursive-svn-ls/`svn ls`/revision-pinned `svn cat -r`/`svn cat`/`svn log`/`svn blame`/`svn diff`/export/revision-pinned-checkout/checkout/commit/switch/update/add/delete/mkdir/direct-url-mkdir/direct-url-delete/direct-url-import/direct-url-file-copy/direct-url-directory-copy/direct-url-file-move/direct-url-directory-move/property/direct-file-url-property/lock/copy/move/mergeinfo HTTP smoke coverage, and the legacy project statistics shell exist; remaining broader VCC/baseline PROPFIND edge completeness remains. |
| Issue tracker core                      | [~] Strong partial        | CRUD/comment/timeline/watch/vote/comment vote/label/milestone/sharer/org/user issue lists, project issue list legacy `issue/list` / `partial_list_wrap` / `partial_searchform` / `partial_list` shell anchors, organization issue list legacy `group_issue_search_partial` / `group_issue_list_partial` shell anchors including assigned/authored/mentioned quick filters, user issue list legacy `common/mySeriesMenuTab.scala.html` tabs/`#setDefaultLoginPage` plus `my_partial_search` / `my_partial_list` shell anchors including REST `viewerUserId`-backed current-user filter data IDs and no-keyword mentioned/shared/favorite quick-filter counts, favorite issue, direct/project sharer effects, issue/comment mention row effects, issue child-comment parent projection/one-line create, and legacy `.posting-history` / `#-yona-posting-history` change-history modal anchors exist over `/api/v1`; project/user list database ID row anchors, author-login row search values, assignee avatar, due-date, weight, parent issue, and child issue row payload/rendering are covered, while legacy external REST parity remains follow-up/migrator scope. |
| VCS / Code hosting                      | [~] Strong partial        | Git code browser with branch/tag selector refs, React-side Markdown file rendering with local image path rewrite, raw/open/image streaming, archive download, syntax/line rendering, commit history/detail/compare, commit diff file added/deleted counts plus inline commentable row triggers, commit discussion with same-file multi-line code-comment selection, comment edit/delete, and legacy `common.editor` shells for non-ranged comments, inline/thread review replies, and edits, branch admin, Git and SVN project-create provisioning from the legacy VCS selector, Smart HTTP upload-pack/receive-pack transport, push post-receive records/webhooks, SVN repository storage creation plus direct `/svn/$path` auth/status boundary, WebDAV `OPTIONS` capability response, `DAV: 1,2`/`MS-Author-Via: DAV` discovery headers, root `PROPFIND`, default VCC `PROPFIND` multistatus with executable-backed youngest revision and repository UUID metadata plus baseline resource `PROPFIND` verified with local `svnlook` 1.14.5, read-only `GET`/`HEAD` file content, file `PROPFIND` content-length/content-type/etag/displayname/supportedlock/version/checked-in/baseline-relative-path metadata plus live/custom property value/name projection for normal and `!svn/rvr`/`!svn/bc`/`!svn/ver` revision resources via `svnlook cat`/`youngest`, request-aware collection tree and revision-pinned baseline collection `PROPFIND` directory/child metadata plus child file content-type/etag/displayname/supportedlock/version/checked-in metadata via `svnlook tree`/`youngest`, collection `Depth: 0`/`Depth: infinity` handling, `log-report`/`dated-rev-report` revision metadata via `svnlook log`/`author`/`date`, `get-locks-report` lock metadata via `svnlook lock`, `get-locations-report`/`get-location-segments-report` path metadata plus copied-path ancestry via `svnlook cat`/`tree`/`changed --copy-info`, read-only `update-report` checkout/update/switch target revision/file fetch metadata via `svnlook tree`, `file-revs-report` file revision metadata plus txdelta content via `svnlook log`/`cat`, `mergeinfo-report` mergeinfo metadata via `svnlook propget`, `get-deleted-rev-report` deleted-path revision lookup via `svnlook` path existence, `list-report` directory entry metadata via `svnlook tree`/`cat`, `inherited-props-report` inherited regular property metadata via `svnlook proplist`/`propget`, WebDAV `LOCK`/`UNLOCK` via `svnadmin lock`/`unlock`, WebDAV `PUT` file updates, `DELETE` removals, `MKCOL` collection creation, `PROPPATCH` property set/remove, `MKACTIVITY`/`CHECKOUT`/`MERGE` commit choreography via `svn checkout`/`commit`, actual external `svn info`/recursive-svn-ls/`svn ls`/revision-pinned `svn cat -r`/`svn cat`/`svn log`/`svn blame`/`svn diff`/export/revision-pinned-checkout/checkout/commit/`svn status -u`/switch/update/add/delete/mkdir/direct-url-mkdir/direct-url-delete/direct-url-import/direct-url-file-copy/direct-url-directory-copy/direct-url-file-move/direct-url-directory-move/property/direct-file-url-property/lock/copy/move/mergeinfo HTTP smoke coverage, reviewer-threshold-gated conflict-free PR merge accept, conflict-state merge disable/help, PR source branch cleanup/restore, and PR commit-changed lifecycle records exist; remaining broader VCC/baseline PROPFIND edge completeness remains. |
| Pull Request / Review                   | [~] Strong partial        | Phase 4A restores read surfaces including project/organization PR list legacy `git/partial_search.scala.html` / organization list shells, sender contributor select, recently pushed branch prompt rendering from `partial_recently_pushed_branches.scala.html` plus `/:owner/:project/pushedBranch/:id/delete`, tab `num-badge` counts, `git/partial_list.scala.html` / organization row shells, closed/total review-thread progress badges, and `#pagination` pageNum controls, Phase 4B restores create/edit, close/reopen, review/unreview, general PR comments, and thread open/close, the legacy `CommentThreadApp.open/close` direct routes (`POST /threads/:id/open|close`) plus `commentThread.open`/`commentThread.close` button request anchors and `button.comment.new` submit labels are restored, the fork/clone slice restores legacy `newFork` plus native bare-repo clone, merge/branch lifecycle slices restore reviewer-threshold-gated conflict-free accept plus source branch delete/restore, PR create/edit forms restore legacy `title.newPullRequest` / `title.editPullRequest`, from/to/select-branch, commit-tab, submit/save/cancel labels and `mergeResultURL` preflight anchors (`#__commits`, `#numOfCommits`, `#mergeResult`) backed by a non-mutating native Git preview endpoint, project settings restores default reviewer threshold lifecycle, PR detail projects required/lacking reviewer state and legacy watcher projection plus `#watch-button` watch/unwatch mutation, PR detail now preserves legacy `git/view.scala.html` overview shell anchors around the body/footer/help modal, PR detail/changes restore legacy `partial_info.scala.html` overview/changes tabs with open review-thread badge, PR detail top `#reviewers` participants/review/merge controls with avatar images and legacy `pullRequest.review` / `pullRequest.unreview` / `pullRequest.merge` labels, overview contributor avatar images, `git/view.scala.html` footer action labels (`button.edit`, `pullRequest.close`, `pullRequest.reopen`), `git/view.scala.html` event-only overview without the non-legacy `review-list-wrap` / `h2 Reviews` section, and `partial_state.scala.html` safe/conflict/merged notices with merged receiver avatar identity, PR detail conversation events restore the legacy `partial_pull_request_event.scala.html` list shell, PR source pushes record commit-changed events/webhooks, project review list restores the legacy `reviewthread/list.scala.html` / `partial_list.scala.html` shell, current-user side-filter links/counts, `#pagination` pageNum controls, PR changes deep links, and `format=xls` Excel-compatible export action, and PR changes supports the legacy `git/viewChanges.scala.html` outer diff shell anchors, `common.reviewForm` hidden block-review shell, specific commit routes/filters, PRIOR selected commit outdated markers, selected commit `.commitInfo`/`.commitMsg.mt5` metadata, current-changes inline filtering that excludes outdated/commit-only review threads, explicit API-level `inlineThreads`/`nonRangedThreads`/`cardThreads` display buckets, legacy `git/viewChanges.scala.html` `board-comment-wrap` / `non-ranged-threads-wrap` placement for general non-ranged comments, legacy review-card show/hide anchors plus open/closed review-card tabs with stable `partial_reviewlist.scala.html` `.outdated-label` and avatar image elements plus outdated markers, and side-aware single/multi-line ranged inline comment create/edit/delete controls now use legacy `button.edit` / `button.save` / `button.cancel` / `common.comment.delete` labels. Legacy generated routes expose no separate per-PR reviewer assignment endpoint beyond `ReviewApp.review`/`unreview`. |
| Board / Posting                         | [~] Strong partial        | Project board CRUD/comment/watch/notice/README/label flows, legacy project and organization board list author avatar/profile row anchors, create-edit/detail-comment shell anchors including translation controls, body history modal anchors, board child-comment one-line rows/forms with `parentCommentId` create persistence, Git README fallback/write-back React-side Markdown rendering, issue template edit, online code file create/edit, and organization board list exist over `/api/v1`; legacy external API compatibility remains migrator/deferred scope. |
| Search                                  | [~] Strong partial        | Global/project/organization app search exists over `/api/v1` with all legacy result tabs, counts, snippets including shortened-result `.....` suffix rendering, legacy `yobi.Pagination` page controls, ACL filtering, lightweight relevance ordering, and borrowed legacy `SearchResultTests` coverage for Korean snippet boundaries; full-text/indexed search and external API compatibility remain deferred. |
| Markdown rendering                      | [~] Strong partial        | React-side Markdown now follows legacy `marked` behavior for heading ids/slugs including setext heading splitting before following paragraph text, inline links/images including one-level nested labels, single- and multi-backtick code spans inside link labels, literal backtick image alt labels, adjacent reference/image tokenization, unescaped displayed labels, whitespace around inline targets, empty inline link targets, and single-newline inline titles, reference links including one-level nested labels, single- and multi-backtick code spans inside link labels, literal backtick image alt labels, and target/title on separate continuation lines, numeric/core/common named HTML entity decoding in normal text/link/image labels/titles while preserving code span literals, inline emphasis including intraword underscore suppression, delimiter-adjacent whitespace handling, and single/double-tilde delete delimiter behavior, issue/mention/commit autolinks, angle-bracket URL/email/`mailto:` autolinks including extended local-part punctuation, legacy domain validation, and legacy scheme case handling, case-insensitive bare URL schemes, lowercase `www.` href normalization with uppercase `WWW.` href preservation, extended bare email autolinks including double-quoted email links and single-quoted email exclusion with trailing punctuation/unmatched closing delimiter/entity-like suffix backpedaling, React-side sanitized raw HTML blocks with legacy-safe tags preserved and raw contents kept opaque to autolinks, inline-safe raw HTML fragments in paragraphs with surrounding Markdown/autolinks still parsed including inline block-tag child Markdown parsing before unsupported wrappers are stripped, raw HTML comments kept opaque to autolinks, declarations/processing instructions and CDATA sections stripped after parsing, tables including empty-body omission, invalid-table fallback to list/paragraph parsing, plus blank-line and raw HTML block interruption, smart lists including marker-change splitting, legacy 9-digit ordered-marker limit, direct-tab marker padding, space-tab marker indented-code and continuation items, lazy continuation lines with extra spaces beyond marker padding preserved, lazy nested heading/blockquote/fenced-code blocks, task lists including literal no-trailing-space empty markers plus trailing-space and tab-separated empty checkbox progress counts, blockquotes including raw HTML block interruption of lazy continuations, code fences, common editor edit/preview/task-list/clear-temp/help/preview/receiver shells on current issue/board/milestone/PR body editor tabs, issue/board/PR comment edit forms, and Git commit discussion comment/review/edit forms, and common syntax highlighting aliases including Go, C#, Elixir hash comments, Erlang percent comments, R hash comments/numeric literals, MATLAB percent comments/function declaration titles and params, AWK hash comments, TeX/LaTeX percent comments, Django/Jinja inline comments, HTMLBars comments, accesslog, Groovy annotations/labels/dollar-slashy strings, LLVM, Haml comments, Excel, Haskell, Lua comments/numeric literals, Clojure REPL, Markdown, CSS/SCSS/Less, CMake comments, Gradle, Makefile hash comments, Perl hash comments/numeric literals, Basic comments/numeric literals, AsciiDoc comments, Arduino comments/numeric literals, CoffeeScript comments/numeric literals/built-ins, Dockerfile hash comments, nginx hash comments, Apache hash comments, HTTP, Diff, JSON, ini/TOML comments, PowerShell, DOS batch, Kotlin numeric literals, Swift numeric literals, Dart numeric literals, Elm comments, Objective-C numeric literals, JavaScript/TypeScript built-ins and JS numeric literals, Rust/Java/C++ numeric literals plus `jsp` alias/Scala/Go/C#/Elixir/Haskell numeric literals, Python hash comments/binary-octal-hex-exponent-suffix plus signed common-number numeric literals/REPL prompts/decorators/declaration titles and params/triple-quoted strings/single- and triple-quoted prefixed strings/single/triple-quoted f-string interpolation/built-ins, Shell `console`, Ruby package aliases/numeric literals, PHP numeric literals, YAML comments/attributes/structural markers, XML/HTML comments plus XML meta declarations, `<?php ... ?>` PHP sublanguage processing instructions, and single-/multiline CDATA blocks, XML/HTML `<style>` CSS sublanguage blocks, and XML/HTML `<script>` ActionScript plus JavaScript, Handlebars template, and XML data sublanguage blocks; full GFM/Highlight.js breadth remains follow-up. |
| Notifications / Webhooks / Admin / External REST | [~] Partially implemented | Notification inbox/list with legacy route wrapper anchors and core event icon/message projection, mail queue staging/drain plus startup-scheduled due-row outbound fan-out helper, allowed-domain receiver filtering, BCC hide-address mode, recipientLimit partitioning, preferred-language receiver grouping, legacy external-link `noreferrer` handling for notification mail HTML, legacy `notificationMail.scala.html` body shell/view-link/resource-unwatch/settings-footer structure, DB-backed mailbox creation/reply target orchestration including legacy enum-style recipient detail resource names, executable-backed mailbox polling through `YONA_MAILBOX_FETCH_COMMAND`, site-admin mail test/mass-mail recipient lookup plus direct `POST /sites/mail` test-mail submit and direct `/sites/mailList`, direct site-admin user/project mutation aliases, no-avatar user JSON/avatar repair, configured update status/download-link shell to `/sites/update/download` plus metadata URL/file discovery, `/sites/update/download` app-owned redirect, `/sites/update/download-file` file/plain-HTTP/HTTPS binary proxy, and `/sites/unwatchUpdate`, data management shell plus site-admin-only `/sites/export` `yobi-data-*.json` download with post/issue/comment attachment metadata, optional portable attachment `contentBase64` payloads, and issue milestone titles, and `/sites/import` supported user/project/post/issue body metadata plus post/issue label/comment/body-history/milestone-title/existing attachment-id relationship and portable attachment file restore, webhook CRUD, issue/comment plus PR create/review/comment/merge/commit-changed webhook fan-out, DETAIL_HANGOUT_CHAT thread name persistence/reuse, git-push JSON webhook fan-out, webhook delivery history rows/settings read surface, webhook retry behavior, private/internal endpoint delivery guard, HTTP/HTTPS delivery, and `GET /-_-api/v1/hello` external health compatibility exist; other `/-_-api/v1` compatibility is separate migrator scope. |

## Foundation / Deployment / DB

- [x] Rust workspace canonical root
- [x] Axum + `/api/v1` REST server
- [x] React SPA route foundation
- [x] Legacy schema based SeaORM entities
- [x] SQLite runtime migration/adopt/validate
- [x] MySQL runtime migration/adopt/validate
- [x] PostgreSQL runtime migration/adopt/validate
- [x] Embedded/static asset serving
- [x] Legacy `/messages.js` JavaScript message lookup route with base-path routing, anonymous gate exception, `application/javascript` content type, global `Messages(key, ...)`, and `_messages` map
- [x] Session/CSRF infrastructure
- [x] Sectioned startup TOML compatibility for implemented runtime keys: `[site]` `name`/`hostname`/`base_path`/`allow_anonymous_access`/`allowed_sending_mail_domains`/`guest_login_prefix`/`show_user_email`/`langs`, `[auth]` `email_verification`/`login_id_placeholder`/`password_placeholder`/`signup_require_confirm`/`social_login_only`, `[session]` `max_age`, `[database]` `url`, `[issue]` `event_draft_time`, `[project]` `default_scope`/`default_menus`/`max_file_size`, `[smtp]` `host`/`port`/`ssl`/`user`/`password`/`domain`/`from`, `[webhook]` `delivery_retries`/`allow_private_networks`, `[notification]` `mail_enabled`/`mail_initial_delay`/`mail_interval`/`mail_delay`/`recipient_limit`/`hide_address`/`draft_time`, `[mailbox]` `imap_address`/`polling_enabled`/`polling_initial_delay`/`polling_interval`/`fetch_command`, and `[update]` `current_version`/`error`/`latest_version`/`version`/`release_url`/`metadata_url`/`metadata_file`/`https_fetch_command` now load from the migration-guide shape and apply to the existing env-driven runtime helpers, with env overrides preserved.
- [x] Runtime language configuration preservation (`application.langs` / `YONA_LANGS`)
- [x] Runtime profile email visibility preservation (`application.show.user.email` / `YONA_SHOW_USER_EMAIL`, plus startup TOML `show_user_email`): default-on browser runtime flag hides public profile and `/me` user-card email display when disabled, matching legacy `Application.SHOW_USER_EMAIL`.
- [x] SMTP config aliases (`YONA_SMTP_HOST`, `YONA_SMTP_PORT`, `YONA_SMTP_SSL`, `YONA_SMTP_USER`, `YONA_SMTP_PASSWORD`, `YONA_SMTP_DOMAIN`, legacy-style `SMTP_PASSWORD` / `SMTP_DOMAIN`, `YONA_APPLICATION_HOSTNAME`, and reference `SMTP_PASS`) for outbound sender config, including legacy `smtp.user` + `smtp.domain` sender-address derivation when no explicit `SMTP_FROM` / `YONA_SMTP_FROM` override exists and legacy `application.hostname` fallback when `smtp.domain` is absent
- [x] Notification mail legacy HTML post-processing now preserves external-link `noreferrer` behavior, applies the legacy `*[href]` / `*[src]` Jsoup selector behavior beyond anchor/image-only tags, absolutizes relative mail-body `href` attributes and all relative `src` attributes against the public origin, scans link/image tags case-insensitively, accepts whitespace around attribute `=`, handles quoted and unquoted attribute values, and wraps mail-body images with the legacy linked `max-width:1024px;` image shell.
- [x] Notification mail outbound delivery now marks notification rows as HTML MIME content like legacy `HtmlEmail.setHtmlMsg`, while site-admin/test/plain mail remains plain text.
- [x] Notification mail reply parity now sets legacy-style `Reply-To` plus-address details for reply-capable issue/board/review resources when `YONA_MAILBOX_IMAP_ADDRESS` is configured, maps comment notifications to their parent issue/post/review-thread detail, and uses the legacy reply-capable view-link copy in the HTML body.
- [x] REST-pivot cleanup pruned private server-side RPC/proto compatibility helpers that no active route or trait used, restoring warning-free `cargo check --workspace` for the committed server surface.
- [~] Repository layer for implemented vertical slices
- [~] Production migration/import tooling and full-fidelity restore tooling; the legacy `/migration` route surface now returns a disabled compatibility shell/forbidden export boundary, site-admin `yobi-data` export/import and legacy external API descriptor inventory exist, while full production migration hardening remains follow-up.
- [x] H2 compatibility replaced by a standalone Java H2-to-SQLite conversion tool path; Rust runtime support stays SQLite/MySQL/PostgreSQL only.
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
- [x] Legacy login/signup/lost-password/reset-password form shell anchors, including signup `name="email"`, auth title/action keys (`title.loginFor`, `title.signupFor`, `title.resetPasswordFor`, `button.login`, `user.signupBtn`, `button.confirm`, `title.login`, `title.forgotpassword`), login fallback placeholders (`user.login.key`, `user.password`), reset-password `user.password` / `validation.retypePassword` placeholders, and lost/reset/post-reset/signup feedback keys (`site.mail.sended`, `site.mail.fail`, `site.resetPasswordEmail.invalidRequest`, `site.resetPasswordEmail.wrongUrl`, `user.loginWithNewPassword`, `user.signup.requested`, `user.verification.mail.sent`)
- [x] Legacy common login dialog shell (`#loginDialog.modal.hide.loginDialog`, `#loginIdOrEmailD`, `#passwordD`, `.error-message`, `#remember-meD`, `button.login`, `title.resetPassword`, `title.signup`) mounted from the root route
- [x] Verify-user success/invalid shells without the temporary `Yona Rust Auth` heading
- [x] Direct legacy login/signup form posts (`/users/login`, `/users/signup`)
- [x] Configurable session timeout parity
- [~] Guest user prefix classification plus public-project nonmember READ denial, issue/board post/board comment/issue comment/fork/commit comment/review comment create exceptions, and legacy project/organization enrollment guest-only gates
- [x] Global anonymous-access configuration parity
- [x] Custom login placeholder configuration
- [x] Unsupported/denied OAuth provider warning states (`/authenticate/:provider`, `/authenticate/:provider/denied`) with message-key copy instead of temporary English text
- [x] Anonymous `/_help` route from legacy `HelpApp.help()` with `help/toc.scala.html` breadcrumb/page-wrap/Q&A anchors and FAQ copy
- [x] Authenticated `/restricted` route from legacy `Restricted.index()` with `restricted.scala.html` current-user identity, verified marker, provider/user-id, session-expiry, and YouTube iframe sample shell
- [ ] OAuth social login
- [ ] LDAP

## Workspace / User

- [x] `/me` workspace shortcut
- [x] Workspace overview shell, including legacy `/me` user card connected-social-login `auth-provider-logo` shell without temporary empty fallback copy and user stream issue row anchors from `user/partial_issues.scala.html`
- [x] Workspace/public profile empty stream copy from legacy `user/view.scala.html` plus user-menu project-list no-result shell (`userinfo.daysAgo.prefix issue.is.empty`, `userinfo.daysAgo.prefix pullRequest.is.empty`, `project.is.empty`, `div.no-result.tab-pane.user-ul`, `title.no.results`) without temporary English no-results text
- [x] Recent project list basics, including direct reset route
- [x] Favorite project list basics
- [x] User settings legacy paths under `/user/editform`
- [x] User settings legacy breadcrumb/page-wrap/tab shell without the temporary `Yona Rust Workspace` heading
- [x] User settings legacy body anchors for profile/avatar/reset-visited, password reset, watched-project notification tabs, email table/actions, and token regeneration without temporary English profile/password/email/token copy or query-driven email validation status paragraphs
- [x] Default landing direct route (`/user/defultLoginPage`)
- [x] Email management, including direct add/delete/set-main routes
- [x] Password settings, including direct reset route
- [x] Token settings, including direct `/user/editform/token_reset` route
- [x] Avatar upload/crop/display
- [x] Watched project notification preference basics
- [x] Public profile route `/:user`, including legacy two-column/show-subtasks checkbox anchors and `user/partial_issues.scala.html` issue stream state/empty/row anchors
- [x] User activity statistics
- [x] Legacy global user menu tab fragment (`/user/usermenuTabContentList`) and framed sidebar shell (`/user/sidebar`) with `layout_framed.scala.html` `#sidebar`, `#sidebar-bottom`, `#mainFrame`, `iframe#mainFrameId`, user-menu tabs, pin/refresh hooks, and iframe `path`/`hash` handling
- [x] Legacy user attachment list (`/user/files`, `/api/v1/workspace/files`) with `userFiles.scala.html` / `common/mySeriesMenuTab.scala.html` nav tabs including the `/notifications` notification-tab href, search/attachment row anchors, preview/download/date/location links, `pageNum` pagination, and `UserApp.userFiles` 50-item page size
- [x] Favorite issue management
- [x] User aggregate issue list with legacy `my_partial_search` / `my_partial_list` quick-search, search, state tabs, show-subtasks, sort filters, no-keyword mentioned/shared/favorite quick-filter counts, REST `viewerUserId`-backed current-user filter data IDs, my-issues rows, database issue ID row anchors, project/issue id cells, labels, author/meta cells, assignee avatar, due-date, weight, parent issue/subtask row details, pagination, and empty-state anchors.

## Organization

- [x] Organization create
- [x] Public organization detail/home
- [x] Organization settings update
- [x] Organization delete guards and legacy `organization/deleteForm.scala.html` confirmation shell (`#btnDelete`, `#alertDeletion`, `#btnDeleteExec`)
- [x] Members admin view with legacy `organization/members.scala.html` shell anchors (`#addNewMember`, `.members.project.row-fluid`, `.member-setting`, role dropdown apply action, delete modal, enrollment accept button)
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
- [x] Project watch toggle, including direct legacy `POST /:owner/:project/watch|unwatch` empty-OK routes and legacy unwatch cleanup of per-project notification overrides
- [x] Favorite project toggle, including legacy user-menu helper `GET/POST /-_-api/v1/favoriteProjects` JSON shapes
- [x] Recent project visit recording
- [x] Member list read
- [x] Full project member management, including direct `/info/leave/:owner/:project` self-leave route
- [x] Project delete confirmation flow
- [x] Project watchers page with actual READ-filtered watchers, legacy `project/watchers.scala.html` class anchors, avatar image width/height shape without extra alt copy, and forbidden/not-found route classification for READ-gate failures
- [x] Webhook CRUD with legacy `project/webhooks.scala.html` / `partial_webhooks_list.scala.html` form/list anchors, `project.webhook.new` legend, payload/secret placeholders, literal type radio labels, `project.webhook.includeGitPush`, help block, list headers, row `h6` wrappers, and delete request URI
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
- [x] Issue detail comment create form shell anchors (`common/commentForm.scala.html`: `#comment-form`, multipart form, `.write-comment-box`, common editor tabs, `#editor-contents-comment-body`, `name=contents`, `data-editor-mode=comment-body`, `ISSUE_COMMENT` upload shell, `.write-comment-wrap`, `#dynamic-comment-btn`, `button.comment.new`, and disabled unauthorized comment box)
- [x] Issue comment update
- [x] Issue comment delete
- [x] Markdown render + sanitization for implemented issue surfaces
- [x] Issue timeline basics
- [x] Watch issue
- [x] Unwatch issue
- [x] Vote issue
- [x] Unvote issue
- [x] Assignee assign/unassign basics
- [x] Issue detail assignee autocomplete/search with legacy `partial_assignee.scala.html` field anchors (`#assignee.bigdrop`, `name=assigneeLoginId`, `placeholder=issue.noAssignee`), blank-query pseudo/default rows (`issue.assignToMe`, `issue.assignToAuthor`, `issue.noAssignee`, current assignee), and legacy Select2 no-results copy (`No matches found`), without temporary `Assignee` placeholder / `Assign` button / `No matching users` / `Assignable user search failed.` copy
- [x] Create/edit assignee autocomplete/search with blank-query `issue.assignToMe` plus project/organization assignable-user rows
- [x] Mass update
- [x] Issue label consumption in list/detail
- [x] Issue milestone consumption in list/detail
- [x] Project issue list state/author/assignee/label/milestone filter form wiring
- [x] Project issue list legacy shell anchors (`issue/list.scala.html`, `partial_list_wrap.scala.html`, `partial_searchform.scala.html`, `partial_list.scala.html`) including left quick filters/search, state tabs, filter bar, database issue ID row/mass-update checkbox anchors, author-login row search values, draft/normal row wrappers, count groups, label anchors, assignee avatar image, due-date, weight, parent issue/subtask row details, Excel action, and `#pagination`.
- [x] Issue sharer direct share/unshare
- [x] Issue detail sharer sidebar legacy `issue/view.scala.html` anchors (`dl.sharer-list`, `.issue-share-title`, `#sharer-list`, `#issueSharer`, `issue.sharer`, `issue.sharer.select`, `.text-ellipsis.sharer-item`, `.usf-group`) without temporary English share/remove copy
- [x] Issue sharer public project target expansion
- [x] Private issue read/comment ACL for directly shared users
- [x] Parent-shared child issue read-only inheritance
- [x] Organization issue aggregate list with legacy `group_issue_search_partial` / `group_issue_list_partial` wrapper, assigned/authored/mentioned quick filters, search/select2, state tabs, sort filters, cross-project rows, database issue ID row anchors, author profile/avatar anchors, assignee avatar anchors, due-date clock, label anchors, pagination, and empty-state anchors.
- [x] Comment vote
- [x] Legacy direct comment-vote POST routes
- [x] Legacy direct issue comment create/update/delete form routes
- [x] Mention autocomplete
- [x] Mention and issue-reference autocomplete result popovers follow legacy At.js by hiding empty/error/more status copy instead of rendering temporary English messages
- [x] Mention notification semantics
- [x] Shared-with-me issue filter
- [x] Sharable user autocomplete/search
- [x] Issue sharer timeline events
- [x] Issue sharer notifications
- [x] Favorite issue
- [x] User aggregate issue list with legacy `my_partial_search` / `my_partial_list` shell anchors
- [x] Issue body change-history modal anchors
- [x] Issue detail legacy board shell without the temporary `Yona Rust Project` heading, including `#watch-button`, `#issue-share-button`, mobile `.project-btn-item.show-in-mobile-inline` new-subtask link using REST `issueId`/parent id, `.issue-weight` / `#upvote-issue-weight` / `#down-vote-issue-weight` / `.weight-number` shell with app REST up/down mutation returning legacy `{ weight }`, `#vote.vote-wrap` heart icon shell plus `partial_voters` / `partial_voter_list`-style `.voter-list-wrap`, `.voter-list`, and `#voters.modal.hide.voters-dialog` anchors without temporary visible `Vote` / `Unvote` / `Voters: N` copy, empty `.watcher-list` shell without temporary `Watchers: N` copy, and selected-label `dl` / `dt label` / `.label.issue-label.active.static` anchors from `partial_show_selected_label.scala.html`
- [x] Legacy issue create/edit form shell anchors (`issue/create.scala.html`, `issue/edit.scala.html`) including edit-only hidden `authorId`, with assignee/label/milestone/due-date/subtask-parent submission over the current REST mutation contract
- [x] Issue Excel export: legacy `/:owner/:project/issues?format=xls` link restored with the project issue list filters and Excel-compatible `.xls` download response
- [x] Issue due-date create/update/clear persistence and invalid-date validation
- [x] Issue subtask parent create/update/clear persistence and parent-option form selection using legacy `parentIssueId` values, plus issue-detail child rows/progress projection using legacy `partial_view_childIssueList` / `partial_view_child` anchors
- [x] Issue draft save/update/publish and list block: REST mutation flags, author-only draft detail guard, draft edit controls, publish renumbering, normal issue-list draft exclusion, and legacy first-page draft list block (`partial_list_draft`) projection/rendering
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
- [x] Legacy labelsform shell anchors (`project/issuelabels.scala.html`, `partial_issuelabels_list.scala.html`, `partial_issuelabels_editlabel.scala.html`, `partial_issuelabels_editcategory.scala.html`) including `#copyLabel`, `#frmNewLabel`, `.label-preset-colors`, `#labelsList`, category/label data URI hooks, `#editCategory`, and `#editLabel`
- [x] Label CSS generation/direct legacy routes
- [x] Label filtering basics on issue routes
- [x] Copy labels between projects

## Milestones

- [x] Milestone list with legacy `milestone/list.scala.html` shell anchors (`.page-wrap-outer`, `.project-page-wrap`, `.tab-wrap`, `.filter-wrap.milestone`, search box, `ul.milestones`, issue links/labels)
- [x] Milestone detail with legacy `milestone/view.scala.html` shell/action anchors (`.milesion-wrap`, `.attachments[data-attachments]`, `#issues`, search box, open/close `data-request-uri`, `#deleteConfirm`)
- [x] Milestone create
- [x] Milestone update
- [x] Legacy milestone create/edit form shell anchors
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
- [x] Legacy project board list shell anchors (`board/list.scala.html`, `board/partial_list.scala.html`) including author avatar/profile links, `project.searchPlaceholder`, `common.order.*` sort labels, inline notice/README labels without temporary `.board-badge` duplicates, leading bracket `.title-prefix` title split behavior, positive-comment-only `.comments-count` markup without temporary `Comments 0` copy, and `yobi.Pagination`-style numeric `pageNum` controls
- [x] Legacy organization board list shell anchors (`organization/group_board_list.scala.html`) including author avatar/profile links, `title.searchByKeyword`, `.group-project-name`, `.post-id` `#postNumber`, `common.order.*` sort labels, numeric `pageNum` controls, and no generic `Boards` heading
- [x] Legacy board create/edit form shell anchors (`board/create.scala.html`, `board/edit.scala.html`), including `button.save` / `button.cancel` action copy
- [x] Legacy board detail/comment shell anchors (`board/view.scala.html`, `board/partial_comments.scala.html`, `common/commentForm.scala.html`, `common/commentUpdateForm.scala.html`), including `#watch-button`, `.watcher-list`, selected-label `dl` / `dt label` / `.label.issue-label.active.static` anchors from `partial_show_selected_label.scala.html`, `post.watch` / `post.unwatch` watch copy, comment edit `button.cancel` / `button.save` copy, `button.comment.new` submit copy, no temporary inline `Watchers N` label, and no temporary `Leave a comment` placeholder
- [x] Legacy board child comment shell anchors (`common/childComments.scala.html`, `common/child_commentForm.scala.html`) including `.add-a-comment`, `.child-comments`, `.one-line-comment`, `.subcomment-author.hide`, `.child-comment-input-form`, `.parentCommentId`, `.oneline-comment-box`, `comment.oneline.comment.placeholder`, `OK`, notification receiver anchors, and `/api/v1` `parentCommentId` create persistence
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
- [x] Code browser/history/detail/compare/branches shell surfaces without the temporary `Yona Rust Project` heading
- [x] Code browser/history/detail/compare/branches no-head states render the legacy `code/nohead.scala.html` / `code/nohead_svn.scala.html` `code.nohead*` shell and Git/SVN setup snippets without temporary `The repository is empty!` / `Clone URL:` placeholder copy
- [x] Code browser/history/compare empty states use legacy message-key copy from `partial_view_folder.scala.html`, `history.scala.html`, and `compare.scala.html` (`code.nofiles`, `code.nocommits`, `code.noChanges`) instead of temporary English text
- [x] Code compare shell uses legacy `compare.scala.html` / `compare_svn.scala.html` revision-pair title plus `.commitInfo` / `.commitId` and `.diff-body.discommentable` anchors instead of temporary `Compare` copy
- [x] Code file controls and binary/too-large states use legacy `partial_view_file.scala.html` keys/anchors (`code.open`, `code.open.desc`, `code.history`, `button.download`, `code.tooBigFileForCodeBrowser`, `code.viewRaw`, `#open-in-browser`, `#codeVal.hidden`, `#showCode`, `data-mimeType`, `#showImage`, `#showFile`, `.filesize`) instead of temporary English copy, binary image/download links use the legacy raw-file route, and text-file headers preserve the raw download icon plus update-capable `postform?path=<file>&branch=<branch>&edit=true` online edit action
- [x] Code file raw/image/download links follow legacy `getFileRev` semantics by using the file commit id when available, while `#open-in-browser`, history, edit, archive, and branch selector URLs stay branch-based for Git
- [x] Code file headers resolve commit author email to a Yona user when possible and render legacy `getAvatar(files)` shell in `#commiter` (`a.avatar-wrap.smaller > img`) before the author link, while unmatched authors preserve the legacy no-avatar fallback
- [x] Code-browser routing specs cover legacy URL-valued branch selector options, raw/open file action anchors, binary raw-file image/download links, `.filesize`, `data-mimeType`, and message-key labels across file/history/detail/compare surfaces
- [x] Code file headers use executable-backed latest file commit metadata, file revision comment counts, non-binary line-ending type, and legacy `partial_view_file.scala.html` anchors (`#fileInfo`, `#commiter`, `#commitDate`, `#revisionNo`, `#commitMessage`, `number-of-comments ml5`) instead of filename/mime/size placeholders
- [x] Code folder rows use legacy `partial_view_folder.scala.html` anchors (`data-listPath`, `id="cb-..."`, `data-path`, `.span6.filename`, `.span5.commitMsg`, `.span1.commitDate`, `.dynatree-icon.vmiddle`, `title`, `data-targetPath`, folder `data-type`, folder hash targets, and commit-message links) without temporary `Folder:` / `File:` prefixes
- [x] Code folder rows resolve latest-entry commit author email to a Yona user when possible and render legacy `getAvatar(file)` shell inside `.span5.commitMsg` (`a.avatar-wrap.smaller > img`) before the commit-message link
- [x] Code browser header action blocks preserve legacy `.pull-right` wrappers for download and update-capable `#new-file-link` / `code.new.file` to `/:owner/:project/postform?path=<directory>&branch=<branch>` for online file creation
- [x] Code browser/history branch selectors use legacy `#branches` select2 anchors (`data-toggle=select2`, `data-format=branch`, `data-dropdown-css-class=branches`, `pull-left` / `pull-left mb10` / `pull-right`) without temporary `Branch` labels, code browser/history branch options use legacy URL values/direct navigation, and code browser/history breadcrumbs preserve legacy adjacent-anchor output without temporary slash spans while code browser headers preserve `#breadcrumbs.code-breadcrumb-wrap.ml10.pull-left`, `.code-viewer-wrap`, and `#spin` anchors
- [x] Code folder/history labels and action titles use legacy `partial_view_folder.scala.html` / `history.scala.html` message keys (`code.filename`, `code.commitMsg`, `code.commitDate`, `code.authorDate`, `code.author`, `code.commitMsg.empty`, `code.copyCommitId`, `code.showCommit`, `code.showCodeAtThisCommit`, `code.showCode`, `code.newer`, `code.older`)
- [x] Code history author cells resolve commit author email to a Yona user when possible, fall back to gravatar for email-only commits, and preserve legacy `history.scala.html` author-cell shells (`a.avatar-wrap` with tooltip/profile link for matched users, `span.avatar-wrap` for email-only authors, and text fallback)
- [x] Code history commit-message cells preserve legacy `common.commitMsg` markup (`a.commitMsg.short`, `button.commitMsg.moreBtn`, body-only `pre.commitMsg.desc.hidden`, and `code.commitMsg.empty` fallback) instead of plain temporary links
- [x] Code history copy buttons preserve legacy `history.scala.html` `.btn-copy-commitId` plus camel-case `data-commitId` attribute instead of temporary `data-commit-id`
- [x] Code history pages preserve legacy `history.scala.html` `A` / `S` keyboard navigation for newer/older pages, while ignoring shortcut keys inside form controls and editable content
- [x] Code history commit comment counts use legacy `history.scala.html` message-cell `.number-of-comments` / `.yobicon-comments` markup instead of temporary `Comments N` text
- [x] Code browser/history/detail/branches navigation and page/action labels use legacy `code/view.scala.html`, `history.scala.html`, `branches.scala.html`, and `diff.scala.html` message keys (`menu.code`, `code.files`, `code.commits`, `title.branches`, `code.download`) instead of temporary English copy, and the code browser tab bar remains folder-only as in `code/view.scala.html`
- [x] Commit detail footer/comment-thread controls use legacy `code/diff.scala.html`, `common/commentForm.scala.html`, `common/commentUpdateForm.scala.html`, and `partial_comment_thread.scala.html` keys/icons (`notification.watch`, `button.list`, `User.anonymous.name`, `yobicon-post2`, `common.comment.delete`, `yobicon-trash`, `commentThread.open`, `commentThread.close`, `button.comment.new`, `button.edit`, `button.save`, `button.cancel`) instead of temporary English copy
- [x] Commit discussion non-ranged comment, inline review, thread reply, and edit forms use legacy `common.editor` shells and modes from `common/commentForm.scala.html`, `common/reviewForm.scala.html`, and `common/commentUpdateForm.scala.html` (`comment-body`, `code-review-body`, `update-comment-body`) while retaining React-side Markdown previews
- [x] Commit diff review-card controls use legacy `code/diff.scala.html` icon-only `yobicon-restore` show/hide buttons and `issue.state.open` / `issue.state.closed` tab labels instead of temporary `Review cards` / `Hide review cards` / `Open` / `Closed` copy
- [x] Branch list table message-key labels from `code/branches.scala.html` / `partial_branchrow.scala.html` (`title.branches`, `code.branches.commit`, `code.branches.pullRequest`, `code.branches.defaultBranch`, `code.branches.noPullRequest`, `code.branches.setAsDefault`, `button.delete`) and no temporary `No branches` row
- [x] Commit history
- [x] Commit detail/diff
- [x] Commit detail empty file-diff body follows legacy `partial_diff.scala.html` by keeping an empty `.diff-body` shell without temporary `No changed file diff is available.` copy
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
- [~] SVN support: storage lifecycle, `/svn/$path` auth/DAV boundary, WebDAV `OPTIONS` capability response including `MOVE`, `DAV: 1,2`/`MS-Author-Via: DAV` discovery headers, root `PROPFIND`, default VCC `PROPFIND` multistatus with executable-backed youngest or Label-selected revision and repository UUID metadata plus baseline resource `PROPFIND` when `svnlook` is available, root/default VCC `activity-collection-set` discovery, root/default VCC explicit `allprop` DeltaV live metadata coverage, file/root/default VCC/baseline resource/baseline collection `supported-report-set` REPORT discovery, executable `GET`/`HEAD` file content, file `PROPFIND` content-length/content-type/etag/displayname/supportedlock/version/checked-in/baseline-relative-path metadata plus requested `creationdate`/`creator-displayname`/`getlastmodified`, live/custom property value/name projection for normal and `!svn/rvr`/`!svn/bc`/`!svn/ver` revision resources via `svnlook cat`/`youngest`/`log`, request-aware default VCC child file and collection metadata projection with requested `!svn/vcc/default/<path>` href preservation, request-aware VCC file metadata projection plus default VCC requested `creationdate`/`creator-displayname`/`getlastmodified`, request-aware collection tree and revision-pinned baseline collection `PROPFIND` directory/child metadata plus child file content-type/etag/displayname/supportedlock/version/checked-in and requested `creationdate`/`creator-displayname`/`getlastmodified` metadata on collection and child-file responses via `svnlook tree`/`youngest`/`log`, baseline resource requested `creationdate`/`creator-displayname`/`getlastmodified`/`repository-uuid` plus baseline resource and baseline collection `allprop` live metadata, collection `Depth: 0`, normal/revision-pinned baseline collection `Depth: 1` direct-child projection, and `Depth: infinity` recursive projection, `log-report`/`dated-rev-report` revision metadata plus changed-path copyfrom metadata and requested path filtering via `svnlook log`/`author`/`date`/`changed --copy-info`, `get-locks-report` lock metadata via `svnlook lock`, `get-locations-report`/`get-location-segments-report` metadata and copied-path ancestry via `svnlook cat`/`tree`/`changed --copy-info`, `update-report` checkout/update/switch target revision/file fetch metadata plus send-all txdelta diff payloads via `svnlook tree`/`cat`, `file-revs-report` file revision metadata plus txdelta content via `svnlook log`/`cat`, `mergeinfo-report` mergeinfo metadata via `svnlook propget`, `get-deleted-rev-report` deleted-path revision lookup via `svnlook` path existence, `list-report` directory entry metadata via `svnlook tree`/`cat`, `inherited-props-report` inherited regular property metadata via `svnlook proplist`/`propget`, WebDAV `LOCK`/`UNLOCK` via `svnadmin lock`/`unlock`, WebDAV `MOVE` via executable-backed `svn move`, WebDAV `PUT` file updates, `DELETE` removals, `MKCOL` collection creation, `PROPPATCH` property set/remove, `MKACTIVITY`/`CHECKOUT`/`MERGE` commit choreography via `svn checkout`/`commit`, and actual external `svn info`/recursive-svn-ls/`svn ls`/revision-pinned `svn cat -r`/`svn cat`/`svn log`/`svn blame`/`svn diff`/export/revision-pinned-checkout/checkout/commit/`svn status -u`/switch/update/add/delete/mkdir/direct-url-mkdir/direct-url-delete/direct-url-import/direct-url-file-copy/direct-url-directory-copy/direct-url-file-move/direct-url-directory-move/property/direct-file-url-property/lock/copy/move/mergeinfo HTTP smoke coverage implemented; broader VCC/baseline PROPFIND edge completeness remains deferred
- [x] External `svn checkout --depth empty` smoke coverage against `/svn/$path`, proving depth-limited checkout creates only the working-copy root and suppresses direct files/directories with the installed native client.
- [x] External `svn update --set-depth infinity` smoke coverage against `/svn/$path`, proving a depth-empty working copy can deepen to recursive file/directory materialization with the installed native client.
- [x] External `svn update --set-depth empty` smoke coverage against `/svn/$path`, proving a full working copy can shrink back to an empty-depth root and remove materialized direct files/directories with the installed native client.
- [x] External `svn checkout --depth files` smoke coverage against `/svn/$path`, proving depth-limited checkout materializes direct files and suppresses child directories with the installed native client.
- [x] External `svn checkout --depth immediates` smoke coverage against `/svn/$path`, proving non-recursive update-report directory entries expose checked-in metadata, materialize direct child directories, and suppress nested files with the installed native client.
- [x] External `svn update` remote-delete smoke coverage against `/svn/$path`, proving executable-backed `update-report` emits `delete-entry` so stock SVN removes files deleted by another working copy.
- [x] External `svn update --set-depth files` smoke coverage against `/svn/$path`, proving both depth-empty working-copy deepening to direct files and full working-copy shrinking back to direct files while suppressing child directories.
- [x] External `svn update --set-depth exclude` smoke coverage against `/svn/$path`, proving a stock client can exclude a child directory from an existing working copy.
- [x] Local VisualSVN/Subversion 1.14.5 verification: `cargo test -p yona-rust-pilot-server --test svn_protocol_contract -- --nocapture` passes all 42 executable-backed SVN protocol and external-client smokes with `svn`, `svnadmin`, and `svnlook` installed, including `svn update --set-depth empty` / `files` checkout shrinking, `svn update --set-depth exclude` child-directory exclusion, and revision-targeted `svn update -r REV` downgrade/HEAD restore.
- [x] SVN PROPFIND edge contract refresh: root and default VCC `PROPFIND` now have focused contract coverage for `Label` revision selection, and baseline resource `!svn/bln/:rev` has invalid-revision `400` plus out-of-range `404` mapping coverage. Local execution skips these fixtures when `svnadmin`/`svnlook`/`svn` are unavailable.
- [x] SVN PROPFIND edge contract refresh: root and default VCC explicit `allprop` requests now have focused contract coverage for DeltaV live metadata (`checked-in`, `baseline-collection`, repository UUID, activity collection, and supported REPORT discovery). Local execution skips this fixture when `svnadmin`/`svnlook`/`svn` are unavailable.
- [x] Git direct file route traversal hardening: `rawcode`, `files`, and `image` direct blob routes reject encoded `..` traversal with `400 Bad Request`.
- [x] Git direct encoded branch route contract: legacy `URLEncoder`-style branch segments such as `topic%2Fencoded%2Bplus` resolve on `rawcode`, `files`, and archive `code/:branch/download` routes.
- [x] Git Smart HTTP receive-pack oversized request guard: `git-receive-pack` rejects an oversized announced `Content-Length` with `413 Payload Too Large` before invoking Git.

## Pull Request / Review

- [x] PR open list
- [x] PR closed list
- [x] PR sent list
- [x] Project/organization PR list legacy `yobi.Pagination`-style `#pagination.page-navigation-wrap` numeric pageNum controls
- [x] Project/organization PR list legacy row shell and closed/total review-thread progress badge
- [x] Project/organization PR list legacy search/list page shell
- [x] Project/organization PR list legacy tab `num-badge` counts
- [x] Project PR list legacy sender contributor select options
- [x] PR creation
- [x] PR create/edit merge preflight `mergeResultURL` / `#mergeResult` / `#numOfCommits`
- [x] PR detail read
- [x] PR detail legacy `git/view.scala.html` overview shell anchors, including close/open `data-request-method="post"` footer action routes
- [x] PR watcher projection + watch/unwatch mutation
- [x] PR detail/changes legacy overview/changes tabs with open review-thread badge
- [x] PR detail conversation event timeline shell anchors, including sender avatar/tooltips, merged commit link, commit-change `ul.commit-list` rows, and the empty-event `.board-comment-wrap` without placeholder text
- [x] PR/commit review-thread legacy `partial_comment_thread.scala.html` `.comment-thread-wrap`, `.btn-thread-here.btn-thread-minimize`, `ul.comments > li.comment`, `.comment-avatar`, `.media-body`, `.meta-info`, state header, direct open/close routes, `commentThread.open`/`commentThread.close` request buttons, and `issue.noAuthor` author fallback
- [x] PR non-ranged review-thread legacy `code/partial_nonrange_codecomment_thread.scala.html` shell with `.comment-thread-wrap` state class, `.btn-thread-here.btn-thread-minimize`, `.yobicon-comments`, and no ranged `.thread-header` / state badge
- [x] PR review comment delete legacy `partial_comment_thread.scala.html` icon-only `.btn-transparent.pull-right.close[data-toggle="comment-delete"]`, `title="common.comment.delete"`, and `.yobicon-trash` trigger
- [x] PR review comment edit legacy `common/commentUpdateForm.scala.html` `#comment-editform-*`, `.comment-update-form`, multipart form, hidden `id`, `.write-comment-box`, `.write-comment-wrap`, `contents-*`, `.upload-drop-here`, `.comment-update-button.upload-button-line`, `.ybtn-cancel`, `.temporaryUploadFiles`, preview/attachment/upload anchors
- [x] PR review thread reply legacy `partial_comment_form_on_thread.scala.html` `.write-comment-form`, displayed multipart `.review-form`, hidden `thread.id`, current-user author info/avatar, `common.editor` edit/preview tab shell for `contents`, `code-review-body`, notification receiver anchors, `REVIEW_COMMENT` upload/drop anchors, `.right-txt` thread state button, and `button.comment.new` submit label
- [x] PR diff read
- [x] PR changes specific commit route/filter, selected PRIOR commit outdated marker, selected commit `.commitInfo`/`.commitMsg.mt5` metadata with the legacy `User.anonymous.name` anonymous-author fallback, current-changes inline outdated-thread filtering, and review-card show/hide/open/closed outdated markers without non-legacy empty card placeholders
- [x] PR changes review-thread API buckets for legacy inline diff threads, non-ranged thread blocks, and review-card lists (`inlineThreads`, `nonRangedThreads`, `cardThreads`)
- [x] PR changes legacy non-ranged comment form placement under `board-comment-wrap` / `non-ranged-threads-wrap` plus `common/commentForm.scala.html` `#comment-form`, `.write-comment-box`, `.write-comment-wrap`, `#dynamic-comment-btn`, and `contents` editor anchors
- [x] PR changes legacy `git/viewChanges.scala.html` outer shell anchors (`.code-browse-wrap`, `.board-body.mb20`, `.author-info.right-txt`, `.codediff-wrap.mt10`, `#changes`, `#commits`, `.diffs-wrap-scroll`, empty diff body without placeholder text, `.btnPop`)
- [x] PR changes legacy `common.reviewForm` hidden block-review shell (`#review-form.review-form`, close button, `code-review-body` textarea, range hidden fields)
- [x] PR changes legacy `partial_reviewlist.scala.html` stable `.outdated-label` element on all review cards
- [x] PR changes legacy `partial_reviewlist.scala.html` review-card author avatar image (`.avatar-wrap.smaller.ml5 > img[alt]`)
- [x] PR changes legacy `partial_reviewlist.scala.html` review-card links follow `DiffRenderer.urlToCommentThread` by targeting the changes or commit-specific changes container plus `#thread-*`
- [x] Project review list read, legacy `reviewthread/list.scala.html` / `partial_list.scala.html` shell, current-user side-filter links/count badges, `yobi.Pagination`-style `#pagination.page-navigation-wrap` numeric pageNum controls, `DiffRenderer.urlToCommentThread` PR changes and commit detail deep links, and legacy `format=xls` Excel-compatible export
- [x] Organization PR open/closed aggregate read
- [x] Open/close/reopen
- [x] Merge: reviewer-threshold-gated conflict-free native merge accept implemented; legacy route/view evidence exposes only `#btnAccept` and no squash/strategy selector
- [x] Merge conflict handling: native conflict detection, PR conflict state, create/edit non-mutating merge preview, merge disable, and legacy `.howto-resolve-conflict` contributor guide implemented; no separate in-app conflict editor route/test is present in legacy evidence
- [x] Reviewer lifecycle: legacy has no separate per-PR assignment route beyond review/unreview, and reviewer threshold projection/settings are implemented
- [x] Required/lacking reviewer status projection
- [x] Review approve/reject reclassified: legacy routes/tests expose review/unreview reviewer membership, not a separate approve/reject action, and Rust covers review/unreview events plus required/lacking reviewer status
- [x] Inline review comments: side-aware single-line add/context/deleted create/edit/delete and same-file text-selection multi-line creation with the legacy `.btnPop` confirmation step implemented
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
- [x] Legacy project search visibility borrowed from `SearchTests.findProjects`: anonymous global `searchType=project` returns matching public projects and excludes matching private projects.
- [x] Invalid/missing search query parameters and project-scoped `searchType=project` deep links render the common legacy `error.badrequest` shell instead of a temporary search-page inline message.
- [x] Non-forbidden/non-not-found REST search query failures render the common legacy `error.badrequest` shell instead of the temporary `Search failed.` runtime banner.
- [x] Search snippets expose truncated-window metadata and React result bodies append the legacy `.....` suffix when `SearchResult.makeSnippets` returned text shorter than the original source.
- [ ] Full-text/index-backed search, async indexing, and index-backed ranking beyond the lightweight scorer
- [ ] Legacy external search API compatibility (separate migrator/deferred scope)

## Notifications / Mail

- [x] SMTP/integration infrastructure basics
- [x] Legacy `YONA_SMTP_*` environment aliases for mail configuration and delivery
- [x] Project notification settings basics
- [x] Project watch toggle basics, including direct legacy `POST /:owner/:project/watch|unwatch` empty-OK route compatibility and unwatch notification-override cleanup
- [x] Notification event list and legacy `/notifications` full-page shell plus direct `/notification?from=&limit=` incremental partial compatibility fragment, including `common/mySeriesMenuTab.scala.html` notification/my-issues/files tabs with functional `#setDefaultLoginPage`, the `partial_notifications.scala.html` empty state (`div.warning-none`, `yobicon-danger`, `notification.none`), and `#notification-more.ybtn` `javascript:void(0);` anchor/script
- [x] Project notification type toggle direct route (`POST /noti/toggle/:projectId/:notiType`) with legacy empty `200 OK` success body over the same READ/watch/CSRF checks as `/api/v1/workspace/notifications`
- [~] Issue/post/comment event notifications: mention/direct notification rows and single/mass-update issue state-change receiver fan-out exist, list messages follow legacy `NotificationEvent.getMessage` direct payload/state projection, and notification mail fan-out/format/reply details are covered for implemented notification rows
- [~] PR/review notifications: PR receivers now include review comment authors via legacy watcher participation and active users mentioned in the PR body, list projection uses legacy PR state/review/thread message keys/icons, and notification mail fan-out/format/reply details are covered for implemented PR/review notification rows
- [x] Email notification fan-out and mailbox polling parity: startup scheduler, due-row outbound fan-out, allowed sending-domain filtering, BCC hide-address mode, recipientLimit partitioning, preferred-language receiver grouping, legacy `NotificationMail.handleLinks` / `handleImages` HTML post-processing, the legacy `notificationMail.scala.html` HTML shell/view-link/resource-unwatch/settings-footer body, HTML MIME outbound content, legacy reply-capable `Reply-To` plus-address details, direct `/unwatch?resource.type=...&resource.id=...` READ-gated target redirect / JSON OK behavior, and executable-backed mailbox polling over NUL-separated raw RFC822 messages exist
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
- [x] PR review-comment attachment readback through legacy `REVIEW_COMMENT` containers and `.attachments[data-attachments]`
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
- [x] Site-admin list UI copy/empty-state parity (`site.sidebar.*` titles, legacy user/project table headers, user-list avatar images, project-list logo images, search placeholders, icon-only search buttons, user/project action labels, delete modal labels plus `data-dismiss="modal"` no-buttons and `×` close glyphs, post/issue row project logo / author avatar images plus project/title/author/comment anchors, `issue.state.*` tabs, and always-present empty list wrappers)
- [x] System diagnostics (`/sites/diagnostic` + `/api/v1/site/diagnostics`) with legacy `siteMngLayout` `site.sidebar` / `site.sidebar.*` shell keys and plain `row-fluid` content wrapper, `site.sidebar.diagnostics` title, `site.diagnostic.errorNotFound` / `site.diagnostic.errorFound` status keys, and plain error-list rendering
- [x] Mail settings/test/mass mail (`/sites/mail`, `/sites/massmail`, `/sites/mailList`, `/api/v1/site/mail*`) with legacy `title.sendMail`, `site.mail.*` including the `site.mail.notConfigured` `/admin/mailconf` argument and legacy missing-key labels `smtp.host`, `smtp.user`, `smtp.password`, direct form-urlencoded `POST /sites/mail` test-mail submit with `sended=true`, `title.massMail`, `site.massMail.*`, project typeahead/add submit button and write submit-button anchors
- [x] Update shell and notification hide (`/sites/update` legacy `site.sidebar.update` title plus shared update sidebar `notification-badge`/no-update current-version argument/update-available/error surface; configured metadata URL/file discovery; `POST /sites/unwatchUpdate`)
- [~] Data management shell/export/import (`/sites/data` legacy `site.sidebar.data` warning/export/import surface with the unlabeled import submit input; `/sites/export` site-admin-only `yobi-data-*.json` download with post/issue/comment attachment metadata and issue milestone titles; `/sites/import` site-admin/CSRF-gated supported user/project/post/issue body metadata plus post/issue label/comment/body-history/milestone-title/existing attachment-id relationship restore plus legacy multipart success/no-file redirects)
- [x] No-avatar user JSON/avatar repair (`/sites/noAvatarUsers`, `/sites/setAttachmentToUserAvatar`, `/api/v1/site/no-avatar-users`, `/api/v1/site/users/avatar-from-attachment`)
- [x] Unknown `/sites/:pageName` fallback no longer renders a porting placeholder; legacy compiled routes have no catch-all site-admin page, so unmatched site pages close with the shared not-found shell
- [x] Data import restore: supported `yobi-data` user/project/post/issue body metadata sections plus post/issue label/comment/body-history/milestone-title/existing attachment-id relationships and portable `contentBase64` attachment files restore from JSON or multipart upload, with legacy multipart success redirect to `/` and missing-file redirect to `/sites/data`
- [x] Binary update proxy/fetch (file/plain-HTTP/HTTPS proxy exists with configured update status/download-link shell, metadata discovery, site-admin-gated app redirect, default local `curl` HTTPS fetch, and quote-aware `YONA_UPDATE_HTTPS_FETCH_COMMAND` override)
- [x] Configured executable command hardening for mailbox polling, site update HTTPS fetch, and webhook HTTPS delivery: quoted program paths, quoted arguments, and escaped spaces are preserved before appending the legacy runtime target URL/address.

## Markdown

- [x] Basic Markdown rendering on issue surfaces
- [x] Basic Markdown rendering on milestone surfaces
- [x] HTML sanitization on implemented render path
- [x] Marked-style leading-space ATX and setext heading ids, setext heading splitting before following paragraph text, repeated-heading slug de-duplication, `.head-anchor` links, rendered-inline-text/entity-unescaped heading slug basis, raw-inline-HTML heading rendering/tag-stripped slug basis, and `#` through `######` heading levels on the project Markdown render path
- [x] Inline emphasis/strong/delete renders nested inline Markdown and `<em>`/`<strong>`/`<del>` for supported delimiters on the project Markdown render path
- [x] Inline code spans preserve legacy marked matching backtick-run delimiters, isolated empty-run literal behavior, same-delimiter crossing behavior, tab expansion, newline normalization, and single-space trimming semantics
- [x] Basic project Markdown autolinks for `@username`, legacy `@owner/project` project mentions, same-project `#123`, legacy `owner#123`, and `owner/project#123` on issue/post/milestone bodies and comments, PR bodies/general review comments, Git non-ranged commit comments, and preview output
- [x] Legacy `MarkdownAppTest.test_issueNumber` existence behavior on project Markdown: same-project, owner-scoped, and owner/project issue refs link only when resolved issue metadata exists, while missing refs stay plain text
- [x] Legacy `MarkdownAppTest.test_WrappedPattern` behavior on project Markdown: wrapped owner-scoped issue refs such as `_owner#123-` and `Aowner#123AA` remain plain text even when the underlying issue metadata exists
- [x] Legacy `MarkdownAppTest.testMention` / `Markdown.renderFileInReadme` / `Markdown.renderFileInCodeBrowser` existence behavior on issue body/comment/history, board/posting including project-home DB README postings and Git README fallback files, milestone, PR detail, Git commit discussion Markdown, and code-browser Markdown files: REST/proto `mentionReferences` metadata links existing `@user` / `@owner/project` targets while unresolved mentions remain plain text in React
- [x] Legacy `project/home.scala.html` project overview Markdown rendering: non-empty overview text renders through React-side Markdown while preserving `#project-description.markdown-wrap`, an empty overview keeps the plain `project.description.placeholder` copy, and `@user` / `@owner/project` text remains non-autolinked like the legacy non-project-aware `Markdown.render(String)` call
- [x] Metadata-backed legacy commit SHA autolinks for raw `SHA`, `@SHA`, `owner@SHA`, and `owner/project@SHA` on PR body/review comments and Git commit discussion comments, including legacy adjacent-word wrapping suppression
- [x] Legacy `MarkdownAppTest.test_ignorePattern` behavior for raw HTML-like blocks: React-side sanitizer preserves safe formatting/media/form tags including `<a>`, `<code>`, `<div>`, `<br>`, `<strong>`, `<input>`, `<iframe>`, `<video>`, `<source>`, and raw ordered-list `<ol start>`, preserves safe global `style` declarations while dropping CSS `url(...)` / `expression(...)` / `javascript:` values, collapses compacted `javascript:` hrefs to `#`, drops unsafe media `src` values, removes script/style blocks, and keeps raw HTML contents opaque to `#123`/URL autolinks
- [x] Raw block HTML tags with quoted angle-bracket attributes such as `<div title="A > B">` and `<p title="A < B">` stay opaque to Markdown parsing like legacy `marked`, while still rendering through the React sanitizer
- [x] Raw block HTML stays opaque across following nonblank lines, so Markdown links after a leading block tag remain literal until the block boundary matches legacy `marked`
- [x] Raw block HTML interrupts a preceding plain paragraph without requiring a blank line, while inline raw tags such as `<span>` remain in the paragraph, matching legacy `marked`
- [x] Raw comments interrupt a preceding paragraph, while CDATA, processing instructions, and declarations after a normal paragraph line remain inline and allow following Markdown links to parse like legacy `marked`
- [x] Raw `<script>` / `<style>` blocks route through the sanitizer, strip their contents, and end at their closing tag so following Markdown resumes like legacy `marked`
- [x] Raw `<pre>` blocks keep contents literal and end at their closing tag so following Markdown resumes like legacy `marked`
- [x] Raw `<video>` remains an inline sanitizer-preserved element rather than a raw block interrupt, so following Markdown links parse like legacy `marked`
- [x] Standalone leading raw void tags such as `<input>`, `<img>`, line-start `<hr>`, and line-start `<source>` are raw-block opaque, while inline-after-text void tags remain inline like legacy `marked`
- [x] Line-start raw table/list child tags such as `<tr>`, `<td>`, `<tbody>`, `<thead>`, and `<li>` stay raw-block opaque while table child tags after normal paragraph text remain inline like legacy `marked`
- [x] Legacy `marked` line-start HTML block tag families such as `<section>`, `<article>`, `<header>`, `<footer>`, `<form>`, `<fieldset>`, `<figure>`, `<figcaption>`, `<details>`, `<summary>`, `<dl>`, `<dt>`, `<dd>`, and `<caption>` stay raw-block opaque to Markdown/autolink parsing while inline-after-text forms remain inline
- [x] Inline-safe raw HTML fragments such as `<em>`, `<span>`, and `<a>` inside paragraphs render through the React sanitizer while surrounding Markdown links and bare URL autolinks continue to parse like legacy `marked`; safe formatting spans such as `<em>` parse inner Markdown links like legacy `marked`, nested safe inline tags such as `<em><strong>[link](...)</strong></em>` preserve their tag structure while parsing inner Markdown, safe `data-*` attributes are preserved, quoted raw-inline attributes containing angle brackets are parsed like legacy `marked`, case-insensitive raw inline tag names such as `<EM>`, `<SPAN>`, `<BR>`, and `<IMG>` are recognized, generic self-closing raw tags such as `<section/>` are tokenized as raw HTML, unsupported inline wrappers such as `<sup>` are stripped after their children are parsed/autolinked including nested safe tags such as `<sup><em>#1</em></sup>`, inline block-tag wrappers such as `<section>**raw**</section>` parse child Markdown before unsupported wrappers are stripped, and raw `<a>` / `<code>` parse explicit Markdown links/emphasis while still suppressing Yona project autolinks like `AutoLinkRenderer.IGNORE_TAGNAME`; line-start block raw HTML such as `<div>` remains opaque
- [x] Raw HTML comments stay opaque to issue/URL autolinks like legacy `marked`; inline comments still allow surrounding Markdown links to parse, while block-leading comments keep following Markdown literal
- [x] Raw HTML declarations and processing instructions such as `<!DOCTYPE html>` and `<?php ... ?>` are stripped after parsing like Yona's sanitizer, while surrounding Markdown links still render and directive contents remain opaque to autolinks
- [x] Raw CDATA sections are stripped after parsing like Yona's sanitizer, while surrounding Markdown links still render and CDATA contents remain opaque to issue/URL autolinks
- [x] Basic bare `http://`/`https://`, `ftp://`, `www.`, and email autolinks on the project Markdown render path
- [x] Legacy marked angle-bracket URL/email autolinks strip brackets, preserve `mailto:` targets, and accept uppercase URL schemes plus legacy sanitizer `file:`/`zpl:` schemes
- [x] Legacy marked double-quoted bare emails autolink while single-quoted bare emails remain plain text
- [x] Legacy marked bare URL/email autolinks trim trailing punctuation, unmatched closing delimiters, and entity-like suffixes outside the rendered link
- [x] Inline Markdown links and images preserve legacy marked angle-wrapped targets, escaped target/title punctuation, and `title` attributes, including double-quoted, single-quoted, and parenthesized delimiters
- [x] Inline Markdown links and images accept safe uppercase URL schemes, scheme-less relative href/src targets, and legacy sanitizer `file:`/`zpl:` targets, and decode HTML entities in href/src targets before React escaping and unsafe-scheme checks while preserving React-side unsupported-scheme href/src stripping
- [x] Reference-style Markdown links and images resolve legacy marked definitions without rendering definition lines, including escaped reference labels, newline-split target/title definitions, escaped target/title punctuation, and fenced-code exclusion for backtick/tilde fences
- [x] Marked-compatible numeric/core/common named HTML entities decode in normal text plus link/image labels and titles, invalid numeric entity references decode to replacement characters like browser-decoded legacy HTML, while code spans preserve source literals such as `&amp;`
- [x] Legacy marked-style soft line breaks render as `<br>` on the project Markdown render path, while legacy `readme-body` surfaces keep marked `breaks: false` soft-line behavior
- [x] Legacy hard-break markers (`\`, two trailing spaces, or trailing tab-expanded whitespace before newline) are consumed before rendering `<br>`, and `breaks: true` soft breaks trim trailing spaces/tabs like bundled `marked`
- [x] GFM strikethrough renders `~~deleted~~` as `<del>` on the project Markdown render path
- [x] Basic GFM pipe tables render as `<table>` on the project Markdown render path, including an unescaped-pipe requirement for one-column/colon-only table separators, odd-backslash escaped `\|` pipes inside cells plus even-backslash pipe delimiters, up-to-three-space indented table rows with four-space indented-code boundaries, line-start inline raw HTML body cells, one-or-more dash and legacy colon-only separators, empty-body omission, row cell padding/truncation, block, blank-line, legacy raw/self-closing HTML block interruption, and ordered-list interruption coverage where only literal `1.` / `1)` interrupts while non-1 and zero-padded ordered markers remain table rows, plus left/center/right alignment attributes
- [x] Basic smart lists split same-indent runs when unordered markers or ordered delimiters change, including nested marker-change runs, preserve legacy 0-3-space root marker classification and marker-padding indentation thresholds for same-level versus nested list markers, keep four-space list-looking lines as indented code before following root lists, preserve blank-line-separated same-marker items as one loose list while splitting blank-line marker changes, terminate list continuation after two consecutive blank lines, preserve the legacy 9-digit ordered-marker limit, preserve direct-tab marker padding, preserve space-tab marker indented-code and continuation items, keep marked-style lazy continuation lines with extra spaces beyond marker padding preserved plus lazy nested heading/blockquote/fenced-code blocks inside list items, preserve legacy empty-list-marker behavior where `- ` / `1. ` at EOF stays a paragraph but the same marker with a terminal newline or following list item renders an empty `<li>`, and match legacy paragraph/table interruption where only unordered markers and ordered `1.` / `1)` interrupt existing paragraph or GFM table rows, matching legacy `marked` `smartLists`
- [x] Intraword underscore emphasis/strong stays plain text for patterns such as `foo_bar_baz` and `foo__bar__baz`, matching legacy `marked`
- [x] Delimiter-adjacent whitespace blocks single/double emphasis while spaced triple emphasis renders as legacy outer-strong with inner literal delimiters
- [x] GFM delete accepts `~one~` and `~~two~~`, but spaced or triple-tilde delete forms stay literal like legacy `marked`
- [x] Angle-bracket autolinks preserve legacy `mailto:` and mixed-case `MAILTO:` scheme targets
- [x] Inline links/images accept marked-style whitespace around safe targets while preserving unsafe-scheme rewrite/stripping
- [x] Inline links preserve legacy empty `()` / whitespace-only targets and explicit empty angle targets as `href=""`
- [x] Inline links/images accept safe angle-wrapped targets with preserved spaces and encode those spaces in href/src like legacy `marked`
- [x] Inline links/images accept tab-separated titles plus a single newline before double-quoted, single-quoted, or parenthesized titles like legacy `marked`, while blank-line-separated title text stays literal
- [x] Inline/reference links/images accept one-level nested labels while deeper nested labels stay literal like legacy `marked`
- [x] Inline/reference links/images tokenize escaped punctuation in labels like legacy `marked`; displayed link labels unescape escaped punctuation broadly, while image alt labels only remove escaped brackets and preserve other backslash-punctuation literals such as `\*`, `\!`, and escaped backticks
- [x] Inline/reference link labels render nested inline Markdown like legacy `marked`, including emphasis/strong/delete, raw inline HTML with safe attributes, nested links/images, angle URL/email autolinks, explicit empty labels, plain text tab expansion, and single- and multi-backtick code spans with legacy tab expansion, while bare URL/email/project autolinks stay literal inside labels; image alt labels preserve formatting/raw HTML/backticks/spaces/newlines and expand tabs in plain labels plus code-span literals like legacy `marked`, and shorter inner-backtick label forms remain literal
- [x] Adjacent reference links, inline links, and images tokenize independently like legacy `marked`, including tight `[ref][r]![img](url)` forms
- [x] Reference definitions accept target and title on separate continuation lines like legacy `marked` and preserve legacy empty-angle `<>` targets as `%3C`
- [x] Basic smart-list rendering emits `<ul>` / `<ol>` on the project Markdown render path, preserves nested child lists, legacy 0-3-space root marker classification and marker-padding indentation thresholds, four-space list-looking indented-code boundaries before following root lists, indented continuation lines including blank-line-separated continuations, blank-line-separated same-marker loose list items, two-blank-line list termination, loose-list paragraph wrappers including nested loose-list propagation, task-list checkbox placement in loose first paragraphs, and non-1 ordered-list start numbers
- [x] Basic blockquotes render as `<blockquote>` on the project Markdown render path, keep marked-style lazy continuation lines and quoted list-item lazy continuations inside the quote, preserve legacy 0-3-space marker indentation with 4-space/tab-prefixed `>` as indented code, handle tab-after-marker text/list/code behavior, preserve legacy lazy-continuation interruption where quoted blank lines, unordered markers, ordered `1.` / `1)`, and line-start raw HTML block tags after an unquoted blockquote line move outside the quote while `2.` remains lazy text, split blank-line paragraphs, and parse nested ATX/setext heading, list including loose-list continuations, table, horizontal-rule, indented-code, and fenced-code blocks
- [x] Marked-style backslash escapes keep punctuation literal before inline Markdown and autolink parsing
- [x] Basic task checklist rendering with sanitized disabled checkbox inputs, literal no-trailing-space empty markers, and trailing-space plus tab-separated empty checkbox progress counts
- [x] Marked-style triple-emphasis inline rendering nests `<em>` inside `<strong>` for `***text***` and `___text___`
- [x] Marked-style inline link/image targets preserve balanced parentheses in URL/path destinations
- [x] Inline Markdown links/images plus angle and bare autolinks encode literal brackets, braces, pipe, caret, backtick, and non-ASCII path text in href/src targets while preserving visible label text like legacy `marked`
- [x] Horizontal rules render as `<hr>` on the project Markdown render path, including legacy spaced and tab-separated marker forms
- [x] Basic safe inline image rendering on the project Markdown render path
- [x] Basic indented code blocks plus backtick and tilde fenced-code block rendering with optional separating space, EOF closure, backtick-fence indent compensation, legacy first-token info-string language class preservation including punctuation, and matching closing-fence length plus legacy mixed trailing fence characters on the project Markdown render path
- [x] React-side fenced code blocks share the code browser `syntax-token` span highlighter while preserving marked fence parsing and code opacity to issue/mention autolinks
- [x] React-side fenced code highlighting recognizes the legacy Highlight.js `py`/`gyp`/`python` alias surface for Python keywords, built-ins, hash comments, numeric literals, REPL prompts, decorators, declaration titles and params, triple-quoted strings, single- and triple-quoted prefixed strings, and single/triple-quoted f-string interpolation
- [x] React-side fenced code highlighting recognizes legacy Highlight.js shell aliases (`sh`/`bash`/`shell`/`zsh`/`console`) for shell keywords and hash comments
- [x] React-side fenced code highlighting recognizes legacy Highlight.js SQL keyword/comment coverage
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Ruby aliases (`rb`/`ruby`/`gemspec`/`podspec`/`thor`/`irb`) for Ruby keywords, comments, and numeric literals
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Ruby declaration titles for `class`, `module`, and `def`
- [x] React-side fenced code highlighting recognizes legacy Highlight.js PHP aliases (`php`/`php3`/`php4`/`php5`/`php6`) for PHP keywords, hash comments, and common numeric literals
- [x] React-side fenced code highlighting recognizes legacy Highlight.js PHP declaration titles for `function`, `class`, `interface`, `namespace`, and `use`
- [x] React-side fenced code highlighting recognizes legacy Highlight.js C/C++ aliases (`c`/`cc`/`h`/`c++`/`h++`/`hpp`) for C++ keywords
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Go aliases (`go`/`golang`) for Go keywords
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Java alias (`jsp`) for Java keywords
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Rust raw strings, lifetime symbols, attribute meta tokens, function titles, and numeric literals
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Java annotation meta tokens, class/function titles, numeric literals, and `jsp` alias
- [x] React-side fenced code highlighting recognizes legacy Highlight.js C# aliases (`cs`/`csharp`) for C# keywords
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Elixir language keywords and hash comments
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Haskell aliases (`haskell`/`hs`) for Haskell keywords
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Lua language keywords
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Lua comments and common number-mode literals
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Lua function titles
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Clojure aliases (`clojure`/`clj`) for builtin-name keywords and predicate symbols
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Clojure metadata markers and `:keyword` / `::keyword` symbols
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Clojure REPL prompts and delegates the remaining line to Clojure keyword rules
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Markdown aliases (`markdown`/`md`/`mkdown`/`mkd`) for section, quote, emphasis, bullet, link, and inline-code tokens
- [x] React-side fenced code highlighting recognizes legacy Highlight.js CSS-family selector/property/value tokens for CSS/SCSS/Less aliases
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Erlang aliases (`erlang`/`erl`) for Erlang keywords, literals, percent comments, function clause titles, and params
- [x] React-side fenced code highlighting recognizes legacy Highlight.js R language keywords, literals, and hash comments
- [x] React-side fenced code highlighting recognizes legacy Highlight.js MATLAB language keywords, built-ins, and percent comments
- [x] React-side fenced code highlighting recognizes legacy Highlight.js AWK language keywords, hash comments, and field-variable tokens (`$1`, `$NF`, `$#`, `${name}`)
- [x] React-side fenced code highlighting recognizes legacy Highlight.js TeX/LaTeX command tokens with leading backslash, optional star suffix, and percent comments
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Django aliases (`django`/`jinja`) for template tags, whole filter tokens with pipe/argument colon, and inline comments
- [x] React-side fenced code highlighting recognizes legacy HTMLBars built-ins, attribute tokens, and Handlebars comments, including hyphenated helpers
- [x] React-side fenced code highlighting recognizes legacy Highlight.js accesslog IP/status numbers and quoted request strings
- [x] React-side fenced code highlighting recognizes legacy Highlight.js SCSS/Less variable tokens (`$name`, `@name`, `@{name}`)
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Groovy language keywords, annotation meta tokens, labels, and dollar-slashy strings
- [x] React-side fenced code highlighting recognizes legacy Highlight.js LLVM language keywords
- [x] React-side fenced code highlighting recognizes legacy Highlight.js LLVM title tokens (`@...`, `!...`) and symbol tokens (`%...`, `#...`)
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Haml tag/id/class/attribute tokens and comments
- [x] React-side fenced code highlighting applies legacy Highlight.js Ruby sublanguage handling inside Haml `#{...}` interpolation blocks
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Excel aliases (`excel`/`xlsx`/`xls`) for formula functions, cell/range symbols, strings, and percent numbers
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Excel `N(...)` formula comments
- [x] React-side fenced code highlighting recognizes legacy Highlight.js CMake aliases (`cmake`/`cmake.in`) for CMake keywords and hash comments
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Gradle language keywords
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Makefile aliases (`makefile`/`mk`/`mak`) for Makefile keywords, hash comments, variable tokens (`$(VAR)`, `$@`), and target section/meta tokens (`all:`, `.PHONY:`)
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Perl aliases (`perl`/`pl`/`pm`) for Perl keywords, hash comments, and numeric literals
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Perl function titles for `sub name`
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Basic language keywords, comments, and numeric literals
- [x] React-side fenced code highlighting recognizes legacy Highlight.js AsciiDoc aliases (`asciidoc`/`adoc`) for admonition symbols and comments
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Arduino language built-ins, literals, comments, and common number-mode literals
- [x] React-side fenced code highlighting recognizes legacy Highlight.js CoffeeScript aliases (`coffeescript`/`coffee`/`cson`/`iced`) for CoffeeScript-specific keywords, built-ins, hash comments, and common number-mode literals
- [x] React-side fenced code highlighting recognizes legacy Highlight.js CoffeeScript class and assignment-function titles
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Dockerfile aliases (`dockerfile`/`docker`) for Dockerfile instructions and shell-style variable tokens (`$APP_HOME`, `${APP_HOME}`)
- [x] React-side fenced code highlighting recognizes legacy Highlight.js nginx aliases (`nginx`/`nginxconf`) for nginx directive-first attribute tokens, literals, hash comments, variables (`$host`, `${upstream}`), IP:port numbers, and duration/size numeric literals
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Apache aliases (`apache`/`apacheconf`) for Apache directives, literals, hash comments, section tags (`<Directory ...>`), rewrite variables (`%{HTTP_HOST}`), back-reference numbers (`$1`, `%1`), and meta option tokens (`[R=301,L]`)
- [x] React-side fenced code highlighting recognizes legacy Highlight.js HTTP aliases (`http`/`https`) for request methods, request target strings, protocol markers, whole header name tokens, and status-code numbers
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Diff aliases (`diff`/`patch`) for change-line markers
- [x] React-side fenced code highlighting recognizes legacy Highlight.js JSON language object keys and literals
- [x] React-side fenced code highlighting recognizes legacy Highlight.js ini aliases (`ini`/`toml`) for INI/TOML section tokens, attr keys before `=`, true/false/on/off/yes/no literals, variables, triple-quoted strings, underscored signed numbers, and semicolon/hash comments
- [x] React-side fenced code highlighting recognizes legacy Highlight.js PowerShell aliases (`powershell`/`ps`) for PowerShell keywords, hyphenated built-ins, variables, `$true`/`$false`/`$null` literals, hash/block comments, and same-line here-strings
- [x] React-side fenced code highlighting recognizes legacy Highlight.js DOS aliases (`dos`/`bat`/`cmd`) for batch keywords, built-ins, percent/bang variables, labels, rem comments, and numbers
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Kotlin language keywords, built-ins, annotation/meta tokens, label symbols, interpolation variables, triple strings, and numeric literals
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Swift language keywords, literals, built-ins, annotation meta tokens, declaration titles, uppercase type tokens, signed decimal exponent numeric literals, and hex-float exponent numeric literals
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Dart language keywords, literals, built-ins, annotation meta tokens, class titles, raw/triple strings, and numeric literals
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Elm language keywords, comments, uppercase type tokens, and top-level declaration titles
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Objective-C aliases (`objectivec`/`objc`/`obj-c`/`mm`) for keywords, literals, NS-family built-ins, preprocessor meta lines, class titles, Objective-C strings, dotted property tokens, and numeric literals
- [x] React-side fenced code highlighting recognizes legacy Highlight.js R numeric literals including hex, integer suffix, imaginary, trailing-dot, leading-dot, and exponent forms
- [x] React-side fenced code highlighting recognizes legacy Highlight.js MATLAB `function` declaration titles and params
- [x] React-side fenced code highlighting recognizes legacy Highlight.js JavaScript common-number literals including leading-dot exponent and negative hex forms
- [x] React-side fenced code highlighting recognizes legacy Highlight.js JavaScript/TypeScript meta directives, function/class declaration titles, object attribute keys, template strings, built-ins, and numeric literals
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Scala declaration titles and annotation meta tokens
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Go function titles for `func name(...)` and receiver methods
- [x] React-side fenced code highlighting recognizes legacy Highlight.js C# verbatim and interpolated string prefixes (`@"..."`, `$"..."`, `$@"..."`, `@$"..."`) as single string tokens
- [x] React-side fenced code highlighting recognizes legacy Highlight.js C# preprocessor meta lines such as `#region` and `#endif`
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Elixir declaration titles for `def*` forms plus symbol tokens (`:ok`, `key?:`) and variable tokens (`$var`, `@var`, `@@var`)
- [x] React-side fenced code highlighting recognizes legacy Highlight.js Haskell meta pragmas, line meta markers, and uppercase type tokens
- [x] React-side fenced code highlighting recognizes legacy Highlight.js YAML aliases (`yml`/`YAML`/`yaml`) for YAML quoted/unquoted attributes, literals, hash comments, document markers, tags, anchors, aliases, list bullets, and Ruby sublanguage ERB template blocks
- [x] React-side fenced code highlighting recognizes legacy Highlight.js XML aliases (`xml`/`html`/`xhtml`/`rss`/`atom`/`xjb`/`xsd`/`xsl`/`plist`) for tag-name, attribute/string, comment, meta declaration, `<?php ... ?>` PHP sublanguage processing instructions, single-/multiline CDATA tokens, `<style>` CSS sublanguage blocks, and `<script>` ActionScript plus JavaScript, Handlebars template, and XML data sublanguage blocks
- [x] Code-browser Markdown files render in React with legacy `.codebrowser-markdown` while the REST payload rewrites local `./...` image paths to the project file route as Markdown
- [x] Project-home Git README fallback renders in React with the legacy readme body wrapper and `breaks: false` soft-line behavior while the REST payload rewrites local images/normal links to project file/code routes as Markdown; missing README state preserves the legacy `partial_readme.scala.html` empty `bubble-wrap gray readme` shell, `project.readme` / `project.svn.readme` copy, and Git-only `project.readme.create` anchor.
- [x] Legacy `POST /markdown/:owner/:project` preview renderer validates project read access and returns Markdown source for React-side preview rendering instead of server-rendered HTML
- [x] Readable issue references expose title/state metadata on project Markdown render paths
- [ ] Full legacy/GFM extension parity
- [~] Remaining legacy autolink edge-case parity if evidence requires it; `MarkdownAppTest` issue reference existence, wrapped owner-scoped issue refs, owner-scoped issue refs, and issue body/comment/history, board/project-home DB README/Git README/milestone/PR/commit discussion/code-browser Markdown mention existence checks are covered
- [~] Full Highlight.js-equivalent language coverage for Markdown code blocks; JavaScript/TypeScript built-in tokens, JS binary/octal/hex/exponent/suffix and leading-dot numeric literals, Rust binary/octal/hex/underscore/suffix/exponent numeric literals, Java binary/hex/underscore/suffix/exponent numeric literals, C++ binary/apostrophe/hex/common-number/suffix numeric literals, Kotlin hex/signed-exponent/leading-dot common-number literals, Swift binary/octal/hex/underscore/exponent numeric literals, Dart hex/signed-exponent/leading-dot common-number literals, Objective-C hex/signed-exponent/leading-dot common-number literals, Scala/C#/Haskell/Arduino/CoffeeScript common Highlight.js number-mode literals, CoffeeScript built-ins, Go common number-mode plus imaginary/suffix literals, Elixir hash comments, symbols, variables, declaration titles, and octal/hex/underscore numeric literals, Erlang percent comments and function clause titles/params, R hash comments and numeric literals, MATLAB percent comments plus function declaration titles/params, AWK hash comments and field-variable tokens, TeX/LaTeX command tokens and percent comments, Elm type/title tokens, Django/Jinja inline comments and filter tokens, HTMLBars attribute tokens, accesslog quoted request strings, Perl hash comments plus octal/hex/underscore numeric literals, Python built-ins, hash comments, REPL prompts, decorators, declaration titles and params, triple-quoted strings, single- and triple-quoted prefixed strings, single/triple-quoted f-string interpolation, and binary/octal/hex/exponent/suffix, leading-dot, and signed common-number numeric literals, shell/bash hash comments, YAML hash comments, CMake hash comments, Makefile hash comments, Dockerfile hash comments, nginx hash comments, Apache hash comments, ini/TOML semicolon/hash comments, and Basic comments plus decimal/hex/octal numeric literals are covered
- [x] Task checklist progress-bar integration for issue/board Markdown surfaces, including `+`/`*` unordered marker variants, ordered paren markers, ordered and tab-separated task-list item counts, plus legacy paragraph-interruption exclusions for non-1 and zero-padded ordered markers
- [x] Markdown mixed task-list/list-boundary OOM hardening: task progress plus 3-space top-level list-boundary inputs now render with legacy root-list classification and marker-indent lazy continuation padding instead of triggering a renderer memory blow-up.

## REST API Compatibility

- [x] `GET /-_-api/v1/hello`
- [ ] User REST APIs
- [~] Issue REST API: `POST /-_-api/v1/translation` issue/board helper is mounted with legacy unconfigured `412 Precondition Failed` behavior, executable translation proxy, issue/board `#translate` and `.comment-translate` controls, and React-side Markdown-source rendering; broader issue REST API remains separate migrator scope
- [ ] Project REST API
- [ ] Board REST API
- [ ] Milestone REST API (legacy external `/-_-api/v1/**`, separate migrator scope)
- [ ] Watcher REST API
- [~] Favorite REST API: user-menu helpers `GET/POST /-_-api/v1/favoriteProjects|favoriteIssues|favoriteOrganizations` implemented with legacy JSON shapes and legacy `Yona-Token` / `Authorization: token ...` authentication; broader legacy external favorite APIs remain migrator scope
