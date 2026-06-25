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

## Route Inventory Summary

Total rows: 18

| status | count |
| --- | ---: |
| covered | 14 |
| gap | 0 |
| deviation | 0 |
| deferred | 0 |
| not-applicable | 0 |
| weak evidence | 4 |
| needs-parent-decision | 0 |

## Result Inventory

| path | legacy evidence | current evidence | status | proposed owner |
| --- | --- | --- | --- | --- |
| `/projects` | Project directory has project/org tabs, `filter` search, empty state, project rows, pagination. | `ProjectDirectoryPage` keeps tabs/search/empty/list copy and client `pageNum` slice. | covered | none |
| `/projects?pageNum>1` | Legacy renders pagination controls into `#pagination`. | `ProjectDirectoryPage` now renders the legacy `.page-navigation-wrap` / `.page-nums` / prev-next/page-input shell from React while preserving client `pageNum` slicing and filter query links. | covered in follow-up | `frontend/src/routes/-directory-views.tsx`, `frontend/src/route-parity.spec.tsx` |
| `/projects`, `/orgs` browser pagination controls | Legacy directory pages expose pagination controls that preserve query state beyond page 1. | Static/source proof exists, but Playwright currently checks page-1/shell paths and does not drive real browser pagination controls, query preservation, or mobile usability for `#pagination.page-navigation-wrap`. | weak evidence | `frontend/tests/organization-directory-admin-parity.e2e.ts`, `frontend/tests/legacy-rendered-page-audit.e2e.ts`, `frontend/src/routes/-directory-views.tsx` |
| `/orgs` | Org directory has tabs, search, empty state, org rows, created timestamp, pagination. | `OrganizationDirectoryPage` now renders `created <strong title=...>` from REST `createdLabel` and the same legacy pagination shell as `/projects`. | covered in follow-up | `crates/server/src/routes/projects/organizations.rs`, `frontend/src/app-view-models.ts`, `frontend/src/routes/-directory-views.tsx`, `frontend/src/route-parity.spec.tsx` |
| `/projectform` | Legacy validates empty/invalid/reserved names, trims spaces to hyphens on `#project-name` focusout, hides protected scope for user owners, shows `#svn` warning for Subversion, hides/checks Pull Request menu for SVN, and enforces code/PR/review checkbox coupling in `yobi.project.New.js`. | `ProjectNewPage` now keeps the REST submit boundary while applying the same client validation/message keys, focusout normalization, owner/protected coupling, SVN warning/PR menu behavior, and code/PR/review checkbox coupling. Evidence: `frontend/src/routes/-project-views.tsx`, `frontend/src/project-create-parity.spec.tsx`. | covered in worker follow-up | none |
| `/projectform` browser validation/mutation | `project/create.scala.html` and `yobi.project.New.js` show visible validation, owner/scope coupling, SVN/menu coupling, and submit to project creation. | Unit/static proof exists, but Playwright currently checks anchors only and does not drive invalid/reserved-name validation, owner/scope coupling, SVN/menu coupling, or successful REST create redirect. | weak evidence | `frontend/tests/legacy-rendered-page-audit.e2e.ts`, focused project create/import E2E, `frontend/src/routes/-project-views.tsx` |
| `/_import` | Empty URL shows `project.import.error.empty.url` before submit via the same `yobi.project.New.js` module. | `ProjectImportPage` now runs the shared legacy validation before calling the import REST handler and renders the manual popover message for `[name=url]`; project-name focusout/validation and owner/menu coupling are shared with `/projectform`. Evidence: `frontend/src/routes/-project-views.tsx`, `frontend/src/project-import-parity.spec.tsx`. | covered in worker follow-up | none |
| `/_import` browser validation/mutation | `project/importing.scala.html` and import controllers expose empty URL validation, repo-auth toggle fields, import payload, and redirect/error states. | Unit/static proof exists, but Playwright currently checks anchors only and does not drive empty URL popover, repo-auth toggle visibility, REST import payload, or redirect/error behavior. | weak evidence | `frontend/tests/legacy-rendered-page-audit.e2e.ts`, focused project create/import E2E, `frontend/src/routes/-project-views.tsx` |
| `/organizations/new` | Legacy validates org name and shows `organization.name.alert`. | `OrganizationNewPage` applies the same regex and warning span. | covered | none |
| `/organizations/new` browser validation/mutation | `organization/create.scala.html`, `yobi.organization.New.js`, and `OrganizationApp` expose visible invalid-name warning and create redirect. | Source/static proof exists, but Playwright currently checks anchors only and does not drive invalid-name warning, raw-key absence, REST create payload, or post-create redirect. | weak evidence | `frontend/tests/organization-directory-admin-parity.e2e.ts`, `frontend/tests/legacy-rendered-page-audit.e2e.ts`, `frontend/src/routes/-organization-views.tsx` |
| `/organizations/:org` | Header/menu/enroll dropdown, home project list, side panes, create-project CTA to `/projectform?owner=:org`. | Header/menu/enroll/list/side panes render, and the CTA now points directly to `/projectform?owner=:org`. | covered in current follow-up | `frontend/src/organization-home-parity.spec.tsx` |
| `/organizations/:org` project filter | Legacy `data-toggle="item-search"` filters project rows by `data-value`. | React state now filters visible project rows from the same project name/overview text. | covered in current follow-up | `frontend/src/routes/-organization-views.tsx`, `frontend/src/organization-home-parity.spec.tsx`; browser e2e remains useful but not required for the source-level closure |
| `/organizations/:org` leave | Legacy `#groupLeaveBtn` opens `#alertLeave`; only `#leaveBtn` confirms DELETE. | `#groupLeaveBtn` now opens a React-controlled `#alertLeave` modal and only `#leaveBtn` calls the leave callback. | covered in current follow-up | `frontend/src/routes/-organization-views.tsx`, `frontend/src/organization-home-parity.spec.tsx` |
| `/organizations/:org/settingform` logo upload | Invalid non-image shows `project.logo.alert`; valid image submits form immediately. | Invalid still renders `project.logo.alert`; valid image uploads through the existing temp attachment REST boundary, updates the preview, preserves `logoAttachmentId`, and immediately calls the organization update handler with the new attachment id, matching legacy auto-submit timing without reintroducing a legacy form post. Evidence: `frontend/src/routes/-organization-views.tsx`, `frontend/src/route-parity.spec.tsx`. | covered in worker follow-up | none |
| `/organizations/:org/members` add/typeahead | Legacy `yobi.organization.Member.js` typeahead calls `/-_-api/v1/users?query=...`, consumes `info` HTML plus `loginId`, reuses cache when the prior range was complete, and the updater fills `#loginId` before form submit. | `OrganizationMembersPage` now renders a legacy `.typeahead.dropdown-menu` for `#loginId`, calls the existing legacy-compatible users endpoint through `searchLegacyMemberUsers`, preserves the cache reuse rule, selects `loginId` from a suggestion, and keeps add-member submission on the REST mutation boundary. Evidence: `frontend/src/routes/-organization-views.tsx`, `frontend/src/routes/organizations/$organizationName/members/route.tsx`, `frontend/src/api/users.ts`, `frontend/src/auth-workspace-client.ts`, `frontend/src/auth-workspace-client.spec.ts`, `frontend/src/organization-shell-i18n.spec.tsx`, `frontend/src/route-parity.spec.tsx`; backend contract already covers `/-_-api/v1/users` in `crates/server/tests/legacy_external_users_contract.rs`. | covered in worker follow-up | none |
| `/organizations/:org/members` role/delete/enrollment | Legacy role dropdown, delete modal, enrolled-user Add, member list. | Current renders role dropdown, delete modal, enrollment Add, and REST mutations; backend contract covers add/role/delete/accept. | covered | none |
| `/organizations/:org/members` delete cancel | Legacy Bootstrap modal closes on `data-dismiss` and renders `#alertDeletion` as `class="modal hide"` without `fade`. | Close and No buttons now clear the React `deleteTarget` state while keeping legacy modal IDs/copy and the same non-fade `modal hide` class. | covered in current follow-up | `frontend/src/routes/-organization-views.tsx`, `frontend/src/organization-home-parity.spec.tsx` |
| `/organizations/:org/deleteForm` | Delete button opens `#alertDeletion`; Yes deletes and redirects, No closes; legacy template renders the modal as `class="modal hide"` without `fade`. | `OrganizationDeletePage` renders the confirm modal with the legacy non-fade `modal hide` class and REST delete redirect. | covered in current follow-up | `frontend/src/routes/-organization-views.tsx`, `frontend/src/auth-workspace-shell.spec.tsx` |

