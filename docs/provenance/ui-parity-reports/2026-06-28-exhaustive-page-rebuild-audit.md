# 2026-06-28 Exhaustive Page Rebuild Audit

Status: active audit ledger
Date: 2026-06-28
Directive: `docs/plans/2026-06-28-destructive-template-frontend-rebuild.md`

## Purpose

This ledger starts the full-site destructive React rebuild audit from the
legacy Scala HTML templates. Existing React tests, route components, and prior
`covered` labels are not treated as contracts. They are implementation evidence
only after the matching `yona-original/app/views/**` template and included
partials are checked again.

The immediate rule from the current parent decision is:

- Sidebar must be a React SPA root-layout surface.
- The old frontend `/sidebar` iframe/framed contract is retired.
- Tests must be rewritten from legacy Scala template anchors, not from previous
  React behavior.

2026-07-01 current-state correction, refreshed after detail-route restoration: entries below that cite deleted detail-route tests such as `issue-detail-parity.e2e.ts` or `board-posting-parity.e2e.ts` are historical audit notes unless the current tree contains the named route and test. Active issue and board detail coverage now lives in `frontend/tests/project-issue-detail.e2e.ts` and `frontend/tests/project-posts.e2e.ts`.

## Inventory Counts

Legacy Scala templates under `yona-original/app/views/**`:

| legacy directory | template count |
| --- | ---: |
| `board/` | 6 |
| `code/` | 13 |
| `common/` | 35 |
| `error/` | 9 |
| `git/` | 17 |
| `help/` | 5 |
| `index/` | 16 |
| `issue/` | 30 |
| `migration/` | 2 |
| `milestone/` | 5 |
| `organization/` | 17 |
| `project/` | 26 |
| `reviewthread/` | 2 |
| `search/` | 10 |
| `site/` | 14 |
| `user/` | 17 |
| `welcome/` | 2 |

Current React route/component surface under `frontend/src/routes/**`:

| route group | active files |
| --- | ---: |
| `$owner/$projectName/**` | 49 |
| `organizations/**` | 11 |
| `user/**` | 10 |
| `me/**` | 6 |
| standalone public/auth/help/admin route dirs | 30+ |
| shared route view modules `-*.tsx` | 19 |

Large shared view modules that require template-first review before reuse:

| file | lines | owning legacy groups |
| --- | ---: | --- |
| `frontend/src/routes/-issue-views.tsx` | 6206 | `issue/**`, common comment/editor partials |
| `frontend/src/routes/-markdown-renderer.tsx` | 7416 | `common/markdown.scala.html`, editor/tasklist behavior |
| `frontend/src/routes/-project-views.tsx` | 4382 | `project/**`, project layout/menu/header |
| `frontend/src/routes/-pull-request-views.tsx` | 4312 | `git/**`, `reviewthread/**`, diff/comment partials |
| `frontend/src/routes/-syntax-highlighting.tsx` | 4027 | code/diff rendering support |
| `frontend/src/routes/-code-views.tsx` | 2906 | `code/**` |
| `frontend/src/routes/-board-views.tsx` | 2402 | `board/**` |
| `frontend/src/routes/-organization-views.tsx` | 1925 | `organization/**` |
| `frontend/src/routes/-milestone-views.tsx` | 1590 | `milestone/**` |
| `frontend/src/routes/-workspace-views.tsx` | 1391 | `user/**`, `index/**` |

## Audit Rule

For every page group below:

1. Identify the owning Scala template and included partials.
2. Archive the current independently-built JSX for that route group before
   replacing it.
3. Rebuild JSX from the Scala template DOM order, classes, IDs, names, visible
   copy, modal markup, and form controls.
4. Keep form submit and data loading inside typed REST/TanStack Query
   boundaries. Do not restore native Play form posts as active React behavior.
5. Classify every legacy and React `<a>` during the template port:
   - Use TanStack Router `Link` for internal SPA navigation once the target
     route/search contract is represented in the route tree.
   - Keep a plain `<a>` for hash anchors, tabs/modals/dropdowns, downloads,
     external URLs, `mailto:`, raw/blob/file endpoints, and legacy anchors whose
     browser-default behavior is the UX being preserved.
   - Convert action links to buttons plus TanStack Query mutations when the
     legacy anchor is actually a state-changing command.
   - Assert the final `href`, `data-*` hooks, active state, and rendered
     position/size in the owning parity test.
6. Rewrite tests to assert legacy template anchors and rendered behavior. Do
   not preserve tests that only encode previous React structure.
7. Record any missing behavior as `gap`, `deviation`, or `deferred` before
   claiming the group is closed.

## Route Group Audit Status

All prior P0-P7 `covered` claims were reopened for template-source review at the
start of this ledger. The detailed inventory below now records a disposition for
each legacy Scala template row; no `reopen: inspect` row remains in this audit.
Follow-up rendered-evidence backlog, where any remains, is tracked in
`2026-06-28-rendered-evidence-execution-manifest.md`.

| group | primary legacy templates | current React owner | audit status | next action |
| --- | --- | --- | --- | --- |
| P0 global shell/layout/navbar/sidebar/footer | `layout.scala.html`, `common/navbar.scala.html`, `common/usermenu.scala.html`, `sidebar.scala.html`, `common/footer.scala.html`, `common/scripts.scala.html` | `__root.tsx`, `app.css`, `sidebar/route.tsx` | audit disposition recorded | Follow rendered-evidence manifest backlog only. |
| P1 auth/public/home/help | `index/partial_intro.scala.html`, `user/login.scala.html`, `user/signup.scala.html`, `site/lostPassword.scala.html`, `user/resetPassword.scala.html`, `help/*.scala.html`, `welcome/*.scala.html` | `-auth-views.tsx`, `-home-view.tsx`, `-help-views.tsx`, public route dirs | audit disposition recorded | Follow rendered-evidence manifest backlog only. |
| P2 project shell/settings/members/webhooks | `projectLayout.scala.html`, `project/header.scala.html`, `projectMenu.scala.html`, `project/home.scala.html`, `project/setting.scala.html`, `project/members.scala.html`, `project/webhooks.scala.html`, `project/issuelabels.scala.html`, `project/delete.scala.html`, `project/transfer.scala.html`, `project/change_vcs.scala.html` | `$owner/$projectName/**`, `-project-views.tsx` | audit disposition recorded | Follow rendered-evidence manifest backlog only. |
| P3 issues/editor/comments/attachments | `issue/list.scala.html`, `issue/create.scala.html`, `issue/edit.scala.html`, `issue/view.scala.html`, `issue/partial_*.scala.html`, common editor/comment/upload partials | issue routes, `-issue-views.tsx`, markdown/editor modules | audit disposition recorded | Follow rendered-evidence manifest backlog only. |
| P4 boards/milestones/posts | `board/*.scala.html`, `milestone/*.scala.html`, board/milestone partials | board/post/milestone routes, `-board-views.tsx`, `-milestone-views.tsx` | audit disposition recorded | Follow rendered-evidence manifest backlog only. |
| P5 code/git/pull-request/review | `code/*.scala.html`, `git/*.scala.html`, `reviewthread/*.scala.html`, diff/comment partials | code/git/PR routes, `-code-views.tsx`, `-pull-request-views.tsx`, syntax/diff helpers | audit disposition recorded | Follow rendered-evidence manifest backlog only. |
| P6 organization/directory/workspace/profile/settings/notifications/search | `organization/**`, `organizationLayout.scala.html`, `index/all*`, `index/my*`, `index/notifications.scala.html`, `search/*.scala.html`, `user/view.scala.html`, `user/edit*.scala.html`, `user/userFiles.scala.html` | organization, directory, workspace, notification, search routes and shared modules | audit disposition recorded | Follow rendered-evidence manifest backlog only. |
| P7 site-admin/error/restricted/migration/import | `site/*.scala.html`, `site/siteMngLayout.scala.html`, `error/*.scala.html`, `restricted.scala.html`, `migration/*.scala.html`, `project/importing.scala.html` | `sites/$pageName`, restricted/error/import/migration routes | audit disposition recorded | Follow rendered-evidence manifest backlog only. |

## First High-Risk Findings

| finding | classification | action |
| --- | --- | --- |
| Prior tests encoded `/sidebar` iframe/framed React behavior instead of the current parent decision. | stale React-contract test | Rewritten in `auth-workspace-shell.spec.tsx` to read legacy Scala templates and assert SPA layout sidebar anchors. |
| Existing large shared `-*-views.tsx` modules mix many template groups in one file. | audit risk | Archive per route group before destructive replacement; do not use these modules as DOM/UX evidence. |
| Existing P0-P7 reports contain many `covered in current follow-up` rows that predate the destructive rebuild directive. | weak closure basis | Treat reports as route/evidence index only; each row must be rechecked against Scala templates. |
| Some legacy server-rendered fragments are now REST/API-return plus React render. | conversion boundary | Preserve React-rendered DOM parity, but do not reintroduce server HTML injection as runtime data. |

## Full Legacy Template Inventory

Every legacy Scala template is assigned to a rebuild packet below. No row in
this ledger remains in `reopen: inspect` state.

The generated anchor inventory for the same 242 templates is:
`docs/provenance/ui-parity-reports/2026-06-28-legacy-template-anchor-inventory.md`.
It extracts IDs, classes, form names/actions, `data-*` attributes, message keys,
and included template/helper calls from each Scala file. Use it as the first
checklist when rewriting tests and JSX, then verify the rendered route against
the owning template and partials.

The generated static React owner coverage matrix is:
`docs/provenance/ui-parity-reports/2026-06-28-static-react-owner-coverage.md`.
It maps all 242 legacy templates to likely `frontend/src/routes/**` owner files
and checks anchor string overlap. The current static triage result is 134
`static-anchor-candidate`, 93 `partial-static-match`, 3
`needs-static-review`, 12 `no-static-anchors`, and 0 `needs-owner-map`. These
counts are queue triage only; rendered route verification is still required
before any template is closed.

The rendered verification queue derived from that matrix is:
`docs/provenance/ui-parity-reports/2026-06-28-rendered-verification-queue.md`.
It keeps all 242 templates in scope and splits them into 12 P0, 89 P1, 7 P2,
and 134 P3 rendered verification rows. The current exhaustive rebuild audit
ledger records row dispositions here; remaining rendered-evidence work, if any,
is tracked by the execution manifest.

The first P0 source pass is:
`docs/provenance/ui-parity-reports/2026-06-28-p0-rendered-audit-pass.md`.
It opens the 12 P0 rows and classifies them as source-match checks,
intentional framed-layout deviations, gap candidates, or thin-wrapper caller
checks. This is not P0 closure; each row still needs rendered route evidence or
an explicit `gap`, `deviation`, or `deferred` record.

The first P1 source pass is:
`docs/provenance/ui-parity-reports/2026-06-28-p1-source-audit-pass.md`.
It expands all 89 P1 rows into source-level risk buckets: 57 rendered
interaction checks, 18 caller-route checks, 11 dynamic selector checks, and 3
rendered selector checks. This is not P1 closure; it identifies the rendered
evidence each row still needs.

The P2/P3 source pass is:
`docs/provenance/ui-parity-reports/2026-06-28-p2-p3-source-audit-pass.md`.
It expands the remaining 7 P2 rows and 134 P3 rows. Across the P0, P1, and
P2/P3 passes, all 242 legacy templates now have a source-pass follow-up row.
This still is not exhaustive audit completion: rendered route evidence, or a
precise `gap`, `deviation`, or `deferred` record, is required before any row
leaves the queue.

