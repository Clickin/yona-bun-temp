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

## Reopened Route Groups

All prior P0-P7 `covered` claims are reopened for template-source review. The
status below means only that the audit has started; it does not certify parity.

| group | primary legacy templates | current React owner | audit status | next action |
| --- | --- | --- | --- | --- |
| P0 global shell/layout/navbar/sidebar/footer | `layout.scala.html`, `common/navbar.scala.html`, `common/usermenu.scala.html`, `sidebar.scala.html`, `common/footer.scala.html`, `common/scripts.scala.html` | `__root.tsx`, `app.css`, `sidebar/route.tsx` | reopened, first correction landed | Continue root shell by rendering from partial-sized components and removing old React-contract tests. |
| P1 auth/public/home/help | `index/partial_intro.scala.html`, `user/login.scala.html`, `user/signup.scala.html`, `site/lostPassword.scala.html`, `user/resetPassword.scala.html`, `help/*.scala.html`, `welcome/*.scala.html` | `-auth-views.tsx`, `-home-view.tsx`, `-help-views.tsx`, public route dirs | reopened, auth start landed | Continue with public home/help/secret/restart template ports. |
| P2 project shell/settings/members/webhooks | `projectLayout.scala.html`, `project/header.scala.html`, `projectMenu.scala.html`, `project/home.scala.html`, `project/setting.scala.html`, `project/members.scala.html`, `project/webhooks.scala.html`, `project/issuelabels.scala.html`, `project/delete.scala.html`, `project/transfer.scala.html`, `project/change_vcs.scala.html` | `$owner/$projectName/**`, `-project-views.tsx` | reopened | Archive project route group and rebuild header/menu/home/settings first. |
| P3 issues/editor/comments/attachments | `issue/list.scala.html`, `issue/create.scala.html`, `issue/edit.scala.html`, `issue/view.scala.html`, `issue/partial_*.scala.html`, common editor/comment/upload partials | issue routes, `-issue-views.tsx`, markdown/editor modules | reopened | Inventory included partial graph, then rebuild issue list and issue detail separately. |
| P4 boards/milestones/posts | `board/*.scala.html`, `milestone/*.scala.html`, board/milestone partials | board/post/milestone routes, `-board-views.tsx`, `-milestone-views.tsx` | reopened | Rebuild board list/detail/form, then milestone list/detail/form. |
| P5 code/git/pull-request/review | `code/*.scala.html`, `git/*.scala.html`, `reviewthread/*.scala.html`, diff/comment partials | code/git/PR routes, `-code-views.tsx`, `-pull-request-views.tsx`, syntax/diff helpers | reopened | Split code browser from PR/review; do not let syntax helper shape page DOM. |
| P6 organization/directory/workspace/profile/settings/notifications/search | `organization/**`, `organizationLayout.scala.html`, `index/all*`, `index/my*`, `index/notifications.scala.html`, `search/*.scala.html`, `user/view.scala.html`, `user/edit*.scala.html`, `user/userFiles.scala.html` | organization, directory, workspace, notification, search routes and shared modules | reopened | Rebuild directory/org shell first, then workspace/profile/settings/search. |
| P7 site-admin/error/restricted/migration/import | `site/*.scala.html`, `site/siteMngLayout.scala.html`, `error/*.scala.html`, `restricted.scala.html`, `migration/*.scala.html`, `project/importing.scala.html` | `sites/$pageName`, restricted/error/import/migration routes | reopened | Rebuild site-admin layout/sidebar and concrete admin pages from templates. |

## First High-Risk Findings

| finding | classification | action |
| --- | --- | --- |
| Prior tests encoded `/sidebar` iframe/framed React behavior instead of the current parent decision. | stale React-contract test | Rewritten in `auth-workspace-shell.spec.tsx` to read legacy Scala templates and assert SPA layout sidebar anchors. |
| Existing large shared `-*-views.tsx` modules mix many template groups in one file. | audit risk | Archive per route group before destructive replacement; do not use these modules as DOM/UX evidence. |
| Existing P0-P7 reports contain many `covered in current follow-up` rows that predate the destructive rebuild directive. | weak closure basis | Treat reports as route/evidence index only; each row must be rechecked against Scala templates. |
| Some legacy server-rendered fragments are now REST/API-return plus React render. | conversion boundary | Preserve React-rendered DOM parity, but do not reintroduce server HTML injection as runtime data. |

## Full Legacy Template Inventory

Every legacy Scala template is assigned to a rebuild packet below. `reopen`
means the template must still be inspected before its active React owner can be
treated as parity evidence.

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
and 134 P3 rendered verification rows. The exhaustive rebuild audit is not
complete while any row in that queue lacks rendered route evidence against its
owning Scala template and partials.

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
Selector, copy, form, and `data-*` assertions are still needed before closure,
and selector-only evidence is not final UI parity. Rendered evidence must also
cover size, position, and alignment or screenshot-diff parity. The first metric
guards now cover representative project settings and organization settings
shells; the rest of the route/template rows remain open until equivalent visual
layout evidence or an explicit `gap`, `deviation`, or `deferred` record exists.

### `board/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `board/create.scala.html` | P4 board | metric guard passed: `board-posting-parity.e2e.ts` asserts legacy project shell, title/editor/uploader/options/actions vertical order, 97% title width, full textarea width, hidden fields, upload, and TanStack mutation boundary |
| `board/edit.scala.html` | P4 board | metric guard passed: `board-posting-parity.e2e.ts` asserts edit label/title/editor/uploader/options/actions order, notification checkbox, readme/notice controls, and TanStack mutation boundary |
| `board/list.scala.html` | P4 board | metric guard passed: `board-posting-parity.e2e.ts` asserts project shell stack, toolbar/search/write button alignment, sort/filter/notice/list/pagination order, and board row avatar/title/meta alignment |
| `board/partial_comments.scala.html` | P4 board | metric guard passed: `board-posting-parity.e2e.ts` asserts comment header, comment avatar/media-body alignment, attachment metadata, edit/delete hooks, comment form order, uploads, and mutation boundaries |
| `board/partial_list.scala.html` | P4 board | metric guard passed: `board-posting-parity.e2e.ts` asserts notice and normal post rows, avatar, title, README badge, comment count, label anchors, author links, and pagination alignment |
| `board/view.scala.html` | P4 board | metric guard passed: `board-posting-parity.e2e.ts` asserts board header/title, left/right pane alignment, author/body/attachments/actions/comment ordering, watch/label/delete/comment mutations, and modal hooks |