## Playwright Scenario Matrix

| path | state | legacy selector/copy | Rust selector/copy | interaction | API/direct boundary | status |
| --- | --- | --- | --- | --- | --- | --- |
| `/projects` | empty directory | `.error-wrap .ico-err1`, `project.is.empty`, `input[name=filter]` | same selectors/copy | submit no-match filter | projects REST list plus React filter | covered |
| `/projects?pageNum=2` | more than one page | `#pagination.page-navigation-wrap`, `.page-nums`, prev/next icons, `input[name=pageNum]` | same selectors rendered by React | click next/previous/page | React route `pageNum` | covered in follow-up |
| `/orgs` | listed orgs | org row includes created label and `#pagination` | same created label and pagination selectors rendered by React | inspect metadata and page controls | organizations REST list with `createdLabel` | covered in follow-up |
| `/projectform` | invalid project name | popover on `[name=name]` with legacy alert, focusout normalization, owner/VCS/menu coupling | same message-key validation and coupling implemented in React before REST submit | submit empty/invalid/reserved; blur project name; change owner; select SVN | create project REST only after valid state | covered in worker follow-up |
| `/_import` | empty URL | popover with `project.import.error.empty.url` | same message-key validation implemented in React before REST submit | submit empty URL | import REST only after valid state | covered in worker follow-up |
| `/organizations/new` | invalid name | `span.msg.wrongName` | same warning | submit invalid | create org REST only after valid state | covered |
| `/organizations/:org` | admin home | `#mylist-filter`, project rows, `/projectform?owner=:org` CTA | project filter state and direct `/projectform?owner=:org` CTA are present | type filter; inspect CTA | org container REST | covered in current follow-up |
| `/organizations/:org` | member leave | `#groupLeaveBtn` opens `#alertLeave`; `#leaveBtn` confirms | same modal IDs and confirm-only mutation structure | click Leave, then No/Yes | leave organization REST | covered in current follow-up |
| `/organizations/:org/settingform` | logo upload | `#logoPath`, invalid warning, valid auto-submit | invalid warning plus valid temp upload immediately calls update with `logoAttachmentId` | choose invalid/valid file | temp upload plus organization update REST | covered in worker follow-up |
| `/organizations/:org/members` | add/typeahead/delete | typeahead input, legacy users endpoint, `info` rendering, loginId updater, enroll accept, delete modal `class="modal hide"` | same typeahead dropdown/update behavior plus existing enroll/delete modal state and non-fade modal class | type query; select suggestion; accept; delete No/Yes | legacy users JSON search plus members/enrollments REST | covered in worker follow-up |
| `/organizations/:org/deleteForm` | delete confirm | `#btnDelete`, `#alertDeletion`, `#btnDeleteExec`, non-fade `modal hide` class | same ids/copy, close state, and non-fade modal class | open modal, No, Yes | delete org REST | covered in current follow-up |