The rendered evidence execution manifest is:
`docs/provenance/ui-parity-reports/2026-06-28-rendered-evidence-execution-manifest.md`.
It maps all 242 source-pass rows to concrete route/evidence buckets and compares
them with `output/playwright/visual-sweep/latest.json` from
2026-06-28T07:48:07.381Z. The latest sweep can support route-open evidence for
240 rows; the 2 remaining rows are the intentionally retired framed layout
templates and now have a focused absence guard in
`frontend/src/auth-workspace-shell.spec.tsx` proving the iframe shell stays
absent from active React/CSS.
Selector, copy, form, and `data-*` assertions are still needed before final UI
parity closure, and selector-only evidence is not final UI parity. Rendered
evidence must also cover size, position, and alignment or screenshot-diff
parity. The execution manifest is the remaining rendered-evidence backlog; this
audit ledger itself has no remaining `reopen: inspect` rows.

### `board/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `board/create.scala.html` | P4 board | metric guard passed: `board-posting-parity.e2e.ts` asserts legacy project shell, title/editor/uploader/options/actions vertical order, 97% title width, full textarea width, hidden fields, upload, and TanStack mutation boundary |
| `board/edit.scala.html` | P4 board | metric guard passed: `board-posting-parity.e2e.ts` asserts edit label/title/editor/uploader/options/actions order, notification checkbox, readme/notice controls, and TanStack mutation boundary |
| `board/list.scala.html` | P4 board | metric guard passed: `board-posting-parity.e2e.ts` asserts project shell stack, toolbar/search/write button alignment, sort/filter/notice/list/pagination order, and board row avatar/title/meta alignment |
| `board/partial_comments.scala.html` | P4 board | metric guard passed: `board-posting-parity.e2e.ts` asserts comment header, comment avatar/media-body alignment, attachment metadata, edit/delete hooks, comment form order, uploads, and mutation boundaries |
| `board/partial_list.scala.html` | P4 board | metric guard passed: `project-posts.e2e.ts` asserts notice and normal post rows, avatar, title, comment count, label `data-category-id`/`data-label-id` anchors, active label color metrics, author links, and pagination placeholder alignment |
| `board/view.scala.html` | P4 board | metric guard passed: `board-posting-parity.e2e.ts` asserts board header/title, left/right pane alignment, author/body/attachments/actions/comment ordering, watch/label/delete/comment mutations, and modal hooks |

### `code/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `code/branches.scala.html` | P5 code | metric guard passed: `code-parity.e2e.ts` asserts branch tabs/table header/body column alignment, default branch marker, set-default/delete controls, data-request hooks, and mutation boundaries |
| `code/compare.scala.html` | P5 code | metric guard passed: `code-parity.e2e.ts` asserts the legacy compare shell project/code wrappers, commitInfo/commitId copy, diff-body.discommentable ordering, absence of non-legacy compare headings/placeholders, diff file/code placement, and commitInfo/background/border/padding metrics |
| `code/compare_svn.scala.html` | P5 code | whole-screen DOM guard passed: `project-code-compare-svn.e2e.ts` asserts the legacy SVN compare shell, `commitInfo`/`commitId` copy, `.diff-wrap > #commit.diff-body.hide[data-commit-origin=true]` raw patch anchor, absence of Git `.diff-body.discommentable`, and active Code project menu |
| `code/diff.scala.html` | P5 code | whole-screen DOM guard passed: `project-code-commit-detail.e2e.ts` asserts the legacy Git empty-discussion commit detail shell with `#code-browse-wrap`, code tabs, `.codediff-wrap`, review-card toggle, `.diffs-wrap`, `.commitInfo`, `.diff-body`, `.btnPop`, empty thread/review-card containers, comment/review form shells, `#watch-button`, List link, and hidden comment delete modal |
| `code/history.scala.html` | P5 code | whole-screen DOM guard passed: `project-code-history.e2e.ts` asserts branch history selector/tabs/table/pagination and `project-code-history-file.e2e.ts` asserts root and nested path breadcrumb/table/browse/newer/older ordering |
| `code/nohead.scala.html` | P5 code | metric guard passed: `project-code-comment-upload-parity.e2e.ts` asserts the legacy Git no-head guidance shell, resolved no-head copy, four Git command heading/pre/code blocks, no raw message keys, page/code wrapper alignment, alert/heading/pre vertical order, and Bootstrap heading/pre display/font/white-space metrics |
| `code/nohead_svn.scala.html` | P5 code | metric guard passed: `project-code-comment-upload-parity.e2e.ts` asserts the legacy SVN no-head guidance shell, resolved no-head copy, one SVN command heading/pre/code block, absence of Git clone guidance, no raw message keys, page/code wrapper alignment, alert/heading/pre vertical order, and Bootstrap heading/pre display/font/white-space metrics |
| `code/partial_branchrow.scala.html` | P5 code | metric guard passed: `code-parity.e2e.ts` asserts branch row name/commit/PR/actions column alignment and mutation data hooks |
| `code/partial_nonrange_codecomment_thread.scala.html` | P5 code | metric guard passed: `project-code-comment-upload-parity.e2e.ts` asserts the non-ranged commit thread `#thread-*` shell, open state class, no range/header hooks, `yobicon-comments` minimize control, comment id/avatar/meta/ago/delete hooks, markdown body, attachments anchor, reply form placement, upload-backed TanStack mutation payload, and block layout metrics |
| `code/partial_view_file.scala.html` | P5 code | metric guard passed: `code-parity.e2e.ts` asserts file header raw/open buttons, `#showCode`, code-line, and line-number alignment; whole-screen DOM guard passed: `project-code-view-file.e2e.ts` asserts root/nested text-file branch selector/breadcrumb/action href ordering, the Markdown `#codeVal.markdown-wrap.codebrowser-markdown` branch, binary image `#showImage.image-wrap`, non-image binary `#showFile.file-wrap`, and too-large text raw fallback branches |
| `code/partial_view_folder.scala.html` | P5 code | metric guard passed: `code-parity.e2e.ts` asserts folder/file rows, branch selector, breadcrumb, new/download controls, and viewer row ordering |
| `code/svnDiff.scala.html` | P5 code | metric guard passed: `project-code-comment-upload-parity.e2e.ts` asserts the legacy commit detail SVN diff shell with `#branches.btn-group.branches.pull-right` before code tabs, selected branch label, branch dropdown source, commit diff shell ordering, and comment/watch mutation preservation |
| `code/view.scala.html` | P5 code | metric guard passed: `code-parity.e2e.ts` asserts project shell, code tabs/header controls, and viewer order for folder/file routes |

