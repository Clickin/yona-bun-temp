# UI Parity Report: Board / Milestone

Status: worker-updated report
Date: 2026-06-26
Packet: `ui-parity-board-milestone`
Agent: `019effaa-8a27-7321-aaec-e27b7371880f` (`Archimedes`)
Mode: read-only audit, no files edited by the explorer

Worker update, 2026-06-26:

- `ui-worker-board-milestone` removed the non-legacy board create/edit label
  picker, restored legacy board/milestone file uploader shells, moved board
  delete through `#deleteConfirm`, projected board/milestone attachment metadata
  into legacy `.attachments` / `.attached-file` containers when the current DTO
  carries attachment rows, rendered the updateable board detail label Select2
  shell, fixed milestone inactive sort links, wired milestone list/detail
  client-side issue filtering, and moved milestone validation to field-adjacent
  `.error` / `.message` markup.
- Former board label mutation parity was tracked as a bounded REST/API gap:
  legacy uses `BoardApi.updatePostLabel` from the detail Select2 change handler.
- Worker update, Wave 4: board detail label mutation is now covered through
  canonical REST JSON. The React detail route keeps the legacy Select2 shell and
  `data-request-uri` evidence, but the change handler calls
  `PATCH /api/v1/projects/:owner/:project/posts/:number/labels`, updates the
  cached post detail from the returned DTO, and invalidates project API queries.
  The legacy compatibility `/-_-api/v1/.../postlabel/:number` route remains
  evidence/compatibility only for the React-visible flow.
- Remaining milestone due-date relative/overdue and linked issue partial-list
  parity are reclassified as projection/shared-component gaps: current
  milestone REST reduces milestone reads/lists to `ProjectMilestoneSummary`, so
  runtime responses do not yet carry `untilLabel` / `dueDateOverdue`, full
  milestone body/attachments, or the richer issue-list fields needed to reuse
  legacy `issue.partial_list` and `partial_massupdate` behavior end to end.

## Evidence Checked

Legacy evidence:

- `yona-original/app/views/board/list.scala.html`
- `yona-original/app/views/board/create.scala.html`
- `yona-original/app/views/board/edit.scala.html`
- `yona-original/app/views/board/view.scala.html`
- `yona-original/app/views/board/partial_comments.scala.html`
- `yona-original/app/views/board/partial_list.scala.html`
- `yona-original/app/views/organization/group_board_list.scala.html`
- `yona-original/app/views/milestone/list.scala.html`
- `yona-original/app/views/milestone/view.scala.html`
- `yona-original/app/views/milestone/create.scala.html`
- `yona-original/app/views/milestone/edit.scala.html`
- `yona-original/app/views/milestone/partial_status.scala.html`

Current evidence:

- `frontend/src/routes/-board-views.tsx`
- `frontend/src/routes/-milestone-views.tsx`
- `frontend/src/route-parity.spec.tsx`
- `frontend/tests/board-posting-parity.e2e.ts`
- `frontend/tests/shell-routing-smoke.e2e.ts`

## Result Table

