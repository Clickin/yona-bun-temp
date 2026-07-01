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
- Worker update, Wave 5: project milestone REST/RPC no longer reduces project
  milestone reads/lists/mutations to `ProjectMilestoneSummary`. Runtime
  responses now carry the richer `IssueMilestone` projection, including
  `untilLabel`, `dueDateOverdue`, body markdown, attachment rows, markdown
  references, and open/closed `ProjectIssueListItem` rows. React milestone
  detail renders those linked issues with the legacy `issue.partial_list`
  `post-list-wrap` / `post-item` / checkbox / author / count / assignee /
  due-date selectors. Current follow-up restores the legacy milestone detail
  mass-update dropdown option population for state, assignee, milestone,
  attach-label, and detach-label controls, keeps the linked issue checkbox
  selection behavior in React, and routes dropdown mutations through the shared
  issue mass-update REST boundary before reloading milestone detail data.
- Worker update, browser-proof refinement: focused Playwright coverage now
  verifies board post/comment attachment DTO metadata as legacy
  `.attachments[data-attachments]` plus visible `.attached-file` rows,
  milestone attachment metadata/rows, invalid milestone create submit
  field-adjacent validation with no REST POST, and milestone close/reopen
  buttons issuing REST JSON callbacks before rendering the returned open/closed
  state.
- Worker update, 2026-06-27 layout follow-up: project milestone list shell
  ownership moved into `frontend/src/routes/$owner/$projectName/route.tsx` for
  `/milestones`, keeping the milestone menu active and rendering
  `ProjectMilestoneListPage` through the TanStack Router `<Outlet />`.
  `ProjectMilestoneListPage` now supports `renderShell={false}` while retaining
  the legacy label stylesheet link and list markup. Verification:
  `pnpm --dir frontend exec tsc --noEmit`; `pnpm --dir frontend exec vitest run
  src/board-milestone-parity.spec.tsx`.
- Worker update, 2026-06-27 milestone form layout follow-up: project milestone
  create/edit shell ownership moved into
  `frontend/src/routes/$owner/$projectName/route.tsx` for `/newMilestoneForm`
  and `/milestone/:milestoneId/editform`, keeping the milestone menu active.
  `ProjectMilestoneFormPage` now supports `renderShell={false}` while retaining
  the existing form and REST submit boundaries. Verification:
  `pnpm --dir frontend exec tsc --noEmit`; `pnpm --dir frontend exec vitest run
  src/board-milestone-parity.spec.tsx`.
- Worker update, 2026-06-27 milestone detail layout follow-up: project
  milestone detail shell ownership moved into
  `frontend/src/routes/$owner/$projectName/route.tsx` for
  `/milestone/:milestoneId`, keeping the milestone menu active.
  `ProjectMilestoneDetailPage` now supports `renderShell={false}` while
  retaining the legacy label stylesheet, `milesion-wrap` body, issue
  mass-update controls, and delete modal. Verification:
  `pnpm --dir frontend exec tsc --noEmit`; `pnpm --dir frontend exec vitest run
  src/board-milestone-parity.spec.tsx`.
- Worker update, 2026-06-27 board list layout follow-up: project board list
  shell ownership moved into
  `frontend/src/routes/$owner/$projectName/route.tsx` for `/posts`, keeping the
  board menu active, the board list keymap mode, and the `board-page` shell CSS
  hook. `ProjectBoardListPage` now supports `renderShell={false}` while
  retaining the legacy `post-list project-page-wrap`, `#option_form`, label
  selector, notice rows, and pagination body. Verification:
  `pnpm --dir frontend exec tsc --noEmit`; `pnpm --dir frontend exec vitest run
  src/board-milestone-parity.spec.tsx`.
- Worker update, 2026-06-27 board form layout follow-up: project board
  create/edit shell ownership moved into
  `frontend/src/routes/$owner/$projectName/route.tsx` for `/postform` and
  `/post/:postNumber/editform`, keeping the board menu active and the
  `board-page` shell CSS hook. `ProjectPostFormPage` now supports
  `renderShell={false}` while retaining the legacy `project-page-wrap`,
  `.board-form`, markdown editor, uploader, notice/readme, and submit/cancel
  body. Verification: `pnpm --dir frontend exec tsc --noEmit`;
  `pnpm --dir frontend exec vitest run src/board-milestone-parity.spec.tsx`.