### `common/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `common/attachmentFile.scala.html` | shared partials | metric guard passed: `issue-detail-parity.e2e.ts` asserts the legacy comment update attachment caller with `.attachment-files .attached-file.attached-file-marker`, `data-name`/`data-href`/`data-mime`, `i.mimetype`, `strong.name`, `span.size`, delete button `data-id`, file/name/size/delete x-order, attachment container placement, and legacy attached-file display/background/border/height/line-height/margin/padding metrics |
| `common/branchItem.scala.html` | shared partials | metric guard passed: `project-code-comment-upload-parity.e2e.ts` asserts the legacy `svnDiff.scala.html` caller renders branch item `li[data-value]`, selected `data-selected`, branch/tag label display, Scala-compatible refs item name trimming, encoded history hrefs, and dropdown/button placement metrics |
| `common/calendar.scala.html` | shared partials | metric guard passed: `issue-form-parity.e2e.ts` asserts the legacy issue create/edit callers keep `#issueDueDate[data-toggle=calendar][name=dueDate]`, `.btn-calendar .yobicon-calendar2`, due-date option placement, calendar button display metrics, and absence of direct legacy moment/pikaday/yobi calendar script injection in React |
| `common/childComments.scala.html` | shared partials | metric guard passed: `issue-detail-parity.e2e.ts` asserts the legacy nested issue-comment caller with `.add-a-comment.pull-right`, `.subcomment-media-body`, `.child-comments`, `.one-line-comment`, `.contents`, hidden `.subcomment-author`, child author/date/delete hooks, child form action/`parentCommentId`/textarea placeholder, zero-height child anchor, right-aligned 60px subcomment body, dashed content divider, hidden child form, and legacy color/padding/margin metrics |
| `common/childCommentsAnchorDiv.scala.html` | shared partials | metric guard passed: `project-issue-detail.e2e.ts` and `project-posts.e2e.ts` assert active issue and board detail nested comment callers render an empty `#comment-{childId}` anchor before `.one-line-comment`, preserve child comment `#comment-*` hrefs/delete hooks, hidden child author metadata, reply form ordering, and zero-height anchor placement against `.child-comments` and the child row |
| `common/child_commentForm.scala.html` | shared partials | metric guard passed: `issue-detail-parity.e2e.ts` asserts the legacy nested issue-comment child form action/method/enctype, hidden `parentCommentId`, `.oneline-comment-box`, `textarea.editorSeries[name=contents][markdown=true]` placeholder/rows, `OK` submit button, `.notification-receiver` copy/styles, hidden form layout, and REST/TanStack comment mutation body with `parentCommentId` |
| `common/commentAndVoterPairDisplay.scala.html` | shared partials | metric guard passed: `issue-detail-parity.e2e.ts` asserts the legacy `issue/partial_view_child.scala.html` caller inside issue detail subtasks, `.font12.no-border-at-child`, nested `.item-count-groups`, comment/vote links, icon/count ordering and vertical overlap, no-border child override, `#comments`/`#vote` hrefs, magenta/orange colors, vote -5px second-link margin, subtask wrapper margins, parent font size, child padding, delimiter margin/border, and legacy icon/count padding/font metrics |
| `common/commentCount.scala.html` | shared partials | metric guard passed: `project-issues-empty.e2e.ts` asserts the legacy visible issue-list caller row, `.comments-count.comments-count-color`, `.count-groups.item-icon`, `.yobicon-comment2`, plain `.count-groups.item-count`, mounted issue `#comments` href, first-link placement, magenta comment color, non-strong classes, and icon/count ordering |
| `common/commentDeleteModal.scala.html` | shared partials | metric guard passed: `issue-detail-parity.e2e.ts` asserts the legacy issue-detail comment delete caller, hidden/open `#comment-delete-modal.modal.hide.fade`, header/body/footer ordering, close button right placement, 480px viewport-centered modal sizing, top placement, padding/border/footer flex metrics, `#comment-delete-confirm` and `data-request-uri` hooks, cancel close behavior, and REST DELETE mutation boundary |
| `common/commentForm.scala.html` | shared partials | metric guard passed: `issue-detail-parity.e2e.ts` asserts the legacy issue comment caller form `#comment-form` action/method/enctype, editor textarea name/classes, markdown help tabs, file uploader hidden `temporaryUploadFiles`, hidden `#dynamic-comment-btn`, notification receiver styles/copy, write-comment box/editor/uploader/submit ordering and size metrics, image paste/drop upload hooks, and REST/TanStack comment submit body |
| `common/commentUpdateForm.scala.html` | shared partials | metric guard passed: `issue-detail-parity.e2e.ts` asserts the legacy issue comment update form caller with `#comment-editform-10`, form action/method/enctype, hidden `id`, update markdown editor shell, textarea name/`data-editor-mode`/`markdown=true`, upload-drop-here, file upload controls, notification checkbox, cancel/save buttons, `temporaryUploadFiles`/preview/attachment/upload target hooks, layout/style metrics, and PUT REST/TanStack update body |
| `common/commitMsg.scala.html` | shared partials | metric guard passed: `code-parity.e2e.ts` asserts the legacy commit history caller with linked `.commitMsg.short`, adjacent `.commitMsg.moreBtn` ellipsis button, hidden `.commitMsg.desc` body text trimmed after the first line, full commit href, message-cell placement, and short/more/desc display and white-space metrics |
| `common/debug.scala.html` | shared partials | targeted absence guard passed: `root-shell-parity.e2e.ts` asserts the dormant no-caller debug fragment does not leak `lang = ...` output or `body > .container` debug markup into active root, authenticated workspace, or standalone legacy React routes |
| `common/editor.scala.html` | shared partials | metric guard passed: `issue-detail-parity.e2e.ts` asserts the legacy issue comment editor caller with `data-toggle="markdown-editor"`, edit/preview tab hrefs and data modes, task-list and clear-temporary buttons, editor notice label, `#edit-comment-body`/`#preview-comment-body` tab panes, textarea name/classes/`data-editor-mode`/`markdown=true`, markdown preview class, notification receiver, Bootstrap tab-pane hidden/active display metrics, markdown help layout, preview toggle, image paste/drop upload hooks, and REST/TanStack submit body |
| `common/fileUploader.scala.html` | shared partials | metric guard passed: `issue-detail-parity.e2e.ts` asserts the legacy issue comment file uploader caller with `#upload.upload-wrap.content-footer`, resource type, uploader help/click/paste/save copy, upload button/file input, attached-files list, `tplAttachedFile` and `tplDropFilesHere` jQuery templates, attached-file/progress/delete/insert hooks, drop overlay style metrics, paste/drop upload requests, and REST/TanStack comment submit attachment IDs |
| `common/footer.scala.html` | P0 global shell | metric guard passed: `root-shell-parity.e2e.ts` asserts footer placement below navbar/content, full-width footer inner, provider links, and root/standalone footer separation |
| `common/issueLabelColor.scala.html` | shared partials | metric guard passed: `project-issues-empty.e2e.ts` and `project-posts.e2e.ts` assert the project issue-list, mass-update label, and board-list callers with active label background color, generated text colors (`dimgray`/white), inset 2px box-shadow color, inert href, `data-label-id` anchors, and label placement next to the count pair/post metadata |
| `common/loginDialog.scala.html` | P0 global shell | metric guard passed: `ui-kit.e2e.ts` asserts the root shell hidden modal DOM and delegated `[data-login="required"]` visible state: stale value/error reset, focus, `modal loginDialog in` classes, `aria-hidden=false`, backdrop, width/center/form/input/button/remember-label metrics, and dismiss-to-hidden behavior |
| `common/markdown.scala.html` | shared partials | metric guard passed: `issue-detail-parity.e2e.ts` asserts the legacy issue detail caller renders markdown body/help/editor surfaces while React does not inject legacy `highlight` CSS/script, `marked.js`, or `yobi.Markdown.init` script tags; markdown body/task-list metrics remain covered by issue shell/tasklist guards |
| `common/mySeriesMenuTab.scala.html` | shared partials | metric guard passed: `search-parity.e2e.ts` asserts the legacy notifications caller with `.nav.nav-tabs`, active notification tab, issue/files tab hrefs and resolved labels, `#setDefaultLoginPage` type/class/data-url/title/popover hooks, tab/button x-order, shared y alignment, notification list placement after tabs, and legacy Bootstrap nav/button margin/display/font/height metrics |
| `common/navbar.scala.html` | P0 global shell | metric guard passed: `root-shell-parity.e2e.ts` asserts 40px navbar, pin/logo/nav/search/usermenu horizontal alignment, anonymous/auth/admin/guest variants, feedback link, and search form anchors |
| `common/notificationMail.scala.html` | shared partials | non-browser mail template recorded: legacy caller is `NotificationMail.java` rendering an outbound HTML email body, not a browser route/partial; Rust server parity lives in `crates/server/src/notification_mail.rs::notification_mail_legacy_body`, so this is excluded from React visual-layout metric closure. |
| `common/partial_history.scala.html` | shared partials | metric guard passed: `board-posting-parity.e2e.ts` asserts the legacy posting history caller link, `#-yona-posting-history.modal.hide` default state, header close/title, `.modal-body > p` markdown content, footer confirm button, modal open/close behavior, 562px border-box width, centered fixed positioning, header/body/footer vertical order, close-button right placement, and rendered body/footer display metrics |
| `common/reviewForm.scala.html` | shared partials | metric guard passed: `project-code-comment-upload-parity.e2e.ts` asserts the legacy code review form caller `#review-form.review-form`, POST multipart action, current-user `.author-info-wrap.pull-left.hide-in-mobile` avatar tooltip hooks, `.write-comment-box > .write-comment-wrap`, close button `data-toggle=close`, markdown editor `code-review-body`, upload form shell `#upload[data-resource-type=COMMIT_COMMENT]`, file input, right-aligned submit, layout metrics, and TanStack mutation payload continuity |
| `common/scripts.scala.html` | P0 global shell | metric guard passed: `root-shell-parity.e2e.ts` asserts the global `#yobiDialog.modal.hide.yobiDialog`, `#yobiToasts.yobiToasts`, `script#tplYobiToast[type="text/x-jquery-tmpl"]` toast template, dialog `data-dismiss=modal` buttons, anonymous login-dialog inclusion, and `data-toggle=search-scope` click behavior that updates `form[name=gnb-search-form]` action/title before SPA search navigation |
| `common/select2.scala.html` | shared partials | targeted selector guard passed: `root-shell-parity.e2e.ts` asserts inert legacy select2 formatter templates `#tplSelect2FormatUser`, `#tplSelect2FormatMilestone`, `#tplSelect2Projects`, `#tplSelect2ProjectsWithoutAvatar`, and `#tplSelect2FormatIssues` with `text/x-jquery-tmpl` type and legacy user/milestone/project/issue fragments; representative select2 caller `data-*` anchors and rendered fallback/control metrics remain covered by issue-detail, board-posting, code, issue-form, and vote-count tests without restoring the jQuery select2 runtime |
| `common/sharerCount.scala.html` | shared partials | metric guard passed: `project-issues-empty.e2e.ts` asserts the legacy visible issue-list caller row, `.sharer-color`, `.count-groups.item-icon`, `.yobicon-friends`, `.count-groups.item-count.strong`, tooltip/title attributes, absence of a non-legacy href, and icon/count ordering |
| `common/showSubtasksCheckbox.scala.html` | shared partials | metric guard passed: `project-issues-empty.e2e.ts` asserts the legacy visible issue-list caller tabs, `.show-subtasks-li`, `.show-subtasks.mr10`, `#toggle-show-subtasks`, `.show-subtasks-button-border`, `.show-subtasks-text`, popover attributes, and two-column sibling placement |
| `common/tasklistBar.scala.html` | shared partials | metric guard passed: `issue-detail-parity.e2e.ts` asserts the legacy issue-body tasklist bar, `.tasklist.task-show`, `.task-title`, `.done-counter`, `.task-progress`, `.task-progress .bar`, `Tasklist` title, `Tasks(1/2)` copy, 50% bar width, title/progress vertical ordering, 20px horizontal padding, 10px top padding, 5px counter margin, 2px bar height, red incomplete bar, gray progress background, and title font weight |
| `common/twoColumnModeCheckboxArea.scala.html` | shared partials | metric guard passed: `project-issues-empty.e2e.ts` asserts the legacy visible issue-list caller tabs, `.two-column-icon.mr10.hide-in-mobile`, `#two-column-mode-checkbox`, `#two-column-mode`, `.two-column-icon-border`, `.two-column-mode-text`, title/data-content attributes, and placement between the closed tab and show-subtasks control |
| `common/uploadForm.scala.html` | shared partials | metric guard passed: `issue-detail-parity.e2e.ts` asserts the legacy issue comment upload form caller with `#upload.upload-wrap.content-footer`, `data-resource-type=ISSUE_COMMENT`, `.attach-wrap`, `.help-droppable`, `.btn-wrap`, `.fake-file-wrap`, `input.file[name=filePath][multiple]`, `.plain`, `.help-pastable`, `.attached-files.unstyled`, `.right-txt.help`, uploader size/position metrics, paste/drop upload requests, and hidden `temporaryUploadFiles` submit body |
| `common/usermenu.scala.html` | P0 global shell | metric guard passed: `root-shell-parity.e2e.ts` asserts anonymous login/signup links, authenticated issue/admin/sidebar/create menu alignment, right-side 360px sidebar open/close, profile/account/logout rows, and guest variant |
| `common/usermenu_tab_content_list.scala.html` | P0 global shell | metric guard passed: `root-shell-parity.e2e.ts` asserts sidebar tab row ordering, tab content placement, and organization/project/recent issue pane x-alignment/content |
| `common/uservoice.scala.html` | P0 global shell | targeted absence guard passed: legacy search finds no active Scala caller for the dormant UserVoice SDK fragment; `root-shell-parity.e2e.ts` asserts active React root/authenticated/standalone shell routes do not inject `widget.uservoice.com`, `classic_widget`, the legacy widget key script, body-visible UserVoice text, or `window.UserVoice` while preserving the navbar feedback link from `common/navbar.scala.html` |
| `common/voteCount.scala.html` | shared partials | metric guard passed: `project-issues-empty.e2e.ts` asserts the legacy visible issue-list caller row, `.vote-count.vote-color`, `.count-groups.item-icon`, `.yobicon-hearts`, `.count-groups.item-count.strong`, mounted issue `#vote` href, `.item-count-groups` border/line-height, icon/count order, color, padding, and font metrics |

### `error/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `error/badrequest.scala.html` | P7 error/security | metric guard passed: `project-members-parity.e2e.ts` asserts the legacy project bad-request caller through the members route with project header/menu/page-wrap shell, `.project-page-wrap > .error-wrap`, centered `.ico.ico-err2`, resolved bad-request copy, no action button, no member management controls, 100px vertical padding, 30px message margin, 16px bold message, and centered icon/message placement |
| `error/badrequest_default.scala.html` | P7 error/security | metric guard passed: `search-parity.e2e.ts` asserts the default bad-request shell, `.page-wrap-outer`/`.project-page-wrap`/`.error-wrap` placement, centered `.ico-404`, resolved bad-request copy, 100px vertical padding, 30px message margins, 16px bold gray message, centered `.ybtn.ybtn-info` home action, and search form/error banner absence |
| `error/forbidden.scala.html` | P7 error/security | metric guard passed: `project-members-parity.e2e.ts` asserts the authenticated project forbidden caller through the members route with project header/menu/page-wrap shell, `.project-page-wrap > .error-wrap`, centered `.ico.ico-err2`, resolved forbidden copy, no login button for authenticated users, no member management controls, 100px vertical padding, 30px message margin, 16px bold message, and centered icon/message placement |
| `error/forbidden_default.scala.html` | P7 error/security | metric guard passed: `search-parity.e2e.ts` asserts the legacy default forbidden shell on a 403 REST search response with `.page-wrap-outer`/`.project-page-wrap`/`.error-wrap`, centered `.ico.ico-err2`, resolved forbidden copy, primary home action, no search form/error banner, 100px vertical padding, 30px message margins, 16px bold gray message, centered icon/message/button placement, and primary button display/height/line-height metrics |
| `error/forbidden_organization.scala.html` | P7 error/security | metric guard passed: `shell-routing-smoke.e2e.ts` asserts the legacy organization forbidden caller through the members route with organization header/menu/page-wrap shell, `.project-page-wrap > .error-wrap`, centered `.ico.ico-err2`, resolved forbidden copy, no action button, no member management controls, 100px vertical padding, 30px message margin, 16px bold message, and centered icon/message placement |
| `error/internalServerError_default.scala.html` | P7 error/security | metric guard passed: `search-parity.e2e.ts` asserts the legacy default internal-server-error shell on a 500 REST search response with `.page-wrap-outer`/`.project-page-wrap`/`.error-wrap`, centered `.ico-404`, resolved internal-server-error copy, centered `.ybtn.ybtn-info` home action, no search form/error banner, 100px vertical padding, 30px message margins, 16px bold gray message, and centered icon/message/button placement |
| `error/notfound.scala.html` | P7 error/security | metric guard passed: `shell-routing-smoke.e2e.ts` asserts the legacy project not-found caller through an issue detail 404 with project header/menu/page-wrap shell, active issue context, `.project-page-wrap > .error-wrap`, centered `.ico.ico-err2`, resolved issue-not-found copy, centered `.ybtn.ybtn-primary` List action to the issue list, no issue detail/comment controls, 100px vertical padding, 30px message margins, 16px bold message, and centered icon/message/button placement |
| `error/notfound_default.scala.html` | P7 error/security | metric guard passed: `auth-public-entry-parity.e2e.ts` asserts the default not-found shell when secret setup is disabled, root GNB/footer presence, standalone secret-page chrome suppression, `.page-wrap-outer`/`.project-page-wrap`/`.error-wrap` placement, centered `.ico.ico-err2`, resolved not-found copy, 100px vertical padding, 30px message margins, 16px bold gray message, and centered `.ybtn.ybtn-info` home action |
| `error/requestTextEntityTooLarge.scala.html` | P7 error/security | metric guard passed: `search-parity.e2e.ts` asserts the legacy request-text-too-large shell on a 413 REST search response with `.page-wrap-outer`/`.project-page-wrap`/`.error-wrap`, centered `.ico.ico-err2`, resolved title/limit copy with the legacy 102400 byte default, no admin-only paragraph for a non-site-admin viewer, no action button, no search form/error banner, 100px vertical padding, 30px paragraph margins, 16px bold gray text, and centered icon/text placement |

