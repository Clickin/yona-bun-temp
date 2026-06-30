# UI Parity Report: ui-parity-issues

Status: explorer report
Date: 2026-06-26
Agent: `019effaa-67d8-7581-860a-b08920fd073e` (`Linnaeus`)
Mode: read-only audit, no files edited by the explorer

## 2026-06-27 Visual Follow-Up

- Restored issue detail header/body/comment/timeline CSS toward the legacy selectors and geometry from `yona-original/app/assets/stylesheets/less/_page.less:2868` and `:3005`.
- Scope: `frontend/src/app.css` plus a focused CSS source guard in `frontend/src/issue-detail-shell.spec.tsx`. The existing React markup already carries the legacy issue detail classes, so this follow-up avoids JSX churn and keeps REST/React behavior unchanged.
- Continuation: board-id/date header styling now matches legacy `_page.less` color, spacing, and line-height selectors under the `issue-detail-page` shell.
- Continuation: issue detail right pane now uses the legacy `span3 span-right-pane mb20` shell from `issue/view.scala.html`, restoring the existing `.span-right-pane` responsive behavior.
- Continuation: project issue list comment/vote/sharer counts now reuse the legacy `common/commentCount.scala.html`, `voteCount.scala.html`, and `sharerCount.scala.html` class/icon structure.
- Continuation: project issue list rows now restore the legacy `_page.less` `.post-item`, `.title-wrap`, `.infos`, `.item-count-groups`, `.empty-avatar-wrap`, and `.mileston-tag` geometry under the `issue-list-page` shell.
- Continuation: editable issue detail labels keep the legacy hidden `#labelIds[data-toggle=select2]` contract while rendering the visible `.issue-labels-fallback` label chips used by the React form path.
- Continuation: issue voter modal close buttons retain the legacy `.close`, `data-dismiss="modal"`, and footer button classes while dropping invalid `aria-hidden` on focusable buttons.
- Verification: `pnpm --dir frontend exec tsc --noEmit`; `pnpm --dir frontend exec vitest run src/issue-detail-shell.spec.tsx src/issue-list-filter.spec.tsx`.

## 2026-06-27 Nested Layout Follow-Up

- Moved project issue create/edit form shell ownership into `frontend/src/routes/$owner/$projectName/route.tsx` for `/issueform` and `/issue/:issueNumber/editform`, keeping the issue menu active and rendering leaf form bodies through the TanStack Router `<Outlet />`.
- Scope: `frontend/src/routes/-issue-views.tsx` adds `renderShell={false}` for `ProjectIssueFormPage`; create/edit leaf routes pass that flag while retaining their existing REST submit/data loading boundaries.
- Verification: `pnpm --dir frontend exec tsc --noEmit`; `pnpm --dir frontend exec vitest run src/issue-detail-shell.spec.tsx src/project-settings-parity.spec.tsx`.

## 2026-06-27 Issue Label Layout Follow-Up

- Moved project issue-label settings shell ownership into `frontend/src/routes/$owner/$projectName/route.tsx` for `/issue/labelsform`, keeping the settings menu active and rendering the leaf through the TanStack Router `<Outlet />`.
- Scope: `frontend/src/routes/$owner/$projectName/issue/labelsform/route.tsx` adds `renderShell={false}` while retaining the existing label/category REST mutation boundary.
- Verification: `pnpm --dir frontend exec tsc --noEmit`; `pnpm --dir frontend exec vitest run src/issue-label-settings-i18n.spec.tsx src/project-settings-parity.spec.tsx`.

## 2026-06-27 Issue List Layout Follow-Up

- Moved project issue list shell ownership into `frontend/src/routes/$owner/$projectName/route.tsx` for `/issues`, keeping the issue menu active, list keymap mode, and `issue-list-page` shell CSS hook.
- Scope: `frontend/src/routes/-issue-views.tsx` adds `renderShell={false}` for `ProjectIssueListPage`; the issue list leaf route passes that flag while retaining the existing REST list and mass-update boundaries.
- Verification: `pnpm --dir frontend exec tsc --noEmit`; `pnpm --dir frontend exec vitest run src/issue-list-filter.spec.tsx`.

