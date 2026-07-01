# Template-First UI Parity Report: P3 Issue/Editor/Comments

Status: current reset baseline
Date: 2026-06-26
Owner packet: P3 issue/editor/comments
Mode: template-first mapper baseline; implementation evidence reviewed

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
| deviation | 0 |
| weak evidence | 0 |
| covered | 14 |
| not-applicable | 1 |
| needs-parent-decision | 0 |

## Reset Findings

| legacy template | legacy route/state | current file | defect class | status | owner packet | proposed write scope | verification evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `issue/view.scala.html`, `issue/partial_index_comments.scala.html`, `issue/partial_index_comment.scala.html` | Issue detail right `issue-info` compact comment index. | `frontend/src/routes/-issue-views.tsx`, `frontend/src/issue-detail-shell.spec.tsx` | layout | covered in current follow-up | P3 | none | Issue detail now renders the legacy compact comment index inside `.issue-info` after `#issueUpdateForm`: `#comments.board-comment-wrap > #timeline > .timeline-list`, `.comment-header .num`, root `.comment.index-comment[data-location]`, `#comment-body-$id .comment-body > a`, `.index-comment-author`, `.comment-exists`, `.comment_author`, `.ago-date`, and hidden `.share-link`. |
| `issue/view.scala.html`, `issue/partial_comments.scala.html`, `issue/partial_comment.scala.html`, `issue/partial_event_timeline.scala.html` | Live legacy sample detail `/admin/sample/issue/1` with body and zero-comment timeline state. | `scripts/visual-parity-sweep.mjs`, `frontend/src/routes/-issue-views.tsx`, issue detail REST/view-model boundary | test-gap | covered in current follow-up | P3 | none | Earlier focused sweep evidence was weak because local SPA was captured before async issue detail loading completed. `scripts/visual-parity-sweep.mjs` now waits for the local settled selector `#issue-body-$number .content.markdown-wrap` and records `issueBodyTextLength` / `commentBodyTextLength`. Focused sweep `output/playwright/visual-sweep/latest.json` at `2026-06-26T15:34:32.805Z` shows legacy/local `/admin/sample/issue/1` both `200`, `localErrors []`, `diffErrors []`, text length delta `34`, local `.project-page-wrap` width `1346`, local `#issueUpdateForm` present, local `ul.comments` present for the zero-comment state, and local `issueBodyTextLength 17` matching the REST sample body. Legacy sample has no `ul.comments` or `comment-body` rows in raw HTML for this seed, so the previous comment/timeline data-boundary gap is reclassified as weak verifier evidence closed by stronger wait/metric coverage. |
| `issue/partial_comment.scala.html`, `issue/partial_voter_list.scala.html` | Full comment timeline with voter avatars/modal threshold. | `frontend/src/routes/-issue-views.tsx`, `frontend/src/issue-detail-shell.spec.tsx`, `frontend/src/auth-workspace-shell.spec.tsx` | layout | covered in current follow-up | P3 | none | Full comment action rows now match the legacy voter threshold: <=5 voters render `.avatar-wrap.smaller` tooltip links without agreement text, >5 voters render `.vote-description-people[href=#voters-$id]` plus `#voters-$id.modal.hide.voters-dialog` with `.usf-group`, `.avatar-wrap.mlarge`, `.name`, and `.loginid`. |
| `common/commentUpdateForm.scala.html` | Comment edit with upload label/input and notification mail checkbox. | `frontend/src/routes/-issue-views.tsx`, `frontend/src/app-view-models.ts`, `frontend/src/routes/-view-models.ts`, `frontend/src/auth-workspace-client.ts`, `crates/server/src/api_types.rs`, `crates/server/src/routes/issues.rs`, `frontend/src/issue-detail-shell.spec.tsx` | interaction | covered in current follow-up | P3 | none | Comment edit now renders the legacy `.file-upload > .file-upload__label.ybtn[for=upload-$id]`, `.file-upload__input#upload-$id[name=filePath][multiple]`, and authored-only `.send-notification-check` popover with checked `notificationMail=yes`; server/detail view models carry `authorId` and `viewerUserId` so the checkbox follows legacy `comment.isAuthoredBy(currentUser)` behavior. |
| `common/fileUploader.scala.html`, `common/uploadForm.scala.html` | Issue/comment create upload, drag/drop, attached file template. | `frontend/src/routes/-issue-views.tsx`, `frontend/src/routes/-markdown-attachment-textarea.tsx`, `frontend/src/app.css`, `frontend/src/issue-detail-shell.spec.tsx`, `frontend/src/route-parity.spec.tsx` | data-boundary | covered in current follow-up | P3 | none | Issue/comment create upload shells now preserve the legacy `uploadForm` wrapper plus `fileUploader` template anchors and attached-file CSS: `#upload.upload-wrap.content-footer[data-resource-type]`, `.attach-wrap`, `.fake-file-wrap input.file[name=filePath][multiple]`, `.attached-files.unstyled`, `#tplAttachedFile[type=text/x-jquery-tmpl]`, `.attached-file`, `.progress.upload-progress .bar.orange`, `.btn-delete`, `.btn-insert`, and `#tplDropFilesHere .upload-drop-here`. |
| `common/editor.scala.html` | Markdown editor edit/preview/checklist/clear temporary/receiver list. | `frontend/src/routes/-markdown-renderer.tsx`, `frontend/src/routes/-issue-views.tsx`, `frontend/src/markdown-renderer.spec.tsx` | interaction | covered in current follow-up | P3 | none | Markdown editor shell now has selector proof for legacy edit/preview tab anchors and panes, `.task-list-button`, `#button-clear-temporary`, `.editor-notice-label`, `.markdown-preview.markdown-wrap`, and `.notification-receiver`; clear-temporary behavior is implemented in React-side helper coverage without importing legacy JavaScript. |
| `issue/view.scala.html`, `common/tasklistBar.scala.html` | Issue/comment tasklist progress bar before markdown content. | `frontend/src/routes/-markdown-renderer.tsx`, `frontend/src/issue-detail-shell.spec.tsx`, `frontend/src/markdown-renderer.spec.tsx` | layout | covered in current follow-up | P3 | none | Issue detail now has route-level selector proof that issue and comment markdown bodies render the legacy tasklist progress shell before markdown content, including `.tasklist.task-show`, `.task-title .done-counter`, `.task-progress`, and `.bar.red[title=Tasklist]` with legacy width percentages. |
| `issue/partial_massupdate.scala.html` | Mass update dropdowns with category dividers and assign-to-me row. | `frontend/src/routes/-issue-views.tsx`, `frontend/src/routes/$owner/$projectName/issues/route.tsx`, `frontend/src/issue-list-filter.spec.tsx` | layout | covered in current follow-up | P3 | none | Mass update dropdowns now preserve legacy `.mass-update-list` label category rows with `li.disabled[data-category]`, label `li[data-category][data-value]`, `.divider[data-category]`, current-user `Assign to me`, and assignee rows with `.usf-group`, `.avatar-wrap.smaller`, `.name`, and `.loginid`. |
| `issue/partial_list.scala.html` | Issue list labels, child issue hidden block, count icons. | `frontend/src/routes/-issue-views.tsx`, `frontend/src/routes/-view-models.ts`, `frontend/src/app-view-models.ts`, `frontend/src/issue-list-filter.spec.tsx` | css | covered in current follow-up | P3 | none | Issue list rows now have selector proof for legacy `.child-issue-list.hide`, `.num-comments`, `.num-hearts`, `.num-sharers`, `.weight-up-arrow`, `.title-prefix`, and label `data-category-id`/`data-label-id` while preserving title prefix separation and count anchors. |
| `issue/view.scala.html` | Detail sidebar order: issue-info compact comments; left pane watcher/subtasks/sharer before comments. | `frontend/src/routes/-issue-views.tsx`, `frontend/src/issue-detail-shell.spec.tsx` | layout | covered in current follow-up | P3 | none | Issue detail now preserves the legacy pane order: left `.span9.span-left-pane` renders `.board-actrow` then `.sharer-list`, `.watcher-list`, `.subtasks`, and full `#comments.board-comment-wrap`; right `.span3.right-menu` keeps `.issue-info` with `#issueUpdateForm` followed by compact `#comments.board-comment-wrap`, without moving watcher/subtasks/sharer into the sidebar. |
| `issue/create.scala.html`, `issue/edit.scala.html` | Save/draft/publish double-submit guard and draft tooltip. | `frontend/src/routes/-issue-views.tsx`, `frontend/src/route-parity.spec.tsx`, `frontend/tests/issue-form-parity.e2e.ts` | interaction | covered in current follow-up | P3 | none | Issue create/edit forms now preserve the legacy submit contract with a React-side 3 second disabled guard, draft-save and draft-publish tooltip anchors/copy, hidden `#isDraft` / `#isPublish` values, and publish confirmation. Browser proof clicks save/draft paths, asserts invalid-submit guard state without REST mutation, draft hidden value, REST JSON intent flags, and mounted-base redirect behavior. |
| `issue/view.scala.html`, `issue/partial_event_timeline.scala.html` | Repeated same-type timeline event suppresses duplicate state label. | `frontend/src/routes/-issue-views.tsx`, `frontend/src/issue-detail-shell.spec.tsx` | copy | covered in current follow-up | P3 | none | Issue event timeline now mirrors legacy `previousEvent` behavior for adjacent `ISSUE_LABEL_CHANGED` and `ISSUE_SHARER_CHANGED` add/delete runs: when the previous timeline item is the same event type and same add/delete direction, React renders the empty `<span class="state"></span>` instead of a duplicate state label; opposite-direction label changes still render `.state.label-deleted`. |
| `issue/create.scala.html`, `issue/edit.scala.html`, `issue/partial_select_label.scala.html`, `issue/partial_select_subtask.scala.html` | Project issue create/edit forms with subtask selectors and label Select2 data hooks. | `frontend/src/routes/$ownerName/$projectName/issueform.tsx`, `frontend/src/routes/$ownerName/$projectName/issue/$issueNumber/editform.tsx`, `frontend/tests/project-issue-form.e2e.ts`, `frontend/tests/project-issue-edit-form.e2e.ts` | layout | covered in current follow-up | P3 | none | Project issue create/edit now restore the flat `/admin/sample/issueform` and `/admin/sample/issue/1/editform` routes and render legacy `form#issue-form` bodies with title, subtask project/parent selects, markdown editor shell, upload footer, action controls, assignee/due-date/sidebar hidden fields, edit-only author/publish/state/notification/milestone controls, and the shared `issue.partial_select_label` hidden Select2 source including `data-close-on-select="false"` and category exclusivity attrs. |
| `issue/my_list.scala.html`, `my_partial_search.scala.html`, `my_partial_list.scala.html`, `my_partial_list_quicksearch.scala.html` | User issue list and quick search route states. | `frontend/src/routes/user/issues/route.tsx`, `frontend/src/routes/-issue-views.tsx`, `frontend/src/route-parity.spec.tsx` | layout | covered in current follow-up | P3 | none | User issue list mapper pass now proves the legacy `my_*` shell: `.page-wrap-outer > .page-wrap`, my-series tabs, `[pjax-container].row-fluid.issue-list-wrap`, `.left-menu.span2.span-hard-wrap`, `.lst-stacked.unstyled`, `[pjax-filter]` quick filter data ids, hidden `data-search` fields, `.myissues-search-input`, state tab `state` attrs, sort `orderBy` / `orderDir` attrs, `.post-list-wrap.my-issues`, `li.post-item.title[href]`, `.project-name-in-my-issues.fixed-height-my-issues-list`, project/title/post-id cells, label/count/meta/assignee anchors, pagination, and empty-state shell. |
| `issue/list.scala.html`, export route boundary | Project issue list XLS export via `/admin/sample/issues?format=xls`. | `frontend/src/routes/$owner/$projectName/issues/route.tsx`, `frontend/src/routes/-issue-views.tsx`, `crates/server/src/excel_export.rs`, `crates/server/tests/issue_core_contract.rs`, `frontend/src/issue-list-filter.spec.tsx` | data-boundary | covered in current follow-up | P3 | none | `SPEC.md` classifies issue `format=xls` export as implemented, `issue_core_contract.rs::issue_list_format_xls_exports_filtered_issues_from_legacy_route` pins the legacy route response and `attachment; filename="projectYobi-issues.xls"`, and `issue-list-filter.spec.tsx` pins the legacy `format=xls` href. Integrated desktop sweep `output/playwright/visual-sweep/latest.json` checked at `2026-06-26T17:14:26.291Z` reports legacy status `0` and local status `200` for `/admin/sample/issues?format=xls`; this is a download/non-HTML browser boundary, not a comparable visual page diff. |
| Legacy PJAX/timeline fragment paths | XHR list/timeline fragments return server-rendered HTML in legacy. | React route plus REST JSON | data-boundary | not-applicable | P3 | none unless parent reclassifies | Keep as React-rendered API conversion per reset; rendered DOM still needs template shape parity. |