### `git/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `git/clone.scala.html` | P5 git/pr | metric guard passed: `project-fork-parity.e2e.ts` stalls the TanStack fork mutation and asserts the legacy fork-clone pending shell with `.project-page-wrap`, `.content-wrap.frm-wrap`, `legend` `fork.forking` source/target copy, both `fork.forking.message.*` paragraphs, form absence during pending clone, and redirect-bound mutation still using the existing REST/TanStack boundary |
| `git/create.scala.html` | P5 git/pr | metric guard passed: `pull-request-interaction-parity.e2e.ts` asserts the legacy new PR form shell, branch selector ordering, status/title/editor/commit-area/merge-result/actions vertical order, merge-result commit table sizing, validation behavior, and REST/TanStack mutation boundary |
| `git/edit.scala.html` | P5 git/pr | metric guard passed: `pull-request-interaction-parity.e2e.ts` asserts the legacy edit PR form shell, disabled from/to project and branch controls, branch selector ordering, status/title/commit-area/actions ordering, validation behavior, and REST/TanStack PATCH boundary |
| `git/fork.scala.html` | P5 git/pr | metric guard passed: `project-fork-parity.e2e.ts` asserts the legacy fork route owned by the React project fork page, `.form-horizontal.nm`, `#helpMessage.well`, image/help copy branch, owner/name/share control groups, label/control x alignment, actions order, existing-fork notice branch, and REST/TanStack fork mutation boundary |
| `git/list.scala.html` | P5 git/pr | metric guard passed: `pull-request-review-read-parity.e2e.ts` asserts the legacy project PR list route with `.project-page-wrap`, tab/search/advanced/list/pagination order, row avatar/title/infos/state alignment, category routes, no raw message keys, and REST query fixture rendering |
| `git/partial_branch.scala.html` | P5 git/pr | metric guard passed: `pull-request-review-read-parity.e2e.ts` asserts the PR detail/changes branch partial through `.pullRequest-branchInfo`, from/to code ordering, owner/project/branch anchors, and placement inside the legacy board-body author row |
| `git/partial_forklist.scala.html` | P5 git/pr | metric guard passed: `project-fork-parity.e2e.ts` asserts the existing-fork notice caller with `#helpMessage.well`, `.ico-err2`, primary fork link href/text, form shell placement, owner/name/action ordering, and submit suppression when a same fork already exists |
| `git/partial_info.scala.html` | P5 git/pr | metric guard passed: `pull-request-review-read-parity.e2e.ts` asserts the PR header partial through `.board-header.issue`, date/state badge/title tabs ordering, overview/changes tab anchors, reviewer/merge controls placement, and detail/changes route shell ownership |
| `git/partial_list.scala.html` | P5 git/pr | metric guard passed: `pull-request-review-read-parity.e2e.ts` asserts visible PR list rows with `.post-list-wrap`, `.post-item.title`, avatar/title/infos/state column alignment, review-count link, receiver/state rail, pagination, and closed/sent category variants |
| `git/partial_merge_result.scala.html` | P5 git/pr | metric guard passed: `pull-request-interaction-parity.e2e.ts` asserts `#mergeResult.code-browser-wrap`, `data-conflict`, `#numOfCommits`, `.code-table.commits` sizing, commit message visibility, and placement below the legacy commit tab in the create/edit PR form flow |
| `git/partial_pull_request_event.scala.html` | P5 git/pr | metric guard passed: `pull-request-review-read-parity.e2e.ts` and `pull-request-interaction-parity.e2e.ts` assert `ul#comments .event`, state/date ordering, open/close/reopen/merge event copy, merged commit link/copy, and action-triggered event updates |
| `git/partial_recently_pushed_branches.scala.html` | P5 git/pr | metric guard passed: `pull-request-interaction-parity.e2e.ts` asserts the recently pushed branch title/alert order, split icon before PR link, alert width, generated new-PR link query, delete hook attributes, and REST/TanStack delete mutation |
| `git/partial_reviewlist.scala.html` | P5 git/pr | metric guard passed: `pull-request-review-read-parity.e2e.ts` asserts PR changes review-card rendering inside `.review-wrap .review-container`, review column placement beside the diff body, card/info vertical order, open/closed/outdated anchors, and mobile review-thread anchors |
| `git/partial_search.scala.html` | P5 git/pr | metric guard passed: `pull-request-review-read-parity.e2e.ts` asserts `.row-fluid.cb` PR search surface through tab/search/advanced/list/pagination ordering, `#search`, `#advanced-search-form #contributors`, category tabs, PR new action presence, and REST query updates |
| `git/partial_state.scala.html` | P5 git/pr | metric guard passed: `pull-request-review-read-parity.e2e.ts` and `pull-request-interaction-parity.e2e.ts` assert `#state.pullRequest-stateInfo`, safe/conflict/merged state notices, reviewer/merge button state, delete/restore source-branch controls, conflict guide, and alert placement between body and footer |
| `git/view.scala.html` | P5 git/pr | metric guard passed: `pull-request-review-read-parity.e2e.ts` asserts the legacy PR overview page stack: header, overview tabs, author/branch/body/attachments, state notice, action footer, event timeline, help link/modal anchors, and no placeholder/raw key leakage |
| `git/viewChanges.scala.html` | P5 git/pr | metric guard passed: `pull-request-review-read-parity.e2e.ts` asserts the legacy PR changes page stack: overview tabs, author/branch row, commit selector, selected commit/diff body, inline review trigger, board comment form, review-card side column, outdated commit route, and mobile anchor behavior |

### `help/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `help/UIKit.scala.html` | P1 help | metric guard passed: `ui-kit.e2e.ts` asserts standalone UI kit `.gnb-outer`, `.page-wrap-outer`, `.page-footer-outer`, header, page, button/upload/dropdown/search stack, internal footer order, allowed viewport-meta normalization, and dropdown behavior |
| `help/experimental.scala.html` | P1 help | targeted absence guard passed: source audit records no active Play caller for the orphan partial, and `help-toc.e2e.ts` plus `ui-kit.e2e.ts` assert `#experimentalHelp` does not leak into `/_help` or `/_UIKit` |
| `help/keymap.scala.html` | P1 help | metric guard passed: `project-issues-empty.e2e.ts`, `project-issue-detail.e2e.ts`, and `project-posts.e2e.ts` assert active issue-list, issue-detail, and board-list callers preserve `#helpKeys.modal.hide.fade.keymap-help`, shortcut rows, project/site rows, Git pull-request shortcut, manager setting shortcut, and Mac/non-Mac modifier behavior |
| `help/markdown.scala.html` | P1 help | metric guard passed: `ui-kit.e2e.ts` injects the legacy partial into `/_UIKit`, compares the stable `.markdown-help` subtree, asserts ten `.help-nav[data-toggle="markdown-help"][data-target]` anchors, and proves active-section switching plus same-tab deactivation |
| `help/toc.scala.html` | P1 help | metric guard passed: `auth-public-entry-parity.e2e.ts` asserts site help navbar/breadcrumb/page/FAQ stack, question icon/link alignment, footer order, and item-wide toggle |

### `index/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `index/allOrganizationList.scala.html` | P1/P6 home workspace | caller route check needed: repository search finds no active Play route/controller caller for this wrapper; `/user/usermenuTabContentList` renders `common/usermenu_tab_content_list.scala.html`, which calls `myOrganizationList`, `myProjectList`, and `myRecentIssueList` only |
| `index/allOrganizationList_partial.scala.html` | P1/P6 home workspace | caller route check needed: repository search finds `allOrganizationList_partial` only through `index/allOrganizationList.scala.html`; rendered proof remains pending active-caller identification or dormant/deferred reclassification |
| `index/allProjectList.scala.html` | P1/P6 home workspace | caller route check needed: repository search finds no active Play route/controller caller for this wrapper; `/user/usermenuTabContentList` renders `common/usermenu_tab_content_list.scala.html`, which calls `myOrganizationList`, `myProjectList`, and `myRecentIssueList` only |
| `index/allProjectList_partial.scala.html` | P1/P6 home workspace | rendered DOM guard passed: `frontend/tests/authenticated-home-empty-notifications.e2e.ts` compares nested favorite-tab project rows preserving `li.user-li[data-location]`, `.project-list.project-flex-container`, popover hooks/content, avatar image/dummy branches, lock icon branch, `.star-project[data-project-id]`, and starred/unstarred material icon classes |
| `index/displayProjects.scala.html` | P1/P6 home workspace | metric guard passed: `root-shell-parity.e2e.ts` asserts project tab caller restores `.search-result`, `.tab-pane.myproject-list-wrap`, `.search-input.project-search#query`, `.subtab-wrap.subtab-group`, `.nav-subtab.unstyled` anchor order, active `#recentlyVisited`, and measured search/subtab/list placement |
| `index/index.scala.html` | P1/P6 home workspace | metric guard passed: `root-shell-parity.e2e.ts` asserts legacy `Application.index()` behavior for logged-in users by redirecting `/` to a non-root default landing path and rendering the delegated notification shell at `/` when the default landing path is `/`, while anonymous `/` keeps the public intro |
| `index/myOrganizationList.scala.html` | P1/P6 home workspace | metric guard passed: `root-shell-parity.e2e.ts` asserts favorite tab caller restores `#myOrganizationList.tab-pane.user-project-list`, `.search-result`, `.search-input.org-search`, `.bar`, inner `#organizations.tab-pane.user-ul`, and measured search-before-list placement |
| `index/myOrganizationList_partial.scala.html` | P1/P6 home workspace | metric guard passed: `root-shell-parity.e2e.ts` asserts favorite tab organization partial parity with `.org-name`, `.sub-project-counter`, `.star-org[data-organization-id=11]`, `.star.starred`, nested `.project-ul`, and measured org/project/star placement |
| `index/myProjectList.scala.html` | P1/P6 home workspace | metric guard passed: `root-shell-parity.e2e.ts` asserts project tab caller restores `#myProjectList.tab-pane.user-project-list`, `.search-result`, `.tab-pane.myproject-list-wrap`, `.search-input.project-search#query`, `.nav-subtab.unstyled`, `#recentlyVisited`, `#watching`, `#createdByMe`, `#joinmember`, and measured search/subtab/list placement |
| `index/myProjectList_partial.scala.html` | P1/P6 home workspace | metric guard passed: `root-shell-parity.e2e.ts` asserts project tab partial parity with `li.user-li[data-location=/yona/admin/sample]`, legacy project row class stack, popover hooks/content, real fixture `data-project-id=101`, owner/project anchors, and star alignment |
| `index/myRecentIssueList.scala.html` | P1/P6 home workspace | metric guard passed: `root-shell-parity.e2e.ts` asserts recent issue tab caller restores `#myRecentIssueList.tab-pane.user-project-list`, `.search-result`, `.tab-pane.myproject-list-wrap`, `.search-input.project-search#query`, inner `#recentlyVisitedIssues.tab-pane.user-ul`, recent issue row hooks, and measured search-before-list placement |
| `index/myRecentIssueList_partial.scala.html` | P1/P6 home workspace | metric guard passed: `root-shell-parity.e2e.ts` asserts recent issue partial parity with `li.user-li[data-location=/yona/admin/sample/issue/7]`, `.project-list.project-flex-container`, popover hooks/content, `.issue-item.projectName-owner`, marker/title order, and row placement |
| `index/notifications.scala.html` | P1/P6 home workspace | metric guard passed: `root-shell-parity.e2e.ts` asserts the delegated authenticated `/` notification shell keeps `.notification-page`, `.page-wrap-outer`, `.page-wrap`, `.site-guide-outer`, `#toggleIntro`, `.activity-streams.notification-wrap.unstyled`, and visible `li.notification-stream` content while suppressing the anonymous `.siteintro-bg.row` |
| `index/partial_intro.scala.html` | P1/P6 home workspace | metric guard passed: `root-shell-parity.e2e.ts`, `route-parity.spec.tsx`, and `auth-workspace-shell.spec.tsx` assert legacy anonymous home intro structure/copy, full-width home shell, legacy photo background, 750px centered intro cover, centered heading/tagline/signup action, six feature cells, 330px feature item width, row wrapping, icon/info/title x-alignment, and footer ordering |
| `index/partial_notifications.scala.html` | P1/P6 home workspace | metric guard passed: `root-shell-parity.e2e.ts` asserts the authenticated `/` notification caller renders `li.notification-stream` rows with legacy `data-toggle=learnmore`, `data-target=message-*`, generated `#message-*` `.message-wrap`, visible target title copy, and stream type/description ordering metrics |
| `index/sidebar.scala.html` | P1/P6 home workspace | intentional deviation recorded: thin wrapper around `siteLayout_framed`; active React keeps sidebar as SPA root layout surface and does not restore iframe/framed shell |