## 2026-07-01 Project Issue Empty List Follow-Up

- Restored the flat project issue list empty-state route at `/:owner/:project/issues` using the legacy `issue/list.scala.html` caller shell plus `partial_list_wrap`, `partial_list_quicksearch`, `partial_searchform`, `common/twoColumnModeCheckboxArea`, `common/showSubtasksCheckbox`, and the issue-list keymap trigger.
- Scope: `frontend/src/routes/$ownerName/$projectName/issues.tsx` renders the project header/menu with active Issue state, left quick-search/search controls, open/closed tabs, two-column/subtask toggles, empty `.error-wrap`, and REST-backed list loading for `/api/v1/projects/:owner/:project/issues`.
- Verification: `frontend/tests/project-issues-empty.e2e.ts` compares the mocked `/admin/sample/issues?filter=empty` whole-screen DOM. This proof covers the empty list screen only; populated rows, mass update interaction, and the full keymap modal remain covered by existing issue-list guards or separate follow-up slices.

## 2026-07-01 Project Issue Populated Row Follow-Up

- Extended the same flat project issue list route to render the populated `issue/partial_list.scala.html` one-row branch with `.post-list-wrap.row-fluid`, legacy row id/href/data hooks, mass-update checkbox metadata, title/author/date/milestone/count/label stack, assignee avatar rail, overdue due-date rail, Excel action, keymap trigger, and pagination.
- Scope: `frontend/src/routes/$ownerName/$projectName/issues.tsx` now maps existing REST issue item fields directly into the legacy row DOM. The sort filter container remains legacy-conditional and is empty for a single visible issue, matching `partial_list_wrap.scala.html`.
- Verification: `frontend/tests/project-issues-empty.e2e.ts` now includes the RED-to-GREEN populated `/admin/sample/issues?filter=bug` whole-screen DOM comparison alongside the empty-state proof.

## 2026-07-01 Project Issue Non-Member Controls Follow-Up

- Restored the legacy `ProjectUser.isMember` gates from `issue/partial_list_wrap.scala.html` and `issue/partial_list.scala.html`, plus the issue-label creation gate from `issue/partial_searchform.scala.html`, for project issue lists.
- Scope: `frontend/src/routes/$ownerName/$projectName/issues.tsx` now hides the mass-update toolbar, per-row mass-update checkbox, and label management action when the loaded project container does not expose update/member controls.
- Verification: `frontend/tests/project-issues-empty.e2e.ts` includes the RED-to-GREEN `/admin/sample/issues?filter=non-member` whole-screen DOM comparison proving no settings cog, no `.mass-update-wrap`, no `.mass-update-check`, no `.labels-wrap .ybtn`, and otherwise preserved populated row/Excel/keymap/pagination DOM.

## 2026-07-01 Project Issue Milestone Menu Gate Follow-Up

- Restored the `issue/partial_list.scala.html` milestone tag gate so row milestones render only when the project milestone menu is enabled and the issue has a milestone.
- Scope: `frontend/src/routes/$ownerName/$projectName/issues.tsx` now threads the loaded project container menu setting into issue rows and applies the same condition as the legacy template.
- Verification: `frontend/tests/project-issues-empty.e2e.ts` includes the RED-to-GREEN `/admin/sample/issues?filter=no-milestone-menu` whole-screen DOM comparison proving both the hidden project Milestone menu item and omitted row `.mileston-tag`.

## 2026-07-01 Project Issue Title Prefix Follow-Up

- Restored the `issue/partial_list.scala.html` title helper branch for leading bracketed title words, matching legacy `TemplateHelper.showHeaderWordsInBracketsIfExist` and `removeHeaderWords`.
- Scope: `frontend/src/routes/$ownerName/$projectName/issues.tsx` now preserves the full title in row `data-value`, renders one `.title-prefix` anchor with legacy `href="javascript:void(0)"` for each leading bracket prefix, and renders the remaining title in the normal issue title link.
- Verification: `frontend/tests/project-issues-empty.e2e.ts` includes the RED-to-GREEN `/admin/sample/issues?filter=prefix` whole-screen DOM comparison proving `.title-prefix`, stripped title text, title-wrap order, mass-update toolbar, Excel action, keymap trigger, and pagination.

