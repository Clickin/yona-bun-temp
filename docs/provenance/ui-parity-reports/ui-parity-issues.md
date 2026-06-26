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

## Route Inventory Summary

Total rows: 24

| status | count |
| --- | ---: |
| covered | 23 |
| gap | 0 |
| deviation | 0 |
| deferred | 0 |
| not-applicable | 1 |
| weak evidence | 0 |
| needs-parent-decision | 0 |

## Result Inventory

| path | legacy evidence | current evidence | status | proposed owner |
| --- | --- | --- | --- | --- |
| `/:owner/:project/issues` | Project issue list renders state tabs, side filters, due date, label/milestone/assignee filters, two-column and subtask toggles. | `ProjectIssueListPage` renders state tabs, side filters, advanced filter shell, due date input, label/milestone selects, `LegacyTwoColumnModeCheckboxArea`, and `LegacyShowSubtasksCheckbox`. | covered | none |
| `/:owner/:project/issues` filter execution | Legacy supports filter text, commenter filter, due date, sort order, and quick-search state via request params/PJAX. | React route/client now preserves `filter`, `dueDate`, `orderBy`, `orderDir`, `commenterId`, author/assignee/label/milestone/page/state params; REST raw query parsing accepts duplicate labels and legacy scalar params; repository filtering applies text, commenter, due date, labels, milestone, assignee/author, state, and sort before pagination. | covered | none |
| `/:owner/:project/issues` mass update | `partial_massupdate.scala.html` renders check-all, state, assignee, milestone, attach-label, detach-label controls. | `ProjectIssueListPage` renders `#mass-update-form`, `#check-all`, `#state`, `#assignee`, `#milestone`, `#attaching-label`, and `#detaching-label`, tracks checked `name=checked-issue` rows, and posts selected issue numbers to REST `massUpdateIssues`. | covered | none |
| `/user/issues` | Personal issue filters, state tabs, search, sort, two-column/subtask toggles. | `UserIssueListPage` renders the same filter set, hidden ids, state tabs, search, sort links, list rows, and default-login-page control. | covered | none |
| issue create/edit fields | Legacy renders title, editor, assignee, due date, milestone, labels, draft/save/publish/cancel, parent selector. | `ProjectIssueFormPage` renders and submits those controls through REST. `frontend/tests/issue-form-parity.e2e.ts` now proves the browser-visible project create and edit forms under `/yona`, including `#issue-form`, `#title`, `#editor-body-content-body`, `#targetProjectId`, `#parentId`, `#assignee`, `#milestoneId`, `#issueDueDate`, `#labelIds`, resolved validation messages, REST JSON payloads, and post-submit detail redirects. | covered in current follow-up | none |
| edit hidden `authorId` | `edit.scala.html` posts hidden `authorId`, `isDraft`, `isPublish`. | Edit mode renders hidden `authorId`, `isDraft`, `isPublish`, and `#notificationMail`; `frontend/tests/issue-form-parity.e2e.ts` proves those selectors in the browser. The parent detail route now renders its `editform` child through `<Outlet />`, so the legacy edit deep link no longer falls through to the issue detail screen. | covered in current follow-up | none |
| create/edit milestone choices | Create lists open milestones only; edit groups open and closed milestones with optgroups. | Create filters out closed milestones before rendering; edit renders open/closed `<optgroup>` sections with legacy milestone state labels. `frontend/tests/issue-form-parity.e2e.ts` proves create excludes closed milestone option `8` while edit exposes open and closed optgroups. | covered in current follow-up | none |
| create/edit label selector copy | Legacy label selector uses legacy `label` / `button.edit` copy. | Form label selector heading uses `legacyMessage(messages, "label")` and `legacyMessage(messages, "button.edit")`. | covered | none |
| `/:owner/:project/issue/labelsform` update permission gate | `IssueLabelApp.labelsForm` has `@IsAllowed(Operation.UPDATE)`, and `project/issuelabels.scala.html` renders create/copy management forms only when issue labels are creatable. | The React route now waits for project container data and returns the legacy forbidden shell when `viewerCanUpdate` is false, before rendering `#copyLabel` or `#frmNewLabel`. `frontend/tests/issue-label-settings-parity.e2e.ts` proves the read-only browser state hides management forms. | covered in current follow-up | none |
| `/:owner/:project/issue/labelsform` category typeahead and new-category choice | `yobi.issue.LabelEditor.js` builds a category typeahead and opens a single/multiple confirmation when creating a label with a new category. | `IssueLabelCreateForm` now renders a `.typeahead.dropdown-menu` from existing categories, prevents Enter from submitting the category field, and opens `#newCategoryOption` before creating a new category so the user chooses Multiple or Single. The focused E2E asserts the visible typeahead and REST `categoryIsExclusive: true` payload after choosing Single. | covered in current follow-up | none |
| `/:owner/:project/issue/labelsform` edit modals | `partial_issuelabels_editlabel.scala.html` and `partial_issuelabels_editcategory.scala.html` define legacy `#editLabel` / `#editCategory` modals opened by label editor JavaScript. | Label/category edit buttons now open React-controlled legacy `#editLabel` and `#editCategory` modal shells, prefill current values, submit PATCH REST JSON, close on success/cancel, and preserve the legacy IDs/selectors. `frontend/tests/issue-label-settings-parity.e2e.ts` proves both modal flows. | covered in current follow-up | none |
| parent/subtask selectors | Legacy parent selection and child issue rendering. | Form uses `parentIssueOptions`; list/detail render subtask summary and child issue lists. | covered | none |
| issue detail header/actions | Legacy renders favorite, watch, share, vote/voters, weight, translate, edit/show-original, delete modal. | `ProjectIssueDetailPage` renders those action shells and wires REST mutations. `frontend/tests/issue-detail-parity.e2e.ts` now clicks favorite, `#watch-button`, `#vote`, `#issue-share-button`, and `#deleteConfirm`, asserts visible state changes, CSRF headers, REST POST/DELETE paths, delete cancel/confirm modal behavior, and post-delete redirect to the issue list. | covered in current follow-up | none |
| issue detail sidebar metadata | Legacy sidebar inline-updates assignee, milestone, due date, labels, and new-subtask link. | Detail renders `#issueUpdateForm`, hidden `issues[0].id`, assignee form, milestone select, due-date input, and label select; milestone/due-date/label changes post through single-issue REST mass-update and reload detail. `frontend/tests/issue-detail-parity.e2e.ts` now changes milestone and due date from the browser-visible sidebar and asserts `POST /api/v1/projects/:owner/:project/issues/mass-update` payloads, while also proving the legacy `#labelIds` selected/options shell is present. | covered in current follow-up | none |
| comments | Legacy comment list, edit/delete, vote/unvote, new-issue-by-comment, disabled comment box. | Current detail renders these shells and REST mutations. | covered | none |
| child comments | Legacy one-line child comments and `parentCommentId` form. | Current groups child comments, renders one-line comments, delete, and submit form. | covered | none |
| timeline rows | Legacy timeline renders rich event rows with distinct sender/target links and resource-specific labels. | REST timeline projection now carries additive sender labels, target user labels, and resource href/label/title values where raw issue events support them; `IssueTimelineEvent` renders legacy message text with distinct sender, assignee/sharer, milestone, commit, pull-request, moved-project, and label nodes instead of one sentence-wide link. | covered | none |
| sharer panel | Legacy sharer list/search/share controls. | Current `IssueSharerPanel` renders sharer list, hidden `issueSharer`, autocomplete, share/unshare REST callbacks. | covered | none |
| `@` / `#` autocomplete | Legacy At.js mention and issue reference helpers. | `IssueMentionTextarea` detects and inserts mention/reference suggestions; specs cover search and insertion. | covered | none |
| paste/drop attachments | Legacy file uploader supports issue/comment upload zones and editor integration. | Textarea paste/drop uploads image and non-image files; image uploads insert image Markdown and non-image uploads insert normal link Markdown. Issue body and new-comment editors now also render the legacy `.upload-wrap.content-footer`, `.attach-wrap`, upload button/input, `.attached-files.unstyled`, and attach-on-save help shell while keeping REST JSON submit boundaries. `frontend/tests/issue-detail-parity.e2e.ts` proves issue comment paste/drop image uploads insert Markdown, send CSRF-backed `/files` requests, and submit REST comment JSON with attachment ids. | covered in current follow-up | none |
| Markdown source rendering | Legacy renders issue/comment Markdown. | `MarkdownRenderer` renders issue/comment source with tasklist, mention/reference handling and sanitizer coverage. | covered | none |
| Markdown preview tabs | Legacy preview tab renders Markdown preview. | `LegacyMarkdownEditorShell` and the issue comment form render Markdown preview content through `MarkdownRenderer` while preserving `a[data-mode=preview]` tab selectors. | covered | none |
| REST submit boundaries | Legacy forms post to controllers; Rust target remains REST JSON from React. | Routes submit create/update/comment/watch/vote/favorite/share/delete through REST helpers. | covered | none |
| legacy PJAX/timeline HTML fragments | Legacy issue list/timeline can return server-rendered fragments. | App-runtime uses React plus REST JSON for list/detail timeline. | not-applicable | none |