- Worker update, 2026-06-27 board detail layout follow-up: project board detail
  shell ownership moved into
  `frontend/src/routes/$owner/$projectName/route.tsx` for
  `/post/:postNumber`, keeping the board menu active, detail keymap mode, and
  the `board-page` shell CSS hook. `ProjectBoardDetailPage` now supports
  `renderShell={false}` while retaining the legacy `project-page-wrap
  board-view`, comments, labels, attachment metadata, action buttons, and
  delete modal. Verification: `pnpm --dir frontend exec tsc --noEmit`;
  `pnpm --dir frontend exec vitest run src/board-milestone-parity.spec.tsx`.
- Worker update, 2026-06-27 board detail browser parity follow-up: the detail
  route now reads TanStack Router state for edit/detail mode so SPA navigation
  from `/post/:postNumber/editform` back to `/post/:postNumber` renders the
  legacy detail view without a reload. Board comment edit forms preserve the
  legacy hidden `.comment-update-form` default while applying the active
  `display:block` override, transparent icon action buttons retain a 20px
  browser hit area, and the nested organization board E2E fixture includes the
  parent organization container. Verification: `pnpm --dir frontend test`;
  `pnpm --dir frontend exec tsc --noEmit`; `pnpm --dir frontend test:e2e --
  board-posting-parity.e2e.ts`.
- Worker update, 2026-07-01 flat route rebuild: project board list parity now
  lives in `frontend/src/routes/$ownerName/$projectName/posts.tsx` and reuses
  the shared project header/menu from the project home route. The parent
  `/$ownerName/$projectName` route yields child routes through `<Outlet />`
  instead of always rendering the home body, so `/posts` mounts the board list
  body with active board menu. Verification: `pnpm --dir frontend check`;
  `pnpm --dir frontend test:e2e -- project-posts.e2e.ts`.
- Worker update, 2026-07-01 board list label selector follow-up: project board
  list now renders the shared legacy `issue.partial_select_label` shape inside
  `.board-labels`, including `dl/dt/dd`, manager label-edit link, hidden
  Select2 source attributes, empty option, category optgroup, and category
  metadata. Verification: `pnpm --dir frontend test:e2e --
  project-posts.e2e.ts`.
- Worker update, 2026-07-01 board list title-prefix follow-up: project board
  list rows now apply the legacy `TemplateHelper.showHeaderWordsInBracketsIfExist`
  and `removeHeaderWords` behavior from `board/partial_list.scala.html`, rendering
  bracketed leading title words as `.title-prefix[href="javascript:void(0)"]`
  before the stripped title link. Verification: `pnpm --dir frontend test:e2e
  -- project-posts.e2e.ts`.
- Worker update, 2026-07-01 board list keymap follow-up: project board list
  now restores the `board/list.scala.html` `help.keymap("boardList", project)`
  caller under `.post-list.project-page-wrap`, including the trigger, `#helpKeys`
  modal, Posting List shortcuts, project/site shortcut columns, Git pull-request
  shortcut, manager setting shortcut, and Mac/non-Mac modifier behavior.
  Verification: `pnpm --dir frontend test:e2e -- project-posts.e2e.ts`.

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
- `frontend/tests/project-posts.e2e.ts`
- `frontend/tests/milestone-delete-modal-parity.e2e.ts`
- `frontend/tests/shell-routing-smoke.e2e.ts`

## Route Inventory Summary

Total rows: 20

| status | count |
| --- | ---: |
| covered | 19 |
| gap | 0 |
| deviation | 0 |
| deferred | 0 |
| not-applicable | 1 |
| weak evidence | 0 |
| needs-parent-decision | 0 |

## Result Inventory