## 2026-07-01 Project Issue Open Due Date Follow-Up

- Restored the open, not-overdue `issue/partial_list.scala.html` due-date branch where the tooltip title keeps the absolute date while visible text uses legacy `issue.until`.
- Scope: `frontend/src/auth-workspace-client.ts` exposes optional `dueDateText`; `frontend/src/routes/$ownerName/$projectName/issues.tsx` uses it only for open non-overdue issue rows, preserving overdue and closed-row copy.
- Verification: `frontend/tests/project-issues-empty.e2e.ts` includes the RED-to-GREEN `/admin/sample/issues?filter=upcoming` whole-screen DOM comparison proving the relative due-date text, absolute tooltip title, neutral due-date class, mass-update toolbar, Excel action, keymap trigger, and pagination.

## 2026-07-01 Project Issue Mass Update Toolbar Follow-Up

- Restored the visible `issue/partial_massupdate.scala.html` toolbar in the flat project issue list for non-empty member-visible issue lists, including `#mass-update-form`, `#check-all`, state/assignee/milestone/attach-label/detach-label dropdown shells, disabled buttons, label category/divider rows, and the multi-row sort filter branch from `partial_list_wrap.scala.html`.
- Scope: `frontend/src/routes/$ownerName/$projectName/issues.tsx` derives the toolbar's visible options from the loaded issue list REST items for this screen; mutation behavior remains on the existing REST/TanStack mass-update boundary and is not re-proved by this DOM slice.
- Verification: `frontend/tests/project-issues-empty.e2e.ts` now includes the RED-to-GREEN `/admin/sample/issues?filter=bulk` whole-screen DOM comparison for the multi-row toolbar/filter state.

## 2026-07-01 Project Issue Draft Row Follow-Up

- Restored the `issue/partial_list_draft.scala.html` caller state in the flat project issue list: unfiltered open page 1 renders `draftItems` before normal issue rows and shows the legacy `.draft-number` `#Draft` marker.
- Scope: `frontend/src/routes/$ownerName/$projectName/issues.tsx` now applies the same visible-condition gate from `partial_list_wrap.scala.html` (`pageNum == 1`, open state, no active filters) before rendering draft rows.
- Verification: `frontend/tests/project-issues-empty.e2e.ts` includes the RED-to-GREEN `/admin/sample/issues` whole-screen DOM comparison proving draft-before-normal ordering, row id/data hooks, and the `#Draft` marker.

## 2026-06-27 Issue Detail Layout Follow-Up

