# UI Parity Report: Directory Organization

Status: explorer report
Date: 2026-06-26
Packet: `ui-parity-directory-organization`
Agent: `019effaa-2dc0-7231-8af5-8804caf07703` (`Godel`)
Mode: read-only audit, no files edited by the explorer

## Evidence Checked

Legacy evidence:

- `yona-original/app/views/project/list.scala.html`
- `yona-original/app/views/project/create.scala.html`
- `yona-original/app/views/organization/list.scala.html`
- `yona-original/app/views/organization/create.scala.html`
- `yona-original/app/views/organization/view.scala.html`
- `yona-original/app/views/organization/header.scala.html`
- `yona-original/app/views/organization/menu.scala.html`
- `yona-original/app/views/organization/members.scala.html`
- `yona-original/app/views/organization/setting.scala.html`
- `yona-original/app/views/organization/deleteForm.scala.html`
- legacy JS `yobi.project.New.js`, `yobi.organization.New.js`, `yobi.organization.View.js`, `yobi.organization.Member.js`, `yobi.organization.Setting.js`

Current evidence:

- `frontend/src/routes/-directory-views.tsx`
- `frontend/src/routes/-organization-views.tsx`
- `frontend/src/routes/projectform/route.tsx`
- `frontend/src/routes/projects/new/route.tsx`
- `frontend/src/routes/[_]import/route.tsx`
- `frontend/src/routes/orgs/route.tsx`
- `frontend/src/routes/projects/route.tsx`
- `frontend/src/routes/organizations/**`
- `frontend/src/api/org-project.ts`
- `frontend/src/auth-workspace-client.ts`
- `frontend/src/app-view-models.ts`
- `crates/server/src/routes/projects/organizations.rs`
- `crates/server/tests/rest_contract.rs`
- `output/playwright/visual-sweep/latest.json`

## Result Rows

| path | legacy evidence | current evidence | status | proposed owner |
| --- | --- | --- | --- | --- |
| `/projects` | Project directory has project/org tabs, `filter` search, empty state, project rows, pagination. | `ProjectDirectoryPage` keeps tabs/search/empty/list copy and client `pageNum` slice. | covered | none |
| `/projects?pageNum>1` | Legacy renders pagination controls into `#pagination`. | `ProjectDirectoryPage` now renders the legacy `.page-navigation-wrap` / `.page-nums` / prev-next/page-input shell from React while preserving client `pageNum` slicing and filter query links. | covered in follow-up | `frontend/src/routes/-directory-views.tsx`, `frontend/src/route-parity.spec.tsx` |
| `/orgs` | Org directory has tabs, search, empty state, org rows, created timestamp, pagination. | `OrganizationDirectoryPage` now renders `created <strong title=...>` from REST `createdLabel` and the same legacy pagination shell as `/projects`. | covered in follow-up | `crates/server/src/routes/projects/organizations.rs`, `frontend/src/app-view-models.ts`, `frontend/src/routes/-directory-views.tsx`, `frontend/src/route-parity.spec.tsx` |
| `/projectform` | Legacy validates empty/invalid/reserved names, trims spaces to hyphens, hides protected scope for user owners, shows SVN warning, enforces code/PR/review coupling. | `ProjectNewPage` renders form and REST submit, but lacks those client state/validation behaviors. | gap | `frontend/src/routes/-project-views.tsx`, `frontend/src/project-create-parity.spec.tsx` |
| `/_import` | Empty URL shows `project.import.error.empty.url` before submit. | `ProjectImportPage` renders shell and REST submit, but client-side empty URL validation is absent. | gap | `frontend/src/routes/-project-views.tsx`, `frontend/src/project-import-parity.spec.tsx` |
| `/organizations/new` | Legacy validates org name and shows `organization.name.alert`. | `OrganizationNewPage` applies the same regex and warning span. | covered | none |
| `/organizations/:org` | Header/menu/enroll dropdown, home project list, side panes, create-project CTA to `/projectform?owner=:org`. | Header/menu/enroll/list/side panes render, and the CTA now points directly to `/projectform?owner=:org`. | covered in current follow-up | `frontend/src/organization-home-parity.spec.tsx` |
| `/organizations/:org` project filter | Legacy `data-toggle="item-search"` filters project rows by `data-value`. | React state now filters visible project rows from the same project name/overview text. | covered in current follow-up | `frontend/src/routes/-organization-views.tsx`, `frontend/src/organization-home-parity.spec.tsx`; browser e2e remains useful but not required for the source-level closure |
| `/organizations/:org` leave | Legacy `#groupLeaveBtn` opens `#alertLeave`; only `#leaveBtn` confirms DELETE. | `#groupLeaveBtn` now opens a React-controlled `#alertLeave` modal and only `#leaveBtn` calls the leave callback. | covered in current follow-up | `frontend/src/routes/-organization-views.tsx`, `frontend/src/organization-home-parity.spec.tsx` |
| `/organizations/:org/settingform` logo upload | Invalid non-image shows `project.logo.alert`; valid image submits form immediately. | Invalid warns and valid temp preview exists; Save now preserves `logoAttachmentId` through the REST update body. Legacy auto-submit timing still needs browser proof if treated as exact interaction parity. | covered in current follow-up with weak browser evidence | `frontend/src/auth-workspace-client.ts`, `frontend/src/api/org-project.ts`, `frontend/src/auth-workspace-client.spec.ts` |
| `/organizations/:org/members` add/typeahead | Legacy typeahead against users endpoint and form submit adds member. | Current has `data-provider="typeahead"` and REST add, but no implemented typeahead behavior was found. | gap | `frontend/src/routes/-organization-views.tsx`, user search API/client if absent |
| `/organizations/:org/members` role/delete/enrollment | Legacy role dropdown, delete modal, enrolled-user Add, member list. | Current renders role dropdown, delete modal, enrollment Add, and REST mutations; backend contract covers add/role/delete/accept. | covered | none |
| `/organizations/:org/members` delete cancel | Legacy Bootstrap modal closes on `data-dismiss`. | Close and No buttons now clear the React `deleteTarget` state while keeping legacy modal IDs/copy. | covered in current follow-up | `frontend/src/routes/-organization-views.tsx`, `frontend/src/organization-home-parity.spec.tsx` |
| `/organizations/:org/deleteForm` | Delete button opens `#alertDeletion`; Yes deletes and redirects, No closes. | `OrganizationDeletePage` renders confirm modal and REST delete redirect. | covered | none |