### `code/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `code/branches.scala.html` | P5 code | metric guard passed: `code-parity.e2e.ts` asserts branch tabs/table header/body column alignment, default branch marker, set-default/delete controls, data-request hooks, and mutation boundaries |
| `code/compare.scala.html` | P5 code | metric guard passed: `code-parity.e2e.ts` asserts the legacy compare shell project/code wrappers, commitInfo/commitId copy, diff-body.discommentable ordering, absence of non-legacy compare headings/placeholders, diff file/code placement, and commitInfo/background/border/padding metrics |
| `code/compare_svn.scala.html` | P5 code | reopen: inspect Scala anchors before JSX reuse |
| `code/diff.scala.html` | P5 code | metric guard passed: `project-code-comment-upload-parity.e2e.ts` asserts the legacy commit detail diff shell with `#code-browse-wrap`, code tabs, `.codediff-wrap`, review-card toggle, `.diffs-wrap`, `.commitInfo`, `.diff-body`, `.btnPop`, comment/review column ordering, and watch mutation preservation |
| `code/history.scala.html` | P5 code | metric guard passed: `code-parity.e2e.ts` asserts commit history branch/tabs/table column alignment plus path breadcrumb/table/browse/older ordering |
| `code/nohead.scala.html` | P5 code | metric guard passed: `project-code-comment-upload-parity.e2e.ts` asserts the legacy Git no-head guidance shell, resolved no-head copy, four Git command heading/pre/code blocks, no raw message keys, page/code wrapper alignment, alert/heading/pre vertical order, and Bootstrap heading/pre display/font/white-space metrics |
| `code/nohead_svn.scala.html` | P5 code | metric guard passed: `project-code-comment-upload-parity.e2e.ts` asserts the legacy SVN no-head guidance shell, resolved no-head copy, one SVN command heading/pre/code block, absence of Git clone guidance, no raw message keys, page/code wrapper alignment, alert/heading/pre vertical order, and Bootstrap heading/pre display/font/white-space metrics |
| `code/partial_branchrow.scala.html` | P5 code | metric guard passed: `code-parity.e2e.ts` asserts branch row name/commit/PR/actions column alignment and mutation data hooks |
| `code/partial_nonrange_codecomment_thread.scala.html` | P5 code | reopen: inspect Scala anchors before JSX reuse |
| `code/partial_view_file.scala.html` | P5 code | metric guard passed: `code-parity.e2e.ts` asserts file header raw/open buttons, `#showCode`, code-line, and line-number alignment |
| `code/partial_view_folder.scala.html` | P5 code | metric guard passed: `code-parity.e2e.ts` asserts folder/file rows, branch selector, breadcrumb, new/download controls, and viewer row ordering |
| `code/svnDiff.scala.html` | P5 code | reopen: inspect Scala anchors before JSX reuse |
| `code/view.scala.html` | P5 code | metric guard passed: `code-parity.e2e.ts` asserts project shell, code tabs/header controls, and viewer order for folder/file routes |