- Moved project issue detail shell ownership into `frontend/src/routes/$owner/$projectName/route.tsx` for `/issue/:issueNumber`, keeping the issue menu active, detail keymap mode, and `issue-detail-page` shell CSS hook.
- Scope: `frontend/src/routes/-issue-views.tsx` adds `renderShell={false}` for `ProjectIssueDetailPage`; the issue detail leaf route passes that flag while retaining the existing REST detail/comment/action/metadata boundaries.
- Verification: `pnpm --dir frontend exec tsc --noEmit`; `pnpm --dir frontend exec vitest run src/issue-detail-shell.spec.tsx`.

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
| `/:owner/:project/issues` | Project issue list renders state tabs, side filters, due date, label/milestone/assignee filters, two-column and subtask toggles. | Project layout owns the header/menu/page-wrap shell with active issue menu, list keymap, and `issue-list-page`; the flat route renders state tabs, side filters, advanced filter shell, due date input, label management action, two-column/subtask toggles, comment/vote/sharer counts, weighted row arrows, closed-row due-date styling, and state-preserving Excel export. | covered | `frontend/src/routes/$owner/$projectName/route.tsx`, `frontend/src/routes/$owner/$projectName/issues/route.tsx`, `frontend/src/routes/-issue-views.tsx`, `frontend/src/issue-list-filter.spec.tsx` |
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
| parent/subtask selectors | Legacy parent selection and child issue rendering. | Form uses `parentIssueOptions`; project list rows render `partial_list_subtask.scala.html` child progress/parent backlink and `partial_view_childIssueListOnly.scala.html` hidden child rows, and detail renders child issue lists. | covered | none |
| issue detail header/actions | Legacy renders favorite, watch, share, vote/voters, weight, translate, edit/show-original, delete modal. | Project layout owns the header/menu/page-wrap shell with active issue menu, detail keymap, and `issue-detail-page`; `ProjectIssueDetailPage` renders those action shells under the outlet and wires REST mutations. `frontend/tests/issue-detail-parity.e2e.ts` now clicks favorite, `#watch-button`, `#vote`, `#issue-share-button`, and `#deleteConfirm`, asserts visible state changes, CSRF headers, REST POST/DELETE paths, delete cancel/confirm modal behavior, and post-delete redirect to the issue list. | covered in current follow-up | `frontend/src/routes/$owner/$projectName/route.tsx`, `frontend/src/routes/$owner/$projectName/issue/$issueNumber/route.tsx`, `frontend/src/routes/-issue-views.tsx`, `frontend/src/issue-detail-shell.spec.tsx` |
| issue detail sidebar metadata | Legacy sidebar inline-updates assignee, milestone, due date, labels, and new-subtask link. | Detail renders `#issueUpdateForm`, hidden `issues[0].id`, assignee form, milestone select, due-date input, and label select; milestone/due-date/label changes post through single-issue REST mass-update and reload detail. `frontend/tests/issue-detail-parity.e2e.ts` now changes milestone and due date from the browser-visible sidebar and asserts `POST /api/v1/projects/:owner/:project/issues/mass-update` payloads, while also proving the legacy `#labelIds` selected/options shell is present. | covered in current follow-up | none |
| comments | Legacy comment list, edit/delete, vote/unvote, new-issue-by-comment, disabled comment box. | Current detail renders these shells and REST mutations. | covered | none |
| child comments | Legacy one-line child comments and `parentCommentId` form. | Current groups child comments, renders one-line comments, delete, and submit form. | covered | none |
| timeline rows | Legacy timeline renders rich event rows with distinct sender/target links and resource-specific labels. | REST timeline projection now carries additive sender labels, target user labels, and resource href/label/title values where raw issue events support them; `IssueTimelineEvent` renders legacy message text with distinct sender, assignee/sharer, milestone, commit, pull-request, moved-project, and label nodes instead of one sentence-wide link. `frontend/tests/issue-detail-parity.e2e.ts` now browser-proves state/label/assignee event rows, sender/target hrefs, hidden body-change events, and absence of visible `issue.event.*` raw keys. | covered in current follow-up | none |
| sharer panel | Legacy sharer list/search/share controls. | Current `IssueSharerPanel` renders sharer list, hidden `issueSharer`, autocomplete, share/unshare REST callbacks. | covered | none |
| `@` / `#` autocomplete | Legacy At.js mention and issue reference helpers. | `IssueMentionTextarea` detects and inserts mention/reference suggestions; specs cover search and insertion. | covered | none |
| paste/drop attachments | Legacy file uploader supports issue/comment upload zones and editor integration. | Textarea paste/drop uploads image and non-image files; image uploads insert image Markdown and non-image uploads insert normal link Markdown. Issue body and new-comment editors now also render the legacy `.upload-wrap.content-footer`, `.attach-wrap`, upload button/input, `.attached-files.unstyled`, and attach-on-save help shell while keeping REST JSON submit boundaries. `frontend/tests/issue-detail-parity.e2e.ts` proves issue comment paste/drop image uploads insert Markdown, send CSRF-backed `/files` requests, and submit REST comment JSON with attachment ids. | covered in current follow-up | none |
| Markdown source rendering | Legacy renders issue/comment Markdown. | `MarkdownRenderer` renders issue/comment source with tasklist, mention/reference handling and sanitizer coverage. | covered | none |
| Markdown preview tabs | Legacy preview tab renders Markdown preview. | `LegacyMarkdownEditorShell` and the issue comment form render Markdown preview content through `MarkdownRenderer` while preserving `a[data-mode=preview]` tab selectors. `frontend/tests/issue-detail-parity.e2e.ts` now types Markdown into the browser-visible issue comment editor, clicks the preview tab, and asserts rendered `<strong>` content in `#preview-comment-body`. | covered in current follow-up | none |
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
