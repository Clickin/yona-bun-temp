# Template-First UI Parity Report: P3 Issue/Editor/Comments

Status: current reset baseline
Date: 2026-06-26
Owner packet: P3 issue/editor/comments
Mode: template-first mapper baseline; implementation not started

## Scope

This report reopens issue/editor/comment parity under
`docs/plans/2026-06-26-template-first-ui-parity-reset.md`.

The older `ui-parity-issues.md` report remains useful route/API evidence. It
does not prove the legacy issue templates, editor partials, comment partials,
and issue list density are visually equivalent.

## Legacy Template Call Graph

| Legacy source | Role | Required anchors |
| --- | --- | --- |
| `yona-original/app/views/issue/list.scala.html` | Project issue list wrapper. Calls `projectLayout`, `projectMenu(..., "main-menu-only")`, loads project label stylesheet, wraps partial list/search. | `.page-wrap-outer`, `.project-page-wrap`, `.row-fluid.issue-list-wrap`, label CSS link. |
| `issue/partial_searchform.scala.html`, `partial_list_wrap.scala.html`, `partial_list.scala.html`, `partial_list_quicksearch.scala.html`, `partial_massupdate.scala.html` | Project issue filters, quick search, list rows, mass update toolbar. | `.left-menu.span2`, `form#search`, `.search-bar`, `.labels-wrap`, `.nav.nav-tabs.nm`, `.filter-wrap`, `#pagination`, `.post-list-wrap`, `.post-item.title`, `label.mass-update-check`, `#mass-update-form`, `#check-all`, `#state`, `#attaching-label`, `#detaching-label`. |
| `issue/my_list.scala.html`, `my_partial_search.scala.html`, `my_partial_list.scala.html`, `my_partial_list_quicksearch.scala.html` | User issue list. | `.page-wrap`, `.row-fluid.issue-list-wrap`, `.myissues-search-input`, `.post-list-wrap.my-issues`, `.project-name-in-my-issues`. |
| `issue/create.scala.html`, `issue/edit.scala.html` | Issue form. | `.content-wrap.frm-wrap`, `form#issue-form`, `#title`, `#notificationMail`, hidden draft/publish/author fields, `#targetProjectId`, `#parentId`, `#assignee`, `#milestoneId`, `#issueDueDate`, `#labelIds`, draft/save buttons. |
| `common/editor.scala.html` | Markdown editor shell. | `[data-toggle=markdown-editor]`, `.nav.nav-tabs.nm.small`, `a[data-mode=edit]`, `a[data-mode=preview]`, `.task-list-button`, `#button-clear-temporary`, `.textarea-box`, `textarea.editorSeries.content.comment.nm`, `.markdown-preview.markdown-wrap`, `.notification-receiver`. |
| `common/fileUploader.scala.html`, `common/tasklistBar.scala.html` | Upload/checklist helpers. | `.upload-wrap.content-footer`, `.attach-wrap`, upload button/input, `.attached-files.unstyled`, checklist toolbar. |
| `issue/view.scala.html`, `partial_comments.scala.html`, `partial_comment.scala.html`, `partial_event_timeline.scala.html`, common comment partials | Detail, metadata sidebar, comments, timeline. | `#issueUpdateForm`, `.content.markdown-wrap`, `.comment-header`, `ul.comments`, `li.comment`, `.comment-avatar`, `.media-body`, `.meta-info`, `.comment-body.markdown-wrap`, `#comment-delete-modal`, child comment anchors/forms, event timeline rows. |

## Current React/CSS Targets

| Current source | Current responsibility |
| --- | --- |
| `frontend/src/routes/-issue-views.tsx` | Project/user issue lists, issue forms, detail, sidebar metadata, comments, timeline, mass update. |
| `frontend/src/routes/-markdown-renderer.tsx` | Markdown renderer and editor shell. |
| `frontend/src/routes/$owner/$projectName/issues/route.tsx`, `issueform/route.tsx`, `issue/$issueNumber/**`, `user/issues/**` | Route entrypoints. |
| `frontend/src/app.css` | Issue list/form/comment visual approximation. |
| `frontend/tests/issue-form-parity.e2e.ts`, `issue-detail-parity.e2e.ts`, `shell-routing-smoke.e2e.ts` | Browser route/interaction proof. |
| `frontend/src/issue-list-filter.spec.tsx`, `frontend/src/issue-detail-shell.spec.tsx`, `frontend/src/route-parity.spec.tsx` | Static selector proof. |