### `common/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `common/attachmentFile.scala.html` | shared partials | metric guard passed: `issue-detail-parity.e2e.ts` asserts the legacy comment update attachment caller with `.attachment-files .attached-file.attached-file-marker`, `data-name`/`data-href`/`data-mime`, `i.mimetype`, `strong.name`, `span.size`, delete button `data-id`, file/name/size/delete x-order, attachment container placement, and legacy attached-file display/background/border/height/line-height/margin/padding metrics |
| `common/branchItem.scala.html` | shared partials | reopen: inspect Scala anchors before JSX reuse |
| `common/calendar.scala.html` | shared partials | reopen: inspect Scala anchors before JSX reuse |
| `common/childComments.scala.html` | shared partials | metric guard passed: `issue-detail-parity.e2e.ts` asserts the legacy nested issue-comment caller with `.add-a-comment.pull-right`, `.subcomment-media-body`, `.child-comments`, `.one-line-comment`, `.contents`, hidden `.subcomment-author`, child author/date/delete hooks, child form action/`parentCommentId`/textarea placeholder, zero-height child anchor, right-aligned 60px subcomment body, dashed content divider, hidden child form, and legacy color/padding/margin metrics |
| `common/childCommentsAnchorDiv.scala.html` | shared partials | metric guard passed: `issue-detail-parity.e2e.ts` asserts the legacy nested issue-comment caller renders an empty `#comment-{childId}` anchor before `.one-line-comment`, preserves child comment `#comment-*` hrefs and delete hooks, and measures the zero-height anchor block x/width/y placement against `.child-comments` and the child row |
| `common/child_commentForm.scala.html` | shared partials | metric guard passed: `issue-detail-parity.e2e.ts` asserts the legacy nested issue-comment child form action/method/enctype, hidden `parentCommentId`, `.oneline-comment-box`, `textarea.editorSeries[name=contents][markdown=true]` placeholder/rows, `OK` submit button, `.notification-receiver` copy/styles, hidden form layout, and REST/TanStack comment mutation body with `parentCommentId` |
| `common/commentAndVoterPairDisplay.scala.html` | shared partials | metric guard passed: `issue-detail-parity.e2e.ts` asserts the legacy `issue/partial_view_child.scala.html` caller inside issue detail subtasks, `.font12.no-border-at-child`, nested `.item-count-groups`, comment/vote links, icon/count ordering and vertical overlap, no-border child override, `#comments`/`#vote` hrefs, magenta/orange colors, vote -5px second-link margin, subtask wrapper margins, parent font size, child padding, delimiter margin/border, and legacy icon/count padding/font metrics |
| `common/commentCount.scala.html` | shared partials | metric guard passed: `vote-count-parity.e2e.ts` asserts the legacy visible issue-list caller row, `.comments-count.comments-count-color`, `.count-groups.item-icon`, `.yobicon-comment2`, plain `.count-groups.item-count`, mounted issue `#comments` href, `.item-count-groups` border/line-height, first-link placement, comment icon/count horizontal ordering and vertical overlap, magenta comment color, non-strong font weight, and legacy icon/count padding and font metrics |
| `common/commentDeleteModal.scala.html` | shared partials | metric guard passed: `issue-detail-parity.e2e.ts` asserts the legacy issue-detail comment delete caller, hidden/open `#comment-delete-modal.modal.hide.fade`, header/body/footer ordering, close button right placement, 480px viewport-centered modal sizing, top placement, padding/border/footer flex metrics, `#comment-delete-confirm` and `data-request-uri` hooks, cancel close behavior, and REST DELETE mutation boundary |
| `common/commentForm.scala.html` | shared partials | metric guard passed: `issue-detail-parity.e2e.ts` asserts the legacy issue comment caller form `#comment-form` action/method/enctype, editor textarea name/classes, markdown help tabs, file uploader hidden `temporaryUploadFiles`, hidden `#dynamic-comment-btn`, notification receiver styles/copy, write-comment box/editor/uploader/submit ordering and size metrics, image paste/drop upload hooks, and REST/TanStack comment submit body |
| `common/commentUpdateForm.scala.html` | shared partials | metric guard passed: `issue-detail-parity.e2e.ts` asserts the legacy issue comment update form caller with `#comment-editform-10`, form action/method/enctype, hidden `id`, update markdown editor shell, textarea name/`data-editor-mode`/`markdown=true`, upload-drop-here, file upload controls, notification checkbox, cancel/save buttons, `temporaryUploadFiles`/preview/attachment/upload target hooks, layout/style metrics, and PUT REST/TanStack update body |
| `common/commitMsg.scala.html` | shared partials | metric guard passed: `code-parity.e2e.ts` asserts the legacy commit history caller with linked `.commitMsg.short`, adjacent `.commitMsg.moreBtn` ellipsis button, hidden `.commitMsg.desc` body text trimmed after the first line, full commit href, message-cell placement, and short/more/desc display and white-space metrics |
| `common/debug.scala.html` | shared partials | reopen: inspect Scala anchors before JSX reuse |
| `common/editor.scala.html` | shared partials | metric guard passed: `issue-detail-parity.e2e.ts` asserts the legacy issue comment editor caller with `data-toggle="markdown-editor"`, edit/preview tab hrefs and data modes, task-list and clear-temporary buttons, editor notice label, `#edit-comment-body`/`#preview-comment-body` tab panes, textarea name/classes/`data-editor-mode`/`markdown=true`, markdown preview class, notification receiver, Bootstrap tab-pane hidden/active display metrics, markdown help layout, preview toggle, image paste/drop upload hooks, and REST/TanStack submit body |
| `common/fileUploader.scala.html` | shared partials | metric guard passed: `issue-detail-parity.e2e.ts` asserts the legacy issue comment file uploader caller with `#upload.upload-wrap.content-footer`, resource type, uploader help/click/paste/save copy, upload button/file input, attached-files list, `tplAttachedFile` and `tplDropFilesHere` jQuery templates, attached-file/progress/delete/insert hooks, drop overlay style metrics, paste/drop upload requests, and REST/TanStack comment submit attachment IDs |
| `common/footer.scala.html` | P0 global shell | metric guard passed: `root-shell-parity.e2e.ts` asserts footer placement below navbar/content, full-width footer inner, provider links, and root/standalone footer separation |
| `common/issueLabelColor.scala.html` | shared partials | metric guard passed: `vote-count-parity.e2e.ts` and `issue-detail-parity.e2e.ts` assert bright and dark labels in issue-list and subtask callers, active label background colors, generated text colors (`dimgray`/white), inset 2px box-shadow color, label href/data-label-id anchors, and label placement next to the count pair |
| `common/loginDialog.scala.html` | P0 global shell | metric guard passed: `root-shell-parity.e2e.ts` asserts modal width/center positioning, close button/form/input/submit/remember row order, error state, and REST mutation boundary |
| `common/markdown.scala.html` | shared partials | reopen: inspect Scala anchors before JSX reuse |
| `common/mySeriesMenuTab.scala.html` | shared partials | metric guard passed: `search-parity.e2e.ts` asserts the legacy notifications caller with `.nav.nav-tabs`, active notification tab, issue/files tab hrefs and resolved labels, `#setDefaultLoginPage` type/class/data-url/title/popover hooks, tab/button x-order, shared y alignment, notification list placement after tabs, and legacy Bootstrap nav/button margin/display/font/height metrics |
| `common/navbar.scala.html` | P0 global shell | metric guard passed: `root-shell-parity.e2e.ts` asserts 40px navbar, pin/logo/nav/search/usermenu horizontal alignment, anonymous/auth/admin/guest variants, feedback link, and search form anchors |
| `common/notificationMail.scala.html` | shared partials | reopen: inspect Scala anchors before JSX reuse |
| `common/partial_history.scala.html` | shared partials | reopen: inspect Scala anchors before JSX reuse |
| `common/reviewForm.scala.html` | shared partials | reopen: inspect Scala anchors before JSX reuse |
| `common/scripts.scala.html` | P0 global shell | reopen: inspect Scala anchors before JSX reuse |
| `common/select2.scala.html` | shared partials | reopen: inspect Scala anchors before JSX reuse |
| `common/sharerCount.scala.html` | shared partials | metric guard passed: `vote-count-parity.e2e.ts` asserts the legacy visible issue-list caller row, `.sharer-color`, `.count-groups.item-icon`, `.yobicon-friends`, `.count-groups.item-count.strong`, tooltip/title attributes, absence of a non-legacy href, `.item-count-groups` border/line-height, vote/sharer horizontal ordering and vertical overlap, green sharer color, -5px third-link margin, and legacy icon/count padding and font metrics |
| `common/showSubtasksCheckbox.scala.html` | shared partials | metric guard passed: `vote-count-parity.e2e.ts` asserts the legacy visible issue-list caller tabs, `.show-subtasks-li`, `.show-subtasks.mr10`, `#toggle-show-subtasks`, `.show-subtasks-button-border`, `.show-subtasks-text`, popover attributes, negative list-item margin, wrapper line-height/margin, checkbox margin/baseline, border padding/color/radius, text padding/line-height, and two-column sibling placement |
| `common/tasklistBar.scala.html` | shared partials | metric guard passed: `issue-detail-parity.e2e.ts` asserts the legacy issue-body tasklist bar, `.tasklist.task-show`, `.task-title`, `.done-counter`, `.task-progress`, `.task-progress .bar`, `Tasklist` title, `Tasks(1/2)` copy, 50% bar width, title/progress vertical ordering, 20px horizontal padding, 10px top padding, 5px counter margin, 2px bar height, red incomplete bar, gray progress background, and title font weight |
| `common/twoColumnModeCheckboxArea.scala.html` | shared partials | metric guard passed: `vote-count-parity.e2e.ts` asserts the legacy visible issue-list caller tabs, `.two-column-icon.mr10.hide-in-mobile`, `#two-column-mode-checkbox`, `#two-column-mode`, `.two-column-icon-border`, `.two-column-mode-text`, title/data-content attributes, wrapper line-height/margins, checkbox margin/baseline, border padding/color/radius, text padding/line-height, and placement between the closed tab and show-subtasks control |
| `common/uploadForm.scala.html` | shared partials | metric guard passed: `issue-detail-parity.e2e.ts` asserts the legacy issue comment upload form caller with `#upload.upload-wrap.content-footer`, `data-resource-type=ISSUE_COMMENT`, `.attach-wrap`, `.help-droppable`, `.btn-wrap`, `.fake-file-wrap`, `input.file[name=filePath][multiple]`, `.plain`, `.help-pastable`, `.attached-files.unstyled`, `.right-txt.help`, uploader size/position metrics, paste/drop upload requests, and hidden `temporaryUploadFiles` submit body |
| `common/usermenu.scala.html` | P0 global shell | metric guard passed: `root-shell-parity.e2e.ts` asserts anonymous login/signup links, authenticated issue/admin/sidebar/create menu alignment, right-side 360px sidebar open/close, profile/account/logout rows, and guest variant |
| `common/usermenu_tab_content_list.scala.html` | P0 global shell | metric guard passed: `root-shell-parity.e2e.ts` asserts sidebar tab row ordering, tab content placement, and organization/project/recent issue pane x-alignment/content |
| `common/uservoice.scala.html` | P0 global shell | reopen: inspect Scala anchors before JSX reuse |
| `common/voteCount.scala.html` | shared partials | metric guard passed: `vote-count-parity.e2e.ts` asserts the legacy visible issue-list caller row, `.vote-count.vote-color`, `.count-groups.item-icon`, `.yobicon-hearts`, `.count-groups.item-count.strong`, mounted issue `#vote` href, `.item-count-groups` border/line-height, icon/count horizontal order and vertical overlap, primary color, and legacy padding/font metrics |

