# Label Provenance

## Scope

- Phase 2B project issue label/category management parity.
- Covers label/category list, create, update, delete, labelsform surface, legacy direct JSON/form routes, and label CSS.
- `copyLabels` remains Phase 6 follow-up scope.

## Legacy Sources

- `yona-original/app/controllers/IssueLabelApp.java`
- `yona-original/app/views/project/issuelabels.scala.html`
- `yona-original/app/views/project/partial_issuelabels_list.scala.html`
- `yona-original/app/views/project/partial_issuelabels_editlabel.scala.html`
- `yona-original/app/views/project/partial_issuelabels_editcategory.scala.html`
- `yona-original/app/views/common/issueLabelColor.scala.html`
- `yona-original/app/models/IssueLabel.java`
- `yona-original/app/models/IssueLabelCategory.java`

## Phase 2B Evidence

| Legacy source                                                                 | Intent                                                                          | Rust translation target                                              |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `IssueLabelApp.labels`                                                        | readable project viewers can list labels as JSON/PJAX                           | `ListProjectLabels` RPC + direct `GET /:owner/:project/issue/labels` |
| `IssueLabelApp.labelsForm` and `issuelabels.scala.html`                       | project update viewers can manage labels from the project settings label editor | `frontend/src/routes/$owner/$projectName/issue/labelsform/route.tsx` |
| `IssueLabelApp.newLabel`                                                      | create label, reuse existing category, return 204 on duplicate                  | `CreateProjectLabel` RPC + direct POST form route                    |
| `IssueLabelApp.update/delete`                                                 | update/delete labels with project update/delete authority                       | `UpdateProjectLabel` / `DeleteProjectLabel` RPC and direct routes    |
| `IssueLabelApp.categories/category/newCategory/updateCategory/deleteCategory` | category CRUD with duplicate-name protection                                    | label category RPCs and direct category routes                       |
| `issueLabelColor.scala.html`                                                  | generate label CSS with readable foreground color                               | direct `GET /:owner/:project/issue/labels.css`                       |

## Remaining Follow-ups

- `copyLabels` stays Phase 6 because `SPEC.md` classifies label copy as later scope.
- REST `/-_-api/v1` label/project API parity stays with the REST API packet.