### `issue/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `issue/create.scala.html` | P3 issue | metric guard passed: `issue-form-parity.e2e.ts` asserts the issue create form shell with `.page-wrap-outer`, `.project-page-wrap`, `.content-wrap.frm-wrap`, `#issue-form`, title row, subtask option row, left editor/uploader/action column, right option menu, save/draft/cancel button order, right-menu option ordering, legacy title/body tabindex anchors, hidden referComment/isDraft fields, and REST/TanStack submit/draft payload continuity |
| `issue/edit.scala.html` | P3 issue | metric guard passed: `issue-form-parity.e2e.ts` asserts the issue edit form shell with `.page-wrap-outer`, `.project-page-wrap`, `.content-wrap.frm-wrap`, `#issue-form`, issue number/title/subtask row, left editor/uploader/action column, notification checkbox, save/cancel action ordering, right state/assignee/milestone/due-date/label option stack, hidden author/isDraft/isPublish fields, legacy title/body tabindex anchors, and REST/TanStack update payload continuity |
| `issue/list.scala.html` | P3 issue | metric guard passed: `project-issues-empty.e2e.ts` asserts the project issue list top-level caller shell with active project Issue menu, `.page-wrap-outer`, `.project-page-wrap`, `.row-fluid.issue-list-wrap[pjax-container]`, left menu/content Bootstrap column alignment, new issue action placement, tabs/filter/list/pagination ordering, keymap trigger, and footer |
| `issue/my_list.scala.html` | P3 issue | metric guard passed: `user-issues.e2e.ts` asserts the `/user/issues` caller shell with my-series tabs, default-login-page hook, `[pjax-container].row-fluid.issue-list-wrap`, state tabs, sort controls, populated rows, filtered favorite/closed/search/page empty state, pagination, and issue-list wrapper/column metrics |
| `issue/my_partial_list.scala.html` | P3 issue | metric guard passed: `user-issues.e2e.ts` asserts `.post-list-wrap.my-issues`, generated `#issue-item-*`, labels, issue/project href anchors, author/meta columns, comment/vote counts, milestone/due-date metadata, pagination, and row layout metrics |
| `issue/my_partial_list_quicksearch.scala.html` | P3 issue | metric guard passed: `user-issues.e2e.ts` asserts the six-row quicksearch list, active assigned row, `pjax-filter` hooks, generated current-user ids, mention/shared/favorite counts, and quicksearch ordering |
| `issue/my_partial_search.scala.html` | P3 issue | metric guard passed: `user-issues.e2e.ts` asserts `form#search[name=search][method=get]`, hidden order/state/user filter fields, `.myissues-search-input`, search textbox/button, placement after quicksearch, and list-shell metrics |
| `issue/partial_assignee.scala.html` | P3 issue | metric guard passed: `issue-detail-parity.e2e.ts` asserts `#issueUpdateForm input#assignee.bigdrop[name=assigneeLoginId]`, placeholder/title/value/style anchors, first assignee `dl/dt/dd` placement, `.assignee-info` before the assignment input, 100% field containment, input display/height/padding/width metrics, and issue-info padding |
| `issue/partial_comment.scala.html` | P3 issue | metric guard passed: `issue-detail-parity.e2e.ts` asserts the issue detail top-level comment row with generated comment id/class, avatar/author/ago/share/new-issue/vote/translate/edit/delete hooks, markdown body update metadata, legacy attachment data/marker rendering, row/avatar/media/meta/action/body/attachment display metrics, and comment edit/delete/vote mutation coverage |
| `issue/partial_comments.scala.html` | P3 issue | metric guard passed: `issue-detail-parity.e2e.ts` asserts the issue detail comments shell with comment header icon/label/count from legacy `issue.comments.size`, separator, `ul.comments` timeline wrapper, comment/event item ordering, and rendered section/header/divider/list display metrics |
| `issue/partial_event_timeline.scala.html` | P3 issue | metric guard passed: `issue-detail-parity.e2e.ts` asserts issue event timeline rows with generated `#event-*` ids, state label classes for state/label/assignee events, user tooltip links, issue label rendering, hidden body-change event absence, date anchors, event ordering, and rendered event/state/message/date display and alignment metrics |
| `issue/partial_index_comment.scala.html` | P3 issue | metric guard passed: `issue-detail-parity.e2e.ts` asserts the compact issue comment index row in the right pane with `comment index-comment` class, `data-location`, body anchor/ellipsis text, author tooltip link, ago/share anchors, absent child-count marker for zero children, and rendered body/author/date display and placement metrics |
| `issue/partial_index_comments.scala.html` | P3 issue | metric guard passed: `issue-detail-parity.e2e.ts` asserts the compact right-pane comments shell with header label/count from legacy `issue.comments.size`, parent-only `ul.comments` index rows, event exclusion, child-count semantics, and rendered shell/header/list/comment display and placement metrics |
| `issue/partial_index_event_timeline.scala.html` | P3 issue | targeted absence guard passed: legacy `partial_index_comments.scala.html` imports this partial but does not render events in the compact right-pane timeline; `issue-detail-parity.e2e.ts` asserts no `aside.span-right-pane #comments li.event-index` while preserving the full left timeline event row |
| `issue/partial_list.scala.html` | P3 issue | metric guard passed: `project-issues-empty.e2e.ts` asserts the legacy project issue-list row with `.post-list-wrap.row-fluid`, generated row/check ids, left `.span9.span-hard-wrap`, right `.span3.hide-in-mobile`, mass-update checkbox, title/infos stack, count/label group, assignee avatar rail, due-date rail, row ordering, title prefix/label/due-date branches, and Bootstrap column alignment |
| `issue/partial_list_draft.scala.html` | P3 issue | metric guard passed: `project-issues-empty.e2e.ts` asserts the project issue-list draft branch with generated row/check ids, `#Draft` marker, draft title/author/date stack, empty assignee avatar rail, and draft-before-normal-list ordering |
| `issue/partial_list_quicksearch.scala.html` | P3 issue | metric guard passed: `project-issues-empty.e2e.ts` asserts the legacy left-menu quick filter list with filter rows, active open row, pjax/data filter attributes, badge text, anchor display, and left-menu containment |
| `issue/partial_list_subtask.scala.html` | P3 issue | metric guard passed: `project-issues-empty.e2e.ts` asserts the child-progress and parent-link branch inside a project issue-list row, `.subtask-progress.upload-progress.red-outline`, `.bar.red[style=width:33%]`, completion ratio text, parent issue backlink/truncation, and placement inside `.infos` |
| `issue/partial_list_wrap.scala.html` | P3 issue | metric guard passed: `project-issues-empty.e2e.ts` asserts the owning issue-list wrapper with `.row-fluid.issue-list-wrap`, `.left-menu.span2.span-hard-wrap`, `#span10.span10.span-hard-wrap`, new-issue action, open/closed tabs and badges, two-column/show-subtasks controls, `.filter-wrap.board`, mass update slot, sort filter, draft-before-normal ordering, Excel export action, and `#pagination[data-total]` |
| `issue/partial_massupdate.scala.html` | P3 issue | metric guard passed: `project-issues-empty.e2e.ts` asserts the project issue-list mass update toolbar with `#mass-update-form`, `#check-all[data-target=checked-issue]`, state/assignee/milestone/attach-label/detach-label dropdowns, disabled buttons, label category/divider rows, and non-member/no-milestone branches |
| `issue/partial_searchform.scala.html` | P3 issue | metric guard passed: `project-issues-empty.e2e.ts` asserts the left-menu issue search form with hidden query fields, search input/button hooks, advanced author/assignee/due-date filter stack, label-manage action placement, populated author/assignee Select2 option `data-avatar-url` / `data-login-id` hooks, and non-member label-manage omission |
| `issue/partial_select_label.scala.html` | P3 issue | metric guard passed: `issue-detail-parity.e2e.ts` asserts the editable issue detail label selector with label edit link, hidden `#labelIds` Select2 source attributes, option selected/category metadata, visible fallback checkbox labels, hidden select display, fallback row ordering, swatch color, and `dl/dt/dd` spacing/alignment metrics |
| `issue/partial_select_subtask.scala.html` | P3 issue | metric guard passed: `issue-form-parity.e2e.ts` asserts the issue create form subtask selector with `.subtask-message`, `.subtask-wrap.show`, legacy `#targetProjectId` and `#parentId` Select2 source attributes/options/selected parent, English legacy parent placeholder copy, title-to-option placement, project/parent select column ordering, message text overflow styling, hidden/shown wrap display, and REST/TanStack submit payload preservation |
| `issue/partial_show_selected_label.scala.html` | P3 issue | metric guard passed: `issue-detail-parity.e2e.ts` asserts the read-only issue detail selected-label `<dl>` with `dt` label copy, `dd > a.label.issue-label.active.static[data-label-id]`, legacy issue-list filter href, label text/color, absence of editable label select/fallback controls, right-pane containment, `dl/dt/dd/a` vertical ordering, and label display/color/spacing metrics |
| `issue/partial_view_child.scala.html` | P3 issue | metric guard passed: `issue-detail-parity.e2e.ts` asserts the issue detail child issue row with `.issue-item.child-issue`, state label, child issue href, `item-name` / `subtask-number` / assignee copy, comment/vote pair, issue label href/data-label-id/text, child date title/text, placement below the parent delimiter, count-pair ordering, label placement, and legacy padding/font/color/delimiter metrics |
| `issue/partial_view_childIssueList.scala.html` | P3 issue | metric guard passed: `issue-detail-parity.e2e.ts` asserts the issue detail parent/child subtask list with outer and nested `.child-issues` wrappers, `.issue-item.parent-issue`, parent issue href/copy/bold state, `.upload-progress.red-outline`, `.bar.red` width/title, count/state copy, `.parent-issue-delimeter`, child row ordering below the delimiter, and legacy margin/padding/font/progress/delimiter metrics |
| `issue/partial_view_childIssueListOnly.scala.html` | P3 issue | metric guard passed: `project-issues-empty.e2e.ts` asserts the issue-list `.child-issue-list.hide` caller with nested `.child-issues`, open/closed `.issue-item.child-issue` rows, state labels, child href/name/count/label/date anchors, preserved label `data-category-id`, child date/title text, closed checkmark branch, and row ordering |
| `issue/partial_voter_list.scala.html` | P3 issue | metric guard passed: `issue-detail-parity.e2e.ts` asserts `#voters.modal.hide.voters-dialog`, header/title/close button, body `ul.unstyled` voter rows, `.usf-group[target=_blank]` links, `.avatar-wrap.mlarge`, name/login id ordering, footer close button, centered issue-detail modal placement, body/header/footer display metrics, and row/avatar sizing |
| `issue/partial_voters.scala.html` | P3 issue | metric guard passed: `issue-detail-parity.e2e.ts` asserts `.voter-list-wrap`, `.voter-list`, three `.avatar-wrap.smaller` entries, tooltip/modal "more" link, voter list vertical flow, 20px avatar metrics, list margin/display metrics, and the `href="#voters"` modal hook |
| `issue/view.scala.html` | P3 issue | metric guard passed: `issue-detail-parity.e2e.ts` asserts the issue detail view shell with `.project-page-wrap.board-view`, `.board-header.issue`, desktop date/state meta, `.board-body.row-fluid`, left/right pane Bootstrap column alignment, author/body/attachments/action row ordering, watch/vote/action placement, subtask/comments stack, right-pane `#issueUpdateForm`, compact comments ordering, hidden edit source anchors, and existing REST/TanStack mutation coverage |

