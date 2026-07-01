# Template-First UI Parity Report: P4 Board/Milestone/Post

Status: current reset baseline
Date: 2026-06-27
Owner packet: P4 board/milestone/post
Mode: template-first mapper baseline; implementation evidence reviewed

## Scope

This report reopens board posting and milestone parity under
`docs/plans/2026-06-26-template-first-ui-parity-reset.md`.

The older `ui-parity-board-milestone.md` report remains useful worker evidence.
The integrated desktop sweep has four P4-owned status deltas, but they are
classified here as non-comparable legacy homelab sample-data states rather than
template output gaps.

## Legacy Template Call Graph

| Legacy source | Role | Required anchors |
| --- | --- | --- |
| `yona-original/app/views/board/list.scala.html`, `board/partial_list.scala.html` | Project board list, search, label filter, notices, sort, rows, pagination. | `.post-list.project-page-wrap`, `form#option_form`, `.search-bar`, `.board-labels select`, `.filter-wrap.board`, `.notice-wrap`, `.post-list-wrap`, `#pagination`, `.title-prefix`. |
| `board/create.scala.html`, `board/edit.scala.html` | Board post create/edit and online commit variant. | `.content-wrap.frm-wrap`, `form.nm`, `#title`, common editor, `.upload-wrap.content-footer[data-resource-type=BOARD_POST]`, `#notice`, `#readme`, hidden `#issueTemplate`, `#branch`, `#path`, `#lineEnding`, `.send-notification-check`. |
| `board/view.scala.html`, `board/partial_comments.scala.html` | Board detail, labels, body, tasklist, attachments, watch, history, comments, delete modal. | `.project-page-wrap.board-view`, `.board-header.issue`, `.board-id`, `.board-body.row-fluid`, `.span-left-pane`, `.span-right-pane`, `#post-body-$number`, `.attachments#attachments`, `#watch-button`, `.board-actrow`, `.issue-info.board-labels`, `#labelIds`, `#comments.board-comment-wrap`, `#deleteConfirm`. |
| `organization/group_board_list.scala.html`, `organization/group_board_list_partial.scala.html` | Organization board aggregate. | Organization header/menu, `#projects[name="projectNames[]"]`, `.textbox.group-board`, `.notice-wrap`, `.group-project-name`, `.post-list-wrap`, pagination controls. |
| `milestone/list.scala.html`, `milestone/partial_status.scala.html` | Milestone list, state tabs, sort, search, linked issue preview. | `.project-page-wrap`, `.tab-wrap`, `.nav.nav-tabs`, `.filter-wrap.milestone`, `.pull-left.search.search-bar`, `ul.milestones`, `li.milestone`, `.completion-rate`, `.progress .bar`, `.issue-link`, `.label.issue-label`. |
| `milestone/view.scala.html` | Milestone detail, progress, markdown, attachments, actions, linked issues. | `.milesion-wrap`, `h4 .title`, `.badge-issue-*`, `.milestone-desc`, `.attachments[data-attachments]`, `.actrow.right-txt`, `#issues`, `.nav.nav-tabs`, `issue.partial_massupdate`, `[data-toggle=item-search]`, `issue.partial_list`, `#deleteConfirm`. |
| `milestone/create.scala.html`, `milestone/edit.scala.html` | Milestone form. | `#milestone-form`, `.content-wrap.frm-wrap`, `#title`, common editor, `.upload-wrap.content-footer[data-resource-type=MILESTONE]`, `.issue-option`, `#milestone-open`, `#milestone-close`, `#dueDate`, `#datepicker`, field-adjacent `.message`. |

## Current React/CSS Targets

| Current source | Current responsibility |
| --- | --- |
| `frontend/src/routes/-board-views.tsx` | Project board post form, board detail, comments, labels, attachments, delete modal. |
| `frontend/src/routes/$ownerName/$projectName/posts.tsx` | Project board list flat route with legacy search, label filter, notice, sort, row, and pagination shell. |
| `frontend/src/routes/-milestone-views.tsx` | Milestone list, form, detail, linked issue list, mass update, validation, attachments. |
| `frontend/src/routes/$owner/$projectName/postform/route.tsx`, `post/$postNumber/**` | Remaining project board route entrypoints. |
| `frontend/src/routes/organizations/$organizationName/boards.tsx` | Organization board aggregate flat route entrypoint. |
| `frontend/src/routes/$owner/$projectName/milestones/route.tsx`, `newMilestoneForm/route.tsx`, `milestone/$milestoneId/**` | Milestone route entrypoints. |
| `frontend/src/app.css` | Shared legacy board/milestone shell, grid, form, modal, list styling. |
| `frontend/src/board-milestone-parity.spec.tsx` | Static selector and source-contract proof for board/milestone components. |
| `frontend/tests/project-posts.e2e.ts`, `frontend/tests/board-posting-parity.e2e.ts`, `frontend/tests/milestone-delete-modal-parity.e2e.ts` | Browser interaction proof for project board list, board post attachments/delete/labels, and milestone validation/delete/state actions. |