### `error/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `error/badrequest.scala.html` | P7 error/security | reopen: inspect Scala anchors before JSX reuse |
| `error/badrequest_default.scala.html` | P7 error/security | metric guard passed: `search-parity.e2e.ts` asserts the default bad-request shell, `.page-wrap-outer`/`.project-page-wrap`/`.error-wrap` placement, centered `.ico-404`, resolved bad-request copy, 100px vertical padding, 30px message margins, 16px bold gray message, centered `.ybtn.ybtn-info` home action, and search form/error banner absence |
| `error/forbidden.scala.html` | P7 error/security | reopen: inspect Scala anchors before JSX reuse |
| `error/forbidden_default.scala.html` | P7 error/security | metric guard passed: `search-parity.e2e.ts` asserts the legacy default forbidden shell on a 403 REST search response with `.page-wrap-outer`/`.project-page-wrap`/`.error-wrap`, centered `.ico.ico-err2`, resolved forbidden copy, primary home action, no search form/error banner, 100px vertical padding, 30px message margins, 16px bold gray message, centered icon/message/button placement, and primary button display/height/line-height metrics |
| `error/forbidden_organization.scala.html` | P7 error/security | reopen: inspect Scala anchors before JSX reuse |
| `error/internalServerError_default.scala.html` | P7 error/security | reopen: inspect Scala anchors before JSX reuse |
| `error/notfound.scala.html` | P7 error/security | reopen: inspect Scala anchors before JSX reuse |
| `error/notfound_default.scala.html` | P7 error/security | metric guard passed: `auth-public-entry-parity.e2e.ts` asserts the default not-found shell when secret setup is disabled, root GNB/footer presence, standalone secret-page chrome suppression, `.page-wrap-outer`/`.project-page-wrap`/`.error-wrap` placement, centered `.ico.ico-err2`, resolved not-found copy, 100px vertical padding, 30px message margins, 16px bold gray message, and centered `.ybtn.ybtn-info` home action |
| `error/requestTextEntityTooLarge.scala.html` | P7 error/security | reopen: inspect Scala anchors before JSX reuse |

### `git/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `git/clone.scala.html` | P5 git/pr | reopen: inspect Scala anchors before JSX reuse |
| `git/create.scala.html` | P5 git/pr | reopen: inspect Scala anchors before JSX reuse |
| `git/edit.scala.html` | P5 git/pr | reopen: inspect Scala anchors before JSX reuse |
| `git/fork.scala.html` | P5 git/pr | reopen: inspect Scala anchors before JSX reuse |
| `git/list.scala.html` | P5 git/pr | reopen: inspect Scala anchors before JSX reuse |
| `git/partial_branch.scala.html` | P5 git/pr | reopen: inspect Scala anchors before JSX reuse |
| `git/partial_forklist.scala.html` | P5 git/pr | reopen: inspect Scala anchors before JSX reuse |
| `git/partial_info.scala.html` | P5 git/pr | reopen: inspect Scala anchors before JSX reuse |
| `git/partial_list.scala.html` | P5 git/pr | reopen: inspect Scala anchors before JSX reuse |
| `git/partial_merge_result.scala.html` | P5 git/pr | reopen: inspect Scala anchors before JSX reuse |
| `git/partial_pull_request_event.scala.html` | P5 git/pr | reopen: inspect Scala anchors before JSX reuse |
| `git/partial_recently_pushed_branches.scala.html` | P5 git/pr | reopen: inspect Scala anchors before JSX reuse |
| `git/partial_reviewlist.scala.html` | P5 git/pr | reopen: inspect Scala anchors before JSX reuse |
| `git/partial_search.scala.html` | P5 git/pr | reopen: inspect Scala anchors before JSX reuse |
| `git/partial_state.scala.html` | P5 git/pr | reopen: inspect Scala anchors before JSX reuse |
| `git/view.scala.html` | P5 git/pr | reopen: inspect Scala anchors before JSX reuse |
| `git/viewChanges.scala.html` | P5 git/pr | reopen: inspect Scala anchors before JSX reuse |

### `help/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `help/UIKit.scala.html` | P1 help | metric guard passed: `root-shell-parity.e2e.ts` asserts standalone no-root-sidebar UI kit header, page, button/upload/dropdown/search stack, and internal footer order |
| `help/experimental.scala.html` | P1 help | metric guard passed: `auth-public-entry-parity.e2e.ts` and `help-route-parity.spec.tsx` assert hidden `#experimentalHelp.modal.hide.fade`, modal body/title/icon/description/action/confirm anchors, resolved HTML message copy, 560px modal width, viewport-centered placement, 10% top placement, body padding, centered title/description/action, and confirm centering |
| `help/keymap.scala.html` | P1 help | metric guard passed: `issue-detail-parity.e2e.ts` asserts keymap trigger placement, modal hidden/open transition, 640px content width with padding/border, viewport-centered modal placement, row/column x-order, shortcut button width, label adjacency, action row placement, confirm centering, and close behavior |
| `help/markdown.scala.html` | P1 help | metric guard passed: `issue-detail-parity.e2e.ts` asserts markdown help nav/wrap placement, ten nav/items, active toggle behavior, input/output `span6` column alignment, syntax pre sizing, resolved copy/sample anchors, and editor submit flow after toggling |
| `help/toc.scala.html` | P1 help | metric guard passed: `auth-public-entry-parity.e2e.ts` asserts site help navbar/breadcrumb/page/FAQ stack, question icon/link alignment, footer order, and item-wide toggle |