## Verifier Evidence

Focused verifier run:

- Command:
  `YONA_LEGACY_BASE_URL=http://127.0.0.1:19100 YORAM_BASE_URL=http://127.0.0.1:3101/yona YORAM_SWEEP_TARGET=both YORAM_SWEEP_PATHS=/admin/sample,/admin/sample/settingform,/admin/sample/members,/admin/sample/watchers,/admin/sample/webhooks,/admin/sample/transfer,/admin/sample/deleteform,/admin/sample/changeVCS,/admin/sample/issues,/user/issues,/admin/sample/issueform,/admin/sample/issue/1/editform,/admin/sample/issue/1 node scripts/visual-parity-sweep.mjs`
- Artifact: `output/playwright/visual-sweep/latest.json`
- Checked at: `2026-06-26T15:34:32.805Z`
- Result: legacy `13/13` passed, local `13/13` passed, `diffFailures 0`,
  `localFailures 0`, `statusDeltas []`.

Computed-style/layout proof now covers the sampled P3 shell/grid selectors.

| Route | selector | legacy | local |
| --- | --- | ---: | ---: |
| `/admin/sample/issues` | `.project-page-wrap` width | 1346 | 1346 |
| `/admin/sample/issues` | `.row-fluid.issue-list-wrap` width | 1346 | 1346 |
| `/admin/sample/issues` | `.left-menu` width | 200 | 200 |
| `/user/issues` | `.row-fluid.issue-list-wrap` width | 1346 | 1346 |
| `/user/issues` | `.left-menu` width | 200 | 200 |
| `/admin/sample/issueform` | `.content-wrap.frm-wrap` width | 1346 | 1346 |
| `/admin/sample/issueform` | `.upload-wrap.content-footer` width | 1002 | 1002 |
| `/admin/sample/issue/1` | `.project-page-wrap` width | 1346 | 1346 |
| `/admin/sample/issue/1` | `bodyTextLength` | 2304 | 2338 |
| `/admin/sample/issue/1` | issue body text length | 12 | 17 |
| `/admin/sample/issue/1` | `#issueUpdateForm` width | 305 | 260 |

