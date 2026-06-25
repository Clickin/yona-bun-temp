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
| `/projects?pageNum>1` | Legacy renders pagination controls into `#pagination`. | Current slices page data but renders only empty `<div id="pagination">`. | gap | `frontend/src/routes/-directory-views.tsx`, focused directory pagination spec |
| `/orgs` | Org directory has tabs, search, empty state, org rows, created timestamp, pagination. | `OrganizationDirectoryPage` keeps tabs/search/empty/list but omits created timestamp and renders empty `#pagination`. | gap | `frontend/src/routes/-directory-views.tsx`, org directory view model/API if `createdLabel` is missing |
| `/projectform` | Legacy validates empty/invalid/reserved names, trims spaces to hyphens, hides protected scope for user owners, shows SVN warning, enforces code/PR/review coupling. | `ProjectNewPage` renders form and REST submit, but lacks those client state/validation behaviors. | gap | `frontend/src/routes/-project-views.tsx`, `frontend/src/project-create-parity.spec.tsx` |
| `/_import` | Empty URL shows `project.import.error.empty.url` before submit. | `ProjectImportPage` renders shell and REST submit, but client-side empty URL validation is absent. | gap | `frontend/src/routes/-project-views.tsx`, `frontend/src/project-import-parity.spec.tsx` |
| `/organizations/new` | Legacy validates org name and shows `organization.name.alert`. | `OrganizationNewPage` applies the same regex and warning span. | covered | none |
| `/organizations/:org` | Header/menu/enroll dropdown, home project list, side panes, create-project CTA to `/projectform?owner=:org`. | Header/menu/enroll/list/side panes render; create-project CTA points to `/projects/new?owner=:org` and relies on redirect. | deviation | `frontend/src/routes/-organization-views.tsx` |
| `/organizations/:org` project filter | Legacy `data-toggle="item-search"` filters project rows by `data-value`. | Data attrs exist, but no browser proof filtering hides/shows rows. | gap | focused Playwright first; likely `frontend/src/routes/-organization-views.tsx` |
| `/organizations/:org` leave | Legacy `#groupLeaveBtn` opens `#alertLeave`; only `#leaveBtn` confirms DELETE. | Current `#groupLeaveBtn` calls mutation immediately; no confirmation modal. | gap | `frontend/src/routes/-organization-views.tsx`, org home interaction spec |
| `/organizations/:org/settingform` logo upload | Invalid non-image shows `project.logo.alert`; valid image submits form immediately. | Invalid warns and valid temp preview exists, but Save drops `logoAttachmentId` before REST update. | gap | `frontend/src/auth-workspace-client.ts`, `frontend/src/routes/-organization-views.tsx`, logo upload contract/spec |
| `/organizations/:org/members` add/typeahead | Legacy typeahead against users endpoint and form submit adds member. | Current has `data-provider="typeahead"` and REST add, but no implemented typeahead behavior was found. | gap | `frontend/src/routes/-organization-views.tsx`, user search API/client if absent |
| `/organizations/:org/members` role/delete/enrollment | Legacy role dropdown, delete modal, enrolled-user Add, member list. | Current renders role dropdown, delete modal, enrollment Add, and REST mutations; backend contract covers add/role/delete/accept. | covered | none |
| `/organizations/:org/members` delete cancel | Legacy Bootstrap modal closes on `data-dismiss`. | React modal opens via state, but close/No buttons do not clear `deleteTarget`; cancel state is not proven. | gap | `frontend/src/routes/-organization-views.tsx`, focused Playwright scenario |
| `/organizations/:org/deleteForm` | Delete button opens `#alertDeletion`; Yes deletes and redirects, No closes. | `OrganizationDeletePage` renders confirm modal and REST delete redirect. | covered | none |

## Playwright Scenario Rows

| path | state | legacy selector/copy | Rust selector/copy | interaction | API/direct boundary | status |
| --- | --- | --- | --- | --- | --- | --- |
| `/projects` | empty directory | `.error-wrap .ico-err1`, `project.is.empty`, `input[name=filter]` | same selectors/copy | submit no-match filter | projects REST list plus React filter | covered |
| `/projects?pageNum=2` | more than one page | `#pagination` populated | empty `#pagination` only | click next/previous/page | React route `pageNum` | gap |
| `/orgs` | listed orgs | org row includes created label and `#pagination` | row lacks created label; empty `#pagination` | inspect metadata and page controls | organizations REST list | gap |
| `/projectform` | invalid project name | popover on `[name=name]` with legacy alert | no client validation before submit | submit empty/invalid/reserved; change owner; select SVN | create project REST | gap |
| `/_import` | empty URL | popover with `project.import.error.empty.url` | no client validation before submit | submit empty URL | import REST | gap |
| `/organizations/new` | invalid name | `span.msg.wrongName` | same warning | submit invalid | create org REST only after valid state | covered |
| `/organizations/:org` | admin home | `#mylist-filter`, project rows, `/projectform?owner=:org` CTA | data attrs present; CTA is `/projects/new?owner=:org` | type filter; inspect CTA | org container REST | deviation |
| `/organizations/:org` | member leave | `#groupLeaveBtn` opens `#alertLeave`; `#leaveBtn` confirms | immediate mutation; modal absent | click Leave, then No/Yes | leave organization REST | gap |
| `/organizations/:org/settingform` | logo upload | `#logoPath`, invalid warning, valid auto-submit | invalid warning; preview; save drops `logoAttachmentId` | choose invalid/valid file, save | temp upload plus PATCH org | gap |
| `/organizations/:org/members` | add/typeahead/delete | typeahead input, enroll accept, delete modal | selectors render; typeahead/cancel not proven | type query; accept; delete No/Yes | members/enrollments REST | gap |
| `/organizations/:org/deleteForm` | delete confirm | `#btnDelete`, `#alertDeletion`, `#btnDeleteExec` | same ids/copy and close state | open modal, No, Yes | delete org REST | covered |