| path | legacy evidence | current evidence | status | proposed owner |
| --- | --- | --- | --- | --- |
| `/:owner/:project/posts` | Board list search form, shared `issue.partial_select_label` label selector, sort links, notice wrap, title-prefix branch, empty state, pagination shell. | `frontend/src/routes/$ownerName/$projectName/posts.tsx` renders project header/menu, legacy `post-list project-page-wrap`, `#option_form`, `.board-labels` with the shared label `dl/dt/dd` + Select2 source attributes/optgroups, notice rows, sort links, row anchors, comment counts, `TemplateHelper.showHeaderWordsInBracketsIfExist` / `removeHeaderWords` title-prefix output, and pagination shell from REST board list/form-option data. | covered | `frontend/src/routes/$ownerName/$projectName/posts.tsx`, `frontend/tests/project-posts.e2e.ts` |
| `/organizations/:name/boards` | Organization board aggregate with project multiselect, keyword search, sort, pagination, optional page-1 notice wrap, and cross-project rows. | `OrganizationBoardListPage` preserves organization header/menu and aggregate controls. Organization board REST now returns `notices`, keeps notice posts out of normal `items` / `totalCount`, and renders page-1 notices in `.post-list-wrap.notice-wrap` before normal rows. | covered | `frontend/src/routes/organizations/$organizationName/boards.tsx`, `frontend/tests/organization-boards.e2e.ts`, `crates/server/src/routes/boards.rs`, `crates/persistence/src/repo/posting.rs`, `crates/server/tests/organization_board_contract.rs` |
| board create/edit notice/readme/online commit controls | Legacy form renders notice/readme/issue-template/branch/path/line-ending/file uploader/notification controls. | `ProjectPostFormPage` renders those controls and hides notice/readme for online commit contexts. | covered | none |
| board create/edit label picker | Legacy create/edit templates do not render a board label picker. | `ProjectPostFormPage` no longer renders `.board-label-picker`; edit submit preserves existing labels without exposing a non-legacy form control. | covered | `frontend/src/routes/-board-views.tsx`, `frontend/src/board-milestone-parity.spec.tsx`, `frontend/tests/board-posting-parity.e2e.ts` |
| board create/edit attachment picker shell | Legacy uses `common.fileUploader(ResourceType.BOARD_POST, ...)`. | `ProjectPostFormPage` renders `.upload-wrap.content-footer[data-resource-type="BOARD_POST"]` while preserving paste/drop REST upload insertion. | covered | `frontend/src/routes/-board-views.tsx`, `frontend/src/board-milestone-parity.spec.tsx`, `frontend/tests/board-posting-parity.e2e.ts` |
| board detail history/watch/comments/child comments | Legacy renders history modal, watch button, comments, child comments, parentCommentId. | Project layout owns the header/menu/page-wrap shell with active board menu, detail keymap, and `board-page`; `ProjectBoardDetailPage` renders these shells under the outlet. The route derives edit/detail mode from TanStack Router state for SPA transitions, and comment edit forms apply the active `display:block` override over the legacy hidden default. | covered | `frontend/src/routes/$owner/$projectName/route.tsx`, `frontend/src/routes/$owner/$projectName/post/$postNumber/route.tsx`, `frontend/src/routes/-board-views.tsx`, `frontend/src/board-milestone-parity.spec.tsx`, `frontend/tests/board-posting-parity.e2e.ts` |
| board detail delete confirmation | Legacy delete opens `#deleteConfirm`; only modal confirm deletes. | `ProjectBoardDetailPage` renders `#deleteConfirm` with `post.delete.confirm`; delete REST callback runs from the modal Yes button. | covered | `frontend/src/routes/-board-views.tsx`, `frontend/src/board-milestone-parity.spec.tsx`, `frontend/tests/board-posting-parity.e2e.ts` |
| board detail labels | Legacy updateable detail uses label Select2 and posts the selected label id array to `BoardApi.updatePostLabel`; readonly detail shows selected labels. | React renders the updateable `#labelIds[data-toggle=select2][data-format=issuelabel]` shell and readonly selected-label shell, keeps the legacy direct `data-request-uri`, and now wires changes through canonical REST JSON `PATCH /api/v1/projects/:owner/:project/posts/:number/labels` with returned detail DTO/cache refresh. | covered | `frontend/src/api/boards.ts`, `frontend/src/routes/-board-views.tsx`, `frontend/src/routes/$owner/$projectName/post/$postNumber/route.tsx`, `crates/server/src/routes/boards.rs`, `crates/server/tests/board_contract.rs`, `frontend/src/api-query.spec.ts`, `frontend/tests/board-posting-parity.e2e.ts` |
| board post/comment attachments | Legacy detail/comment containers include serialized attachment data. | `ProjectBoardDetailPage` serializes current DTO attachments into `.attachments[data-attachments]` and visible `.attached-file` rows for posts, comments, and child comments; backend already projects board post/comment attachments; `frontend/tests/board-posting-parity.e2e.ts` now browser-verifies post/comment metadata and rows from REST DTO fixtures. | covered | `frontend/src/routes/-board-views.tsx`, `frontend/src/board-milestone-parity.spec.tsx`, `frontend/tests/board-posting-parity.e2e.ts` |
| milestone list tabs/empty/progress/counts | Legacy open/closed/all tabs, empty state, all-state open/closed badges, counts, completion, progress. | `ProjectMilestoneListPage` renders tabs, empty state, counts, completion and progress. `frontend/tests/project-milestones.e2e.ts` now also covers the all-state metadata branch with `.state.nm.open`, `.state.nm.closed`, and the closed due-date `ml5` branch without relative date text. | covered | `frontend/src/routes/$ownerName/$projectName/milestones.tsx`, `frontend/tests/project-milestones.e2e.ts` |
| milestone list sort links | Legacy inactive sort links use `orderDir=asc`; active links toggle asc/desc. | `sortHref` now uses `orderDir=asc` for inactive fields and toggles only the active field. | covered | `frontend/src/routes/-milestone-views.tsx`, `frontend/src/board-milestone-parity.spec.tsx` |
| milestone list search | Legacy `.textbox` keyup filters `.issue-link` rows client-side. | `ProjectMilestoneListPage` now keeps React filter state and hides non-matching `.issue-link` rows client-side. | covered | `frontend/src/routes/-milestone-views.tsx`, `frontend/src/board-milestone-parity.spec.tsx` |
| milestone due-date relative/overdue display | Legacy renders `milestone.until` and overdue class. | Project milestone REST/RPC projects `untilLabel` and `dueDateOverdue`; React renders `untilLabel` and `.due-date.over` on list/detail through the legacy selectors. | covered | `crates/server/src/routes/projects/milestones.rs`, `crates/server/src/api_types.rs`, `frontend/src/app-view-models.ts`, `frontend/src/routes/-milestone-views.tsx`, `crates/server/tests/milestone_contract.rs`, `crates/server/tests/rest_contract.rs`, `frontend/src/board-milestone-parity.spec.tsx` |
| milestone form validation shell | Legacy field errors render beside fields with input `.error` and `.message`. | `ProjectMilestoneFormPage` now attaches `.error` and `.message` beside title/content/due-date fields; `frontend/tests/milestone-delete-modal-parity.e2e.ts` browser-verifies invalid create submit blocks REST POST and renders title/content/due-date messages. | covered | `frontend/src/routes/-milestone-views.tsx`, `frontend/src/board-milestone-parity.spec.tsx`, `frontend/tests/milestone-delete-modal-parity.e2e.ts` |
| milestone form attachments | Legacy uses `common.fileUploader(ResourceType.MILESTONE, ...)`. | `ProjectMilestoneFormPage` renders `.upload-wrap.content-footer[data-resource-type="MILESTONE"]` while preserving REST upload insertion. | covered | `frontend/src/routes/-milestone-views.tsx`, `frontend/src/board-milestone-parity.spec.tsx` |
| milestone detail actions/delete modal | Legacy list/edit/delete/open/close plus `#deleteConfirm` modal. | Current renders action links and delete modal with legacy request attrs; focused Playwright now verifies close/reopen issue REST JSON state callbacks and visible returned state. | covered | `frontend/tests/milestone-delete-modal-parity.e2e.ts` |
| milestone detail attachments | Legacy `.attachments` carries serialized attachment data. | Project milestone REST/RPC carries milestone attachments in the richer detail/list projection; React serializes them into `.attachments[data-attachments]` and visible `.attached-file` rows; focused Playwright now verifies metadata/row output from REST DTO fixtures. | covered | `crates/server/src/routes/projects/milestones.rs`, `crates/server/src/api_types.rs`, `frontend/src/app-view-models.ts`, `frontend/src/routes/-milestone-views.tsx`, `crates/server/tests/rest_contract.rs`, `frontend/src/board-milestone-parity.spec.tsx`, `frontend/tests/milestone-delete-modal-parity.e2e.ts` |
| milestone linked issue tabs/list | Legacy uses issue tabs, mass update, and `issue.partial_list` rows. | Project milestone REST/RPC carries open/closed `ProjectIssueListItem` rows, and React renders legacy `issue.partial_list` selectors (`.post-list-wrap`, `.post-item`, mass-update checkboxes, author/count/assignee/due-date cells) with client search. Milestone detail now also renders the legacy state/assignee/milestone/attach-label/detach-label mass-update dropdown options and wires checkbox-selected mutations through the shared issue mass-update REST client. | covered | `frontend/src/routes/-milestone-views.tsx`, `frontend/src/routes/$owner/$projectName/milestone/$milestoneId/route.tsx`, `frontend/src/board-milestone-parity.spec.tsx` |
| milestone issue search | Legacy `data-toggle="item-search"` filters `.issue-item`. | `ProjectMilestoneDetailPage` now filters rendered issue links through React state from the legacy search input. | covered | `frontend/src/routes/-milestone-views.tsx`, `frontend/src/board-milestone-parity.spec.tsx` |