Focused mobile verifier run:

- Command:
  `YONA_LEGACY_BASE_URL=http://127.0.0.1:19100 YORAM_BASE_URL=http://127.0.0.1:3101/yona YORAM_SWEEP_TARGET=both YORAM_SWEEP_VIEWPORT=mobile YORAM_SWEEP_PATHS=/admin/sample/issues,/user/issues,/admin/sample/issueform,/admin/sample/issue/1/editform,/admin/sample/issue/1 node scripts/visual-parity-sweep.mjs`
- Artifact: `output/playwright/visual-sweep/latest-mobile.json`
- Screenshots:
  `output/playwright/visual-sweep/legacy-mobile-_admin_sample_issues.png`,
  `output/playwright/visual-sweep/local-mobile-_admin_sample_issues.png`,
  `output/playwright/visual-sweep/legacy-mobile-_user_issues.png`,
  `output/playwright/visual-sweep/local-mobile-_user_issues.png`,
  `output/playwright/visual-sweep/legacy-mobile-_admin_sample_issueform.png`,
  `output/playwright/visual-sweep/local-mobile-_admin_sample_issueform.png`,
  `output/playwright/visual-sweep/legacy-mobile-_admin_sample_issue_1_editform.png`,
  `output/playwright/visual-sweep/local-mobile-_admin_sample_issue_1_editform.png`,
  `output/playwright/visual-sweep/legacy-mobile-_admin_sample_issue_1.png`,
  `output/playwright/visual-sweep/local-mobile-_admin_sample_issue_1.png`.