## Playwright Scenario Matrix

| path | state | legacy selector/copy | Rust selector/copy | interaction | API/direct boundary | status |
| --- | --- | --- | --- | --- | --- | --- |
| `/:owner/:project/issues` | open/closed list | `.nav-tabs` links for `state=open` or `state=closed`, `#two-column-mode`, `#toggle-show-subtasks` | same selectors rendered by `ProjectIssueListPage` | click state tab, toggle two-column/subtasks | `GET /api/v1/projects/:owner/:project/issues` | covered |
| `/:owner/:project/issues` | advanced filters | `input[name=filter]`, `select#authorId`, `select#assigneeId`, `select#milestoneId`, `input[name=dueDate]`, sort anchors | controls render and route/client/backend preserve/apply filter, due-date, commenter, order, state, author/assignee, milestone, and labels | submit filter/sort/due date | `GET /api/v1/projects/:owner/:project/issues` | covered |
| `/:owner/:project/issues` | mass update | `#mass-update-form`, `#check-all`, `#state`, `#assignee`, `#milestone`, `#attaching-label`, `#detaching-label` | same selectors render and post selected rows through REST JSON mass update | select rows and change state/assignee/labels | `POST /api/v1/projects/:owner/:project/issues/mass-update` | covered |
| `/:owner/:project/issueform` | create | `#title`, editor textarea, `#assignee`, `#milestoneId`, `#issueDueDate`, `#labelIds`, `#draft-save-btn` | same core controls rendered with resolved validation copy and `referCommentId` hidden field | empty title validation, draft submit, parent/label/milestone/due-date payload, redirect to detail | REST create issue | covered in current follow-up |
| `/:owner/:project/issue/:number/editform` | edit | hidden `authorId`, `isDraft`, `isPublish`, state dropdown, milestone optgroups | hidden fields render and edit milestone choices are grouped by open/closed optgroups through the editform child route | invalid due-date validation, edit save payload, redirect to detail | REST update issue | covered in current follow-up |
| `/:owner/:project/issue/:number` | detail actions | `.favorite-issue`, `#watch-button`, `#issue-share-button`, `#vote`, `#deleteConfirm` | same action shells rendered | favorite, watch, vote, share, delete confirm/cancel | REST action endpoints | covered in current follow-up |
| `/:owner/:project/issue/:number` | sidebar metadata | `#issueUpdateForm`, milestone select, due-date input, label select, assignee select | same metadata form/select/input shell renders and posts through single-issue REST mass-update | change milestone/due date/labels inline | `POST /api/v1/projects/:owner/:project/issues/mass-update` | covered in current follow-up |
| issue form/comment editor | paste/drop attachment | legacy uploader/drop integration and attachment list | image and non-image paste/drop upload insert Markdown image/link text, and the legacy visible uploader shell/list/button renders for issue/comment editors | paste/drop image and non-image file; static selector proof for upload shell | temporary attachment upload endpoint plus REST submit | covered in current follow-up |
| issue form/comment editor | Markdown preview | `a[data-mode=preview]` renders preview body | preview tabs render React Markdown preview content | type Markdown, click Preview | React-rendered preview | covered |