### root layout and shared top-level partials

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `layout.scala.html` | P0/P7 layout | metric guard passed: `root-shell-parity.e2e.ts` asserts the legacy body/root shell anchors `body#html-body > #root > #main.main`, root navbar/footer/dialog stack, site-admin affix variants, and legacy head/meta names including `X-UA-Compatible`, exact viewport, content-type, OpenGraph title/type, and Twitter card/title; `frontend/index.html` carries the static legacy stylesheet/favicon/meta baseline while route components update document title |
| `layout_framed.scala.html` | P0/P7 layout | reference-only for active SPA sidebar decision |
| `organizationLayout.scala.html` | P6 organization | metric guard passed: `organization-directory-admin-parity.e2e.ts` asserts root navbar, organization header/menu/page-wrap stack, settings submenu placement, and left/right settings form alignment; nested organization content rows remain open separately |
| `partial_comment_form_on_thread.scala.html` | shared P5/P3 diff/comment | metric guard passed: `project-code-comment-upload-parity.e2e.ts` asserts the commit detail inline ranged thread reply form with form action, hidden thread id, code-review editor tab panes, textarea name/classes/mode/100px height, submit button copy, placement after thread comments, rendered display metrics, paste upload handling, and REST/TanStack reply mutation body |
| `partial_comment_thread.scala.html` | shared P5/P3 diff/comment | metric guard passed: `project-code-comment-upload-parity.e2e.ts` asserts the commit detail inline ranged code comment thread wrapper with state/class/data-range hooks, minimize affordance, legacy thread header badge/maximize button, comments list ordering, reply form ordering, row/cell/thread/header display metrics, and close/open/reply mutation coverage |
| `partial_diff.scala.html` | shared P5/P3 diff/comment | metric guard passed: `project-code-comment-upload-parity.e2e.ts` asserts the commit detail caller renders the normal no-limit-alert `.diff-body` file-diff list, places the file diff after commitInfo and before commit comment form, keeps `.btnPop`, and preserves diff body/file/list ordering metrics |
| `partial_diff_comment_on_line.scala.html` | shared P5/P3 diff/comment | metric guard passed: `project-code-comment-upload-parity.e2e.ts` asserts the commit detail inline diff caller renders `<tr class="comments board-comment-wrap">` after the ranged diff line, preserves `data-commit-id`, `td[colspan=3]`, `#thread-*` range/path/side hooks, thread button/list/comment/reply form ordering, row/cell/thread display metrics, and inline reply upload mutation |
| `partial_diff_line.scala.html` | shared P5/P3 diff/comment | metric guard passed: `project-code-comment-upload-parity.e2e.ts` asserts the commit detail caller renders legacy diff rows with `context`/`add` classes, `data-line`/`data-type`/`data-side`, empty old line for added lines, new line `data-line-num`, code cell/pre text, line-number/code-cell x-order, and diff line display/white-space metrics |
| `partial_filediff.scala.html` | shared P5/P3 diff/comment | metric guard passed: `project-code-comment-upload-parity.e2e.ts` asserts the commit detail caller renders one file diff for `src/main.rs` with stable `id=src-main-rs`, `data-file-path`, filename/stats, range/add rows, line-number/code-cell x-order, table placement, and diff-file/table/code display, border, collapse, layout, and whitespace metrics |
| `partial_update_notification.scala.html` | P0 global shell | metric guard passed: `root-shell-parity.e2e.ts` asserts the site-admin watched-update caller renders legacy `<p class="center-txt">`, release link copy/href, `.ybtn.ybtn-small[type=button]`, `data-request-method=post`, `data-request-uri=/yona/sites/unwatchUpdate`, centered inline link/button placement, and TanStack Query mutation POST dismissal |
| `projectLayout.scala.html` | P2 project | metric guard passed: `project-settings-parity.e2e.ts` asserts root navbar, project header/menu/page-wrap stack, settings submenu placement, and left/right settings form alignment; nested project content rows remain open separately |
| `projectMenu.scala.html` | P2 project | metric guard passed: `project-home-readme.e2e.ts`, `project-home-history.e2e.ts`, `project-home-dashboard.e2e.ts`, and `project-settings-form.e2e.ts` assert legacy `.project-menu-outer > .project-menu-inner > .project-menu-nav.project-menu-gruop` shell, menu order, code-menu class, short-menu labels, active states, count badges, admin cog link, and right-floated settings placement |
| `restricted.scala.html` | P7 error/security | metric guard passed: `auth-public-entry-parity.e2e.ts` asserts root navbar/footer, direct `siteLayout` content stack, 560x315 iframe, user label/email, verification marker, provider/user ID, and session expiry copy |
| `sidebar.scala.html` | P0/P6 sidebar | metric guard passed: `root-shell-parity.e2e.ts` and `auth-workspace-shell.spec.tsx` assert SPA `#mySidenav` rendering, 0px/360px open-close states, right-edge placement, profile/account/logout rows, tab ordering, organization/project/recent pane alignment, guest/anonymous suppression, localStorage active-tab hooks, and framed-only `mainFrame`/pin/iframe anchors intentionally absent |
| `siteLayout.scala.html` | P0/P7 layout | metric guard passed: site-admin user/project/update metric guards assert root navbar/footer, site admin breadcrumb, left settings nav, right content column, and representative content ordering; nested site-admin content rows remain open separately |
| `siteLayout_framed.scala.html` | P0/P7 layout | reference-only unless a concrete app-runtime route still needs framed semantics |

### `migration/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `migration/home.scala.html` | P7 migration | metric guard passed: `migration-parity.e2e.ts` asserts `yobi-migration` panel, system message, source/destination warnings, search inputs, disabled import controls, progress/table ordering, and no active native migration form |
| `migration/migrationPageLayout.scala.html` | P7 migration | metric guard passed: `migration-parity.e2e.ts` asserts legacy navbar/footer shell, migration content placement, fixed Bootstrap row/span column alignment, and resolved copy without raw message keys |

### `milestone/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `milestone/create.scala.html` | P4 milestone | metric guard passed: `milestone-delete-modal-parity.e2e.ts` asserts legacy create form fields/attrs, null uploader resource id, left/right pane positioning, editor/uploader/action ordering, due-date picker placement, and TanStack Query POST submit boundary |
| `milestone/edit.scala.html` | P4 milestone | metric guard passed: `milestone-delete-modal-parity.e2e.ts` asserts legacy edit form fields/attrs, left/right pane positioning, editor/uploader/action ordering, due-date picker placement, and TanStack Query PATCH submit boundary |
| `milestone/list.scala.html` | P4 milestone | metric guard passed: `milestone-delete-modal-parity.e2e.ts` asserts project shell stack, milestone tabs/new button/filter/search/list ordering, list item width, progress placement, and issue link anchors |
| `milestone/partial_status.scala.html` | P4 milestone | metric guard passed: `milestone-delete-modal-parity.e2e.ts` asserts milestone progress percent/bar width, closed/open issue count copy, due date/status copy, and list/detail route state toggles |
| `milestone/view.scala.html` | P4 milestone | metric guard passed: `milestone-delete-modal-parity.e2e.ts` asserts legacy detail shell title/due-date/status/progress/attachments, action request hooks, issue tabs/filter/mass-update/list ordering, mass-update/delete TanStack mutation boundaries, and list redirect |

### `organization/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `organization/create.scala.html` | P6 organization | metric guard passed: `organizations-new.e2e.ts` asserts legacy organization create form shell, `form[name=new-org]` field/action ordering, `.n-alert[data-errType=name]`, hidden `.wrongName`, input/textarea hooks, create/cancel actions, and TanStack Query REST create boundary |
| `organization/deleteForm.scala.html` | P6 organization | metric guard passed: `organization-directory-admin-parity.e2e.ts` asserts legacy settings shell ownership, active delete tab, `.box-wrap.bottom` delete action placement, `#btnDelete`, `#alertDeletion` modal header/body/footer order, confirm button placement, and TanStack Query REST DELETE redirect |
| `organization/group_board_list.scala.html` | P6 organization | metric guard passed: `organization-boards.e2e.ts` asserts organization board shell stack, toolbar form, bracketed project selector state, search/two-column controls, filter/list ordering, active comments sort href, empty `.error-wrap` branch, row avatar/title/info/project alignment, pagination placement, and legacy sort anchors |
| `organization/group_board_list_partial.scala.html` | P6 organization | metric guard passed: `board-posting-parity.e2e.ts` asserts organization board row partial avatar/title/meta/project/comment/id placement, post row width, and pagination relation |
| `organization/group_issue_list.scala.html` | P6 organization | metric guard passed: `shell-routing-smoke.e2e.ts` asserts organization issue shell stack, left quicksearch/content columns, tabs/filter/list ordering, cross-project issue anchors, assignee/due-date rail placement, and visible project selector/search controls |
| `organization/group_issue_list_partial.scala.html` | P6 organization | metric guard passed: `shell-routing-smoke.e2e.ts` asserts generated `#issue-item-*` row, author/avatar/title/info/project/id anchors, assignee avatar/link, due-date rail, and row placement |
| `organization/group_issue_list_quicksearch.scala.html` | P6 organization | metric guard passed: `shell-routing-smoke.e2e.ts` asserts left-menu quicksearch form placement, project select before search input, tabs below search, and open/closed count copy |
| `organization/group_issue_search_partial.scala.html` | P6 organization | metric guard passed: `shell-routing-smoke.e2e.ts` asserts organization issue search form controls, query-derived state, project selector/search input layout, and issue-list content column alignment |
| `organization/group_pullrequest_list.scala.html` | P6 organization | metric guard passed: `organization-pullrequests.e2e.ts` asserts organization PR shell stack, left search/content columns, search form before tabs, tab content/list ordering, row width, open/closed tab state, empty `.error-wrap`, and REST query boundary |
| `organization/group_pullrequest_list_partial.scala.html` | P6 organization | metric guard passed: `organization-pullrequests.e2e.ts` asserts organization PR row avatar/title/info/state placement, list partial width/alignment, and empty `.error-wrap` branch |
| `organization/header.scala.html` | P6 organization | metric guard passed: `organization-directory-admin-parity.e2e.ts` asserts 120px organization header, inner/header y alignment, and root navbar overlay position |
| `organization/list.scala.html` | P6 organization | metric guard passed: `organizations-list.e2e.ts` compares the whole rendered `/orgs?filter=weblabs` legacy site shell, breadcrumb/search/list/pagination roots, authenticated user menu, organization row logo/title/description/created date, and mounted base path preservation |
| `organization/members.scala.html` | P6 organization | metric guard passed: `organization-directory-admin-parity.e2e.ts` asserts legacy settings shell ownership, active members tab, `#addNewMember` typeahead form/input/button placement, `.members.project.row-fluid` two-column member rows, role/delete anchors, enrollment request row placement, member delete modal order, and TanStack Query add/role/delete mutations |
| `organization/menu.scala.html` | P6 organization | metric guard passed: `organization-directory-admin-parity.e2e.ts` asserts 40px organization menu placement directly below the header and before page content |
| `organization/partial_settingmenu.scala.html` | P6 organization | metric guard passed: `organization-directory-admin-parity.e2e.ts` asserts the settings submenu appears before `#saveSetting` inside `.project-page-wrap` |
| `organization/setting.scala.html` | P6 organization | metric guard passed: `organization-directory-admin-parity.e2e.ts` asserts settings form top box, left/right column x/y alignment, 260x188 logo area, description width, and mutation-capable form shell |
| `organization/view.scala.html` | P6 organization | metric guard passed: `organization-directory-admin-parity.e2e.ts` asserts legacy organization home shell, description/search/new-project controls, project list card/avatar/title/stats placement, right member bubble placement, leave modal behavior, and client-side project filtering |

