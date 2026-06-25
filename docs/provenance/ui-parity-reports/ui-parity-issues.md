# UI Parity Report: ui-parity-issues

Status: explorer report
Date: 2026-06-26
Agent: `019effaa-67d8-7581-860a-b08920fd073e` (`Linnaeus`)
Mode: read-only audit, no files edited by the explorer

## Evidence Checked

Legacy evidence:

- `yona-original/app/views/issue/list.scala.html`
- `yona-original/app/views/issue/create.scala.html`
- `yona-original/app/views/issue/edit.scala.html`
- `yona-original/app/views/issue/view.scala.html`
- `yona-original/app/views/issue/partial_list_wrap.scala.html`
- `yona-original/app/views/issue/partial_list.scala.html`
- `yona-original/app/views/issue/partial_massupdate.scala.html`
- `yona-original/app/views/issue/partial_comments.scala.html`
- `yona-original/app/views/issue/partial_comment.scala.html`
- `yona-original/app/views/issue/partial_event_timeline.scala.html`
- `yona-original/app/views/issue/my_list.scala.html`
- `yona-original/app/views/issue/my_partial_search.scala.html`
- `yona-original/app/views/issue/my_partial_list.scala.html`
- `yona-original/app/views/issue/my_partial_list_quicksearch.scala.html`
- `yona-original/app/views/common/commentForm.scala.html`
- `yona-original/app/views/common/childComments.scala.html`

Current evidence:

- `frontend/src/routes/-issue-views.tsx`
- `frontend/src/routes/$owner/$projectName/issues/route.tsx`
- `frontend/src/routes/$owner/$projectName/issueform/route.tsx`
- `frontend/src/routes/$owner/$projectName/issue/$issueNumber/route.tsx`
- `frontend/src/routes/$owner/$projectName/issue/$issueNumber/editform/route.tsx`
- `frontend/src/routes/user/issues/route.tsx`
- `frontend/src/routes/user/issues/new/route.tsx`
- `frontend/src/routes/user/issues/new/mine/route.tsx`
- `frontend/src/auth-workspace-client.ts`
- `frontend/src/api/issue-meta.ts`
- `crates/server/src/routes/issues.rs`

## Result Rows

| path | legacy evidence | current evidence | status | proposed owner |
| --- | --- | --- | --- | --- |
| `/:owner/:project/issues` | Project issue list renders state tabs, side filters, due date, label/milestone/assignee filters, two-column and subtask toggles. | `ProjectIssueListPage` renders state tabs, side filters, advanced filter shell, due date input, label/milestone selects, `LegacyTwoColumnModeCheckboxArea`, and `LegacyShowSubtasksCheckbox`. | covered | none |
| `/:owner/:project/issues` filter execution | Legacy supports filter text, commenter filter, due date, sort order, and quick-search state via request params/PJAX. | Route/backend parse only assignee/author/label/milestone/page/state; filter/dueDate/order/commenter are ignored. | gap | `frontend/src/routes/$owner/$projectName/issues/route.tsx`, `frontend/src/auth-workspace-client.ts`, `crates/server/src/routes/issues.rs`, focused project issue list tests |
| `/:owner/:project/issues` mass update | `partial_massupdate.scala.html` renders check-all, state, assignee, milestone, attach-label, detach-label controls. | Rows render `checked-issue` checkboxes and REST/client have `massUpdateIssues`, but no visible toolbar or frontend mutation wiring is rendered. | gap | `frontend/src/routes/-issue-views.tsx`, project issue list route, focused frontend/e2e coverage |
| `/user/issues` | Personal issue filters, state tabs, search, sort, two-column/subtask toggles. | `UserIssueListPage` renders the same filter set, hidden ids, state tabs, search, sort links, list rows, and default-login-page control. | covered | none |
| issue create/edit fields | Legacy renders title, editor, assignee, due date, milestone, labels, draft/save/publish/cancel, parent selector. | `ProjectIssueFormPage` renders and submits those controls through REST. | covered | none |
| edit hidden `authorId` | `edit.scala.html` posts hidden `authorId`, `isDraft`, `isPublish`. | Edit mode renders hidden `authorId`, `isDraft`, `isPublish`. | covered | none |
| create/edit milestone choices | Create lists open milestones only; edit groups open and closed milestones with optgroups. | Current create/edit load `state: "all"` and render a flat select without open/closed optgroups. | gap | issue form routes, `ProjectIssueFormPage`, milestone option tests |
| create/edit label selector copy | Legacy label selector uses legacy `label` / `button.edit` copy. | Current form renders literal `label` and `[button.edit]` in the label selector heading. | gap | `frontend/src/routes/-issue-views.tsx`, i18n/form render spec |
| parent/subtask selectors | Legacy parent selection and child issue rendering. | Form uses `parentIssueOptions`; list/detail render subtask summary and child issue lists. | covered | none |
| issue detail header/actions | Legacy renders favorite, watch, share, vote/voters, weight, translate, edit/show-original, delete modal. | `ProjectIssueDetailPage` renders those action shells and wires REST mutations. | covered | none |
| issue detail sidebar metadata | Legacy sidebar inline-updates assignee, milestone, due date, labels, and new-subtask link. | Current sidebar displays assignee/milestone/labels and assignee form, but lacks inline milestone, due-date, label update controls and due-date status. | gap | `frontend/src/routes/-issue-views.tsx`, issue detail route, REST metadata mutation wiring |
| comments | Legacy comment list, edit/delete, vote/unvote, new-issue-by-comment, disabled comment box. | Current detail renders these shells and REST mutations. | covered | none |
| child comments | Legacy one-line child comments and `parentCommentId` form. | Current groups child comments, renders one-line comments, delete, and submit form. | covered | none |
| timeline rows | Legacy timeline renders rich event rows with distinct sender/target links and resource-specific labels. | Current `IssueTimelineEvent` keeps state classes but collapses event text into a simpler message/link shape. | gap | `frontend/src/routes/-issue-views.tsx`, timeline render tests |
| sharer panel | Legacy sharer list/search/share controls. | Current `IssueSharerPanel` renders sharer list, hidden `issueSharer`, autocomplete, share/unshare REST callbacks. | covered | none |
| `@` / `#` autocomplete | Legacy At.js mention and issue reference helpers. | `IssueMentionTextarea` detects and inserts mention/reference suggestions; specs cover search and insertion. | covered | none |
| paste/drop attachments | Legacy file uploader supports issue/comment upload zones and editor integration. | Current textarea paste/drop uploads image files, but visible/general non-image uploader parity is absent. | gap | `frontend/src/routes/-issue-views.tsx`, `frontend/src/api/attachments.ts`, focused upload e2e |
| Markdown source rendering | Legacy renders issue/comment Markdown. | `MarkdownRenderer` renders issue/comment source with tasklist, mention/reference handling and sanitizer coverage. | covered | none |
| Markdown preview tabs | Legacy preview tab renders Markdown preview. | Current editor shells render preview tab containers, but no React preview state/rendering is wired. | gap | `frontend/src/routes/-markdown-renderer.tsx`, `frontend/src/routes/-issue-views.tsx`, focused preview interaction test |
| REST submit boundaries | Legacy forms post to controllers; Rust target remains REST JSON from React. | Routes submit create/update/comment/watch/vote/favorite/share/delete through REST helpers. | covered | none |
| legacy PJAX/timeline HTML fragments | Legacy issue list/timeline can return server-rendered fragments. | App-runtime uses React plus REST JSON for list/detail timeline. | not-applicable | none |

