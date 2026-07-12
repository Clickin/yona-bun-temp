# Core Parity Audit

## Purpose

- This document freezes the Wave 0 parity audit baseline for the current Rust pivot.
- It exists to keep remediation work anchored to **legacy Yona functional and UX parity**, not to generic app cleanup or new architecture proposals.
- The sources of truth are:
  - behavior: `yona-original/test/**`
  - UX and information architecture: `yona-original/app/views/**`
  - route surface: `yona-original/conf/routes`

## Interpretation After Rust Pivot

- The `Current route/contract` column below is a historical label. Legacy parity evidence must come from `yona-original/`; `reference/mixed-code/**` paths are obsolete pre-Rust residuals and are not reference material.
- The canonical implementation path is [repo root](/G:/programming/yona).
- Project-member avatars follow `User.avatarUrl` and `GravatarUtil`: email hashing remains normalized, but a missing Gravatar uses Yona's fixed gray default image rather than an identicon. Focused guards: `frontend/tests/project-members-svn.e2e.ts` and the server `gravatar_uses_the_legacy_yona_default_avatar` contract.
- PR detail empty-event rendering follows `git/view.scala.html`: keep `.board-comment-wrap`, omit `ul#comments`, and do not add placeholder text.
- PR detail event rendering follows `git/partial_pull_request_event.scala.html`: conflict/resolved `PULL_REQUEST_STATE_CHANGED` rows keep the legacy state classes/copy and senderless message shape. Focused guard: `frontend/tests/project-pullrequest-overview.e2e.ts`.
- PR detail tabs follow `git/partial_info.scala.html`: the Changes tab renders `span.num-badge` only when open review-thread count is greater than zero. Focused guard: `frontend/tests/project-pullrequest-overview.e2e.ts`.
- PR detail reviewer controls follow `git/partial_info.scala.html`: when reviewer count is enabled, keep `#reviewers`, participant count, reviewer avatar links, and review/unreview request anchors before merge controls. Focused guard: `frontend/tests/project-pullrequest-overview.e2e.ts`.
- PR detail conflict contributor rendering follows `git/partial_state.scala.html`: when the current user is the contributor, keep `.howto-resolve-conflict`, resolver command ordering, login-qualified upstream URL, and the refresh link inside `#state .alert-error`. Focused guard: `frontend/tests/project-pullrequest-overview.e2e.ts`.
- PR detail closed footer follows `git/view.scala.html`: closed pull requests keep an empty `#state` container and render the `pullRequest.reopen` POST anchor in `.board-footer` instead of the close action. Focused guard: `frontend/tests/project-pullrequest-overview.e2e.ts`.
- PR detail merging state follows `git/partial_state.scala.html`: `isMerging` renders the legacy `.alert-warnning` support-request notice and disables merge with `pullRequest.not.acceptable.because.is.merging`. Focused guard: `frontend/tests/project-pullrequest-overview.e2e.ts`.
- PR detail body rendering follows `git/view.scala.html` `Markdown.render(pull.body, project)`: React renders REST `bodyMarkdown` inside `.content.markdown-wrap` instead of relying on the compatibility `bodyHtml` field. Focused guard: `frontend/tests/project-pullrequest-overview.e2e.ts`.
- PR detail attachments follow `git/view.scala.html`: keep the empty `.attachments` shell and preserve `data-attachments` from pull-request attachment rows for legacy `yobi.Attachments` behavior. Focused guard: `frontend/tests/project-pullrequest-overview.e2e.ts`.
- PR detail watch action follows `git/view.scala.html`: render `#watch-button` only when the viewer has legacy `Operation.WATCH` permission; anonymous/no-watch states keep the empty footer `.pull-left` shell. Focused guard: `frontend/tests/project-pullrequest-overview.e2e.ts`.
- PR timeline merged events follow `git/partial_pull_request_event.scala.html`: `PULL_REQUEST_STATE_CHANGED` with merged state includes the merged commit link, but `PULL_REQUEST_MERGED` uses the legacy one-argument message and leaves the missing `{1}` placeholder as text. Focused guard: `frontend/tests/project-pullrequest-overview.e2e.ts`.
- PR branch labels and conflict guide commands follow `git/partial_branch.scala.html`, `git/partial_state.scala.html`, and `TemplateHelper.branchItemName`: display and link branch refs such as `refs/heads/release/hotfix` as `release/hotfix`. Focused guard: `frontend/tests/project-pullrequest-overview.e2e.ts`.
- PR changes empty commit/diff rendering follows `git/viewChanges.scala.html`: keep `#commits`, keep `.diff-body.diffs-wrap-scroll`, and do not add placeholder text.
- PR changes commit dropdown follows `git/viewChanges.scala.html`: render only `PullRequestCommit.State.CURRENT` rows in the dropdown, keep direct PRIOR commit routes readable with the selected `review.outdated` label, and render the unknown-commit fallback as `pullRequest.changes.all (review.outdated - shortId)`. Focused guard: `frontend/tests/project-pullrequest-changes.e2e.ts`.
- PR changes selected commit metadata follows `git/viewChanges.scala.html`: missing commit author email falls through to the legacy `User.anonymous.name` anonymous-author label.
- PR review thread rendering follows `partial_comment_thread.scala.html`: use `.comment-thread-wrap` without the side-card `review-card` class, the top `.btn-thread-here.btn-thread-minimize` control, `ul.comments > li.comment`, `.comment-avatar`, `.media-body`, `.meta-info`, and legacy message-key fallbacks instead of generic English placeholders.
- PR non-ranged review thread rendering follows `code/partial_nonrange_codecomment_thread.scala.html`: keep the `.comment-thread-wrap` state class and `.btn-thread-here.btn-thread-minimize` shell with `.yobicon-comments`, but omit the ranged thread `.thread-header`, state badge, `data-state`, and `.yobicon-post2` thread marker.
- PR changes review comment bodies render from REST `contentsMarkdown` through React Markdown rather than the server compatibility `contentsHtml`, while preserving the legacy `.comment-body.markdown-wrap[data-via-email]` DOM shape from `partial_comment_thread.scala.html` and `code/partial_nonrange_codecomment_thread.scala.html`. Focused guard: `frontend/tests/project-pullrequest-changes.e2e.ts`.
- PR non-ranged review comment avatars follow `code/partial_nonrange_codecomment_thread.scala.html`: REST review comments expose the comment author's avatar URL and the rendered `.comment-avatar img` uses it instead of the thread author's avatar or a fixed default. Focused guard: `frontend/tests/project-pullrequest-changes.e2e.ts`.
- PR non-ranged review comment delete controls follow `code/partial_nonrange_codecomment_thread.scala.html`: when `canDelete` is true, render `span.edit.pull-right` with `button.btn-transparent.pull-right.close`, `data-request-method="delete"`, `data-request-uri="/comments/review_comment/:id"`, and `.yobicon-trash`. Focused guard: `frontend/tests/project-pullrequest-changes.e2e.ts`.
- PR review comment delete controls follow `partial_comment_thread.scala.html`: use the icon-only `.btn-transparent.pull-right.close` trigger with `data-toggle="comment-delete"`, `title="common.comment.delete"`, and `.yobicon-trash` while the React mutation callback remains wired.
- Git commit discussion review comment avatars follow `partial_comment_thread.scala.html` and `code/partial_nonrange_codecomment_thread.scala.html`: rendered inline and non-ranged comment avatars use the comment author's avatar URL from the shared review-comment REST payload. Focused guard: `frontend/tests/project-code-commit-detail.e2e.ts`.
- Git commit discussion review comment bodies render from REST `contentsMarkdown` through React Markdown rather than the server compatibility `contentsHtml`, while preserving the legacy `.comment-body.markdown-wrap[data-via-email]` DOM shape from `partial_comment_thread.scala.html` and `code/partial_nonrange_codecomment_thread.scala.html`. Focused guard: `frontend/tests/project-code-commit-detail.e2e.ts`.
- Git commit discussion and PR changes review comment avatar images preserve legacy `alt="@comment.author.loginId"` from `partial_comment_thread.scala.html` and `code/partial_nonrange_codecomment_thread.scala.html`. Focused guards: `frontend/tests/project-code-commit-detail.e2e.ts`, `frontend/tests/project-pullrequest-changes.e2e.ts`.
- Git commit discussion review forms follow `common/reviewForm.scala.html` and `partial_comment_form_on_thread.scala.html`: block review and inline/non-ranged thread reply forms render current-user `.author-info-wrap.pull-left.hide-in-mobile` avatar tooltip hooks before `.write-comment-box`, and thread reply `code-review-body` textareas preserve the legacy inline `style=height:100px`. Focused guard: `frontend/tests/project-code-commit-detail.e2e.ts`.
- Git/SVN commit discussion general comment forms follow `common/commentForm.scala.html`: render the `comment-body` editor followed by the `COMMIT_COMMENT` file uploader before `.write-comment-wrap`. Focused guard: `frontend/tests/project-code-commit-detail.e2e.ts`.
- Git commit detail review cards follow `code/diff.scala.html`: each card date line includes the thread author `.avatar-wrap.smaller.margin-right-5` image with legacy author alt text. Focused guard: `frontend/tests/project-code-commit-detail.e2e.ts`.
- Generic commit/review comment deletion follows legacy `CommentApp.delete`: `DELETE /comments/code_comment/:id` and `/comments/review_comment/:id` accept only commit discussion and review comments, enforce read plus author/project-manager delete permission, and return an empty 200 response on successful deletion.
- Legacy `CodeHistoryApp.newComment/deleteComment` direct commit discussion routes are restored at `POST /:owner/:project/commit/:commitId/comments` and `DELETE /:owner/:project/commit/:commitId/comments/:id/delete`, accepting the legacy `contents` form body while reusing the REST commit-comment authorization/storage path and redirecting back to the commit detail route.
- Legacy `IssueLabelApp.category` direct route is restored at `GET /:owner/:project/issue/label/category/:id`, returning the single category JSON map with legacy string fields after project READ authorization.
- Legacy `Application.fake` seed-submit compatibility route is restored as exact `POST /`, returning the same empty `400 Bad Request` response as the Play controller.
- Legacy `EnrollProjectApp.enroll/cancelEnroll` direct routes are restored at `POST /:owner/:project/enroll` and `POST /:owner/:project/cancel/enroll`, reusing project enrollment authorization/mutation logic and returning the legacy empty `200 OK` response for guest enrollment requests.
- Legacy `ProjectApp.labels/attachLabel/detachLabel` direct project tag routes are restored at `GET /:owner/:project/labels`, `POST /:owner/:project/labels`, and `POST /:owner/:project/labels/:id`, preserving the legacy id-keyed JSON shape, created/ok/no-content attach statuses, and `_method=DELETE` detach guard.
- Legacy `ProjectApp.changeVCS` direct mutation is restored at `POST /:owner/:project/changeVCS`, reusing the REST change-vcs authorization/storage reset path while preserving the empty `204 No Content` response and `Location: /:owner/:project` header.
- Legacy `ProjectApp.newMember/editMember/deleteMember` direct member mutation routes are restored at `POST /:owner/:project/members`, `POST /:owner/:project/member/:id/edit`, and `DELETE /:owner/:project/member/:id/delete`, reusing the REST membership authorization/mutation path while preserving `{}` add, empty `204` role edit, and `{location}` delete responses.
- Legacy `ProjectApp.newWebhook/deleteWebhook` direct mutation routes are restored at `POST /:owner/:project/webhooks` and `DELETE /:owner/:project/webhooks/:id`, reusing the REST webhook authorization/mutation path while preserving the create redirect to `/:owner/:project/webhooks` and empty `200 OK` delete response.
- Legacy `ProjectApp.transferProject` direct mutation is restored at `PUT /:owner/:project/transfer?owner=:destination`, reusing the REST transfer authorization/request-mail path while preserving the XHR-style empty `204 No Content` response and `Location: /:owner/:project` header.
- PR review comment rendering follows `partial_comment_thread.scala.html` and `code/partial_nonrange_codecomment_thread.scala.html`: review comments expose avatar/meta/body/attachments plus delete controls when allowed; legacy PR review comment partials do not call `common/commentUpdateForm.scala.html` or render a `#comment-editform-*` edit shell.
- PR review thread reply rendering follows `partial_comment_form_on_thread.scala.html`: use `.write-comment-form`, a multipart `.review-form` displayed as block, hidden `thread.id`, current-user author info/avatar, legacy `common.editor` edit/preview tab shell for the `contents` field with `code-review-body` and inline `style=height:100px`, notification receiver anchors, `REVIEW_COMMENT` upload/drop anchors, thread open/close request button in `.right-txt`, and `button.comment.new` submit label while the React submit path still sends the REST JSON payload with `threadId`.
- PR review comment creation forms keep REST JSON as the React-owned submit path and call `preventDefault()` unconditionally; legacy route strings remain as DOM anchors for parity evidence, but React no longer renders form-level native `method="post"` fallbacks for PR review comments.
- PR changes general non-ranged comment form follows `common/commentForm.scala.html` plus `common/fileUploader.scala.html`: keep `#comment-form`, `.write-comment-box`, `#upload.upload-wrap.content-footer[data-resource-type="REVIEW_COMMENT"]`, `.write-comment-wrap`, `#dynamic-comment-btn`, and the legacy `contents` editor field while the React submit path still sends the REST JSON payload.
- PR changes block review form follows `common/reviewForm.scala.html`: keep the hidden `#review-form.review-form` shell, current-user `.author-info-wrap.pull-left.hide-in-mobile` avatar tooltip hooks, and route its submit through the same React REST inline review mutation boundary rather than relying on direct multipart form fallback.
- React-owned Markdown editor mutation forms for board comments, issue comments, milestone forms, code commit discussions, and pull-request review/comment forms now keep legacy DOM anchors only as parity evidence while removing `if (!props.on...) return` fallback guards from the editor source. These forms still call `preventDefault()` and then invoke the React REST callback path, so a missing callback cannot silently convert the SPA surface back into a native legacy submit flow. Focused guard: `frontend/src/form-submit-boundary.spec.tsx`.
- Issue detail body, posting-history modal body, parent/child comment bodies, and right-pane compact comment text render from REST Markdown source fields (`bodyMarkdown` / `historyMarkdown` / `contentsMarkdown`) rather than server compatibility HTML fields, while preserving the legacy `issue/view.scala.html`, `common/partial_history.scala.html`, `issue/partial_comment.scala.html`, and `issue/partial_index_comment.scala.html` wrappers. Focused guard: `frontend/tests/project-issue-detail.e2e.ts`.
- Milestone detail descriptions render from REST `contentsMarkdown` through React Markdown rather than the server compatibility `contentsHtml`, while preserving the legacy `milestone/view.scala.html` `.milestone-desc > .markdown-wrap` and attachment metadata wrappers. Focused guard: `frontend/tests/project-milestone-detail.e2e.ts`.
- Project home README renders from REST `readmeFile.bodyMarkdown` through React Markdown rather than the server compatibility `bodyHtml`, while preserving the legacy `project/partial_readme.scala.html` `.bubble-wrap.gray.readme` wrapper/header/body placement. Focused guard: `frontend/tests/project-home-readme.e2e.ts`.
- React routes render Markdown from Markdown source through `frontend/src/routes/-markdown-renderer.tsx`; server-projected `bodyHtml`, `contentsHtml`, and `historyHtml` fields remain typed API compatibility fields only and must not be projected into route-facing view models, read by route components through dot/bracket/destructuring access, or rendered with `dangerouslySetInnerHTML`. Focused guard: `frontend/src/markdown-render-boundary.spec.tsx`.
- The Markdown render boundary covers all React render-surface source files, not only file routes: server-projected HTML compatibility fields may remain in API DTO modules for legacy/runtime compatibility, but app view-model mapping, views, and shared components must render from Markdown source through the React Markdown renderer and must not use `dangerouslySetInnerHTML`. Focused guard: `frontend/src/markdown-render-boundary.spec.tsx`.
- Raw HTML attribute preservation inside the React Markdown renderer follows legacy `Markdown.java`'s sanitizer allowlist: `name` remains on `<a>`, `target` remains on `<a>` and `<source>`, but those attributes are not kept on arbitrary raw elements such as `<div>`, `<span>`, or `<video>`.
- React-owned project/organization member management forms keep the legacy `#addNewMember`, role dropdown, `data-action`, and `data-href` anchors, but add/member-role mutations remain inside the React callback/API boundary with unconditional `preventDefault()` and no `if (!props.onAddMember)` / `if (!props.onUpdateMemberRole)` direct-submit fallback guards. Focused guard: `frontend/src/form-submit-boundary.spec.tsx`.
- React-owned project/organization create, settings, project-webhook, and fork forms keep legacy wrappers, validation messages, and file/multipart-compatible markup, but create/update/fork mutations remain inside the React callback/API boundary with unconditional `preventDefault()` and no direct-submit fallback guards for missing callbacks. Focused guard: `frontend/src/form-submit-boundary.spec.tsx`.
- React-owned project fork and project-member self-leave redirects use the shared app base-path navigation helper after REST mutations so `/yona` or other subdirectory reverse-proxy deployments remain inside the mounted SPA path.
- React-owned organization create, settings, and delete redirects now use
  TanStack Router navigation after REST mutations instead of
  `navigateToAppHref`, preserving the mounted base path while avoiding full
  document reloads. Focused guards: `frontend/src/route-parity.spec.tsx` and
  `frontend/src/organization-shell-i18n.spec.tsx`.
- React-owned pull-request create and edit redirects now keep their existing
  TanStack Query invalidation flow and then navigate to the pull-request detail
  route with TanStack Router instead of the full document reload helper.
  Focused guards: `frontend/src/route-parity.spec.tsx` and
  `frontend/src/pull-request-list-form-review-i18n.spec.tsx`.
- React-owned project and organization leave actions preserve the legacy
  anchors and REST mutation behavior, but route redirect-path responses through
  the owning TanStack layout with base-path-aware navigation instead of a full
  document reload helper. Focused guards: `frontend/src/route-parity.spec.tsx`
  and `frontend/src/organization-home-parity.spec.tsx`.
- React-owned direct issue creation at `/user/issues/new` and
  `/user/issues/new/mine` preserves the legacy shared form body, but routes
  successful create redirects through TanStack Router with the mounted base
  path instead of reloading the document. Focused guard:
  `frontend/src/route-parity.spec.tsx`.
- React-owned project Git import and site data import preserve their legacy
  form shells and REST/file payload handling, but successful import redirects
  now use TanStack Router navigation with the mounted base path instead of the
  full document reload helper. Focused guards:
  `frontend/src/project-import-parity.spec.tsx`,
  `frontend/src/site-admin-data-parity.spec.tsx`, and
  `frontend/src/form-submit-boundary.spec.tsx`.
- Root login dialog and `/secret` setup redirects now stay inside TanStack
  Router navigation while preserving the legacy auth/setup DOM and mounted base
  path behavior. Route-owned `navigateToAppHref` usage is eliminated, and the
  unused shared helper has been removed so React-owned redirects cannot fall
  back to `window.location.assign`. Focused guards:
  `frontend/src/auth-workspace-shell.spec.tsx` and
  `frontend/src/route-parity.spec.tsx`.
- Frontend source imports now have a Vite/TypeScript `@/*` alias baseline for
  `frontend/src/*`. Representative deep route imports, including PR form
  routes, were rewritten as a no-output-change maintainability migration; PR
  route guards still pin the same legacy mutation fallback and SPA redirect
  behavior.
- Direct `window.location` navigation in route source is limited to shared app-base fallback helpers; route-owned filter, pagination, code branch, and history transitions use TanStack navigation. Focused guard: `frontend/src/route-parity.spec.tsx`.
- React-owned project/organization leave, enrollment, and project-watch click
  mutations keep legacy `href`/`data-href` anchors for parity, but clicks call
  `preventDefault()` before optional React callbacks so missing callbacks cannot
  navigate the SPA into a direct legacy mutation URL. Focused guard:
  `frontend/src/form-submit-boundary.spec.tsx`.
- PR changes review-card tabs follow `git/viewChanges.scala.html` and `partial_reviewlist.scala.html`: drive `.codediff-wrap`/`.review-wrap` from the full comment-thread list, including non-ranged-only threads, and do not add `review.is.empty` placeholders inside one-sided open/closed panes.
- PR changes review-card classes and avatar images follow `partial_reviewlist.scala.html`: ranged outdated code-comment threads expose `isOutdated` from the REST changes response and render the extra `.outdated` class beside the thread state class, and the review-card author avatar preserves `alt="@thread.author.name"`. Focused guard: `frontend/tests/project-pullrequest-changes.e2e.ts`.
- PR/review list pagination follows `yobi.Pagination`: numeric `pageNum` input, prev/next icon links, delimiter, and total page count under `#pagination.page-navigation-wrap`.
- Board project/organization lists follow legacy `board/list.scala.html` and `organization/group_board_list.scala.html`: preserve `project.searchPlaceholder` / `title.searchByKeyword`, organization row `.group-project-name` and `.post-id` `#postNumber`, `common.order.*` sort labels, `yobi.Pagination` `pageNum` controls, and omit the non-legacy organization `Boards` heading.
- Board detail comment creation follows legacy `common/commentForm.scala.html`: preserve `#comment-form`, `.write-comment-box`, `.write-comment-wrap`, `#dynamic-comment-btn`, `name=contents`, and `button.comment.new`, submit through React REST JSON with unconditional `preventDefault()`, and do not render a temporary `Leave a comment` placeholder.
- Board detail post body, posting-history modal body, and parent/child comment bodies render from REST Markdown source fields (`bodyMarkdown` / `historyMarkdown` / `contentsMarkdown`) rather than server compatibility HTML fields, while preserving the legacy `board/view.scala.html`, `common/partial_history.scala.html`, `board/partial_comments.scala.html`, and `common/childComments.scala.html` wrappers. Focused guard: `frontend/tests/project-posts.e2e.ts`.
- Board and issue detail child comments follow `common/childComments.scala.html` and `common/child_commentForm.scala.html`: render `.add-a-comment`, `.child-comments`, `.one-line-comment`, hidden `.subcomment-author`, `.child-comment-input-form`, hidden `.parentCommentId`, `.oneline-comment-box`, `comment.oneline.comment.placeholder`, `OK`, and notification receiver anchors; board and issue comment create persist `parentCommentId` through `/api/v1`, and issue REST detail exposes parent links so React nests child comments under their parent instead of rendering them as top-level timeline rows.
- Generic direct watch/unwatch follows legacy `WatchApp`: `POST /watch?resource.type=...&resource.id=...` now restores a readable resource watch with an empty 200 response, while `/unwatch` keeps the existing mail-link redirect/JSON behavior and clears the matching explicit watch rows.
- Reset-password rendering follows legacy `user/resetPassword.scala.html`: preserve `name="passwordReset"`, `#password`, `#retypedPassword`, and the `user.password` / `validation.retypePassword` placeholders instead of temporary English placeholder text.
- Login/signup submit buttons follow legacy `user/login.scala.html` and `user/signup.scala.html`: keep `button.login` and `user.signupBtn` visible even while React submit state is pending instead of introducing temporary pending labels.
- Auth and user-settings mutation forms are React-owned REST JSON submits, not native form POST submits: `/users/loginform`, `/users/signupform`, `/lostPassword`, `/resetPassword`, and `/user/editform/**` call `preventDefault()` and route mutations through the React API client. The legacy direct POST URLs (`/users/login`, `/users/signup`, `/lostPassword`, `/resetPassword`, `/user/edit`, `/user/resetVisitedList`, `/user/resetPassword`, `/user/email`, and `/user/editform/token_reset`) may remain as compatibility adapters, but React-rendered forms must not expose them as primary `action` targets through any action-helper spelling. Focused guard: `frontend/src/form-submit-boundary.spec.tsx`.
- Auth route components preserve the same boundary from the submit handler side: `/users/loginform`, `/users/signupform`, `/lostPassword`, and `/resetPassword` must delegate to the typed REST JSON auth wrappers (`signInWithPassword`, `registerWithPassword`, `requestPasswordReset`, and `completePasswordReset`) rather than owning inline `fetch` POST calls or legacy form-post actions. Focused guard: `frontend/src/auth-workspace-shell.spec.tsx`.
- React-owned comment/review/admin mail forms that delegate `onSubmit` to named handlers remain inside the SPA mutation boundary: the guard enumerates indirect submit handlers for code discussion, pull-request review/comment, and site mail forms, and verifies each handler body calls `event.preventDefault()` so legacy-looking form anchors cannot fall through to native submit behavior. Focused guard: `frontend/src/form-submit-boundary.spec.tsx`.
- Legacy Java endpoints that returned HTML fragments are parity references only. React routes must not fetch `text/html`, parse fragment strings with DOM APIs, or insert fragment HTML; sidebar/user-menu and Markdown content flow through JSON/source data and React rendering instead. Focused guard: `frontend/src/markdown-render-boundary.spec.tsx`.
- Initial site-admin setup at `/secret` follows the React SPA route plus `/api/v1/auth/secret` REST JSON mutation boundary; the legacy form POST fallback at `/secret` is intentionally not a mutation path so the admin bootstrap flow cannot bypass the React submit boundary.
- Code browser, commit history, commit detail, compare, and branch-list shells follow legacy `code/*.scala.html`: preserve the existing code wrappers and omit the temporary `Yona Rust Project` heading.
- Verify-user rendering follows legacy `user/verified.scala.html` for success and plain `Invalid verification` for invalid links, without the temporary `Yona Rust Auth` heading.
- User settings at `/user/editform/**` follow legacy `user/edit*.scala.html`: keep `site-breadcrumb-outer`, `page-wrap-outer`, `page-wrap`, `partial_edit_tabmenu` `nav nav-tabs mt20`, active tab state, `userinfo.*` labels, profile/avatar/reset-visited form anchors, password reset form anchors, notification project tabs, email table/action anchors, and token generator anchors without the temporary `Yona Rust Workspace` heading or temporary English profile/password/email/token copy.
- The authenticated root sidebar follows the legacy user-menu shell (`#mySidenav`, `#usermenu-tab-content-list`, and the favorite/project/recent-history tab panes) but is rendered by React from API data; legacy Java HTML fragment endpoints are provenance references rather than runtime data sources.
- Legacy sidebar/user-menu direct routes (`/user/usermenuTabContentList`, `/user/sidebar`) remain API data sources for the React root sidebar even when callers send `Accept: text/html`; they return JSON payloads rather than server-rendered HTML fragments.
- Shared forbidden/not-found status pages follow legacy error pages with `page-wrap-outer`, `project-page-wrap`, `error-wrap`, `ico ico-err2`, and `error.*` message-key titles instead of the temporary `Yona Rust Route` shell.
- Fork creation rendering follows legacy `git/fork.scala.html`: the project-home CTA, fork form legend suffix, and submit button use the legacy `fork` scalar rather than the non-legacy `project.fork` key while preserving the `fork.help.*` and `fork.already.exist` help blocks.
- Workspace/public-profile anonymous fallback rendering uses the legacy `User.anonymous.name` key instead of a literal `Anonymous` label for route-level fallback session seeds.
- Issue child rows follow legacy `issue/partial_view_child.scala.html` by rendering `common.commentAndVoterPairDisplay`-style `comments-count` / `vote-count` anchors from child issue comment/voter counts instead of a raw `open` / `closed` state string.
- Issue subtask parent rows follow legacy `issue/partial_view_childIssueList.scala.html` by projecting and rendering the parent issue state for `.parent-issue-state` instead of reusing the currently viewed child issue state.
- Unless a row explicitly says otherwise, read old owner labels through this historical mapping. `reference/mixed-code/**` entries name obsolete pre-Rust residual locations only; they are not parity evidence:

| Historical owner label                       | Canonical owner path                                  |
| -------------------------------------------- | ----------------------------------------------------- |
| `frontend`                                   | `frontend`                                            |
| `reference/mixed-code/packages/contracts`    | `/api/v1` REST contracts plus `frontend` typed client |
| `reference/mixed-code/packages/domain`       | `crates/domain`                                       |
| `reference/mixed-code/packages/db`           | `crates/persistence`                                  |
| `reference/mixed-code/packages/vcs`          | `crates/vcs`                                          |
| `reference/mixed-code/packages/integrations` | `crates/integrations`                                 |

- Rows marked `missing`, `semantic-drift`, or `ux-drift` continue to track parity work until their slice lands in `repo root`.
- 2026-06-18 persistence refactor note: splitting `crates/persistence/src/repo.rs` is a behavior-neutral compile-time maintenance refactor. File boundaries should follow legacy `yona-original/app/models/*.java` and table-oriented data exchanger names before introducing any new service-style grouping; this note does not claim or change feature parity status. The repository implementation is now split into child modules under `crates/persistence/src/repo/`; cross-module helpers use `pub(super)` so visibility remains repo-private. Issue comments, board posting comments, project webhooks, pull-request review actions, commit discussion methods, notification event helpers, receiver calculation, mention sync, and notification target projection were moved into narrower child modules with focused issue, board, PR, notification, and repository contract checks. A `cargo build --timings` check found the local Rust toolchain is native `aarch64-apple-darwin`; the persistence build bottleneck is SeaORM/SQLx multi-dialect feature compilation for the Day-1 SQLite/MySQL/PostgreSQL support matrix, not Rosetta translation. Generated SeaORM entities now live in `crates/persistence-entities`, while `crates/persistence` re-exports them to preserve existing `yoram_persistence::issue`-style imports; `auth_workspace_repository` includes a re-export contract assertion.
- 2026-06-19 server build/check diet note: shared Markdown issue-reference parsing, mention-reference resolution, REST/protocol metadata projection, and project README/code-browser local link rewrite helpers moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/markdown.rs`. This is behavior-neutral source ownership work for the existing React-side Markdown rendering path; route behavior remains covered by `markdown_contract::legacy_markdown_preview_route_preserves_breaks_flag` and the board/issue/code/project contracts that consume mention/reference metadata.
- 2026-07-10 issue-form Markdown reference metadata note: legacy `yona-original/app/utils/AutoLinkRenderer.java`, `app/controllers/MarkdownApp.java`, and `test/controllers/MarkdownAppTest.java` remain the token, boundary, and object-resolution evidence. The additive `POST /api/v1/owners/:owner/projects/:project/markdown-references` route returns JSON metadata only for readable, existing issue/user/organization/project/Git commit references; it does not return or inject HTML. The source project and every cross-project commit/project mention are READ-gated, issue targets use issue-level read access, SHA resolution delegates to `yoram_vcs`, and the response retains exact source tokens so React can own AST rendering and TanStack routing under an arbitrary configured context path. Resolution work is bounded before database/VCS access: decoded Markdown bodies are limited to 2,031,616 bytes, issue and mention tokens are first-seen deduplicated and capped at 32 each, normalized resolution keys execute once, and Git commit candidates retain their 32-item cap. Focused contracts: `markdown_reference_metadata_resolves_legacy_tokens_under_nested_base_path`, `markdown_reference_metadata_bounds_resolution_work_and_request_size`, and `markdown_reference_metadata_enforces_source_and_target_read_acl`.
- 2026-06-20 runtime bootstrap note: direct project route aliases that need runtime mail/application config should reuse the app-scoped `PilotServiceImpl` created during router bootstrap instead of rebuilding config from process env per request. This preserves the same per-router config scope as REST routes and avoids test-visible global env drift for legacy project transfer mail behavior.
- 2026-06-24 runtime bootstrap note: the release binary entrypoint is now `yoram`, startup reads `YORAM_CONFIG_TOML` or default `yoram.toml` before legacy `YONA_CONFIG_TOML`/`yona.toml` fallback, and stdout prints minimal startup/listening lines with bind address, base path, config source, redacted database URL, and asset mode. Focused coverage: `runtime_config_contract` plus a short local startup smoke.
- 2026-06-26 project enrollment count projection note: `projectMenu.scala.html` and `project/partial_settingmenu.scala.html` both render `project.enrolledUsers.size` badges for pending project enrollment requests. The Rust project detail/container DTOs now expose `enrollmentRequestCount` from the existing project membership directory, and React renders the admin cog `.project-menu-count` plus settings member-tab `.num-badge` from that value. Verification: `pnpm agent:cargo -- --outside-sandbox check -p yoram-server`, `frontend/src/project-settings-parity.spec.tsx`, full `pnpm --dir frontend test`, and template-first P2 report evidence.
- 2026-06-26 project webhook permission note: legacy `project/webhooks.scala.html` lets readable viewers see the webhook list while hiding the create form unless the viewer can update the project. Rust REST `GET /webhooks` now uses project READ authorization, React no longer blocks the route solely on `!viewerCanUpdate`, and create/delete still require UPDATE authorization. Verification: `pnpm agent:cargo -- --outside-sandbox check -p yoram-server`, `frontend/src/route-parity.spec.tsx`, full `pnpm --dir frontend test`, and template-first P2 report evidence.
- 2026-06-26 runtime config propagation note: `application.show.user.email` already reached the browser runtime config, but public profile REST projection still redacted non-self profile email unconditionally. The app-scoped runtime service now carries `show_user_email`, and `GET /api/v1/users/:loginId/profile` keeps `primaryEmailAddress` only when that legacy setting is true. Focused coverage: `rest_contract::rest_public_user_profile_reads_legacy_single_segment_profile` plus `frontend/src/wave1-auth-workspace-parity.spec.tsx`.
- 2026-06-26 workspace stream actor projection note: legacy user profile stream partials link issue author/assignee and PR contributor/receiver cells through `routes.UserApp.userInfo(loginId)`. The persistence workspace activity records now preserve those actor login IDs, the REST DTO exposes them, and the React workspace/public profile stream renders `/:loginId` anchors instead of non-link spans or `/` fallbacks. Focused coverage: `rest_contract::rest_public_user_profile_reads_legacy_single_segment_profile` and `frontend/src/route-parity.spec.tsx`.
- 2026-06-26 workspace file location projection note: legacy `userFiles.scala.html` resolves non-user attachment locations through `RouteUtil.getUrl(containerType, containerId)`. The repository now projects attachment location paths for project, issue/comment, board/comment, milestone, pull-request/review-thread, and commit-thread containers, and the workspace files REST route returns a base-path-aware `locationHref` with the legacy path label. Focused coverage: `assets_contract::workspace_files_list_returns_current_users_legacy_attachment_rows` plus existing `frontend/src/user-files-parity.spec.tsx` render coverage.
- 2026-06-24 auth/assets parity note: local password registration now promotes the first non-anonymous registered user to `site_admin`, restoring the initial administrator bootstrap path expected by a fresh legacy-style install; embedded/filesystem asset contracts and embedded/Docker smokes now require the stylesheet asset to resolve with `text/css`, so a missing embedded CSS file cannot pass as an HTML fallback. Focused coverage: `auth_workspace_contract::rest_auth_routes_round_trip_with_shared_session_and_error_envelope`, `assets_contract::*assets_support_base_path_injection_and_spa_fallback`, and `pnpm smoke:embedded-assets`.
- 2026-07-10 bounded context-path/assets note: legacy evidence remains `application.context` in `yona-original/conf/application.conf.default`. Current configuration-file selection is `YORAM_CONFIG_TOML` > `YONA_CONFIG_TOML` > `yoram.toml` > `yona.toml`, while the configured context path itself resolves as `YONA_BASE_PATH` > top-level TOML `base_path` > `[site].base_path` > `/`, as implemented in `crates/server/src/runtime_config.rs`. Filesystem and embedded asset modes in `crates/server/src/assets.rs` now expose strict `/legacy-assets` routes, rewrite app-local index `href`/`src` values for the configured context path, return the correct MIME type, and return 404 for missing or traversal requests instead of the SPA index; frontend `prefixBasePath` is idempotent only at an exact path-segment boundary, preventing already-prefixed notification and user-file hrefs from becoming `/team/yoram/team/yoram/...`. The bounded default smoke mount is `/team/yoram`. Evidence is the focused Vitest result (3/3), asset contracts (2/2), smoke unit tests (9/9), and an actual embedded smoke reporting `initial_assets_count=127` plus a 200 CSS response. Remaining gaps are native form-action/history context-path handling, the hardcoded `.error-wrap` `/yona` reference, route-local fallback asset and Markdown URLs, and Rust repeated-slash normalization; this note does not claim those paths are complete.
- 2026-06-24 root shell parity note: the React root shell restores the legacy Bootstrap `.hide` behavior, `common/usermenu.scala.html` closed-sidebar default (`#mySidenav` width 0 with hidden overflow), and the home `siteintro`/feature layout baseline from legacy `_page.less`; authenticated sessions no longer render the anonymous login dialog. Focused coverage: root browser smoke via Playwright, `auth-workspace-shell`/workspace frontend tests, design harness CSS guards, and `pnpm smoke:embedded-assets`.
- 2026-06-25 root global navigation/footer note: Playwright screenshot review found that CSS loaded but the React root shell lacked the legacy `common/navbar.scala.html` wrapper on normal pages. The root SPA shell now renders `.gnb-outer > .gnb-inner` with the logo, project list, configured feedback link, global search, and anonymous/authenticated user menu, plus the legacy `common/footer.scala.html` `.page-footer-outer` / `.page-footer` provider footer on normal app pages. The visual sweep fails any non-error page missing a full-width global navigation bar. Project and organization route contexts add the legacy `project-header` class to `.gnb-outer`. The project list menu follows legacy `common/navbar.scala.html`: `application.hide.project.listing=true` or guest viewers hide the `title.list` project directory link/divider. The global search form keeps legacy `name="gnb-search-form"`, hidden `searchType=auto`, `keyword`, `accesskey=S`, and project/organization scoped action/dropdown shells for project and group pages while retaining the global scope option only when legacy would expose it. The feedback menu follows legacy `application.feedback.url`: empty config hides the menu, and configured URL renders `title.yobi.feedback`. Standalone legacy pages with their own footer (`/secret`, `/restart`, `/_UIKit`) suppress the root footer to avoid duplicate footer chrome.
- 2026-06-28 auth/public template-port start: the first destructive template-first rebuild slice starts with legacy `user/login.scala.html`, `user/signup.scala.html`, `site/lostPassword.scala.html`, `user/resetPassword.scala.html`, and `common/loginDialog.scala.html`. The previous independently-built auth JSX is archived at `docs/archive/legacy-independent-ui/frontend/global-auth-public/auth-views.pre-template-rebuild.tsx` and is not parity evidence. Active React auth forms keep legacy DOM order, class/id/name/placeholder copy, hidden fields, social-login rows, and query-state messages, while submit remains React-owned through TanStack Query `useMutation` wrappers around the existing REST JSON client; native legacy POST `action`/`method` fallbacks stay absent by frontend boundary rule. Root login dialog submit uses the same mutation boundary and invalidates query cache before the existing workspace/session redirect handling. Focused coverage: `pnpm --dir frontend check` and `pnpm --dir frontend test src/auth-workspace-shell.spec.tsx src/form-submit-boundary.spec.tsx`.
- 2026-06-29 auth/public live HTML normalization follow-up: `frontend/tests/live-legacy-html-parity.ts` now treats only CSRF hidden fields, `form[action]`, React bootstrap noise, autofocus, serialized style whitespace, base-path differences, and documented volatile relative-date titles as SPA/REST boundaries. Stable form state attributes such as `value`, `checked`, and `selected` are compared by default, so auth forms removed React-emitted empty `value=""` attributes from visible inputs to match live legacy `user/login.scala.html`, `user/signup.scala.html`, `site/lostPassword.scala.html`, and `user/resetPassword.scala.html` output while keeping React `onChange`/TanStack Query submit flow. The original run used the homelab legacy origin `http://192.168.45.10:9000`; current parity verification for the same legacy surfaces defaults to the localhost baseline at `http://127.0.0.1:9000`. Focused coverage: `YONA_LEGACY_BASE_URL=http://127.0.0.1:9000 YONA_E2E_MANAGED_SERVERS=1 pnpm --dir frontend exec playwright test tests/legacy-rendered-page-audit.e2e.ts tests/auth-public-entry-parity.e2e.ts -g "matches live legacy rendered HTML structure"`, `pnpm --dir frontend check`, `pnpm --dir frontend test wave1-auth-workspace-parity.spec.tsx`, and focused auth submit/browser Playwright flow tests.
- 2026-06-28 root/sidebar SPA layout directive: the destructive global-shell rebuild keeps sidebar as a React SPA layout surface rather than a `/sidebar` iframe/framed route. The prior independent root implementation is archived at `docs/archive/legacy-independent-ui/frontend/global-shell/root.pre-spa-sidebar-layout.tsx` and is not parity evidence. Active root layout still ports `common/navbar.scala.html`, `common/usermenu.scala.html`, `sidebar.scala.html`, and `common/footer.scala.html` anchors (`.gnb-outer`, `.gnb-inner`, `name="gnb-search-form"`, `#sidebar-open-btn`, `#mySidenav`, `#usermenu-tab-content-list`, `.page-footer-outer`), but navbar pin and usermenu avatar now toggle the root-owned `#mySidenav` state directly. The old `RootFramedShell`, `iframe#mainFrameId`, `body.framed-body`, `shallWeOpenLeftNavigation`, and `/sidebar?path=...&hash=...` frontend contract are retired for the React SPA surface. Focused coverage is rewritten to read the legacy Scala templates and assert SPA layout sidebar anchors in `frontend/src/auth-workspace-shell.spec.tsx`.
- 2026-06-26 full UI parity subagent sweep follow-up: the root search dropdown now limits the organization/group scope item to the legacy `common/navbar.scala.html` condition where project listing is hidden or the viewer is guest and the current user is known to participate in the organization from the workspace overview. The project-page group scope now reads the project route container and exposes the group scope only when the container has `organizationName`, matching legacy `project.hasGroup`; remaining root-shell work is browser-visible proof depth rather than an implementation gap and is tracked in `docs/provenance/ui-parity-reports/ui-parity-root-navigation-shell.md`.
- 2026-06-26 root shell browser proof continuation: `frontend/tests/root-shell-parity.e2e.ts` now exercises the React shell in a real browser under `/yona`, including anonymous nav/feedback, login dialog open/submit/error/close, authenticated site-admin affix, user menu/sidebar tab content, guest project-list and organization-create gating, standalone `/secret` page-owned footer without duplicate root footer, and project page `Project`/`Group`/`All` search-scope actions. `frontend/src/routes/__root.tsx` now strips the runtime base path before root shell route-family classification so mounted reverse-proxy paths such as `/yona/secret` and `/yona/:owner/:project` retain the legacy standalone/project shell behavior.
- 2026-06-27 global utility CSS continuation: `frontend/src/app.css`
  restores the used legacy `_common.less` text-color utilities
  (`gray-txt`, `darkgray-txt`, `orange-txt`, `primary-txt`,
  `secondary-txt`, `blue-txt`), `.small-font`, `.bold`, vertical-top helpers,
  and `.yobicon-middle`, closing compact typography and icon-alignment drift in
  directory, organization, project, issue, milestone, and PR chrome. Focused
  coverage: `frontend/src/auth-workspace-shell.spec.tsx`.
- 2026-06-27 TanStack layout parity continuation: project settings begins the route-layout migration without changing visible legacy output. `frontend/src/routes/$owner/$projectName/route.tsx` now owns the legacy project header/menu/page-wrap shell for `/settingform`, while `ProjectSettingsPage` can render only its inner legacy `project-page-wrap` body through `renderShell={false}`. This preserves the existing `project/setting.scala.html` class order while moving shell ownership toward TanStack Router nested layouts. Focused coverage: `frontend/src/project-settings-parity.spec.tsx`, `frontend/src/project-home-tabs.spec.tsx`, and `pnpm --dir frontend exec tsc --noEmit`.
- 2026-06-27 TanStack issue-label settings layout continuation:
  `/$owner/$projectName/route.tsx` remains the sole project header/menu owner
  for `/issue/labelsform`; `IssueLabelsFormPage` now renders only the legacy
  label editor body and modals while the leaf route passes `renderShell={false}`.
  This keeps label/category REST mutations unchanged and prevents route-local
  duplicate project chrome. Focused coverage:
  `frontend/src/issue-label-settings-i18n.spec.tsx` and
  `pnpm --dir frontend exec tsc --noEmit`.
- 2026-06-27 TanStack organization aggregate layout continuation:
  `frontend/src/routes/organizations/$organizationName/route.tsx` now owns the
  legacy organization header/menu/page-wrap shell for aggregate issue, board,
  and pull-request list routes. The aggregate leaf components keep their
  existing REST/query boundaries and can render only their legacy inner body
  through `renderShell={false}` so the visible output stays aligned with
  `organizationLayout.scala.html` while route ownership moves to TanStack
  Router nested layouts. Focused coverage:
  `frontend/src/organization-shell-i18n.spec.tsx` and
  `pnpm --dir frontend exec tsc --noEmit`.
- 2026-06-27 TanStack organization search layout continuation:
  organization scoped search now follows the project scoped search nested
  layout pattern. The organization parent route owns header/menu/search shell
  class while `SearchRoutePage` renders only the legacy search body through
  `renderShell={false}`, avoiding duplicate chrome and redundant org container
  fetches. Focused coverage: `frontend/src/route-parity.spec.tsx` and
  `pnpm --dir frontend exec tsc --noEmit`.
- 2026-06-27 organization issue query navigation continuation:
  organization issue list filtering keeps the legacy form/action/field markup
  but routes same-page query changes through TanStack navigation. The route
  reloads aggregate issue data from router location state, so filtering no
  longer falls back to a native document GET while preserving
  `organization/group_issue_list*.scala.html` output. Focused coverage:
  `frontend/src/organization-shell-i18n.spec.tsx` and
  `pnpm --dir frontend exec tsc --noEmit`.
- 2026-06-27 workspace settings layout continuation:
  `/user/editform/route.tsx` now owns the legacy account-settings
  breadcrumb/tabs/page-wrap shell while the profile, password, notifications,
  emails, and token leaves render only their legacy section bodies through
  `renderShell={false}`. This keeps the React mutation boundaries intact while
  moving shell ownership to the TanStack Router nested layout. Focused coverage:
  `frontend/src/workspace-settings-i18n.spec.tsx`,
  `frontend/src/workspace-settings-parity.spec.tsx`, and
  `pnpm --dir frontend exec tsc --noEmit`.
- 2026-06-27 user files SPA navigation continuation:
  `/user/files` keeps the legacy current-user files form, tab, row, and
  pagination markup, but filter submit and pagination clicks now use TanStack
  navigation. The route refetches from router location state so file filtering
  and page changes no longer perform a native document GET. Focused coverage:
  `frontend/src/user-files-parity.spec.tsx`,
  `frontend/src/form-submit-boundary.spec.tsx`, and
  `pnpm --dir frontend exec tsc --noEmit`.
- 2026-07-04 user files backend link continuation:
  `/user/files` keeps the legacy file preview/name/download/location anchors on
  backend `/files/:id` and source resource URLs while tab, pagination, and
  filter navigation remain under TanStack Router. Focused coverage:
  `frontend/tests/user-files.e2e.ts`.
- 2026-06-27 user issues SPA navigation continuation:
  `/user/issues` keeps the legacy my-issues side filters, search form, open/closed
  tabs, sort links, and pagination markup, but same-page query changes now use
  TanStack navigation. The route refetches from router location state so issue
  filtering, state changes, search, sorting, and page changes no longer perform
  native document navigation. Focused coverage:
  `frontend/src/route-parity.spec.tsx`,
  `frontend/src/form-submit-boundary.spec.tsx`, and
  `pnpm --dir frontend exec tsc --noEmit`.
- 2026-06-27 directory SPA navigation continuation:
  `/projects` and `/orgs` keep the legacy directory GET forms, tabs, row
  structures, empty states, and pagination, but filter submits now call
  TanStack navigation. Directory search no longer performs native document
  navigation while preserving `index/allProjectList*.scala.html` and
  `index/allOrganizationList*.scala.html` output. Focused coverage:
  `frontend/src/route-parity.spec.tsx` and
  `pnpm --dir frontend exec tsc --noEmit`.
- 2026-06-27 pull request list SPA navigation continuation:
  project PR lists (`/pullRequests`, `/closedPullRequests`, and
  `/sentPullRequests`) plus organization PR aggregate lists (`/pullrequests`
  and `/closedPullrequests`) keep the legacy GET form, tab, row, and pagination
  markup, but search submits now call TanStack navigation. Each list route
  subscribes to router location state, so same-route filter and page-input
  changes refetch without native document navigation. Focused coverage:
  `frontend/src/route-parity.spec.tsx` and
  `pnpm --dir frontend exec tsc --noEmit`.
- 2026-06-27 board list SPA navigation continuation:
  project board lists (`/posts`) and organization board aggregates (`/boards`)
  keep the legacy `#option_form` GET markup, search/select controls, sort rows,
  and pagination output, but filter submits now call TanStack navigation. Each
  route subscribes to router location state, so same-route board filtering
  refetches without native document navigation. Focused coverage:
  `frontend/src/route-parity.spec.tsx` and
  `pnpm --dir frontend exec tsc --noEmit`.
- 2026-06-27 review-thread list SPA navigation continuation:
  project review lists (`/reviews`) keep the legacy hidden-field search form,
  side filters, state tabs, sort links, export href, rows, and pagination
  output, but search submits now call TanStack navigation. The route already
  subscribes to router location state, so same-route review filtering and
  page-input changes refetch without native document navigation. Focused
  coverage:
  `frontend/src/route-parity.spec.tsx` and
  `pnpm --dir frontend exec tsc --noEmit`.
- 2026-06-27 site-admin list SPA navigation continuation:
  `/sites/userList` and `/sites/projectList` keep the legacy search GET form,
  title, sidebar, row, modal, and pagination output, but search submits now call
  TanStack navigation. The existing href-derived site-admin query flow then
  refetches list data without native document navigation. Focused coverage:
  `frontend/src/site-admin-route-parity.spec.tsx` and
  `pnpm --dir frontend exec tsc --noEmit`.
- 2026-06-27 code browser SPA navigation continuation:
  code browser/history branch selectors and history keyboard paging keep the
  legacy `#branches` and shortcut behavior, but now route through TanStack
  navigation. Commit history subscribes to router location state so same-route
  `page` changes refetch without native document navigation. Focused coverage:
  `frontend/src/route-parity.spec.tsx` and
  `pnpm --dir frontend exec tsc --noEmit`.
- 2026-06-27 root/shared SPA navigation continuation: global navbar search
  still renders the legacy `common/navbar.scala.html` form action/dropdown
  shell, but submit now routes through TanStack navigation. Shared
  auth-required redirects, shared alias redirects, and project admin aliases
  also use TanStack navigation/replace semantics instead of direct document
  navigation. Focused coverage: `auth-workspace-shell.spec.tsx`,
  `user-profile-route-loading-shell-i18n.spec.tsx`,
  `issue-detail-shell.spec.tsx`, `route-parity.spec.tsx`, and
  `pnpm --dir frontend exec tsc --noEmit`.
- 2026-06-27 auth/password SPA navigation continuation: login, signup,
  lost-password, reset-password, and workspace password-change routes keep the
  React REST JSON submit boundary while success/error redirects now call
  TanStack navigation with base-path-prefixed hrefs instead of
  `navigateToAppHref`. Focused coverage: `auth-workspace-shell.spec.tsx`,
  `route-parity.spec.tsx`, `form-submit-boundary.spec.tsx`, and
  `pnpm --dir frontend exec tsc --noEmit`.
- 2026-06-27 issue mutation SPA navigation continuation: project issue create,
  edit, and delete routes keep their existing REST mutation calls but redirect
  through TanStack navigation with base-path-prefixed hrefs instead of
  `navigateToAppHref`. Focused coverage: `route-parity.spec.tsx` and
  `pnpm --dir frontend exec tsc --noEmit`.
- 2026-06-27 milestone mutation SPA navigation continuation: project milestone
  create, edit, and delete routes keep their existing REST mutation calls but
  redirect through TanStack navigation with base-path-prefixed hrefs instead of
  `navigateToAppHref`. Focused coverage: `route-parity.spec.tsx` and
  `pnpm --dir frontend exec tsc --noEmit`.
- 2026-06-27 board post mutation SPA navigation continuation: project board
  post create, edit, and delete routes keep their existing REST mutation calls
  but redirect through TanStack navigation with base-path-prefixed hrefs instead
  of `navigateToAppHref`. Focused coverage: `route-parity.spec.tsx` and
  `pnpm --dir frontend exec tsc --noEmit`.
- 2026-06-27 workspace/profile SPA navigation continuation: public profile
  redirect aliases reuse the shared TanStack `RedirectPage`, and workspace
  profile-save redirects now call TanStack navigation with base-path-prefixed
  hrefs instead of `navigateToAppHref`. Focused coverage:
  `auth-workspace-shell.spec.tsx`,
  `user-profile-route-loading-shell-i18n.spec.tsx`, and
  `pnpm --dir frontend exec tsc --noEmit`.
- 2026-06-27 project mutation SPA navigation continuation: project create,
  settings save, delete, VCS change, fork, and member self-leave routes keep
  their existing REST mutation calls but redirect through TanStack navigation
  with base-path-prefixed hrefs instead of `navigateToAppHref`. Focused
  coverage: `project-create-parity.spec.tsx`,
  `project-settings-parity.spec.tsx`, `project-members-parity.spec.tsx`,
  `route-parity.spec.tsx`, and `pnpm --dir frontend exec tsc --noEmit`.
- 2026-06-25 authenticated user-menu continuation: the root SPA shell restores
  the authenticated `common/usermenu.scala.html` top menu anchors that were
  missing for normal non-admin users: `issue.myIssue`, sidebar avatar toggle
  `#sidebar-open-btn`, plus dropdown `.dropdwon-box-btn`, direct issue/new-mine
  links, project create, non-guest organization create, site-admin wrench, and
  legacy-key sidebar labels for profile/account/logout/favorite/project/recent
  history. Focused evidence: `auth-workspace-shell.spec.tsx`,
  `root-custom-navbar-link.spec.ts`, `route-parity.spec.tsx`, and
  `pnpm --dir frontend check`.
- 2026-06-25 visual sweep note: legacy `/admin` remains the public user profile route and now falls through to the React `/$user` SPA surface instead of being intercepted by site-admin aliases. The expanded Playwright visual sweep covers that route together with route-tree-derived samples and records route evidence in `docs/provenance/visual-parity-sweep-2026-06-25.md`.
- 2026-06-25 visible i18n sweep note: the rendered local Playwright sweep no longer exposes raw legacy message keys. The React i18n boundary now loads `yona-original/conf/messages*` as the only bundled message dictionary, so legacy keys such as `user.role.owner` are not manually mirrored one-by-one in a React-owned fallback map. Focused evidence: `i18n.spec.tsx`, `migration-route-parity.spec.tsx`, route parity specs, and `docs/provenance/visual-parity-sweep-2026-06-25.md`.
- 2026-06-25 visible i18n sweep continuation: the post-fix embedded Playwright
  sweep passed local 152/152 and direct API fragment conversion 4/4 after
  replacing remaining visible literals for `notification`, `milestone`, and
  `fork` with legacy-key lookups. The raw-key detector now scans page chrome
  separately from user-authored Markdown/help examples so legacy keys can still
  be used as content without masking UI key leaks.
- 2026-06-25 visible-attribute i18n sweep continuation: the Playwright sweep
  now also scans page-chrome `title`, `placeholder`, `aria-label`,
  `data-content`, and `data-original-title` attributes for unresolved legacy
  keys. It caught and closed `issue.vote.description` vote tooltip leaks and
  board form `title` / `code.commitMsg` placeholder leaks; the strengthened
  embedded sweep passed local 152/152 and direct API fragment conversion 4/4.
- 2026-06-25 legacy default-message fallback continuation: provider-backed React i18n now follows the Play/Yona message fallback chain by checking the selected legacy language file first, then default `conf/messages`, then the explicit caller fallback/key. This prevents raw-key leakage for keys missing in a localized file but present in the default file, such as `project.webhook.includeGitPush` and `title.pullrequest`, while preserving raw-key output when no i18n provider is mounted. Focused evidence: `frontend/src/i18n.spec.tsx` and `frontend/src/project-settings-parity.spec.tsx`.
- 2026-06-25 legacy MessageFormat escaping continuation: React i18n now
  unescapes doubled apostrophes from `yona-original/conf/messages*`, matching
  Play/Java MessageFormat output for visible copy such as
  `common.comment.delete.confirm`, `project.webhook.help`, and
  `git.error.permission` instead of rendering `won''t` or doubled quotes.
  Focused evidence: `frontend/src/i18n.spec.tsx`.
- 2026-06-25 visible i18n sweep hardening note: the Playwright raw-key detector catches camelCase and broader legacy message namespaces such as `menu.*`, `code.*`, and `post.*`. The sweep no longer permits `title.newIssue`, `title.newMilestone`, `title.milestoneList`, `menu.review`, `code.commits`, `button.newIssue`, `post.notice.label`, or `post.readmefy` to leak into rendered titles/body; those keys are resolved through the React i18n boundary with values from `yona-original/conf/messages*`. Focused evidence: local embedded Playwright sweep 152/152, frontend build, and targeted route/auth workspace specs.
- 2026-06-25 legacy-keyspace i18n guard note: `frontend/src/i18n.spec.tsx` now fails if a React-owned local message dictionary is reintroduced outside the checked-in legacy `yona-original/conf/messages*` files. The same pass removed React-only keys such as `issue.milestone`, `pullRequest.review.required`, and `pullRequest.conflict.manualResolve` from rendered code paths in favor of legacy keys (`milestone`, `pullRequest.not.acceptable.*`, `pullRequest.resolve.conflict`) and legacy `git/partial_info.scala.html` reviewer markup. Focused evidence: targeted frontend i18n/route parity Vitest suite and `pnpm --dir frontend check`.
- 2026-06-25 `/messages.js` i18n source-of-truth continuation: the Rust
  compatibility script no longer owns a partial hardcoded message list. It now
  parses `yona-original/conf/messages` directly and publishes the full legacy
  default key map through `Messages(key, ...)` and `Messages._messages`, keeping
  the browser-side global helper on the same legacy keyspace as the React i18n
  runtime. Provider-less visible fallback exceptions are no longer allowed:
  anonymous home signup, auth titles, and other visible labels preserve the
  legacy key itself when the React i18n provider is absent, while provider-backed
  rendering still resolves through `yona-original/conf/messages*`. Focused
  evidence:
  `routes::messages` Rust unit tests, `frontend/src/i18n.spec.tsx`, the full
  frontend Vitest suite selected by that spec invocation, and
  `pnpm --dir frontend check`.
- 2026-06-25 legacy-key fallback continuation: root navigation
  (`title.list`, `title.yobi.feedback`, `button.login`, `title.signup`), the
  code-browser edit action (`button.edit`), and workspace notification mutation
  fallback now use only checked-in legacy message keys. The previous synthetic
  `error.failedTo userinfo.changeNotifications` key was replaced with legacy
  `error.failedTo` plus `userinfo.changeNotifications` arguments. Focused
  evidence: `auth-workspace-shell.spec.tsx`, `workspace-settings-i18n.spec.tsx`,
  `code-views.spec.tsx`, `project-code-browser-routing.spec.ts`,
  `i18n.spec.tsx`, and `pnpm --dir frontend check`.
- 2026-06-25 provider-missing i18n fallback correction: React visible i18n
  call sites still use the exact legacy message keys from
  `yona-original/conf/messages*`; however the `useLegacyMessages()` default
  context no longer returns the raw key when a component is rendered outside
  `LegacyI18nProvider`. It now follows the same legacy default-message lookup
  before falling back to the key, so provider boundary mistakes do not surface
  raw values such as `title.no.results` in user-visible HTML. Focused evidence:
  `frontend/src/i18n.spec.tsx`.
- 2026-06-25 auth/workspace direct-render i18n continuation: frontend
  auth/workspace parity helpers now inject the same legacy default message
  lookup used by the runtime, and auth post-submit alerts translate
  `user.signup.requested`, `user.loginWithNewPassword`, and
  `user.verification.mail.sent` through `yona-original/conf/messages*` instead
  of rendering raw keys. The source-level contract still keeps all visible i18n
  call sites on legacy keys. Focused evidence:
  `frontend/src/auth-workspace-shell.spec.tsx` and `frontend/src/i18n.spec.tsx`.
- 2026-06-25 workspace-settings direct-render i18n continuation:
  `workspace-settings-i18n.spec.tsx` now treats the direct render helper as a
  user-visible render path and expects legacy default-message output for
  profile, password, email, and token controls rather than raw key leakage.
  Korean runtime lookup coverage remains unchanged.
- 2026-06-25 directory/home/files/notification direct-render i18n
  continuation: the directory, anonymous home, user-files, and notification
  welcome focused helper now supplies the legacy default lookup by default, so
  direct-rendered surfaces assert user-visible messages from
  `yona-original/conf/messages*` instead of raw fallback keys. Korean runtime
  lookup coverage remains unchanged.
- 2026-06-25 route-loading direct-render i18n continuation: the shared
  redirect/loading shell now asserts the same provider-missing legacy default
  lookup as other visible React surfaces: `common.loading` renders as the
  default legacy `Loading`, while provider-backed Korean rendering remains
  `불러오는 중`.
- 2026-06-25 help route direct-render i18n continuation: anonymous `/_help`
  direct rendering now expects the legacy default `title.help` value `Help`
  while preserving Korean runtime lookup coverage for the same title.
- 2026-06-25 auxiliary direct-helper i18n continuation: the shared
  directory, anonymous home, help, and Markdown editor/receiver helper
  functions now resolve missing-provider labels through the legacy default
  message file rather than returning raw keys. The Markdown editor tab and
  action labels now cover `common.editor.edit`, `common.editor.preview`,
  `button.add.checklist`, and `button.clear.temporary` through the same legacy
  default lookup. Focused evidence:
  `directory-home-user-files-notification-i18n.spec.tsx`,
  `help-route-parity.spec.tsx`, `markdown-renderer.spec.tsx`, and
  `i18n.spec.tsx`.
- 2026-06-25 project-watchers direct-render i18n continuation: the project
  watchers page direct-render parity check now expects legacy default message
  output for `project.watcher.title` and `project.watcher.description` instead
  of raw fallback keys.
- 2026-06-25 issue/board/pr/milestone direct-render i18n continuation:
  provider-less project issue, board, pull-request, milestone, project-create,
  and Markdown help surfaces now resolve visible legacy keys through
  `yona-original/conf/messages` default output instead of accepting raw key
  leakage in direct-render parity tests.
- 2026-06-25 project/menu/code/organization i18n continuation: shared
  project, code, and organization view helpers now use the same legacy default
  lookup when no runtime provider is supplied. Keymap direct-render assertions
  were moved from raw key strings to the legacy default visible labels. Code
  browser and commit-diff direct-render assertions now follow the same default
  visible-label policy for code navigation, file actions, no-head guidance, and
  commit discussion controls.
- 2026-06-25 root search form continuation: root navigation preserves the
  legacy `common/navbar.scala.html` global search anchors:
  `name="gnb-search-form"`, hidden `searchType=auto`, `keyword`, and
  `accesskey=S`. i18n stays bounded to the legacy keyspace: new visible labels
  must reuse keys present in `yona-original/conf/messages*` instead of creating
  React-only message names. Focused evidence: `auth-workspace-shell.spec.tsx`
  and `i18n.spec.tsx`.
- 2026-06-25 site-admin i18n fallback continuation: provider-less site-admin
  rendering no longer carries ad-hoc English fallback copy for legacy labels
  such as mail, mass-mail, update, and mail-sent status. Those fallbacks now
  preserve the original legacy message keys (`site.sidebar.mailSend`,
  `site.sidebar.massMail`, `site.sidebar.update`, `title.sendMail`,
  `title.massMail`, `site.mail.sended`) while runtime-provider rendering still
  resolves through `yona-original/conf/messages*`. Focused evidence:
  `site-admin-route-parity.spec.tsx` and `i18n.spec.tsx`.
- 2026-06-25 legacy-key-only fallback continuation: visible frontend i18n
  fallbacks must keep the legacy key itself rather than composing a synthetic
  fallback string with runtime arguments. `project.changeVCS.description1` and
  `project.changeVCS.requestion` now pass `nextVcs` only through legacy message
  arguments when a provider is present, while provider-less rendering preserves
  the exact key. `frontend/src/i18n.spec.tsx` guards the main route view files
  against fallback strings containing spaces, so newly added visible copy has to
  reuse keys from `yona-original/conf/messages*`. Focused evidence:
  `i18n.spec.tsx`, `project-settings-parity.spec.tsx`,
  `route-parity.spec.tsx`, and `pnpm --dir frontend check`.
- 2026-06-25 legacy-key-only fallback expansion: code, pull-request, and issue
  label settings helpers now use the same provider-less fallback rule. Legacy
  message arguments are still passed to the runtime provider for translated
  rendering, but missing-provider output keeps only the original legacy key
  instead of synthetic `key arg` strings such as
  `pullRequest.review.participants 0` or `code.nohead.clone <site>`. The same
  pass restores the PR event commit-message shell from
  `common/commitMsg.scala.html`: multi-line PR event commits render
  `.commitMsg.moreBtn` and a hidden `.commitMsg.desc` containing only the body
  after the first line. Focused evidence: `frontend/src/i18n.spec.tsx`,
  `frontend/src/code-views.spec.tsx`,
  `frontend/src/pull-request-review-i18n.spec.tsx`,
  `frontend/src/route-parity.spec.tsx`, and `pnpm --dir frontend check`.
- 2026-06-25 auth OAuth warning key continuation: unsupported and denied
  OAuth redirects still preserve the bounded `/users/loginform?error=...`
  state, but the login warning no longer renders React-only
  `auth.socialLogin.*` keys or provider-name suffixes. Unsupported providers
  surface through legacy `error.badrequest`, and denied callbacks surface
  through legacy `error.forbidden.or.not.allowed`, both via the React i18n
  runtime. Focused evidence: `auth-workspace-shell.spec.tsx` and
  `i18n.spec.tsx`.
- 2026-06-25 organization fallback-key continuation: organization header/menu
  rendering no longer composes provider-less fallback strings such as
  `organization.you.may.want.to.be.a.member <org>`. Missing-provider output
  resolves through the legacy default message file instead of exposing raw keys,
  including the organization home project-watch tooltip
  `project.you.are.not.watching`; provider-backed rendering still passes the
  organization name as a legacy message argument. Focused evidence:
  `organization-shell-i18n.spec.tsx`, `organization-home-parity.spec.tsx`, and
  `i18n.spec.tsx`.
- 2026-06-25 search/site-admin fallback-key continuation: provider-less search
  result titles and site-admin diagnostic/update status labels no longer
  compose argument-bearing fallback strings such as
  `search.result.title <count> <category>` or `site.update.currentVersion {0}`.
  Missing-provider output keeps only the legacy key, while provider-backed
  rendering still passes counts, categories, and versions as legacy message
  arguments. Focused evidence: `search-i18n.spec.tsx`,
  `site-admin-route-parity.spec.tsx`, `route-parity.spec.tsx`, and
  `i18n.spec.tsx`.
- 2026-06-25 issue-label validation fallback continuation: issue label settings
  form validation no longer stores visible strings such as
  `label.failedTo label.add` or the incorrectly arity-mismatched
  `error.failedTo label.add`. Validation state is structured as legacy message
  keys plus legacy arguments, so missing-provider output keeps only keys while
  provider-backed rendering still formats `label.failedTo`,
  `label.error.empty`, `label.error.color`, and related label errors through
  `yona-original/conf/messages*`. Focused evidence:
  `issue-label-settings-i18n.spec.tsx`, `route-parity.spec.tsx`, and
  `i18n.spec.tsx`.
- 2026-06-25 legacy mention highlight continuation: board, issue, and pull
  request review comment rendering now reproduces the legacy
  `board/view.scala.html`, `issue/view.scala.html`, and `git/view.scala.html`
  jQuery pass that adds `mentioned` to comments containing the current user's
  pure-name/login mention and `me` to matching `.user-link` anchors. React
  passes the current session label/login into Markdown rendering instead of
  relying on post-render DOM mutation, so the SPA output contains the same class
  hooks for initial render, translated comment bodies, task-list rerenders, and
  child comment fragments. Focused evidence: `markdown-renderer.spec.tsx`,
  `issue-detail-shell.spec.tsx`, `route-parity.spec.tsx`,
  `pull-request-review-i18n.spec.tsx`, and `pnpm --dir frontend check`.
- 2026-06-25 legacy issue-label contrast continuation: React issue, board, and
  organization issue-label anchors now apply the legacy `dimgray` / `white`
  contrast class from `issue/view.scala.html`'s
  `$yobi.getContrastColor(background-color)` pass at render time. The shared
  frontend helper mirrors the existing Rust label CSS utility's hex
  normalization and `0.21R + 0.72G + 0.07B > 192` threshold so detail sidebars,
  project issue lists, organization issue lists, child issue rows, and issue
  form selected-label fallbacks keep the same text-color hooks without a
  jQuery post-render mutation. Focused evidence: `issue-detail-shell.spec.tsx`,
  `issue-list-filter.spec.tsx`, `route-parity.spec.tsx`,
  `organization-shell-i18n.spec.tsx`, and `pnpm --dir frontend check`.
- 2026-06-27 issue detail header CSS continuation: React issue detail now
  keeps the legacy `_page.less` board-id/date color, spacing, and line-height
  under the `issue-detail-page` shell without changing JSX or REST behavior.
  Focused evidence: `issue-detail-shell.spec.tsx` and
  `pnpm --dir frontend exec tsc --noEmit`.
- 2026-06-25 issue sharer picker continuation: React issue detail now mirrors
  the legacy `issue/view.scala.html` `#issue-share-button` click behavior that
  reveals `#sharer-list` and adds `.sharer-list-border` to `.sharer-list`.
  The share/add/remove data path remains React-owned, but the user-visible
  hidden/open class transition no longer depends on jQuery DOM mutation.
  Focused evidence: `frontend/src/issue-detail-shell.spec.tsx` and
  `frontend/src/route-parity.spec.tsx`.
- 2026-06-25 issue vote direct-route continuation: legacy
  `POST /:owner/:project/issue/:number/vote|unvote` is restored for the
  issue detail vote control from `issue/view.scala.html`. The React SPA still
  handles in-place mutation through its callback, but the rendered control is
  again an anchor with the legacy direct `href` and `data-request-method="post"`
  shell so non-SPA request hooks and copied DOM match the legacy page. Focused
  evidence: `crates/server/tests/issue_comment_vote_contract.rs`,
  `frontend/src/issue-detail-shell.spec.tsx`, and
  `frontend/src/route-parity.spec.tsx`.
- 2026-06-25 markdown help continuation: the React-rendered markdown help keeps
  the legacy `help/markdown.scala.html` examples where the list input displays
  `- Green.` while the rendered output omits the period, and the image input
  displays the `https://repo.yona.io/.../ico-like-small.png` URL while the
  rendered output uses `/assets/images/ico-like-small.png`; the checklist help
  item also omits the runtime tasklist progress bar that belongs to rendered
  issue/board/code bodies, not the static help panel, and keeps the static
  checkbox example free of runtime task-list classes. Focused evidence:
  `markdown-renderer.spec.tsx`.
- 2026-06-25 markdown tasklist continuation: rendered task-list checkboxes now
  follow `yona.Tasklist.js` `disableCheckboxIfNeeds`: `data-allowed-update`
  other than `true` renders disabled checkboxes, while `data-allowed-update=true`
  leaves them enabled for the legacy update affordance. The React markdown
  module also preserves the legacy `checkTask` line-toggle regex for unordered
  `-`, `+`, and `*` checklist rows as a reusable helper for wiring the click
  mutation path. Focused evidence: `markdown-renderer.spec.tsx`.
- 2026-06-25 markdown tasklist click continuation: writable rendered
  task-list checkboxes now expose the same checkbox index basis used by
  `yona-original/public/javascripts/common/yona.Tasklist.js`, compute the next
  Markdown with the preserved legacy `checkTask` regex, and route issue/board
  body updates through legacy external `PATCH
/-_-api/v1/owners/:owner/projects/:project/(issues|posts)/:number/content`
  with `{ content, original }`. Board and issue detail pages also preserve the
  legacy hidden form plus adjacent body wrapper shell that `yona.Tasklist.js`
  expects; board's previous non-existent `/api/v1/projects/.../content` action
  was corrected to the legacy external route. Focused evidence:
  `markdown-renderer.spec.tsx`, `issue-detail-shell.spec.tsx`,
  `route-parity.spec.tsx`, and `pnpm --dir frontend check`.
- 2026-06-25 markdown tasklist nested-click continuation: the React
  source-update helper now mirrors `yona.Tasklist.js` `checkTask` child
  recursion for nested unordered checklist items. Clicking a parent updates
  deeper `-`/`+`/`*` task rows until the next same-or-shallower task row, while
  still leaving ordered task rows outside the legacy update regex. Focused
  evidence: `markdown-renderer.spec.tsx`.
- 2026-06-25 markdown comment tasklist continuation: issue and board comments
  now wire writable rendered task-list checkboxes to the existing comment update
  mutation path, matching legacy `partial_comment.scala.html` /
  `partial_comments.scala.html` where `commentUpdateForm` sits immediately
  before `#comment-body-*` and `yona.Tasklist.js` PATCHes updated Markdown
  content from the hidden form. The callback uses the original comment Markdown,
  not translated display Markdown. Focused evidence:
  `issue-detail-shell.spec.tsx`, `route-parity.spec.tsx`, and
  `pnpm --dir frontend check`.
- 2026-06-25 child-comment Markdown wrapper continuation: issue and board
  one-line child comments now render Markdown blocks directly inside
  `.one-line-comment > .contents`, matching legacy `common/childComments.scala.html`
  where `@Html(Markdown.render(...))` is immediately followed by the hidden
  `.subcomment-author` span. This removes the extra React wrapper div only for
  the child-comment surfaces. Focused evidence:
  `markdown-renderer.spec.tsx`, `issue-detail-shell.spec.tsx`, and
  `route-parity.spec.tsx`.
- 2026-06-25 child-comment submit label continuation: nested issue and board
  child-comment forms now keep the legacy `common/child_commentForm.scala.html`
  literal `OK` submit button instead of exposing a non-legacy `comment.save` or
  `OK` message key; the non-visible accessible name uses the legacy
  `button.comment.new` key. Focused evidence:
  `issue-board-pr-milestone-i18n.spec.tsx` and `route-parity.spec.tsx`.
- 2026-06-25 dashboard/milestone key cleanup: project dashboard no-current-
  milestone rows now use legacy `partial_dashboard_issuesbymilestone.scala.html`
  `issue.noMilestone` instead of non-legacy `milestone.none`, and milestone
  form due-date accessibility text uses the existing `milestone.form.dueDate`
  label instead of non-legacy `milestone.dueDate`. Project dashboard label
  sections also stop rendering a non-legacy `label.none` fallback row when the
  legacy `partial_dashboard_issuesbylabel.scala.html` has no labels to output.
  Focused evidence: `project-home-tabs.spec.tsx` and `route-parity.spec.tsx`.
- 2026-06-25 anonymous user label cleanup: code/PR anonymous-author fallbacks
  now preserve legacy template output as a model-constant string
  `User.anonymous.name` instead of routing it through legacy message lookup,
  because `code/diff.scala.html`, `code/history.scala.html`, and
  `git/viewChanges.scala.html` render `@User.anonymous.name`, not
  `Messages(...)`. Focused evidence: `code-views.spec.tsx` and
  `route-parity.spec.tsx`.
- 2026-06-25 raw Markdown sanitizer continuation: React raw HTML rendering now
  keeps the legacy `utils/Markdown.java` sanitizer allowlist for media embeds,
  including `video` `autoplay`/`controls`/`preload`/`type`/`responsive`/
  `fluid`/`liveui`/`data-setup`/dimensions, `source` `src`/`type`/`target`,
  and `iframe` `src`/dimensions/`frameborder`/`allow`/`allowfullscreen`, while
  still dropping unsafe `javascript:` media URLs and event handler attributes.
  Focused evidence: `markdown-renderer.spec.tsx` and
  `yona-original/app/utils/Markdown.java`.
- 2026-06-25 markdown external-link target continuation: React Markdown
  rendering mirrors `common/scripts.scala.html` external-link postprocessing
  for legacy `.markdown-wrap` containers by adding `target="_blank"` to links
  whose `href` does not start with `.`, `/`, or `#`, including generated
  Markdown links, bare autolinks, inline raw HTML anchors, and raw HTML block
  anchors, while leaving relative/internal anchors unchanged. Focused evidence:
  `markdown-renderer.spec.tsx`.
- 2026-06-25 markdown wrapper boundary continuation: React Markdown call sites
  must keep `markdown-wrap` on legacy Markdown content surfaces so
  `.markdown-wrap`-scoped behavior such as external-link targeting applies.
  The only unwrapped route-level exceptions are the legacy
  `common/partial_history.scala.html` modal body and
  `common/childComments.scala.html` one-line child-comment fragments, both of
  which are also unwrapped in legacy templates. Focused evidence:
  `markdown-render-boundary.spec.tsx`.
- 2026-06-25 markdown render-model boundary continuation: REST/API modules may
  still carry empty server-HTML compatibility fields for legacy wire shape, but
  React render view-model boundaries no longer expose `bodyHtml`,
  `contentsHtml`, or `historyHtml` fields. Project README, issue body/history,
  and comments flow into views through Markdown source plus reference metadata.
  Focused evidence: `markdown-render-boundary.spec.tsx`.
- 2026-06-25 markdown unclosed-fence stability continuation: legacy `marked`
  closes fenced code blocks at EOF. React Markdown now preserves that behavior
  even when the source does not end with a trailing newline, while keeping
  mismatched closing-fence candidates as paragraph text like legacy. This keeps
  invalid or truncated very long SQL fenced blocks on the escaped plain-source
  code path instead of expanding into a giant paragraph/line-break tree or
  syntax-highlight spans. Focused evidence: `markdown-renderer.spec.tsx`.
- 2026-06-25 markdown mention-boundary continuation: current-user comment
  highlighting now follows the same legacy AutoLinkRenderer boundary as rendered
  mentions. Raw Markdown fallback detection only treats `@loginId` tokens with
  legacy non-word boundaries as a mention, while resolved mention metadata still
  marks the current user. Plain substrings such as `ann` inside `banner` no
  longer mark a comment as mentioning the viewer. Focused evidence:
  `markdown-renderer.spec.tsx`.
- 2026-06-25 auth-title fallback continuation: provider-less auth renders no
  longer carry hardcoded English title templates for `title.loginFor`,
  `title.signupFor`, or `title.resetPasswordFor`; those fallbacks preserve only
  the exact legacy key while provider-backed rendering still resolves the
  checked-in legacy message dictionary. Focused evidence: `i18n.spec.tsx`,
  `auth-workspace-shell.spec.tsx`, `wave1-auth-workspace-parity.spec.tsx`, and
  `pnpm --dir frontend check`.
- 2026-06-25 pilot seed copy note: the seeded `pilot/yona` project no longer exposes the internal "browser-safe route tree" implementation note in project home/directory views; the visual sweep now fails if that fixture copy or the unbased `localhost:3001/yo` clone URL leaks into rendered UI.
- 2026-06-25 project settings sweep note: legacy project admin GET pages for `/changeVCS`, `/transfer`, and `/webhooks` now fall through to the React SPA shell while preserving their legacy direct mutation methods; the non-legacy webhook delivery-history block was removed from the React settings page. The local rendered-screen Playwright sweep now waits past transient loading shells and passes the expanded route corpus. `/sites/diagnostic` browser GET also serves the React shell on forbidden viewers instead of exposing raw JSON, while `/api/v1/site/diagnostics` remains site-admin-only. Focused evidence: project settings/route parity specs, cargo build, and `docs/provenance/visual-parity-sweep-2026-06-25.md`.
- 2026-07-02 project webhook form interaction note: React now preserves the legacy `project/webhooks.scala.html` inline script behavior for the webhook type radios. Selecting `JSON` forces `#gitPush` checked and prevents unchecking it; switching back to a non-JSON type clears the checkbox and lets the user opt in manually. Focused guard: `frontend/tests/project-webhooks-form.e2e.ts`.
- 2026-06-25 combined visual sweep note: direct Playwright browser access to the homelab legacy IP still fails, but the committed localhost curl proxy lets Playwright render the legacy pages. The latest combined sweep records legacy 73/77, local 154/154, direct API 13/13, imported legacy-audit page coverage 49/49 on both targets, and 0 same-path comparison failures; the four legacy failures are homelab reference timeout/500 responses, not Rust-rendered local failures. The comparison output now also records `comparisonSummary`, separating 0 diff failures / 0 local failures from 21 explicit same-path HTTP status deltas, mostly homelab-reference non-OK or sample-data status differences where the local seeded route renders successfully. The sweep fails when legacy renders a normal page but local renders a not-found/forbidden/bad-request page, applies detail/edit/code/compare suffixes to discovered legacy project roots such as `/admin/sample`, and treats legacy `/notification?from=...` as a fragment while requiring the Rust port to render the React shell for browser navigation. Focused evidence: `scripts/visual-parity-sweep.mjs`, `scripts/visual-parity-comparison.mjs`, `scripts/legacy-curl-proxy.mjs`, `notification_contract::notification_contract_direct_notification_html_accept_serves_spa_shell`, and `docs/provenance/visual-parity-sweep-2026-06-25.md`.
- 2026-06-25 legacy curl proxy reproducibility note: the temporary localhost
  proxy used for legacy Playwright rendering is now committed as
  `scripts/legacy-curl-proxy.mjs` and exposed as
  `pnpm smoke:legacy-curl-proxy`. A legacy-only Playwright rerun through
  `http://127.0.0.1:19100` confirmed 77 checked, 73 passed, 4 homelab-reference
  failures, authenticated session, and 49/49 imported legacy-audit page
  coverage. Focused evidence: `scripts/legacy-curl-proxy.spec.mjs` and
  `docs/provenance/visual-parity-sweep-2026-06-25.md`.
- 2026-06-25 visual sweep corpus hardening note: `scripts/visual-parity-sweep.mjs` now imports `.agent/legacy-html-page-audit/latest.json` `discoveredPageLinks` into the rendered-screen corpus for both legacy and local targets, recording them as `legacyAuditPages` in the sweep output. This keeps browser parity checks coupled to the HTML-link audit so newly found legacy pages are not silently left out of Playwright review.
- 2026-06-25 visual sweep corpus failure guard note: `scripts/visual-parity-sweep.mjs` now treats missing, invalid, unreachable, or failed `.agent/legacy-html-page-audit/latest.json` as an unusable corpus and exits non-zero instead of silently shrinking rendered-screen coverage to hand-listed routes only. The sweep output records `legacyAuditCorpus.status/error/pages`, and `scripts/legacy-html-page-audit.spec.mjs` covers unreachable and successful corpus normalization.
- 2026-06-25 legacy audit test isolation note: `scripts/audit-legacy-html-pages.mjs` accepts `YONA_LEGACY_AUDIT_OUTPUT_DIR` so unreachable-baseline contract tests write to a temporary directory instead of overwriting `.agent/legacy-html-page-audit/latest.json`. After adding the override, the real homelab legacy audit was rerun outside the sandbox and restored the current corpus to 57/57 passing pages with no unaudited discovered links.
- 2026-06-25 local visual sweep refresh: after restoring the legacy HTML audit corpus, the local Playwright sweep against `http://127.0.0.1:18111/yona` passed 154/154 rendered pages, 13/13 direct API fragment-conversion surfaces, and 49/49 imported legacy-audit pages with no missing coverage. Focused evidence: `output/playwright/visual-sweep/latest.json` and `docs/provenance/visual-parity-sweep-2026-06-25.md`.
- 2026-06-27 local visual sweep refresh: after the latest TanStack Router shell,
  SPA navigation, and legacy CSS utility follow-ups, the mounted local
  Playwright sweep against `http://127.0.0.1:18111/yona` passed 174/174
  rendered pages, 13/13 direct API fragment-conversion surfaces, and 67/67
  imported legacy-audit pages with no missing coverage. The run recorded
  `diffFailures 0` and `localFailures 0` in
  `output/playwright/visual-sweep/latest.json` at
  `2026-06-27T01:15:45.287Z`.
- 2026-06-25 direct API sweep hardening note: the local Playwright visual sweep
  now checks 13 React-owned data/legacy-helper surfaces, including workspace
  sidebar/menu, notification paging, Markdown preview source return, direct
  issue/project label JSON helpers, legacy external assignable/sharer lookup
  helpers, and project mention-list autocomplete helper aliases. The direct
  sweep fails on HTML fragment responses, non-JSON content types, wrong JSON
  kind, or missing required array item keys.
- 2026-06-25 auth REST boundary note: React-owned signup/login screens submit
  through `/api/v1/auth/register` and `/api/v1/auth/sign-in` REST JSON. The
  legacy `/users/signup` and `/users/login` form POST routes remain only as
  direct compatibility adapters for legacy clients and redirects, not as the SPA
  primary path. Focused evidence: `frontend/src/form-submit-boundary.spec.tsx`,
  `tests/server-spa-rest-boundary-contract.test.mjs`, and
  `auth_workspace_contract::direct_legacy_login_and_signup_form_routes_accept_legacy_form_csrf_redirect_and_authenticate`.
- 2026-06-25 default-method form boundary continuation: React-rendered forms
  with `action` but no `method`/`onSubmit` are now limited to the two
  legacy-default GET filters that also omit `method` in `yona-original`
  (`common/navbar.scala.html` global search and `user/userFiles.scala.html`
  file filter). New action forms must either be explicit GET search/filter
  forms or intercept submit through the React boundary. Focused evidence:
  `frontend/src/form-submit-boundary.spec.tsx`.
- 2026-06-25 pushed-branch dismissal REST boundary note: the pull-request list
  recent pushed-branch close control keeps the legacy `data-request-method` /
  `data-request-uri` attributes for markup parity, but React now intercepts the
  click and calls `/api/v1/owners/{owner}/projects/{project}/pushed-branches/{id}`
  DELETE. The legacy `/{owner}/{project}/pushedBranch/{id}/delete` route remains
  a direct compatibility adapter. Focused evidence:
  `frontend/src/form-submit-boundary.spec.tsx`,
  `frontend/src/route-parity.spec.tsx`,
  `tests/server-spa-rest-boundary-contract.test.mjs`, and
  `cargo check -p yoram-server`.
- 2026-06-25 data-request guard continuation: the React submit boundary guard now
  covers legacy `data-request-uri` markers even when `data-request-method` is
  absent, requiring mutation anchors to intercept navigation and mutation
  buttons to declare `type="button"`, own an `onClick` handler, and call
  `event.preventDefault()`. This keeps board/issue child comment delete,
  comment vote, code discussion, milestone, pull-request review/thread/source
  branch, workspace email, and site-admin user/mail controls inside the React
  event boundary while preserving legacy marker attributes for DOM parity.
  Focused evidence: `frontend/src/form-submit-boundary.spec.tsx`.
- 2026-06-25 mutation data-href guard continuation: the same React boundary
  guard now covers legacy mutation-flavored `data-href` markers such as leave,
  member edit/delete, reset, watch/enroll, transfer, change-VCS, and pushed-branch
  helpers. These markers may remain for DOM parity, but matching elements must
  intercept the click before invoking the React REST callback path. Focused
  evidence: `frontend/src/form-submit-boundary.spec.tsx`.
- 2026-06-25 native POST guard hardening: the React form boundary now detects
  JSX native POST forms across quoted, single-quoted, expression-wrapped, and
  case-varied `method` spellings. The route tree now has no React-rendered
  native POST forms; multipart import screens keep legacy fields and file inputs
  but submit through React handlers and API clients. Focused evidence:
  `frontend/src/form-submit-boundary.spec.tsx`.
- 2026-06-25 form button submit guard hardening: the same boundary now scans
  route JSX form bodies and requires every nested `button` to declare `type`, so
  click-only controls such as label color presets, comment edit cancel buttons,
  checklist insertion, draft save/publish, and review-thread state controls
  cannot silently become native submit buttons. Focused evidence:
  `frontend/src/form-submit-boundary.spec.tsx`.
- 2026-06-25 legacy API action form guard hardening: hidden Markdown source
  forms may keep `/-_-api/.../content` actions for legacy DOM/task-list parity,
  but they now intercept submit explicitly and the boundary guard requires every
  `/-_-api` action form to include `onSubmit` plus `event.preventDefault()`.
  Focused evidence: `frontend/src/form-submit-boundary.spec.tsx`,
  `frontend/src/route-parity.spec.tsx`, and
  `frontend/src/issue-detail-shell.spec.tsx`.
- 2026-06-20 runtime DI note: app route assembly now receives an explicit `RuntimeRegistry` built from the initialized `AppRuntimeConfig` snapshot, so route registration reads mail/update/auth/translation/site-name/default-scope/upload-size runtime config from one injected registry instead of threading those config fragments as separate function parameters. This is behavior-neutral plumbing toward per-test runtime config isolation without process-global env locks.
- 2026-06-20 runtime DI note: project direct aliases for watch/unwatch, enroll/cancel-enroll, changeVCS, member CRUD, webhook CRUD, overview update, and clone now reuse the app-scoped `PilotServiceImpl` registered by `routes::projects` instead of rebuilding service/runtime config from process env in each handler. Existing project member, webhook, changeVCS, rest watch/enroll, and project overview/clone contract coverage remains the behavior evidence.
- 2026-06-20 runtime DI note: legacy direct auth login/signup routes now receive the app-scoped `PilotServiceImpl` from auth route registration instead of rebuilding auth UI and SMTP runtime config from process env. The direct legacy login/signup contract now uses the explicit default `AppRuntimeConfig` helper without process-env mutation for the default auth UI path.
- 2026-06-20 runtime DI note: legacy direct commit discussion create/delete aliases now receive the app-scoped `PilotServiceImpl` from code route registration instead of rebuilding auth UI and SMTP runtime config from process env. The existing commit detail discussion contract covers both direct create/delete redirects and REST state projection.
- 2026-06-20 runtime DI note: legacy direct pull-request accept, source-branch delete/restore, and review-thread open/close aliases now receive the app-scoped `PilotServiceImpl` from pull request route registration instead of rebuilding auth UI and SMTP runtime config from process env. The pull request mutation contract covers direct accept/source-branch redirects and direct thread state aliases.
- 2026-06-20 runtime DI note: legacy direct workspace aliases for profile update, password change, email add/delete/main/validation/confirm, API-token reset, project leave, visited-list reset, and notification toggle now receive the app-scoped `PilotServiceImpl` from workspace/notification route registration instead of rebuilding auth UI and SMTP runtime config from process env. Focused auth/workspace direct-route contracts cover the redirects and persisted state changes, and default-config direct workspace tests no longer mutate auth env vars.
- 2026-06-20 runtime DI note: legacy direct site-admin aliases for diagnostics, no-avatar users, export/import, avatar assignment, mail send/list, update unwatch/download, user admin/lock/guest/password/delete, and project delete now receive the app-scoped `PilotServiceImpl` from site-admin route registration instead of rebuilding auth UI and SMTP runtime config from process env. Site-admin direct mutation, update, import/export, and mail contracts cover the route behavior, and the representative mail send contract now uses explicit `AppRuntimeConfig.smtp` instead of mutating SMTP env.
- 2026-06-20 runtime DI note: Smart HTTP and SVN Basic-auth principal resolution now receives the app-scoped `AuthUiConfig` through asset fallback route registration instead of calling `AuthUiConfig::from_env()` when checking whether unconfirmed users should be challenged. Smart HTTP and SVN protocol contracts cover the shared principal/ACL boundary.
- 2026-06-20 runtime DI note: notification mail delivery and scheduler tick execution now receive an explicit `NotificationMailDeliveryConfig`, including allowed recipient domains, sender, BCC mode, recipient batching, site name, and reply-to mailbox address. Delivery no longer reads SMTP/notification/mailbox env during drain, and representative notification delivery, scheduler, allowed-domain, and BCC contracts inject delivery config instead of mutating process env.
- 2026-06-20 runtime DI note: mailbox polling scheduler config is now consumed only from the startup snapshot path. The env-backed mailbox polling helper and env-mutating mailbox scheduler test were removed; mailbox scheduler shape remains covered by the startup snapshot contract and polling tick contract.
- 2026-06-20 runtime DI note: project, issue, board, pull-request, review-comment, and Smart HTTP webhook fan-out now uses the app-scoped `IntegrationConfig` snapshot from `AppRuntimeConfig` instead of calling `IntegrationConfig::from_env()` during delivery. The webhook retry contract injects `YONA_WEBHOOK_DELIVERY_RETRIES` through per-router config instead of mutating process env, while `project_webhook_contract` and `pull_request_mutation_contract` cover the touched fan-out paths.
- 2026-06-21 Slack webhook detail/color audit: legacy `Webhook.java` exposes Slack only as project webhook type `DETAIL_SLACK`; `buildAttachmentJSON` sets attachment `text`, nullable/array `fields`, and `color` from `slack.<EventType>`. Rust now snapshots `[slack]` TOML and legacy-style `slack.<EventType>` env keys into `AppRuntimeConfig.slack_webhook_colors`, and issue/comment/PR `DETAIL_SLACK` payload builders apply that color without adding a separate Slack integration surface. Coverage: `runtime_config_contract` and `project_webhook_contract::project_webhooks_enqueue_legacy_board_comment_payloads_for_non_json_hooks`.
- 2026-06-21 webhook signature audit: P4-C is retired as not applicable for legacy parity. Legacy `Webhook.java` `sendRequest` only sets `Content-Type: application/json`, `User-Agent: Yobi-Hookshot`, and optional `Authorization: token <secret> `, while `project.webhook.help` documents only that token header. Targeted legacy/current searches found no `X-Hub-Signature`, `X-Yona-*`, SHA/HMAC signing, or equivalent webhook signature behavior, so Rust preserves the implemented token secret header and does not add a new signature surface.
- 2026-06-20 runtime DI note: notification mail scheduler config now uses only the startup snapshot helper; the env-backed scheduler helper and env-mutating scheduler contract setup were removed. The scheduler config/tick contract verifies defaults and disabled scheduling through `load_startup_config` input maps rather than process env mutation.
- 2026-06-20 runtime DI note: generic `create_router*` helpers now build with `AppRuntimeConfig::default()` instead of an implicit `AppRuntimeConfig::from_env()` fallback. Runtime config still enters production through `load_startup_config_from_env` plus `AppRuntimeConfig::from_startup`, while tests that need non-default app config use explicit `*_and_app_config` constructors. Asset and server-core contracts cover the runtime injection and router bootstrap behavior.
- 2026-06-20 runtime DI note: outbound mail delivery paths for signup verification, password reset, workspace email validation, project transfer requests, site-admin test mail, and notification mail drains now use injected `IntegrationConfig` snapshots with `deliver_with_config` instead of calling the env-backed `deliver` helper. Startup config snapshots SMTP/webhook integration keys into `AppRuntimeConfig.integrations`; notification delivery config reuses the same snapshot so contract tests keep per-test config isolation without process env locks.
- 2026-06-20 runtime DI note: runtime-config contract tests no longer read process env just to assert that route/app snapshot execution did not mutate it. Auth UI, signup confirmation, project defaults, site import upload limits, mailbox startup config, and notification scheduler config tests now verify the injected config through route payloads, persisted state, or config structs; the startup parser bridge that wrote snapshots back to process env has been removed.
- 2026-06-20 runtime DI note: the startup compatibility bridge that wrote parsed runtime config back into process env was removed from production bootstrap. `main` now creates the repository with `RepositoryConfig` derived from the same startup snapshot used for `AppRuntimeConfig`, notification delivery, and mailbox scheduler config, so guest-prefix, draft-time, and default-menu persistence behavior no longer depends on process-global env mutation.
- 2026-06-21 runtime DI note: site-admin REST and direct test-mail handlers now read SMTP sender and integration delivery config from the app-scoped `PilotServiceImpl` instead of passing separately cloned `SmtpRuntimeConfig` and `IntegrationConfig` values through route closures. `site_admin_contract::site_admin_mail_send_and_recipient_lookup_follow_legacy_surface` covers both REST `/api/v1/site/mail/test` and legacy direct `/sites/mail` envelope parity.
- 2026-06-21 runtime DI note: board REST and direct route registration now receives the app-scoped `PilotServiceImpl` instead of separate session/backend/base-path/integration/data-root fragments from `routes::mod`. Board route behavior remains covered by `board_contract::board_post_create_dispatches_legacy_new_posting_webhooks`, `board_contract::board_comment_create_and_update_dispatch_legacy_webhooks`, and README/online-commit board contracts.
- 2026-06-21 runtime DI note: issue REST and direct route registration now receives the app-scoped `PilotServiceImpl`, and issue create/update/state/delete/mass-update/comment-create webhook handlers read `public_origin` plus integration delivery config from that service snapshot instead of receiving separate runtime config parameters. `issue_core_contract` webhook tests cover the touched lifecycle fan-out paths.
- 2026-06-21 runtime DI note: file upload/read/delete routes and helpers now read upload storage root plus max upload size from the app-scoped `PilotServiceImpl` snapshot instead of receiving `data_root` and `max_uploaded_file_size` as route/helper parameters. `assets_contract` upload/read/delete and injected max-size tests cover the touched file surface.
- 2026-06-21 runtime DI note: site-admin update and portable import routes now read update metadata and max upload size from the app-scoped `PilotServiceImpl` snapshot instead of receiving separate `SiteUpdateConfig` or max-upload runtime config parameters. `site_admin_contract` update/download/import max-size tests cover the touched REST and direct legacy route behavior.
- 2026-06-21 runtime DI note: direct legacy translation routes now read translation proxy config from the app-scoped `PilotServiceImpl` snapshot instead of receiving a separate `TranslationProxyConfig`; board comment create/update webhook handlers now read integration config through `PilotServiceImpl`; and REST code branch list/default/delete handlers now read data-root through `PilotServiceImpl`. Existing `rest_contract` translation assertions, `board_contract` comment webhook assertions, and `code_browser_contract` branch assertions cover the touched routes.
- 2026-06-21 runtime DI note: board posting create/update and form-options handlers now use the app-scoped `PilotServiceImpl` snapshot for posting webhook delivery plus README/online-commit repository storage instead of separately threaded `IntegrationConfig` or `data_root` values. Direct legacy code raw/open/image/archive/ajax handlers now receive the same service snapshot and read session/backend/base-path/data-root from it. Asset fallback, Smart HTTP, and SVN direct dispatch now also pass/use `PilotServiceImpl` instead of carrying separate auth UI, integration, public-origin, base-path, session/backend, and data-root fragments. Focused parity coverage remains in board posting webhook/README/online-commit tests, code browser direct route tests, Smart HTTP injected confirmation config tests, and SVN protocol route tests.
- 2026-06-21 runtime DI note: REST code browser, history, commit-detail, compare, and commit-detail response helpers now use the app-scoped `PilotServiceImpl` snapshot instead of receiving separately cloned session/backend/base-path/data-root fragments from REST route assembly. `code_browser_contract` REST browser, history, commit-detail, compare, and branch tests cover the same legacy code route behavior with per-router data-root injection.
- 2026-06-21 runtime DI note: the legacy direct pull-request state route now uses `PilotServiceImpl` for session/backend/data-root access instead of route assembly passing separate fragments. Pull-request direct state, source-branch, and mutation contracts remain the parity evidence for the touched legacy route surface.
- 2026-06-21 runtime DI note: pull-request source-branch state, recently-pushed branch projection, branch options, detail projection, accept/merge, source-branch delete/restore, review/watch, list/detail, and changes helpers now read repository storage, public-origin, base-path, and integration delivery config through `PilotServiceImpl`. Pull-request read and mutation contracts remain the parity evidence for the touched VCS and webhook helper paths.
- 2026-06-21 runtime DI note: legacy `/_init`, `/_import`, and migration-disabled routes now receive the app-scoped `PilotServiceImpl` instead of separate session/backend/base-path/site-name/default-scope/data-root fragments. `assets_contract` legacy init and `org_project_contract` direct import tests cover repository provisioning, clone storage, default scope, and redirect behavior with per-router config injection.
- 2026-06-21 runtime DI note: legacy direct lost-password mail now receives the app-scoped `PilotServiceImpl` instead of separately threaded session/backend/base-path/public-origin/site-name/SMTP/integration config values. `PilotServiceImpl` carries the initialized site-name snapshot, and `auth_workspace_contract::direct_lost_password_and_reset_password_routes_round_trip` covers the reset mail route and redirect behavior.
- 2026-06-21 runtime DI note: legacy workspace email-validation mail now uses `PilotServiceImpl.smtp` directly instead of a separately cloned default-from string passed through route registration. `auth_workspace_contract::direct_email_validation_send_and_confirm_routes_round_trip` covers the direct validation mail sender, envelope, redirect, and confirm flow.
- 2026-06-21 runtime DI note: auth reset/logout/provider/session-bootstrap handlers, issue REST list/detail/mutation handlers, project route registration, VCS storage reset/delete helpers, fork clone helpers, project webhook fan-out helpers, and Smart HTTP pull-request commit-changed webhook dispatch now receive the app-scoped `PilotServiceImpl` snapshot instead of separately threaded session/backend/base-path/data-root/integration fragments. Existing auth workspace, issue core, project change-VCS/fork/webhook, pull-request mutation, board webhook, and Smart HTTP contracts remain the behavior evidence for these route-helper plumbing changes.
- 2026-06-21 runtime DI note: file upload/list/read/delete route handlers now receive only the app-scoped `PilotServiceImpl` and read session, repository backend, base path, data root, and upload-size snapshots from that service instead of route-local runtime fragments. `assets_contract::file_upload_requires_auth_and_preserves_general_attachments_under_legacy_default_limit` and injected max-size coverage guard the legacy `/files` upload, list, read, trailing-slash read, download, cache, range, and delete surface.
- 2026-06-21 runtime DI note: workspace legacy sidebar, usermenu tab-content, and `/-_-api/v1/favorite*` adapters now receive the app-scoped `PilotServiceImpl` directly and read session, repository backend, and base path snapshots from that service instead of parent wrappers passing separate runtime fragments. `auth_workspace_contract` sidebar/usermenu tests and the `rest_contract` legacy favorite assertions remain the parity evidence for the touched HTML and legacy external JSON surfaces.
- 2026-06-21 runtime DI note: board legacy external posting import, content update, comment create/update, and label update handlers now receive the app-scoped `PilotServiceImpl` directly and read session, repository backend, and base path snapshots from that service instead of route-local fragments. `board_contract::legacy_external_board_post_create_and_content_routes_follow_legacy_json_shape` remains the parity evidence for the touched legacy JSON routes.
- 2026-06-21 runtime DI note: route-utils current-session bootstrap and direct project update guard now consume `PilotServiceImpl` instead of separately threaded session/backend or session/repository fragments. Auth session bootstrap, issue label/category direct helpers, project label/direct mutation helpers, and project milestone direct routes keep their existing legacy route behavior while reading runtime state through the app-scoped service snapshot.
- 2026-06-21 runtime DI note: route-utils legacy external authenticated-user helper now consumes `PilotServiceImpl` for session/CSRF state instead of receiving a separate `SessionManager` fragment, while callers continue passing their already-authorized repository reference for token lookup and domain work. Issue, board, project, milestone, workspace favorite, and user legacy external route contracts remain the behavior evidence for session and API-token authentication parity.
- 2026-06-21 runtime DI note: asset fallback dispatch and direct issue/review Excel export now read base-path/session/backend runtime state from the app-scoped `PilotServiceImpl` snapshot instead of passing fallback-local base path plus session/backend fragments. Legacy issue and review `format=xls` contract tests remain the behavior evidence for the touched export fallback surface.
- 2026-06-21 runtime DI note: the remaining route helper audit classified route-utils URL/session helpers and SVN route `base_path` as formatting, validation, or href/path projection inputs rather than runtime config access points. Stale code route session/backend/base-path and board `_base_path` dummy parameters were removed, leaving route dispatch to obtain runtime state through `PilotServiceImpl`.
- 2026-06-21 runtime DI note: auth capability REST/debug routes and site-admin update REST handlers now read `auth_ui` and `site_update` from the app-scoped `PilotServiceImpl` snapshot instead of separately threaded runtime config parameters. REST API route assembly no longer accepts `RuntimeRegistry`; per-router auth capability and site-admin update contract coverage remains the runtime isolation evidence.
- 2026-06-25 visible UI i18n parity note: the browser route sweep found remaining visible raw legacy keys in project create/home/issue-detail, organization create, search, notification shortcut, and site-admin shells. The React runtime now resolves those keys through the existing legacy message dictionary for provider-backed rendering, and the site-admin helper no longer bypasses the provider with key-shaped fallback copy. Focused evidence: `frontend/src/i18n.spec.tsx`, `frontend/src/site-admin-route-parity.spec.tsx`, `frontend/src/directory-home-user-files-notification-i18n.spec.tsx`, `frontend/src/issue-board-pr-milestone-i18n.spec.tsx`, `frontend/src/project-home-tabs.spec.tsx`, `frontend/src/issue-detail-shell.spec.tsx`, plus route/auth shell parity specs and the frontend production build.
- 2026-06-25 site-admin user action boundary continuation: user-list
  guest/lock/site-admin/password/delete controls keep React REST mutations as
  the primary path, while their `data-request-uri`/`data-href` values point at
  the legacy direct aliases (`/sites/toggleGuestMode`,
  `/sites/toggleAccountLock`, `/sites/toggleSiteAdminRole/:loginId`,
  `/:loginId?action=resetPassword`, and `/sites/user/delete:id`) for markup
  parity. The click handlers now call `preventDefault()` before checking the
  optional React callback, so missing callbacks cannot hand control back to
  legacy request hooks. Focused evidence:
  `frontend/src/form-submit-boundary.spec.tsx` and
  `frontend/src/site-admin-route-parity.spec.tsx`.
- 2026-06-21 deferred migration hardening note: site-admin `/sites/import?dryRun=true` now provides a site-admin/CSRF-gated no-write validation report for the existing `yobi-data` import shape, including would-import/would-skip counts and portable attachment base64/size/max-upload validation without DB row or `data_root` file writes. Non-dry-run `/sites/import` now runs that validation report as a live preflight before mutation, so invalid portable attachment content/size/max-upload payloads return `400` before earlier users/projects/posts/issues/milestones/attachment rows or portable files are created. Live import also cleans route-created portable attachment rows and `data_root/uploads` files for covered downstream resource/comment failures; `site_admin_contract::site_admin_import_cleans_portable_attachment_when_downstream_milestone_insert_fails` proves the post-attachment milestone insert failure mode before attachment binding. `site_admin_contract::site_admin_import_dry_run_reports_counts_and_never_writes`, `site_admin_contract::site_admin_import_live_preflight_rejects_invalid_portable_attachment_without_partial_writes`, and the existing `site_admin_import` regression filter cover the touched import surface. Non-dry-run `/sites/import` still performs ordered writes after preflight without all-or-nothing rollback for all downstream non-validation failures, so full production rollback protection remains a migration-hardening follow-up rather than closed app-runtime parity.
- 2026-06-21 deferred auth note, refreshed 2026-06-23: P2-C/P2-D LDAP runtime work now covers deterministic fixture-backed form login and Smart HTTP/SVN BasicAuth while preserving legacy email-base login resolution, configured local password fallback, existing API-token BasicAuth, session auth, user provisioning/update, password refresh, wrong-credential Basic challenges, and real LDAP bind/search connector behavior for non-fixture runtime LDAP. Configured GitHub/Google OAuth now covers start/callback/token/userinfo/link/session flows plus local PlayAuthenticate/session logout parity; broader external-directory/OAuth edge behavior has no active blocker beyond future legacy-evidence-gated slices. Focused evidence lives in `runtime_config_contract`, `auth_workspace_contract`, `smart_http_contract::smart_http_basic_auth_routes_ldap_and_preserves_local_fallback_and_tokens`, and `svn_protocol_contract::svn_protocol_private_project_accepts_ldap_basic_auth_and_challenges_wrong_credentials`.
- 2026-06-21 deferred migration hardening note: live `/sites/import` now runs DB mutations through one SeaORM transaction during the non-dry-run phase, while still using the import rollback ledger for filesystem upload cleanup and preexisting attachment rebinding guards. `site_admin_contract::site_admin_import_transaction_rolls_back_project_created_before_timestamp_restore_fails` verifies a project created before a later DB failure is atomically rolled back, and `site_admin_contract::site_admin_import_restores_existing_project_sequence_counters_after_downstream_failure` keeps coverage for existing-project counter recovery. Full production rollback is still not claimed for crash/process-kill boundaries around filesystem side effects.
- 2026-06-21 runtime DI completion audit: server runtime and server tests no longer mutate process env for runtime config and no runtime-config env lock remains. Remaining env reads are startup parsing, integration compatibility wrappers outside server runtime call paths, DB matrix opt-in URLs, build-script asset inputs, temp-dir helpers, and VCS executable discovery; route/runtime behavior now consumes initialized snapshots through `AppRuntimeConfig`, `RuntimeRegistry`, `RepositoryConfig`, `NotificationMailDeliveryConfig`, `BrowserRuntimeConfig`, and `PilotServiceImpl`.

## Status Vocabulary

- `parity`: current implementation matches legacy behavior and UX closely enough to stop remediation for this slice.
- `ux-drift`: the behavior is partially present, but the route layout, menu, copy, CTA placement, or deep-link flow differs from legacy.
- `semantic-drift`: the current app exposes a narrower or different feature/permission/state model than legacy.
- `missing`: the legacy capability or user-visible surface is not implemented in the current app.
- `evidence-gated external/tool scope`: closed or non-blocking scope that must not reopen app-runtime parity without concrete legacy evidence.

## Known SPEC-Level Deviations

- 2026-05-27 SVN executable bridge status, refreshed by P3-A on 2026-06-21: actual VisualSVN-compatible local `svn info`, recursive `svn ls -R`, `svn ls`, revision-pinned `svn cat -r`, `svn cat`, `svn log`, `svn log --verbose`, `svn blame`, `svn diff`, `svn export`, revision-pinned `svn checkout -r`, `svn checkout`, single-file `svn commit`, `svn status -u`, `svn update`, conflict-on-update, fresh-checkout property materialization, `svn add`, `svn delete`, `svn mkdir`, direct URL `svn mkdir URL -m`, `svn delete URL -m`, `svn import PATH URL -m`, `svn copy URL URL -m`, `svn move URL URL -m`, `svn propset`/`svn propdel`, direct file URL `svn propget`/`svn proplist --verbose`, `svn lock`/`svn unlock`, `svn copy`, and `svn move` now pass over the mounted `/svn/$path` HTTP boundary. File, root, default VCC, baseline resource, and tree collection PROPFIND now filter explicitly requested metadata/properties instead of returning unrelated allprop-style fields, return empty live/custom property elements for `propname` discovery, expose file `getcontenttype`/`getetag`/`displayname`/`supportedlock`, preserve the file `version-name`, `checked-in`, and `baseline-collection` fields required for VCC metadata resolution, expose default VCC `creationdate`, `creator-displayname`, and RFC1123 `getlastmodified`, resolve default VCC child file/collection paths such as `!svn/vcc/default/trunk/README.md` through executable-backed head metadata while preserving requested VCC hrefs, baseline resource `creationdate`, `creator-displayname`, `getlastmodified`, and `repository-uuid`, plus requested file, baseline file, normal collection/child file, and baseline collection/child file `creationdate`, `creator-displayname`, and `getlastmodified` from revision/repository metadata, honor Label-selected revisions for root/VCC/file PROPFIND, expose root/default VCC `activity-collection-set` discovery and root/default VCC/baseline `supported-report-set` discovery for the implemented REPORT surface, normalize `log-report`, `file-revs-report`, and `list-report` revision dates to client-parseable Subversion ISO values, include requested changed paths for `log-report` `discover-changed-paths`, emit full-text svndiff0 `txdelta` content for `file-revs-report` and send-all update-report diff payloads, suppress collection children for `Depth: 0`, and recursively expose nested entries for `Depth: infinity`. The former broader VCC/baseline PROPFIND edge list is now covered by `svn_protocol_contract` cases for root/default VCC Label revision selection, explicit root/default VCC `allprop` DeltaV metadata, baseline resource invalid/out-of-range revision mapping, baseline resource requested/propname/allprop metadata, file/root/VCC/baseline supported-report discovery, and normal plus revision-pinned baseline collection Depth 0/1/infinity metadata.
- 2026-06-19 build/check diet note: legacy `/svn/$path` WebDAV handler bodies, DAV XML helpers, path/resource helpers, and SVN executable response assembly moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/svn_protocol.rs`. This is behavior-neutral and preserves the Smart HTTP/shared auth boundary through crate-private helper reuse, covered by `svn_protocol_contract::svn_protocol_route_preserves_legacy_path_and_auth_boundary`.
- 2026-06-19 build/check diet note: legacy Smart HTTP route detection, Basic/session principal resolution, Git HTTP backend bridging, upload-pack/receive-pack authorization, receive-pack post-receive side effects, PR commit-changed side effects, and git-push webhook payload assembly moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/smart_http.rs`. This preserves the shared SVN auth boundary through crate-private re-exports and is covered by `smart_http_contract`.
- 2026-06-19 build/check diet note: legacy issue/review `format=xls` route detection and Excel-compatible response helpers moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/excel_export.rs`, preserving filtered issue/review exports, BOM-prefixed TSV bodies, Excel content type, and legacy download filenames covered by `issue_core_contract` and `pull_request_mutation_contract`.

| Legacy surface                       | Rust surface                                      | Treatment                                                                                                                                 | Rationale                                                                                                    |
| ------------------------------------ | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Current user's workspace at `/:user` | `/me`; public profile at `/:user`                 | Keep `/me` as the current-user workspace shortcut; keep restored public profile `/:user` as the legacy single-segment profile route.      | The Rust workspace shell already uses `/me`, and public profile parity now has separate route/body evidence. |
| User settings at `/user/editform`    | `/user/editform`; optional `/me/settings/*` alias | Keep `/user/editform` as the canonical user-facing legacy route. Treat `/me/settings/*` only as an internal alias or redirect if present. | Deep-link parity requires the legacy settings route to remain mounted.                                       |

## Audit Matrix

| Capability                           | Legacy route/view/test                                                                                                                                              | Current route/contract                                                                                                                                                                     | Status   | Drift type                                     | Required Red test                                                                                                                                               | Owner                                             | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public landing and global navigation | `siteLayout.scala.html`, `siteLayout_framed.scala.html`, `common/navbar.scala.html`, `common/usermenu.scala.html`, `index/partial_intro.scala.html`                 | `reference/mixed-code/frontend/src/routes/_app.index.tsx`, `reference/mixed-code/frontend/src/routes/_app.tsx`, `reference/mixed-code/frontend/src/routes/-public-landing-parity.spec.tsx` | `parity` | `IA`, `label/copy`, `navigation drift`         | Keep the route-level parity test green for anonymous intro copy, global nav order, and removal of the temporary workstream/current-surface cards.               | `frontend`                                        | Anonymous landing now restores the legacy intro-style heading/tagline, feature grid, and `button.signup` site-name interpolation, trims the shared global nav to project/org/search entry points plus login/signup, and removes the temporary public workstream/current-surface shell. Rust canonical evidence now lives in the file-route tree under `frontend/src/routes/**`, the generated `routeTree.gen.ts`, `src/route-parity.spec.tsx`, `src/typing-harness.spec.ts`, and `tests/shell-routing-smoke.e2e.ts`.                                                                                                                                                                                           |
| Public project directory             | `ProjectApp.projects`, `project/list.scala.html`, `Project.findByName`                                                                                              | repo-root `/projects`, `GET /api/v1/projects`, `frontend/src/routes/-directory-views.tsx`, and `frontend/src/route-parity.spec.tsx`                                                        | `parity` | `IA`, `feature missing`, `data shape`          | Keep route/UI parity tests covering legacy list structure, restored metadata, pagination, logo/avatar assets, placeholder behavior, and empty-state copy green. | `crates/server`, `crates/persistence`, `frontend` | `/projects` now restores the legacy list container/item structure, tab labels (`project.public title.projectList` / `title.organization.list`), `site.project.filter` search placeholder, icon-only search button, `project.is.empty` / `ico-err1` empty state, non-empty `div#pagination` placeholder, created/code-update date presentation, label filter links, fork/origin badge, project logo asset rendering, public member/watch counts, public member avatar strip, private lock affordance, unreadable private placeholder rows, and fixed 10-item `pageNum` slicing. Rust canonical route ownership now sits in the repo-root file route and route parity Vitest suite guarding the mounted surface. |
| Public organization directory        | `OrganizationApp.orgList`, `organization/list.scala.html`, `Organization.findByNameLike`, `AccessControl.isGlobalResourceAllowed`                                   | repo-root `/orgs`, `GET /api/v1/organizations`, `frontend/src/routes/-directory-views.tsx`, and `frontend/src/route-parity.spec.tsx`                                                       | `parity` | `IA`, `label/copy`                             | Keep route/UI parity tests covering legacy list structure, search placeholder, empty state, logo/date presentation, and pagination placeholder green.           | `crates/server`, `crates/persistence`, `frontend` | `/orgs` now restores the legacy list container/item structure, tab labels (`project.public title.projectList` / `title.organization.list`), `site.organization.filter` search placeholder, icon-only search button, `organization.is.empty` / `ico-err1` empty state, non-empty `div#pagination` placeholder, organization logo rendering, and created-date presentation with fixed 30-item `pageNum` slicing. Legacy org read-gating placeholder rows are not a true parity requirement because `AccessControl.isGlobalResourceAllowed(..., READ)` allows all non-project global resources to be read.                                                                                                        |
| Auth account flows                   | `UserAppTest.java`, `PasswordResetAppTest.java`, `user/login.scala.html`, `user/signup.scala.html`, `site/lostPassword.scala.html`, `user/resetPassword.scala.html` | repo-root auth REST/direct routes plus `frontend/src/routes/-auth-views.tsx`, `frontend/src/auth-workspace-shell.spec.tsx`, and `frontend/src/wave1-auth-workspace-parity.spec.tsx`        | `parity` | `label/copy`, `state transition`, `data shape` | Keep route/UI parity tests for login, signup, forgot-password, and reset-password legacy wrappers, labels, actions, and post-submit outcomes green.             | `crates/server`, `frontend`                       | Core auth account behavior and form UX now match the current app-runtime legacy surface; bounded LDAP and configured GitHub/Google OAuth runtime slices are implemented, and the 2026-06-23 deferred re-audit found no active broader external-directory/OAuth blocker beyond future legacy-evidence-gated slices. The Rust file-route tree now owns the canonical legacy auth GET paths (`/users/loginform`, `/users/signupform`, `/lostPassword`, `/resetPassword`) plus alias files (`/login`, `/register`, `/forgot-password`, `/reset-password`), the auth form views now preserve the legacy `.page.full`, `.center-wrap.tag-line-wrap.login                                                             | signup | reset-password`, `.login-form-wrap.frm-wrap`, `.signup-form-wrap.frm-wrap`, `#loginIdOrEmailD`, `#remember-me`, `name="signup"`, signup field ids, lost/reset password field ids, `name="passwordReset"`, `.btns-row`, `.act-row`, email-verification, signup-confirm, and social-login-only message-key blocks, the login view carries the legacy `redirectUrl`hidden field and post-auth lookup precedence, successful sign-in prefers a safe local`redirectUrl`/`redirect`target before the saved default landing path and`/me`, sign-in failures now preserve the legacy Ajax message-key payloads, signup rejects duplicate login IDs/emails before account creation, direct `/lostPassword`stages the legacy site-name-prefixed password reset subject plus`site.resetPasswordEmail.mailContents`body and reset link, guest-prefix login IDs now create legacy`is_guest`accounts,`YONA_ALLOW_ANONYMOUS_ACCESS=false`now gates anonymous app-runtime page/API entry while leaving auth/bootstrap/reset/verify/static paths reachable, admin-signup-confirm registration now creates legacy`LOCKED`accounts for site-admin approval, remember-me sign-in now makes the session cookie persistent for the legacy 30-day window while non-remember sign-in stays browser-scoped by default,`YONA_SESSION_TIMEOUT_SECONDS`maps the legacy Play`session.maxAge`knob to non-remember cookie`Max-Age`plus server-side session-store expiry, social-login-only mode suppresses the local password form without first-paint flash, auth capabilities reflect the`YONA_AUTH_SIGNUP_REQUIRE_CONFIRM`, `YONA_AUTH_EMAIL_VERIFICATION_ENABLED`, `YONA_AUTH_SOCIAL_LOGIN_ONLY`, `YONA_AUTH_LOGIN_ID_PLACEHOLDER`, and `YONA_AUTH_PASSWORD_PLACEHOLDER`runtime flags, direct`/lostPassword`and`/resetPassword`routes now complete the reset-password token/link loop,`/verify/$loginId/$verificationCode`now drives the dedicated verify success/invalid surfaces over`/api/v1/auth/verify`, signup/password-reset/secondary-email flows now dispatch real outbound mail or the in-memory outbox via the Rust integrations slice, and Wave 1 account closeout restores the remaining verify/avatar delivery loop on the canonical Rust stack. |

Auth route module diet note: REST auth/session route registration plus direct auth route registration, handler bodies, and auth-local redirect/form helpers for `/api/v1/session`, `/api/v1/auth/capabilities`, `/api/v1/auth/sign-in`, `/api/v1/auth/register`, `/api/v1/auth/sign-out`, `/api/v1/auth/verify`, `/authenticate/:provider`, `/authenticate/:provider/denied`, `/logout`, `/users/logout`, `/users/loginform`, `/users/signupform`, `/users/login`, `/users/signup`, `/user/isUsed`, `/user/isEmailExist`, `/lostPassword`, and `/resetPassword` moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/auth.rs` on 2026-06-19; the shared form-CSRF header adapter now lives in `crates/server/src/routes/utils.rs`. This is a build/check diet change covered by `auth_workspace_contract::rest_auth_routes_round_trip_with_shared_session_and_error_envelope`, `auth_workspace_contract::direct_legacy_login_and_signup_form_routes_accept_legacy_form_csrf_redirect_and_authenticate`, `auth_workspace_contract::direct_legacy_signup_validators_report_used_reserved_and_email_state`, and `auth_workspace_contract::direct_lost_password_and_reset_password_routes_round_trip`.

Auth REST-primary submit-boundary note: on 2026-06-25 the React auth forms were aligned so `/users/loginform`, `/users/signupform`, `/lostPassword`, and `/resetPassword` always keep submission inside the React SPA REST JSON boundary and no longer expose legacy POST `action` targets in rendered forms. This keeps `/api/v1/auth/sign-in`, `/api/v1/auth/register`, `/api/v1/auth/password-reset/request`, and `/api/v1/auth/password-reset/complete` as the SPA path while preserving the legacy direct `POST /users/login`, `POST /users/signup`, `POST /lostPassword`, and `POST /resetPassword` routes as compatibility adapters outside the React form boundary. `frontend/src/auth-workspace-shell.spec.tsx` pins the no-action form boundary for the login page, common login dialog, signup, lost-password, and reset-password forms.

Frontend protobuf removal note: on 2026-06-23 the frontend API boundary removed the generated `frontend/src/gen/yona/pilot/v1/pilot_pb.ts` dependency and replaced its type-only response/request annotations with plain REST JSON TypeScript types in `frontend/src/api/types.ts`. This is behavior-neutral for auth/account parity: `frontend/src/auth-workspace-client.ts` already sent plain JSON through `restFetch`, and `frontend/src/auth-workspace-client.spec.ts` now asserts the sign-in body stays the legacy REST payload without protobuf metadata such as `$typeName`. Verification: `pnpm --dir frontend check`, `pnpm --dir frontend test`, and a repository search for `@bufbuild`, `pilot_pb`, and `frontend/src/gen` in frontend runtime/package files returned no matches.

Frontend organization logo boundary note: on 2026-06-26 the shared frontend REST boundary now preserves `logoAttachmentId` in `updateOrganization` and `updateOrganizationRest`, matching the organization settings React form state and the server-side logo binding contract. Project create/update bodies in the same shared org/project client remain unchanged; `frontend/src/auth-workspace-client.spec.ts` pins both organization logo id propagation and the existing project mutation body shapes.

Server protobuf removal note: on 2026-06-24 the Rust server removed the remaining `buffa`/`generated::yona::pilot::v1` runtime compatibility shims, renamed the checked-in plain REST JSON type module from `proto_types.rs` to `api_types.rs`, and kept request adaptation as a direct clone for REST JSON inputs. Verification: `cargo check -p yoram-server` passed, and a repository search for `proto`, `protobuf`, `buffa`, `generated::yona`, and `proto_types` under `crates/server/src` and `crates/server/tests` returned no matches.

Direct route assembly diet note: top-level direct route assembly for auth, legacy runtime, workspace, users, boards, issues, notifications, projects, files, pull requests, site admin, code, static compatibility, and the `/api/v1/*` JSON fallback moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/mod.rs` on 2026-06-19. This is a registration-order-preserving build/check diet change covered by `router_contract::legacy_external_api_roots_fall_back_to_application_index`, `rest_contract::unknown_rest_route_returns_shared_json_error_envelope`, and `assets_contract::legacy_messages_js_returns_global_messages_function_under_base_path`.

Legacy runtime module diet note: `/_init`, `/_import`, and disabled `/migration` route bodies plus runtime-local project-import form/plain-response helpers moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/legacy_runtime.rs` on 2026-06-19. The `/migration` root now serves the React disabled shell after the legacy login check, while `/migration/**` stays a disabled JSON boundary. The disabled React shell keeps the legacy `migration/home.scala.html` skeleton and forbidden message without adding non-legacy `/sites/data` guidance. This keeps repository init/provisioning, Git import mutation, and disabled migration behavior covered by `assets_contract::legacy_init_redirects_home_and_recreates_project_repositories`, `org_project_contract::project_import_direct_route_clones_git_repository_and_preserves_legacy_errors`, `frontend/src/migration-route-parity.spec.tsx`, and the legacy migration router contract tests.

REST route assembly diet note: REST route group assembly for auth, users, site admin, workspace, notifications, search, issues, boards, code, projects, pull requests, and debug `_pilot` compatibility moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/mod.rs` on 2026-06-19. This is a registration-order-preserving build/check diet change covered by `rest_contract::unknown_rest_route_returns_shared_json_error_envelope` and `server_core_contract::read_current_session_works_over_connect_json`.

Debug route handler diet note: The debug-only `_pilot` Connect-style method adapter handler body moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/debug.rs` on 2026-06-19. This preserves the existing debug compatibility surface and remains covered by `server_core_contract::read_current_session_works_over_connect_json`.
| Workspace overview, settings, favorites, recent, default landing, notifications | `UserTest.java`, `RecentlyVisitedProjectsTest.java`, `WatchProjectAppTest.java`, `UserApp.userInfo`, `UserApi.statistics`, `UserApp.userFiles`, `user/view.scala.html`, `user/partial_issues.scala.html`, `user/edit.scala.html`, `user/edit_notifications.scala.html`, `user/edit_password.scala.html`, `user/edit_token.scala.html`, `user/edit_emails.scala.html`, `user/userFiles.template.scala`, `common/usermenu_tab_content_list.scala.html`, `issue/my_partial_search.scala.html`, `issue/my_partial_list.scala.html`, `index/notifications.scala.html`, `index/partial_notifications.scala.html` | `GET /api/v1/users/:loginId/profile`, `GET /api/v1/users/:loginId/statistics`, `GET /api/v1/workspace/files`, `/:user`, `/user/files`, `/user/issues`, `/api/v1/workspace/**`, `/api/v1/notifications`, `/notification`, `/me`, `/user/editform/**`, `/user/usermenuTabContentList` | `parity` | `IA`, `feature missing`, `data shape`, `admin surface` | Keep public-profile/statistics REST, route parity, settings/sidebar, notification inbox shell, user issue list shell, usermenu fragment, user file list, and default-landing action tests green. | `crates/server`, `crates/persistence`, `frontend` | Workspace/public-profile/settings/files/notifications now match the legacy app-runtime surface. The Rust `/me` shell now carries the top-level `Issues / Pull Requests / Projects` tabs, restores the legacy-style user card with connected social login badges, exposes issue open/closed buckets plus pull-request/project streams from additive workspace REST data, renders the `/me` issue stream with legacy `user/partial_issues.scala.html` row anchors, uses legacy empty stream copy (`userinfo.daysAgo.prefix issue.is.empty`, `userinfo.daysAgo.prefix pullRequest.is.empty`, `project.is.empty`) for workspace/profile issue, PR, and project tabs, and omits React-only favorite/recent/default-landing/logout footer sections that are not present in `user/view.scala.html`; favorite/recent data remains in the React-rendered root sidebar and default-login-page stays on legacy my-series pages. It mounts canonical legacy settings paths under `/user/editform`, restores profile/password/reset-visited/email/token/noti mutation paths over `/api/v1/workspace/**`, restores direct legacy profile edit/email add, password-change, API token reset, reset-visited, and default-login-page routes, restores direct legacy email delete/set-main routes with `/user/editform` redirects, converts legacy `/user/usermenuTabContentList` to the workspace overview API payload used by the React-rendered root sidebar, restores `/user/issues` with assigned/authored/commented/mentioned/shared/favorite quick filters plus legacy `my_partial_search` / `my_partial_list` shell anchors, restores `/user/files` over `GET /api/v1/workspace/files` with the legacy `nav-tabs`, search form, `.attachment-files` rows, image preview, download, date, and location anchors for the current user's uploaded attachments, keeps watched-project notification defaults aligned with legacy `NEW_COMMENT` default-off semantics, and includes avatar upload/crop, `/files` general upload/list/serve/delete authorization plus legacy `/files/:id/` download/delete aliases with `YONA_MAX_FILE_SIZE`, avatar attachment projection, profile avatar URL projection, and the legacy `/notification` inbox wrapper/list anchors from `index/notifications.scala.html` plus `partial_notifications.scala.html`. The restored `/:user` route uses `GET /api/v1/users/:loginId/profile`, preserves the legacy `user/view.scala.html` class anchors including issue state labels, empty-state copy, and `user/partial_issues.scala.html` row anchors, redirects organization names to `/organizations/:name`, returns not-found for missing users, filters member projects/issues/PRs by viewer READ ACL, and intentionally does not expose private workspace controls or email to other viewers. `GET /api/v1/users/:loginId/statistics` restores the legacy authenticated count fields for authored issues/postings, assigned issues, authored comments, and issue/comment votes while leaving external `/-_-api/v1/**` compatibility to the migrator scope. |

Workspace route module diet note: REST workspace route registration and the workspace/account handler body cluster for `/api/v1/workspace`, `/api/v1/workspace/default-landing-path`, `/api/v1/workspace/profile`, `/api/v1/workspace/password`, `/api/v1/workspace/recent-projects`, `/api/v1/workspace/files`, `/api/v1/workspace/emails/**`, `/api/v1/workspace/api-token/reset`, and `/api/v1/workspace/notifications` moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/workspace.rs` on 2026-06-19. The same route module now owns the direct legacy workspace profile/email/token/notification handlers, workspace overview projection, profile/avatar mapping, recent/favorite/settings loaders, user sidebar/usermenu render helpers, workspace REST DTOs, workspace file mapping helpers, direct legacy project leave handler for `/info/leave/:ownerName/:projectName`, and legacy external favorite project/issue/organization list/toggle handler bodies. This build/check diet change is covered by `auth_workspace_contract::workspace_settings_mutations_round_trip_through_workspace_overview`, `rest_contract::rest_workspace_routes_manage_overview_settings_and_recent_projects`, direct workspace/sidebar/usermenu contract tests, `project_members_contract::leave_project_redirects_to_member_projects_after_removal`, `assets_contract::workspace_files_list_returns_current_users_legacy_attachment_rows`, and `user_issue_favorite_contract::favorite_issue_toggle_updates_issue_detail_and_rejects_unreadable_issues`.

Workspace sidebar favorite backend parity note: on 2026-07-10 the canonical workspace response restored the `ownProjects`, `favoriteOrganizations`, and regular organization buckets required by `index/myOrganizationList.scala.html`, while canonical project and organization favorite POST routes preserve the authenticated guest and CSRF behavior of the legacy user-menu APIs. `/api/v1/workspace` now builds those buckets from user-relevant favorite, recent, membership, case-insensitive owner, and organization scopes instead of scanning all migrated projects or organizations; the same request-local logo cache and ACL projection are reused across member, favorite, recent, own, and nested project occurrences. `org_project_repo_contract::creates_organizations_and_rewrites_org_owned_project_owner_on_rename` guards mixed-case legacy owners and unrelated-row exclusion, and `canonical_sidebar_favorites_persist_under_an_arbitrary_context_path` covers arbitrary context paths, guest organization favorite toggles, private visibility, nullable organization counts, member favorite state, and persistence. The pre-existing recent-project maximum-30/record transaction gap and the separately reproduced workspace private-issue baseline failure remain outside this slice.

Workspace REST-primary fallback note: on 2026-06-25 the React-rendered `/user/editform/**` settings forms were aligned with the auth fallback rule. Profile edit, avatar upload shell, recent-project reset, password change, secondary-email add, and API-token reset keep `/api/v1/workspace/**` as the SPA mutation path, call `preventDefault()` unconditionally, and no longer render legacy direct `action` attributes or form-level `method="post"` fallbacks. The legacy direct `POST /user/edit`, `POST /user/resetVisitedList`, `POST /user/resetPassword`, `POST /user/email`, and `POST /user/editform/token_reset` adapters remain server compatibility routes for direct legacy entry, not the React SPA submit boundary. `frontend/src/auth-workspace-shell.spec.tsx` and `frontend/src/wave1-auth-workspace-parity.spec.tsx` pin the no-form-fallback guard pattern for those settings forms.

Workspace settings proof note: on 2026-06-26 `ui-worker-workspace-settings-proof` closed the remaining avatar and notification-tab evidence rows. Legacy `user/edit.scala.html` plus `yobi.user.Setting.js` reject invalid avatar files with `Messages("user.avatar.onlyImage")`, then use `#avatarCropWrap`, Jcrop preview, and 128x128 canvas upload for valid images; React now translates the invalid-avatar message instead of rendering the raw key and removes the hidden modal class when the crop modal opens. Legacy `user/edit_notifications.scala.html` plus `yobi.user.Setting.js` activate `#notification-projects a[href="<location.hash>"]`; React now derives the active tab from `routeHref`/`window.location.hash` and falls back to the first watched project only when the hash is absent or unmatched. Evidence: `frontend/src/routes/-workspace-settings-view.tsx`, `frontend/src/workspace-settings-parity.spec.tsx`, and browser-selector scenario `frontend/tests/workspace-settings-parity.e2e.ts`.

User route module diet note: REST user route registration for `/api/v1/users/:loginId/profile`, `/api/v1/users/:loginId/statistics`, `/api/v1/user/issues`, and `/api/v1/user/issues/new-options` plus legacy external user/admin/token/user-issues/statistics/translation handler bodies for `/-_-api/v1/admin/users*`, `/-_-api/v1/users*`, `/-_-api/v1/users/token`, `/-_-api/v1/user/issues`, `/-_-api/v1/users/:loginId/statistics`, and `/-_-api/v1/translation` moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/users.rs` on 2026-06-19. External-dependency-free random token and statistics JSON helper reuse now lives in `crates/server/src/routes/utils.rs`; public profile keeps reusing workspace-owned projection/ACL helpers through the route re-export boundary. This build/check diet change is covered by `rest_contract::rest_public_user_profile_reads_legacy_single_segment_profile`, `rest_contract::rest_user_statistics_counts_legacy_activity_rows`, `user_issue_favorite_contract::user_issue_list_defaults_to_assigned_and_filters_comment_shared_and_favorite`, direct issue new-options coverage in `issue_core_contract`, `legacy_external_users_contract`, and `legacy_external_user_issues_contract`.

Translation Markdown-source note: on 2026-06-25 the frontend translation client stopped accepting legacy HTML-only translation payloads and now requires `translatedMarkdown`, matching the Rust `/-_-api/v1/translation` response that returns Markdown source for React-side rendering. This prevents server HTML fragments from becoming a hidden React primary rendering path. Coverage: `frontend/src/api-query.spec.ts` plus `rest_contract` translation assertions.

Frontend type-safety parity note: on 2026-06-25 the React legacy page/test surfaces were realigned so `pnpm --dir frontend check` passes again. The change only exposes existing legacy-message injection props used by auth dialog, project detail, and issue detail parity tests, exports the raw runtime-config input type used by server-injected config normalization tests, and completes the issue comment timeline fixture with the avatar/event fields required by the current view model contract. Coverage: `pnpm --dir frontend check` plus focused `auth-workspace-shell`, `issue-detail-shell`, and `runtime-config` vitest runs.

Secret bootstrap submit-boundary note: on 2026-06-25 the React-rendered `/secret` site-admin bootstrap form was aligned with the auth/signup REST boundary. The SPA form now keeps the legacy `welcome/secret.scala.html` shell and field names but does not render `action="/secret"` or `method="post"`; submit always uses `/api/v1/auth/secret` JSON and navigates to `/restart`. The direct legacy `POST /secret` route remains a server compatibility adapter with the legacy redirect. Coverage: `frontend/src/route-parity.spec.tsx` plus `auth_workspace_contract::secret_admin_setup_rest_updates_legacy_default_admin_and_redirect_fallback_remains`.

Comment/import submit-boundary note: on 2026-06-25 the React-rendered board, issue, pull-request review, commit discussion, project import, and site import forms were aligned with the REST/API submit boundary. These forms still preserve legacy shell anchors, route strings, editor IDs, multipart upload markers, file inputs, and request-button metadata for UI parity, but they call `preventDefault()` unconditionally and no longer render form-level native `method="post"` fallbacks. Coverage: `frontend/src/form-submit-boundary.spec.tsx`, `frontend/src/code-views.spec.tsx`, and focused route parity specs.

Member/enrollment action boundary note: on 2026-06-25 project and organization
member role dropdowns, enrollment anchors, watch/unwatch anchors, and
project/organization leave controls were aligned with the REST-primary SPA
boundary. The legacy direct URLs remain exposed through `href` or `data-href`
only as DOM parity evidence, while click handlers call `preventDefault()` before
optional React REST callbacks so missing callbacks cannot navigate the SPA into
direct mutation routes. Project home still renders the legacy `enrollBtn` and
`watchBtn` anchors instead of temporary plain buttons, and project/organization
leave still render the legacy `projectLeaveBtn` / `groupLeaveBtn` controls.
Coverage: `frontend/src/form-submit-boundary.spec.tsx`,
`frontend/src/route-parity.spec.tsx`, `frontend/src/project-home-tabs.spec.tsx`,
focused auth workspace/organization render specs, and
`node --test tests/yona-legacy-parity-gate.test.mjs`.
| Organization create, home, settings | `OrganizationApp.java`, `OrganizationTest.java`, `organization/create.scala.html`, `organization/view.scala.html`, `organization/setting.scala.html`, `organization/menu.scala.html` | repo-root `/api/v1/organizations/**`, `frontend/src/routes/-organization-views.tsx`, `frontend/src/organization-home-parity.spec.tsx`, `frontend/src/route-parity.spec.tsx`, `crates/server/tests/rest_contract.rs`, and `crates/server/tests/assets_contract.rs` | `parity` | `IA`, `label/copy`, `feature missing` | Keep organization create/settings/home wrapper, form, project-list, logo upload, roster anchor, member shell, delete shell, and legacy home project-card route parity coverage green. | `crates/server`, `crates/persistence`, `frontend` | The organization create/home/settings app surface is implemented in repo root: the organization create form preserves the legacy `.form-wrap.new-project`, `name="new-org"`, `#name`, `#descr`, and `.actions` anchors, the organization settings form preserves the legacy `#saveSetting`, `name="update-org"`, `.bubble-wrap.gray`, `.setting-box`, `#logoPath`, `#project-name`, `#project-desc`, and `#save` anchors, organization logo upload promotes actor-owned images into the legacy `ORGANIZATION` attachment container and projects `logoUrl` through detail/container responses, organization member management preserves the legacy `organization/members.scala.html` shell anchors (`#addNewMember`, `.members.project.row-fluid`, `.member-setting`, role dropdown apply action, delete modal `#alertDeletion`, and enrollment `.enrollAcceptBtn`), the organization delete page preserves the legacy `organization/deleteForm.scala.html` confirmation shell (`#btnDelete`, `#alertDeletion`, `#btnDeleteExec`), and the organization home preserves the legacy `organization/view.scala.html` page/project wrapper, description, project search, create-project CTA, `ul.all-projects > li.project`, `.info-wrap`, `.owner-avatar-wrap`, `.header`, `.desc`, `.name-tag`, fork/private/protected markers, `.stats-wrap`, watcher/member counts, and right-pane `.bubble-wrap.gray.project-home` member bubbles with `.project-members` avatar/profile links. |
| Organization membership, enroll/cancel, delete, org issue/board/PR listings | `OrganizationApp.java`, `EnrollOrganizationApp.java`, `organization/members.scala.html`, `organization/group_issue_list.scala.html`, `organization/group_board_list.scala.html`, `organization/group_pullrequest_list.scala.html`, `organization/deleteForm.scala.html` | repo-root `/api/v1` REST + `crates/server` + `crates/persistence` + `frontend` restore members/delete/enroll/leave/delete parity, organization issue listing, organization board listing, and organization PR open/closed read lists | `parity` | `feature missing`, `deep-link`, `admin surface` | Keep server/frontend parity tests green for org member management, enroll/cancel, delete guards, direct-entry auth shells, org issue list aggregation, org board list aggregation, and org PR read aggregation. | `crates/server`, `crates/persistence`, `frontend` | Repo-root implementation restores the organization membership/enrollment/delete management surface and direct-entry route semantics. The organization issue inbox has visible-project aggregation, core GET filters, legacy `group_issue_search_partial` / `group_issue_list_partial` shell anchors, state tabs, project selector, sort links, cross-project rows, database issue ID row anchors, author profile/avatar anchors, assignee avatar anchors, due-date clock, label anchors, empty state, and pagination. The organization pull-request read list is restored over visible organization projects only. The organization board inbox has visible-project aggregation, project selector, sort/search filters, cross-project rows, empty state, and no separate notice pinning to match `organizationBoards(..., null)`. |

Board route module diet note: REST board route registration plus board/post handler bodies, legacy external board import/content/comment/label handlers, and board-specific posting ACL, readme, online-commit, query, and result-mapping helper bodies for `/api/v1/projects/:owner/:project/posts*`, `/api/v1/organizations/:organization/boards`, and `/-_-api/v1/owners/:owner/projects/:project/posts*` moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/boards.rs` on 2026-06-19. The shared board-label REST DTO/mapper now lives in `crates/server/src/routes/utils.rs` so board and site-admin routes reuse the same label JSON shape without root ownership. This is a behavior-neutral build/check diet change covered by `board_contract` project post/form/comment/watch and legacy external board tests plus `organization_board_contract::organization_board_contract_lists_visible_cross_project_posts_without_notice_pin`.
| Project create, home, settings, overview update, visibility | `ProjectApp.java`, `ProjectTest.java`, `project/create.scala.html`, `project/home.scala.html`, `project/partial_readme.scala.html`, `project/partial_history.scala.html`, `project/partial_dashboard_issuesbylabel.scala.html`, `project/partial_dashboard_issuesbyassignee.scala.html`, `project/setting.scala.html`, `project/header.scala.html`, `projectLayout.scala.html`, `projectMenu.scala.html` | repo-root `/api/v1/owners/:owner/projects/:project/container`, direct `PUT /:owner/:project`, direct `/:owner/:project/go`, `frontend/src/routes/-project-views.tsx`, `frontend/src/routes/-markdown-renderer.tsx`, `frontend/src/project-home-tabs.spec.tsx`, `frontend/src/route-parity.spec.tsx`, `crates/domain/src/org_project.rs`, and `crates/server/tests/org_project_contract.rs` | `parity` | `IA`, `feature missing`, `state transition` | Keep project create/import defaults, settings layout, container/history/dashboard/header/menu, direct overview edit, legacy convention-menu landing redirects, visibility, site-admin access, Git README fallback rendering, and directory pagination contract/route tests green. | `crates/server`, `crates/persistence`, `crates/domain`, `frontend` | Current project pages expose basic CRUD, preserve public/protected/private read rules plus site-admin read/update bypass through the shared domain authorization matrix, preserve fixed 10-item `pageNum` pagination on the public project directory route, preserve `project.default.scope.when.create` through `YONA_PROJECT_DEFAULT_SCOPE` for create-form defaults and missing-scope create requests, map `project.creation.default.menus` through `YONA_PROJECT_DEFAULT_MENUS`, expose create/settings menu checkbox IDs for Code/Issues/Pull Requests/Reviews/Milestones/Board, persist `project_menu_setting` changes over `/api/v1`, restore the legacy `ProjectApp.goConventionMenu` direct route by READ-gating `/:owner/:project/go` and redirecting to issue list, board list, or project home from menu settings, include the legacy statistics under-construction shell, render the `/:owner/:project` project home header/menu/page shell with legacy `project-header-*`, `project-menu-*`, `.page-wrap-outer`, `.project-home-header`, clone, tab, and right-pane anchors, preserve the legacy direct `PUT /:owner/:project` overview edit route with `{"overview": ...}` response shape, render project home history/dashboard shells plus DB-backed issue/post/pullrequest history rows and Git commit rows backed by `history.items`, label dashboard rows backed by `dashboard.labels`, and assignee/unassigned rows backed by `dashboard.assignees` / `dashboard.unassignedOpenIssueCount` open issue counts, render repository Git README fallback Markdown in React while the REST container preserves legacy local image/link rewrites in `readmeFile.bodyMarkdown`, and mirror `yobi.project.Setting` reviewer-count radio show/hide plus Code/Pull Request/Review menu checkbox dependency behavior. |
| Project members, watchers, webhooks, transfer, change VCS, statistics, delete | `ProjectApp.java`, `StatisticsApp.java`, `project/members.scala.html`, `project/watchers.scala.html`, `project/webhooks.scala.html`, `project/partial_webhooks_list.scala.html`, `project/transfer.scala.html`, `ProjectTransfer.java`, `project/change_vcs.scala.html`, `project/statistics.scala.html`, `project/delete.scala.html` | repo-root `/api/v1` member management + watcher directory + webhook CRUD + issue/comment, PR create/review/comment/merge/commit-changed, DETAIL*HANGOUT_CHAT thread reuse, git-push JSON webhook fan-out, and webhook delivery history row recording/settings read surface/retry/private endpoint guard/HTTP/HTTPS delivery + project transfer request/accept/mail + change VCS form/mutation + project delete + statistics shell + `/:owner/:project/members` + `/info/leave/:owner/:project` + `/:owner/:project/watchers` + `/:owner/:project/webhooks` + `/:owner/:project/transfer` + `/:owner/:project/changeVCS` + `/:owner/:project/deleteform` + `/:owner/:project/statistics`; SVN executable-backed repository storage exists and `/svn/$path` auth boundary plus WebDAV `OPTIONS`, `DAV: 1,2`/`MS-Author-Via: DAV` discovery headers, root/default VCC `PROPFIND` responses with executable-backed youngest revision, repository UUID, checked-in baseline resource, and baseline-collection metadata plus baseline resource `PROPFIND` when `svnlook` is available, read-only file content, file content-length/content-type/etag/displayname/supportedlock/version/checked-in/baseline-relative-path metadata plus live/custom property value/name projection and supportedlock/lock discovery for normal and `!svn/rvr`/`!svn/bc`/`!svn/ver` revision resources, request-aware collection tree and revision-pinned baseline collection child metadata plus child file content-type/etag/displayname/supportedlock/version/checked-in metadata, collection `Depth: 0`/`Depth: infinity` handling, `log-report`/`dated-rev-report` revision metadata, `get-locks-report` lock metadata, `get-locations-report`/`get-location-segments-report` path metadata, depth/recursive-aware `update-report` checkout/update file fetch metadata, `file-revs-report` file revision metadata plus txdelta content, `mergeinfo-report` mergeinfo metadata, `get-deleted-rev-report` deleted-path revision lookup, `list-report` directory entry metadata, `inherited-props-report` inherited regular property metadata, `replay-report` revision editor metadata, WebDAV `LOCK`/`UNLOCK`, and WebDAV `PUT` file updates, `DELETE` removals, `MKCOL` collection creation, `PROPPATCH` property set/remove, and `MKACTIVITY`/`CHECKOUT`/`MERGE` commit choreography are mounted while actual local `svn info`, `svn ls`, `svn cat`, `svn log`, `svn blame`, `svn checkout`, single-file `svn commit`, `svn update`, conflict-on-update, fresh-checkout property materialization, add/delete/mkdir/props/lock/copy/move client smokes now pass over the mounted HTTP boundary; former broader VCC/baseline PROPFIND edge completeness is closed by P3-A contract coverage | `parity` | `feature missing`, `admin surface`, `deep-link` | Keep member-management, watcher, webhook CRUD/fan-out/history, project-transfer, project-change-vcs, project-delete, statistics shell, VCS lifecycle, SVN boundary, and Smart HTTP push contract tests green; keep the closed P3-A VCC/baseline SVN WebDAV PROPFIND edge cases covered by `svn_protocol_contract`. | `crates/server`, `crates/persistence`, `frontend`, `crates/vcs` | Project member management now restores the UPDATE-gated legacy member shell from `project/members.scala.html` with add, role edit, delete, self-leave, direct `/info/leave/:owner/:project` current-user leave redirect, enrollment cleanup, and notification/mail staging. Project watchers restore the READ-gated legacy member list shell from `project/watchers.scala.html` with actual watcher users. Project webhook CRUD restores the UPDATE-gated legacy form/list shell from `project/webhooks.scala.html` and `partial_webhooks_list.scala.html` with payload URL, secret, webhook type, and gitPush persistence over `/api/v1`; issue create/comment and PR create/review/unreview/review-comment/merge/commit-changed now fan out non-JSON webhook payloads with legacy text shape, `Yobi-Hookshot` user agent, `Authorization: token <secret> `, and DETAIL_HANGOUT_CHAT `thread.name` persistence/reuse while Smart HTTP receive-pack fan-outs send legacy git-push JSON payloads only to `gitPush` hooks. These app webhook paths now persist `webhook_delivery` rows with webhook id, event type, webhook type, payload URL, request body, success/failure status, response body, and error message; the project webhook settings surface reads recent delivery rows through `/api/v1/owners/:owner/projects/:project/webhooks` and renders `#webhookDeliveryHistory` / `.webhook-history-wrap` for delivery history inspection, `YONA_WEBHOOK_DELIVERY_RETRIES` / `WEBHOOK_DELIVERY_RETRIES` retries transient failures up to 5 times before the final delivery result is recorded, enabled HTTP/HTTPS delivery blocks loopback/private/link-local/unspecified/multicast endpoints unless `YONA_WEBHOOK_ALLOW_PRIVATE_NETWORKS` / `WEBHOOK_ALLOW_PRIVATE_NETWORKS` is explicitly true, and HTTPS delivery uses the local `curl` executable wrapper with `YONA_WEBHOOK_HTTPS_DELIVERY_COMMAND` / `WEBHOOK_HTTPS_DELIVERY_COMMAND` override. Project transfer restores the UPDATE-gated legacy transfer shell from `project/transfer.scala.html`, persists `project_transfer` requests, sends transfer request mail through the outbound mail integration, accepts `/project/transfer/:id/:key` for the destination user/org admin/site admin, moves owner/name, preserves previous owner/name route aliasing, and updates sender/destination membership. Project change VCS restores the UPDATE-gated legacy `project/change_vcs.scala.html` checkbox/modal shell, app REST form/mutation, `vcs` metadata toggle, DB-backed README posting flag clear, and ID-based repository storage reset; Subversion transitions validate `svnadmin` before DB mutation, replace `<project_id>.git` with executable-created `<project_id>.svn`, and project delete removes both Git and SVN storage suffixes. The legacy `/svn/$path<.+>` boundary now uses Basic/session principal resolution, project READ/write authorization, Subversion-only filtering, DAV response metadata including `DAV: 1,2` and `MS-Author-Via: DAV`, a 200 `OPTIONS` capability response, root/default VCC/baseline resource `PROPFIND` multistatus responses that include `svnlook youngest` revision and repository UUID metadata when the executable is available, serves read-only normal plus `!svn/rvr`/`!svn/bc`/`!svn/ver` revision-pinned file content and file metadata with content length, version name, checked-in href, and baseline-relative-path through `svnlook cat`/`youngest`, returns collection tree and revision-pinned baseline collection directory/child metadata plus child file content-type/etag/displayname/supportedlock/version/checked-in metadata through `svnlook tree`/`youngest`, applies `Depth: 0` child suppression and `Depth: infinity` recursive nested-entry projection for collection `PROPFIND`, returns `log-report`/`dated-rev-report` revision metadata through `svnlook log`/`author`/`date`, `get-locks-report` lock metadata through `svnlook lock`, `get-locations-report`/`get-location-segments-report` path metadata through `svnlook cat`/`tree`, depth/recursive-aware `update-report` checkout/update file fetch metadata through `svnlook tree`, `file-revs-report` file revision metadata plus txdelta content through `svnlook log`/`cat`, `mergeinfo-report` mergeinfo metadata through `svnlook propget`, `get-deleted-rev-report` deleted-path revision lookup through `svnlook` path existence, `list-report` directory entry metadata through `svnlook tree`/`cat`, `inherited-props-report` inherited regular property metadata through `svnlook proplist`/`propget`, `replay-report` revision editor metadata through `svnlook changed`, WebDAV `LOCK`/`UNLOCK` through `svnadmin lock`/`unlock`, and WebDAV `PUT` file updates, `DELETE` removals, `MKCOL` collection creation, `PROPPATCH` property set/remove, and `MKACTIVITY`/`CHECKOUT`/`MERGE` commit choreography through `svn checkout`/`commit`. Project statistics restores the legacy `StatisticsApp` route and `project/statistics.scala.html` under-construction shell without inventing computed statistics. Project delete restores the UPDATE-gated legacy confirmation shell from `project/delete.scala.html`, deletes modeled dependent project rows, removes repository storage, and redirects to `/`. Owner/name repository path move is intentionally not applicable to the Rust ID-based repository layout; optional webhook signature compatibility is retired as not applicable by the P4-C audit because legacy evidence proves only the token secret header, and broader VCC/baseline SVN WebDAV PROPFIND edge completeness is closed by P3-A contract evidence. |
| Issue list/detail/create/edit/delete/comments/timeline | `IssueAppTest.java`, `IssueTest.java`, `issue/list.scala.html`, `issue/partial_list_wrap.scala.html`, `issue/partial_searchform.scala.html`, `issue/partial_list.scala.html`, `issue/view.scala.html`, `issue/create.scala.html`, `issue/edit.scala.html`, `issue/partial_comments.scala.html`, `issue/partial_comment.scala.html`, `issue/partial_event_timeline.scala.html`, `common/commentForm.scala.html`, `common/partial_history.scala.html`, `yobi.Files.js`, `yobi.Attachments.js` | `reference/mixed-code/packages/contracts/src/issue.ts`, `reference/mixed-code/packages/domain/src/issue-service.ts`, `reference/mixed-code/frontend/src/routes/_app.$owner.$projectName.issues.index.tsx`, `_app.$owner.$projectName.issues.$issueNumber.tsx`, repo-root issue routes and `frontend/src/api/attachments.ts` | `parity` | `IA`, `feature missing`, `state transition`, `data shape` | Keep route/UI parity tests green for issue list state/author/assignee/label/milestone filters, legacy issue-list shell anchors, `format=xls` Excel-compatible export, detail sections, `.posting-history` / `#-yona-posting-history` modal anchors, comment author avatar and `#comments.board-comment-wrap` / `.comment-avatar` anchors, writable/disabled `common/commentForm` shell anchors, comment/timeline ordering, edit/delete flow, legacy next-state behavior, and Markdown upload regression coverage. | `reference/mixed-code/packages/contracts`, `reference/mixed-code/packages/domain`, `frontend` | Current routes restore the project issue list query surface for state, author, assignee, labels, and milestone by reading label/milestone options and forwarding `labelIds`/`milestoneId` through `/api/v1/projects/:owner/:project/issues`; the React project issue list now also preserves legacy `issue/list.scala.html`, `issue/partial_list_wrap.scala.html`, `issue/partial_searchform.scala.html`, and `issue/partial_list.scala.html` anchors for the page wrapper, left quick filters/search, advanced filter form, state tabs, show-subtasks control, filter bar, mass-update checkboxes, `post-list-wrap row-fluid` rows, issue database ID row/checkbox anchors, author-login row search values, count groups, label anchors, assignee avatar image, due-date clock, weight arrows, parent issue/subtask row detail, Excel action, empty state, and `#pagination`. The legacy `issue.downloadAsExcel` action from `issue/partial_list_wrap.scala.html` is restored as a `format=xls` direct route that applies the same filters and returns an Excel-compatible `.xls` download. Issue detail no longer emits the temporary `Yona Rust Project` heading before the legacy board wrapper. Issue update now records prior body history for REST detail projection and issue detail renders the legacy `.posting-history` link plus `#-yona-posting-history` modal from `historyMarkdown` when history exists; REST `historyHtml` stays empty. Issue body and comments now render from Markdown in React; REST `bodyHtml`/`contentsHtml` fields remain empty compatibility fields, and the legacy preview route now returns Markdown source JSON for React-side preview instead of server-rendered HTML. Issue comment REST/timeline projection now includes author avatar URLs from the comment author user row, and the React detail route renders legacy `partial_comments` / `partial_comment` anchors around each comment. Writable issue comments now preserve `common/commentForm.scala.html` anchors including `#comment-form`, multipart form encoding, common editor tabs, `#editor-contents-comment-body`, `name=contents`, `data-editor-mode=comment-body`, `ISSUE_COMMENT` upload shell, `.write-comment-wrap`, `#dynamic-comment-btn`, and `button.comment.new`; React-rendered comment create/update forms always intercept submit and keep mutations on the React REST callback boundary while legacy direct POST routes remain compatibility adapters outside the SPA primary path. Non-commentable viewers get the legacy disabled `.write-comment-box.mt20[data-login=required]` shell. Issue body/comment markdown editors now restore the legacy image paste/drop path from `yobi.Files` and `yobi.Attachments` by uploading to `/files`, inserting `![name](url)`, and submitting uploaded attachment ids with issue/comment mutations through the React callback path. Board, PR, milestone, and non-ranged Git code comment/reply editors now reuse the same upload path; inline ranged commit comment creation/readback belongs to the code-browser row. |
| Issue watch/vote/share/assignee/label/mass update | `IssueTest.java`, `WatchTest.java`, `VoteApp.java`, `IssueApi` routes, `issue/partial_select_label.scala.html`, `issue/partial_massupdate.scala.html`, `issue/partial_voters.scala.html`, `issue/partial_comment.scala.html`, `partial_assignee.scala.html`, `ProjectApp.mentionList` | repo-root `/api/v1` REST + `crates/server` + `crates/persistence` + `frontend` now restore watch/vote/comment-vote/favorite/sharer/assignee/mass-update core slices plus issue detail/create/edit assignee autocomplete/search, sharable lookup, direct/project sharer row effects, issue/comment mention row effects, project-scoped `#issue` reference autocomplete, legacy direct `ProjectApp.mentionList`/commit-diff/PR mention helper JSON aliases, readable issue-link title/state metadata, issue detail/history mention-link existence metadata, and notification inbox/mail queue staging; legacy external REST issue API parity is separate migrator scope | `parity` | `feature missing`, `data shape`, `authorization` | Keep contract and route tests green for issue participation, comment vote, sharer ACL, favorite issue, mass update, issue detail/project assignable search, sharable lookup, mention indexing/notification rows, notification list/mail queue staging, issue reference autocomplete, legacy direct mention helper aliases, Markdown issue-link metadata, and issue detail/history mention-reference metadata; keep `/-*-api/v1`out of app scope unless a migrator plan owns it.                                                                 |`crates/server`, `crates/persistence`, `frontend`                                                     | Phase 2J restores detail-sidebar assignable user search over`/api/v1/owners/:owner/projects/:project/issues/:number/assignable-users`with the legacy`partial*assignee.scala.html` `#assignee.bigdrop`, `name=assigneeLoginId`, `placeholder=issue.noAssignee`, and `width:100%`field anchors plus the legacy Select2 default`No matches found`no-results copy while omitting the temporary`Assignee`placeholder /`Assign`button /`No matching users`copy; Phase 2K restores create/edit assignable user search over`/api/v1/owners/:owner/projects/:project/assignable-users`without changing assignment mutation semantics; Phase 2L adds issue sharable-user search, direct sharer`ISSUE_SHARER_CHANGED`timeline/notification rows, issue detail`issue/view.scala.html` sharer panel anchors (`dl.sharer-list`, `.issue-share-title`, `#sharer-list`, `#issueSharer`, `issue.sharer`, `issue.sharer.select`, `.text-ellipsis.sharer-item`, `.usf-group`) without temporary English share/remove copy, and issue/comment `@user`/`@org`/`@owner/project`mention row effects; issue detail REST responses now include renderable`mentionReferences`for existing`@user`/`@owner/project`tokens in body, comments, and history modal Markdown so unresolved mentions stay plain text in React like legacy`MarkdownAppTest.testMention`; Phase 2M adds `#issue`reference autocomplete over`/api/v1/owners/:owner/projects/:project/issue-references`with readable fork-origin lookup and the legacy latest-20 server candidate set, leaving exact-number ranking and the visible first 10 to At.js; direct`/:owner/:project/mentionList`, `mentionListAtCommitDiff`, and `mentionListAtPullRequest`now return the legacy`{"result":[...]}`user/issue autocomplete shape with`loginid`, `searchText`, `issueNo`, project/group all mention rows, and READ authorization. Phase 2N adds notification inbox/list, notification mail queue staging/drain, and public project-target issue sharer expansion; Phase 2O adds title/state metadata to readable issue links across project Markdown render paths while preserving plain anchors for unreadable or missing references. Legacy external `/-*-api/v1` issue parity is deferred to a separate migrator/export/import deliverable. Phase 2H closes comment agreement parity on both REST and legacy direct POST routes while preserving direct-sharer write and inherited-share read-only boundaries. |

Issue route module diet note: REST project/organization issue route registration for `/api/v1/projects/:owner/:project/issues*` and `/api/v1/organizations/:organization/issues` moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/issues.rs` on 2026-06-19. Issue-list and issue-weight REST response DTOs now live in `crates/server/src/routes/issues.rs`; shared issue label/category projection and current-user issue filter/state normalization helpers now live in `crates/server/src/routes/utils.rs`. The user route reuses only the crate-visible user-list response plus route utility filter helpers for its legacy current-user issue alias. This is a registration/DTO build-check diet change covered by `issue_core_contract`, `rest_contract::rest_project_issue_list_exposes_legacy_row_payload_fields`, `user_issue_favorite_contract::user_issue_list_defaults_to_assigned_and_filters_comment_shared_and_favorite`, and organization issue aggregation contracts.

Issue tasklist content REST-primary note: on 2026-06-25 React tasklist checkbox updates moved from the legacy external `/-_-api/v1/owners/:owner/projects/:project/issues/:number/content` caller to canonical `PATCH /api/v1/owners/:owner/projects/:project/issues/:number/content`; the legacy external route remains as a compatibility fallback and shares the same authorization/conflict behavior. Coverage: `frontend/src/api-query.spec.ts` and `issue_core_contract`.
| Board posting and comments | `BoardApp.java`, `board/list.scala.html`, `board/partial_list.scala.html`, `board/view.scala.html`, `board/create.scala.html`, `board/edit.scala.html`, `board/partial_comments.scala.html`, `common/commentForm.scala.html`, `common/commentUpdateForm.scala.html`, `common/childComments.scala.html`, `common/child_commentForm.scala.html`, `common/partial_history.scala.html`, `project/partial_readme.scala.html`, `organization/group_board_list.scala.html`, `yobi.board.Write.js`, `yobi.board.View.js`, `yobi.Files.js`, `yobi.Attachments.js` | repo-root `/api/v1` REST + `crates/server` + `crates/persistence` + `frontend` now restore project board list/detail/create/edit/delete, comments including child `parentCommentId` persistence, labels, watch, legacy project and organization board list, create-edit form, and detail/comment/child-comment shell anchors, body history projection, DB-backed README, Git README fallback rendering plus README-marked posting commit/sync, issue template edit, online code file create/edit, notice pinning, board post/comment image paste/drop upload, board detail/project-home README mention-link existence metadata, and organization board listing under legacy file routes | `parity` | `IA`, `deferred integration` | Keep `board_contract`, `organization_board_contract`, `org_project_contract`, route parity, board query-key tests, and `frontend/tests/board-posting-parity.e2e.ts` green for `.posting-history` / `#-yona-posting-history` modal anchors, board project/organization list shell anchors, board create/edit form shell anchors, board detail/comment/child-comment shell anchors, board-form Git commit context, and board post/comment/README mention-reference metadata. | `crates/server`, `crates/persistence`, `frontend` | Phase 5B closes the board/posting core app path on `/api/v1/**`, and the project-home Git README fallback now renders through `readmeFile` with legacy local image/link rewrites. README-marked board posting create/update now writes the posting Markdown to `README.md` in the project Git repository when repository storage exists, so the project-home Git README projection stays in sync. The legacy board create form reuse for `issueTemplate`, `path`, `branch`, and `edit` query context now prepares existing file text, disables attachment/notice/README controls in Git-file mode, commits `ISSUE_TEMPLATE.md` plus new/edited code files through the local Git executable, and returns a code-browser redirect without creating a board posting row. Project board list now preserves the legacy `board/list.scala.html` and `board/partial_list.scala.html` page/search/filter/list/pagination row anchors including `.page-wrap-outer`, `.post-list.project-page-wrap`, `#option_form`, `.search-bar`, `.textbox`, `.search-btn`, `.filter-wrap.board`, `ul.post-list-wrap`, `ul.post-list-wrap.notice-wrap`, `.post-item.title`, `.title-wrap`, `.infos`, `.write-btn-wrap`, and `#pagination`. Organization board list now preserves `organization/group_board_list.scala.html` anchors including `.page-wrap-outer`, `.project-page-wrap`, `#option_form`, `.project-selects.span7`, `#projects`, `name=projectNames[]`, `.search-bar.span4`, `.textbox.group-board`, `.search-btn`, `.filter-wrap.board`, `ul.post-list-wrap`, `.group-project-name`, `.post-id` `#postNumber`, `.write-btn-wrap`, and `#pagination`. Board create/edit forms now preserve the legacy `board/create.scala.html` and `board/edit.scala.html` `.page-wrap-outer`, `.project-page-wrap`, `form.nm`, `.content-wrap.frm-wrap`, `dl`, `#title`, `.zen-mode.text.title`, `name=body`, `data-editor-mode=content-body`, `.right-txt.mt10.mb10`, `#notice`, online commit hidden fields, `#readme`, `.actions`, edit-only `#notificationMail`, `.file-path-wrap`, `.new-file-name`, and issue-template `.attach-wrap` anchors. Posting update now records prior body history for REST detail projection and board detail renders the legacy `.posting-history` link plus `#-yona-posting-history` modal from `historyMarkdown` when history exists; REST `historyHtml` stays empty. Board detail now preserves the legacy `board/view.scala.html` outer/body/action/comment containers, `board/partial_comments.scala.html` comment header/list/comment/media anchors, `common/commentForm.scala.html` create form anchors, `common/commentUpdateForm.scala.html` edit form anchors, and `common/childComments.scala.html` / `common/child_commentForm.scala.html` one-line child comment rows/forms while React callbacks still submit through the app runtime; React-rendered comment create/update forms always intercept submit and keep mutations on the React REST callback boundary while legacy direct POST routes remain compatibility adapters outside the SPA primary path. Board post body, board comments, and DB-backed README postings now render from Markdown in React; their REST `bodyHtml`/`contentsHtml` fields remain as empty compatibility fields instead of server-rendered HTML, and board detail/comment plus project-home README rendering now consume `mentionReferences` so unresolved mentions stay plain text in React like legacy `MarkdownAppTest.testMention`. Board post body and board comment editors now restore the legacy image paste/drop upload path from `yobi.board.Write`, `yobi.board.View`, `yobi.Files`, and `yobi.Attachments` by posting to `/files`, inserting `![name](url)`, and submitting uploaded attachment ids through the React callback path. Remaining board gap is legacy external `/-_-api/v1/**` compatibility for migrator scope. |

Board detail watch-shell refresh: React now preserves legacy `board/view.scala.html` `#watch-button`, `.watcher-list`, and `post.watch` / `post.unwatch` message-key copy, and removes the temporary inline `Watchers N` label.

Board action-copy refresh: React board create/edit forms and board comment update forms now use legacy `button.save` / `button.cancel` message-key copy from `board/create.scala.html`, `board/edit.scala.html`, and `common/commentUpdateForm.scala.html`.

Board delete-control class refresh: React board detail post/comment delete controls now preserve the legacy `board/view.scala.html` and `board/partial_comments.scala.html` `btn-transparent... ml6` class shape without the React-only `danger` class while retaining the existing modal/direct delete anchors.

Board list comment-count refresh: React now mirrors `board/partial_list.scala.html` by rendering `.comments-count` only when `numOfComments > 0`, with legacy `.count-groups` inner spans, and no temporary `Comments 0` text for zero-comment posts.

Board list badge refresh: React now uses only the legacy inline `.label.label-notice` and `.label.label-important` markers from `board/partial_list.scala.html`, without the previous extra `.board-badge` wrapper.

Board list title-prefix refresh: React mirrors `TemplateHelper.showHeaderWordsInBracketsIfExist` / `removeHeaderWords` for leading bracket words, rendering `.title-prefix` anchors before the stripped title link. The non-navigating href uses React-safe `#!` instead of legacy `javascript:void(0)`.

Board detail selected-label refresh: React right sidebar now preserves the `partial_show_selected_label.scala.html` static selected-label shell for board labels, including `dl` / `dt label` / `.label.issue-label.active.static` anchors and legacy `&labelIds=:id` link targets. Updateable all-label Select2 option payload is outside this narrow refresh.

Project create pending-copy refresh: React `ProjectNewPage` now keeps the legacy `project/create.scala.html` submit button label `project.create` even while the create mutation is pending, removing the temporary `Creating…` label while retaining submit disabling.

Board post submit-boundary refresh: React board create/edit forms keep the legacy `board/create.scala.html` / `board/edit.scala.html` shell anchors (`form.nm.board-form`, `.content-wrap.frm-wrap`, `#title`, editor, label/notice/readme controls, and online-commit fields) but no longer render direct `action` or form-level `method="post"` fallbacks. Their required React submit callback remains the only SPA browser mutation path and routes through the board REST layer.

Organization pending-copy refresh: React organization create and settings forms now keep the legacy `organization/create.scala.html` / `organization/setting.scala.html` submit labels (`organization.create`, `button.save`) while pending, removing temporary pending labels while retaining submit disabling.

Project/organization submit-boundary note: on 2026-06-25 the React-rendered project create/settings/member/webhook/fork forms and organization create/settings/member forms were aligned with the auth/workspace REST boundary. These pages keep their legacy shell anchors (`#newProjectForm`, `#saveSetting`, `#addNewMember`, `#formNewWebhook`, fork form controls, field names, labels, and legacy class names) but no longer render direct form-level `action` or `method="post"` fallbacks when the mounted React route owns the REST mutation. Project/organization role edit, delete, leave, enrollment, and other button/anchor controls keep legacy direct `data-href`/`data-request-*` evidence where those controls are not form-submit owned. The legacy direct adapters may remain server-side for compatibility, but they are not the React browser mutation path for these REST-owned forms. Focused coverage lives in `frontend/src/project-create-parity.spec.tsx`, `frontend/src/project-settings-parity.spec.tsx`, `frontend/src/route-parity.spec.tsx`, `frontend/src/auth-workspace-shell.spec.tsx`, and `frontend/src/wave2a-container-parity.spec.tsx`.

Issue detail watcher-list refresh: React issue detail now keeps the legacy `issue/view.scala.html` empty `.watcher-list` shell and removes the temporary visible `Watchers: N` copy while preserving the existing `#watch-button` state.

Issue mention/reference loading refresh: React issue mention and `#issue` reference autocomplete now hides loading result popovers like legacy At.js instead of rendering temporary `Searching…` status copy.

Issue assignee autocomplete status-copy refresh: React now preserves the legacy bundled Select2 `formatSearching` / `formatLoadMore` copy (`Searching...`, `Loading more results...`) for issue assignee autocomplete loading and truncated states instead of the temporary Unicode ellipsis variants.

Issue detail selected-label refresh: React issue detail now renders selected labels through the legacy `partial_show_selected_label.scala.html` shell (`dl`, `dt label`, `dd`, `.label.issue-label.active.static`, list-link `labelIds` hrefs) instead of temporary detail-only `.label.issue-label.list-label.active` spans.

Issue form submit-boundary refresh: React issue create/edit forms keep the legacy issue form shell anchors (`#issue-form`, multipart editor fields, `#button-save`, draft/publish controls, assignee/milestone/due-date/label sidebars, and hidden draft/publish fields) but no longer render direct `action` or form-level `method="post"` fallbacks. The required React submit callback remains the only SPA browser mutation path and routes through the issue REST layer. Create/edit/delete success redirects also use the app base-path helper so subdirectory reverse-proxy deployments stay inside the mounted SPA path. Issue detail comment create/edit forms preserve legacy route strings as DOM anchors only; their submit handlers call `preventDefault()` before validation/callback early returns, so optional callbacks cannot fall through to native direct-submit behavior.

Issue detail vote-shell refresh: REST issue detail now exposes `issueVoters` for the current issue, and React issue detail keeps the legacy `#vote.vote-wrap` heart icon shell, renders `partial_voters` / `partial_voter_list`-style `.voter-list-wrap`, `.voter-list`, and `#voters.modal.hide.voters-dialog` anchors when voters exist, and removes temporary visible `Vote` / `Unvote` / `Voters: N` copy.

Issue detail action-row refresh: REST issue detail now exposes additive `issueId` for legacy new-subtask parent links, and React issue detail preserves `issue/view.scala.html` action-row anchors around `#issue-share-button`, mobile `.project-btn-item.show-in-mobile-inline` new-subtask CTA, non-updatable `button.show.original` editform links, and `.issue-weight` / `#upvote-issue-weight` / `#down-vote-issue-weight` / `.weight-number`. The app REST detail path now supports weight up/down mutation and returns the legacy `{ weight }` response shape used to refresh `.weight-number`. Issue detail new-subtask CTAs keep the legacy `/issueform?parentIssueId=...` href while using TanStack SPA navigation into the create form; focused guard: `frontend/tests/project-issue-detail.e2e.ts`.

| Labels and categories | `IssueLabelApp` routes, `project/issuelabels.scala.html`, `project/partial_issuelabels_list.scala.html`, `project/partial_issuelabels_editlabel.scala.html`, `project/partial_issuelabels_editcategory.scala.html`, `common/issueLabelColor.scala.html` | repo-root `/api/v1` REST + `crates/server` + `crates/persistence` + `frontend` now restore label/category CRUD, legacy direct routes, labelsform route, CSS generation with `ETag` / `If-None-Match` 304 handling, and Phase 6 project-to-project label copy | `parity` | `feature missing`, `deep-link`, `admin surface` | Keep `issue_label_contract`, `rest_contract`, and labelsform E2E smoke green for label/category list, create, update, delete, CSS, CSS cache validation, copyLabels, and project-level label administration. | `crates/server`, `crates/persistence`, `frontend` | Phase 2B restores project issue label/category management, including the legacy `project/issuelabels.scala.html` and partial anchors (`#copyLabel`, `#frmNewLabel`, `.label-preset-colors`, `#labelsList`, category/label data URI hooks, `#editCategory`, and `#editLabel`). The legacy `IssueLabelApp.labelStyles` CSS route now preserves project read ACL, `text/css` output, generated `.issue-label` color rules, and cache validation through an `ETag` plus 304 response for matching `If-None-Match`. Phase 6 adds `copyLabels` with readable source-project and updatable target-project guards, duplicate label/category reuse, the app REST `/labels/copy` endpoint, and the legacy direct form route. |
| Milestones | `MilestoneApp` routes, `milestone/list.scala.html`, `milestone/view.scala.html`, `milestone/create.scala.html`, `milestone/edit.scala.html`, `common.editor`, `common.fileUploader`, `yobi.Files.js`, `yobi.Attachments.js` | repo-root `/api/v1` REST + `crates/server` + `crates/persistence` + `frontend` restore project milestone list/detail/create/edit/delete/open/close, issue counts/progress, detail issue tabs, React-side Markdown rendering, attachment binding, milestone mention-link existence metadata, legacy create/edit form shell anchors, and milestone create/edit image paste/drop upload | `parity` | `feature missing`, `deep-link`, `state transition` | Keep `milestone_contract`, shell routing milestone smoke, route parity, and milestone upload E2E coverage green for form shell anchors, issue-reference, and mention-reference Markdown metadata; add follow-up tests only if legacy external REST or migration milestone flows re-enter scope. | `crates/server`, `crates/persistence`, `frontend` | Phase 2C restores app-runtime milestone management and direct legacy routes. Milestone detail descriptions now render from Markdown in React; REST `contentsHtml` remains an empty compatibility field. Milestone list/detail now preserve the legacy `milestone/list.scala.html` and `milestone/view.scala.html` shell/action anchors (`.tab-wrap`, `.filter-wrap.milestone`, `ul.milestones`, `.issue-link`, `.milesion-wrap`, `.attachments[data-attachments]`, `#issues`, action `data-request-uri`, and `#deleteConfirm`). Milestone create/edit forms now preserve the legacy `milestone/create.scala.html` and `milestone/edit.scala.html` `.page-wrap-outer`, `.project-page-wrap`, `.content-wrap.frm-wrap`, `#milestone-form`, `#title`, `common.editor` `contents`/`content-body`, `.span9.span-left-pane`, `.span3.span-hard-wrap`, status radio, `#dueDate`, and `#datepicker` anchors, but no longer render direct form-level `action` or `method="post"` fallbacks because the mounted React routes submit through the milestone REST mutations. Milestone create/edit/delete success redirects use the app base-path helper so subdirectory reverse-proxy deployments remain inside the mounted SPA path. Milestone create/edit body editors restore the legacy `common.editor` + `common.fileUploader` image paste/drop upload path by posting to `/files`, inserting `![name](url)`, and submitting uploaded attachment ids with matching milestone mutations when the SPA handler is present. React-rendered milestone issue-reference metadata and mention-reference metadata now flow through the shared Markdown metadata payload, so unresolved milestone mentions stay plain text like legacy `MarkdownAppTest.testMention`. REST `/-_-api/v1/**` and migration export/import milestone flows stay follow-up scope. |
| Repository code browser, raw file, file preview, branch picker | `CodeApp.java`, `ProjectApp.java`, `ProjectApi.java`, `RepositoryService.java`, `code/view.scala.html`, `code/partial_view_folder.scala.html`, `code/partial_view_file.scala.html`, `git/partial_branch.scala.html`, `code/nohead.scala.html`, `code/nohead_svn.scala.html` | repo-root `/api/v1` REST + direct legacy `rawcode`, `files`, `image`, `code/:branch/download`, Smart HTTP `/:owner/:project.git`, and SVN `/svn/$path` boundary routes + `crates/vcs` + `crates/server` + `frontend` now restore Git repository provisioning on project create, read-only Git folder/file browsing, no-head state with legacy site-name interpolation, branch/tag selector refs, breadcrumbs, line-numbered text file rendering, syntax token highlighting, React-side Markdown file rendering with local image path rewrite, raw file streaming, inline file open, image preview, branch archive download, commit diff file added/deleted counts plus inline commentable row triggers, upload-pack/receive-pack transport, push post-receive records, SVN repository storage provisioning through `svnadmin create` on changeVCS, and SVN protocol auth/status boundary routing plus WebDAV `OPTIONS`, `DAV: 1,2`/`MS-Author-Via: DAV` discovery headers, root/default VCC `PROPFIND` responses with executable-backed youngest revision, repository UUID, checked-in baseline resource, and baseline-collection metadata plus baseline resource `PROPFIND` when `svnlook` is available, executable-backed `GET`/`HEAD` file content and file `PROPFIND` content-length/content-type/etag/displayname/supportedlock/version/checked-in/baseline-relative-path metadata plus live/custom property value/name projection and supportedlock/lock discovery via `svnlook cat`/`youngest`/`proplist`/`propget`/`lock` for normal plus `!svn/rvr`/`!svn/bc`/`!svn/ver` revision resources via `svnlook cat`/`youngest`, request-aware collection tree and revision-pinned baseline collection child metadata plus child file content-type/etag/displayname/supportedlock/version/checked-in metadata via `svnlook tree`/`youngest`, `log-report`/`dated-rev-report` revision metadata via `svnlook log`/`author`/`date`, `get-locks-report` lock metadata via `svnlook lock`, `get-locations-report`/`get-location-segments-report` path metadata via `svnlook cat`/`tree`, depth/recursive-aware `update-report` checkout/update file fetch metadata via `svnlook tree`, `file-revs-report` file revision metadata plus txdelta content via `svnlook log`/`cat`, `mergeinfo-report` mergeinfo metadata via `svnlook propget`, `get-deleted-rev-report` deleted-path revision lookup via `svnlook` path existence, `list-report` directory entry metadata via `svnlook tree`/`cat`, `inherited-props-report` inherited regular property metadata via `svnlook proplist`/`propget`, `replay-report` revision editor metadata via `svnlook changed`, WebDAV `LOCK`/`UNLOCK` via `svnadmin lock`/`unlock`, and WebDAV `PUT` file updates, `DELETE` removals, `MKCOL` collection creation, `PROPPATCH` property set/remove, and `MKACTIVITY`/`CHECKOUT`/`MERGE` commit choreography via `svn checkout`/`commit` | `parity` | `IA`, `feature missing`, `deep-link` | Keep `code_browser_contract`, `smart_http_contract`, `svn_protocol_contract`, route parity, direct raw/open/image/archive contract tests, code rendering tests, VCS lifecycle tests, code diff UI regression tests, and code browser E2E smoke green; keep the closed P3-A broader SVN WebDAV PROPFIND edge cases covered by focused contract tests. | `crates/vcs`, `crates/server`, `frontend` | Phase 3A restores the first read-only code browser slice over existing Git repositories under `YONA_DATA/repo/<project_id>.git`, including legacy branch/tag selector refs on code browser, history, and commit-detail read surfaces plus `code/nohead.scala.html` / `code/nohead_svn.scala.html` `utils.Config.getSiteName` interpolation for setup headings and Git `Hello <site>` commit messages; Phase 3B adds legacy direct Git blob surfaces for raw text, inline file open, image preview, missing-file redirect, and traversal rejection; Phase 3C adds legacy branch zip archive download; Phase 3D adds numbered syntax-highlighted text rendering while preserving `#showCode`/`.code-wrap` anchors, and the Markdown-file path now keeps `#codeVal.markdown-wrap.codebrowser-markdown` while React renders `file.text` after REST rewrites local image links and leaves normal local links unchanged like legacy `Markdown.renderFileInCodeBrowser`. Commit diff rendering now preserves file-level added/deleted counts from the unified patch and keeps line-gutter inline comment triggers on commentable rows. Phase 3J restores project creation bare Git repository provisioning and default `vcs = GIT`; Phase 3K restores native `git http-backend` Smart HTTP upload-pack clone/pull and authenticated receive-pack transport with Basic password/API-token auth and repository role checks; Phase 3L records receive-pack post-receive `last_pushed_date`, `project_pushed_branch`, `NEW_COMMIT` notification/mail rows, and git-push JSON webhook outbox payloads; Phase 3M starts SVN lifecycle parity by provisioning `YONA_DATA/repo/<project_id>.svn` through the local `svnadmin create` executable when changeVCS switches to Subversion; Phase 3N mounts the legacy `/svn/$path<.+>` boundary with Basic/session auth, project READ/write authorization, Subversion-only filtering, storage existence checks, DAV metadata including `MS-Author-Via: DAV`, a 200 `OPTIONS` capability response, root/default VCC/baseline resource `PROPFIND` multistatus responses with `svnlook youngest` revision and repository UUID metadata when available, `svnlook cat` backed file serving plus file content-length/content-type/etag/displayname/supportedlock/version/checked-in/baseline-relative-path metadata plus live/custom property value/name projection and supportedlock/lock discovery through `svnlook cat`/`youngest`/`proplist`/`propget`/`lock` for normal, `!svn/rvr`, `!svn/bc`, and `!svn/ver` revision-pinned paths, `svnlook tree` backed request-aware collection and revision-pinned baseline collection metadata plus child file content-type/etag/displayname/supportedlock/version/checked-in metadata, `svnlook log`/`author`/`date` backed `log-report`/`dated-rev-report` revision metadata, `svnlook lock` backed `get-locks-report` metadata, `svnlook cat`/`tree` backed `get-locations-report`/`get-location-segments-report` path metadata, `svnlook tree` backed depth/recursive-aware `update-report` checkout/update file fetch metadata, `svnlook log`/`cat` backed `file-revs-report` file revision metadata, `svnlook propget` backed `mergeinfo-report` mergeinfo metadata, `svnlook` path-existence backed `get-deleted-rev-report` deleted revision metadata, ra_serf-shaped `list-report` directory entry metadata, `inherited-props-report` inherited regular property metadata, `replay-report` revision editor metadata, `svnadmin lock`/`unlock` backed WebDAV `LOCK`/`UNLOCK`, and `svn checkout`/`commit` backed WebDAV `PUT` file updates, `DELETE` removals, `MKCOL` collection creation, `PROPPATCH` property set/remove, and `MKACTIVITY`/`CHECKOUT`/`MERGE` commit choreography. Actual local `svn info`, `svn ls`, `svn cat`, `svn log`, `svn blame`, `svn checkout`, single-file `svn commit`, `svn update`, conflict-on-update, fresh-checkout property materialization, add/delete/mkdir/props/lock/copy/move over HTTP are now covered; the former broader SVN WebDAV PROPFIND edge list is closed by P3-A evidence. |
| Branches, history, compare, default-branch admin | `BranchApp.java`, `CodeHistoryApp.java`, `CompareApp.java`, `code/branches.scala.html`, `code/partial_branchrow.scala.html`, `code/history.scala.html`, `code/diff.scala.html`, `code/compare.scala.html` | repo-root `/api/v1/projects/:owner/:project/commits`, `/api/v1/projects/:owner/:project/commit/:id`, `/api/v1/projects/:owner/:project/compare/:revA..:revB`, `/api/v1/projects/:owner/:project/branches`, `/api/v1/projects/:owner/:project/branches/default`, and `/api/v1/projects/:owner/:project/branches` DELETE + `crates/vcs` + `crates/server` + `frontend/src/routes/$owner/$projectName/{commits,commit,compare,branches}/**` now restore legacy commit history lists, branch/path-scoped history, breadcrumbs, commit links, 25-item pagination, commit detail/diff rendering, non-ranged commit discussion, single/multi-line inline code comment creation/readback/edit/delete, compare diff rendering, branch list rendering, branch-row latest PR state/link, default branch mutation, and non-default branch delete | `parity` | `feature missing`, `deep-link`, `state transition` | Keep `code_browser_contract`, route parity, project-code-browser routing tests, shell-routing smoke, and project-code-comment E2E coverage for commit history/detail/discussion/compare/branch management green. | `crates/vcs`, `crates/server`, `frontend` | Phase 3E restores read-only commit history over existing Git repositories. Phase 3F restores read-only commit detail/diff with commit metadata, first-parent metadata, branch/path list-back state, missing-commit 404, unified diff patches, and legacy `code/diff.scala.html` class/id anchors. Phase 3G restores read-only compare with both commit projections, missing-revision 404, empty-diff state, and unified diff patches. Phase 3H restores legacy branch list/latest-PR/default/delete over real bare Git refs while preserving `branches.scala.html` and `partial_branchrow.scala.html` class/id anchors. Phase 3I restores non-ranged Git commit comments/replies/edit/delete, single/multi-line inline commit comment creation/readback from line click or same-file diff text selection, inline ranged reply/edit upload, thread open/close, comment counts, event rows, and notification-mail staging; SVN remains an explicit follow-up gap. |

Code route module diet note: REST/direct code route registration plus the code/repository handler body cluster for `/api/v1/projects/:owner/:project/code`, `/commits`, `/commit/:commitId*`, `/compare/:revA..:revB`, `/branches*`, direct raw/open/image/archive routes, code REST DTOs, legacy ajax JSON mapping, code browser/history/commit/compare/branch response mappers, and branch pull-request projection moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/code.rs` on 2026-06-19. Shared VCS route error mapping, branch error mapping, code Markdown path detection, renderable-file detection, and code-menu visibility helpers now live in `crates/server/src/routes/utils.rs` so code, project, board, and PR routes reuse that boundary without root-owned VCS helper bodies. This build/check diet change is covered by `code_browser_contract`.

Server route visibility cleanup note: route-module split follow-up on 2026-06-20 narrowed private REST handlers in code/issues/projects/workspace modules back to module visibility, removed stale service facade wrappers that route modules already bypassed, and dropped obsolete root/route re-exports. This is behavior-neutral cleanup for the existing parity slices above; `pnpm agent:cargo -- --outside-sandbox check -p yoram-server --lib` now passes without route-visibility or dead-code warning lines, while `node tools/yona-parity-gate.mjs docs/provenance/core-parity-audit.md` remains green.

| Commit discussion and thread lifecycle | `CodeHistoryApp.java`, `CommentThreadApp.java`, `CommentApp.java`, `code/diff.scala.html`, `partial_diff.scala.html`, `partial_diff_line.scala.html`, `partial_diff_comment_on_line.scala.html`, `partial_comment_thread.scala.html`, `code/partial_nonrange_codecomment_thread.scala.html`, `common/commentForm.scala.html`, `common/reviewForm.scala.html`, `yobi.code.Diff.js`, `yobi.code.SvnDiff.js`, `yobi.CodeCommentBox.js`, `yobi.Files.js`, `yobi.Attachments.js` | repo-root `/api/v1/projects/:owner/:project/commit/:id/comments`, `/api/v1/projects/:owner/:project/commit/:id/comments/:commentId`, `/api/v1/projects/:owner/:project/commit/:id/threads/:threadId/open&#124;close`, `comment_thread`, `review_comment`, `frontend/src/api/code-commits.ts`, `frontend/src/api/attachments.ts`, and `frontend/src/routes/-code-views.tsx` | `parity` | `deferred integration` | Keep commit discussion contract, route rendering tests, and `project-code-comment-upload-parity.e2e.ts` green; add later tests for SVN if prioritized. | `crates/server`, `crates/persistence`, `frontend` | Phase 3I restores Git non-ranged commit discussion with legacy thread/comment classes, author or project-update edit/delete, thread state changes, and notification event/mail staging. Git commit discussion comments now render from Markdown in React; REST `contentsHtml` remains an empty compatibility field. Non-ranged commit comment/reply/edit editors and inline ranged reply/edit editors now reuse the legacy-style `yobi.Files`/`yobi.Attachments` image paste/drop flow by posting to `/files`, inserting `![name](url)`, and submitting uploaded `attachmentIds` with comment mutations. The commit diff now renders line-numbered `.linenum`/`.diff-partial-codeline` rows and supports single/multi-line inline code comment creation/readback with `path/startLine/endLine`, `.comments.board-comment-wrap`, `data-range-*` thread anchors, same-file diff text selection matching legacy `yobi.CodeCommentBlock`, and legacy-style `#comment-editform-*`/`.comment-update-form` edit forms. React-rendered code-comment issue-reference metadata, mention-reference metadata, and commit-SHA metadata now flow through the shared Markdown reference payload, and raw HTML-like comment blocks stay opaque to autolinks; legacy SVN `CommitComment` remains deferred. |
Pull request route module diet note: REST pull request/review route registration plus the handler body and filter-helper cluster for `/api/v1/owners/:owner/projects/:project/pull-requests*`, `/api/v1/owners/:owner/projects/:project/reviews`, and `/api/v1/organizations/:organization/pull-requests` moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/pull_requests.rs` on 2026-06-19. This build/check diet change is covered by `pull_request_read_contract::pull_request_read_surface_returns_lists_detail_changes_reviews_and_org_aggregate`.

Issue route module diet note: REST issue handler bodies, issue-list/weight response DTOs, and issue-specific access/detail response helpers for project, organization, and user issue REST surfaces moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/issues.rs` on 2026-06-19. This build/check diet change is covered by `issue_core_contract::issue_core_contract_creates_reads_updates_and_deletes_over_rest`.

Legacy external issue utility diet note: legacy external issue API handler bodies now live in `crates/server/src/routes/issues.rs`, and their shared request/body/auth/date/avatar/upload-author helper bundle moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/utils.rs` on 2026-06-19. This build/check diet change keeps the helper dependency inside the routes module boundary and is covered by `issue_core_contract::issue_core_contract_creates_reads_updates_and_deletes_over_rest`.

| Pull request list/detail/create/open/close | `PullRequestAppTest.java`, `PullRequestTest.java`, `NotificationEvent.afterNewPullRequest`, `NotificationEvent.afterPullRequestUpdated`, `PullRequestApp.java`, `user/partial_pullRequests.scala.html`, `git/create.scala.html`, `git/edit.scala.html`, `git/view.scala.html`, `git/viewChanges.scala.html`, `git/fork.scala.html`, `git/partial_state.scala.html`, `git/partial_merge_result.scala.html`, `yobi.git.Write.js`, `yobi.git.View.js`, `yobi.Files.js`, `yobi.Attachments.js` | repo-root `/api/v1/owners/:owner/projects/:project/pull-requests`, `form-options`, `merge-result`, `/:number`, `/:number/form-options`, `/:number/changes`, `/:number/close`, `/:number/open`, `/:number/accept`, `/:number/source-branch`, `/:number/watch`, `/reviews`, `/fork-options`, `/fork`, direct `/:owner/:project/pullRequest/:id/state`, `POST /threads/:id/open&#124;close`, and `/api/v1/organizations/:organization/pull-requests` cover the Phase 4A read surface plus Phase 4B interaction surface, create/edit legacy labels and merge preflight anchors, fork/clone slice, reviewer-threshold-gated conflict-free merge accept, conflict-state merge disable/help plus legacy `.howto-resolve-conflict` contributor guide, reviewer required/lacking projection, project default reviewer threshold settings, PR watcher projection/watch-unwatch, PR watcher/body-mention-derived notification receivers, source branch cleanup/restore, PR commit-changed records/webhooks, legacy `partial_info.scala.html` overview/changes tabs with open review-thread badge, legacy `partial_state.scala.html` safe/conflict/merged notices with merged receiver identity, legacy direct PR state polling JSON helper, legacy `git/view.scala.html` event-only overview without the non-legacy `review-list-wrap` / `h2 Reviews` section, legacy `partial_pull_request_event.scala.html` conversation event list shell including sender avatar/tooltip anchors, merged commit links, and commit-change `ul.commit-list` rows, legacy `CommentThreadApp.open/close` thread routes plus `commentThread.open`/`commentThread.close` request buttons, specific commit changes route/filter, selected commit `.commitInfo`/`.commitMsg.mt5`, current-changes inline outdated-thread filtering, explicit PR changes `inlineThreads`/`nonRangedThreads`/`cardThreads` display buckets, legacy changes-page `board-comment-wrap` / `non-ranged-threads-wrap` general comment placement, review-card show/hide anchors, PRIOR commit/review-card outdated markers, side-aware single/multi-line ranged inline review comment create/edit/delete, and PR detail mention-reference metadata with typed frontend query/mutation options and file routes | `parity` | `IA`, `state transition`, `deferred integration` | Keep `pull_request_read_contract`, `pull_request_mutation_contract`, `project_fork_contract`, route parity, PR/review read smoke, `pull-request-interaction-parity.e2e.ts`, `smart_http_contract`, and `project-fork-parity.e2e.ts` green. | `crates/server`, `crates/persistence`, `crates/vcs`, `frontend` | Phase 4B restores app-runtime PR create/edit form-options, create/edit mutation, close/reopen, general PR comment creation, event rows, notification staging, legacy PR create/review/comment non-JSON webhook fan-out, and legacy class/id anchored create/edit/detail controls. PR create/edit now also restores legacy `title.newPullRequest` / `title.editPullRequest`, `pullRequest.from` / `pullRequest.to`, `pullRequest.select.branch`, `pullRequest.menu.commit`, `pullRequest.send`, `button.save`, `button.cancel`, and the `mergeResultURL` preflight surface as React-rendered `#__commits`, `#numOfCommits`, and `#mergeResult` anchors backed by `/api/v1/.../pull-requests/merge-result`, whose native Git preview runs in a disposable worktree and does not mutate the target repository. PR bodies and review comments now render from Markdown in React; REST `bodyHtml`/`contentsHtml` fields stay empty app-runtime compatibility fields. PR body/comment responses now include renderable `mentionReferences`, so unresolved mentions stay plain text in React like legacy `MarkdownAppTest.testMention`. PR detail now preserves the legacy `git/view.scala.html` overview shell anchors around the body/footer/help modal, `partial_state.scala.html` safe/conflict/merged notices with merged receiver identity, the legacy direct `pullRequest/:id/state` helper returns JSON flags (`isOpen`, `isClosed`, `isMerged`, `isMerging`, `isConflict`, and source-branch controls) under the same READ/code ACL, and detail/changes render the legacy `partial_info.scala.html` overview/changes tabs with `pullRequest.menu.overview`, `pullRequest.menu.changes`, and the open review-thread `num-badge`. PR detail conversation events now render the legacy `partial_pull_request_event.scala.html` shell anchors (`ul.comments#comments`, `li.event#comment-*`, `.state`, `.date a[href="#event-*"]`, sender avatar/tooltip links, merged commit `.link`, and message keys). PR/commit review threads now expose the legacy `CommentThreadApp.open/close` direct routes at `POST /threads/:id/open&#124;close`, and PR thread controls render `commentThread.open` / `commentThread.close` buttons with legacy `data-request-method` and `data-request-uri` anchors while preserving REST mutations. PR create/edit body and changes-page general review comment editors now restore legacy `yobi.git.Write` / `yobi.git.View` image paste/drop upload by posting to `/files`, inserting `![name](url)`, and submitting uploaded attachment ids with matching `/api/v1` mutations; the general comment form now lives under the legacy `git/viewChanges.scala.html` `board-comment-wrap` / `non-ranged-threads-wrap` shell while the overview keeps only the `git/view.scala.html` event timeline wrapper. The fork/clone slice restores legacy `newFork` anchors and personal/organization target selection, records `original_project_id`, and clones the source bare repository via the native `git clone --bare` wrapper. The merge accept slice restores legacy `#btnAccept` action wiring and direct route, enforces the project reviewer threshold before native `git merge --no-ff`, records `state = MERGED(6)` plus `merged_commit_id_from/to`, and emits `PULL_REQUEST_MERGED` event/webhook rows; conflicting native merges mark the PR conflict, emit no merge webhook, hide `#btnAccept`, render visible conflict help, and now restore the legacy `.howto-resolve-conflict` contributor rebase/force-push guide in detail and changes views. The reviewer projection slice exposes `requiredReviewerCount`, `lackingReviewerCount`, and `reviewed` on PR detail and renders the legacy reviewer status anchor, and the project settings slice persists `defaultReviewerCount`/`isUsingReviewerCount` with the legacy reviewer count panel anchors. Legacy generated routes expose no separate per-PR reviewer assignment endpoint beyond `ReviewApp.review`/`unreview`. The PR watcher surface slice follows `PullRequestTest.getWatchers_*` and legacy `#watch-button`/`WatchApp.watch`/`unwatch` for contributor, explicit PR watchers, target project watchers, review comment authors, PR-level unwatch, and project READ filtering, and PR notification receivers now include review comment authors plus active PR body mentions through the legacy default receiver rule. The branch lifecycle slice restores legacy merged-state source branch delete/restore anchors, deletes non-default source refs, and recreates deleted source branches from the merge commit's source parent. The PR commit-changed slice records source-branch Smart HTTP pushes as `pull_request_commit` rows, `PULL_REQUEST_COMMIT_CHANGED` events/notifications, and non-JSON PR webhooks. The ranged inline review slice renders PR changes as line-numbered diff rows, submits `path/startLine/endLine/startSide/endSide` plus commit ids, edits/deletes authorized review comments, mirrors legacy `yobi.CodeCommentBlock` by deriving multi-line review ranges from same-file selected diff text, adds the legacy specific change route plus `commitId` filtered diff response, renders selected commit `.commitInfo` and `.commitMsg.mt5` metadata before the diff, marks selected `PRIOR` commits in `#commits` with `review.outdated`, excludes outdated/commit-only threads from the current changes inline diff, separates the PR changes payload into legacy display buckets (`inlineThreads`, `nonRangedThreads`, `cardThreads`) while retaining `threads`, and restores `.btn-show-reviewcards`, `.btn-hide-reviewcards`, `#reviewcards-open` / `#reviewcards-closed` review-card state/outdated markers. React-rendered PR issue-reference metadata, mention-reference metadata, and commit-SHA metadata now flow through the shared Markdown reference payload, and raw HTML-like PR body/review comment blocks stay opaque to autolinks; conflict resolution parity is the legacy `.howto-resolve-conflict` manual guide plus refresh action, and legacy external `/-_-api/v1/**` compatibility remains deferred. |
| PR merge, reviewer lifecycle, review comments/threads, diff/timeline, branch cleanup | `PullRequestApp.java`, `ReviewApp.java`, `PullRequestEventTest.java`, `ReviewThreadAppTest.java`, `ReviewCommentTest.java`, `ReviewSearchConditionTest.java`, `common/reviewForm.scala.html`, `git/viewChanges.scala.html`, pull-request change views | Phase 4B now includes review/unreview, general review comment create, thread open/close mutation, legacy `CommentThreadApp.open/close` direct route anchors, and PR create/review/comment/commit-changed webhook fan-out over `/api/v1`; fork/clone, reviewer-threshold-gated conflict-free native merge accept, conflict-state merge disable/help, reviewer required/lacking projection, project default reviewer threshold settings, PR watcher projection/watch-unwatch, source branch delete/restore, PR commit-changed records, legacy `partial_info.scala.html` overview/changes tabs with open review-thread badge plus top `#reviewers` participants/review/merge controls, reviewer avatar images, and legacy `pullRequest.review` / `pullRequest.unreview` / `pullRequest.merge` labels, overview contributor avatar images, footer `button.edit` / `pullRequest.close` / `pullRequest.reopen` action labels, `partial_state.scala.html` safe/conflict/merged notices with merged-state receiver identity/avatar rendering, legacy `partial_pull_request_event.scala.html` conversation event list shell including sender avatar/tooltip anchors, merged commit links, and commit-change `ul.commit-list` rows, legacy `git/viewChanges.scala.html` outer shell anchors plus `common.reviewForm` hidden block-review shell for the changes diff surface, specific commit changes route/filter, selected commit `.commitInfo`/`.commitMsg.mt5`, current-changes inline outdated-thread filtering, explicit PR changes `inlineThreads`/`nonRangedThreads`/`cardThreads` display buckets, changes-page `board-comment-wrap` / `non-ranged-threads-wrap` general comment placement, `button.comment.new` comment submit labels, `button.edit` / `button.save` / `button.cancel` / `common.comment.delete` comment edit/delete labels, review-card show/hide anchors, stable `partial_reviewlist.scala.html` `.outdated-label`, avatar image elements, and `DiffRenderer.urlToCommentThread` changes-container links, PRIOR commit/review-card outdated markers, and side-aware single/multi-line ranged inline review comment create/edit/delete now exist | `parity` | `feature missing`, `deep-link`, `state transition`, `data shape` | Keep conflict guide, merge accept, branch lifecycle, and diff composition tests green. | `crates/server`, `crates/persistence`, `crates/vcs`, `frontend` | Phase 4B closes the first DB-backed interaction slice, the fork/clone slice closes the legacy project fork creation path, the merge accept slice closes the reviewer-threshold-gated conflict-free native Git merge path with `PULL_REQUEST_MERGED` event/webhook fan-out plus conflict-state disable/help, the reviewer projection/settings slices close legacy required/lacking reviewer detail status plus default reviewer threshold settings lifecycle and top `partial_info.scala.html` `#reviewers` participants/review/merge control placement with avatar images and legacy action labels, the PR detail overview/state slices close contributor avatar, footer action labels, and `partial_state.scala.html` safe/conflict/merged notices with merged receiver avatar identity anchors, the PR watcher surface slice closes legacy `getWatchers` detail count, viewer-state semantics, and `#watch-button` watch/unwatch action, the branch lifecycle slice closes legacy `deletefrombranch`/`restorefrombranch` app parity, the PR commit-changed slice closes source-branch push commit/event/webhook records, and the ranged inline slice closes side-aware single-line add/context/deleted plus same-file text-selection multi-line review comment create/edit/delete with legacy comment submit/edit/delete labels, legacy `CommentThreadApp.open/close` `POST /threads/:id/open&#124;close` direct route controls with `commentThread.open`/`commentThread.close` request buttons, legacy `partial_info.scala.html` overview/changes tabs with open review-thread badge, legacy `partial_pull_request_event.scala.html` conversation event list shell including sender avatar/tooltip anchors, merged commit links, and commit-change `ul.commit-list` rows, legacy `git/viewChanges.scala.html` outer shell anchors, legacy `common.reviewForm` hidden `#review-form.review-form` block-review shell, legacy specific change route/filter, selected commit `.commitInfo` / `.commitMsg.mt5` metadata, selected `#commits` outdated labels for `PRIOR` commits, current-changes inline filtering for outdated/commit-only threads, explicit PR changes `inlineThreads`/`nonRangedThreads`/`cardThreads` display buckets, changes-page general comment form placement under `board-comment-wrap` / `non-ranged-threads-wrap`, stable `partial_reviewlist.scala.html` `.outdated-label`, `.avatar-wrap.smaller.ml5 > img[alt]`, and `DiffRenderer.urlToCommentThread` changes-container link behavior, plus `.btn-show-reviewcards`, `.btn-hide-reviewcards`, `#reviewcards-open` / `#reviewcards-closed` review-card outdated markers. Legacy reviewer membership is review/unreview only; no separate assignment route is present in generated routes. Conflict resolution parity is the legacy `.howto-resolve-conflict` manual guide plus refresh action; no separate in-app conflict editor route/test is present in legacy evidence. External API compatibility stays explicit follow-up scope. |
| Search app scopes and result surface | `SearchApp.java`, `SearchTests.java`, `SearchResultTests.java`, `search/result.scala.html`, `search/partial_*.scala.html` | repo-root `/api/v1/search`, `/api/v1/projects/:owner/:project/search`, `/api/v1/organizations/:organization/search`, `crates/search`, `crates/persistence`, `crates/server`, `frontend/src/routes/**/search` | `parity` | `IA`, `deep-link`, `data shape`, `authorization` | Keep `search_contract`, `cargo test -p yoram-search`, search route parity tests, search query-key tests, and `frontend/tests/search-parity.e2e.ts` green. | `crates/search`, `crates/persistence`, `crates/server`, `frontend` | App-runtime search parity restores global/project/organization search over `/api/v1/**`, including required query validation, project-scope `project` type rejection, legacy auto type resolution order, fixed page size 20, type tabs/count badges, snippets/highlighting metadata, legacy `yobi.Pagination` `page-navigation-wrap`/`page-nums` controls, visible app route hrefs, and lightweight relevance ordering that prioritizes title hits and hit counts before preserving the previous legacy/date order for ties. User search rows now preserve `partial_users.scala.html`'s legacy `/<loginId>` profile href, avatar URL projection, `name (@loginId)` title, and member-since row through `crates/persistence/src/repo/search.rs`, `crates/server/src/routes/search.rs`, `crates/server/tests/search_contract.rs::user_search_matches_legacy_login_id_and_name_lookup`, and `frontend/tests/search-global.e2e.ts`. Legacy `SearchResultTests` Korean snippet window and overlap examples are borrowed directly into `crates/search` to pin snippet parity. DB-native FTS candidate retrieval stays inside each configured database's built-in search/query solution: SQLite FTS5 external-content tables, PostgreSQL GIN text-search indexes, and MySQL FULLTEXT indexes, with fallback to the literal scan path; Elastic/OpenSearch is out of scope. Legacy external search API compatibility is retired as not applicable because no legacy `/-_-api/v1/**` search route or `controllers.api.SearchApi` exists. |
| Search `issue_comment`, `posting_comment`, `milestone`, type counts | `SearchTests.java`, `SearchResultTests.java`, search partials | repo-root `/api/v1` search projections now include all legacy app result tabs: issue, user, project, post, milestone, issue*comment, post_comment, review | `parity` | `data shape`, `authorization` | Keep focused backend contract and Playwright coverage for all result type counts, snippets, anchors, and project/org/global scopes. | `crates/search`, `crates/persistence`, `crates/server`, `frontend` | The prior bounded-exemplar gap is closed for app runtime search. DB-native FTS candidate retrieval now covers supported SQLite/PostgreSQL/MySQL paths while preserving the existing literal scan as fallback. Async indexing and index-backed ranking beyond the lightweight scorer remain evidence-gated outside app-runtime parity. `/-*-api/v1/\*_`search compatibility is retired as not applicable because legacy has no external search endpoint.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Site admin core surface                                                                          |`SiteApp.java`, `site/userList.scala.html`, `site/projectList.scala.html`, `site/mail.scala.html`, `site/massMail.scala.html`, `site/update.scala.html`, `site/diagnostic.scala.html`, `site/data.scala.html`, `site/issueList.scala.html`, `site/postList.scala.html`, `UserApp.resetUserPasswordBySiteManager`| repo-root`/sites/userList`, `/sites/toggleSiteAdminRole/:loginId`, `/sites/toggleAccountLock`, `/sites/toggleGuestMode`, `POST /:user`, `/sites/user/delete:id`, `/sites/projectList`, `/sites/project/delete/:id`, `/sites/postList`, `/sites/issueList`, `/sites/mail`, `/sites/massmail`, `/sites/mailList`, `/sites/update`, `/sites/update/download`, `/sites/update/download-file`, `/sites/diagnostic`, `/sites/data`, `/sites/export`, `/sites/import`, `/api/v1/site/users`, `/api/v1/site/users/:loginId`, `/api/v1/site/users/:loginId/site-admin/toggle`, `/api/v1/site/users/:loginId/account-lock/toggle`, `/api/v1/site/users/:loginId/guest/toggle`, `/api/v1/site/users/:loginId/password/reset`, `/api/v1/site/projects`, `/api/v1/site/posts`, `/api/v1/site/issues`, `/api/v1/site/mail`, `/api/v1/site/mail/test`, `/api/v1/site/mail-list`, `/api/v1/site/update`, `/api/v1/site/update/download`, `/api/v1/site/update/download-file`, and `/api/v1/site/diagnostics`restore the user/project/posting/issue/mail/update/diagnostic/data UI/REST slice; unknown`/sites/:pageName`maps to a placeholder-free not-found shell because legacy has no catch-all route |`parity`               |`feature missing`, `admin surface`, `deep-link`                 | Keep`site_admin_contract`, `site-admin-user-list-parity.e2e.ts`, `site-admin-project-list-parity.e2e.ts`, `site-admin-post-list-parity.e2e.ts`, `site-admin-issue-list-parity.e2e.ts`, `site-admin-mail-parity.e2e.ts`, `site-admin-update-parity.e2e.ts`, `site-admin-diagnostic-parity.e2e.ts`, and route parity coverage for site-admin routes green; keep export/import coverage for user/project/post/issue body metadata, post/issue/comment attachment metadata/content payloads, and post/issue label/comment/body-history/milestone-title/existing attachment-id relationships. | `crates/server`, `crates/persistence`, `frontend`                                                                               | The admin slices restore site-admin-only user listing over legacy`ACTIVE`/`LOCKED`/`DELETED`/`GUEST`/`SITE_ADMIN`buckets, search across login/name/English name/email, fixed 30-item pagination with legacy`yobi.Pagination` `page-navigation-wrap`/`page-nums`controls, the legacy`/sites/userList`shell/sidebar/state tabs/list/modal classes with user avatar images,`site.userList.search`/`site.project.filter`placeholders, icon-only user/project search buttons, and always-present empty user/project/post/issue list wrappers without ad-hoc English empty messages, legacy user/project delete modal`data-dismiss="modal"`no-buttons and`×`close glyphs, direct legacy site-admin role/account-lock/guest toggle aliases with state/query redirects, direct legacy`POST /:user`site-manager password reset JSON, direct legacy user deletion with the only-manager guard plus legacy deleted-state cleanup, site-admin project list/search/direct delete alias with legacy project-logo images, read-only legacy`/sites/postList`project-logo and author-avatar images plus project/post/author/comment links with`yobicon-comments`counters, read-only legacy`/sites/issueList` `issue.state._`tabs plus project-logo and author-avatar images plus project/issue/author/comment links with`yobicon-comments`counters, legacy`/sites/mail` `title.sendMail`/`site.mail._`form labels, placeholders, not-configured`/admin/mailconf`argument, legacy missing-key labels`smtp.host`, `smtp.user`, `smtp.password`, and sent status copy while the React SPA submit path posts JSON to `/api/v1/site/mail`, `/sites/massmail` `title.massMail`/`site.massMail._`radio labels, project typeahead/add submit-button/write submit-button anchors plus mailto shell, direct legacy`/sites/mailList`form-urlencoded JSON-array recipient lookup, legacy`/sites/update` `site.sidebar.update`title plus shared update sidebar`notification-badge`/no-update current-version argument/update-available/error branches over configured update status and metadata URL/file discovery, visible `site.update.download`link to`/sites/update/download`and site-admin-gated`/sites/update/download`redirect to the resolved release URL, site-admin-gated`/sites/update/download-file`file/plain-HTTP/HTTPS binary attachment proxy with local`curl`default fetch and`YONA*UPDATE_HTTPS_FETCH_COMMAND`override, React`/sites/diagnostic`rendering of legacy`siteMngLayout`breadcrumb/sidebar key anchors and shared plain`row-fluid`content wrapper plus`site.sidebar.diagnostics`title,`site.diagnostic.errorNotFound`/`site.diagnostic.errorFound`status keys, and plain error-list rendering over`/api/v1/site/diagnostics`, legacy `/sites/data` `site.sidebar.data`title/warning/export/import shell with the unlabeled import submit input, site-admin-only`/sites/export` `application/x-download`JSON attachment named`yobi-data-*.json`with user/project/post/issue body metadata plus post/issue label/comment/body-history, issue milestone titles, post/issue/comment attachment metadata, and optional portable`contentBase64`payloads, and site-admin/CSRF-gated`/sites/import`restore for supported user/project/post/issue body metadata sections plus post/issue label/comment/body-history/milestone-title/existing attachment-id relationships and portable attachment files from JSON or multipart`data`uploads, including legacy multipart success redirect to`/`and missing-file redirect to`/sites/data`. Mutation controls preserve legacy `ybtn`and`data-request-\_`hooks while using buttons for the React accessibility gate; unmatched site pages no longer expose porting placeholders. |
| SVN executable WebDAV bridge, LDAP, import/export, migration tooling                             |`SvnApp`, `MigrationApp`, `ImportApp`, site data/export/import routes                                                                                                                                                                                                   | SVN storage lifecycle has executable-backed `svnadmin create`with PATH/common Windows VisualSVN executable discovery, and`/svn/$path`auth/status boundary plus WebDAV`OPTIONS`, `DAV: 1,2`/`MS-Author-Via: DAV`discovery headers, root/default VCC`PROPFIND`responses with executable-backed youngest or Label-selected revision, repository UUID, checked-in baseline resource, and baseline-collection metadata plus baseline resource`PROPFIND`when`svnlook`is available, executable-backed`GET`/`HEAD`file content and file`PROPFIND`content-length/content-type/etag/displayname/supportedlock/version/checked-in/baseline-relative-path metadata plus live/custom property value/name projection and supportedlock/lock discovery via`svnlook cat`/`youngest`/`proplist`/`propget`/`lock`for normal plus`!svn/rvr`/`!svn/bc`/`!svn/ver`revision resources via`svnlook cat`/`youngest`, request-aware collection tree and revision-pinned baseline collection child metadata plus child file content-type/etag/displayname/supportedlock/version/checked-in metadata via `svnlook tree`/`youngest`, `log-report`/`dated-rev-report`revision metadata via`svnlook log`/`author`/`date`, `get-locks-report`lock metadata via`svnlook lock`, `get-locations-report`/`get-location-segments-report`path metadata via`svnlook cat`/`tree`, depth/recursive-aware `update-report`checkout/update file fetch metadata and send-all txdelta diff payloads via`svnlook tree`/`cat`, `file-revs-report`file revision metadata plus txdelta content via`svnlook log`/`cat`, `mergeinfo-report`mergeinfo metadata via`svnlook propget`, `get-deleted-rev-report`deleted-path revision lookup via`svnlook`path existence,`list-report`directory entry metadata via`svnlook tree`/`cat`, `inherited-props-report`inherited regular property metadata via`svnlook proplist`/`propget`, `replay-report`revision editor metadata via`svnlook changed`, WebDAV `LOCK`/`UNLOCK`via`svnadmin lock`/`unlock`, and WebDAV `PUT`file updates,`DELETE`removals,`MKCOL`collection creation,`PROPPATCH`property set/remove, and`MKACTIVITY`/`CHECKOUT`/`MERGE`commit choreography via`svn checkout`/`commit`are mounted; P3-A closes the former broader PROPFIND edge list, bounded LDAP runtime slices are implemented, import/export hardening has site-admin evidence, and broader migration tooling is closed as tool-side/non-blocking scope by the 2026-06-23 deferred directive.                                                                              |`parity`|`evidence-gated external/tool scope`                                               | Keep the closed broader WebDAV PROPFIND edge cases covered by`svn_protocol_contract`; future external/tool work needs concrete legacy evidence and must not reopen app-runtime parity.                                       | `reference/mixed-code/packages/vcs`, `frontend`                                                                                  | SVN repository storage creation, route/auth boundary,`OPTIONS`capability response,`MS-Author-Via: DAV`, root/default VCC `PROPFIND`, executable-backed youngest or Label-selected revision, repository UUID, checked-in baseline resource, and baseline-collection metadata plus baseline resource `PROPFIND`via`svnlook`, read-only file content serving plus file content-length/content-type/etag/displayname/supportedlock/version/checked-in/baseline-relative-path metadata plus live/custom property value/name projection and supportedlock/lock discovery through `svnlook cat`/`youngest`/`proplist`/`propget`/`lock`for normal,`!svn/rvr`, `!svn/bc`, and `!svn/ver`revision resources through`svnlook cat`/`youngest`, collection tree and revision-pinned baseline collection metadata plus child file content-type/etag/displayname/supportedlock/version/checked-in metadata through `svnlook tree`/`youngest`, `log-report`/`dated-rev-report`revision metadata through`svnlook log`/`author`/`date`, `get-locks-report`lock metadata through`svnlook lock`, `get-locations-report`/`get-location-segments-report`path metadata through`svnlook cat`/`tree`, depth/recursive-aware `update-report`checkout/update file fetch metadata and send-all txdelta diff payloads through`svnlook tree`/`cat`, `file-revs-report`file revision metadata plus txdelta content through`svnlook log`/`cat`, `mergeinfo-report`mergeinfo metadata through`svnlook propget`, `get-deleted-rev-report`deleted-path revision lookup through`svnlook`path existence,`list-report`directory entry metadata through`svnlook tree`/`cat`, `inherited-props-report`inherited regular property metadata through`svnlook proplist`/`propget`, `replay-report`revision editor metadata through`svnlook changed`, WebDAV `LOCK`/`UNLOCK`through`svnadmin lock`/`unlock`, WebDAV `PUT`file updates,`DELETE`removals,`MKCOL`collection creation,`PROPPATCH`property set/remove,`MKACTIVITY`/`CHECKOUT`/`MERGE`commit choreography, and actual external-client`svn info`/recursive-svn-ls/`svn ls`/revision-pinned `svn cat -r`/`svn cat`/`svn log`/`svn blame`/`svn diff`/export/revision-pinned-checkout/checkout/commit/update/conflict-on-update/fresh-checkout property materialization/add/delete/mkdir/direct-url-mkdir/direct-url-delete/direct-url-import/direct-url-copy/direct-url-move/propset/propdel/direct-file-url-propget-proplist/lock/unlock/copy/move smoke coverage are no longer absent, legacy `SvnApp`broader PROPFIND edge completeness is closed, and broader migration/import tooling is documented as non-blocking external/tool scope.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Site admin no-avatar JSON/avatar repair                                                        |`SiteApp.noAvatarUsers`, `SiteApp.setAttachmentToUserAvatar`, legacy routes `/sites/noAvatarUsers`and`/sites/setAttachmentToUserAvatar`                                                                                                                             | repo-root`/sites/noAvatarUsers`, `/sites/setAttachmentToUserAvatar`, `/api/v1/site/no-avatar-users`, `/api/v1/site/users/avatar-from-attachment`, `crates/server/tests/site_admin_contract.rs`                                                                                 |`parity`               |`admin surface`, `data shape`, `state transition`               | Keep`site_admin_contract::site_admin_no_avatar_json_routes_follow_legacy_contract`green for active-user filtering,`{loginId,name,email}`payload shape, invalid JSON message, and image attachment promotion. |`crates/server`, `crates/persistence`                                                                                           | The legacy JSON repair flow is app-runtime parity, not a frontend screen. Rust now lists active non-anonymous users that do not have a`USER_AVATAR`attachment and moves an image attachment selected by`avatarFileId`/`email` into that user's avatar resource while deleting previous avatar rows for that user. |

Site admin route module diet note: REST site-admin route registration plus the user/project/post/issue/diagnostics/update/mail/export/import handler bodies and site-admin mapping helpers moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/site_admin.rs` on 2026-06-19. This is a route-module ownership build/check diet change; behavior remains covered by `site_admin_contract`.

Site admin DTO diet note: site-admin REST/direct query, body, response, export, and import DTOs moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/site_admin.rs` on 2026-06-19. The moved route handlers are module-private because route registration and direct legacy wrappers are now in the same module; the direct user-list redirect helper also lives in the same route module so account-lock/guest toggles preserve legacy `state`/`query` redirects at the owner boundary. The shared board-label REST DTO/mapper now lives in `crates/server/src/routes/utils.rs` and is reused by site-admin post/issue list rows. Behavior remains covered by `site_admin_contract` user-list/toggle, export, and mail recipient tests.

Issue label route module diet note: direct issue label/category/copy/CSS handler bodies for `/:owner/:project/issue/labels*`, `/:owner/:project/copyLabels`, and `/:owner/:project/issue/label/categories*` moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/issues.rs` on 2026-06-19, while shared label/category projection, form/color/CSS helpers moved into `crates/server/src/routes/utils.rs`. On 2026-06-20 the issue label REST adapters, legacy direct handlers, service delegates, and label/category request/response DTOs moved again from the large issue route file into `crates/server/src/routes/issues/labels.rs`; `routes/issues.rs` now keeps only registration and issue-wide orchestration for this surface. This is a route-module ownership build/check diet change; behavior remains covered by `issue_label_contract` and `rest_contract::rest_label_routes_manage_labels_and_categories`.

Issue label submit-boundary note: on 2026-06-25 the React-rendered `/:owner/:project/issue/labelsform` copy/create forms were aligned with the auth/workspace REST boundary. The page still preserves the legacy `project/issuelabels.scala.html` shell anchors (`#copyLabel`, `#frmNewLabel`, `.label-preset-colors`, and label/category list data URIs), but the copy/create forms no longer render direct `action` or form-level `method="post"` fallbacks; submit always uses the typed REST wrappers for `/api/v1/owners/:owner/projects/:project/labels` and `/labels/copy`. The legacy direct label routes remain server compatibility adapters and data URI evidence, not the React SPA submit path.

React form submit-boundary guard note: on 2026-06-25 `frontend/src/form-submit-boundary.spec.tsx` began scanning every route source file for form-level `method="post"`. No React route-level native POST forms are allowed; REST/API-owned auth, workspace, organization, project create/settings/member/webhook/fork/import, issue form/detail comments, issue label, board post/detail comments, PR review/comments, commit discussion comments, milestone, site-import, and site-mail forms are guarded against reintroducing native form submit fallbacks.

Project REST route module diet note: REST project/organization handler bodies, project webhook delivery helpers, repository cleanup helpers, legacy external post watcher handler, and legacy external milestone create handler/parser/result mapper moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/projects.rs` on 2026-06-19. Shared project/organization detail, logo URL, member summary, milestone summary, organization member/admin/enrollment, role option, and project date-label projection helpers now live in `crates/server/src/routes/utils.rs` so project routes, site-admin routes, notifications, and the root service implementation reuse the same projection boundary without root-owned mapper bodies. This is a route-module ownership build/check diet change; behavior remains covered by `rest_contract::rest_project_routes_cover_directory_views_and_mutations`, `rest_contract::rest_organization_routes_cover_directory_views_and_membership_mutations`, `milestone_contract`, and the focused org/project contract suites.

Project/organization container route-utils diet note: project/organization container builders, organization admin builder, project origin resolution, and organization visible-project filters moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/utils.rs` on 2026-06-19. Root service methods and board/issue/PR/project routes reuse the route-utils-owned builders and filters through the route re-export boundary; behavior remains covered by project/organization REST contracts plus organization issue, organization board, and PR read aggregate contracts.

Direct route helper diet note: direct project update guard, direct redirect/status helpers, milestone state/due-date parser, and attachment-id parser moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/utils.rs` on 2026-06-19. Project, issue, notification, workspace, site-admin, board, and PR routes reuse these shared direct-route helpers through the route re-export boundary; behavior remains covered by milestone legacy mutation, issue comment vote, issue label legacy route, and project REST contract tests.

Issue and milestone helper diet note: issue list filter mapping and visible user issue filtering moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/issues.rs`, while milestone list filter mapping and mutation input construction moved into `crates/server/src/routes/projects.rs` on 2026-06-19. Root service methods and users/issues routes reuse these route-owned helpers through the route re-export boundary; behavior remains covered by project issue list, user issue list, and milestone contract tests.

Issue query DTO diet note: user issue list and direct issue form query DTOs moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/issues.rs` on 2026-06-19. Users routes reuse those issue-owned query DTOs through the route module re-export boundary, while issue handlers keep field access local to their owning module; behavior remains covered by user issue list and direct issue form-options contract tests.

Project resource helper diet note: project resource-create authorization helpers and shared HTML escape helpers moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/utils.rs` on 2026-06-19. Board, issue, code, project, PR, notification, workspace, site-admin, and users routes reuse these helpers through the route re-export boundary; behavior remains covered by issue public-project permissions, board ACL, PR review mutation, code commit comment, and legacy notification fragment tests.

REST query parser diet note: REST string/number deserializers, integer query parsers, and the query component decoder moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/utils.rs` on 2026-06-19. Issue, board, PR, search, and root service paths reuse the route-utils-owned parser helpers through the route re-export boundary; behavior remains covered by project issue list, board posting, PR read aggregate, and scoped search route tests.

REST adapter diet note: REST error envelope types, shared JSON/current-session response adapters, legacy external hello, repository backend guard, actor lookup, project-code read guard, assignable-users query DTO, and project-delete response DTO moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/utils.rs` on 2026-06-19. Auth, debug, legacy runtime, issue/project/site-admin, PR, code, Smart HTTP, and SVN paths reuse the route-utils-owned adapter boundary through crate re-exports; behavior remains covered by auth session/error-envelope, REST unknown-route, legacy external hello, migration forbidden JSON, PR read, and code commit discussion tests.

Current-session projection diet note: current-session response projection helpers moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/utils.rs` on 2026-06-19. Auth, workspace overview, REST session, and root service paths reuse the route-utils-owned projection boundary; behavior remains covered by auth REST round-trip, session bootstrap, and workspace overview tests.

Session guard diet note: shared session lookup, CSRF validation, and session response-header attachment helpers moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/utils.rs` on 2026-06-19. Root service methods and route modules reuse the route-utils-owned session guard boundary; behavior remains covered by auth REST round-trip, bootstrapped CSRF mutation, and legacy issue comment vote route tests.

Identifier normalization diet note: shared `normalize_identifier` moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/utils.rs` on 2026-06-19. Auth, search, site-admin, notification mail, and route modules reuse the route-utils-owned normalization boundary through crate re-exports; behavior remains covered by auth REST round-trip, scoped search, and site-admin user-list/toggle tests.

Project scope mapper diet note: shared `map_project_scope` moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/utils.rs` on 2026-06-19. Root service methods, project/site-admin/legacy runtime routes, and Smart HTTP reuse the route-utils-owned mapper through crate re-exports; the workspace-local duplicate remains until the workspace partial-parity gate can accept that helper-only change. Behavior remains covered by project REST directory/mutation, workspace overview/settings/recent-projects, and Smart HTTP member-write authorization tests.

URI component encoder diet note: shared `percent_encode_uri_component` moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/utils.rs` on 2026-06-19. Auth redirects, site-admin user-list redirects, notification mail reply/unwatch URLs, and anonymous-login redirects reuse the route-utils-owned encoder through crate re-exports; behavior remains covered by auth provider redirect, site-admin user-list/toggle, and notification mail delivery tests.

Absolute app URL diet note: shared `absolute_app_url` moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/utils.rs` on 2026-06-19. Auth/password/email/project-transfer mails, project/issue route links, notification mail links, and Smart HTTP webhook payloads reuse the route-utils-owned absolute URL builder through crate re-exports; behavior remains covered by project transfer mail, notification mail delivery, and Smart HTTP post-receive side-effect tests.

Default public-origin diet note: shared `default_public_origin` moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/utils.rs` on 2026-06-19. Router bootstrap and notification mail delivery reuse the route-utils-owned public-origin normalization through crate re-exports; behavior remains covered by session bootstrap and notification mail delivery tests.

SMTP/env helper diet note: shared `configured_env_value`, `default_smtp_from`, and private SMTP sender fallback helpers moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/utils.rs` on 2026-06-19. Root runtime config, site-admin mail, notification mail, and auth/project-transfer outbound mail reuse the route-utils-owned env lookup and SMTP sender defaults through crate re-exports; behavior remains covered by site-admin SMTP sender derivation, application-host fallback, and notification mail delivery tests.

Auth session payload diet note: `/api/auth/session` bootstrap response DTOs and payload builder moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/auth.rs` on 2026-06-19. The auth route now owns the bootstrap JSON shape locally while reusing the shared current-session projection helper; behavior remains covered by session bootstrap and auth REST round-trip tests.

Project REST dependency diet note: `crates/server/src/routes/projects.rs` no longer imports the root crate wildcard after the handler-body move. The module now relies on explicit root imports for the remaining compatibility DTOs and route bridges, preserving the same project/organization REST surfaces while reducing hidden route-module dependencies.

Project REST DTO diet note: project/organization REST body DTOs, project dashboard/history/member/webhook/transfer/fork response DTOs, and project-member/settings response builders moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/projects.rs` on 2026-06-19. Shared cross-route types such as project delete responses and resource-create ACL remain root-owned until their remaining call sites are split.

## Phase 4E Review Comment Attachment Note

PR review comment attachment readback now follows the legacy `partial_comment_thread.scala.html` and `code/partial_nonrange_codecomment_thread.scala.html` behavior: ranged and non-ranged review comment shells render `.attachments[data-attachments]` from `AttachmentApp.getFileList(comment.asResource().getType().toString(), comment.id.toString())`, using the legacy `REVIEW_COMMENT` container metadata in the REST comment payload.

## Issue Form Shell Note

Issue create/edit form shell parity now preserves the legacy `issue/create.scala.html` and `issue/edit.scala.html` wrappers and form anchors (`#issue-form`, `#title`, `.subtask-message`, `.subtask-wrap`, `content-body`, `#assignee`, `#milestoneOption`, `#milestoneId`, `#issueDueDate`, `#labelIds`, `#notificationMail`, save/draft/cancel controls). The current REST mutation path now carries selected assignee, label IDs, milestone ID, due date, legacy `parentIssueId` subtask parent selection, and draft save/publish flags from that shell. Issue due-date create/update/clear plus invalid-date validation, subtask parent create/update/clear plus parent-option selection, issue-detail child rows/progress projection with legacy `partial_view_childIssueList` / `partial_view_child` anchors, draft save/update/publish basics with author-only draft detail access, and the legacy first-page `partial_list_draft` draft block are covered by `rest_contract` / frontend parity specs.

- 2026-07-10 issue create target/options continuation: legacy evidence is `issue/create.scala.html`, `issue/partial_select_subtask.scala.html`, `IssueApp.newIssue`, `ProjectApp.mentionList`, `ProjectApi.titleHeads`, `User.getIssueMovableProject`, `Project.getIssueTemplate`, and `yobi.Mention.js` plus At.js. Canonical `GET /api/v1/projects/:owner/:project/issues/form-options` returns the raw `HEAD:ISSUE_TEMPLATE.md` text with BOM/valid-UTF-8 handling and detector-based legacy charset decoding, current project, and the actor's favorite/recent/member candidates with ID deduplication, no candidate ACL filtering, case-insensitive owner/name ordering, base-path-aware logos, separate legacy assignee/milestone create capabilities, and manager-only label-management capability. Git and SVN template reads run in `spawn_blocking`, drain stdout/stderr concurrently, enforce a five-second child timeout and 2 MiB output cap, preserve the 1.2 MiB contract, and map unavailable/oversized templates to the legacy empty-template result. Canonical and direct mention lookups apply the final At.js Unicode-lowercase contains matcher before the visible limit, reserve blank-query positions 8/9 for matching project/group targets (or position 9 for a project without a group), use a database-filtered latest-30 public search with case-insensitive active-state handling and deterministic paged non-ASCII fallback, preserve exact case-sensitive `admin` suppression, and bulk hydrate users and avatar inputs. Project READ-gated `GET /api/v1/owners/:owner/projects/:project/mention-users?context=issue-body` supplies typed user/project/organization `@` targets, while `/issue-references` returns the legacy created-date-descending latest-20 `#` candidate set before At.js client ranking; `GET /api/v1/owners/:owner/projects/:project/title-heads` reuses the legacy title-head/label mapping. Canonical issue create accepts `targetProjectId` while retaining source CSRF/create authorization, requires target IssuePost create authorization at submission, preserves same-project labels, and omits source labels for cross-project creation. Drafts do not resolve stale `referCommentId`; published target issue and derived source comment writes commit in one database transaction, then dispatch target `NEW_ISSUE` followed by source `NEW_COMMENT` with the localized derived markdown and comment fragment. Rollback dispatches neither webhook, and derived links keep the configured application base path. This slice changes no database schema. Focused coverage is `rest_contract::rest_issue_create_supports_legacy_target_project_semantics`, `rest_contract::rest_issue_form_options_and_title_heads_preserve_scoped_legacy_contract`, `issue_reference_autocomplete_contract::issue_reference_autocomplete_contract_searches_and_orders_project_issues`, and the `yoram-vcs` bounded process tests.

## Issue List Shell Note

Project issue list shell parity now preserves the legacy `issue/list.scala.html`, `issue/partial_list_wrap.scala.html`, `issue/partial_searchform.scala.html`, and `issue/partial_list.scala.html` wrapper/search/tab/filter/list/pagination anchors on the React route. REST list payloads now expose issue database IDs, author login IDs, assignee avatar URLs, due-date labels/overdue state, weight values, parent issue summaries, and child issue rows for project/user/organization issue lists, and project/user rows render the legacy issue ID anchors, author-login row search values, assignee avatar, due-date, weight, parent issue, progress, and child issue anchors.

## Project Review Thread Deep-Link Note

Project review-list rows now follow legacy `DiffRenderer.urlToCommentThread` for both PR review threads and non-PR code comment threads: PR rows link to `pullRequest/:number/changes...#thread-*`, while commit discussion rows link to `commit/:commitId#thread-*`.

## Project Configuration Note

- Project creation now persists `YONA_PROJECT_DEFAULT_MENUS` (`project.creation.default.menus`) into the new `project_menu_setting` row, renders the legacy `project/create.scala.html` shell and create-form field anchors including `#project-owner` select2 user/group owner options, `.project-scopes`, `#public`, `#protected`, `#private`, `#vcs`, and `#svn`, mirrors `yobi.project.New` owner protected-scope, Subversion warning/Pull Request visibility, and Code/Pull Request/Review menu checkbox dependency behavior, and submits the React SPA form through the `/api/v1` create-project mutation without a direct `POST /projects` form fallback. `/api/v1/projects/form-options` supplies the current user plus creatable organization owners and preserves `?owner=` preselection, `/projects/new?owner=` keeps that owner when redirecting to `/projectform`, the import CTA carries the selected owner as `/_import?owner=<selected>`, and `/_import` now preserves the legacy `project/importing.scala.html` Git import form shell while the React SPA primary submit path calls `POST /api/v1/projects/import` as REST JSON, performs the same session/CSRF/create-permission validation, native `git clone --bare` into `YONA_DATA/repo/<project_id>.git`, menu-setting persistence, redirect-path projection, and `yobi.project.New` repo-auth toggle/input disabling, owner protected-scope, and Code/Pull Request/Review menu checkbox dependency behavior; direct `POST /_import` remains only as the legacy no-JS/deep-link fallback adapter. `/:owner/:project/settingform` now preserves the legacy `project/setting.scala.html` shell around `#saveSetting`, `.bubble-wrap.gray`, `.box-wrap.top.clearfix.frm-wrap`, `.setting-box`, project scope/code-access radios, reviewer count panel, menu checkbox layout, and `#save`. Direct SVN project creation validates `svnadmin`, provisions executable-backed `<project_id>.svn` storage, and stores `vcs = Subversion`.

## Auth, Route, And Mail Notes

- Direct auth form route parity now includes legacy `POST /users/login` and `POST /users/signup`; both accept no-JS form submissions with hidden `csrfToken`, reuse the app-runtime auth services, attach updated session headers, and keep login `redirectUrl` constrained to safe local paths.
- 2026-07-10 bounded default-landing migration note: legacy `UserApp.login()` sends a successful login with no `redirectUrl` to `Application.index()`, and `Application.index()` redirects only when the authenticated user's `UserSetting.loginDefaultPage` is nonblank; `UserSetting.findByUser()` otherwise supplies a new setting with a null default. The no-preference landing is therefore `/`, not the Rust-only `/me` shortcut, while an explicitly stored safe `/me` remains supported. Legacy `common/mySeriesMenuTab.scala.html` submits `requestHeader.path.substring(1)` and `UserApp.setDefaultLoginPage()` stores the raw `path` query value, so migrated databases can contain relative values. The Rust domain boundary now normalizes the recognized workspace values `notifications`, `user/issues`, and `user/files` to `/notifications`, `/user/issues`, and `/user/files` for session/workspace projection and direct login, signup, and OAuth landing resolution. A safe explicit redirect still wins over the saved default; absent or rejected values fall back to `/`. Absolute or scheme-relative URLs, pathname backslashes, control characters, dot traversal, and auth-loop destinations are rejected instead of reproducing the legacy controller's unrestricted raw-string redirect. Final direct-auth redirect `Location` values are prefixed with the configured Rust `base_path` (for example `/yona/notifications`), matching the optional legacy `application.context` mount documented in `conf/application.conf.default`, while REST session/workspace payloads retain app-relative paths. `ReadCurrentSessionResponse` also adds camelCase `isGuest` from the existing `n4user.is_guest` value (`false` for anonymous sessions), preserving the legacy `User.isGuest` and `application.guest.user.login.id.prefix` state without replacing schema columns. Legacy evidence: `yona-original/app/views/common/mySeriesMenuTab.scala.html`, `yona-original/app/controllers/Application.java`, `yona-original/app/controllers/UserApp.java`, `yona-original/app/models/UserSetting.java`, `yona-original/app/models/User.java`, and `yona-original/conf/application.conf.default`. Focused passing coverage: domain tests `legacy_relative_default_landing_paths_normalize_without_unsafe_fallbacks` and `post_auth_redirect_prefers_query_then_saved_default_then_root`; server tests `direct_legacy_login_and_signup_form_routes_accept_legacy_form_csrf_redirect_and_authenticate`, `legacy_oauth_callback_links_existing_local_user_by_email`, `direct_legacy_reset_visited_and_default_login_page_routes_match_workspace_state`, `register_marks_matching_guest_prefix_accounts_as_legacy_guests`, `read_current_session_works_over_connect_json`, and `workspace_settings_mutations_round_trip_through_workspace_overview`. Remaining gap: parity is claimed only for these recognized destinations and safe local redirect forms; arbitrary historical `loginDefaultPage` strings accepted by the legacy raw setter remain intentionally rejected or reduced to `/` until a concrete legacy route is evidenced and added to the allowlist, and this backend contract note does not close separate frontend visual parity work.
- React auth form submit parity uses REST JSON as the primary SPA boundary: `/users/loginform` and the common `#loginDialog` submit to `/api/v1/auth/sign-in`, `/users/signupform` submits to `/api/v1/auth/register`, `/lostPassword` submits to `/api/v1/auth/password-reset/request`, `/resetPassword` submits to `/api/v1/auth/password-reset/complete`, and the legacy direct `POST /users/login` / `POST /users/signup` / `POST /lostPassword` / `POST /resetPassword` routes remain no-JS/deep-link fallback adapters with the same redirect/session states.
- Direct auth route parity now includes legacy `GET /users/logout` plus OAuth wrapper `GET /logout`, both clearing the Rust session without CSRF and returning a Referer redirect with a fresh anonymous session cookie.
- Direct social-login route parity now includes legacy `GET /authenticate/:provider` as an auth-public entrypoint even when `YONA_ALLOW_ANONYMOUS_ACCESS=false`; unsupported/denied providers redirect to the legacy login warning states, configured GitHub/Google providers complete start/callback/token/userinfo/link/session flows, and `/logout` preserves local PlayAuthenticate/session cleanup without provider-specific external logout.
- Direct signup Ajax validator parity now includes legacy `GET /user/isUsed` and `GET /user/isEmailExist`; `isUsed` reports login ID, organization-name, and reserved route-word collisions with the legacy `isExist`/`isReserved` JSON shape.
- Workspace email settings keep the legacy `/user/email/sendValidationEmail/:id` `data-request-uri` hook while the React SPA click path now calls the canonical `/api/v1/workspace/emails/:id/validation` REST mutation and syncs the workspace overview payload.
- Workspace avatar settings keep the legacy `#frmAvatar` shell for `user/edit.scala.html` parity, but its submit is suppressed so avatar changes stay on the React file-input/crop/upload REST path instead of falling back to the direct profile form route.
- Guest access parity now carries `n4user.is_guest` into project authorization and preserves legacy `AccessControl` public-project READ semantics: nonmember guest users are denied public project reads, while project membership still grants access. Legacy `WatchApp`, `WatchProjectApp`, and `VoteApp` mutation routes require READ, so guest nonmembers are rejected from public project watch and non-authored resource watch/vote/comment vote mutations, while issue author/assignee resource-READ exceptions still pass. The public-project `isProjectResourceCreatable` exception is covered for authenticated guest issue, board post, board comment (`NONISSUE_COMMENT`), issue comment, fork, commit comment, and PR review comment creation, legacy `OrganizationApp.newOrganization` `@GuestProhibit` is preserved for organization creation, legacy `OrganizationApp.validateForAddMember` direct guest-member rejection is preserved while enrollment accept remains the guest join path, legacy `ProjectApp.projects` / `OrganizationApp.orgList` directory-list `@GuestProhibit` is preserved for `is_guest` users while anonymous listing remains available and the React `/projects`/`/orgs` routes render the forbidden shell on the resulting API 403, legacy `PullRequestApp.validateBeforePullRequest` project guest/nonmember PR form/preflight/create rejection is preserved, and issue author/assignee update precedence is preserved even when a guest nonmember cannot read the project itself.
- Site-admin mail options and outbound SMTP delivery now accept `YONA_SMTP_HOST`, `YONA_SMTP_PORT`, `YONA_SMTP_SSL`, `YONA_SMTP_USER`, and `YONA_SMTP_PASSWORD` as aliases for the existing `SMTP_*` names. `YONA_SMTP_SSL=true` selects the legacy `smtp.ssl=true` SMTPS wrapper transport, explicit false selects plain SMTP, and unset preserves the prior secure relay default; notification mail now has the legacy HTML shell/view-link/resource-unwatch/settings-footer body, and executable-backed mailbox polling can feed NUL-separated raw RFC822 messages through the existing mailbox bridge.
- Notification route parity now includes both the legacy `/notification` inbox shell and `/notifications` full-page alias on the same Rust/React TanStack Query view, with legacy `partial_notifications.scala.html` icon classes and empty state (`div.warning-none`, `yobicon-danger`, `notification.none`), `NotificationEvent.getMessage` direct payload messages for issue/post/comment create/update rows, single/mass-update issue close/reopen `ISSUE_STATE_CHANGED` receiver fan-out, startup-scheduled due-row outbound mail fan-out coverage with allowed sending-domain filtering, BCC hide-address mode, recipientLimit partitioning, preferred-language receiver grouping, legacy `NotificationMail.handleLinks` external-link `noreferrer` handling, `notificationMail.scala.html` body shell/view-link/resource-unwatch/settings-footer structure, PR state/review/thread message-key projection, and executable-backed mailbox polling.
- 2026-06-26 full UI parity follow-up: `/notifications` preserves legacy append-next-chunk semantics from `index/notifications.scala.html` and `partial_notifications.scala.html` without reintroducing server-rendered fragments as the React data source. The initial React query reads `from=0&size=20`, `#notification-more` prevents anchor navigation, the click handler calls the REST notification API with `from=items.length&size=20`, appends the returned rows, and updates `hasMore`. Focused evidence: `frontend/src/routes/notification/route.tsx`, `frontend/src/route-parity.spec.tsx`, and `docs/provenance/ui-parity-reports/ui-parity-search-notification.md`.
- Issue mass-update label parity now preserves legacy `IssueApp.massUpdate` / `NotificationEvent.afterIssueLabelChanged` by recording non-mergeable `ISSUE_LABEL_CHANGED` timeline rows for actual attach/detach changes, covered by `issue_core_contract::issue_core_contract_enqueues_legacy_mass_update_state_assignee_milestone_webhooks`.
- Issue mass-update due-date parity now preserves legacy `IssueMassUpdate.isDueDateChanged` by applying `dueDate` YYYY-MM-DD bulk changes across selected issues, covered by `issue_core_contract::issue_core_contract_mass_update_updates_due_dates`.
- Issue mass-update delete parity now preserves legacy `IssueMassUpdate.delete` by deleting selected non-draft issues and sending `RESOURCE_DELETED` webhook fan-out for each deleted issue, covered by `issue_core_contract::issue_core_contract_mass_update_deletes_selected_issues`.
- 2026-06-19 build/check diet note: notification REST query/response DTOs and `/api/v1/notifications` list handler ownership moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/notifications.rs`, preserving the JSON list and legacy `/notification` partial route coverage in `notification_contract`.
- 2026-06-19 build/check diet note: board REST query/response DTOs, board post/comment request DTOs, posting list/detail mapper helpers, board-local posting mutation adapters, direct posting-comment form adapters, and legacy external board import/content/comment/label handlers moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/boards.rs`. Behavior remains covered by board, organization-board, legacy external board, and README online-commit contract tests.
- 2026-06-25 REST-primary note: board tasklist checkbox updates moved from the legacy external `/-_-api/v1/owners/:owner/projects/:project/posts/:number/content` caller to canonical `PATCH /api/v1/projects/:owner/:project/posts/:number/content`; the legacy external route remains as a compatibility fallback and shares the same authorization/conflict behavior. Coverage: `frontend/src/api-query.spec.ts` and `board_contract`.
- 2026-06-26 README postform query parity note: legacy `/:owner/:project/postform?readme=true` preloads `README.md`, sets the form title to `Update README.md`, and checks the `#readme` control before submitting through the board create shell. Rust now carries `readme=true` through `/api/v1/projects/:owner/:project/posts/form-options`, returns the `readme` marker plus `onlineCommit.title` and `preparedBodyMarkdown`, initializes the React board form from that payload, and keeps README posting/commit behavior covered by `board_contract::board_readme_posting_commits_git_readme_file` plus `frontend/tests/board-posting-parity.e2e.ts`.
- 2026-06-19 build/check diet note: PR REST query/response DTOs, pull-request list/detail/changes mappers, review-thread list mappers, direct accept/source-branch/review-thread handlers, and the shared commit-discussion review-thread response projection moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/pull_requests.rs`; `RestReviewThread` remains crate-visible through the route module for code discussion responses and review Excel export keeps the crate-visible query parser boundary. Behavior remains covered by PR read/mutation and code-browser commit-discussion contract tests.
- 2026-06-19 build/check diet note: auth REST request DTOs and sign-in/register/sign-out/verify/capability handlers moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/auth.rs`, preserving the REST auth session/error-envelope surface covered by `auth_workspace_contract`.
- 2026-06-19 build/check diet note: user statistics REST response DTO, handler, and mapper moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/users.rs`, preserving authenticated REST and legacy external statistics parity covered by `rest_contract`.
- 2026-06-19 build/check diet note: issue meta REST body/query DTOs and participation, assignment, sharing, favorite, and comment-vote wrapper handlers moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/issues.rs`, preserving the issue meta JSON surface covered by `rest_contract`. On 2026-06-20 the participation/favorite/sharer/assignment/comment-vote REST wrappers, proto delegate helpers, refresh adapter, and assignee/sharer body DTOs moved again into `crates/server/src/routes/issues/meta.rs`; parent `routes/issues.rs` keeps route registration only for this meta surface.
- 2026-06-19 build/check diet note: issue label/category and project milestone REST body/query DTOs plus wrapper handlers moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/issues.rs`, preserving label/category and milestone JSON surfaces covered by `issue_label_contract` and `milestone_contract`.
- 2026-06-19 build/check diet note: issue assignable autocomplete response/item DTOs plus mention and issue-reference autocomplete query/response DTOs moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/issues.rs`, while the shared assignable-users query remains root-owned because the legacy project assignable-users alias in `routes/projects.rs` reuses it. This preserves the same autocomplete JSON surfaces covered by issue assignable, mention, and issue-reference contract tests.
- 2026-06-19 build/check diet note: direct issue form-options response DTOs and issue parent-options query/response DTOs moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/issues.rs`, while the direct issue form query remains root-owned because `routes/users.rs` mounts the shared issue form-options handler. This preserves direct issue-from-comment and parent issue selection JSON surfaces covered by issue core and REST contract tests.
- 2026-06-19 build/check diet note: issue mass-update REST body DTO moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/issues.rs`, preserving mass state/assignee/milestone/label updates and notification fan-out covered by issue core and notification contract tests.
- 2026-06-19 build/check diet note: issue comment REST body DTO plus direct legacy issue comment form adapters and create/update/delete/vote handlers moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/issues.rs`, preserving form CSRF redirects, attachment id parsing, comment mutation/delete, vote/unvote redirect, and direct-route authorization behavior covered by issue core and issue comment vote contract tests. On 2026-06-20 the REST/direct issue comment mutation handlers, direct form adapters, vote handler, and derived-comment Markdown helpers moved again into `crates/server/src/routes/issues/comments.rs`, keeping route registration in the parent issue module while isolating the comment mutation surface.
- 2026-06-19 build/check diet note: project/organization issue list query DTOs, issue mutation/state body DTOs, issue mutation/list filter mappers, and shared project/organization issue-list proto projection helpers moved from monolithic `crates/server/src/lib.rs` into route modules; the Excel export path still reuses the route-owned project issue query/filter boundary for legacy `format=xls`. This preserves project/organization issue list parsing, issue create/update/state payload parsing, issue-list proto projection, and Excel-compatible query reuse covered by issue core, REST issue-list, and organization issue aggregate contract tests.
- 2026-06-19 build/check diet note: issue attachment/comment/timeline/milestone/detail/list REST projection helpers and issue detail/list response DTOs moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/issues.rs`; root service methods and PR review projection now reuse those issue-owned helpers through the route re-export boundary. This preserves issue detail, milestone, project issue list, user issue list, and organization issue list response shapes covered by issue core, milestone, REST issue-list, user issue favorite, and organization issue contract tests.
- 2026-06-19 build/check diet note: project overview REST body DTO plus REST/direct overview update handlers moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/projects.rs`, preserving refreshed project-container and direct overview JSON surfaces covered by `org_project_contract`.
- 2026-06-19 build/check diet note: direct project milestone form adapters and create/update/delete/open/close handlers moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/projects.rs`, preserving direct milestone form parsing, duplicate-title rejection, state redirects, delete redirects, and project update authorization covered by milestone and project route contract tests.
- 2026-06-19 build/check diet note: direct project watch/unwatch, pushed-branch delete, project-transfer accept, and project markdown preview handlers plus markdown preview DTOs moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/projects.rs`, preserving direct watch aliases, branch cleanup, transfer confirmation redirects/errors, and markdown preview JSON passthrough covered by project, PR read, transfer, and markdown contract tests.
- 2026-06-19 build/check diet note: notification mail scheduler config, due-mail delivery, legacy HTML post-processing, resource unwatch footer, reply-to plus addressing, and delivery batching helpers moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/notification_mail.rs`, preserving the crate-root public API used by startup and `notification_contract`; shared public-origin, absolute URL, URI component, env lookup, and SMTP sender helpers now live behind the route-utils re-export boundary.
- 2026-06-19 build/check diet note: app/runtime configuration parser helpers for site name, auth UI flags, project default scope/menus, supported languages, boolean env aliases, and max upload size moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/utils.rs`, preserving existing `AppRuntimeConfig` and route bootstrap behavior through the route-utils re-export boundary.
- 2026-06-19 build/check diet note: signup verification, password reset, workspace email validation, project transfer request mail, route storage-token, site-admin password, and site-export timestamp helpers moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/utils.rs`, preserving auth/workspace/project/files/site-admin route behavior through the route-utils re-export boundary.
- 2026-06-19 build/check diet note: shared auth capability, confirmation-session, error adapter, authenticated-user lookup, project read/update authorization, and project read guard helpers moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/utils.rs`, preserving auth, Smart HTTP, project ACL, issue mutation, and route-module permission behavior through crate re-exports.
- 2026-06-19 build/check diet note: project milestone open/close state mutation body moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/projects.rs`, preserving proto and REST milestone state behavior through the project route-owned helper boundary.
- 2026-06-19 build/check diet note: issue participation and issue-comment vote mutation bodies moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/issues.rs`, preserving proto and REST issue meta participation/comment-vote behavior through issue route-owned helpers. On 2026-06-20 those helpers moved into `crates/server/src/routes/issues/meta.rs` with the rest of the issue meta mutation surface.
- 2026-06-19 build/check diet note: `crates/migration` now depends on `crates/persistence-entities` instead of the `yoram-persistence` facade for generated entity schema imports, removing repository implementation code from the migration crate's normal dependency graph while preserving runtime schema coverage.
- Issue, board, code discussion, and PR review comment projections now expose inbound-mail provenance from legacy `original_email` rows as `viaEmail` on issue detail/timeline, board post detail, commit discussion, PR detail/changes, and project review-list responses and render the legacy `data-via-email` body marker. Issue comment create/update/delete response normalization now reuses the already authorized issue access context so direct sharers keep legacy comment-write parity on private issues, issue sharer search preserves the legacy 10-result user/project split cap, and issue sharer mutation rejects unsupported group/org target types instead of treating them as user login IDs without legacy controller evidence.
- Issue detail projection now exposes the issue author's avatar URL and the React detail route renders the legacy `.author-info`, `.usf-group`, `.avatar-wrap.smaller`, `.name`, and `.loginid` anchors from `issue/view.scala.html`.
- Issue detail projection now also exposes the assigned user's avatar URL and renders the corresponding legacy assigned-user `.usf-group`, `.avatar-wrap.smaller`, `.name`, and `.loginid` anchors when an issue has an assignee.
- Attachment binding now preserves legacy container names for issue, issue comment, board post/comment, milestone, PR body, review comment, project-logo, and organization-logo resources; issue body/comment, board post/comment, milestone, and PR edit sync removes omitted legacy attachment rows while keeping replacement uploads actor-owned, project/organization settings return promoted logos through detail/container/public-directory `logoUrl`, and `/files` list/read now applies project READ ACL for project-backed attachment containers so public issue attachments are readable while private issue, board post, milestone, pull-request, and review-comment attachments are hidden from nonmembers.
- 2026-06-19 build/check diet note: `/files` upload/list/read/delete handler bodies plus upload MIME sniffing, storage path, attachment query, and legacy content-disposition helpers moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/files.rs`; behavior remains covered by assets contract upload/download/delete tests and site-admin import/export helper reuse remains crate-private.
- 2026-06-26 build/check diet note: the Rust workspace release profile now uses thin LTO, single codegen unit, symbol stripping, and abort-on-panic for smaller operator-facing release artifacts, while the touched Rust route/test files were normalized by rustfmt import ordering and line wrapping only. This does not change legacy-visible route behavior; the staged files remain covered by the existing runtime, DB matrix, asset, code/VCS, SVN, auth/workspace, issue, notification, project, and config contract tests.
- Markdown task-list progress now counts both unordered and ordered GFM task-list items while preserving the React-side disabled checkbox rendering path.
- Markdown smart-list rendering now preserves legacy marked nested child lists instead of flattening indented list items into top-level siblings.
- Markdown repeated heading ids now follow the legacy marked slugger de-duplication behavior, and fenced code blocks reuse the code-browser `syntax-token` span highlighter in React with common legacy language aliases while keeping server Markdown rendering disabled.
- Markdown editor shell parity now embeds the legacy `common.editor` structure (`data-toggle="markdown-editor"`, edit/preview tabs, checklist and clear-temporary controls, `help.markdown`, preview pane, notification receiver) inside current issue/board/milestone/PR body editor surfaces while keeping Markdown rendering on the React side.
- Comment edit shell parity now restores legacy `common.commentUpdateForm` editor structure for issue, board, and Git commit discussion comment edit forms, including row-local hidden `#comment-editform-*`, `update-comment-body`, upload-drop, update-button, temporary-upload, preview, and upload-resource anchors while retaining React-side Markdown rendering. PR review comments intentionally stay on the legacy thread partial surface, which has delete/reply controls but no edit shell.
- Git commit discussion editor shell parity now follows `code/diff.scala.html`, `common/commentForm.scala.html`, `common/reviewForm.scala.html`, and `common/commentUpdateForm.scala.html`: non-ranged commit comment forms use `comment-body`, inline/thread review comment forms use `code-review-body`, and commit comment edit forms use `update-comment-body` legacy `common.editor` wrappers while retaining the REST JSON submit path.
- Git commit discussion comment creation forms keep the same REST JSON primary path while preserving direct legacy form fallbacks: non-ranged, inline, and thread reply submits do not call `preventDefault()` unless the React mutation callback exists, and their form actions target the restored `POST /:owner/:project/commit/:commitId/comments` direct route.
- Markdown smart-list rendering now keeps marked-style indented continuation lines inside the owning list item instead of falling back to a plain paragraph.
- Markdown blockquote rendering now recognizes nested fenced-code blocks before inline code-span normalization, preserving marked-style block structure and React-side syntax tokens.
- Markdown smart-list rendering now also keeps blank-line-separated indented continuations inside the active list item instead of splitting them into a following paragraph.
- Markdown loose-list rendering now wraps list item text in paragraph tags when a blank-line-separated continuation makes the list loose, matching the marked-style structure on the React path.
- Markdown loose task-list rendering now keeps the checkbox inside the first loose-list paragraph instead of before the paragraph wrapper.
- Markdown nested loose-list rendering now propagates looseness to ancestor lists so parent task items also use paragraph-wrapped checkbox placement when a child item is loose.
- Markdown blockquote rendering now keeps loose-list continuations inside the quoted list instead of splitting them into separate paragraph and list blocks.
- Markdown Haskell fenced-code highlighting now preserves legacy Highlight.js inline and multiline `{- ... -}` block comments as opaque comment spans while leaving pragma/meta lines and normal module keywords on the existing Haskell tokenizer path.
- Markdown blockquote rendering now keeps marked-style lazy continuation lines inside the quote instead of escaping the leading `>` paragraph.
- Markdown blockquote rendering now also keeps marked-style lazy list-item continuations inside quoted lists instead of splitting them into separate quoted paragraphs.
- Markdown bare URL/email autolinks now follow legacy marked GFM's case-insensitive scheme and extended email rules, so `HTTP://`, `FTP://`, and bare email domains with underscores render as links on the React path.
- Markdown fenced-code highlighting now recognizes legacy Highlight.js XML/HTML aliases from `highlight.pack.js` and marks tag names plus attributes/strings on the React path.
- The integrations mailbox helper now mirrors legacy `EmailAddressWithDetailTest` plus-address parsing (`user+detail@domain`), detail-insensitive comparison, legacy IMAP-recipient detail routing from `EmailHandler.getMailAddressesToYobi`, legacy `IMAPMessageUtil.getIdLeftFromMessageId` Message-ID left-part parsing, `EmailHandler.parseMessageIds` header Message-ID token parsing/thread collection, raw RFC822 header unfolding/address extraction, multipart MIME boundary parsing, quoted-printable and base64 transfer-body decoding, `CreationViaEmail.extractContent` MIME content selection for text, alternative, related, root-part, and joined multipart cases, and parsed-message normalization from subject/from/recipients/thread headers/MIME content into the repository orchestration DTO; the server bridge now feeds parsed and raw mailbox messages through the DB-backed mailbox orchestration path. Repository sender lookup now mirrors legacy `IMAPMessageUtil.extractSender` / `User.findByEmail` From-address order with primary and valid workspace email matching, READ-filtered project target lookup mirrors legacy `EmailHandler.getProjects`, normalized mailbox-message orchestration wires sender/project/reply-target/action/execution, duplicate inbound Message-ID processing now short-circuits before resource creation, mailbox creation/execution mirrors legacy `CreationViaEmailTest` / `EmailHandler.createResources` for issue, issue comment, board comment, review comment, new-issue fallback resources and `original_email` provenance rows while preserving the legacy one-row-per-Message-ID constraint, and reply target lookup/action planning mirrors legacy `EmailHandler.findResourcesByMessageId`, `getThreads`, and `createResources` for exact `original_email.message_id` rows, Message-ID-left direct resource paths, recipient detail resource paths with legacy enum-style resource type canonicalization, review-comment-to-thread promotion, same-project resource matching, and new-issue fallback. The runtime mailbox polling scheduler invokes `YONA_MAILBOX_FETCH_COMMAND`, appends the configured IMAP recipient address as an argv value, and processes NUL-separated raw RFC822 stdout through that same bridge.
- Project review list parity now includes the legacy `reviewthread/list.scala.html` / `partial_list.scala.html` shell, current-user side-filter links/count badges, `#pagination` pageNum controls, PR changes deep links from review rows via `pullRequestNumber`, and the `format=xls` download action with active review filters and an Excel-compatible `.xls` response.
- Project/organization PR list parity now includes the legacy `git/partial_search.scala.html` / organization list shell anchors (`page-wrap-outer`, `project-page-wrap`, `pjax-container`, side search, advanced contributor field, tab content, new-PR action), project sender contributor select options from target-project PR contributors, the `partial_recently_pushed_branches.scala.html` prompt for recent fork/source pushes with legacy new-PR and `/:owner/:project/pushedBranch/:id/delete` delete-request anchors, tab `num-badge` counts (`open`, `closed`, and forked-project `accepted / sent`), the `git/partial_list.scala.html` / organization row shell anchors (`post-item title`, avatar/info/state/branch classes, organization `group-project-name`), and accurate closed/total review-thread progress badges from the REST list payload.

## Current Frontend Smoke Stabilization Note

- The Phase 2M frontend smoke baseline keeps the workspace/settings surface in
  `semantic-drift` status. `frontend/src/api/workspace.ts` now tolerates sparse
  `ReadWorkspaceOverviewResponse` arrays and profile fields so signup and sparse
  workspace bootstrap flows can render the existing legacy-aligned `/me` and
  `/user/editform` views instead of crashing before parity assertions run.
- The root runtime error banner is route-bootstrap support for visible in-page
  API errors; it does not change legacy route ownership or close a parity row.
- Public `/:user` profile parity now preserves the legacy `user/view.scala.html` two-column mode and show-subtasks checkbox anchors (`#two-column-mode-checkbox`, `#two-column-mode`, `.show-subtasks-li`, `#toggle-show-subtasks`) inside the same tab structure as the legacy profile shell.
- 2026-06-19 build/check diet note: public user profile REST query/response DTOs and handler moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/users.rs`, preserving the single-segment profile JSON surface covered by `rest_contract`.
- Site admin update parity now includes the direct legacy `POST /sites/unwatchUpdate`
  alias. It is site-admin/CSRF-gated and lowers the in-process update notification
  watch flag; configured update status, metadata URL/file discovery, and download-link
  branches, site-admin-gated download redirect, and file/plain-HTTP/HTTPS binary proxy
  exist; HTTPS fetch uses the local `curl` executable by default and can be
  overridden with `YONA_UPDATE_HTTPS_FETCH_COMMAND`.
- SVN executable-client depth coverage now includes stock `svn update --set-depth files` from both depth-empty and full working copies, plus `svn update --set-depth exclude <child-dir>` for child-directory exclusion over the mounted `/svn/$path` boundary with local `svn`/`svnadmin`/`svnlook` 1.14.5.
- `DESIGN.md` records the legacy Yona view/LESS source order for future frontend
  styling work and is a guardrail, not a new product surface.

## Phase 4A PR Read-Semantics Correction

- The PR/review read surface keeps legacy persisted values as the compatibility
  boundary: pull-request state rows use `OPEN = 1`, `CLOSED = 2`, and
  `MERGED = 6`; review-thread state reads accept both `OPEN`/`CLOSED` and
  lowercase migrated strings.
- Pull-request changes use the stored merged commit id pair captured on the PR
  row. Current branch heads are not a parity source for the Phase 4A read view,
  and missing Git revisions still return the documented empty diff fallback.
- Organization PR list tabs/search and `#pagination` controls keep `filter` and
  `pageNum` visible in route query state so the read-only list surface does not
  silently reset the user's narrowed view.
- Project/organization PR list rows now expose `closedCommentThreadCount` with
  `commentThreadCount` so the legacy closed/total review progress badge can be
  rendered without inferring closed state on the client.
- 2026-06-19 build/check diet note: issue favorite toggle mutation logic moved
  from `PilotServiceImpl` in monolithic `crates/server/src/lib.rs` into
  `crates/server/src/routes/issues.rs`, preserving the same proto/REST issue
  favorite detail refresh behavior covered by
  `user_issue_favorite_contract::favorite_issue_toggle_updates_issue_detail_and_rejects_unreadable_issues`
  and `rest_contract::rest_issue_meta_routes_manage_participation_assignment_sharing_and_comment_votes`.
- 2026-06-19 build/check diet note: issue sharer mutation logic moved from
  `PilotServiceImpl` in monolithic `crates/server/src/lib.rs` into
  `crates/server/src/routes/issues.rs`, preserving REST share/unshare validation,
  user/project target expansion, timeline recording, and refreshed issue detail
  behavior covered by
  `issue_sharer_contract::issue_sharer_contract_shares_unshares_and_keeps_duplicate_single_row`
  and `rest_contract::rest_issue_meta_routes_manage_participation_assignment_sharing_and_comment_votes`.
- 2026-06-20 build/check diet note: issue assignment mutation logic moved from
  `PilotServiceImpl` in monolithic `crates/server/src/lib.rs` into
  `crates/server/src/routes/issues.rs`, preserving assignment authorization,
  assignee update semantics, and refreshed issue detail behavior covered by
  `user_issue_favorite_contract::favorite_issue_toggle_updates_issue_detail_and_rejects_unreadable_issues`
  and `rest_contract::rest_issue_meta_routes_manage_participation_assignment_sharing_and_comment_votes`.
- 2026-06-20 build/check diet note: project label list/create/update/delete
  RPC logic moved from `PilotServiceImpl` in monolithic
  `crates/server/src/lib.rs` into `crates/server/src/routes/issues.rs`,
  preserving label read ACL, project-update authorization, color normalization,
  category binding, duplicate/update error mapping, and delete behavior covered
  by `issue_label_contract::issue_label_rpc_manages_labels_categories_and_cleanup`
  and `rest_contract::rest_label_routes_manage_labels_and_categories`.
- 2026-06-20 build/check diet note: project label category list/create/update/delete
  RPC logic moved from `PilotServiceImpl` in monolithic
  `crates/server/src/lib.rs` into `crates/server/src/routes/issues.rs`,
  preserving category read ACL, project-update authorization, exclusive flag
  updates, update error mapping, and delete behavior covered by
  `issue_label_contract::issue_label_rpc_manages_labels_categories_and_cleanup`
  and `rest_contract::rest_label_routes_manage_labels_and_categories`.
- 2026-06-20 build/check diet note: project milestone list/read/create/update/delete
  RPC logic moved from `PilotServiceImpl` in monolithic
  `crates/server/src/lib.rs` into `crates/server/src/routes/projects.rs`,
  preserving milestone list filters, read/update permissions, title duplication
  checks, due-date/input normalization, issue-reference projection, state reuse,
  and delete behavior covered by
  `milestone_contract::milestone_rpc_manages_crud_state_sorting_and_linked_issues`
  and `rest_contract::rest_milestone_routes_manage_crud_and_state`.
- 2026-06-20 build/check diet note: current-session read and sign-out RPC logic
  moved from `PilotServiceImpl` in monolithic `crates/server/src/lib.rs` into
  `crates/server/src/routes/auth.rs`, preserving current-session projection,
  CSRF-gated sign-out, anonymous session replacement, and response-header
  attachment behavior covered by
  `auth_workspace_contract::rest_auth_routes_round_trip_with_shared_session_and_error_envelope`
  and `server_core_contract::read_current_session_works_over_connect_json`.
- 2026-06-20 build/check diet note: sign-in RPC logic moved from
  `PilotServiceImpl` in monolithic `crates/server/src/lib.rs` into
  `crates/server/src/routes/auth.rs`, preserving CSRF-gated credential
  validation, confirmation-required rejection, remember-me session replacement,
  default landing path projection, and response-header attachment behavior
  covered by
  `auth_workspace_contract::rest_auth_routes_round_trip_with_shared_session_and_error_envelope`
  and `auth_workspace_contract::register_sign_in_sign_out_and_current_session_round_trip`.
- 2026-06-20 build/check diet note: verify-user RPC logic moved from
  `PilotServiceImpl` in monolithic `crates/server/src/lib.rs` into
  `crates/server/src/routes/auth.rs`, preserving signup verification lookup,
  invalid/expired verification rejection, user confirmation, verification-row
  cleanup, and returned login id behavior covered by
  `auth_workspace_contract::rest_verify_user_confirms_pending_signup` and
  `auth_workspace_contract::verify_user_activates_pending_account_and_rejects_invalid_or_expired_links`.
- 2026-06-20 build/check diet note: register RPC logic moved from
  `PilotServiceImpl` in monolithic `crates/server/src/lib.rs` into
  `crates/server/src/routes/auth.rs`, preserving CSRF-gated signup validation,
  duplicate login/email rejection, bcrypt password hashing, optional signup
  verification mail creation, confirmation-session anonymous response, and
  authenticated session replacement behavior covered by
  `auth_workspace_contract::register_sign_in_sign_out_and_current_session_round_trip`,
  `auth_workspace_contract::direct_legacy_login_and_signup_form_routes_accept_legacy_form_csrf_redirect_and_authenticate`,
  and
  `auth_workspace_contract::register_with_email_verification_creates_signup_verification_and_mail_delivery`.
- 2026-06-20 build/check diet note: workspace overview read and default-landing
  update RPC logic moved from `PilotServiceImpl` in monolithic
  `crates/server/src/lib.rs` into `crates/server/src/routes/workspace.rs`,
  preserving authenticated workspace overview projection, default landing path
  validation/update, CSRF enforcement, and refreshed overview response behavior
  covered by
  `auth_workspace_contract::workspace_overview_reads_and_updates_default_landing`
  and
  `auth_workspace_contract::workspace_settings_mutations_round_trip_through_workspace_overview`.
- 2026-06-20 build/check diet note: workspace profile update and recent-project
  reset RPC logic moved from `PilotServiceImpl` in monolithic
  `crates/server/src/lib.rs` into `crates/server/src/routes/workspace.rs`,
  preserving profile validation, avatar attachment promotion and MIME/size
  checks, profile persistence, recent-project clearing, CSRF enforcement, and
  refreshed overview response behavior covered by
  `auth_workspace_contract::update_profile_replaces_existing_avatar_attachment`
  and
  `auth_workspace_contract::workspace_settings_mutations_round_trip_through_workspace_overview`.
- 2026-06-20 build/check diet note: workspace email add/delete/validation,
  main-email selection, API-token reset, and notification toggle RPC logic
  moved from `PilotServiceImpl` in monolithic `crates/server/src/lib.rs` into
  `crates/server/src/routes/workspace.rs`, preserving email id validation,
  workspace settings mutation error mapping, API token regeneration, project
  read authorization for notification toggles, unwatched-project rejection, and
  refreshed overview response behavior covered by
  `auth_workspace_contract::workspace_settings_mutations_round_trip_through_workspace_overview`
  and
  `auth_workspace_contract::toggle_workspace_notification_preserves_missing_forbidden_and_unwatched_statuses`.
- 2026-06-20 build/check diet note: workspace password-change RPC logic moved
  from `PilotServiceImpl` in monolithic `crates/server/src/lib.rs` into
  `crates/server/src/routes/workspace.rs`, preserving login-id confirmation,
  old-password verification, new-password validation, bcrypt password hash
  update, anonymous session replacement, response-header attachment, and direct
  form redirect behavior covered by
  `auth_workspace_contract::workspace_settings_mutations_round_trip_through_workspace_overview`
  and
  `auth_workspace_contract::direct_email_validation_send_and_confirm_routes_round_trip`.
- 2026-06-20 build/check diet note: organization detail, settings, and
  container read RPC logic moved from `PilotServiceImpl` in monolithic
  `crates/server/src/lib.rs` into `crates/server/src/routes/projects.rs`;
  service methods remain compatibility delegates while REST organization read
  handlers call the project route-owned helpers directly, preserving
  organization detail/settings/container behavior covered by
  `rest_contract::rest_organization_routes_cover_directory_views_and_membership_mutations`.
- 2026-06-20 build/check diet note: organization members and admin read RPC
  logic moved from `PilotServiceImpl` in monolithic `crates/server/src/lib.rs`
  into `crates/server/src/routes/projects.rs`; service methods remain
  compatibility delegates while REST organization members/admin handlers call
  the project route-owned helpers directly, preserving membership directory and
  admin projection behavior covered by
  `rest_contract::rest_organization_routes_cover_directory_views_and_membership_mutations`.
- 2026-06-20 build/check diet note: organization create/update RPC logic moved
  from `PilotServiceImpl` in monolithic `crates/server/src/lib.rs` into
  `crates/server/src/routes/projects.rs`; service methods remain compatibility
  delegates while REST organization create/update handlers call the project
  route-owned helpers directly, preserving creation validation, guest rejection,
  duplicate-name checks, update authorization, and detail projection behavior
  covered by
  `rest_contract::rest_organization_routes_cover_directory_views_and_membership_mutations`.
- 2026-06-20 build/check diet note: organization member add, member role
  update, member delete, and enrollment accept RPC logic moved from
  `PilotServiceImpl` in monolithic `crates/server/src/lib.rs` into
  `crates/server/src/routes/projects.rs`; service methods remain compatibility
  delegates while REST organization member/enrollment mutation handlers call the
  project route-owned helpers directly, preserving admin authorization, guest
  member rejection, last-admin protection, self-leave member removal, enrollment
  cleanup, and refreshed admin projection behavior covered by
  `rest_contract::rest_organization_routes_cover_directory_views_and_membership_mutations`.
- 2026-06-20 build/check diet note: organization enroll, cancel-enroll, leave,
  and delete RPC logic moved from `PilotServiceImpl` in monolithic
  `crates/server/src/lib.rs` into `crates/server/src/routes/projects.rs`;
  service methods remain compatibility delegates while REST organization
  enroll/leave/delete handlers call the project route-owned helpers directly,
  preserving guest-only enrollment, enrollment cancellation, last-admin
  protection, member leave redirects, empty-organization delete checks, and
  redirect/container projection behavior covered by
  `rest_contract::rest_organization_routes_cover_directory_views_and_membership_mutations`.
- 2026-06-20 build/check diet note: project detail, settings, and container
  read RPC logic moved from `PilotServiceImpl` in monolithic
  `crates/server/src/lib.rs` into `crates/server/src/routes/projects.rs`;
  service methods remain compatibility delegates while REST project
  detail/settings/container handlers call the project route-owned helpers
  directly, preserving read ACL, recent-project visit recording, update/settings
  authorization, enrollment CTA flags, and project container projection behavior
  covered by `rest_contract::rest_project_routes_cover_directory_views_and_mutations`.
- 2026-06-20 build/check diet note: project create RPC logic moved from
  `PilotServiceImpl` in monolithic `crates/server/src/lib.rs` into
  `crates/server/src/routes/projects.rs`; the service method remains a
  compatibility delegate while the REST project create handler calls the project
  route-owned helper directly, preserving scope defaults, name validation,
  duplicate checks, personal/organization owner authorization, bare repository
  provisioning, manager membership creation, and created project detail
  projection behavior covered by
  `rest_contract::rest_project_routes_cover_directory_views_and_mutations`.
- 2026-06-20 build/check diet note: project overview update and project watch
  toggle RPC logic moved from `PilotServiceImpl` in monolithic
  `crates/server/src/lib.rs` into `crates/server/src/routes/projects.rs`;
  service methods remain compatibility delegates while REST/direct project
  overview and watch handlers call the project route-owned helpers directly,
  preserving CSRF/session checks, project update/read authorization, overview
  persistence, watch-state persistence, and refreshed project container
  projection behavior covered by
  `org_project_contract::update_project_overview_returns_refreshed_project_container`
  and `org_project_contract::toggle_project_watch_returns_refreshed_project_container`.
- 2026-06-20 build/check diet note: project update RPC logic moved from
  `PilotServiceImpl` in monolithic `crates/server/src/lib.rs` into
  `crates/server/src/routes/projects.rs`; the service method remains a
  compatibility delegate while the REST project update handler calls the
  project route-owned helper directly before menu, reviewer, and logo
  post-processing. This preserves CSRF/session checks, name/scope validation,
  duplicate detection, project update authorization, and updated detail
  projection behavior covered by
  `rest_contract::rest_project_routes_cover_directory_views_and_mutations`.
- 2026-06-20 build/check diet note: project enroll/cancel-enroll, project
  favorite toggle, and recent-project visit RPC logic moved from
  `PilotServiceImpl` in monolithic `crates/server/src/lib.rs` into
  `crates/server/src/routes/projects.rs`; service methods remain compatibility
  delegates while REST project enroll/favorite handlers call the route-owned
  helpers directly. This preserves guest-only enrollment checks, enrollment
  request creation/removal, project read ACL for favorites/recent visits,
  favorite-state persistence, and workspace recent/favorite projections covered
  by
  `org_project_contract::project_detail_enrollment_favorites_recent_and_workspace_overview_round_trip`
  and `rest_contract::rest_workspace_routes_manage_overview_settings_and_recent_projects`.
- 2026-06-20 build/check diet note: project and organization list RPC logic
  moved from `PilotServiceImpl` in monolithic `crates/server/src/lib.rs` into
  `crates/server/src/routes/projects.rs`; service methods remain compatibility
  delegates while REST organization list and non-repository project-list
  fallback call the route-owned helpers directly. This preserves project and
  organization directory list projection, logo URL mapping, and no-repository
  pilot fallback behavior covered by
  `rest_contract::rest_project_routes_cover_directory_views_and_mutations` and
  `rest_contract::rest_organization_routes_cover_directory_views_and_membership_mutations`.
- 2026-06-20 build/check diet note: project and organization issue-list RPC
  logic moved from `PilotServiceImpl` in monolithic `crates/server/src/lib.rs`
  into `crates/server/src/routes/issues.rs`; service methods remain
  compatibility delegates while the issue route module owns the project and
  organization list filters plus proto projection beside the REST list
  handlers. This preserves project issue list ACL, organization visible-project
  aggregation, state/filter parsing, pagination counts, and proto list response
  shape covered by
  `rest_contract::rest_project_issue_list_exposes_legacy_row_payload_fields`
  and `organization_issue_contract::organization_issue_list_contract_respects_visible_projects_and_counts`.
- 2026-06-20 build/check diet note: issue detail read and issue state update
  RPC logic moved from `PilotServiceImpl` in monolithic
  `crates/server/src/lib.rs` into `crates/server/src/routes/issues.rs`; service
  methods remain compatibility delegates while the issue route module owns the
  detail projection, state mutation authorization, CSRF/session checks, and
  no-repository pilot fallback response beside the REST/direct issue handlers.
  This preserves proto detail/status behavior covered by
  `server_core_contract::read_issue_detail_applies_the_go_pilot_status_contract`,
  `server_core_contract::update_issue_state_requires_bootstrapped_csrf`, and
  `issue_core_contract::issue_core_contract_creates_reads_updates_and_deletes_over_rest`.
- 2026-06-20 build/check diet note: filesystem/embedded asset fallback,
  Smart HTTP/SVN fallback dispatch, Excel export fallback dispatch, and
  `serve_frontend_page` moved from monolithic `crates/server/src/lib.rs` into
  `crates/server/src/assets.rs`; asset route assembly now owns the full fallback
  chain it invokes while route modules keep using the root re-exported frontend
  page helper. This preserves runtime config injection, base-path SPA fallback,
  legacy API index fallback, and Smart HTTP/SVN/Excel fallback dispatch covered
  by `assets_contract` and `server_core_contract`.
- 2026-06-20 build/check diet note: global anonymous-access gate helpers moved
  from monolithic `crates/server/src/lib.rs` into
  `crates/server/src/anonymous_access.rs`; router assembly still installs the
  middleware while the auth/session bootstrap boundary owns public path
  allowlisting, login redirect construction, and REST unauthorized responses.
  This preserves disabled-anonymous page redirects, non-auth REST rejection, and
  protected migration route behavior covered by
  `auth_workspace_contract::anonymous_access_disabled_redirects_pages_and_rejects_non_auth_rest`
  and
  `server_core_contract::legacy_migration_requires_login_when_anonymous_access_is_disabled`.
- 2026-06-20 build/check diet note: public router constructors and top-level
  router assembly moved from monolithic `crates/server/src/lib.rs` into
  `crates/server/src/router.rs`; the root crate re-exports the same constructor
  API while `router.rs` owns app route assembly, asset mounting, session manager
  creation, browser runtime injection, and anonymous-access middleware
  installation. This preserves session bootstrap, CSRF header issuance, base-path
  runtime injection, and filesystem asset SPA fallback behavior covered by
  `server_core_contract::session_bootstrap_issues_cookies_and_csrf_header` and
  `assets_contract::filesystem_assets_support_base_path_injection_and_spa_fallback`.
- 2026-06-20 build/check diet note: the remaining `PilotServiceImpl` `_pilot`
  adapter delegate impl moved from monolithic `crates/server/src/lib.rs` into
  `crates/server/src/service.rs`; service methods remain thin compatibility
  delegates to route-owned auth/workspace/project/issue helpers and are
  explicitly crate-visible for the debug `_pilot` dispatcher. This preserves
  Connect-style current-session, register, sign-in, and sign-out behavior
  covered by `server_core_contract::read_current_session_works_over_connect_json`
  and
  `auth_workspace_contract::register_sign_in_sign_out_and_current_session_round_trip`.
- 2026-06-20 build/check diet note: runtime/app config structs and startup/env
  projection helpers moved from monolithic `crates/server/src/lib.rs` into
  `crates/server/src/app_config.rs`; the root crate re-exports the same public
  config API while config ownership now sits beside router/bootstrap assembly.
  This preserves auth UI runtime projection, env-isolated auth capability
  behavior, and browser runtime injection covered by
  `auth_workspace_contract::read_auth_ui_capabilities_reflects_runtime_config_without_env_mutation`
  and
  `assets_contract::embedded_assets_support_base_path_injection_and_spa_fallback`.
- 2026-07-11 runtime context invariant note: `RuntimeConfig::default()` now
  exposes `/` directly, matching the existing `YONA_BASE_PATH` absent/blank
  normalization, router context mount, and runtime HTML/asset rewriting path.
  `runtime_config_contract::runtime_config_defaults_to_root_context` fixes the
  default contract; filesystem and embedded asset contracts continue to cover
  both `/` and nested context delivery. Host/proxy headers remain outside context
  discovery, so no allowed-host setting is required for this mount behavior.
- 2026-06-20 build/check diet note: shared server state/error types, backend and
  asset mode enums, browser runtime config, login constants, `yona_data_root`,
  and repository provisioning lock moved from monolithic
  `crates/server/src/lib.rs` into `crates/server/src/state.rs`; the root crate
  still re-exports the crate-internal state boundary for existing route modules.
  This preserves Connect error/status mapping, CSRF state mutation rejection,
  `YONA_DATA` repository path lookup, and legacy `/_init` repository
  reprovisioning covered by
  `server_core_contract::update_issue_state_requires_bootstrapped_csrf` and
  `assets_contract::legacy_init_redirects_home_and_recreates_project_repositories`.
- 2026-06-20 build/check diet note: root-local server unit tests moved from
  monolithic `crates/server/src/lib.rs` into their owning modules:
  `server_config.rs`, `markdown.rs`, `routes/utils.rs`, and
  `routes/site_admin.rs`. This preserves command parsing, markdown mention
  boundary parsing, legacy upload-size defaults, and site-update fetch command
  construction while keeping the root module as declarations/re-exports only;
  the moved behavior is covered by the corresponding lib unit tests.
- 2026-06-20 build/check diet note: the remaining root import bus entries for
  Axum, generated protocol wildcard types, domain ACL helpers, and VCS commit
  records were removed from `crates/server/src/lib.rs`; workspace and project
  route modules now import their domain/VCS dependencies directly, and stale
  unused imports were removed from code/SVN route modules. This preserves
  workspace default landing behavior, project directory/mutation behavior,
  code commit discussion behavior, and SVN protocol behavior covered by
  `rest_contract::rest_workspace_routes_manage_overview_settings_and_recent_projects`,
  `org_project_contract::rest_project_routes_cover_directory_views_and_mutations`,
  `code_browser_contract::rest_commit_detail_creates_comments_and_updates_threads_from_git_repo`,
  and `svn_protocol_contract`.
- 2026-06-20 build/check diet note: additional root helper forwarding was
  replaced with owning-module imports for Excel export, Smart HTTP route
  parsing, frontend page serving, and server config command/bool/duration
  parsing. `routes/mod.rs` also dropped unused crate-internal forwarding.
  This preserves auth legacy form routing, legacy runtime repository
  initialization, site update command construction, and notification scheduler
  config parsing covered by
  `auth_workspace_contract::direct_legacy_login_and_signup_form_routes_accept_legacy_form_csrf_redirect_and_authenticate`,
  `assets_contract::legacy_init_redirects_home_and_recreates_project_repositories`,
  the site-admin fetch command lib unit test, and
  `notification_contract::notification_scheduler_config_from_startup_uses_init_snapshot_without_env_mutation`.
- 2026-06-20 build/check diet note: the generated embedded asset include module
  moved from `crates/server/src/lib.rs` into `crates/server/src/assets.rs`, so
  embedded asset lookup is owned by the same module that mounts asset and SPA
  fallback routes. This preserves embedded runtime config injection and SPA
  fallback behavior covered by
  `assets_contract::embedded_assets_support_base_path_injection_and_spa_fallback`.
- 2026-06-20 build/check diet note: SVN svndiff encode/decode helpers moved
  from monolithic `crates/server/src/svn_protocol.rs` into
  `crates/server/src/svn_protocol/svndiff.rs`; SVN request dispatch and DAV
  response shaping remain in `svn_protocol.rs`. This preserves SVN commit
  delta application, diff reporting, and update report txdelta behavior covered
  by `svn_protocol_contract::svn_protocol_external_client_can_commit_file_update`,
  `svn_protocol_contract::svn_protocol_external_client_can_diff_public_file`,
  and
  `svn_protocol_contract::svn_protocol_external_client_can_update_after_remote_commit`.
- 2026-06-20 build/check diet note: SVN committed-date and HTTP-date
  formatting helpers moved from `crates/server/src/svn_protocol.rs` into
  `crates/server/src/svn_protocol/date.rs`; log, PROPFIND, and REPORT response
  builders still call the same formatting behavior through the route module.
  This preserves verbose log dates, public info/provenance dates, and mergeinfo
  report behavior covered by
  `svn_protocol_contract::svn_protocol_external_client_can_log_verbose_public_project`,
  `svn_protocol_contract::svn_protocol_external_client_can_info_public_project`,
  and `svn_protocol_contract::svn_protocol_external_client_can_read_mergeinfo`.
- 2026-06-20 build/check diet note: SVN XML text/int/section parsing and
  PROPPATCH property-patch parsing helpers moved from
  `crates/server/src/svn_protocol.rs` into
  `crates/server/src/svn_protocol/xml.rs`; request dispatch and DAV response
  shaping remain in the protocol module while XML request parsing is isolated.
  This preserves property set commits, lock/unlock request handling, and
  mergeinfo report parsing covered by
  `svn_protocol_contract::svn_protocol_external_client_can_propset_and_commit`,
  `svn_protocol_contract::svn_protocol_external_client_can_lock_and_unlock_file`,
  and `svn_protocol_contract::svn_protocol_external_client_can_read_mergeinfo`.
  Compile/check timing evidence for this split uses tool-level unsandboxed
  execution only; cargo or pnpm wrapper commands run inside the agent sandbox
  remain excluded from timing comparisons.
- 2026-06-20 build/check diet note: SVN lock token generation, lock-token
  header parsing, and lockdiscovery XML body/item helpers moved from
  `crates/server/src/svn_protocol.rs` into
  `crates/server/src/svn_protocol/lock.rs`; LOCK/UNLOCK dispatch and status
  mapping remain in the protocol module. This preserves executable-backed lock
  creation, token response headers, get-locks report visibility, PROPFIND
  lockdiscovery metadata, and unlock behavior covered by
  `svn_protocol_contract::svn_protocol_external_client_can_lock_and_unlock_file`.
- 2026-06-20 build/check diet note: SVN report path joining, file lookup,
  label revision, destination URL lookup, and activity id parsing helpers moved
  from `crates/server/src/svn_protocol.rs` into
  `crates/server/src/svn_protocol/path.rs`; route parsing and DAV
  response/status helpers remain in the protocol module. This preserves legacy
  SVN path/auth routing, label-revision PROPFIND behavior, update report path
  resolution, and direct URL copy destination handling covered by
  `svn_protocol_contract::svn_protocol_route_preserves_legacy_path_and_auth_boundary`,
  `svn_protocol_contract::svn_protocol_root_and_default_vcc_propfind_honor_label_revision`,
  `svn_protocol_contract::svn_protocol_external_client_can_update_after_remote_commit`,
  and `svn_protocol_contract::svn_protocol_external_client_can_copy_direct_url`.
- 2026-06-20 build/check diet note: SVN log, changed-path, file-rev,
  mergeinfo, list, inherited-props, get-locks, and PROPPATCH multistatus XML
  item helpers moved from `crates/server/src/svn_protocol.rs` into
  `crates/server/src/svn_protocol/report_items.rs`; REPORT/PROPPATCH control
  flow remains in the protocol module. This preserves verbose log output,
  file-revs/blame metadata, mergeinfo output, PROPPATCH multistatus responses,
  lock report metadata, list-report rows, and inherited property report rows
  covered by `svn_protocol_contract::svn_protocol_external_client_can_log_verbose_public_project`,
  `svn_protocol_contract::svn_protocol_external_client_can_blame_public_file`,
  `svn_protocol_contract::svn_protocol_external_client_can_read_mergeinfo`,
  `svn_protocol_contract::svn_protocol_external_client_can_propset_and_commit`,
  `svn_protocol_contract::svn_protocol_external_client_can_lock_and_unlock_file`,
  and `svn_protocol_contract::svn_protocol_get_serves_repository_file_with_svnlook`.
- 2026-06-20 build/check diet note: SVN project/resource/propfind/version/
  baseline/merge href helpers and repo-relative request path normalization
  moved from `crates/server/src/svn_protocol.rs` into
  `crates/server/src/svn_protocol/href.rs`; DAV request dispatch and response
  bodies still own when those hrefs are emitted. This preserves PROPFIND
  DeltaV href metadata, update-report checked-in/version hrefs,
  checkout/merge choreography hrefs, and direct URL copy destination handling
  covered by
  `svn_protocol_contract::svn_protocol_root_and_default_vcc_propfind_allprop_exposes_deltav_metadata`,
  `svn_protocol_contract::svn_protocol_external_client_can_update_after_remote_commit`,
  `svn_protocol_contract::svn_protocol_supports_checkout_merge_choreography`,
  and `svn_protocol_contract::svn_protocol_external_client_can_copy_direct_url`.
- 2026-06-20 build/check diet note: SVN PROPFIND property selection,
  supportedlock/supported-report-set/activity-collection/displayname item
  builders, file ETag synthesis, and dead-property XML name/value rendering
  moved from `crates/server/src/svn_protocol.rs` into
  `crates/server/src/svn_protocol/propfind.rs`; DAV request dispatch and
  response layout still own when properties are emitted. This preserves
  allprop/propname filtering, label-revision PROPFIND metadata, file property
  responses, and propset dead-property round trips covered by
  `svn_protocol_contract::svn_protocol_root_and_default_vcc_propfind_allprop_exposes_deltav_metadata`,
  `svn_protocol_contract::svn_protocol_root_and_default_vcc_propfind_honor_label_revision`,
  `svn_protocol_contract::svn_protocol_get_serves_repository_file_with_svnlook`,
  and `svn_protocol_contract::svn_protocol_external_client_can_propset_and_commit`.
- 2026-06-20 build/check diet note: SVN update-report depth parsing,
  start-empty/base revision parsing, recursive entry traversal, entry property
  XML, file entry XML, inline text-delta encoding, and md5 checksum helpers
  moved from `crates/server/src/svn_protocol.rs` into
  `crates/server/src/svn_protocol/update.rs`; REPORT control flow and VCS error
  mapping remain in the protocol module. This preserves remote update
  materialization, depth-empty checkout deepening, and revision-targeted update
  behavior covered by
  `svn_protocol_contract::svn_protocol_external_client_can_update_after_remote_commit`,
  `svn_protocol_contract::svn_protocol_external_client_can_deepen_depth_empty_checkout`,
  and `svn_protocol_contract::svn_protocol_external_client_can_update_to_older_revision_and_back_to_head`.
- 2026-06-20 build/check diet note: SVN REPORT path filters, replay editor
  operation XML, and location-segment history calculation moved from
  `crates/server/src/svn_protocol.rs` into
  `crates/server/src/svn_protocol/report_filters.rs`; REPORT control flow,
  HTTP response construction, and VCS error mapping remain in the protocol
  module. This preserves location-segments output, replay-report editor
  operations, and verbose log changed-path filtering covered by
  `svn_protocol_contract::svn_protocol_get_serves_repository_file_with_svnlook`
  and
  `svn_protocol_contract::svn_protocol_external_client_can_log_verbose_public_project`.
- 2026-06-20 build/check diet note: SVN OPTIONS capability response,
  DAV/Allow/version/UUID/mergeinfo headers, and direct-file
  `svn-repository-root` header detection moved from
  `crates/server/src/svn_protocol.rs` into
  `crates/server/src/svn_protocol/options.rs`; request authorization and route
  dispatch remain in the protocol module. This preserves WebDAV method
  advertisement and direct-file OPTIONS metadata covered by
  `svn_protocol_contract::svn_protocol_get_serves_repository_file_with_svnlook`.
- 2026-06-20 build/check diet note: SVN CHECKOUT working-resource `Location`
  construction and MERGE `updated-set` XML item rendering moved from
  `crates/server/src/svn_protocol.rs` into
  `crates/server/src/svn_protocol/activity.rs`; MKACTIVITY/CHECKOUT/MERGE
  request validation, VCS error mapping, and HTTP status/header response
  construction remain in the protocol module. This preserves activity creation,
  checkout working-resource mapping, PUT through working resources, and MERGE
  checked-in metadata covered by
  `svn_protocol_contract::svn_protocol_supports_checkout_merge_choreography`.
- 2026-06-20 build/check diet note: SVN write success `svn-revision`
  response/header construction and PUT svndiff body decoding moved from
  `crates/server/src/svn_protocol.rs` into
  `crates/server/src/svn_protocol/write.rs`; PUT/COPY/MOVE/MKCOL/PROPPATCH/
  DELETE authorization, path validation, VCS mutation calls, and error mapping
  remain in the protocol module. This preserves direct write mutation revision
  headers, PROPPATCH multistatus revision metadata, and direct URL copy/move
  behavior covered by
  `svn_protocol_contract::svn_protocol_get_serves_repository_file_with_svnlook`,
  `svn_protocol_contract::svn_protocol_external_client_can_copy_direct_url`,
  and `svn_protocol_contract::svn_protocol_external_client_can_move_direct_url`.
- 2026-06-20 build/check diet note: SVN PROPFIND collection/file
  `<D:response>` item rendering and revision-provenance payload shape moved
  from `crates/server/src/svn_protocol.rs` into
  `crates/server/src/svn_protocol/propfind_items.rs`; PROPFIND dispatch and
  multistatus response assembly remain in the protocol module. This preserves
  root/default VCC DeltaV metadata, Label revision metadata, and executable
  file PROPFIND/GET behavior covered by
  `svn_protocol_contract::svn_protocol_root_and_default_vcc_propfind_allprop_exposes_deltav_metadata`,
  `svn_protocol_contract::svn_protocol_root_and_default_vcc_propfind_honor_label_revision`,
  and `svn_protocol_contract::svn_protocol_get_serves_repository_file_with_svnlook`.
- 2026-06-20 build/check diet note: SVN `get-locations` and
  `get-location-segments` REPORT response handling moved from
  `crates/server/src/svn_protocol.rs` into
  `crates/server/src/svn_protocol/report_locations.rs`; REPORT method
  dispatch remains in the protocol module. This preserves checkout/merge
  choreography location discovery covered by
  `svn_protocol_contract::svn_protocol_supports_checkout_merge_choreography`.
- 2026-06-20 build/check diet note: SVN `dated-rev-report` and
  `get-deleted-rev-report` response handling moved from
  `crates/server/src/svn_protocol.rs` into
  `crates/server/src/svn_protocol/report_revisions.rs`; REPORT method
  dispatch remains in the protocol module. This preserves revision-date lookup
  and deleted-revision discovery covered by
  `svn_protocol_contract::svn_protocol_get_serves_repository_file_with_svnlook`.
- 2026-06-20 build/check diet note: SVN `log-report` response handling moved
  from `crates/server/src/svn_protocol.rs` into
  `crates/server/src/svn_protocol/report_log.rs`; REPORT method dispatch
  remains in the protocol module. This preserves log metadata, changed-path
  filtering, and verbose SVN client log behavior covered by
  `svn_protocol_contract::svn_protocol_get_serves_repository_file_with_svnlook`
  and
  `svn_protocol_contract::svn_protocol_external_client_can_log_verbose_public_project`.
- 2026-06-20 build/check diet note: SVN `file-revs-report` response handling
  moved from `crates/server/src/svn_protocol.rs` into
  `crates/server/src/svn_protocol/report_file_revs.rs`; REPORT method
  dispatch remains in the protocol module. This preserves file revision txdelta
  metadata and SVN blame client behavior covered by
  `svn_protocol_contract::svn_protocol_get_serves_repository_file_with_svnlook`
  and
  `svn_protocol_contract::svn_protocol_external_client_can_blame_public_file`.
- 2026-06-20 build/check diet note: SVN `replay-report` response handling
  moved from `crates/server/src/svn_protocol.rs` into
  `crates/server/src/svn_protocol/report_replay.rs`; REPORT method dispatch
  remains in the protocol module. This preserves ra_serf editor operation
  replay metadata covered by
  `svn_protocol_contract::svn_protocol_get_serves_repository_file_with_svnlook`.
- 2026-06-20 build/check diet note: SVN `mergeinfo-report` response handling
  moved from `crates/server/src/svn_protocol.rs` into
  `crates/server/src/svn_protocol/report_mergeinfo.rs`; REPORT method dispatch
  remains in the protocol module. This preserves mergeinfo property reporting
  and SVN mergeinfo client behavior covered by
  `svn_protocol_contract::svn_protocol_get_serves_repository_file_with_svnlook`
  and
  `svn_protocol_contract::svn_protocol_external_client_can_read_mergeinfo`.
- 2026-06-20 build/check diet note: SVN `list-report` response handling moved
  from `crates/server/src/svn_protocol.rs` into
  `crates/server/src/svn_protocol/report_list.rs`; REPORT method dispatch
  remains in the protocol module. This preserves ra_serf directory listing
  metadata covered by
  `svn_protocol_contract::svn_protocol_get_serves_repository_file_with_svnlook`.
- 2026-06-20 build/check diet note: SVN `get-locks-report` and
  `inherited-props-report` response handling moved from
  `crates/server/src/svn_protocol.rs` into
  `crates/server/src/svn_protocol/report_misc.rs`; REPORT method dispatch
  remains in the protocol module. This preserves lock report and inherited
  property metadata covered by
  `svn_protocol_contract::svn_protocol_get_serves_repository_file_with_svnlook`
  and `svn_protocol_contract::svn_protocol_external_client_can_lock_and_unlock_file`.
- 2026-06-20 build/check diet note: SVN `update-report` response handling
  moved from `crates/server/src/svn_protocol.rs` into
  `crates/server/src/svn_protocol/report_update.rs`; REPORT method dispatch
  remains in the protocol module. This preserves checkout/update materialization,
  depth transitions, inline deltas, and ra_serf update metadata covered by
  `svn_protocol_contract::svn_protocol_external_client_can_update_after_remote_commit`,
  `svn_protocol_contract::svn_protocol_external_client_can_deepen_depth_empty_checkout`,
  and `svn_protocol_contract::svn_protocol_get_serves_repository_file_with_svnlook`.
- 2026-06-20 build/check diet note: SVN root/default VCC/baseline/tree/file
  `PROPFIND` response handling moved from
  `crates/server/src/svn_protocol.rs` into
  `crates/server/src/svn_protocol/propfind_response.rs`; method dispatch and
  non-PROPFIND file/write/REPORT handling remain in the protocol module. This
  preserves DeltaV allprop metadata, Label revision metadata, and executable
  file/tree PROPFIND behavior covered by
  `svn_protocol_contract::svn_protocol_root_and_default_vcc_propfind_allprop_exposes_deltav_metadata`,
  `svn_protocol_contract::svn_protocol_root_and_default_vcc_propfind_honor_label_revision`,
  and `svn_protocol_contract::svn_protocol_get_serves_repository_file_with_svnlook`.
- 2026-06-20 build/check diet note: SVN PUT/COPY/MOVE/MKCOL/PROPPATCH/
  DELETE/LOCK/UNLOCK response handling moved from
  `crates/server/src/svn_protocol.rs` into
  `crates/server/src/svn_protocol/write_response.rs`; method dispatch,
  read-only GET/HEAD handling, REPORT dispatch, and activity MERGE/CHECKOUT
  handling remain in the protocol module. This preserves WebDAV write mutation
  behavior, property patch commits, lock/unlock behavior, and direct URL
  copy/move behavior covered by
  `svn_protocol_contract::svn_protocol_external_client_can_commit_file_update`,
  `svn_protocol_contract::svn_protocol_external_client_can_propset_and_commit`,
  `svn_protocol_contract::svn_protocol_external_client_can_lock_and_unlock_file`,
  `svn_protocol_contract::svn_protocol_external_client_can_copy_direct_url`,
  and `svn_protocol_contract::svn_protocol_external_client_can_move_direct_url`.
- 2026-06-20 build/check diet note: SVN MKACTIVITY/CHECKOUT/MERGE response
  handling moved from `crates/server/src/svn_protocol.rs` into the existing
  `crates/server/src/svn_protocol/activity.rs`; method dispatch, GET/HEAD,
  REPORT dispatch, and shared DAV/status helpers remain in the protocol module.
  This preserves activity creation, checkout working-resource mapping, and
  MERGE checked-in metadata covered by
  `svn_protocol_contract::svn_protocol_supports_checkout_merge_choreography`.
- 2026-06-20 build/check diet note: SVN GET/HEAD file response handling moved
  from `crates/server/src/svn_protocol.rs` into
  `crates/server/src/svn_protocol/file_response.rs`; method dispatch, REPORT
  dispatch, PROPFIND delegation, write delegation, and shared DAV/status helpers
  remain in the protocol module. This preserves executable-backed file content,
  HEAD body suppression, and file content headers covered by
  `svn_protocol_contract::svn_protocol_get_serves_repository_file_with_svnlook`.
- 2026-06-20 build/check diet note: SVN REPORT dispatch moved from
  `crates/server/src/svn_protocol.rs` into
  `crates/server/src/svn_protocol/report_response.rs`; HTTP method dispatch,
  authorization, body collection, and shared DAV/status helpers remain in the
  protocol module. This preserves report classification and delegation covered
  by `svn_protocol_contract::svn_protocol_get_serves_repository_file_with_svnlook`
  and
  `svn_protocol_contract::svn_protocol_external_client_can_log_verbose_public_project`.
- 2026-06-20 build/check diet note: project webhook REST DTOs, CRUD handlers,
  delivery-history projection, issue/PR webhook dispatch, and Hangout thread
  persistence helpers moved from `crates/server/src/routes/projects.rs` into
  `crates/server/src/routes/projects/webhooks.rs`; route registration and the
  shared project update guard remain in the parent project route module. This
  preserves webhook management, legacy issue webhook payload delivery, issue
  single/mass-update state, assignee, milestone-changed webhook delivery, body-changed webhook delivery, and deleted-issue webhook delivery, PR Hangout follow-up threading, board
  `NEW_POSTING` webhook fan-out, and board posting-comment `NEW_COMMENT` /
  `COMMENT_UPDATED` webhook fan-out covered by
  `project_webhook_contract::project_webhooks_require_update_and_manage_crud`,
  `project_webhook_contract::project_webhooks_enqueue_legacy_issue_payloads_for_non_json_hooks`,
  `project_webhook_contract::project_webhooks_enqueue_legacy_issue_body_changed_payloads_for_non_json_hooks`,
  `issue_core_contract::issue_core_contract_enqueues_legacy_state_assignee_milestone_webhooks`,
  `issue_core_contract::issue_core_contract_enqueues_legacy_mass_update_state_assignee_milestone_webhooks`,
  `issue_core_contract::issue_core_contract_enqueues_legacy_deleted_webhook_payload`,
  `project_webhook_contract::project_webhooks_enqueue_legacy_board_posting_payloads_for_non_json_hooks`,
  `project_webhook_contract::project_webhooks_enqueue_legacy_board_comment_payloads_for_non_json_hooks`,
  `pull_request_mutation_contract::pull_request_hangout_webhooks_persist_thread_names_for_followups`,
  and
  `board_contract::board_post_create_dispatches_legacy_new_posting_webhooks` /
  `board_contract::board_comment_create_and_update_dispatch_legacy_webhooks`.
  Cargo wrapper timing evidence now requires tool-level escalation: active
  `CODEX_SANDBOX` blocks `--outside-sandbox` before cargo starts, while
  `CODEX_SANDBOX_NETWORK_DISABLED` alone is treated as inherited metadata.
- 2026-06-20 build/check diet note: project milestone proto helpers, REST
  create/update/delete delegates, direct legacy mutation handlers, and legacy
  external milestones API body/result helpers moved from
  `crates/server/src/routes/projects.rs` into
  `crates/server/src/routes/projects/milestones.rs`; route registration remains
  in the parent project route module. This preserves milestone CRUD/state,
  linked issue projection, legacy redirect aliases, and legacy external
  milestone creation covered by
  `milestone_contract::milestone_rpc_manages_crud_state_sorting_and_linked_issues`,
  `milestone_contract::milestone_legacy_mutation_routes_preserve_redirects`,
  and `rest_contract::rest_project_routes_cover_directory_views_and_mutations`.
- 2026-06-20 build/check diet note: legacy external issue API handlers and
  helpers moved from `crates/server/src/routes/issues.rs` into
  `crates/server/src/routes/issues/legacy_external.rs`; route registration
  remains in the parent issue route module, and the parent re-export boundary
  keeps shared legacy label-id and assignable-user result helpers available to
  board/project legacy APIs. This preserves legacy external issue
  comment/read/update/content/detect-change/weight, assignable-users, and
  share/unshare behavior covered by
  `issue_core_contract::issue_core_contract_creates_reads_updates_and_deletes_over_rest`,
  `issue_assignable_contract::issue_assignable_users_blank_query_preserves_legacy_pseudo_rows`,
  and
  `issue_sharer_contract::issue_sharer_contract_shares_unshares_and_keeps_duplicate_single_row`.
- 2026-06-20 build/check diet note: organization proto helpers, REST DTOs,
  REST directory/detail/admin/settings/member/enrollment/leave/delete handlers,
  and organization logo update helper moved from
  `crates/server/src/routes/projects.rs` into
  `crates/server/src/routes/projects/organizations.rs`; route registration
  remains in the parent project route module. This preserves organization
  directory/detail/admin/settings/member mutation, enrollment, leave, and delete
  behavior covered by
  `rest_contract::rest_organization_routes_cover_directory_views_and_membership_mutations`,
  `org_project_contract::organization_admin_mutations_add_accept_promote_and_delete_members`,
  and
  `org_project_contract::organization_enrollment_mutations_toggle_guest_request_state`.
- 2026-06-20 build/check diet note: project member REST DTOs, member directory
  projection, role options, owner guard, and read/add/update/delete handlers
  moved from `crates/server/src/routes/projects.rs` into
  `crates/server/src/routes/projects/members.rs`; route registration remains in
  the parent project route module, and the parent re-export keeps the legacy
  workspace leave alias on the same delete helper. This preserves project
  member directory, add, role update, self-leave/delete authorization, private
  self-leave response, and direct `/info/leave/:owner/:project` redirect
  behavior covered by
  `project_members_contract::project_member_management_preserves_legacy_add_role_delete_guards`,
  `project_members_contract::project_member_self_leave_private_project_does_not_leak_directory`,
  and
  `project_members_contract::direct_legacy_info_leave_route_removes_current_user_and_redirects_to_profile_projects`.
- 2026-06-20 build/check diet note: project fork REST DTOs, fork owner-option
  projection, fork options response, target-owner authorization, and
  repository-clone fork creation handler moved from
  `crates/server/src/routes/projects.rs` into
  `crates/server/src/routes/projects/forks.rs`; route registration remains in
  the parent project route module. This preserves fork options, owner
  selection, bare repository cloning, origin persistence, manager membership,
  and duplicate-name rejection covered by
  `project_fork_contract::project_fork_clones_bare_repository_and_records_origin`.
- 2026-06-20 build/check diet note: project transfer REST DTOs, transfer
  response projection, transfer request/mail handler, and direct accept-link
  handler moved from `crates/server/src/routes/projects.rs` into
  `crates/server/src/routes/projects/transfers.rs`; route registration remains
  in the parent project route module, and the shared project-update guard stays
  parent-owned for webhooks/change-vcs reuse. This preserves transfer form
  authorization, transfer request validation, mail outbox payload, accept-link
  recipient authorization, moved project alias behavior, and transfer row
  acceptance covered by
  `project_transfer_contract::project_transfer_requests_and_accept_link_follow_legacy_permissions`.
- 2026-06-20 build/check diet note: project change-vcs response DTO,
  next-vcs projection, repository storage delete/reset helpers, and change-vcs
  read/mutation handlers moved from `crates/server/src/routes/projects.rs` into
  `crates/server/src/routes/projects/vcs.rs`; route registration remains in the
  parent project route module, repository deletion stays crate-re-exported for
  site-admin project deletion, and repository reset stays parent-visible for
  Subversion project creation. This preserves change-vcs authorization,
  Git/SVN repository reset behavior, svnadmin availability handling, and storage
  deletion helper reuse covered by
  `project_change_vcs_contract::project_change_vcs_follows_legacy_update_gate_and_resets_repository`.
- 2026-06-20 build/check diet note: project home container response DTOs,
  dashboard projection, legacy activity/Git commit history projection, README
  lookup/link rewrite, and README mention-reference enrichment moved from
  `crates/server/src/routes/projects.rs` into
  `crates/server/src/routes/projects/home.rs`; route registration remains in the
  parent project route module. This preserves home container dashboard labels,
  README rendering metadata, and legacy home history behavior covered by
  `org_project_contract::rest_project_container_includes_git_readme_with_legacy_readme_link_rewrites`,
  `org_project_contract::rest_project_container_includes_dashboard_open_issue_counts_by_label`,
  and
  `org_project_contract::rest_project_container_includes_legacy_project_home_history_rows`.
- 2026-06-20 build/check diet note: project participation proto helpers, REST
  adapters, and direct watch aliases for enroll/cancel-enroll/favorite/
  recent-visit/watch moved from `crates/server/src/routes/projects.rs` into
  `crates/server/src/routes/projects/participation.rs`; parent route
  registration imports only the REST/direct adapters, while the service
  re-export boundary still exposes the same proto-compatible helpers. This
  preserves project enrollment request/cancel, favorite toggle, recent project
  visit recording, watch toggle, direct watch aliases, and workspace recent
  project reuse covered by
  `org_project_contract::project_detail_enrollment_favorites_recent_and_workspace_overview_round_trip`,
  `org_project_contract::toggle_project_watch_returns_refreshed_project_container`,
  and `rest_contract::rest_workspace_routes_manage_overview_settings_and_recent_projects`.
- 2026-06-20 build/check diet note: project milestone REST adapter DTOs and
  list/read/create/update/delete/state route handlers moved from
  `crates/server/src/routes/issues.rs` into
  `crates/server/src/routes/issues/milestones.rs`; route registration remains
  in the parent issue route module, and adapters continue delegating to the
  project milestone service helpers. This preserves milestone REST CRUD,
  default list query handling, and open/close state mutation behavior covered by
  `rest_contract::rest_milestone_routes_manage_crud_and_state`.
- 2026-06-20 build/check diet note: issue lookup/autocomplete DTOs and handlers
  for parent-options, project/issue assignable users, sharable users, mention
  users, and project issue references moved from
  `crates/server/src/routes/issues.rs` into
  `crates/server/src/routes/issues/lookups.rs`; route registration remains in
  the parent issue route module, and the issue-reference origin resolver remains
  crate-re-exported for markdown reference expansion. This preserves
  assignable-user defaults, mention search ACL filtering, and fork-origin issue
  reference lookup covered by
  `issue_assignable_contract::issue_assignable_users_blank_query_preserves_legacy_pseudo_rows`,
  `issue_mention_contract::issue_mention_contract_suggests_contextual_users_and_filters_private_search`,
  and
  `issue_reference_autocomplete_contract::issue_reference_autocomplete_contract_searches_readable_origin_for_forks`.
- 2026-06-20 build/check diet note: site-admin update status, download
  redirect, download-file proxy, metadata discovery, plain HTTP/chunked
  decoding, HTTPS fetch command construction, and the related unit test moved
  from `crates/server/src/routes/site_admin.rs` into
  `crates/server/src/routes/site_admin/update.rs`; REST/direct route
  registration remains in the parent site-admin route module. This preserves
  legacy update availability branches, app-owned download redirects, configured
  plain HTTP binary proxying, and HTTPS fetch command parsing covered by
  `site_admin_contract::site_admin_update_download_file_proxies_configured_plain_http_binary`
  and the module unit
  `site_update_https_fetch_command_preserves_quoted_override`.
- 2026-06-20 build/check diet note: pull-request review comment DTO, REST
  create/update/delete handlers, review-thread open/close handler, and legacy
  direct review-thread state alias moved from
  `crates/server/src/routes/pull_requests.rs` into
  `crates/server/src/routes/pull_requests/review_comments.rs`; route
  registration and PR detail/list projections remain in the parent module. This
  preserves review comment creation, edit/delete authorization, thread state
  mutation, direct legacy review-thread aliases, and webhook/event side effects
  covered by
  `pull_request_mutation_contract::pull_request_interaction_surface_mutates_state_review_comments_threads_and_events`.
- 2026-06-20 build/check diet note: legacy external board posting JSON body
  parsers, import/content/comment/label handlers, legacy comment update handler,
  and legacy posting payload projection helpers moved from
  `crates/server/src/routes/boards.rs` into
  `crates/server/src/routes/boards/legacy_external.rs`; direct and REST board
  route registration remains in the parent module. This preserves legacy board
  post import, imported-author creation, content conflict handling, comment
  creation/update, attachment assignment, and label update behavior covered by
  `board_contract::legacy_external_board_post_create_and_content_routes_follow_legacy_json_shape`.
- 2026-06-20 build/check diet note: legacy external favorite project/issue/
  organization list and toggle handlers moved from
  `crates/server/src/routes/workspace.rs` into
  `crates/server/src/routes/workspace/legacy_favorites.rs`; direct route
  registration remains in the parent workspace route module. This preserves
  legacy favorite issue list/toggle response shape and read-ACL checks covered
  by
  `user_issue_favorite_contract::favorite_issue_toggle_updates_issue_detail_and_rejects_unreadable_issues`,
  with project and organization favorite routes remaining on the same moved
  legacy favorites boundary.
- 2026-06-24 fragment conversion note: legacy direct
  `/user/usermenuTabContentList` and `/user/sidebar` now return API payloads
  used by the React root sidebar instead of server-rendered HTML fragments.
  `/user/sidebar` preserves the legacy `path`/`hash` target as `iframePath`
  metadata for React-owned rendering. Coverage:
  `auth_workspace_contract::direct_legacy_usermenu_tab_content_list_returns_workspace_api_payload`
  and
  `auth_workspace_contract::direct_legacy_user_sidebar_returns_api_payload`.
- 2026-06-25 fragment conversion continuation: legacy direct
  `/notification?from=...` is split by request intent: JSON/API consumers get
  the notification payload, while browser HTML navigation serves the React SPA
  shell instead of a server-rendered partial. Legacy direct
  `POST /markdown/:owner/:project` validates project read access and returns
  `{bodyMarkdown, breaks}` JSON so preview rendering stays React-owned; it no
  longer returns server-rendered Markdown HTML. Coverage:
  `notification_contract::notification_contract_direct_notification_route_returns_api_payload`,
  `notification_contract::notification_contract_direct_notification_html_accept_serves_spa_shell`,
  `markdown_contract::legacy_markdown_preview_route_returns_markdown_source_for_react`,
  `markdown_contract::legacy_markdown_preview_route_preserves_breaks_flag`, and
  `markdown_contract::legacy_markdown_preview_route_does_not_server_render_autolinks`.
- 2026-06-20 scalar parity note: browser runtime config now injects the
  configured legacy site name as `siteName`, and the notification welcome guide
  renders the legacy `app.welcome = Tada! Welcome to {0}!` plus
  `app.description` message text from that runtime value instead of exposing the
  raw message keys or hard-coding `Yona`. `frontend/src/routes/index.tsx` and
  `frontend/src/routes/notification/route.tsx` document titles also use the same
  runtime site name with the legacy `Yona` default, matching
  `index/notifications.scala.html` use of `utils.Config.getSiteName`.
  Verification passed with
  `pnpm --dir frontend exec vitest run src/runtime-config.spec.ts src/route-parity.spec.tsx`
  and
  `pnpm agent:cargo-test -- --outside-sandbox -p yoram-server --test assets_contract embedded_assets_support_base_path_injection_and_spa_fallback`.
- 2026-06-20 build/check diet note: release-only stale `_pilot` debug facade
  exports are now gated behind `debug_assertions` while the production REST and
  direct legacy routes keep their existing module-local handlers. This is
  behavior-neutral for app-facing parity and removes release-image dead-code
  warnings found by `pnpm smoke:docker`; `_pilot` debug facade behavior remains
  compiled and covered in debug/test builds. Verification passed with
  `pnpm agent:cargo -- --outside-sandbox build --release -p yoram-server`
  without warning lines, `pnpm agent:cargo -- --outside-sandbox check -p yoram-server --tests`,
  `pnpm smoke:embedded-assets`, `pnpm smoke:docker`, and focused
  `auth_workspace_contract::register_requires_confirmation_session_from_runtime_config_without_env_mutation`.
- 2026-06-20 runtime DI note: persistence `AppRepository::new` now creates an
  empty `RepositoryConfig` snapshot instead of reading process env at repository
  construction time. Legacy scalar toggles such as guest login prefixes and
  notification draft windows remain available through explicit
  `AppRepository::new_with_config` injection; tests that need those toggles now
  pass per-test config snapshots rather than mutating global env guarded by a
  mutex. This preserves guest-prefix signup and notification draft merge
  behavior while avoiding process-global config reads in the repository layer.
- 2026-06-20 runtime DI note: file upload/download/delete storage now receives
  the configured Yona data root through `AppRuntimeConfig` and the router
  `RuntimeRegistry` instead of reading `YONA_DATA` at request time. Startup
  config still exports `YONA_DATA` as a temporary compatibility bridge for VCS
  paths that are not yet migrated, while file route tests inject a per-test
  data root snapshot and assert the uploaded blob lands under that root. This
  preserves legacy `/files` behavior and moves the file storage slice away from
  process-global runtime config.
- 2026-06-20 runtime DI note: project create/delete/change-vcs/fork storage
  paths and project container README/history reads now use `PilotServiceImpl`'s
  `data_root` snapshot instead of calling `YONA_DATA` at request time. Focused
  project delete, change-vcs, and fork contract tests inject per-test data
  roots through `AppRuntimeConfig`, removing their `YONA_DATA` mutex guards
  while preserving legacy repository provisioning, cleanup, VCS reset, and fork
  clone behavior.
- 2026-06-20 runtime DI note: Smart HTTP git backend routing now receives the
  router `data_root` snapshot through asset fallback dispatch instead of
  resolving `YONA_DATA` inside the request handler. The smart-http contract
  suite injects per-test data roots through `AppRuntimeConfig` and no longer
  serializes on a global `YONA_DATA` mutex, preserving upload-pack,
  receive-pack, authenticated push, and legacy post-receive side effects.
- 2026-06-20 runtime DI note: SVN protocol dispatch now receives the same
  router `data_root` snapshot through asset fallback dispatch instead of
  resolving `YONA_DATA` inside the request handler. Focused SVN route/auth and
  executable file-read contracts inject per-test data roots through
  `AppRuntimeConfig`, preserving legacy DAV headers, project ACL handling, and
  svnlook-backed repository file reads while reducing global env serialization.
- 2026-06-20 runtime DI note: board README sync and online commit helpers now
  receive the board REST route's app-scoped `data_root` snapshot instead of
  resolving `YONA_DATA` while finding Git repositories. The board contract
  injects per-test data roots through `AppRuntimeConfig` for README commits,
  issue-template commits, online file edits, ACL/watch/comment coverage, and
  concurrent post-number allocation, preserving legacy board VCS behavior while
  removing the board-level global env lock.
- 2026-06-20 runtime DI note: code browser, history, commit detail, compare,
  branch list/mutation, direct raw/open/image/archive, and legacy AJAX code
  routes now resolve Git repositories from the app-scoped `data_root` snapshot
  instead of `YONA_DATA`. The code browser contract injects per-test data roots
  through `AppRuntimeConfig` for REST, RPC, and direct legacy code paths,
  removing the code-browser runtime config mutex while preserving legacy Git
  repository layout and branch/commit/file behavior.
- 2026-06-20 runtime DI note: pull-request form options, merge preview, merge
  accept, source-branch delete/restore, changes diff, pushed-branch projection,
  detail source-branch state, and review-comment detail projections now use the
  app-scoped `data_root` snapshot instead of `YONA_DATA` for Git repository
  lookup. The pull-request mutation contract injects per-test data roots through
  `AppRuntimeConfig`; its remaining test lock is only for the process-global
  webhook outbox, not runtime config.
- 2026-06-20 runtime DI note: legacy runtime `/_init` repository provisioning
  and `/_import` Git clone storage now receive `RuntimeRegistry.data_root`
  through route registration instead of resolving `YONA_DATA` inside handlers.
  The project transfer contract now injects its per-test data root through
  `AppRuntimeConfig`, preserving transfer mail behavior while removing the
  project-transfer runtime config mutex.
- 2026-06-20 runtime DI note: uploaded-file path resolution no longer exposes
  an env-backed `uploaded_file_path` compatibility wrapper or `state::yona_data_root`.
  Site-admin export/import attachment storage now receives the app-scoped
  `data_root` through `PilotServiceImpl`, while legacy `/_init` and file route
  tests inject per-test data roots through `AppRuntimeConfig`. The only
  remaining `YONA_DATA` references are startup/config loading plus the temporary
  startup compatibility bridge for legacy surfaces not covered by this runtime
  DI slice.
- 2026-06-20 runtime DI note: organization/project contract tests now inject
  per-test repository storage through `AppRuntimeConfig.data_root` instead of
  mutating `YONA_DATA` under a process-global mutex. This keeps legacy project
  import, create, SVN provisioning, container, organization, and directory
  parity coverage isolated without runtime config env locks.
- 2026-06-20 runtime DI note: issue core webhook contract tests now inject
  per-test repository storage through `AppRuntimeConfig.data_root` instead of
  mutating `YONA_DATA` under `yona_data_env_lock`. The legacy issue body,
  mutation, mass-update, and delete webhook parity checks stay on the same
  route/API coverage while removing runtime config env serialization.
- 2026-06-20 runtime DI note: project webhook contract tests now inject
  per-test repository storage through `AppRuntimeConfig.data_root` instead of
  mutating `YONA_DATA` under `yona_data_env_lock`. The remaining serialization
  in that contract is scoped to the shared test webhook outbox, not runtime
  config, while board/issue webhook payload, retry, hangout-thread, and CRUD
  parity coverage remains unchanged.
- 2026-06-20 runtime DI note: search contract tests now inject per-test
  repository storage through `AppRuntimeConfig.data_root` instead of mutating
  `YONA_DATA` under the async `yona_data_env_lock`. Global/project issue,
  posting, milestone, comment, review, user, and project search parity
  assertions remain unchanged while runtime config env serialization is removed.
- 2026-06-20 runtime DI note: SVN protocol contract tests now inject per-test
  repository storage through `AppRuntimeConfig.data_root` instead of mutating
  `YONA_DATA` under `yona_data_env_lock`. Existing executable availability
  skips, external SVN client smoke coverage, WebDAV REPORT/PROPFIND/LOCK/write
  parity assertions, and repository path checks stay unchanged.
- 2026-06-20 runtime DI note: auth/workspace contract tests no longer clear
  auth UI process env vars to force default signup/email-verification/social
  login behavior. Those tests rely on explicit `AppRuntimeConfig::default()`
  router construction. SMTP sender and site-name mail route checks now assert
  the injected `AppRuntimeConfig` behavior directly without mutating
  `SMTP_FROM` or `YONA_SITE_NAME`; shared mail delivery assertions serialize
  only the test outbox through `auth_outbox_lock`.
- 2026-06-20 runtime DI note: site-admin SMTP contract tests now assert mail
  option and sender derivation from explicit `AppRuntimeConfig.smtp` snapshots
  instead of mutating SMTP/YONA_SMTP process env aliases around route setup.
  Site-admin mail send, recipient lookup, configured/unconfigured option
  states, sender domain/hostname fallback, and from override coverage remain
  route-level parity checks without `smtp_env_lock`.
- 2026-06-20 runtime DI note: notification mail contract tests now use startup
  snapshot maps and explicit `NotificationMailDeliveryConfig` values for
  scheduler and delivery behavior instead of mutating `SMTP_FROM` or
  notification mail env vars around test execution. The remaining
  serialization is scoped to the shared test mail outbox through
  `notification_outbox_lock`.
- 2026-06-20 runtime DI note: project transfer mail contract tests now assert
  the transfer request sender from explicit `AppRuntimeConfig.smtp` and no
  longer mutate `SMTP_FROM` around the transfer flow. The transfer form,
  request mail, direct accept link, permission, alias, and repository move
  parity checks remain in the same contract with only test outbox serialization.
- 2026-06-21 runtime DI note: search REST routes, generic legacy comment
  deletion, notification list/watch/unwatch routes, issue lookup/label/legacy
  external child routes, and project milestone/transfer-accept direct handlers
  now receive the app-scoped `PilotServiceImpl` snapshot instead of separately
  threaded session/backend/base-path fragments. Existing route contracts keep
  the same legacy URLs, redirect/status behavior, and payload shapes while
  narrowing the remaining service-fragment threading queue.
- 2026-06-21 runtime DI note: board REST/direct posting routes, workspace
  direct aliases, users legacy external routes, issue comment create/update/
  delete/vote routes, and project label/mention/markdown/go/watchers direct
  helpers now read session/backend/base-path state through `PilotServiceImpl`
  instead of separately threaded route fragments. Focused board, workspace,
  user, issue comment, and project mention/go/label contracts preserve the
  same legacy URLs, redirect/status behavior, and payload shapes.
- 2026-06-23 runtime config note: the remaining analytics/custom-user-menu
  deferred slice is closed against legacy `Application.SEND_YONA_USAGE`,
  `layout.scala.html`, `layout_framed.scala.html`, and
  `common/usermenu.scala.html`. Rust startup config accepts
  `YONA_SEND_YONA_USAGE` plus the legacy `application.send.yona.usage` alias
  with legacy default `true`; asset HTML serving injects the legacy GA snippet
  at the layout boundary and suppresses it when disabled. Rust startup/browser
  runtime config also projects `application.navbar.custom.link.name/url`
  through `YONA_NAVBAR_CUSTOM_LINK_NAME/URL`, and the React root renders the
  authenticated `gnb-usermenu` custom link only when the configured name is
  nonblank. The 2026-06-23 curl-based homelab HTML audit also found the legacy
  logged-in root layout includes the site-admin `admin-logged-in-affix` user-menu
  link to `/sites/userList`; the React root now renders that affix for
  `currentSession.isSiteAdmin`, and `pnpm smoke:legacy-anchor-coverage` covers
  104 curl-observed anchors with zero missing Rust source/spec evidence after
  the 2026-06-25 rerun restored `admin-logged-in-affix` source evidence.
  Focused coverage: `runtime_config_contract`, `assets_contract`,
  `frontend/src/runtime-config.spec.ts`,
  `frontend/src/root-custom-navbar-link.spec.ts`, and
  `frontend/src/auth-workspace-shell.spec.tsx`.
- 2026-06-25 Playwright route-sweep note: authenticated Chrome sweep over 36
  user-visible local routes under `/yona` now reports zero smoke blockers
  after fixing direct legacy GET navigation for `/_import`, `/notification`,
  `/sites/mail`, `/:owner/:project/members`, `/:owner/:project/milestones`,
  and `/:owner/:project/labels`; preserving JSON/POST behavior for existing
  direct APIs; preventing `/admin/{projects,users,mail,site,sql}` from being
  misread as project routes; and resolving the visible raw legacy message keys
  found in the sweep. Evidence artifact path during the run:
  `output/playwright/route-sweep-20260625/local-report-final3-authenticated.json`
  with `badCount: 0`; generated screenshots were not committed. The homelab
  legacy URL `http://192.168.45.10:9000` remained reachable via curl, but
  Playwright Chrome in that execution environment returned
  `net::ERR_ADDRESS_UNREACHABLE` even with `--no-sandbox`, so that run's
  browser sweep was local Yoram only and the legacy comparison remained a
  follow-up for an environment whose browser could reach that LAN host. The
  current default legacy parity baseline is now the localhost instance at
  `http://127.0.0.1:9000`. Visual inspection also showed project subpages such
  as milestones still look much plainer than legacy even when the smoke
  heuristics pass; that is tracked as UX diff work rather than a routing/CSS-load
  blocker.
- 2026-06-25 project chrome CSS note: the React project pages now reuse the
  legacy project header/menu/page/milestone chrome styles from
  `yona-original/app/assets/stylesheets/less/_page.less` for the existing
  `ProjectHeader`, `ProjectMenu`, `.project-page-wrap`, `.filter-wrap`,
  `.error-wrap`, and `.milestones` class surface. Focused Playwright evidence
  on `/yona/pilot/yona/milestones` showed the legacy-sized 120px header, 39px
  menu bar, non-overlapping keymap button, and styled empty milestone state.

## Wave 0 Exit Snapshot

- `frontend` route foundation now resolves legacy home, canonical auth GET surfaces, public directories, search, site admin, and anchored org/project deep links through the file-route tree under `src/routes/**`.
- 2026-06-25 initial site-admin bootstrap closeout: legacy `Global.getConfigSecretAction`, `welcome/secret.scala.html`, `welcome/restart.scala.html`, `SiteAdmin.SITEADMIN_DEFAULT_LOGINID`, and `SiteAdmin.updateDefaultSiteAdmin` map to React SPA `/secret` and `/restart`, REST JSON `POST /api/v1/auth/secret`, and legacy direct `POST /secret` fallback. The React screen preserves the legacy `.secret-wrap`, `.secret-box`, readonly `loginId=admin`, footer provider, and visible `app.welcome.*`, `app.restart.*`, `user.signupId`, `user.name`, `user.email`, `user.password`, and `validation.retypePassword` message keys. Fresh Rust DBs may lack legacy initial-data's default `admin` row, so the repository creates that account as site-admin when absent and updates it when present. Focused coverage: `auth_workspace_contract::secret_admin_setup_rest_updates_legacy_default_admin_and_redirect_fallback_remains`, `frontend/src/route-parity.spec.tsx`, `frontend/src/i18n.spec.tsx`, and `pnpm --dir frontend build`.
- Local repo-root dev startup now defaults to `/` while keeping explicit `/yona` mounted smoke coverage available; this follows legacy Yona's configurable `application.context` intent instead of hard-coding a subdirectory mount for every local run.
- Browser runtime config now preserves legacy `application.langs` through `YONA_LANGS` as `supportedLanguages`, retaining the legacy default `en-US, ko-KR, ja-JP, ru-RU, uz-UZ`. 2026-06-21 P4-A adds a bounded frontend language runtime that normalizes configured languages to the legacy message dictionaries, exposes `language`/`setLanguage`/`messages` through `AppRuntimeContext`, initializes from browser-preferred languages, and switches auth/runtime shell message lookup without route reload while preserving current fallback copy for missing keys. P4-A continuation persists authenticated users' `User.lang` from legacy `PLAY_LANG` / `Accept-Language` request context on register/sign-in/OAuth callback/session reads without adding a visible selector. P4-A-I18n continuation opts the existing project navigation/keymap shell into the same lookup boundary for legacy `projectMenu.scala.html` and `help/keymap.scala.html` keys including `title.projectHome`, `menu.code`, `menu.issue`, `menu.pullRequest`, `menu.review`, `milestone`, `menu.board`, `menu.admin`, `title.keymap`, `project.projects`, shortcut button labels, `site`, `site.search`, and `search.menu.issue.comments`; missing dictionary entries such as `title.boardDetail` keep their exact prior key-text fallback. P4-A-OrgWorkspaceI18n opts the existing `/me` workspace and `/:user` public profile top-level stream tabs from `user/view.scala.html` (`menu.issue`, `menu.pullRequest`, `project.projects`) into the same `AppRuntimeContext` message lookup while preserving literal key fallback when no provider is present. P4-A-OrgI18n opts the existing organization menu/header/settings-tab shells from `organization/menu.scala.html`, `organization/header.scala.html`, and `organization/partial_settingmenu.scala.html` into the same lookup boundary for `title.organizationHome`, `menu.issue`, `menu.board`, `menu.pullRequest`, `menu.admin`, enrollment title/help/button labels, `organization.settingFrom`, `organization.member`, and `organization.delete`, preserving literal key fallback when no provider is present and adding dictionary entries only where present in legacy `conf/messages*`. P4-A-SearchI18n opts the existing global/organization/project search tab and shell labels from `search/partial_search.scala.html` and `SearchApp` into the same lookup boundary for `title.search`, `search.menu.*`, `search.result.title`, `issue.noAuthor`, `label.dueDate`, and pagination labels while preserving literal key fallback without a provider; Japanese search-menu/result keys remain absent because they are not present in `messages.ja-JP` and therefore use the existing default/fallback behavior. P4-A-SiteAdminI18n opts the existing site-admin shell/sidebar/top-level asserted labels from `site/siteMngLayout.scala.html`, `site/userList.scala.html`, `site/projectList.scala.html`, `site/postList.scala.html`, `site/issueList.scala.html`, `site/mail.scala.html`, `site/massMail.scala.html`, `site/data.scala.html`, `site/update.scala.html`, and `site/diagnostic.scala.html` into the same lookup boundary for `site.sidebar*`, user/project headers/placeholders/tabs/actions, mail/mass-mail labels, data/update/diagnostic status labels, modal close/yes/no labels, and pagination labels while preserving literal key fallback or prior dynamic scalar fallback without a provider. P4-A-IssueBoardPrMilestoneI18n opts the existing project issue list, board list, PR list, and milestone list/detail/form controls into the same lookup boundary for known `issue.*`, `post.*`, `pullRequest.*`, `milestone.*`, `common.order.*`, `label.*`, and `button.*` keys while preserving literal key fallback without a provider and without adding selector/settings UI. Evidence read: `yona-original/conf/application.conf.default`, `yona-original/conf/messages*`, `Application.jsMessages()`, `User.lang`, `User.getPreferredLanguage()`, `UserApp.loginByFormRequest`, `UserApp.loginByAjaxRequest`, `UserApp.updatePreferredLanguage`, `yona-original/app/views/projectMenu.scala.html`, `yona-original/app/views/help/keymap.scala.html`, `yona-original/app/views/user/view.scala.html`, `yona-original/app/views/common/usermenu.scala.html`, `yona-original/app/views/common/usermenu_tab_content_list.scala.html`, `yona-original/app/views/common/mySeriesMenuTab.scala.html`, `yona-original/app/views/organization/menu.scala.html`, `yona-original/app/views/organization/header.scala.html`, `yona-original/app/views/organization/view.scala.html`, `yona-original/app/views/organization/setting.scala.html`, `yona-original/app/views/organization/members.scala.html`, `yona-original/app/views/organization/deleteForm.scala.html`, `yona-original/app/views/organization/partial_settingmenu.scala.html`, `yona-original/app/views/search/result.scala.html`, `yona-original/app/views/search/partial_search.scala.html`, `yona-original/app/controllers/SearchApp.java`, `yona-original/app/views/site/*.scala.html`, `yona-original/app/views/issue/partial_list_wrap.scala.html`, `yona-original/app/views/issue/partial_list_quicksearch.scala.html`, `yona-original/app/views/issue/partial_searchform.scala.html`, `yona-original/app/views/board/list.scala.html`, `yona-original/app/views/git/partial_search.scala.html`, `yona-original/app/views/git/partial_list.scala.html`, `yona-original/app/views/milestone/list.scala.html`, `yona-original/app/views/milestone/view.scala.html`, `yona-original/app/views/milestone/create.scala.html`, `yona-original/app/views/milestone/edit.scala.html`, `reference/mixed-code/apps/app/src/components/parity-shells.tsx`, and the absence of a legacy language settings/selector surface beyond translation buttons. Remaining follow-up: app-wide message-key opt-in for other existing controls where legacy keys/copy are known.
- P4-A-WorkspaceSettingsI18n opts the existing `/user/editform/**` settings controls from `user/edit.scala.html`, `edit_password.scala.html`, `edit_emails.scala.html`, `edit_notifications.scala.html`, `edit_token.scala.html`, and `partial_edit_tabmenu.scala.html` into the `AppRuntimeContext`/legacy message lookup boundary for known `userinfo.*`, `user.*`, `emails.*`, `site.resetPasswordEmail.*`, and shared `button.*` labels while preserving literal key fallback without a provider. Evidence read: `yona-original/app/views/user/edit.scala.html`, `yona-original/app/views/user/edit_password.scala.html`, `yona-original/app/views/user/edit_emails.scala.html`, `yona-original/app/views/user/edit_notifications.scala.html`, `yona-original/app/views/user/edit_token.scala.html`, `yona-original/app/views/user/partial_edit_tabmenu.scala.html`, and `yona-original/conf/messages*`. Remaining follow-up: project settings/member/webhook/transfer/delete/change-VCS and code/review controls where known legacy keys or copy still render literally.
- P4-A-ProjectSettingsI18n opts the existing project settings/member/webhook/transfer/delete/change-VCS controls from `project/setting.scala.html`, `members.scala.html`, `webhooks.scala.html`, `partial_webhooks_list.scala.html`, `transfer.scala.html`, `delete.scala.html`, `change_vcs.scala.html`, and `partial_settingmenu.scala.html` into the `AppRuntimeContext`/legacy message lookup boundary for known `project.*`, `issue.label`, `button.*`, and related labels/placeholders while preserving literal key fallback without a provider. Evidence read: those project templates plus `yona-original/conf/messages*`. Focused coverage: `frontend/src/project-settings-parity.spec.tsx`.
- P4-A-LabelSettingsI18n opts the existing issue label/category settings controls from `project/issuelabels.scala.html` and `project/partial_issuelabels_list.scala.html` into the same lookup boundary for known `label.*`, `project.owner`, `project.name`, and shared `button.*` labels/placeholders while preserving literal key fallback without a provider. Evidence read: those project label templates plus `yona-original/conf/messages*`. Focused coverage: `frontend/src/issue-label-settings-i18n.spec.tsx`.
- P4-A-CodeReviewI18n opts the existing code browser/history/branch/compare/commit and PR detail/change review controls from `code/view.scala.html`, `code/partial_view_file.scala.html`, `code/branches.scala.html`, `code/diff.scala.html`, `git/view.scala.html`, `git/viewChanges.scala.html`, `common/reviewForm.scala.html`, and `common/commentUpdateForm.scala.html` into the same lookup boundary for known code, branch, diff, pull-request review, reviewer, and shared button labels while preserving literal key fallback without a provider. Evidence read: those code/review templates plus `yona-original/conf/messages*`. Focused coverage: `frontend/src/project-code-browser-routing.spec.ts` and `frontend/src/pull-request-review-i18n.spec.tsx`.
- P4-A-PrListFormReviewI18n opts PR/review route loading shells plus the remaining PR list, recently-pushed branch prompt, PR create/edit form, merge-result commit table, and project review-list controls from `git/list.scala.html`, `git/partial_search.scala.html`, `git/partial_recently_pushed_branches.scala.html`, `git/create.scala.html`, `git/edit.scala.html`, `reviewthread/list.scala.html`, and `reviewthread/partial_list.scala.html` into the same lookup boundary for known `pullRequest.*`, `review.*`, `title.*`, `code.*`, `issue.downloadAsExcel`, and shared pagination/loading labels while preserving literal key fallback without a provider. Evidence read: those PR/review templates plus `yona-original/conf/messages*`. Focused coverage: `frontend/src/pull-request-list-form-review-i18n.spec.tsx`. Remaining follow-up: app-wide message-key opt-in for other controls where legacy keys/copy are known.
- P4-A-AuxiliaryRouteI18n opts remaining known-key auxiliary controls in project/organization directory pages, the anonymous home feature panel, notification welcome/my-series tabs, user files tabs/search, organization create/settings/member/delete helpers, project create/import/home/dashboard/watcher/fork helpers, board detail/comment helpers, issue detail/form side controls, and milestone detail/form helpers into the same lookup boundary while preserving exact key-text fallback without a provider and without adding a selector/settings UI. Evidence read: `yona-original/conf/messages*`, `index/partial_intro.scala.html`, `index/notifications.scala.html`, `index/partial_notifications.scala.html`, `common/mySeriesMenuTab.scala.html`, `user/userFiles.scala.html`, and the organization/project/board/issue/milestone templates already listed in the P4-A slices above. Focused coverage: `frontend/src/directory-home-user-files-notification-i18n.spec.tsx`, plus the full `pnpm --dir frontend test` suite.
- P4-A-RouteLoadingShellI18n opts the next remaining project/org route loading shells into `AppRuntimeContext.messages("common.loading", { fallback: "common.loading" })` without changing layout or adding UI. Covered shells are project code/history/branches/compare/commit, issue list/form/detail/edit/labels, board post list/form/detail/edit, milestone list/form/detail/edit, project settings/member/webhook/transfer/delete/change-VCS/statistics, and organization issue/board/member/settings/delete route shells. Evidence read: `yona-original/conf/messages*` for `common.loading = Loading` / `불러오는 중` and the corresponding legacy code, issue, board, milestone, project, and organization templates already listed in the P4-A slices above. Focused coverage: `frontend/src/project-code-browser-routing.spec.ts`, `frontend/src/issue-board-pr-milestone-i18n.spec.tsx`, and `frontend/src/project-settings-parity.spec.tsx`. Later loading-shell continuations below close the remaining public/user/auth/import/notification, project fork, site-admin, and PR detail/change shells.
- P4-A-RemainingRouteLoadingShellI18n opts the next bounded public/user/auth/import/notification/new project/org/fork route loading shells into legacy message lookup without changing layout or adding UI. Covered shells are shared redirect, `/me`, public `/:user`, `/notification`, `/projects/new`, `/projectform`, `/organizations/new`, `/_import`, `/restricted`, `/users/loginform`, `/users/signupform`, `/user/issues`, `/user/issues/new`, `/user/files`, `/user/editform/**`, and `/:owner/:projectName/newFork`. Full-page shells use `AppRuntimeContext.messages("common.loading", { fallback: "common.loading" })`; the shared redirect uses `useLegacyMessages().t(...)`; the notification bootstrapping placeholder keeps its `warning-none` wrapper while resolving the same key. Evidence read: `yona-original/conf/messages*` for `common.loading = Loading` / `불러오는 중`, legacy routes for `/notifications`, `/_import`, `/organizations/new`, `/user/issues`, `/user/issues/new`, `/user/files`, `/users/loginform`, `/users/signupform`, `/notification`, `/projectform`, and `/:ownerName/:project/newFork`, plus the corresponding user/project/organization/git templates already listed in the P4-A slices above. Focused coverage: `frontend/src/user-profile-route-loading-shell-i18n.spec.tsx`. Remaining literal route-loading scope after the site-admin and PR continuations below: none found.
- P4-A-SiteAdminLoadingShellI18n opts the remaining site-admin internal read-failure loading shells in `frontend/src/routes/sites/$pageName/route.tsx` into the existing site-admin route/runtime legacy message lookup for `common.loading`, preserving the exact `common.loading` fallback and the existing forbidden/not-found/bad-request route error behavior. Evidence read: `yona-original/conf/messages*` for `common.loading = Loading` / `불러오는 중` and legacy `site/siteMngLayout.scala.html`, `site/userList.scala.html`, `site/projectList.scala.html`, `site/postList.scala.html`, `site/issueList.scala.html`, `site/mail.scala.html`, `site/massMail.scala.html`, `site/data.scala.html`, `site/update.scala.html`, and `site/diagnostic.scala.html`. Focused coverage: `frontend/src/site-admin-route-parity.spec.tsx`. Remaining literal route-loading scope after the site-admin and PR continuations below: none found.
- P4-A-PullRequestRouteLoadingShellI18n opts the PR detail/change route bootstrapping shells into legacy message lookup without changing layout or adding UI. Covered shells are `/:owner/:projectName/pullRequest/:pullRequestNumber` and `/:owner/:projectName/pullRequest/:pullRequestNumber/changes`, matching the existing React `app-shell` fallback while resolving `common.loading` through `AppRuntimeContext.messages("common.loading", { fallback: "common.loading" })`. Evidence read: `yona-original/conf/messages*` for `common.loading = Loading` / `불러오는 중` / localized values and legacy PR templates `git/view.scala.html` plus `git/viewChanges.scala.html`. Focused coverage: `frontend/src/pull-request-route-loading-shell-i18n.spec.tsx`. Remaining literal route-loading scope after this final pass: none found by `rg '<h1>common.loading</h1>|warning-none\">common.loading' frontend/src/routes`.
- P4-A-WorkspaceHelpI18n opts the remaining workspace/public-profile auxiliary controls and anonymous help title into the same legacy message lookup boundary without changing layout or adding selector/settings UI. Covered workspace/profile keys come from `user/view.scala.html`, `user/partial_issues.scala.html`, `user/partial_pullRequests.scala.html`, `common/twoColumnModeCheckboxArea.scala.html`, `common/showSubtasksCheckbox.scala.html`, and `common/mySeriesMenuTab.scala.html`, including `userinfo.since`, `user.connected.social.login`, `userinfo.daysAgo.*`, `common.two.column.*`, `common.show.subtasks*`, `issue.noAuthor`, empty stream copy, default-login-page/favorite/recent/logout controls, and project/PR state labels. The `/_help` breadcrumb title now resolves `title.help` from `help/toc.scala.html`. Focused coverage: `frontend/src/workspace-profile-i18n.spec.tsx` and `frontend/src/help-route-parity.spec.tsx`.
- P4-A-SharedMarkdownIssueBoardOrgProjectI18n opts the shared Markdown editor/help shell plus remaining known issue, board, organization, and project controls into the same legacy message lookup boundary without changing layout or adding selector/settings UI. Covered Markdown keys come from `common/editor.scala.html` and related legacy comment forms, including `title.markdown.help` and `notification.receiver.list.title`; issue/board/project/organization keys come from the templates already listed in the P4-A slices above. The repo-root implementation surfaces are `frontend/src/routes/-markdown-renderer.tsx`, `frontend/src/routes/-issue-views.tsx`, `frontend/src/routes/-board-views.tsx`, `frontend/src/routes/-organization-views.tsx`, and `frontend/src/routes/-project-views.tsx`, with focused coverage in `frontend/src/markdown-renderer.spec.tsx`, `frontend/src/issue-board-pr-milestone-i18n.spec.tsx`, `frontend/src/organization-shell-i18n.spec.tsx`, and `frontend/src/project-settings-parity.spec.tsx`.
- P4-A-RouteMutationFallbackI18n opts remaining code and pull-request route mutation fallback keys into `AppRuntimeContext.messages(...)` while preserving exact key fallback and leaving legacy-key `useDocumentTitle(...)` calls unchanged where route-parity intentionally pins them as the title source. Covered routes include project branch/default-branch/delete, commit discussion mutation, PR create/edit, PR detail mutations, and PR changes inline review mutations. Focused coverage: `frontend/src/project-code-browser-routing.spec.ts` and `frontend/src/pull-request-list-form-review-i18n.spec.tsx`.
- 2026-06-23 R4 final known-key sweep wraps the remaining visible raw legacy
  keys found in board, issue, project, pull-request, shared Markdown editor,
  milestone, workspace, and auth route controls with the existing
  `legacyMessage`/`messages.t` lookup boundary. The sweep deliberately leaves
  no-provider fallback text and prop-key values alone where the owning helper
  already translates at render time. Focused coverage:
  `frontend/src/issue-board-pr-milestone-i18n.spec.tsx`,
  `frontend/src/issue-detail-shell.spec.tsx`, `frontend/src/route-parity.spec.tsx`,
  `frontend/src/project-settings-parity.spec.tsx`,
  `frontend/src/pull-request-review-i18n.spec.tsx`,
  `frontend/src/markdown-renderer.spec.tsx`,
  `frontend/src/workspace-profile-i18n.spec.tsx`, and
  `frontend/src/organization-shell-i18n.spec.tsx`.
- 2026-06-25 i18n key cleanup keeps PR list, issue weight, and restricted
  sample route copy aligned with legacy message evidence. Project PR list
  `common.two.column.*` and `pullRequest.review.closed` /
  `pullRequest.review.total` now resolve through the legacy message lookup
  instead of rendering raw temporary strings, the nonexistent
  `pullRequest.reviewers` key is not emitted, issue weight titles resolve the
  legacy `issue.weight` key before appending the legacy `Upvote` / `Down vote`
  suffix, and the restricted sample iframe no longer uses nonexistent
  `restricted.video` as if it were a legacy key. Evidence read:
  `yona-original/app/views/common/twoColumnModeCheckboxArea.scala.html`,
  `yona-original/app/views/git/partial_list.scala.html`,
  `yona-original/app/views/issue/view.scala.html`,
  `yona-original/app/views/restricted.scala.html`, and
  `yona-original/conf/messages*`. Focused coverage:
  `frontend/src/issue-board-pr-milestone-i18n.spec.tsx`,
  `frontend/src/issue-detail-shell.spec.tsx`,
  `frontend/src/restricted-route-parity.spec.tsx`, and
  `frontend/src/route-parity.spec.tsx`.
- 2026-06-25 RC Markdown long-codeblock safety keeps fenced-code rendering on
  the React path but bypasses syntax tokenization once code exceeds
  `MAX_HIGHLIGHTED_CODE_BLOCK_LENGTH`, rendering the original fenced source as
  `<pre><code class="...">...` without `syntax-token` spans. This covers the
  legacy OOM-risk class reported for very long SQL Markdown codeblocks while
  preserving readable source output. Focused coverage:
  `frontend/src/markdown-renderer.spec.tsx`.
- 2026-06-25 RC Markdown fragment-path continuation: the same long SQL
  fenced-code cutoff is now covered for `containerElement="fragment"` render
  paths used by child comments and preview-like inline surfaces, so those
  React-owned paths also render plain source without `syntax-token` spans.
- 2026-06-25 home/directory i18n evidence tightening: the
  directory/home/user-files/notification focused i18n test now drives the
  provider-backed case through `createLegacyI18nRuntime(["en-US", "ko-KR"])`,
  which parses `yona-original/conf/messages*` directly, instead of keeping a
  hand-copied Korean fixture for the touched `app.welcome.*`, `button.*`,
  `site.features.*`, `title.*`, and related keys. This keeps the test evidence
  aligned with the "legacy key/value as source of truth" rule while preserving
  the provider-less behavior that renders the raw legacy keys. Focused
  coverage: `frontend/src/directory-home-user-files-notification-i18n.spec.tsx`.
- 2026-06-25 direct-render i18n expectation tightening: direct React parity
  renders now keep the same legacy key call sites while resolving available
  legacy keys through `yona-original/conf/messages*` even without an explicit
  test runtime provider. The organization shell/home and Wave 2A container
  tests now assert user-visible legacy default English copy for known keys
  such as `title.organizationHome`, `button.newProject`, `project.watcher.title`,
  `code.copyUrl`, `button.edit`, `title.keymap`, and `menu.admin`, while still
  allowing raw output only where a key is absent or a component intentionally
  passes the key through non-message attributes. Focused coverage:
  `frontend/src/organization-home-parity.spec.tsx`,
  `frontend/src/organization-shell-i18n.spec.tsx`,
  `frontend/src/wave2a-container-parity.spec.tsx`, and
  `frontend/src/i18n.spec.tsx`.
- 2026-06-25 direct-render i18n expectation continuation: auth/workspace and
  project shell direct-render parity specs now assert the default English
  values loaded from `yona-original/conf/messages` for known keys while keeping
  the legacy key names at call sites. Covered surfaces include auth titles and
  reset alerts, workspace profile/settings stream labels, project menu/readme
  dashboard labels, and project settings/member/webhook/transfer/delete/change
  VCS controls. Focused coverage:
  `frontend/src/wave1-auth-workspace-parity.spec.tsx`,
  `frontend/src/project-settings-parity.spec.tsx`,
  `frontend/src/project-home-tabs.spec.tsx`, and
  `frontend/src/i18n.spec.tsx`.
- 2026-06-25 site-admin direct-render i18n expectation continuation:
  site-admin route parity tests now expect default English legacy message
  output for user/project/post/issue lists, diagnostics, mail, mass mail,
  data, and update pages when rendered without an explicit provider. This
  keeps route/components calling the same legacy keys while preventing test
  expectations from pinning raw key leakage as desired UI. Focused coverage:
  `frontend/src/site-admin-route-parity.spec.tsx` and
  `frontend/src/i18n.spec.tsx`.
- 2026-06-25 issue-detail direct-render i18n expectation continuation:
  issue detail parity tests now assert default English legacy message output
  for keymap labels, issue action buttons, voter/delete/comment modals,
  author fallback, Markdown editor labels, and disabled comment affordances.
  The same pass keeps intentionally raw attributes where the implementation
  still passes legacy keys directly, such as autocomplete no-result and
  selected subtask parent-state markers. Focused coverage:
  `frontend/src/issue-detail-shell.spec.tsx` and `frontend/src/i18n.spec.tsx`.
- 2026-06-25 code and pull-request direct-render i18n expectation
  continuation: code browser/history/commit/compare and PR detail/list/form/
  review-list parity tests now assert default English legacy message output for
  known keys while keeping the same legacy key lookup calls in implementation.
  Focused coverage: `frontend/src/project-code-browser-routing.spec.ts`,
  `frontend/src/pull-request-review-i18n.spec.tsx`,
  `frontend/src/pull-request-list-form-review-i18n.spec.tsx`, and
  `frontend/src/i18n.spec.tsx`.
- 2026-06-25 member/review-export direct-render i18n expectation
  continuation: project member-management and review-export focused specs now
  assert default English legacy message output for known keys such as
  `project.members.addMember`, `project.member.enrollment.request`, and
  `issue.downloadAsExcel`. Focused coverage:
  `frontend/src/project-members-parity.spec.tsx`,
  `frontend/src/project-reviews-export.spec.tsx`, and
  `frontend/src/i18n.spec.tsx`.
- 2026-06-25 route-parity direct-render i18n completion: the broad route
  parity harness now expects default English legacy message output for known
  keys across issue, code, board, milestone, pull-request, review, settings,
  public profile, directory, and common error shells while preserving source
  assertions that implementation still calls the legacy key names. The same
  pass fixed project/user issue assignee tooltip rendering to resolve
  `issue.assignee` through the legacy message table instead of exposing a raw
  key. Focused coverage: `frontend/src/route-parity.spec.tsx`,
  `frontend/src/issue-list-filter.spec.tsx`, and full
  `pnpm --dir frontend exec vitest run`.
- 2026-06-25 dynamic legacy-key direct-render tightening: project home history
  entries and issue subtask parent-state markers still compose the same legacy
  keys (`project.history.type.*`, `issue.state.*`) but now resolve them through
  the legacy message table before rendering. `frontend/src/i18n.spec.tsx` also
  guards against directly rendering known dynamic legacy-key templates in JSX
  text. Focused coverage: `frontend/src/project-home-tabs.spec.tsx`,
  `frontend/src/issue-detail-shell.spec.tsx`, and full
  `pnpm --dir frontend exec vitest run`.
- 2026-06-25 workspace/profile provider-less i18n tightening:
  `frontend/src/routes/-workspace-views.tsx` now resolves known legacy keys
  through the default legacy message table even when direct-rendered without a
  runtime provider, preventing raw workspace/profile tab, sidebar, empty-state,
  and tooltip keys from being pinned as acceptable UI. Focused coverage:
  `frontend/src/workspace-profile-i18n.spec.tsx` and full
  `pnpm --dir frontend exec vitest run`.
- 2026-06-25 issue label settings provider-less i18n tightening:
  `frontend/src/routes/$owner/$projectName/issue/labelsform/route.tsx` now
  resolves known legacy label/settings keys through the default legacy message
  table even without a runtime provider, so rendered placeholders, tooltips,
  and action buttons no longer accept raw key text as parity output. Focused
  coverage: `frontend/src/issue-label-settings-i18n.spec.tsx` and full
  `pnpm --dir frontend exec vitest run`.
- 2026-06-25 search provider-less i18n tightening:
  `frontend/src/routes/-search-views.tsx` now resolves search category labels,
  result titles, milestone due-date labels, author fallbacks, and pagination
  controls through the default legacy message table even without a runtime
  provider. Focused coverage: `frontend/src/search-i18n.spec.tsx`,
  `frontend/src/route-parity.spec.tsx`, and full
  `pnpm --dir frontend exec vitest run`.
- 2026-06-25 user-files provider-less i18n tightening:
  `frontend/src/routes/user/files/route.tsx` now resolves the my-series tabs
  and user-file search placeholder through the default legacy message table
  when direct-rendered without a runtime provider. Focused coverage:
  `frontend/src/user-files-parity.spec.tsx`,
  `frontend/src/directory-home-user-files-notification-i18n.spec.tsx`, and full
  `pnpm --dir frontend exec vitest run`.
- 2026-06-25 workspace-settings provider-less i18n tightening:
  `frontend/src/routes/-workspace-settings-view.tsx` now resolves user settings
  tabs, headings, labels, and actions through the default legacy message table
  when direct-rendered without a helper/runtime message provider. Focused
  coverage: `frontend/src/workspace-settings-i18n.spec.tsx` and full
  `pnpm --dir frontend exec vitest run`.
- 2026-06-25 notification welcome provider-less i18n tightening:
  `frontend/src/routes/notification/route.tsx` now resolves the welcome guide
  title, CTA labels, and guide descriptions through the default legacy message
  table when direct-rendered without a runtime provider, while preserving the
  legacy `app.welcome` / `app.description` composition. Focused coverage:
  `frontend/src/route-parity.spec.tsx`,
  `frontend/src/directory-home-user-files-notification-i18n.spec.tsx`, and full
  `pnpm --dir frontend exec vitest run`.
- 2026-06-25 issue detail timeline/autocomplete i18n tightening:
  `frontend/src/routes/-issue-views.tsx` now resolves issue timeline event
  state/message keys and assignable-user empty states through the default
  legacy message table before rendering. Focused coverage:
  `frontend/src/issue-detail-shell.spec.tsx` and full
  `pnpm --dir frontend exec vitest run`.
- 2026-06-27 project nested-layout code branch follow-up:
  `frontend/src/routes/$owner/$projectName/route.tsx` now owns the project
  header/menu/page-wrap shell for `/branches` with the code menu active, while
  `CodeBranchListPage` renders only the legacy branch body through
  `renderShell={false}`. Focused coverage:
  `pnpm --dir frontend exec vitest run src/code-views.spec.tsx -t "branch list shell"`.
- 2026-06-27 project nested-layout code browser follow-up:
  `frontend/src/routes/$owner/$projectName/route.tsx` now owns the project
  header/menu/page-wrap shell for `/code` and `/code/:branch/*path` with the
  code menu active, while `CodeBrowserPage` renders only the legacy code
  browser body through `renderShell={false}`. Focused coverage:
  `pnpm --dir frontend exec vitest run src/code-views.spec.tsx -t "code browser shell"`.
- 2026-06-27 project nested-layout commit detail follow-up:
  `frontend/src/routes/$owner/$projectName/route.tsx` now owns the project
  header/menu/page-wrap shell for `/commit/:commitId` with the code menu
  active, while `CodeCommitDetailPage` renders only the legacy commit diff body
  through `renderShell={false}`. Focused coverage:
  `pnpm --dir frontend exec vitest run src/code-views.spec.tsx -t "commit detail shell"`.
- 2026-06-27 project nested-layout compare follow-up:
  `frontend/src/routes/$owner/$projectName/route.tsx` now owns the project
  header/menu/page-wrap shell for `/compare/:revisionRange` with the code menu
  active, while `CodeComparePage` renders only the legacy compare body through
  `renderShell={false}`. Focused coverage:
  `pnpm --dir frontend exec vitest run src/code-views.spec.tsx -t "compare shell"`.
- 2026-06-27 project nested-layout commit history follow-up:
  `frontend/src/routes/$owner/$projectName/route.tsx` now owns the project
  header/menu/page-wrap shell for `/commits` and `/commits/:branch/*path` with
  the code menu active, while `CodeHistoryPage` renders only the legacy commit
  history body through `renderShell={false}`. Focused coverage:
  `pnpm --dir frontend exec vitest run src/code-views.spec.tsx -t "history shell"`.
- 2026-06-27 project nested-layout PR list follow-up:
  `frontend/src/routes/$owner/$projectName/route.tsx` now owns the project
  header/menu/page-wrap shell for `/pullRequests`, `/closedPullRequests`, and
  `/sentPullRequests` with the pull request menu active and the legacy
  `pull-request-page` shell class, while `ProjectPullRequestListPage` renders
  only the legacy list body through `renderShell={false}`. Focused coverage:
  `pnpm --dir frontend exec vitest run src/pull-request-list-form-review-i18n.spec.tsx -t "PR list chrome"`.
- 2026-06-27 project nested-layout PR form follow-up:
  `frontend/src/routes/$owner/$projectName/route.tsx` now owns the project
  header/menu/page-wrap shell for `/newPullRequestForm` and
  `/pullRequest/:pullRequestNumber/editform` with the pull request menu active
  and the legacy `pull-request-page` shell class, while
  `ProjectPullRequestFormPage` renders only the legacy form body through
  `renderShell={false}`. Focused coverage:
  `pnpm --dir frontend exec vitest run src/pull-request-list-form-review-i18n.spec.tsx -t "PR form chrome"`.
- 2026-06-27 project nested-layout PR detail follow-up:
  `frontend/src/routes/$owner/$projectName/route.tsx` now owns the project
  header/menu/page-wrap shell for `/pullRequest/:pullRequestNumber` with the
  pull request menu active and the legacy `pull-request-page` shell class,
  while `ProjectPullRequestDetailPage` renders only the legacy overview body
  through `renderShell={false}`. Focused coverage:
  `pnpm --dir frontend exec vitest run src/pull-request-review-i18n.spec.tsx -t "PR detail chrome"`.
- 2026-06-27 project nested-layout PR changes follow-up:
  `frontend/src/routes/$owner/$projectName/route.tsx` now owns the project
  header/menu/page-wrap shell for `/pullRequest/:pullRequestNumber/changes` and
  `/pullRequest/:pullRequestNumber/changes/:commitId` with the pull request
  menu active and the legacy `pull-request-page` shell class, while
  `PullRequestChangesPage` renders only the legacy changes/diff body through
  `renderShell={false}`. Focused coverage:
  `pnpm --dir frontend exec vitest run src/pull-request-review-i18n.spec.tsx -t "PR changes chrome"`.
- 2026-06-27 project nested-layout review-list follow-up:
  `frontend/src/routes/$owner/$projectName/route.tsx` now owns the project
  header/menu/page-wrap shell for `/reviews` with the review menu active and
  the legacy `pull-request-page` shell class, while `ProjectReviewsPage`
  renders only the legacy review list body through `renderShell={false}`.
  Focused coverage:
  `pnpm --dir frontend exec vitest run src/pull-request-list-form-review-i18n.spec.tsx -t "review-list chrome"`.
- 2026-06-27 project nested-layout fork follow-up:
  `frontend/src/routes/$owner/$projectName/route.tsx` now owns the project
  header/menu/page-wrap shell for `/newFork` with the pull request menu active,
  while `ProjectForkPage` renders only the legacy fork form body through
  `renderShell={false}`. Focused coverage:
  `pnpm --dir frontend exec vitest run src/project-settings-parity.spec.tsx -t "fork shell"`.
- 2026-06-27 project nested-layout home follow-up:
  `frontend/src/routes/$owner/$projectName/route.tsx` now owns the project
  header/menu/page-wrap shell for the project index route with the home menu
  active, while `ProjectDetailPage` renders only the legacy project home body
  through `renderShell={false}`. Focused coverage:
  `pnpm --dir frontend exec vitest run src/project-home-tabs.spec.tsx -t "project layout route own project home"`.
- 2026-06-27 project nested-layout search follow-up:
  `frontend/src/routes/$owner/$projectName/route.tsx` now owns the project
  header/menu shell for `/search` with the legacy `search-page` class while
  preserving the search page's existing breadcrumb-before-page-wrap body order;
  the project search child route passes `renderShell={false}` to
  `SearchRoutePage`. Focused coverage:
  `pnpm --dir frontend exec vitest run src/route-parity.spec.tsx -t "real search routes"`.
- 2026-06-27 organization nested-layout home follow-up:
  `frontend/src/routes/organizations/$organizationName/route.tsx` now owns the
  organization header/menu/page-wrap shell for the organization index route
  with the home menu active, while `OrganizationDetailPage` renders only the
  legacy organization home body through `renderShell={false}`. Focused
  coverage:
  `pnpm --dir frontend exec vitest run src/organization-home-parity.spec.tsx -t "organization layout route own home"`.
- 2026-06-27 organization nested-layout settings follow-up:
  `frontend/src/routes/organizations/$organizationName/route.tsx` now owns the
  organization header/menu/page-wrap shell for `/settingform` with the settings
  menu active and the legacy `organization-settings-shell` class, while
  `OrganizationSettingsPage` renders only the legacy settings body through
  `renderShell={false}`. Focused coverage:
  `pnpm --dir frontend exec vitest run src/organization-shell-i18n.spec.tsx -t "settings chrome"`.
- 2026-06-27 organization nested-layout members/delete follow-up:
  `frontend/src/routes/organizations/$organizationName/route.tsx` now owns the
  organization header/menu/page-wrap shell for `/members` and `/deleteForm`,
  while `OrganizationMembersPage` and `OrganizationDeletePage` render only
  their legacy settings-tab bodies through `renderShell={false}`. Focused
  coverage:
  `pnpm --dir frontend exec vitest run src/organization-shell-i18n.spec.tsx -t "members chrome|delete chrome"`.
- 2026-06-27 nested route SPA mode follow-up: issue detail, milestone detail,
  and pull-request detail parent routes now use TanStack Router state to decide
  whether to render their nested edit/changes outlets instead of reading
  `window.location.pathname`; milestone detail also derives its `state` query
  from the router href. Focused coverage:
  `pnpm --dir frontend exec vitest run src/issue-detail-shell.spec.tsx src/board-milestone-parity.spec.tsx src/pull-request-review-i18n.spec.tsx`
  and `pnpm --dir frontend exec tsc --noEmit`.
- 2026-06-27 route-state SPA follow-up: PR changes, `/user/issues`, and
  `/user/issues/new` removed parent/child route decisions from
  `window.location.pathname`; direct issue create now reads `commentId` from the
  TanStack Router href. Focused coverage:
  `pnpm --dir frontend exec vitest run src/route-parity.spec.tsx src/pull-request-review-i18n.spec.tsx`
  and `pnpm --dir frontend exec tsc --noEmit`.
- 2026-06-27 route-query SPA follow-up: project/organization PR lists and
  project/organization/user issue lists now parse filters and pagination from
  TanStack Router href state instead of `window.location.search`. Focused
  coverage:
  `pnpm --dir frontend exec vitest run src/route-parity.spec.tsx src/pull-request-list-form-review-i18n.spec.tsx`
  and `pnpm --dir frontend exec tsc --noEmit`.
- 2026-06-27 board/review/milestone query-state follow-up: project reviews,
  project milestones, project board list, and organization board list now parse
  filter/sort/pagination state from TanStack Router href state instead of
  `window.location.search`. Focused coverage:
  `pnpm --dir frontend exec vitest run src/board-milestone-parity.spec.tsx src/pull-request-list-form-review-i18n.spec.tsx`
  and `pnpm --dir frontend exec tsc --noEmit`.
- 2026-06-27 issue/board form query-state follow-up: project issue create and
  board post create routes now parse parent/referenced issue and online-commit
  form options from TanStack Router href state instead of
  `window.location.search`. Focused coverage:
  `pnpm --dir frontend exec vitest run src/issue-detail-shell.spec.tsx src/board-milestone-parity.spec.tsx`
  and `pnpm --dir frontend exec tsc --noEmit`.
- 2026-06-27 code/workspace query-state follow-up: commit detail, commit
  history, and user files now parse branch/path/page/filter state from TanStack
  Router href state instead of `window.location.search`. Focused coverage:
  `pnpm --dir frontend exec vitest run src/route-parity.spec.tsx src/user-profile-route-loading-shell-i18n.spec.tsx`
  and `pnpm --dir frontend exec tsc --noEmit`.
- 2026-06-27 create/auth query-state follow-up: project create/import owner
  defaults, `/projects/new`, and root flash messages now parse route query state
  from TanStack Router href state inside route components. Focused coverage:
  `pnpm --dir frontend exec vitest run src/user-profile-route-loading-shell-i18n.spec.tsx src/project-create-parity.spec.tsx src/auth-workspace-shell.spec.tsx src/route-parity.spec.tsx`
  and `pnpm --dir frontend exec tsc --noEmit`.
- 2026-06-27 `/me` route-state follow-up: the workspace route derives its
  nested settings-shell path check from TanStack Router pathname state instead
  of `window.location.pathname`. Focused coverage:
  `pnpm --dir frontend exec vitest run src/user-profile-route-loading-shell-i18n.spec.tsx src/workspace-profile-i18n.spec.tsx`
  and `pnpm --dir frontend exec tsc --noEmit`.
- 2026-06-27 search route-state follow-up: global, project, and organization
  search pages parse keyword/type/page query state from TanStack Router href
  state instead of `window.location.search`. Focused coverage:
  `pnpm --dir frontend exec vitest run src/route-parity.spec.tsx src/search-i18n.spec.tsx src/organization-shell-i18n.spec.tsx`
  and `pnpm --dir frontend exec tsc --noEmit`.
- 2026-06-27 root route-state follow-up: framed sidebar source resolution and
  pin-to-sidebar path capture use TanStack Router location state instead of
  browser-global search/pathname reads, with the pin callback dependency tied
  to the router pathname. Focused coverage:
  `pnpm --dir frontend exec vitest run src/auth-workspace-shell.spec.tsx src/route-parity.spec.tsx`
  and `pnpm --dir frontend exec tsc --noEmit`.
- 2026-06-27 shared href route-state follow-up: `useCurrentHref` exposes the
  TanStack Router href for route forms and shells instead of reconstructing it
  from browser-global pathname/search values. Focused coverage:
  `pnpm --dir frontend exec vitest run src/user-profile-route-loading-shell-i18n.spec.tsx src/auth-workspace-shell.spec.tsx src/wave1-auth-workspace-parity.spec.tsx`
  and `pnpm --dir frontend exec tsc --noEmit`.
- 2026-06-27 public profile route-state follow-up: `/:user` parses `daysAgo`
  and `selected` from TanStack Router href state and passes that same route href
  into the public profile shell, preserving selected-tab query behavior without
  browser-global `window.location` reads. Focused coverage:
  `pnpm --dir frontend exec vitest run src/route-parity.spec.tsx src/wave1-auth-workspace-parity.spec.tsx src/workspace-profile-i18n.spec.tsx`
  and `pnpm --dir frontend exec tsc --noEmit`.
- 2026-06-27 redirect alias route-state follow-up: `RedirectPage` preserves
  search/hash from caller-provided TanStack Router href state for the legacy
  reset-password and notification settings aliases instead of reading
  `window.location.search` directly. Focused coverage:
  `pnpm --dir frontend exec vitest run src/user-profile-route-loading-shell-i18n.spec.tsx src/auth-workspace-shell.spec.tsx src/workspace-settings-i18n.spec.tsx`
  and `pnpm --dir frontend exec tsc --noEmit`.
- 2026-06-27 login redirect route-state follow-up: `/users/loginform` reuses
  the route `currentHref` from TanStack Router for post-login `redirectUrl` /
  `redirect` parsing instead of reading `window.location.search` in the submit
  handler. Focused coverage:
  `pnpm --dir frontend exec vitest run src/auth-workspace-shell.spec.tsx src/wave1-auth-workspace-parity.spec.tsx`
  and `pnpm --dir frontend exec tsc --noEmit`.
- 2026-06-27 root sidebar interaction follow-up: normal root pages now keep
  `#mySidenav` closed at `0px`, open to the legacy `360px` width from root
  React state on `#sidebar-open-btn` clicks or the `F` shortcut with no focused
  field, close on outside `#main` clicks, and preserve the mobile `100vw` width
  rule without reintroducing a jQuery width-mutation sidebar bridge. Focused
  coverage: `pnpm --dir frontend exec vitest run src/auth-workspace-shell.spec.tsx`
  and `pnpm --dir frontend exec tsc --noEmit`; browser coverage:
  `pnpm --dir frontend test:e2e -- tests/root-shell-parity.e2e.ts --grep "authenticated site admin shell"`.
- 2026-06-28 project header dynamic id evidence: `ProjectDetail` and
  `ProjectContainer` REST payloads now expose `projectId` so the React
  `project/header.scala.html` port can preserve the legacy
  `data-project-id="@project.id"` favorite-project anchor without hard-coding a
  fixture id. Focused coverage:
  `pnpm --dir frontend test src/project-settings-parity.spec.tsx src/project-home-tabs.spec.tsx src/issue-label-settings-i18n.spec.tsx`,
  `pnpm agent:cargo -- --outside-sandbox check -p yoram-server`, and
  `pnpm agent:cargo-test -- --outside-sandbox -p yoram-server --test org_project_contract`.
- 2026-06-26 issue comment detail contract tightening:
  `crates/server/src/api_types.rs`, `crates/server/src/routes/issues.rs`, and
  `crates/server/src/routes/issues/meta.rs` now include comment `authorId` and
  detail `viewerUserId` in the REST detail projection so the React
  `common/commentUpdateForm.scala.html` port can preserve the legacy
  `comment.isAuthoredBy(currentUser)` notification checkbox condition without
  importing legacy Play/JavaScript code. Focused coverage:
  `frontend/src/issue-detail-shell.spec.tsx`,
  `pnpm agent:cargo -- --outside-sandbox check -p yoram-server`, and full
  `pnpm --dir frontend test`.
- 2026-07-02 issue list search-user source restoration:
  `crates/persistence/src/repo/issue_picker.rs`,
  `crates/server/src/routes/issues/lookups.rs`, and
  `frontend/src/routes/$ownerName/$projectName/issues.tsx` now expose and use a
  narrow project issue search-user REST lookup matching
  `issue/partial_searchform.scala.html` calls to
  `User.findIssueAuthorsByProjectIdAndMe` and
  `User.findIssueAssigneeByProjectIdAndMe`, keeping this source distinct from
  project-wide assignable-users used by `partial_massupdate.scala.html`.
  Focused coverage:
  `pnpm agent:cargo-test -- --outside-sandbox --package yoram-server --test issue_assignable_contract project_issue_search_users_follow_legacy_author_and_assignee_sources`
  and `pnpm --dir frontend test:e2e -- project-issues-empty.e2e.ts`.
- 2026-06-25 initial admin bootstrap route guard:
  `frontend/src/route-parity.spec.tsx` now pins `/secret` and `/restart` as
  real React routes, requires the `/secret` screen submit path to call
  `setupSecretAdminRest` with `event.preventDefault()`, and keeps the legacy
  `POST /secret` form action only as a fallback anchor. The same guard keeps
  the legacy `app.welcome.*`, `app.restart.*`, and readonly `admin` account
  surface visible in route source evidence. Focused coverage:
  `pnpm --dir frontend exec vitest run src/route-parity.spec.tsx`.
- 2026-06-25 UIKit route href correction: React `/_UIKit` now keeps its sample
  links on the legacy `/_UIKit` route instead of emitting the non-legacy
  `/ui-kit` path. Focused coverage:
  `pnpm --dir frontend exec vitest run src/ui-kit-route-parity.spec.tsx`.
- Mounted reverse-proxy Playwright verification now runs against per-run isolated frontend/backend ports and a per-run sqlite runtime directory so concurrent E2E executions do not share dev-server state.
- 2026-06-21 deferred-slice verification note: focused P4-A i18n specs are
  green for the current organization/search/site-admin and
  issue/board/PR/milestone opt-in slices, and the P4-A touched files pass the
  focused frontend specs listed in
  `docs/plans/2026-06-21-deferred-parity-goal-directive.md`.
- `pnpm --dir frontend test` is green, including `src/route-parity.spec.tsx`.
- `pnpm --dir frontend build` is green.
- `pnpm --dir frontend test:e2e` is green for `tests/shell-routing-smoke.e2e.ts`.
- `pnpm agent:cargo-test -- -p yoram-server --test server_core_contract` is green; this consolidated target covers the legacy router, DB router, markdown, session, and SQLite smoke contracts.
- `/api/v1/organizations` now provides the additive public organization directory feed used by the Rust route shell.
- Rust workspace verification is green, including Docker/testcontainers coverage.
- 2026-07-11 authenticated home notification parity note: the Rust notification projection and localhost seed now preserve legacy stored titles, issue-comment anchors, default avatars, Korean relative dates, page-more semantics, and safe legacy break normalization for the frozen `/` dashboard state. The React renderer emits text and `<br />` nodes without raw HTML and retains the legacy `.ybtn` content-box geometry. Production paired sweeps at desktop `2026-07-11T09:08:01.875Z` and mobile `2026-07-11T09:08:16.126Z` report zero diff/local failures. Context mounting is runtime-only: `YONA_BASE_PATH` is the sole source, unset/blank means `/`, and the generic frontend production artifact is independent of the reverse-proxy context.
- 2026-07-11 project import visual-parity note: `/_import` and `/_import?owner=` now render the live legacy Select2 owner/VCS composition through React state while retaining the native select payload boundary. The import screen also removes prior nonlegacy CSS overrides and returns wrapper, legend, textarea, actions, and buttons to the frozen `_page.less`/Bootstrap cascade. Focused Playwright passed 8/8; production desktop `2026-07-11T10:08:35.465Z` and mobile `2026-07-11T10:08:53.453Z` paired sweeps both report zero diff/local failures.
- 2026-07-11 runtime context-mount parity note: Rust now mounts application routes, API, SPA fallback, and assets only below the environment-provided `YONA_BASE_PATH`; absent or blank remains `/`. The context-neutral Vite production artifact receives its browser config and asset prefixes at runtime, and non-root mounts no longer leak `/assets` or `/images` aliases at the host root. Empty/default React asset fallbacks across the touched shared screens now use the same runtime base path without altering API-provided URLs. Filesystem and embedded `/yona` contracts, host-root 404 assertions, runtime normalization contracts, production build, and the code-folder Playwright suite passed.
- 2026-07-11 code-browser closure note: the production bundle now emits relative chunk and asset references (`base: "./"`), while Rust rewrites both relative and absolute asset prefixes beneath the runtime `YONA_BASE_PATH`; no reverse-proxy context is fixed at build time and unset/blank still means `/`. Code-tree projections preserve ISO author timestamps for the legacy Korean relative-date formatter. With aligned populated repositories, `/admin/sample/code` and its trailing-slash state pass desktop/mobile paired sweeps with zero diff/local failures.
- 2026-07-12 frozen legacy CSS compiler note: `frontend/scripts/build-legacy-css.mjs` now uses Less `math: "always"` so the immutable legacy sources retain their Less 1.x division semantics. This replaces invalid generated declarations such as `.opacity(0)` becoming `opacity: 0 / 100` with the legacy effective value `opacity: 0`, without changing `yona-original/` or introducing custom selectors. The `labelIds=2` issue-list state exposed the defect through its Select2 close sprite; focused Playwright passed 1/1, the full issue-list suite passed 81/81, the compiler/artifact contract passed 18/18, and final production desktop/mobile sweeps reported zero diff/local failures.
- 2026-07-11 issue-edit closure note: project labels are projected in the legacy `IssueLabel.findByProject` order (category name, then label name). The React edit form preserves native REST form values behind React-owned Select2 output and returns its responsive columns/actions/editor tabs to the frozen Bootstrap/Yobi cascade by removing later broad metric-compensation overrides. Focused Playwright passes 8/8; production desktop/mobile paired sweeps report zero diff/local failures.
- 2026-07-12 SVN milestone-detail closure note: the REST read boundary preserves legacy `Milestone.findById` global-id projection while authorizing the URL project; milestone content and issue rows come from the milestone owner, whereas tab counts and mass-update option sets remain scoped to the requested project. The issue-list DTO now retains author/login, creation title, assignee, due-date, weight, and avatar data instead of discarding persistence fields. React uses those explicit projections, ko-KR legacy time messages, and the Scala heading whitespace; two historical non-legacy `post-list-wrap`/milestone-filter metric overrides were deleted so frozen Yona/Bootstrap CSS owns geometry. Focused Playwright passes 3/3, the focused Rust REST contract passes, and production desktop/mobile paired sweeps report zero diff/local failures.
- 2026-07-12 SVN milestone-edit closure note: the same global-id REST correction restores `/admin/svnplayground/milestone/1/editform` without another route patch. The existing Scala-derived React form already matches the legacy title/editor/uploader/state/due-date/calendar/action composition under the top-level SVN project payload. Its focused Playwright suite passes 5/5; fresh production desktop/mobile sweeps report zero diff/local failures and exact form/editor/uploader geometry, confirmed with authenticated headless screenshot pairs. No CSS, TSX, E2E, or asset path changed for this closure.
- 2026-07-12 SVN open-milestone-list closure note: previous canonical project-shell corrections also resolve `/admin/svnplayground/milestones` without another route patch. The actual legacy and Rust seeds both render the default `state=open` empty list with the same tabs, new action, illustration/copy, project shell and responsive geometry. Fresh production desktop/mobile sweeps report zero diff/local failures and authenticated screenshots were reviewed. The existing broader milestone-list E2E still contains stale assertions for a separate populated search-bar metric and a removed plugin-only `data-toggle` marker; those states are not used as evidence for this empty-state closure and are not mixed into this one-screen turn.
- 2026-07-12 SVN all-milestone-list closure note: `/admin/svnplayground/milestones?state=all` uses the same empty seed with the legacy All tab active and needs no additional route patch. The existing focused all-state Playwright assertion passes and retains open/closed metadata behavior for populated fixtures; fresh production desktop/mobile sweeps report zero diff/local failures with exact shell/page geometry, and the authenticated desktop screenshot pair was reviewed. No implementation, CSS, E2E, or asset path changed.
- 2026-07-12 SVN closed-milestone-list closure note: `/admin/svnplayground/milestones?state=closed` uses the actual empty seed with the legacy Closed tab active and needs no additional route patch. The current route also retains the populated closed-row `due-date ml5` and no-remaining-days branches from `milestone/list.scala.html`. Fresh production desktop/mobile sweeps report zero diff/local failures and exact utility/menu/page geometry; authenticated desktop captures were reviewed. The existing typed-link and populated all-state closed-row Playwright checks pass. A separate populated search-bar metric assertion remains stale at 38/350 versus the frozen rendered 12/360 and is not evidence for this empty closed state. No implementation, CSS, E2E, or asset path changed.
- 2026-07-12 SVN explicit-open-milestone-list closure note: `/admin/svnplayground/milestones?state=open` preserves the explicit query state through the TanStack search boundary, activates the legacy Open tab, and renders the actual empty seed without another route patch. Fresh production desktop/mobile sweeps report zero diff/local failures and exact utility/menu/page geometry; authenticated desktop captures were reviewed. The focused typed-Link Playwright check passes. The broader populated fixture retains its previously documented stale search-button/input metric assertion, which is separate from this production empty state. No implementation, CSS, E2E, or asset path changed.
- 2026-07-12 SVN new-milestone-form closure note: the existing `milestone/create.scala.html` port already contains the legacy editor, uploader, state, due-date/calendar, and action skeleton, so `/admin/svnplayground/newMilestoneForm` needs no further route patch. Earlier shared shell and form restoration now produce exact desktop 1002×70 uploader geometry and mobile 390px document/form/editor/uploader containment under the frozen CSS. The full focused Playwright file passes 9/9, including canonical DOM, uploader, mobile containment, validation, editor interaction and typed navigation. Fresh production desktop/mobile sweeps report zero diff/local failures; authenticated desktop captures were reviewed. No implementation, CSS, E2E, or asset path changed.
- 2026-07-12 SVN new-pull-request Git-only closure note: legacy `PullRequestApp` is guarded by class-level `IsOnlyGitAvailable`, so `/admin/svnplayground/newPullRequestForm` must render the default site BadRequest shell before any project header or form query. The route now reuses the canonical pull-request BadRequest shell and omits blank/zero search defaults so the direct URL stays clean. Focused RED/GREEN coverage and the Git no-query regression pass 2/2. Production desktop/mobile sweeps report zero visible/metric and local failures with exact navbar/page/error geometry; the SPA document remains HTTP 200 versus legacy 400, a transport-level difference recorded separately from the matched UI. No CSS/LESS or asset path changed.
- 2026-07-12 SVN board-post-create closure note: earlier shared shell/editor/uploader restoration already resolves `/admin/svnplayground/postform` without another route patch. Fresh production desktop/mobile sweeps report zero diff/local failures and exact utility/menu/form/editor/uploader geometry, including the legacy 70px desktop and 100px mobile uploader. Authenticated desktop captures were reviewed. The existing uploader-only E2E still expects historical `padding: 10px 20px`, while the frozen current legacy/local cascade computes `10px`; that stale E2E-only assertion is not used as parity evidence and cannot be changed alone under the Scala HTML goal guard. No implementation, CSS, E2E, or asset path changed.
- 2026-07-12 SVN empty board-list closure note: `/admin/svnplayground/posts` now omits blank and legacy-default search fields from the TanStack URL while deriving the same API/render defaults internally. Three pre-Rust custom CSS blocks targeting bare `#pagination` and `.post-list` were deleted: they added margin/flex/anchor styling to the empty Scala pagination placeholder and a one-pixel border to the legacy board wrapper. Frozen `.page-navigation-wrap` continues to own populated pagination; no replacement CSS was added. Focused empty-state and populated-pagination regressions pass 2/2. Final production desktop/mobile sweeps report zero diff/local failures and exact 1346×413/390×382 project-body geometry; authenticated captures were reviewed.
- 2026-07-12 SVN empty review-list closure note: `/admin/svnplayground/reviews` now follows `reviewthread/list.scala.html` with a direct `project-page-wrap` root, keeps legacy-default search fields out of the clean TanStack URL, and renders review.List's generated one-page pagination for an empty result. A historical non-legacy `.review-list-wrap { margin-top: 18px; }` rule was deleted instead of offsetting it elsewhere; frozen Yona/Bootstrap CSS now owns the tab-to-list geometry. The default avatar fallback uses a Vite import rather than a string asset path. The full focused Playwright file passes 7/7. Final production desktop/mobile sweeps report zero diff/local failures and exact 1366×500/390×668 project/list geometry; authenticated desktop captures were reviewed.
- 2026-07-12 SVN sent-pull-request closure note: legacy `IsOnlyGitAvailableAction` protects `PullRequestApp.sentPullRequests` as well as the open/closed actions. The route now checks the loaded VCS before mounting its project-scoped shell or issuing a list query, then reuses the canonical Git-only BadRequest shell. This restores the global navbar and exact 1366×450/390×450 error-page geometry under frozen CSS without any numeric compensation. Focused closed/sent Playwright coverage passes 2/2; production desktop/mobile sweeps report zero diff/local failures. The SPA document remains HTTP 200 where legacy returns 400, a transport-only difference from the matched rendered UI.
- 2026-07-12 SVN settings closure note: the settings REST projection remains the form/mutation source, but lacks shell-only watcher and menu fields. The route now reads the canonical project container in parallel solely for `ProjectHeader`, `ProjectMenu`, and project search scope, removing its divergent local menu instead of compensating for the absent watch utility with CSS. Static logo fallback now uses a Vite import. The full focused settings suite passes 23/23; production desktop/mobile sweeps report zero diff/local failures and exact 1366×526/390×775 geometry, including legacy mobile 420px document overflow.
- 2026-07-12 SVN statistics closure note: `project/statistics.scala.html` is a header-only `projectLayout` state and deliberately has no `projectMenu`. Its local duplicate header rendered a divergent watch-control composition, shifting `.project-util-wrap` from the legacy x1199/147px to x1180/166px. The route now reuses the existing Vite-asset-backed canonical `ProjectHeader` with the same project-container projection, restoring the legacy intrinsic geometry without CSS or numeric compensation. Focused Playwright passes 12/12; production desktop (`2026-07-12T06:40:20.510Z`) and mobile (`2026-07-12T06:40:33.252Z`) sweeps have zero diff/local failures, with 147px desktop utility and hidden mobile utility.
- 2026-07-12 SVN transfer closure note: the transfer DTO is only a transfer-form/access projection; spreading it over the project container discarded canonical watcher/menu fields. The route now retains that query solely as its load gate and renders the legacy header, active setting menu, setting tabs, and transfer form from the container using existing `ProjectHeader`/`ProjectMenu`. This restores x1199/147px utility, 410px desktop menu, 201px mobile menu, and transfer description width without CSS compensation. Focused Playwright passes 16/16; production desktop (`2026-07-12T06:48:03.862Z`) and mobile (`2026-07-12T06:48:10.742Z`) sweeps have zero diff/local failures.
- 2026-07-12 SVN webhooks closure note: the current route already uses the canonical container projection with the existing `ProjectHeader` and `ProjectMenu(active="setting")`; no route patch was warranted. Fresh focused Playwright passes 17/17 and production desktop (`2026-07-12T06:51:02.925Z`) and mobile (`2026-07-12T06:51:09.574Z`) sweeps have zero diff/local failures, matching the 147px desktop utility, 410px/201px menu geometry, and no mobile overflow under frozen CSS.
- 2026-07-12 Alice sample home closure note: legacy `project/header.scala.html` predicates the origin line on `isForkedFromOrigin`, not the broader `isForked` projection. `ProjectHeader` now uses the same predicate, eliminating a local-only origin row that expanded the live breadcrumb from 34px to 47px on desktop and distorted mobile geometry. Focused README Playwright passes 23/23; production desktop (`2026-07-12T07:04:21.881Z`) and mobile (`2026-07-12T07:04:28.957Z`) sweeps have zero diff/local failures. No CSS change or numeric compensation was added.
- 2026-07-12 Alice dashboard closure note: the same shared header predicate restores the dashboard-state breadcrumb without another route patch. Fresh production desktop (`2026-07-12T07:08:15.594Z`) and mobile (`2026-07-12T07:08:22.484Z`) sweeps have zero diff/local failures under frozen CSS.
- 2026-07-12 Alice history closure note: the same shared header predicate restores the history-state breadcrumb without another route patch. Fresh production desktop (`2026-07-12T07:09:28.386Z`) and mobile (`2026-07-12T07:09:34.926Z`) sweeps have zero diff/local failures under frozen CSS.
- 2026-07-12 Alice change-VCS closure note: the change-VCS DTO is form-only and no longer overwrites the container-backed header, active setting menu, or tabs. Form VCS values remain query-owned while shell geometry stays container-owned. Focused Playwright passes 16/16; production desktop (`2026-07-12T07:17:08.053Z`) and mobile (`2026-07-12T07:17:14.708Z`) sweeps have zero diff/local failures with no CSS compensation.
- 2026-07-12 Alice closed-pull-request closure note: shared fork-predicate restoration resolves the closed list breadcrumb without another route patch. Fresh production desktop (`2026-07-12T07:18:23.132Z`) and mobile (`2026-07-12T07:18:29.883Z`) sweeps have zero diff/local failures under frozen CSS.
- 2026-07-12 Alice code-root closure note: legacy CodeApp redirects a non-empty repository to its default branch before rendering the folder. React now uses `useLayoutEffect` for the same pre-paint redirect, preventing an empty root shell from being swept before folder text paints. The direct Alice regression passes; four unrelated existing code-suite expectations for shared Vite asset paths and branch/commit URLs remain outside this root redirect slice. Production desktop (`2026-07-12T07:24:17.285Z`) and mobile (`2026-07-12T07:24:24.103Z`) sweeps have zero diff/local failures; no CSS compensation was added.
- 2026-07-12 Alice code trailing-slash closure note: the same root redirect resolves `/alice/sample/code/` without a separate route patch. Fresh production desktop (`2026-07-12T07:25:36.824Z`) and mobile (`2026-07-12T07:25:43.803Z`) sweeps have zero diff/local failures.
- 2026-07-12 Alice code-main closure note: the branch folder state has matched output under frozen CSS. Legacy returns HTTP 404 while the SPA document remains 200; this transport-only delta accompanies identical rendered UI in fresh desktop (`2026-07-12T07:26:54.272Z`) and mobile (`2026-07-12T07:27:01.141Z`) sweeps.
- 2026-07-12 Alice code-main trailing-slash closure note: `/alice/sample/code/main/` has the same matched branch-folder output under frozen CSS. Legacy returns HTTP 404 while the SPA document remains 200; this transport-only delta accompanies identical rendered UI in fresh desktop (`2026-07-12T07:28:50.802Z`) and mobile (`2026-07-12T07:28:58.068Z`) sweeps.
- 2026-07-12 Alice code-main README closure note: `/alice/sample/code/main/README.md` has matched file-view output under frozen CSS. Legacy returns HTTP 404 while the SPA document remains 200; this transport-only delta accompanies identical rendered UI in fresh desktop (`2026-07-12T07:29:44.519Z`) and mobile (`2026-07-12T07:29:51.203Z`) sweeps.
- 2026-07-12 Alice project-delete closure note: the settings projection is form-only, so the route now keeps it for deletion identity/mutation while the canonical container owns the legacy header, watcher utility, setting project menu, and setting tabs. This removes the missing/collapsed shell without CSS or numeric compensation. The direct Alice split-projection Playwright regression passes and fresh production desktop (`2026-07-12T07:36:24.378Z`) and mobile (`2026-07-12T07:36:31.093Z`) sweeps have zero diff/local failures.
- 2026-07-12 Alice issue-label-settings closure note: shared container-backed project header behavior now restores the labels setting shell without a route patch. Fresh production desktop (`2026-07-12T07:37:20.067Z`) and mobile (`2026-07-12T07:37:26.707Z`) sweeps have zero diff/local failures under frozen CSS.
- 2026-07-12 Alice issue-create closure note: the current route already separates the canonical container-owned project shell from its issue-form options projection and preserves `issue/create.scala.html`'s editor/uploader skeleton. Fresh production desktop (`2026-07-12T07:39:18.153Z`) and mobile (`2026-07-12T07:39:25.317Z`) sweeps have zero diff/local failures under frozen CSS; no route patch was warranted.
- 2026-07-12 Alice issue-list closure note: the shared legacy header correction restores the issue-list breadcrumb without another route patch. Fresh production desktop (`2026-07-12T07:40:42.682Z`) and mobile (`2026-07-12T07:41:20.067Z`) sweeps have zero diff/local failures under frozen CSS.
- 2026-07-12 Alice project-members closure note: the shared legacy header correction restores the members setting breadcrumb without another route patch. Fresh production desktop (`2026-07-12T07:42:28.804Z`) and mobile (`2026-07-12T07:42:40.379Z`) sweeps have zero diff/local failures under frozen CSS.
- 2026-07-12 Alice milestone-detail closure note: the current route preserves `milestone/view.scala.html`'s project shell, milestone body, and issue-list structure. Fresh production desktop (`2026-07-12T07:43:22.816Z`) and mobile (`2026-07-12T07:43:29.615Z`) sweeps have zero diff/local failures under frozen CSS; no route patch was warranted.
- 2026-07-12 Alice milestone-list closure note: the shared legacy header correction restores the milestone list breadcrumb without another route patch. Fresh production desktop (`2026-07-12T07:44:11.229Z`) and mobile (`2026-07-12T07:44:17.949Z`) sweeps have zero diff/local failures under frozen CSS.
- 2026-07-12 Alice fork-form closure note: the current route matches `git/fork.scala.html` with the shared container-backed project utility/menu. Fresh production desktop (`2026-07-12T07:44:56.216Z`) and mobile (`2026-07-12T07:45:03.609Z`) sweeps have zero diff/local failures under frozen CSS; no route patch was warranted.
- 2026-07-12 Alice milestone-create closure note: the current route matches `milestone/create.scala.html`'s editor, uploader, action row, and responsive form geometry. Fresh production desktop (`2026-07-12T07:45:46.519Z`) and mobile (`2026-07-12T07:45:53.651Z`) sweeps have zero diff/local failures under frozen CSS; no route patch was warranted.
- 2026-07-12 Alice pull-request-create empty-source closure note: `PullRequestApp.newPullRequestForm` returns the project-layout BadRequest output when the selected source repository has no branches. The React route now translates its 400 form-options response into the same header/menu plus `page-wrap-outer > project-page-wrap > error-wrap` hierarchy, with no CSS compensation. The focused suite passes 11/11; production desktop (`2026-07-12T07:52:21.913Z`) and mobile (`2026-07-12T07:52:55.295Z`) sweeps have zero diff/local failures. The SPA document remains HTTP 200 where legacy returns 400, a transport-only difference from the matched UI.
- 2026-07-12 Alice board-create closure note: the current route preserves `board/create.scala.html`'s project shell, editor, uploader, and action form. Fresh production desktop (`2026-07-12T07:55:07.220Z`) and mobile (`2026-07-12T07:55:14.659Z`) sweeps have zero diff/local failures under frozen CSS; no route patch was warranted.
- 2026-07-12 Alice board-list closure note: the shared legacy header correction restores the board-list breadcrumb without another route patch. Fresh production desktop (`2026-07-12T07:55:58.272Z`) and mobile (`2026-07-12T07:56:05.059Z`) sweeps have zero diff/local failures under frozen CSS.
- 2026-07-12 Alice pull-request-list closure note: the shared legacy header correction restores the pull-request list breadcrumb without another route patch. Fresh production desktop (`2026-07-12T07:56:44.592Z`) and mobile (`2026-07-12T07:56:51.536Z`) sweeps have zero diff/local failures under frozen CSS.
- 2026-07-12 Alice review-list closure note: the shared legacy header correction restores the review-list breadcrumb without another route patch. Fresh production desktop (`2026-07-12T07:57:29.689Z`) and mobile (`2026-07-12T07:57:36.421Z`) sweeps have zero diff/local failures under frozen CSS.
- 2026-07-12 Alice project-setting closure note: the existing form/container split preserves the legacy setting form alongside the canonical project utility. Fresh production desktop (`2026-07-12T07:58:15.450Z`) and mobile (`2026-07-12T07:58:22.173Z`) sweeps have zero diff/local failures under frozen CSS; no route patch was warranted.
- 2026-07-12 Alice project-transfer closure note: the existing form/container split preserves `project/transfer.scala.html` alongside the canonical project utility and responsive setting menu. Fresh production desktop (`2026-07-12T07:59:19.571Z`) and mobile (`2026-07-12T07:59:26.377Z`) sweeps have zero diff/local failures under frozen CSS; no route patch was warranted.
- 2026-07-12 Alice watcher-list closure note: the current route matches the legacy watcher-list project menu and body. Fresh production desktop (`2026-07-12T08:00:10.623Z`) and mobile (`2026-07-12T08:00:17.324Z`) sweeps have zero diff/local failures under frozen CSS; no route patch was warranted.
- 2026-07-12 Alice webhook-setting closure note: the current route matches `project/webhooks.scala.html` with the canonical project utility and responsive setting menu. Fresh production desktop (`2026-07-12T08:00:56.070Z`) and mobile (`2026-07-12T08:01:02.708Z`) sweeps have zero diff/local failures under frozen CSS; no route patch was warranted.
- 2026-07-12 SVN watcher-list closure note: the current route matches the legacy SVN watcher utility, project menu, and body. Fresh production desktop (`2026-07-12T08:01:54.323Z`) and mobile (`2026-07-12T08:02:01.032Z`) sweeps have zero diff/local failures under frozen CSS; no route patch was warranted.
- 2026-07-12 Alice milestone-edit closure note: the current route preserves `milestone/edit.scala.html`'s project shell, edit form, editor, uploader, and action row. Fresh production desktop (`2026-07-12T08:02:44.611Z`) and mobile (`2026-07-12T08:02:52.143Z`) sweeps have zero diff/local failures under frozen CSS; no route patch was warranted.
- 2026-07-12 Alice all-milestones closure note: the shared legacy header correction restores the all-state milestone-list breadcrumb without another route patch. Fresh production desktop (`2026-07-12T08:03:41.107Z`) and mobile (`2026-07-12T08:03:47.899Z`) sweeps have zero diff/local failures under frozen CSS.
- 2026-07-12 Alice closed-milestones closure note: the shared legacy header correction restores the closed-state milestone-list breadcrumb without another route patch. Fresh production desktop (`2026-07-12T08:04:30.194Z`) and mobile (`2026-07-12T08:04:36.995Z`) sweeps have zero diff/local failures under frozen CSS.
- 2026-07-12 Alice open-milestones closure note: the shared legacy header correction restores the open-state milestone-list breadcrumb without another route patch. Fresh production desktop (`2026-07-12T08:05:21.477Z`) and mobile (`2026-07-12T08:05:28.192Z`) sweeps have zero diff/local failures under frozen CSS.
- 2026-07-12 Alice issue-template board-create closure note: the current route preserves `board/create.scala.html`'s issue-template editor state and project shell. Fresh production desktop (`2026-07-12T08:06:17.634Z`) and mobile (`2026-07-12T08:06:24.726Z`) sweeps have zero diff/local failures under frozen CSS; no route patch was warranted.
- 2026-07-12 Alice README board-create closure note: the current route preserves `board/create.scala.html`'s README-update editor/uploader state and project shell. Fresh production desktop (`2026-07-12T08:07:17.382Z`) and mobile (`2026-07-12T08:07:24.621Z`) sweeps have zero diff/local failures under frozen CSS; no route patch was warranted.
- 2026-07-12 Alice sent-pull-request closure note: the shared legacy header correction restores the sent pull-request list breadcrumb without another route patch. Fresh production desktop (`2026-07-12T08:08:12.547Z`) and mobile (`2026-07-12T08:08:19.209Z`) sweeps have zero diff/local failures under frozen CSS.
- 2026-07-12 Alice leave-project closure note: `/info/leave/alice/sample` now translates UserApp's direct membership-removal redirect into a typed CSRF DELETE followed by the exact legacy user projects URL. Its isolated focused E2E passes, and the final redirect screen has zero-diff production desktop (`2026-07-12T08:15:57.235Z`) and mobile (`2026-07-12T08:16:03.836Z`) paired sweeps under frozen CSS.
- 2026-07-12 notifications closure note: the current route matches the legacy notifications list and shell. Fresh production desktop (`2026-07-12T08:18:07.811Z`) and mobile (`2026-07-12T08:18:14.395Z`) sweeps have zero diff/local failures under frozen CSS; no route patch was warranted.
- 2026-07-12 organization-create closure note: the current route matches `organization/create.scala.html`'s shell and form. Fresh production desktop (`2026-07-12T08:19:01.596Z`) and mobile (`2026-07-12T08:19:08.715Z`) sweeps have zero diff/local failures under frozen CSS; no route patch was warranted.
- 2026-07-12 project-create closure note: the current route matches `project/create.scala.html`'s shell and form. Fresh production desktop (`2026-07-12T08:19:57.435Z`) and mobile (`2026-07-12T08:20:04.210Z`) sweeps have zero diff/local failures under frozen CSS; no route patch was warranted.
- 2026-07-12 empty-owner project-create closure note: the current route matches `project/create.scala.html` when `owner` is explicitly blank. Fresh production desktop (`2026-07-12T08:20:52.488Z`) and mobile (`2026-07-12T08:20:59.260Z`) sweeps have zero diff/local failures under frozen CSS; no route patch was warranted.

- 2026-07-12 direct issue-create closure note: `/user/issues/new` injects the direct route runtime into the shared legacy issue-form projection, so its project header no longer reads an inactive project-route context. Production desktop (`2026-07-12T08:42:19.500Z`) and mobile (`2026-07-12T08:42:26.675Z`) paired sweeps against live ko-KR legacy report zero local/diff failures. The sweep fixture now also records the same Alice recent-project and watcher state as legacy; no CSS/LESS or numeric layout compensation changed.

- 2026-07-12 direct issue-create comment-reference closure note: the existing direct-route runtime bridge also preserves `IssueApp.newIssueFormByComment`'s selected-project shell and referenced-body state at `/user/issues/new?commentId=1`. Fresh production desktop (`2026-07-12T08:45:56.751Z`) and mobile (`2026-07-12T08:46:17.881Z`) paired sweeps have zero local/diff failures under frozen CSS; no additional implementation or CSS change was needed.

- 2026-07-12 direct-my issue-create closure note: the nested direct-issue parent is now an `Outlet` layout, with the normal direct form in its index child and `/mine` in its own child. This restores the required `mine=true` direct-options request and IssueApp's own-project selection (`admin/svnplayground` in the frozen fixture), rather than using the ordinary recent project. Focused Playwright passes 4/4; production desktop (`2026-07-12T08:53:12.696Z`) and mobile (`2026-07-12T08:53:20.169Z`) paired sweeps have zero local/diff failures under frozen CSS.