### `project/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `project/change_vcs.scala.html` | P2 project | metric guard passed: `project-change-vcs-parity.e2e.ts` asserts legacy settings shell ownership, active Change VCS submenu, `.bubble-wrap.gray.wp` VCS transition body, description/checkbox/label alignment, bottom change button, validation alert, `#alertChangeVCS` modal header/body/footer order, confirm button placement, and TanStack Query REST POST with CSRF |
| `project/create.scala.html` | P2 project | metric guard passed: `project-create.e2e.ts` asserts legacy project create form shell, owner/name/description/advanced-options/share/VCS/menu/action ordering, owner option `data-type`/`data-avatar-url` handoff, hidden protected-scope default, VCS warning state, menu checkboxes, import/cancel links, and TanStack Query REST create submit boundary |
| `project/delete.scala.html` | P2 project | metric guard passed: `project-delete-parity.e2e.ts` asserts legacy settings shell ownership, delete submenu active state, `.bubble-wrap.gray.wp` confirmation body, `.cu-label`/`.cu-desc` layout, checkbox/label alignment, bottom delete button, validation alert, `#alertDeletion` modal header/body/footer order, confirm/cancel alignment, forbidden branch, and TanStack Query REST DELETE with CSRF |
| `project/header.scala.html` | P2 project | metric guard passed: `project-settings-parity.e2e.ts` asserts 120px project header, inner/header y alignment, root navbar overlay position, and `data-project-id` selector guard remains covered by `project-settings-parity.spec.tsx` |
| `project/home.scala.html` | P2 project | metric guard passed: `project-home-readme.e2e.ts`, `project-home-history.e2e.ts`, and `project-home-dashboard.e2e.ts` compare the whole legacy project home roots for the README, history, and dashboard tabs, including header row, span9 overview/span3 clone layout, tabbed left pane, right member bubble, hidden leave modal shell, and resolved copy |
| `project/importing.scala.html` | P7 import/P2 project | metric guard passed: `project-import.e2e.ts` asserts legacy import form shell, URL/owner/name/description/scope/VCS/action ordering, repo-auth branch, create-form handoff, owner option `data-type`/`data-avatar-url` anchors, disabled Git VCS plus hidden `vcs`, menu checkboxes, and TanStack Query REST import boundary |
| `project/issuelabels.scala.html` | P2 project | metric guard passed: `issue-label-settings-parity.e2e.ts` asserts legacy project settings shell, active issue-label submenu, `#copyLabel` and `#frmNewLabel` form ordering, input/submit/preset-color/list placement, typeahead/new-category flow, and TanStack Query label create/update mutations |
| `project/list.scala.html` | P6 directory/P2 project | metric guard passed: `projects-list.e2e.ts` compares the whole rendered `/projects?filter=sample` legacy site shell, breadcrumb/search/list/pagination roots, authenticated user menu, project row logo/title/description/owner/date/stats, and mounted base path preservation |
| `project/members.scala.html` | P2 project | metric guard passed: `project-members-parity.e2e.ts` asserts legacy project settings shell, `#addNewMember` form/input/button placement, `.members.project.row-fluid` two-column member rows, owner/member role/delete anchors, enrollment request legend/row placement, and TanStack Query member add/role/delete mutations |
| `project/partial_dashboard.scala.html` | P2 project | metric guard passed: `project-home-dashboard.e2e.ts` asserts legacy `.content-container.nm > .project-overview-home.row-fluid` shell, left/right span6 placement, section stacking, headings/copy, and no unresolved message keys |
| `project/partial_dashboard_issuesbyassignee.scala.html` | P2 project | metric guard passed: `project-home-dashboard.e2e.ts` asserts legacy `.overview-assignee` rows, assignee/unassigned anchors, avatar/title/count/progress copy, span6/span3/span3 ordering, count placement, and progress width |
| `project/partial_dashboard_issuesbylabel.scala.html` | P2 project | metric guard passed: `project-home-dashboard.e2e.ts` asserts legacy `.dl-horizontal.overview-label`, category/label/count anchors, row-fluid span10/span2 alignment, and right dashboard column placement |
| `project/partial_dashboard_issuesbymilestone.scala.html` | P2 project | metric guard passed: `project-home-dashboard.e2e.ts` asserts legacy `.overview-milestone` rows, milestone/no-milestone anchors, count/progress copy, span6/span3/span3 ordering, count placement, and progress width |
| `project/partial_dashboard_pullrequests.scala.html` | P2 project | metric guard passed: `project-home-dashboard.e2e.ts` asserts legacy `.overview-pullrequest` empty branch, empty-message copy, target-blank new pull-request link, and section order |
| `project/partial_history.scala.html` | P2 project | metric guard passed: `project-home-history.e2e.ts` asserts legacy `.content-container.nm > .main-stream > .activity-streams.unstyled`, activity row/avatar/text/date anchors, actor/where/title links, avatar-to-text alignment, and header/date order |
| `project/partial_issuelabels_editcategory.scala.html` | P2 project | metric guard passed: `issue-label-settings-parity.e2e.ts` asserts `#editCategory.modal.hide.yobiDialog`, category name input, exclusive select, description/buttons ordering, modal width/vertical placement, and TanStack Query category PATCH mutation |
| `project/partial_issuelabels_editlabel.scala.html` | P2 project | metric guard passed: `issue-label-settings-parity.e2e.ts` asserts `#editLabel.modal.hide.yobiDialog`, category select/name/color controls, preset-color row, buttons ordering, modal width/vertical placement, and TanStack Query label PATCH mutation |
| `project/partial_issuelabels_list.scala.html` | P2 project | metric guard passed: `issue-label-settings-parity.e2e.ts` asserts `#labelsList.issue-label-list-wrap`, list head/category/name columns, category row data hooks, category edit button, label badge/delete/edit actions, category/table/label/action x-order, and rendered list placement below create forms |
| `project/partial_readme.scala.html` | P2 project | metric guard passed: `project-home-readme.e2e.ts` asserts legacy `.bubble-wrap.gray.readme` empty fallback, create README link, wrapper/header/body placement, resolved copy, and no unresolved message keys |
| `project/partial_settingmenu.scala.html` | P2 project | metric guard passed: `project-settings-parity.e2e.ts` asserts the settings submenu appears before `#saveSetting` inside `.project-page-wrap` |
| `project/partial_webhooks_list.scala.html` | P2 project | metric guard passed: `project-webhooks-parity.e2e.ts` asserts `#webhooksList.webhook-list-wrap`, empty `.error-wrap`, created row `data-webhook-id`, payload/secret/type/git-push anchors, delete hook, list placement below create form, and TanStack Query webhook delete mutation |
| `project/setting.scala.html` | P2 project | metric guard passed: `project-settings-parity.e2e.ts` asserts settings form top box, left/right column x/y alignment, 260x188 logo area, description width, and mutation-capable form shell; hidden `watchingCount` selector remains covered by `project-settings-parity.spec.tsx` |
| `project/statistics.scala.html` | P2 project | metric guard passed: `project-statistics-parity.e2e.ts` asserts the legacy project shell for the under-construction page, header/menu/page-wrap vertical stack, full-width `.project-page-wrap`, and `<h1>Under Construction</h1>` placement |
| `project/transfer.scala.html` | P2 project | metric guard passed: `project-transfer-parity.e2e.ts` asserts legacy settings shell ownership, transfer submenu active state, `.bubble-wrap.gray.wp` two-row transfer form, `#owner` name field, five notice rows, checkbox/label alignment, bottom transfer button, validation alert, `#alertTransfer` modal header/body/footer order, confirm/cancel alignment, and TanStack Query REST POST with CSRF/destination payload |
| `project/watchers.scala.html` | P2 project | metric guard passed: `shell-routing-smoke.e2e.ts` asserts project shell stack, watcher title/description/list ordering, two-column `.members.project.row-fluid` rows, avatar/name/id placement, and accessible watcher avatars/links |
| `project/webhooks.scala.html` | P2 project | metric guard passed: `project-webhooks-parity.e2e.ts` asserts legacy webhook settings shell, active submenu, `#formNewWebhook`, legend/form-actions/payload/secret/submit/radio/help/list ordering, JSON git-push toggle behavior, validation alert, and TanStack Query webhook create/delete mutations |

### `reviewthread/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `reviewthread/list.scala.html` | P5 review | metric guard passed: `pull-request-review-read-parity.e2e.ts` asserts the legacy `/reviews` shell with left search/filter column, right result column, state tabs, sort/export/search controls, query-preserving interactions, column x alignment, list/export vertical ordering, and REST query boundary |
| `reviewthread/partial_list.scala.html` | P5 review | metric guard passed: `pull-request-review-read-parity.e2e.ts` asserts review rows through `.review-list-wrap .post-list-wrap`, row avatar/title/infos ordering, ellipsis title CSS, PR/commit thread hrefs, comment body copy, and export/pagination placement |

### `search/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `search/partial_issue_comments.scala.html` | P6 search | metric guard passed: `search-parity.e2e.ts` asserts issue-comment result row `#number`, `Re)` title, `#comment-id` href fragment, snippet body, project meta link, author tooltip hooks, created-date title/copy, pagination anchor, and list/item/title/content/meta vertical ordering |
| `search/partial_issues.scala.html` | P6 search | metric guard passed: `search-parity.e2e.ts` asserts issue result list/item width, title/content/meta vertical order, pagination placement, highlighted keyword rendering, and issue link anchors |
| `search/partial_milestones.scala.html` | P6 search | metric guard passed: `search-parity.e2e.ts` asserts milestone result row title/href, snippet body, project meta link, due-date `.due-date.meta-item` with resolved `label.dueDate`, strong due date, until label, pagination anchor, and list/item/title/content/meta/due-date vertical placement |
| `search/partial_post_comments.scala.html` | P6 search | metric guard passed: `search-parity.e2e.ts` asserts post-comment result row `#number`, `Re)` title, `#comment-id` href fragment, snippet body, project meta link, author tooltip hooks, created-date title/copy, pagination anchor, and list/item/title/content/meta vertical ordering |
| `search/partial_posts.scala.html` | P6 search | metric guard passed: `search-parity.e2e.ts` asserts post result row `#number`, title/href, snippet body, project meta link, author tooltip hooks, created-date title/copy, pagination anchor, and list/item/title/content/meta vertical ordering |
| `search/partial_projects.scala.html` | P6 search | metric guard passed: `search-parity.e2e.ts` asserts project result row `.search-list-item.project`, avatar/logo anchor, `.title.project-link`, fork-origin `.search-meta-info.nm.np` with split icon class and origin project link, overview `.search-content.np`, created/code-update `.search-meta-info.np` strong title attributes, and row/list/title/fork/content/meta vertical ordering |
| `search/partial_reviews.scala.html` | P6 search | metric guard passed: `search-parity.e2e.ts` asserts pull-request review result row `#number`, `Re)` title, thread comment href fragment, snippet body, project meta link, author tooltip hooks, created-date title/copy, pagination anchor, and list/item/title/content/meta vertical ordering |
| `search/partial_search.scala.html` | P6 search | metric guard passed: `search-parity.e2e.ts` asserts search breadcrumb/page wrap, category column/result search box separation, form input/button x alignment, result title/wrap ordering, category counts, and type switch behavior |
| `search/partial_users.scala.html` | P6 search | metric guard passed: `search-parity.e2e.ts` asserts user result row `.search-list-item.project`, avatar tooltip `data-toggle`/`data-placement`/title hooks, 32x32 avatar attributes, `.title.user-link` copy/href, `.infos.nm .infos-item` member-since copy, pagination anchor, and list/item/avatar/title/info vertical placement |
| `search/result.scala.html` | P6 search | metric guard passed: `search-parity.e2e.ts` asserts global/project/organization search shells, legacy `siteLayout`/project/organization routing variants, and global result page size/position/alignment metrics |