## Playwright Scenario Matrix

| path | state | legacy selector/copy | Rust selector/copy | interaction | API/direct boundary | status |
| --- | --- | --- | --- | --- | --- | --- |
| `/:owner/:project/posts?filter=x&labelIds[]=7&orderBy=numOfComments&pageNum=2` | populated board list | `#option_form`, `.board-labels dl select#labelIds[data-format=issuelabel]`, `.filter-wrap.board`, `.notice-wrap`, `#pagination input[name=pageNum]` | same selectors in the flat project board list route, including the shared label partial wrapper and Select2 metadata | search, label, sort, page | React route consumes posts REST list and post form options for labels | covered |
| `/organizations/:name/boards?projectNames[]=p&filter=x` | populated organization aggregate | `#projects[name="projectNames[]"]`, `.textbox.group-board`, `.notice-wrap`, `.group-project-name` | same selectors in `OrganizationBoardListPage` | project selector, keyword, sort | organization boards REST list with separate notices | covered |
| `/:owner/:project/postform` | create form labels | Legacy create form has no label fieldset | no `.board-label-picker`; edit preserves existing labels without visible form control | inspect create form | REST create/update still accepts `labelIds` but React form does not expose non-legacy picker | covered |
| `/:owner/:project/postform` | attachments | `common.fileUploader(ResourceType.BOARD_POST, null)` visible shell | same `.upload-wrap.content-footer[data-resource-type=BOARD_POST]` shell plus paste/drop upload | paste image, inspect uploader | `/files` upload then REST create | covered |
| `/:owner/:project/post/:number` | delete action | trigger plus modal `#deleteConfirm` | trigger opens modal; modal Yes fires REST delete | click delete icon, then Yes | REST DELETE fires from modal confirm | covered |
| `/:owner/:project/post/:number` | labels | updateable label selector posts selected ids as JSON | updateable Select2 shell rendered; change handler calls canonical REST label mutation and refreshes returned detail | inspect sidebar and change selector | React route uses `/api/v1/projects/:owner/:project/posts/:number/labels`; legacy direct route remains evidence/compatibility | covered |
| `/:owner/:project/post/:number` | attachments | `.attachments[data-attachments=...]` | current DTO attachments serialized and visible as `.attached-file` rows | Playwright inspects post/comment metadata attributes and visible rows from REST detail arrays | REST detail has arrays | covered |
| `/:owner/:project/milestones?state=open` / `?state=all` | list/progress/state metadata | `.nav.nav-tabs`, empty state, `.state.nm.open`, `.state.nm.closed`, `.completion-rate`, `.progress .bar` | same selectors | switch states | milestones REST list | covered |
| `/:owner/:project/milestones` | search | `.textbox` keyup filters rows | React keyup/change filters non-matching `.issue-link` rows | type title | client-only behavior | covered |
| `/:owner/:project/newMilestoneForm` | invalid submit | field-level `.error` and `.message` | field-adjacent `.error` and `.message` source/rendering | submit invalid title/content/due-date and assert no REST POST | React validation before REST POST | covered |
| `/:owner/:project/milestone/:id` | actions | `.actrow .ybtn`, `#deleteConfirm`, open/close | same selectors | modal, close/reopen and returned state render | REST state/delete callbacks | covered |
| `/:owner/:project/milestone/:id#issues` | linked issues | tabs plus mass update and issue partial list rows | tabs, search, mass-update shell, legacy partial-list row selectors, populated mass-update dropdown options, and checkbox-selected mutation wiring render from REST detail/project container data | switch tabs/search/select issues/apply dropdown | REST detail issue arrays plus shared issue mass-update REST mutation | covered |
