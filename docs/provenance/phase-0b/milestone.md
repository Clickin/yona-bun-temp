# Milestone Provenance

## Scope

- Phase 2C project milestone management parity.
- Covers milestone list/detail/create/edit/delete/open/close, issue counts and progress, detail issue tabs, Markdown description rendering, attachment binding, and legacy direct mutation routes.
- REST `/-_-api/v1/.../milestones`, migration export/import, and search milestone result type remain follow-up packets.

## Legacy Sources

- `yona-original/app/controllers/MilestoneApp.java`
- `yona-original/app/models/Milestone.java`
- `yona-original/app/views/milestone/list.scala.html`
- `yona-original/app/views/milestone/view.scala.html`
- `yona-original/app/views/milestone/create.scala.html`
- `yona-original/app/views/milestone/edit.scala.html`
- `yona-original/app/views/milestone/partial_status.scala.html`
- `yona-original/public/javascripts/service/yobi.milestone.Write.js`
- `yona-original/public/javascripts/service/yobi.milestone.View.js`

## Phase 2C Evidence

| Legacy source                                                      | Intent                                                                                                                                         | Rust translation target                                                                                     |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `MilestoneApp.milestones` + `milestone/list.scala.html`            | readable project viewers can list open/closed/all milestones, sort by due date or completion rate, and see open/closed issue snippets          | `ListProjectMilestones` RPC, `frontend/src/routes/$owner/$projectName/milestones/route.tsx`                 |
| `MilestoneApp.newMilestone/newMilestoneForm` + `create.scala.html` | project update viewers can create milestones with title, Markdown contents, state, due date, and attachments; duplicate titles fail validation | `CreateProjectMilestone` RPC, direct `POST /:owner/:project/milestones`, `newMilestoneForm` route           |
| `MilestoneApp.editMilestone/editMilestoneForm` + `edit.scala.html` | project update viewers can edit title, Markdown contents, state, due date, and attachment bindings                                             | `UpdateProjectMilestone` RPC, direct `POST /:owner/:project/milestone/:id/edit`, `editform` route           |
| `MilestoneApp.deleteMilestone` + `Milestone.delete`                | delete nulls linked issue milestone references before deleting the milestone                                                                   | `DeleteProjectMilestone` RPC, direct `DELETE /:owner/:project/milestone/:id/delete`, repository transaction |
| `MilestoneApp.open/close`                                          | state toggle only changes milestone state and preserves linked issue states                                                                    | `OpenProjectMilestone`, `CloseProjectMilestone`, direct open/close routes                                   |
| `milestone/view.scala.html`                                        | detail shows due date, progress, Markdown contents, attachments, list/edit/delete/open-close actions, and open/closed/all issue tabs           | `ReadProjectMilestone` RPC and `frontend/src/routes/$owner/$projectName/milestone/$milestoneId/route.tsx`   |

## Verification

- `cargo test -p yona-rust-pilot-server --test milestone_contract`
- `pnpm --dir frontend build`
- `pnpm --dir frontend check`

## Remaining Follow-ups

- REST milestone API parity remains in the REST/API packet.
- Migration export/import milestone flows remain in the migration/export packet.
- Search `milestone` result type remains in the search packet.