### `index/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `index/allOrganizationList.scala.html` | P1/P6 home workspace | reopen: inspect Scala anchors before JSX reuse |
| `index/allOrganizationList_partial.scala.html` | P1/P6 home workspace | reopen: inspect Scala anchors before JSX reuse |
| `index/allProjectList.scala.html` | P1/P6 home workspace | reopen: inspect Scala anchors before JSX reuse |
| `index/allProjectList_partial.scala.html` | P1/P6 home workspace | reopen: inspect Scala anchors before JSX reuse |
| `index/displayProjects.scala.html` | P1/P6 home workspace | reopen: inspect Scala anchors before JSX reuse |
| `index/index.scala.html` | P1/P6 home workspace | reopen: inspect Scala anchors before JSX reuse |
| `index/myOrganizationList.scala.html` | P1/P6 home workspace | reopen: inspect Scala anchors before JSX reuse |
| `index/myOrganizationList_partial.scala.html` | P1/P6 home workspace | reopen: inspect Scala anchors before JSX reuse |
| `index/myProjectList.scala.html` | P1/P6 home workspace | reopen: inspect Scala anchors before JSX reuse |
| `index/myProjectList_partial.scala.html` | P1/P6 home workspace | reopen: inspect Scala anchors before JSX reuse |
| `index/myRecentIssueList.scala.html` | P1/P6 home workspace | reopen: inspect Scala anchors before JSX reuse |
| `index/myRecentIssueList_partial.scala.html` | P1/P6 home workspace | reopen: inspect Scala anchors before JSX reuse |
| `index/notifications.scala.html` | P1/P6 home workspace | reopen: inspect Scala anchors before JSX reuse |
| `index/partial_intro.scala.html` | P1/P6 home workspace | metric guard passed: `root-shell-parity.e2e.ts`, `route-parity.spec.tsx`, and `auth-workspace-shell.spec.tsx` assert legacy anonymous home intro structure/copy, full-width home shell, legacy photo background, 750px centered intro cover, centered heading/tagline/signup action, six feature cells, 330px feature item width, row wrapping, icon/info/title x-alignment, and footer ordering |
| `index/partial_notifications.scala.html` | P1/P6 home workspace | reopen: inspect Scala anchors before JSX reuse |
| `index/sidebar.scala.html` | P1/P6 home workspace | intentional deviation recorded: thin wrapper around `siteLayout_framed`; active React keeps sidebar as SPA root layout surface and does not restore iframe/framed shell |

