# UI Parity Report: Board / Milestone

Status: explorer report
Date: 2026-06-26
Packet: `ui-parity-board-milestone`
Agent: `019effaa-8a27-7321-aaec-e27b7371880f` (`Archimedes`)
Mode: read-only audit, no files edited by the explorer

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
| board create/edit label picker | Legacy create/edit templates do not render a board label picker. | `ProjectPostFormPage` adds `.board-label-picker` checkbox UI. | deviation | `frontend/src/routes/-board-views.tsx`, board posting parity tests |
| board create/edit attachment picker shell | Legacy uses `common.fileUploader(ResourceType.BOARD_POST, ...)`. | Paste/drop upload exists, but no legacy file uploader/drop shell. | gap | `frontend/src/routes/-board-views.tsx`, focused board form Playwright coverage |
| board detail history/watch/comments/child comments | Legacy renders history modal, watch button, comments, child comments, parentCommentId. | `ProjectBoardDetailPage` renders these shells. | covered | none |
| board detail delete confirmation | Legacy delete opens `#deleteConfirm`; only modal confirm deletes. | Trigger has `href="#deleteConfirm"` but no modal; delete calls directly. | gap | `frontend/src/routes/-board-views.tsx`, board posting e2e |
| board detail labels | Legacy updateable detail uses label Select2; readonly detail shows selected labels. | Current always renders static `boardLabels`; no updateable mutation shell. | gap | `frontend/src/routes/-board-views.tsx`, board label mutation route integration |
| board post/comment attachments | Legacy detail/comment containers include serialized attachment data. | Current renders empty `.attachments` containers and does not project attachments into data/visible rows. | gap | `frontend/src/routes/-board-views.tsx`, focused attachment rendering test |
| milestone list tabs/empty/progress/counts | Legacy open/closed/all tabs, empty state, counts, completion, progress. | `ProjectMilestoneListPage` renders tabs, empty state, counts, completion and progress. | covered | none |
| milestone list sort links | Legacy inactive sort links use `orderDir=asc`; active links toggle asc/desc. | `sortHref` returns `desc` for inactive fields. | gap | `frontend/src/routes/-milestone-views.tsx`, route parity spec |
| milestone list search | Legacy `.textbox` keyup filters `.issue-link` rows client-side. | Search input renders but has no filtering interaction. | gap | `frontend/src/routes/-milestone-views.tsx`, focused Playwright scenario |
| milestone due-date relative/overdue display | Legacy renders `milestone.until` and overdue class. | Current renders only `dueDateLabel`; no `until` text or overdue class is available. | gap | milestone REST projection plus `frontend/src/routes/-milestone-views.tsx` |
| milestone form validation shell | Legacy field errors render beside fields with input `.error` and `.message`. | Current uses bottom `.alert.alert-error`. | gap | `frontend/src/routes/-milestone-views.tsx`, focused form validation test |
| milestone form attachments | Legacy uses `common.fileUploader(ResourceType.MILESTONE, ...)`. | Paste/drop upload exists, but no legacy file uploader/drop shell. | gap | `frontend/src/routes/-milestone-views.tsx`, focused attachment coverage |
| milestone detail actions/delete modal | Legacy list/edit/delete/open/close plus `#deleteConfirm` modal. | Current renders action links and delete modal with legacy request attrs. | covered | none |
| milestone detail attachments | Legacy `.attachments` carries serialized attachment data. | Current detail hard-codes `data-attachments="[]"`. | gap | `frontend/src/routes/-milestone-views.tsx`, focused attachment rendering test |
| milestone linked issue tabs/list | Legacy uses issue tabs, mass update, and `issue.partial_list` rows. | Current renders tabs/counts but simplified `.issue-link` rows without mass-update/list controls. | gap | `frontend/src/routes/-milestone-views.tsx`, possibly shared issue-list row component |
| milestone issue search | Legacy `data-toggle="item-search"` filters `.issue-item`. | Search input renders but filtering behavior is not wired. | gap | `frontend/src/routes/-milestone-views.tsx`, focused Playwright scenario |

## Playwright Scenario Rows

| path | state | legacy selector/copy | Rust selector/copy | interaction | API/direct boundary | status |
| --- | --- | --- | --- | --- | --- | --- |
| `/:owner/:project/posts?filter=x&labelIds[]=7&orderBy=numOfComments&pageNum=2` | populated board list | `#option_form`, `.board-labels select`, `.filter-wrap.board`, `.notice-wrap`, `#pagination input[name=pageNum]` | same selectors in `ProjectBoardListPage` | search, label, sort, page | React route consumes posts REST list | covered |
| `/organizations/:name/boards?projectNames[]=p&filter=x` | populated organization aggregate | `#projects[name="projectNames[]"]`, `.textbox.group-board`, `.group-project-name` | same selectors in `OrganizationBoardListPage` | project selector, keyword, sort | organization boards REST list | covered |
| `/:owner/:project/postform` | create form labels | Legacy create form has no label fieldset | `.board-label-picker` checkboxes | inspect create form | REST create includes `labelIds` | deviation |
| `/:owner/:project/postform` | attachments | `common.fileUploader(ResourceType.BOARD_POST, null)` visible shell | paste/drop works, no legacy shell | paste image, inspect uploader | `/files` upload then REST create | gap |
| `/:owner/:project/post/:number` | delete action | trigger plus modal `#deleteConfirm` | trigger exists, modal absent, direct delete callback | click delete icon | REST DELETE fires from trigger | gap |
| `/:owner/:project/post/:number` | labels | updateable label selector | static labels only | inspect sidebar | label update API not reachable | gap |
| `/:owner/:project/post/:number` | attachments | `.attachments[data-attachments=...]` | empty containers | inspect metadata/rows | REST detail has arrays | gap |
| `/:owner/:project/milestones?state=open` | list/progress | `.nav.nav-tabs`, empty state, `.completion-rate`, `.progress .bar` | same selectors | switch states | milestones REST list | covered |
| `/:owner/:project/milestones` | search | `.textbox` keyup filters rows | input has no keyup filtering | type title | client-only behavior | gap |
| `/:owner/:project/newMilestoneForm` | invalid submit | field-level `.error` and `.message` | bottom alert only | submit invalid | React validation before REST POST | gap |
| `/:owner/:project/milestone/:id` | actions | `.actrow .ybtn`, `#deleteConfirm`, open/close | same selectors | modal, close/reopen | REST state/delete callbacks | covered |
| `/:owner/:project/milestone/:id#issues` | linked issues | tabs plus mass update and issue partial list rows | simplified `.issue-link` rows | switch tabs | REST detail issue arrays | gap |