## Open Reset Queue Summary

Source comparison by P4 reset pass found implementation evidence for the
documented board/milestone rows. The integrated sweep status deltas are
recorded below as non-comparable sample-data states.

| status | count |
| --- | ---: |
| gap | 0 |
| deviation | 0 |
| weak evidence | 0 |
| covered | 9 |
| not-applicable | 5 |
| needs-parent-decision | 0 |

## Reset Findings

| legacy template | legacy route/state | current file | defect class | status | owner packet | proposed write scope | verification evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `board/list.scala.html`, `board/partial_list.scala.html` | Project board list `/admin/sample/posts` with search, label, notice, sort, title prefixes, empty state, pagination states. | `frontend/src/routes/$ownerName/$projectName/posts.tsx` | layout | covered in 2026-07-01 template-first reset slice | P4 | none | `frontend/tests/project-posts.e2e.ts` was RED against the missing flat board body, then GREEN after the `/admin/sample/posts` route rebuild and parent `<Outlet />` fix. It whole-screen compares project chrome, `#option_form`, `.board-labels select`, `.filter-wrap.board`, `.notice-wrap`, `.post-list-wrap`, row anchors, comment counts, label links, pagination shell, `help.keymap("boardList", project)`, the legacy `TemplateHelper.showHeaderWordsInBracketsIfExist` / `removeHeaderWords` title-prefix branch, and the `page.getTotalRowCount == 0 && notices.size == 0` `.error-wrap` branch against `board/list.scala.html` plus `board/partial_list.scala.html`. |
| `organization/group_board_list.scala.html`, `group_board_list_partial.scala.html` | Organization board aggregate `/organizations/:name/boards` with project filter, keyword search, page-1 notices, empty state, and normal rows. | `frontend/src/routes/organizations/$organizationName/boards.tsx` | layout | covered in 2026-07-01 template-first reset slice | P4 | none | `frontend/tests/organization-boards.e2e.ts` was RED against the missing child route rendering, then GREEN after the flat route rebuild and parent `<Outlet />` fix. It whole-screen compares `#projects[name="projectNames[]"]`, `.textbox.group-board`, `.two-column-icon`, `.notice-wrap`, `.group-project-name`, `.post-list-wrap`, `.error-wrap`, comment count links, and org chrome against `group_board_list.scala.html` plus `group_board_list_partial.scala.html`; `crates/server/tests/organization_board_contract.rs` now pins separate `notices` REST output with notice posts excluded from normal `items` / `totalCount`. |
| `board/create.scala.html`, `board/edit.scala.html` | Board create/edit forms, including online commit/readme/issue-template variants and no label picker. | `frontend/src/routes/-board-views.tsx`, `frontend/src/routes/$owner/$projectName/postform/route.tsx`, `post/$postNumber/editform/route.tsx` | layout | covered in current follow-up | P4 | none | `frontend/src/board-milestone-parity.spec.tsx` proves no `.board-label-picker`, legacy `BOARD_POST` uploader shell, title/editor/notice/readme hidden fields, and notification checkbox/source contract. |
| `board/view.scala.html`, `board/partial_comments.scala.html` | Board detail with body/tasklist/watch/delete modal and zero-comment timeline. | `frontend/src/routes/$ownerName/$projectName/post/$postNumber.tsx` | layout | covered in 2026-07-01 template-first reset slice | P4 | none | `frontend/tests/project-posts.e2e.ts` was RED against the missing flat `/admin/sample/post/3` route, then GREEN after adding the route. It compares the legacy `board/view.scala.html` page body for the zero-comment state, proving `.project-page-wrap.board-view`, `.board-header.issue`, author row, hidden content form, `#post-body-3` tasklist/body shell, `.attachments#attachments`, `#watch-button`, left/right edit/delete action controls, `.issue-info.board-labels` new-post action, empty `board/partial_comments.scala.html` timeline shell, `help.keymap("boardDetail", project)`, `#tplAttachedFile`, and `#deleteConfirm` delete-request URI through the REST/TanStack `readProjectPostQueryOptions` boundary. The same browser spec now covers the legacy read-only selected-label branch with `.label.issue-label.active.static[data-label-id]` links back to `/posts?labelIds=...`, the populated parent-comment branch with `.comment-avatar`, `.meta-info`, `.ago-date`, comment edit/delete controls, tasklist, `.comment-body.markdown-wrap`, and per-comment `.attachments[data-attachments]`, board post/comment `tplAttachedFile` `.attached-file` rows and `/files/:id` hrefs, active flat route watch/unwatch mutation through `#watch-button` POST/DELETE to `/api/v1/projects/admin/sample/posts/3/watch` with `data-watching` cache updates, active flat route delete through the legacy `#deleteConfirm` modal with No cancel, DELETE `/api/v1/projects/admin/sample/posts/3`, posts-list navigation, plus `common.commentUpdateForm` with update markdown editor tabs, upload drop shell, hidden temporary files, `NONISSUE_COMMENT` upload metadata, `common.childCommentsAnchorDiv`, `common.childComments`, and `common.child_commentForm` child-comment anchors, one-line child comments, hidden child author metadata, delete link, and reply form. |
| `board/view.scala.html`, `issue.partial_select_label` | Board detail label Select2 update/read-only states. | `frontend/src/routes/-board-views.tsx`, `frontend/src/routes/$ownerName/$projectName/post/$postNumber.tsx`, `frontend/src/api/boards.ts`, `crates/server/src/routes/boards.rs` | data-boundary | covered in current follow-up | P4 | none | React keeps legacy `#labelIds[data-toggle=select2][data-format=issuelabel]` and compatibility `data-request-uri`, while update calls canonical REST JSON `PATCH /api/v1/projects/:owner/:project/posts/:number/labels`; `frontend/tests/board-posting-parity.e2e.ts` covers browser mutation and returned DTO refresh. The active flat detail route renders the read-only selected-label branch, and `frontend/tests/project-posts.e2e.ts` compares the `.issue-info.board-labels` static label DOM against `issue.partial_show_selected_label`. |
| `board/view.scala.html`, `common.fileUploader`, comment partials | Board post/comment attachment metadata and visible rows. | `frontend/src/routes/-board-views.tsx`, `frontend/src/app.css`, board REST detail DTO | data-boundary | covered in current follow-up | P4 | none | `frontend/src/board-milestone-parity.spec.tsx` and `frontend/tests/board-posting-parity.e2e.ts` prove `.attachments[data-attachments]`, `.attached-file`, attached-file truncation/progress/action CSS, post/comment file ids, names, hrefs, and `NONISSUE_COMMENT` uploader shell from REST fixtures. |
| `milestone/list.scala.html`, `milestone/partial_status.scala.html` | Milestone list tabs, empty state, sort, search, counts, all-state metadata, progress, issue previews. | `frontend/src/routes/$ownerName/$projectName/milestones.tsx`, `frontend/tests/project-milestones.e2e.ts` | layout | covered in 2026-07-01 template-first reset slice | P4 | none | `frontend/tests/project-milestones.e2e.ts` renders `/admin/sample/milestones?state=open&orderBy=dueDate&orderDir=asc` and whole-body compares the legacy milestone list: state tabs, new milestone link, inactive/active sort links, `.pull-left.search.search-bar`, due-date/overdue copy, completion-rate text, progress bars, generated label category/id anchors, browser-parsed issue anchors, and client filtering of `.issue-link` rows. It also renders `/admin/sample/milestones?state=all&orderBy=dueDate&orderDir=asc` to compare the all-state open/closed `.state.nm.*` spans and the closed due-date `ml5` branch without relative date text. |
| `milestone/create.scala.html`, `milestone/edit.scala.html` | Milestone create/edit form, editor, uploader, state radios, due-date picker, field errors. | `frontend/src/routes/$ownerName/$projectName/milestone/$milestoneId/editform.tsx`, `frontend/tests/project-milestone-edit-form.e2e.ts` | interaction | covered in current follow-up | P4 | create-form flat route remains separate | `frontend/tests/project-milestone-edit-form.e2e.ts` renders `/admin/sample/milestone/5/editform` and compares the stable legacy `milestone/edit.scala.html` body, proving `#milestone-form`, title/editor field names, legacy `MILESTONE` uploader resource id, state radios, `#dueDate`, `#datepicker`, save/cancel actions, and REST/TanStack PATCH mutation boundary. |
| `milestone/view.scala.html`, `issue.partial_massupdate`, `issue.partial_list` | Milestone detail, markdown, attachments, actions, issue tabs, linked issue list, mass update. | `frontend/src/routes/$ownerName/$projectName/milestone/$milestoneId.tsx`, `frontend/tests/project-milestone-detail.e2e.ts` | interaction | covered in 2026-07-01 template-first reset slice | P4 | none | `frontend/tests/project-milestone-detail.e2e.ts` renders `/admin/sample/milestone/5?state=open` and verifies the legacy detail shell: `.milesion-wrap`, title/due-date/status/progress, `.milestone-desc .attachments[data-attachments]`, `.actrow.right-txt`, `#deleteConfirm`, close REST callback, `#issues .nav.nav-tabs`, `#mass-update-form`, `[data-toggle=item-search]`, `.post-list-wrap.row-fluid`, issue row selectors, label metadata/color, and delete modal REST boundary. |
| `board/view.scala.html` | Integrated sweep sample `/admin/sample/post/1`. | `frontend/src/routes/$owner/$projectName/post/$postNumber/route.tsx`, board detail REST/view-model boundary | data-boundary | not-applicable | P4 | none unless parent replaces the homelab seed with comparable legacy data. | Integrated desktop sweep `output/playwright/visual-sweep/latest.json` checked at `2026-06-26T17:14:26.291Z` reports legacy status `404` and local status `200`. This legacy homelab sample did not render a comparable post detail document, so the status delta is not visual closure evidence and not a template parity gap; board detail UI remains covered by the dedicated `board/view.scala.html` row above. |
| `board/edit.scala.html` | Integrated sweep sample `/admin/sample/post/1/editform`. | `frontend/src/routes/$owner/$projectName/post/$postNumber/editform/route.tsx`, board edit REST/view-model boundary | data-boundary | not-applicable | P4 | none unless parent replaces the homelab seed with comparable legacy data. | Integrated desktop sweep reports legacy status `500` and local status `200`. The legacy reference is an error state for this seed, not a comparable edit-form rendering; board form parity remains covered by static and browser evidence above. |
| `milestone/view.scala.html` | Integrated sweep sample `/admin/sample/milestone/1`. | `frontend/src/routes/$owner/$projectName/milestone/$milestoneId/route.tsx`, milestone detail REST/view-model boundary | data-boundary | not-applicable | P4 | none unless parent replaces the homelab seed with comparable legacy data. | Integrated desktop sweep reports legacy status `404` and local status `200`. The legacy homelab seed has no comparable milestone detail document, so this status delta is classified as a sample-data mismatch; milestone detail UI remains covered by the dedicated row above. |
| `milestone/edit.scala.html` | Integrated sweep sample `/admin/sample/milestone/1/editform`. | `frontend/src/routes/$owner/$projectName/milestone/$milestoneId/editform/route.tsx`, milestone edit REST/view-model boundary | data-boundary | not-applicable | P4 | none unless parent replaces the homelab seed with comparable legacy data. | Integrated desktop sweep reports legacy status `404` and local status `200`. The legacy homelab seed has no comparable milestone edit-form document, so this status delta is classified as a sample-data mismatch; milestone form parity remains covered by static and browser evidence above. |