| path | legacy evidence | current evidence | status | proposed owner |
| --- | --- | --- | --- | --- |
| `/:owner/:project/posts` | Board list search form, label select, sort links, notice wrap, empty state, pagination shell. | `ProjectBoardListPage`, `PostRows`, `BoardSortLinks`, `BoardPagination` preserve anchors and copy. | covered | none |
| `/organizations/:name/boards` | Organization board aggregate with project multiselect, keyword search, sort, pagination, cross-project rows. | `OrganizationBoardListPage` preserves organization header/menu and aggregate controls. | covered | none |
| `/organizations/:name/boards` notice pinning | Legacy template has optional notice-wrap, but provenance records org aggregation as no separate notice pinning. | Contract pins no separate org notice pinning. | not-applicable | none |
| board create/edit notice/readme/online commit controls | Legacy form renders notice/readme/issue-template/branch/path/line-ending/file uploader/notification controls. | `ProjectPostFormPage` renders those controls and hides notice/readme for online commit contexts. | covered | none |
| board create/edit label picker | Legacy create/edit templates do not render a board label picker. | `ProjectPostFormPage` no longer renders `.board-label-picker`; edit submit preserves existing labels without exposing a non-legacy form control. | covered | `frontend/src/routes/-board-views.tsx`, `frontend/src/board-milestone-parity.spec.tsx`, `frontend/tests/board-posting-parity.e2e.ts` |
| board create/edit attachment picker shell | Legacy uses `common.fileUploader(ResourceType.BOARD_POST, ...)`. | `ProjectPostFormPage` renders `.upload-wrap.content-footer[data-resource-type="BOARD_POST"]` while preserving paste/drop REST upload insertion. | covered | `frontend/src/routes/-board-views.tsx`, `frontend/src/board-milestone-parity.spec.tsx`, `frontend/tests/board-posting-parity.e2e.ts` |
| board detail history/watch/comments/child comments | Legacy renders history modal, watch button, comments, child comments, parentCommentId. | `ProjectBoardDetailPage` renders these shells. | covered | none |
| board detail delete confirmation | Legacy delete opens `#deleteConfirm`; only modal confirm deletes. | `ProjectBoardDetailPage` renders `#deleteConfirm` with `post.delete.confirm`; delete REST callback runs from the modal Yes button. | covered | `frontend/src/routes/-board-views.tsx`, `frontend/src/board-milestone-parity.spec.tsx`, `frontend/tests/board-posting-parity.e2e.ts` |
| board detail labels | Legacy updateable detail uses label Select2 and posts the selected label id array to `BoardApi.updatePostLabel`; readonly detail shows selected labels. | React renders the updateable `#labelIds[data-toggle=select2][data-format=issuelabel]` shell and readonly selected-label shell, keeps the legacy direct `data-request-uri`, and now wires changes through canonical REST JSON `PATCH /api/v1/projects/:owner/:project/posts/:number/labels` with returned detail DTO/cache refresh. | covered | `frontend/src/api/boards.ts`, `frontend/src/routes/-board-views.tsx`, `frontend/src/routes/$owner/$projectName/post/$postNumber/route.tsx`, `crates/server/src/routes/boards.rs`, `crates/server/tests/board_contract.rs`, `frontend/src/api-query.spec.ts`, `frontend/tests/board-posting-parity.e2e.ts` |
| board post/comment attachments | Legacy detail/comment containers include serialized attachment data. | `ProjectBoardDetailPage` serializes current DTO attachments into `.attachments[data-attachments]` and visible `.attached-file` rows for posts, comments, and child comments; backend already projects board post/comment attachments. | covered | `frontend/src/routes/-board-views.tsx`, `frontend/src/board-milestone-parity.spec.tsx` |
| milestone list tabs/empty/progress/counts | Legacy open/closed/all tabs, empty state, counts, completion, progress. | `ProjectMilestoneListPage` renders tabs, empty state, counts, completion and progress. | covered | none |
| milestone list sort links | Legacy inactive sort links use `orderDir=asc`; active links toggle asc/desc. | `sortHref` now uses `orderDir=asc` for inactive fields and toggles only the active field. | covered | `frontend/src/routes/-milestone-views.tsx`, `frontend/src/board-milestone-parity.spec.tsx` |
| milestone list search | Legacy `.textbox` keyup filters `.issue-link` rows client-side. | `ProjectMilestoneListPage` now keeps React filter state and hides non-matching `.issue-link` rows client-side. | covered | `frontend/src/routes/-milestone-views.tsx`, `frontend/src/board-milestone-parity.spec.tsx` |
| milestone due-date relative/overdue display | Legacy renders `milestone.until` and overdue class. | React renders `untilLabel` and `.due-date.over` when supplied, but runtime REST does not yet project those fields from milestone records. | gap, reclassified | next milestone API owner: `crates/server/src/routes/projects/milestones.rs`, `crates/server/src/api_types.rs`, `frontend/src/app-view-models.ts`, focused milestone REST contract |
| milestone form validation shell | Legacy field errors render beside fields with input `.error` and `.message`. | `ProjectMilestoneFormPage` now attaches `.error` and `.message` beside title/content/due-date fields. | covered | `frontend/src/routes/-milestone-views.tsx`, `frontend/src/board-milestone-parity.spec.tsx` |
| milestone form attachments | Legacy uses `common.fileUploader(ResourceType.MILESTONE, ...)`. | `ProjectMilestoneFormPage` renders `.upload-wrap.content-footer[data-resource-type="MILESTONE"]` while preserving REST upload insertion. | covered | `frontend/src/routes/-milestone-views.tsx`, `frontend/src/board-milestone-parity.spec.tsx` |
| milestone detail actions/delete modal | Legacy list/edit/delete/open/close plus `#deleteConfirm` modal. | Current renders action links and delete modal with legacy request attrs. | covered | none |
| milestone detail attachments | Legacy `.attachments` carries serialized attachment data. | React serializes milestone DTO attachments into `.attachments[data-attachments]` and visible `.attached-file` rows when the detail DTO carries attachment rows; runtime REST still needs the richer milestone projection noted above. | gap, reclassified | next milestone API owner: `crates/server/src/routes/projects/milestones.rs`, `crates/server/src/api_types.rs`, focused milestone REST contract |
| milestone linked issue tabs/list | Legacy uses issue tabs, mass update, and `issue.partial_list` rows. | React now renders the legacy mass-update shell and client search behavior, but rows remain simplified because milestone DTOs do not carry the full issue-list projection needed for `issue.partial_list` parity. | gap, reclassified | next shared owner: milestone REST projection plus issue-list row/shared component owner |
| milestone issue search | Legacy `data-toggle="item-search"` filters `.issue-item`. | `ProjectMilestoneDetailPage` now filters rendered issue links through React state from the legacy search input. | covered | `frontend/src/routes/-milestone-views.tsx`, `frontend/src/board-milestone-parity.spec.tsx` |