## Playwright Scenario Rows

| path | state | legacy selector/copy | Rust selector/copy | interaction | API/direct boundary | status |
| --- | --- | --- | --- | --- | --- | --- |
| `/:owner/:project/issues` | open/closed list | `.nav-tabs a[state=open|closed]`, `#two-column-mode`, `#toggle-show-subtasks` | same selectors rendered by `ProjectIssueListPage` | click state tab, toggle two-column/subtasks | `GET /api/v1/projects/:owner/:project/issues` | covered |
| `/:owner/:project/issues` | advanced filters | `input[name=filter]`, `select#authorId`, `select#assigneeId`, `select#milestoneId`, `input[name=dueDate]`, sort anchors | controls render, but filter/dueDate/order/commenter are not sent/read | submit filter/sort/due date | REST list omits those params | gap |
| `/:owner/:project/issues` | mass update | `#mass-update-form`, `#check-all`, `#state`, `#assignee`, `#milestone`, `#attaching-label`, `#detaching-label` | row checkboxes exist; toolbar absent | select rows and change state/assignee/labels | backend/client `mass-update` exists but UI not wired | gap |
| `/:owner/:project/issueform` | create | `#title`, editor textarea, `#assignee`, `#milestoneId`, `#issueDueDate`, `#labelIds`, `#draft-save-btn` | same core controls rendered | save and draft submit | REST create issue | covered |
| `/:owner/:project/issue/:number/editform` | edit | hidden `authorId`, `isDraft`, `isPublish`, state dropdown, milestone optgroups | hidden fields render; milestone grouping differs | edit and save/publish draft | REST update issue | gap |
| `/:owner/:project/issue/:number` | detail actions | `.favorite-issue`, `#watch-button`, `#issue-share-button`, `#vote`, `#deleteConfirm` | same action shells rendered | favorite, watch, vote, share, delete confirm/cancel | REST action endpoints | covered |
| `/:owner/:project/issue/:number` | sidebar metadata | `#issueUpdateForm`, milestone select, due-date input, label select, assignee select | milestone/labels mostly display-only; due-date inline control absent | change milestone/due date/labels inline | no React inline metadata submit path | gap |
| issue form/comment editor | paste/drop attachment | legacy uploader/drop integration and attachment list | image paste/drop handled; general uploader parity absent | paste/drop image and non-image file | temporary attachment upload endpoint | gap |
| issue form/comment editor | Markdown preview | `a[data-mode=preview]` renders preview body | preview tab containers exist but no React preview render state | type Markdown, click Preview | React-rendered preview expected | gap |