### `issue/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `issue/create.scala.html` | P3 issue | metric guard passed: `issue-form-parity.e2e.ts` asserts the issue create form shell with `.page-wrap-outer`, `.project-page-wrap`, `.content-wrap.frm-wrap`, `#issue-form`, title row, subtask option row, left editor/uploader/action column, right option menu, save/draft/cancel button order, right-menu option ordering, legacy title/body tabindex anchors, hidden referComment/isDraft fields, and REST/TanStack submit/draft payload continuity |
| `issue/edit.scala.html` | P3 issue | metric guard passed: `issue-form-parity.e2e.ts` asserts the issue edit form shell with `.page-wrap-outer`, `.project-page-wrap`, `.content-wrap.frm-wrap`, `#issue-form`, issue number/title/subtask row, left editor/uploader/action column, notification checkbox, save/cancel action ordering, right state/assignee/milestone/due-date/label option stack, hidden author/isDraft/isPublish fields, legacy title/body tabindex anchors, and REST/TanStack update payload continuity |
| `issue/list.scala.html` | P3 issue | metric guard passed: `vote-count-parity.e2e.ts` asserts the project issue list top-level caller shell with project header/menu order, `.page-wrap-outer`, `.project-page-wrap`, `.row-fluid.issue-list-wrap[pjax-container]`, left menu/content Bootstrap column alignment, new issue action placement, tabs/filter/list/pagination vertical ordering, and project shell display/float metrics |
| `issue/my_list.scala.html` | P3 issue | metric guard passed: `user-profile-parity.e2e.ts` asserts the siteLayout caller with `.page-wrap-outer > .page-wrap`, my-series active issue tab, `#setDefaultLoginPage[data-url=user/issues]`, `.row-fluid.issue-list-wrap[pjax-container]`, left/content Bootstrap column alignment, state tabs/filter/list/pagination vertical ordering, and TanStack Query/Mutation route boundary |
| `issue/my_partial_list.scala.html` | P3 issue | metric guard passed: `user-profile-parity.e2e.ts` asserts `.post-list-wrap.my-issues`, generated `#issue-item-*`, project name/issue number column, title/count/subtask/label stack, author/meta/assignee columns, issue/project href anchors, row x-order, list display, and pagination placement |
| `issue/my_partial_list_quicksearch.scala.html` | P3 issue | metric guard passed: `user-profile-parity.e2e.ts` asserts the six-row my-issue quicksearch list, active commented row, pjax/data user-id filter hooks, mentioned/shared/favorite counts, left-menu containment, and quicksearch-before-search-form vertical ordering |
| `issue/my_partial_search.scala.html` | P3 issue | metric guard passed: `user-profile-parity.e2e.ts` asserts `form#search[name=search][method=get]`, `/user/issues` action, hidden `orderBy/orderDir/state/authorId/commenterId/assigneeId/mentionId/sharerId/favoriteId`, no hidden `filter`, textbox `name=filter`, search button, search-bar containment, and placement after quicksearch |
| `issue/partial_assignee.scala.html` | P3 issue | metric guard passed: `issue-detail-parity.e2e.ts` asserts `#issueUpdateForm input#assignee.bigdrop[name=assigneeLoginId]`, placeholder/title/value/style anchors, first assignee `dl/dt/dd` placement, `.assignee-info` before the assignment input, 100% field containment, input display/height/padding/width metrics, and issue-info padding |
| `issue/partial_comment.scala.html` | P3 issue | metric guard passed: `issue-detail-parity.e2e.ts` asserts the issue detail top-level comment row with generated comment id/class, avatar/author/ago/share/new-issue/vote/translate/edit/delete hooks, markdown body update metadata, legacy attachment data/marker rendering, row/avatar/media/meta/action/body/attachment display metrics, and comment edit/delete/vote mutation coverage |
| `issue/partial_comments.scala.html` | P3 issue | metric guard passed: `issue-detail-parity.e2e.ts` asserts the issue detail comments shell with comment header icon/label/count from legacy `issue.comments.size`, separator, `ul.comments` timeline wrapper, comment/event item ordering, and rendered section/header/divider/list display metrics |
| `issue/partial_event_timeline.scala.html` | P3 issue | metric guard passed: `issue-detail-parity.e2e.ts` asserts issue event timeline rows with generated `#event-*` ids, state label classes for state/label/assignee events, user tooltip links, issue label rendering, hidden body-change event absence, date anchors, event ordering, and rendered event/state/message/date display and alignment metrics |
| `issue/partial_index_comment.scala.html` | P3 issue | metric guard passed: `issue-detail-parity.e2e.ts` asserts the compact issue comment index row in the right pane with `comment index-comment` class, `data-location`, body anchor/ellipsis text, author tooltip link, ago/share anchors, absent child-count marker for zero children, and rendered body/author/date display and placement metrics |
| `issue/partial_index_comments.scala.html` | P3 issue | metric guard passed: `issue-detail-parity.e2e.ts` asserts the compact right-pane comments shell with header label/count from legacy `issue.comments.size`, parent-only `ul.comments` index rows, event exclusion, child-count semantics, and rendered shell/header/list/comment display and placement metrics |
| `issue/partial_index_event_timeline.scala.html` | P3 issue | targeted absence guard passed: legacy `partial_index_comments.scala.html` imports this partial but does not render events in the compact right-pane timeline; `issue-detail-parity.e2e.ts` asserts no `aside.span-right-pane #comments li.event-index` while preserving the full left timeline event row |
| `issue/partial_list.scala.html` | P3 issue | metric guard passed: `vote-count-parity.e2e.ts` asserts the legacy project issue-list row with `.post-list-wrap.row-fluid`, `li.post-item.title`, left `.span9.span-hard-wrap`, right `.span3.hide-in-mobile`, mass-update checkbox, title/infos stack, count/label group, assignee avatar rail, due-date rail, row padding, title nowrap, and Bootstrap column ordering/alignment |
| `issue/partial_list_draft.scala.html` | P3 issue | metric guard passed: `vote-count-parity.e2e.ts` asserts the project issue-list draft branch with `ul.post-list-wrap.row-fluid[data-list="draft-issues"]`, generated `li#issue-item-*`, `#Draft` marker, draft title/author/date stack, empty assignee avatar rail, absence of count group, row padding, title nowrap, and draft-list-before-normal-list ordering |
| `issue/partial_list_quicksearch.scala.html` | P3 issue | metric guard passed: `vote-count-parity.e2e.ts` asserts the legacy left-menu quick filter list with four filter rows, active all-open row, pjax/data filter attributes, badge text/color/padding, active row background/radius/padding, anchor display, badge right alignment, vertical row order, and left-menu containment |
| `issue/partial_list_subtask.scala.html` | P3 issue | metric guard passed: `vote-count-parity.e2e.ts` asserts both child-progress and parent-link branches inside a project issue-list row, restored legacy `.for-subtask-progressbar` CSS, `.subtask-progress.upload-progress.red-outline`, `.bar.red`, completion ratio text, parent issue backlink/truncation, 30px progress width, 7px bar height, one-third bar width, font sizing, and placement inside `.infos` |
| `issue/partial_list_wrap.scala.html` | P3 issue | metric guard passed: `vote-count-parity.e2e.ts` asserts the owning issue-list wrapper with `.row-fluid.issue-list-wrap`, `.left-menu.span2.span-hard-wrap`, `#span10.span10.span-hard-wrap`, new-issue action, open/closed `ul.nav.nav-tabs.nm` state tabs and badges, two-column/show-subtasks controls, `.filter-wrap.board`, mass update slot, sort filter order/active attrs, draft-before-normal list ordering, Excel export action, and `#pagination[data-total]` placement/display metrics |
| `issue/partial_massupdate.scala.html` | P3 issue | metric guard passed: `vote-count-parity.e2e.ts` asserts the project issue-list mass update toolbar with `#mass-update-form`, `#check-all[data-target=checked-issue]`, state/assignee/milestone/attach-label/detach-label dropdown `data-name` anchors, disabled initial buttons, checkbox-enabled buttons, Bootstrap-style inline button-group ordering/alignment, label/caret ordering, dropdown list placement, label category/divider rows, and form/button display metrics while preserving the React/TanStack mutation callback boundary |
| `issue/partial_searchform.scala.html` | P3 issue | metric guard passed: `vote-count-parity.e2e.ts` asserts the left-menu issue search form with hidden query fields, search input/button hooks, top search bar 20px sizing, advanced author/assignee/milestone/due-date filter stack, calendar button placement, label-manage action placement, advanced spacing, option margins, and left-menu containment |
| `issue/partial_select_label.scala.html` | P3 issue | metric guard passed: `issue-detail-parity.e2e.ts` asserts the editable issue detail label selector with label edit link, hidden `#labelIds` Select2 source attributes, option selected/category metadata, visible fallback checkbox labels, hidden select display, fallback row ordering, swatch color, and `dl/dt/dd` spacing/alignment metrics |
| `issue/partial_select_subtask.scala.html` | P3 issue | metric guard passed: `issue-form-parity.e2e.ts` asserts the issue create form subtask selector with `.subtask-message`, `.subtask-wrap.show`, legacy `#targetProjectId` and `#parentId` Select2 source attributes/options/selected parent, English legacy parent placeholder copy, title-to-option placement, project/parent select column ordering, message text overflow styling, hidden/shown wrap display, and REST/TanStack submit payload preservation |
| `issue/partial_show_selected_label.scala.html` | P3 issue | metric guard passed: `issue-detail-parity.e2e.ts` asserts the read-only issue detail selected-label `<dl>` with `dt` label copy, `dd > a.label.issue-label.active.static[data-label-id]`, legacy issue-list filter href, label text/color, absence of editable label select/fallback controls, right-pane containment, `dl/dt/dd/a` vertical ordering, and label display/color/spacing metrics |
| `issue/partial_view_child.scala.html` | P3 issue | metric guard passed: `issue-detail-parity.e2e.ts` asserts the issue detail child issue row with `.issue-item.child-issue`, state label, child issue href, `item-name` / `subtask-number` / assignee copy, comment/vote pair, issue label href/data-label-id/text, child date title/text, placement below the parent delimiter, count-pair ordering, label placement, and legacy padding/font/color/delimiter metrics |
| `issue/partial_view_childIssueList.scala.html` | P3 issue | metric guard passed: `issue-detail-parity.e2e.ts` asserts the issue detail parent/child subtask list with outer and nested `.child-issues` wrappers, `.issue-item.parent-issue`, parent issue href/copy/bold state, `.upload-progress.red-outline`, `.bar.red` width/title, count/state copy, `.parent-issue-delimeter`, child row ordering below the delimiter, and legacy margin/padding/font/progress/delimiter metrics |
| `issue/partial_view_childIssueListOnly.scala.html` | P3 issue | metric guard passed: `vote-count-parity.e2e.ts` asserts the issue-list `.child-issue-list.hide` caller with open/closed child rows, hidden default state, opened wrapper metrics, nested `.child-issues`, `.issue-item.child-issue`, state labels, child href/name/count/label/date anchors, preserved label `data-category-id`, hover-only date visibility, closed checkmark color, transparent closed state background, wrapper color, row ordering, and label color metrics |
| `issue/partial_voter_list.scala.html` | P3 issue | metric guard passed: `issue-detail-parity.e2e.ts` asserts `#voters.modal.hide.voters-dialog`, header/title/close button, body `ul.unstyled` voter rows, `.usf-group[target=_blank]` links, `.avatar-wrap.mlarge`, name/login id ordering, footer close button, centered issue-detail modal placement, body/header/footer display metrics, and row/avatar sizing |
| `issue/partial_voters.scala.html` | P3 issue | metric guard passed: `issue-detail-parity.e2e.ts` asserts `.voter-list-wrap`, `.voter-list`, three `.avatar-wrap.smaller` entries, tooltip/modal "more" link, voter list vertical flow, 20px avatar metrics, list margin/display metrics, and the `href="#voters"` modal hook |
| `issue/view.scala.html` | P3 issue | metric guard passed: `issue-detail-parity.e2e.ts` asserts the issue detail view shell with `.project-page-wrap.board-view`, `.board-header.issue`, desktop date/state meta, `.board-body.row-fluid`, left/right pane Bootstrap column alignment, author/body/attachments/action row ordering, watch/vote/action placement, subtask/comments stack, right-pane `#issueUpdateForm`, compact comments ordering, hidden edit source anchors, and existing REST/TanStack mutation coverage |