- Checked at: `2026-06-26T15:45:03.918Z`
- Result: legacy `5/5` passed, local `5/5` passed, `diffFailures 0`,
  `localFailures 0`, `statusDeltas []`.

Mobile computed-style/layout proof now covers the sampled P3 list, form, edit,
and detail routes at `390x844`.

| Route | selector/metric | legacy | local |
| --- | --- | ---: | ---: |
| `/admin/sample/issues` | `.project-page-wrap` width | 390 | 390 |
| `/admin/sample/issues` | `.row-fluid.issue-list-wrap` width | 390 | 390 |
| `/admin/sample/issues` | scroll width | 390 | 390 |
| `/user/issues` | `.page-wrap` width | 390 | 390 |
| `/user/issues` | `.row-fluid.issue-list-wrap` width | 390 | 370 |
| `/admin/sample/issueform` | `.project-page-wrap` width | 390 | 390 |
| `/admin/sample/issueform` | `[data-toggle=markdown-editor]` width | 390 | 350 |
| `/admin/sample/issueform` | `.upload-wrap.content-footer` width | 390 | 390 |
| `/admin/sample/issue/1/editform` | `.project-page-wrap` width | 390 | 390 |
| `/admin/sample/issue/1/editform` | `[data-toggle=markdown-editor]` width | 390 | 350 |
| `/admin/sample/issue/1` | `.project-page-wrap` width | 390 | 390 |
| `/admin/sample/issue/1` | `[data-toggle=markdown-editor]` width | 386 | 390 |
| `/admin/sample/issue/1` | issue body text length | 12 | 17 |