## Verifier Evidence

Static/component proof:

- `frontend/src/board-milestone-parity.spec.tsx`
- `frontend/src/issue-board-pr-milestone-i18n.spec.tsx`
- `frontend/src/site-admin-route-parity.spec.tsx` for site-admin post list row reuse.

Browser interaction proof:

- `frontend/tests/board-posting-parity.e2e.ts`
- `frontend/tests/milestone-delete-modal-parity.e2e.ts`
- `frontend/tests/organization-boards.e2e.ts`
- `frontend/tests/project-posts.e2e.ts`

Integrated browser sweep evidence:

- Command from parent plan:
  `YONA_LEGACY_BASE_URL=http://127.0.0.1:19100 YORAM_BASE_URL=http://127.0.0.1:3101/yona YORAM_SWEEP_TARGET=both node scripts/visual-parity-sweep.mjs`
- Artifact: `output/playwright/visual-sweep/latest.json`
- Checked at: `2026-06-26T17:14:26.291Z`
- Result: overall legacy `93/96`, local `174/174`, local direct API surfaces
  `13/13`, `diffFailures 0`, `localFailures 0`, with four P4 status deltas
  listed above.

P4 has no remaining `needs-parent-decision` rows. The integrated sweep deltas
above are classified as non-comparable legacy homelab sample-data states, not as
P4 template output gaps.