## Playwright Scenario Rows

| path | state | legacy selector/copy | Rust selector/copy | interaction | API/direct boundary | status |
| --- | --- | --- | --- | --- | --- | --- |
| `/projects` | empty directory | `.error-wrap .ico-err1`, `project.is.empty`, `input[name=filter]` | same selectors/copy | submit no-match filter | projects REST list plus React filter | covered |
| `/projects?pageNum=2` | more than one page | `#pagination.page-navigation-wrap`, `.page-nums`, prev/next icons, `input[name=pageNum]` | same selectors rendered by React | click next/previous/page | React route `pageNum` | covered in follow-up |
| `/orgs` | listed orgs | org row includes created label and `#pagination` | same created label and pagination selectors rendered by React | inspect metadata and page controls | organizations REST list with `createdLabel` | covered in follow-up |
| `/projectform` | invalid project name | popover on `[name=name]` with legacy alert | no client validation before submit | submit empty/invalid/reserved; change owner; select SVN | create project REST | gap |
| `/_import` | empty URL | popover with `project.import.error.empty.url` | no client validation before submit | submit empty URL | import REST | gap |
| `/organizations/new` | invalid name | `span.msg.wrongName` | same warning | submit invalid | create org REST only after valid state | covered |
| `/organizations/:org` | admin home | `#mylist-filter`, project rows, `/projectform?owner=:org` CTA | project filter state and direct `/projectform?owner=:org` CTA are present | type filter; inspect CTA | org container REST | covered in current follow-up |
| `/organizations/:org` | member leave | `#groupLeaveBtn` opens `#alertLeave`; `#leaveBtn` confirms | same modal IDs and confirm-only mutation structure | click Leave, then No/Yes | leave organization REST | covered in current follow-up |
| `/organizations/:org/settingform` | logo upload | `#logoPath`, invalid warning, valid auto-submit | invalid warning; preview; save sends `logoAttachmentId`; auto-submit timing still needs browser proof | choose invalid/valid file, save | temp upload plus PATCH org | covered in current follow-up with weak browser evidence |
| `/organizations/:org/members` | add/typeahead/delete | typeahead input, enroll accept, delete modal | selectors render; delete cancel state is now reset, but typeahead behavior remains open | type query; accept; delete No/Yes | members/enrollments REST | gap |
| `/organizations/:org/deleteForm` | delete confirm | `#btnDelete`, `#alertDeletion`, `#btnDeleteExec` | same ids/copy and close state | open modal, No, Yes | delete org REST | covered |