## Playwright Scenario Rows

| path | state | legacy selector/copy | Rust selector/copy | interaction | API/direct boundary | status |
| --- | --- | --- | --- | --- | --- | --- |
| `/:owner/:project/posts?filter=x&labelIds[]=7&orderBy=numOfComments&pageNum=2` | populated board list | `#option_form`, `.board-labels select`, `.filter-wrap.board`, `.notice-wrap`, `#pagination input[name=pageNum]` | same selectors in `ProjectBoardListPage` | search, label, sort, page | React route consumes posts REST list | covered |
| `/organizations/:name/boards?projectNames[]=p&filter=x` | populated organization aggregate | `#projects[name="projectNames[]"]`, `.textbox.group-board`, `.group-project-name` | same selectors in `OrganizationBoardListPage` | project selector, keyword, sort | organization boards REST list | covered |
| `/:owner/:project/postform` | create form labels | Legacy create form has no label fieldset | no `.board-label-picker`; edit preserves existing labels without visible form control | inspect create form | REST create/update still accepts `labelIds` but React form does not expose non-legacy picker | covered |
| `/:owner/:project/postform` | attachments | `common.fileUploader(ResourceType.BOARD_POST, null)` visible shell | same `.upload-wrap.content-footer[data-resource-type=BOARD_POST]` shell plus paste/drop upload | paste image, inspect uploader | `/files` upload then REST create | covered |
| `/:owner/:project/post/:number` | delete action | trigger plus modal `#deleteConfirm` | trigger opens modal; modal Yes fires REST delete | click delete icon, then Yes | REST DELETE fires from modal confirm | covered |
| `/:owner/:project/post/:number` | labels | updateable label selector posts selected ids as JSON | updateable Select2 shell rendered; change handler calls canonical REST label mutation and refreshes returned detail | inspect sidebar and change selector | React route uses `/api/v1/projects/:owner/:project/posts/:number/labels`; legacy direct route remains evidence/compatibility | covered |
| `/:owner/:project/post/:number` | attachments | `.attachments[data-attachments=...]` | current DTO attachments serialized and visible as `.attached-file` rows | inspect metadata/rows | REST detail has arrays | covered |
| `/:owner/:project/milestones?state=open` | list/progress | `.nav.nav-tabs`, empty state, `.completion-rate`, `.progress .bar` | same selectors | switch states | milestones REST list | covered |
| `/:owner/:project/milestones` | search | `.textbox` keyup filters rows | React keyup/change filters non-matching `.issue-link` rows | type title | client-only behavior | covered |
| `/:owner/:project/newMilestoneForm` | invalid submit | field-level `.error` and `.message` | field-adjacent `.error` and `.message` source/rendering | submit invalid | React validation before REST POST | covered |
| `/:owner/:project/milestone/:id` | actions | `.actrow .ybtn`, `#deleteConfirm`, open/close | same selectors | modal, close/reopen | REST state/delete callbacks | covered |
| `/:owner/:project/milestone/:id#issues` | linked issues | tabs plus mass update and issue partial list rows | tabs, search, and mass-update shell present; full issue partial-list rows need richer DTO/shared component | switch tabs/search | REST detail issue arrays | gap, reclassified |