### root layout and shared top-level partials

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `layout.scala.html` | P0/P7 layout | reopen: inspect Scala anchors before JSX reuse |
| `layout_framed.scala.html` | P0/P7 layout | reference-only for active SPA sidebar decision |
| `organizationLayout.scala.html` | P6 organization | metric guard passed: `organization-directory-admin-parity.e2e.ts` asserts root navbar, organization header/menu/page-wrap stack, settings submenu placement, and left/right settings form alignment; nested organization content rows remain open separately |
| `partial_comment_form_on_thread.scala.html` | shared P5/P3 diff/comment | metric guard passed: `project-code-comment-upload-parity.e2e.ts` asserts the commit detail inline ranged thread reply form with form action, hidden thread id, code-review editor tab panes, textarea name/classes/mode/100px height, submit button copy, placement after thread comments, rendered display metrics, paste upload handling, and REST/TanStack reply mutation body |
| `partial_comment_thread.scala.html` | shared P5/P3 diff/comment | metric guard passed: `project-code-comment-upload-parity.e2e.ts` asserts the commit detail inline ranged code comment thread wrapper with state/class/data-range hooks, minimize affordance, legacy thread header badge/maximize button, comments list ordering, reply form ordering, row/cell/thread/header display metrics, and close/open/reply mutation coverage |
| `partial_diff.scala.html` | shared P5/P3 diff/comment | metric guard passed: `project-code-comment-upload-parity.e2e.ts` asserts the commit detail caller renders the normal no-limit-alert `.diff-body` file-diff list, places the file diff after commitInfo and before commit comment form, keeps `.btnPop`, and preserves diff body/file/list ordering metrics |
| `partial_diff_comment_on_line.scala.html` | shared P5/P3 diff/comment | metric guard passed: `project-code-comment-upload-parity.e2e.ts` asserts the commit detail inline diff caller renders `<tr class="comments board-comment-wrap">` after the ranged diff line, preserves `data-commit-id`, `td[colspan=3]`, `#thread-*` range/path/side hooks, thread button/list/comment/reply form ordering, row/cell/thread display metrics, and inline reply upload mutation |
| `partial_diff_line.scala.html` | shared P5/P3 diff/comment | metric guard passed: `project-code-comment-upload-parity.e2e.ts` asserts the commit detail caller renders legacy diff rows with `context`/`add` classes, `data-line`/`data-type`/`data-side`, empty old line for added lines, new line `data-line-num`, code cell/pre text, line-number/code-cell x-order, and diff line display/white-space metrics |
| `partial_filediff.scala.html` | shared P5/P3 diff/comment | metric guard passed: `project-code-comment-upload-parity.e2e.ts` asserts the commit detail caller renders one file diff for `src/main.rs` with stable `id=src-main-rs`, `data-file-path`, filename/stats, range/add rows, line-number/code-cell x-order, table placement, and diff-file/table/code display, border, collapse, layout, and whitespace metrics |
| `partial_update_notification.scala.html` | P0 global shell | reopen: inspect Scala anchors before JSX reuse |
| `projectLayout.scala.html` | P2 project | metric guard passed: `project-settings-parity.e2e.ts` asserts root navbar, project header/menu/page-wrap stack, settings submenu placement, and left/right settings form alignment; nested project content rows remain open separately |
| `projectMenu.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
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
| `milestone/create.scala.html` | P4 milestone | reopen: inspect Scala anchors before JSX reuse |
| `milestone/edit.scala.html` | P4 milestone | reopen: inspect Scala anchors before JSX reuse |
| `milestone/list.scala.html` | P4 milestone | metric guard passed: `milestone-delete-modal-parity.e2e.ts` asserts project shell stack, milestone tabs/new button/filter/search/list ordering, list item width, progress placement, and issue link anchors |
| `milestone/partial_status.scala.html` | P4 milestone | metric guard passed: `milestone-delete-modal-parity.e2e.ts` asserts milestone progress percent/bar width, closed/open issue count copy, due date/status copy, and list/detail route state toggles |
| `milestone/view.scala.html` | P4 milestone | reopen: inspect Scala anchors before JSX reuse |

### `organization/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `organization/create.scala.html` | P6 organization | reopen: inspect Scala anchors before JSX reuse |
| `organization/deleteForm.scala.html` | P6 organization | reopen: inspect Scala anchors before JSX reuse |
| `organization/group_board_list.scala.html` | P6 organization | reopen: inspect Scala anchors before JSX reuse |
| `organization/group_board_list_partial.scala.html` | P6 organization | reopen: inspect Scala anchors before JSX reuse |
| `organization/group_issue_list.scala.html` | P6 organization | reopen: inspect Scala anchors before JSX reuse |
| `organization/group_issue_list_partial.scala.html` | P6 organization | reopen: inspect Scala anchors before JSX reuse |
| `organization/group_issue_list_quicksearch.scala.html` | P6 organization | reopen: inspect Scala anchors before JSX reuse |
| `organization/group_issue_search_partial.scala.html` | P6 organization | reopen: inspect Scala anchors before JSX reuse |
| `organization/group_pullrequest_list.scala.html` | P6 organization | reopen: inspect Scala anchors before JSX reuse |
| `organization/group_pullrequest_list_partial.scala.html` | P6 organization | reopen: inspect Scala anchors before JSX reuse |
| `organization/header.scala.html` | P6 organization | metric guard passed: `organization-directory-admin-parity.e2e.ts` asserts 120px organization header, inner/header y alignment, and root navbar overlay position |
| `organization/list.scala.html` | P6 organization | reopen: inspect Scala anchors before JSX reuse |
| `organization/members.scala.html` | P6 organization | reopen: inspect Scala anchors before JSX reuse |
| `organization/menu.scala.html` | P6 organization | metric guard passed: `organization-directory-admin-parity.e2e.ts` asserts 40px organization menu placement directly below the header and before page content |
| `organization/partial_settingmenu.scala.html` | P6 organization | metric guard passed: `organization-directory-admin-parity.e2e.ts` asserts the settings submenu appears before `#saveSetting` inside `.project-page-wrap` |
| `organization/setting.scala.html` | P6 organization | metric guard passed: `organization-directory-admin-parity.e2e.ts` asserts settings form top box, left/right column x/y alignment, 260x188 logo area, description width, and mutation-capable form shell |
| `organization/view.scala.html` | P6 organization | reopen: inspect Scala anchors before JSX reuse |