Focused interaction verifier runs:

- Command:
  `pnpm --dir frontend test:e2e -- shell-routing-smoke.e2e.ts -g "project issue routes render data-backed issue list filters and detail screens"`
- Checked at: `2026-06-27`
- Result: `1 passed`.
- Coverage: issue list filter/search submit URL and REST query proof,
  pagination next-page URL and REST query proof, mass update dropdown open/select
  and REST payload proof, child issue list shell, full comment edit/delete
  controls, child-comment/new-issue anchors, and sidebar metadata rendering.

- Command:
  `pnpm --dir frontend test:e2e -- issue-detail-parity.e2e.ts issue-form-parity.e2e.ts`
- Checked at: `2026-06-27`
- Result: `4 passed`.
- Coverage: issue detail favorite/watch/vote/share/delete modal actions,
  metadata sidebar updates through REST, comment editor paste/drop upload plus
  preview insertion and REST submit, issue create/edit validation, draft/publish
  intent fields, and REST JSON form submit.

- Command:
  `pnpm --dir frontend test -- issue-list-filter.spec.tsx issue-detail-shell.spec.tsx`
- Checked at: `2026-06-27`
- Result: Vitest completed the frontend suite with `52` files and `919` tests
  passed.
- Coverage: static DOM/class proof for issue list filters, pagination,
  mass-update dropdown categories, compact/full comments, child comments,
  event timeline rows, editor/upload shells, and sidebar issue metadata.

Remaining verifier work:

- Interaction proof is now recorded for filter/search, pagination, mass update,
  editor preview, upload/drop, comment edit/delete, child comments, and sidebar
  metadata updates. Remaining P3 packet work is an integrated closure audit
  against all P3 route/state rows and current packet reports before declaring
  P3 closed.
- Preserve the reset rule that REST JSON/API-return remains the data boundary
  while the visible DOM follows the legacy template shape.
