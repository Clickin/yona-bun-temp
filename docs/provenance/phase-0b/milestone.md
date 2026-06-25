# Milestone Provenance

## Scope

- Phase 2C project milestone management parity.
- Covers milestone list/detail/create/edit/delete/open/close, issue counts and progress, detail issue tabs, React-side Markdown description rendering, attachment binding, create/edit image paste/drop upload, legacy direct mutation routes, and the app-owned legacy external milestone batch helper.
- Migration export/import remains a follow-up packet.

## Legacy Sources

- `yona-original/app/controllers/MilestoneApp.java`
- `yona-original/app/controllers/api/MilestoneApi.java`
- `yona-original/app/models/Milestone.java`
- `yona-original/app/views/milestone/list.scala.html`
- `yona-original/app/views/milestone/view.scala.html`
- `yona-original/app/views/milestone/create.scala.html`
- `yona-original/app/views/milestone/edit.scala.html`
- `yona-original/app/views/common/editor.scala.html`
- `yona-original/app/views/common/fileUploader.scala.html`
- `yona-original/app/views/milestone/partial_status.scala.html`
- `yona-original/public/javascripts/service/yobi.milestone.Write.js`
- `yona-original/public/javascripts/service/yobi.milestone.View.js`
- `yona-original/public/javascripts/common/yobi.Files.js`
- `yona-original/public/javascripts/common/yobi.Attachments.js`

## Phase 2C Evidence

| Legacy source                                                      | Intent                                                                                                                                         | Rust translation target                                                                                     |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `MilestoneApp.milestones` + `milestone/list.scala.html`            | readable project viewers can list open/closed/all milestones, sort by due date or completion rate, and see open/closed issue snippets          | `ListProjectMilestones` RPC, `frontend/src/routes/$owner/$projectName/milestones/route.tsx`                 |
| `MilestoneApp.newMilestone/newMilestoneForm` + `create.scala.html` | project update viewers can create milestones with title, Markdown contents, state, due date, and attachments; duplicate titles fail validation | `CreateProjectMilestone` RPC, direct `POST /:owner/:project/milestones`, `newMilestoneForm` route           |
| `MilestoneApp.editMilestone/editMilestoneForm` + `edit.scala.html` | project update viewers can edit title, Markdown contents, state, due date, and attachment bindings                                             | `UpdateProjectMilestone` RPC, direct `POST /:owner/:project/milestone/:id/edit`, `editform` route           |
| `MilestoneApp.deleteMilestone` + `Milestone.delete`                | delete nulls linked issue milestone references before deleting the milestone                                                                   | `DeleteProjectMilestone` RPC, direct `DELETE /:owner/:project/milestone/:id/delete`, repository transaction |
| `MilestoneApp.open/close`                                          | state toggle only changes milestone state and preserves linked issue states                                                                    | `OpenProjectMilestone`, `CloseProjectMilestone`, direct open/close routes                                   |
| `milestone/view.scala.html`                                        | detail shows due date, progress, Markdown contents, attachments, list/edit/delete/open-close actions, and open/closed/all issue tabs           | `ReadProjectMilestone` RPC returns `contentsMarkdown` with empty `contentsHtml`; `frontend/src/routes/$owner/$projectName/milestone/$milestoneId/route.tsx` renders the shared React Markdown renderer |
| `common.editor` + `common.fileUploader` + `yobi.Files` / `yobi.Attachments` | create/edit milestone contents support image paste/drop upload, insert `![name](url)`, and submit temporary attachment ids                     | `MarkdownAttachmentTextarea` in `ProjectMilestoneFormPage` plus `attachmentIds` in milestone create/update   |
| `MilestoneApi.newMilestone`                                        | legacy external import creates milestone batches with title/description/due_on/state, duplicate item payloads, and untrimmed title scalars     | `POST /-_-api/v1/owners/:owner/projects/:projectName/milestones`, `legacy_external_create_milestones`, raw-title repository persistence |

## Verification

- `cargo test -p yoram-server --test milestone_contract`
- `cargo test -p yoram-server --test rest_contract rest_project_routes_cover_directory_views_and_mutations`
- `pnpm --dir frontend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend exec vitest run src/board-milestone-parity.spec.tsx`
- `pnpm --dir frontend test:e2e -- tests/shell-routing-smoke.e2e.ts -g "project milestone .*image uploads|project milestone edit editor submits pasted image uploads"`

## UI Parity Closeouts

- 2026-06-26 milestone detail mass-update follow-up: `ProjectMilestoneDetailPage`
  now restores the legacy `issue.partial_massupdate.scala.html` option
  population for `#state`, `#assignee`, `#milestone`, `#attaching-label`, and
  `#detaching-label`, keeps checkbox selection in React, and calls the shared
  issue mass-update REST client from the milestone route before reloading
  milestone detail data. Focused coverage:
  `frontend/src/board-milestone-parity.spec.tsx`.

## Remaining Follow-ups

- Migration export/import milestone flows remain in the migration/export packet.
- React-rendered milestone issue-reference metadata (`title` / `data-issue-state`) is supplied through the shared Markdown reference metadata payload.

## Search Packet Closeout

- Phase 5C closes the `milestone` search result type for app runtime scope. The server projects milestone result links, snippets, scope/visibility filtering, counts, due-date labels, and legacy baseline ordering through `/api/v1/search`, `/api/v1/projects/:owner/:project/search`, and `/api/v1/organizations/:organization/search`; React renders milestone results with the legacy `search/partial_milestones.scala.html` meta shape by showing the project link when outside project scope plus `label.dueDate` and omitting author fallback/state metadata.