### `project/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `project/change_vcs.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/create.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/delete.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/header.scala.html` | P2 project | metric guard passed: `project-settings-parity.e2e.ts` asserts 120px project header, inner/header y alignment, root navbar overlay position, and `data-project-id` selector guard remains covered by `project-settings-parity.spec.tsx` |
| `project/home.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/importing.scala.html` | P7 import/P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/issuelabels.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/list.scala.html` | P6 directory/P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/members.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/partial_dashboard.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/partial_dashboard_issuesbyassignee.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/partial_dashboard_issuesbylabel.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/partial_dashboard_issuesbymilestone.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/partial_dashboard_pullrequests.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/partial_history.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/partial_issuelabels_editcategory.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/partial_issuelabels_editlabel.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/partial_issuelabels_list.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/partial_readme.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/partial_settingmenu.scala.html` | P2 project | metric guard passed: `project-settings-parity.e2e.ts` asserts the settings submenu appears before `#saveSetting` inside `.project-page-wrap` |
| `project/partial_webhooks_list.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/setting.scala.html` | P2 project | metric guard passed: `project-settings-parity.e2e.ts` asserts settings form top box, left/right column x/y alignment, 260x188 logo area, description width, and mutation-capable form shell; hidden `watchingCount` selector remains covered by `project-settings-parity.spec.tsx` |
| `project/statistics.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/transfer.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/watchers.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/webhooks.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |

### `reviewthread/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `reviewthread/list.scala.html` | P5 review | reopen: inspect Scala anchors before JSX reuse |
| `reviewthread/partial_list.scala.html` | P5 review | reopen: inspect Scala anchors before JSX reuse |

### `search/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `search/partial_issue_comments.scala.html` | P6 search | reopen: inspect Scala anchors before JSX reuse |
| `search/partial_issues.scala.html` | P6 search | metric guard passed: `search-parity.e2e.ts` asserts issue result list/item width, title/content/meta vertical order, pagination placement, highlighted keyword rendering, and issue link anchors |
| `search/partial_milestones.scala.html` | P6 search | reopen: inspect Scala anchors before JSX reuse |
| `search/partial_post_comments.scala.html` | P6 search | reopen: inspect Scala anchors before JSX reuse |
| `search/partial_posts.scala.html` | P6 search | reopen: inspect Scala anchors before JSX reuse |
| `search/partial_projects.scala.html` | P6 search | reopen: inspect Scala anchors before JSX reuse |
| `search/partial_reviews.scala.html` | P6 search | reopen: inspect Scala anchors before JSX reuse |
| `search/partial_search.scala.html` | P6 search | metric guard passed: `search-parity.e2e.ts` asserts search breadcrumb/page wrap, category column/result search box separation, form input/button x alignment, result title/wrap ordering, category counts, and type switch behavior |
| `search/partial_users.scala.html` | P6 search | reopen: inspect Scala anchors before JSX reuse |
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
| `site/partial_pagination.scala.html` | P7 site-admin | metric guard passed: `site-admin-project-list-parity.e2e.ts` asserts rendered pagination position/link shape on `/sites/projectList` |
| `site/partial_paginationForUserList.scala.html` | P7 site-admin | metric guard passed: `site-admin-user-list-parity.e2e.ts` asserts rendered pagination position/link shape on `/sites/userList` |
| `site/postList.scala.html` | P7 site-admin | metric guard passed: `site-admin-post-list-parity.e2e.ts` asserts post-style row avatar/info/meta alignment, anchors, and pagination |
| `site/projectList.scala.html` | P7 site-admin | metric guard passed: `site-admin-project-list-parity.e2e.ts` asserts title/filter alignment, listhead-to-row column alignment, delete modal hooks, and pagination |
| `site/setting.scala.html` | P7 site-admin | legacy-placeholder deviation recorded: Scala body is only `TODO` inside `siteMngLayout(message)` and legacy nav does not expose a setting page; React intentionally does not restore a visible `/sites/setting` TODO page |
| `site/siteMngLayout.scala.html` | P7 site-admin | metric guard passed: site-admin e2e suite asserts shared navbar, breadcrumb, left nav, content column, and footer ordering across user/project/post/issue/mail/data/update/diagnostic routes |
| `site/update.scala.html` | P7 site-admin | metric guard passed: `site-admin-update-parity.e2e.ts` asserts update/no-update/download branches, message ordering, and site-admin shell layout |
| `site/userList.scala.html` | P7 site-admin | metric guard passed: `site-admin-user-list-parity.e2e.ts` asserts title/search alignment, tabs, listhead/row/pagination ordering, and user action hooks |

### `user/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `user/edit.scala.html` | P6 workspace/profile | reopen: inspect Scala anchors before JSX reuse |
| `user/edit_emails.scala.html` | P6 workspace/profile | reopen: inspect Scala anchors before JSX reuse |
| `user/edit_notifications.scala.html` | P6 workspace/profile | reopen: inspect Scala anchors before JSX reuse |
| `user/edit_password.scala.html` | P6 workspace/profile | reopen: inspect Scala anchors before JSX reuse |
| `user/edit_token.scala.html` | P6 workspace/profile | reopen: inspect Scala anchors before JSX reuse |
| `user/login.scala.html` | P1 auth | metric guard passed: `auth-public-entry-parity.e2e.ts` asserts public login navbar/page/title/tagline stack, centered 400px form, 386px login/password input alignment, full-width submit, remember/forgot row alignment, redirect hidden field, resolved copy, and TanStack Query sign-in mutation boundary |
| `user/partial_edit_tabmenu.scala.html` | P6 workspace/profile | reopen: inspect Scala anchors before JSX reuse |
| `user/partial_issues.scala.html` | P6 workspace/profile | reopen: inspect Scala anchors before JSX reuse |
| `user/partial_milestones.scala.html` | P6 workspace/profile | reopen: inspect Scala anchors before JSX reuse |
| `user/partial_postings.scala.html` | P6 workspace/profile | reopen: inspect Scala anchors before JSX reuse |
| `user/partial_projectlist.scala.html` | P6 workspace/profile | reopen: inspect Scala anchors before JSX reuse |
| `user/partial_pullRequests.scala.html` | P6 workspace/profile | reopen: inspect Scala anchors before JSX reuse |
| `user/resetPassword.scala.html` | P1 auth | metric guard passed: `auth-public-entry-parity.e2e.ts` asserts reset-password navbar/page/title/tagline stack, centered 400px form, 386px password/retyped-password input alignment, full-width submit, hash hidden field, footer order, resolved copy, and TanStack Query complete-reset mutation boundary |
| `user/signup.scala.html` | P1 auth | metric guard passed: `auth-public-entry-parity.e2e.ts` asserts public signup navbar/page/title/tagline stack, centered 400px form, label/input vertical ordering, 386px field alignment, full-width submit, login action row, resolved copy, and TanStack Query register mutation boundary |
| `user/userFiles.scala.html` | P6 workspace/profile | reopen: inspect Scala anchors before JSX reuse |
| `user/verified.scala.html` | P1 auth | metric guard passed: `auth-public-entry-parity.e2e.ts` asserts verified-user navbar/page/title/loginId/hr/detail stack, centered reset-password shell alignment, footer order, resolved copy, and invalid verification branch |
| `user/view.scala.html` | P6 workspace/profile | reopen: inspect Scala anchors before JSX reuse |

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

The next audit turn should choose one reopened group, archive its current active
JSX, and replace it from the owning Scala template set before broadening to the
next group.