## Open Reset Queue Summary

Source comparison by Subagent P3 found concrete reset blockers:

| status | count |
| --- | ---: |
| gap | 0 |
| deviation | 1 |
| weak evidence | 3 |
| covered | 8 |
| not-applicable | 1 |

## Reset Findings

| legacy template | legacy route/state | current file | defect class | status | owner packet | proposed write scope | verification evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `issue/view.scala.html`, `issue/partial_index_comments.scala.html`, `issue/partial_index_comment.scala.html` | Issue detail right `issue-info` compact comment index. | `frontend/src/routes/-issue-views.tsx`, `frontend/src/issue-detail-shell.spec.tsx` | layout | covered in current follow-up | P3 | none | Issue detail now renders the legacy compact comment index inside `.issue-info` after `#issueUpdateForm`: `#comments.board-comment-wrap > #timeline > .timeline-list`, `.comment-header .num`, root `.comment.index-comment[data-location]`, `#comment-body-$id .comment-body > a`, `.index-comment-author`, `.comment-exists`, `.comment_author`, `.ago-date`, and hidden `.share-link`. |
| `issue/partial_comment.scala.html`, `issue/partial_voter_list.scala.html` | Full comment timeline with voter avatars/modal threshold. | `frontend/src/routes/-issue-views.tsx`, `frontend/src/issue-detail-shell.spec.tsx`, `frontend/src/auth-workspace-shell.spec.tsx` | layout | covered in current follow-up | P3 | none | Full comment action rows now match the legacy voter threshold: <=5 voters render `.avatar-wrap.smaller` tooltip links without agreement text, >5 voters render `.vote-description-people[href=#voters-$id]` plus `#voters-$id.modal.hide.voters-dialog` with `.usf-group`, `.avatar-wrap.mlarge`, `.name`, and `.loginid`. |
| `common/commentUpdateForm.scala.html` | Comment edit with upload label/input and notification mail checkbox. | `frontend/src/routes/-issue-views.tsx`, `frontend/src/app-view-models.ts`, `frontend/src/routes/-view-models.ts`, `frontend/src/auth-workspace-client.ts`, `crates/server/src/api_types.rs`, `crates/server/src/routes/issues.rs`, `frontend/src/issue-detail-shell.spec.tsx` | interaction | covered in current follow-up | P3 | none | Comment edit now renders the legacy `.file-upload > .file-upload__label.ybtn[for=upload-$id]`, `.file-upload__input#upload-$id[name=filePath][multiple]`, and authored-only `.send-notification-check` popover with checked `notificationMail=yes`; server/detail view models carry `authorId` and `viewerUserId` so the checkbox follows legacy `comment.isAuthoredBy(currentUser)` behavior. |
| `common/fileUploader.scala.html`, `common/uploadForm.scala.html` | Issue/comment create upload, drag/drop, attached file template. | `frontend/src/routes/-issue-views.tsx`, `frontend/src/routes/-markdown-attachment-textarea.tsx`, `frontend/src/issue-detail-shell.spec.tsx`, `frontend/src/route-parity.spec.tsx` | data-boundary | covered in current follow-up | P3 | none | Issue/comment create upload shells now preserve the legacy `uploadForm` wrapper plus `fileUploader` template anchors: `#upload.upload-wrap.content-footer[data-resource-type]`, `.attach-wrap`, `.fake-file-wrap input.file[name=filePath][multiple]`, `.attached-files.unstyled`, `#tplAttachedFile[type=text/x-jquery-tmpl]`, `.attached-file`, `.progress.upload-progress .bar.orange`, `.btn-delete`, `.btn-insert`, and `#tplDropFilesHere .upload-drop-here`. |
| `common/editor.scala.html` | Markdown editor edit/preview/checklist/clear temporary/receiver list. | `frontend/src/routes/-markdown-renderer.tsx`, `frontend/src/routes/-issue-views.tsx`, `frontend/src/markdown-renderer.spec.tsx` | interaction | covered in current follow-up | P3 | none | Markdown editor shell now has selector proof for legacy edit/preview tab anchors and panes, `.task-list-button`, `#button-clear-temporary`, `.editor-notice-label`, `.markdown-preview.markdown-wrap`, and `.notification-receiver`; clear-temporary behavior is implemented in React-side helper coverage without importing legacy JavaScript. |
| `issue/view.scala.html`, `common/tasklistBar.scala.html` | Issue/comment tasklist progress bar before markdown content. | `frontend/src/routes/-markdown-renderer.tsx`, `frontend/src/issue-detail-shell.spec.tsx`, `frontend/src/markdown-renderer.spec.tsx` | layout | covered in current follow-up | P3 | none | Issue detail now has route-level selector proof that issue and comment markdown bodies render the legacy tasklist progress shell before markdown content, including `.tasklist.task-show`, `.task-title .done-counter`, `.task-progress`, and `.bar.red[title=Tasklist]` with legacy width percentages. |
| `issue/partial_massupdate.scala.html` | Mass update dropdowns with category dividers and assign-to-me row. | `frontend/src/routes/-issue-views.tsx`, `frontend/src/routes/$owner/$projectName/issues/route.tsx`, `frontend/src/issue-list-filter.spec.tsx` | layout | covered in current follow-up | P3 | none | Mass update dropdowns now preserve legacy `.mass-update-list` label category rows with `li.disabled[data-category]`, label `li[data-category][data-value]`, `.divider[data-category]`, current-user `Assign to me`, and assignee rows with `.usf-group`, `.avatar-wrap.smaller`, `.name`, and `.loginid`. |
| `issue/partial_list.scala.html` | Issue list labels, child issue hidden block, count icons. | `frontend/src/routes/-issue-views.tsx`, `frontend/src/routes/-view-models.ts`, `frontend/src/app-view-models.ts`, `frontend/src/issue-list-filter.spec.tsx` | css | covered in current follow-up | P3 | none | Issue list rows now have selector proof for legacy `.child-issue-list.hide`, `.num-comments`, `.num-hearts`, `.num-sharers`, `.weight-up-arrow`, `.title-prefix`, and label `data-category-id`/`data-label-id` while preserving title prefix separation and count anchors. |
| `issue/view.scala.html` | Detail sidebar order: issue-info compact comments; left pane watcher/subtasks/sharer before comments. | `frontend/src/routes/-issue-views.tsx` | layout | deviation | P3 | issue detail component and detail parity test | Need DOM order assertion against legacy template. |
| `issue/create.scala.html`, `issue/edit.scala.html` | Save/draft/publish double-submit guard and draft tooltip. | `frontend/src/routes/-issue-views.tsx` | interaction | weak evidence | P3 | issue form component and `issue-form-parity.e2e.ts` | Need interaction proof for disabled 3s guard and draft save description. |
| `issue/view.scala.html`, `issue/partial_event_timeline.scala.html` | Repeated same-type timeline event suppresses duplicate state label. | `frontend/src/routes/-issue-views.tsx` | copy | weak evidence | P3 | timeline component and detail timeline test | Need fixture assertion for consecutive label/sharer events. |
| `issue/my_list.scala.html`, `my_partial_list.scala.html`, `my_partial_search.scala.html` | User issue list and quick search route states. | `frontend/src/routes/user/issues/route.tsx`, `frontend/src/routes/-issue-views.tsx` | layout | weak evidence | P3 | user issue route/shared issue list views/tests | Needs a separate mapper pass for `my_*` template visual parity. |
| Legacy PJAX/timeline fragment paths | XHR list/timeline fragments return server-rendered HTML in legacy. | React route plus REST JSON | data-boundary | not-applicable | P3 | none unless parent reclassifies | Keep as React-rendered API conversion per reset; rendered DOM still needs template shape parity. |

## Verifier Baseline Required

P3 cannot close until verifier evidence includes:

- desktop/mobile legacy/current screenshots for project issue list,
  user issue list, create form, edit form, issue detail with comments/timeline,
  and at least one empty-state list;
- computed-style/layout proof for `.row-fluid.issue-list-wrap`, `.left-menu`,
  `.post-list-wrap`, `.post-item.title`, `.content-wrap.frm-wrap`,
  `[data-toggle=markdown-editor]`, `.markdown-preview.markdown-wrap`,
  `.upload-wrap.content-footer`, `#issueUpdateForm`, `ul.comments`,
  `li.comment`, `.comment-body.markdown-wrap`, and `#comment-delete-modal`;
- interaction proof for filter/search/pagination, mass update, editor preview,
  upload/drop, comment edit/delete, child comment, and sidebar metadata updates;
- confirmation that REST JSON/API-return remains the data boundary while the
  visible DOM follows legacy template shape.