### `site/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `site/data.scala.html` | P7 site-admin | metric guard passed: `site-admin-data-parity.e2e.ts` asserts warning/export/import ordering, export anchor, file input/import submit alignment, and TanStack mutation boundary |
| `site/diagnostic.scala.html` | P7 site-admin | metric guard passed: `site-admin-diagnostic-parity.e2e.ts` asserts no-error/error branches, diagnostic pre-block alignment, and site-admin shell layout |
| `site/issueList.scala.html` | P7 site-admin | metric guard passed: `site-admin-issue-list-parity.e2e.ts` asserts state tabs, post-style row avatar/info/meta alignment, anchors, and pagination |
| `site/lostPassword.scala.html` | P1 auth | metric guard passed: `auth-public-entry-parity.e2e.ts` asserts reset title/tagline stack, centered form width, input alignment, full-width submit, footer order, resolved copy, and TanStack mutation boundary |
| `site/mail.scala.html` | P7 site-admin | metric guard passed: `site-admin-mail-parity.e2e.ts` asserts form-horizontal label/control alignment, textarea sizing, alerts, and TanStack mutation submit boundary |
| `site/massMail.scala.html` | P7 site-admin | metric guard passed: `site-admin-mail-parity.e2e.ts` asserts radio/control ordering, project selector input/button alignment, selected-project label, and TanStack mutation submit boundary |
| `site/partial_pagination.scala.html` | P7 site-admin | targeted absence: repository search finds no active caller; active site list templates use `yobi.Pagination.update($("#pagination"), ...)`. `site-admin-project-list.e2e.ts` asserts the active JS pagination shape and absence of the unused Scala partial wrapper. |
| `site/partial_paginationForUserList.scala.html` | P7 site-admin | targeted absence: repository search finds no active caller; active `site/userList.scala.html` uses `yobi.Pagination.update($("#pagination"), ...)`. `site-admin-user-list.e2e.ts` asserts the active JS pagination shape and absence of the unused Scala partial wrapper. |
| `site/postList.scala.html` | P7 site-admin | metric guard passed: `site-admin-post-list-parity.e2e.ts` asserts post-style row avatar/info/meta alignment, anchors, and pagination |
| `site/projectList.scala.html` | P7 site-admin | metric guard passed: `site-admin-project-list-parity.e2e.ts` asserts title/filter alignment, listhead-to-row column alignment, delete modal hooks, and pagination |
| `site/setting.scala.html` | P7 site-admin | legacy-placeholder deviation recorded: Scala body is only `TODO` inside `siteMngLayout(message)` and legacy nav does not expose a setting page; React intentionally does not restore a visible `/sites/setting` TODO page |
| `site/siteMngLayout.scala.html` | P7 site-admin | metric guard passed: site-admin e2e suite asserts shared navbar, breadcrumb, left nav, content column, and footer ordering across user/project/post/issue/mail/data/update/diagnostic routes |
| `site/update.scala.html` | P7 site-admin | metric guard passed: `site-admin-update-parity.e2e.ts` asserts update/no-update/download branches, message ordering, and site-admin shell layout |
| `site/userList.scala.html` | P7 site-admin | metric guard passed: `site-admin-user-list-parity.e2e.ts` asserts title/search alignment, tabs, listhead/row/pagination ordering, and user action hooks |

### `user/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `user/edit.scala.html` | P6 workspace/profile | metric guard passed: `workspace-settings-parity.e2e.ts` asserts account breadcrumb, five-tab edit menu, profile form/login-name-email/avatar/reset/crop-modal anchors, profile/avatar form float alignment, visited reset placement, and existing REST/TanStack profile/avatar/reset mutations |
| `user/edit_emails.scala.html` | P6 workspace/profile | metric guard passed: `workspace-settings-parity.e2e.ts` asserts email tab, add-email inline form, description/table ordering, primary/sub-email rows, delete/set-main/validation data hooks, table placement, and existing REST/TanStack email mutations |
| `user/edit_notifications.scala.html` | P6 workspace/profile | metric guard passed: `workspace-settings-parity.e2e.ts` asserts notification tab/hash activation, `#notification-projects`, active project pane/table/switch hooks, list/content placement, and existing REST/TanStack notification toggle mutation |
| `user/edit_password.scala.html` | P6 workspace/profile | metric guard passed: `workspace-settings-parity.e2e.ts` asserts password tab, `#frmPassword` loginId/old/new/retyped fields, lost-password action block placement, validation errors, and existing REST/TanStack password mutation |
| `user/edit_token.scala.html` | P6 workspace/profile | metric guard passed: `workspace-settings-parity.e2e.ts` asserts token breadcrumb/tab, `.token-generate #frmBasic`, 90% token input sizing, submit placement, and existing REST/TanStack token reset mutation |
| `user/login.scala.html` | P1 auth | metric guard passed: `auth-public-entry-parity.e2e.ts` asserts public login navbar/page/title/tagline stack, centered 400px form, 386px login/password input alignment, full-width submit, remember/forgot row alignment, redirect hidden field, resolved copy, and TanStack Query sign-in mutation boundary |
| `user/partial_edit_tabmenu.scala.html` | P6 workspace/profile | metric guard passed: `workspace-settings-parity.e2e.ts` asserts the five legacy account tab hrefs, active class per profile/password/notifications/emails/token route, tab placement above each section, and no raw message keys |
| `user/partial_issues.scala.html` | P6 workspace/profile | metric guard passed: `user-public-profile.e2e.ts` asserts `/door` profile issue rows with generated `#issue-item-*`, issue/project/user anchors, comment count, tooltip hooks, open/closed panes, legacy label `href`, label `data-label-id`, milestone link, open due-date `until` text, closed due-date rail, subtask progress, hidden child issue rows, and row layout |
| `user/partial_milestones.scala.html` | P6 workspace/profile | targeted absence recorded: `rg partial_milestones yona-original/app/views frontend/src/routes/-workspace-views.tsx` finds no legacy `user/view.scala.html` caller and no active React profile milestone pane; project milestone rows remain covered by `milestone/list.scala.html` metric guards and search milestone rows by `search/partial_milestones.scala.html` metric guards |
| `user/partial_postings.scala.html` | P6 workspace/profile | targeted absence recorded: `rg partial_postings yona-original/app/views` finds no legacy Scala caller; active board posting rows are covered by `project-posts.e2e.ts` / `board/partial_list.scala.html` metric guards instead of inventing a React profile posting route |
| `user/partial_projectlist.scala.html` | P6 workspace/profile | metric guard passed: `user-public-profile.e2e.ts` asserts `/door` and `/door?daysAgo=7&selected=projects` project pane rows with avatar/name/owner/watch anchors, member/watch counts, created/last-pushed labels, description, active project tab state, current-user leave-project `data-projectname` hook, and profile column metrics |
| `user/partial_pullRequests.scala.html` | P6 workspace/profile | metric guard passed: `user-public-profile.e2e.ts` asserts `/door` pull-request pane row with project avatar/title, PR title/number anchors, contributor/date/comment branch, receiver avatar/profile link, state rail, and tab state |
| `user/resetPassword.scala.html` | P1 auth | metric guard passed: `auth-public-entry-parity.e2e.ts` asserts reset-password navbar/page/title/tagline stack, centered 400px form, 386px password/retyped-password input alignment, full-width submit, hash hidden field, footer order, resolved copy, and TanStack Query complete-reset mutation boundary |
| `user/signup.scala.html` | P1 auth | metric guard passed: `auth-public-entry-parity.e2e.ts` asserts public signup navbar/page/title/tagline stack, centered 400px form, label/input vertical ordering, 386px field alignment, full-width submit, login action row, resolved copy, and TanStack Query register mutation boundary |
| `user/userFiles.scala.html` | P6 workspace/profile | metric guard passed: `user-files.e2e.ts` asserts `/user/files` my-series tabs, search form/input/button placement, `.attachment-files` header/detail rows, preview/name/size/download/date/location ordering, pagination placement, and REST/TanStack file query boundary |
| `user/verified.scala.html` | P1 auth | metric guard passed: `auth-public-entry-parity.e2e.ts` asserts verified-user navbar/page/title/loginId/hr/detail stack, centered reset-password shell alignment, footer order, resolved copy, and invalid verification branch |
| `user/view.scala.html` | P6 workspace/profile | metric guard passed: `user-public-profile.e2e.ts` asserts `/door` public profile breadcrumb, `.user-box`, avatar/background, display/login/email/admin/since/social sections, daysAgo control, stream tabs, issue labels/milestone/open due-date `until` text/closed due-date/subtask progress/child issue rows, project/pull-request panes, and profile column metrics |

### `welcome/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `welcome/restart.scala.html` | P1/P7 setup | metric guard passed: `auth-public-entry-parity.e2e.ts` asserts standalone no-root-chrome layout, restart wrap padding, 123x55 logo, 50% notice width, centered stack, and internal footer order |
| `welcome/secret.scala.html` | P1/P7 setup | metric guard passed: `auth-public-entry-parity.e2e.ts` asserts standalone no-root-chrome layout, 123x55 logo, 50% warning box, form input alignment, submit/footer order, and REST mutation boundary |

## Rebuild Execution Queue

The queue is ordered by blast radius and dependency shape, not by prior
completion claims.

| order | packet | reason | concrete first slice |
| ---: | --- | --- | --- |
| 1 | P0 global shell | Every page inherits this surface; tests already exposed stale React-contract assumptions. | Split `__root.tsx` into template-named partial components for navbar, usermenu/sidebar, footer, scripts bridge. |
| 2 | P1 auth/public/home/help | Bounded public routes, already partially archived and rebuilt. | Finish home/help/secret/restart from `index/partial_intro.scala.html`, `help/*.scala.html`, `welcome/*.scala.html`. |
| 3 | P2 project shell | Project header/menu wraps most project workflows. | Archive `$owner/$projectName` shell pieces and port `projectLayout`, `project/header`, `projectMenu`, `project/home`. |
| 4 | P6 directory/organization/workspace | Organization and workspace layouts affect search/navigation and user landing flows. | Port project/org directory pages and organization shell before workspace profile/settings. |
| 5 | P3 issue list/detail | Largest user workflow, many common partials. | Port issue list/search wrapper, then issue detail/comment/timeline partials. |
| 6 | P4 board/milestone | Shares comment/editor/list patterns with P3 but smaller. | Port board list/detail/form, then milestone list/detail/form. |
| 7 | P5 code/git/PR/review | Broadest UI and diff/code helpers; depends on project shell being stable. | Split code browser/history from PR/review before touching shared syntax/diff helpers. |
| 8 | P7 site-admin/error/migration | Large admin surface but route-isolated. | Port `siteMngLayout` and concrete admin list/form pages from `site/*.scala.html`. |

## Verification Baseline For This Audit Turn

Commands run before this ledger:

- `pnpm --dir frontend check`
- `pnpm --dir frontend test src/auth-workspace-shell.spec.tsx src/form-submit-boundary.spec.tsx`

No reopened group remains in this audit ledger. Continue from the rendered
evidence execution manifest for any remaining non-final parity evidence rows.
