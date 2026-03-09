# Issue Provenance

## Scope

- First issue authorization exemplar only
- No issue create, read, update, delete implementation beyond this executable trace

## Legacy Sources

- `yona-original/test/controllers/IssueAppTest.java`
- `yona-original/test/models/IssueTest.java`
- `yona-original/app/controllers/IssueApp.java`

## Exemplar

The first issue provenance trace for this batch is the edit matrix in `IssueAppTest`.

| Legacy source                  | Intent                                                                                                                                                                  | Modern translation                             |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `IssueAppTest.testInit`        | on private `yobi/projectYobi`, `admin` is site admin, `yobi` is manager, `laziel` is member, and both `nori` (author) and `alecsiel` (assignee) are not project members | domain test fixture roles                      |
| `IssueAppTest.editByAuthor`    | author can edit own issue                                                                                                                                               | `packages/domain` issue authorization exemplar |
| `IssueAppTest.editByAssignee`  | assignee can edit even without project membership                                                                                                                       | `packages/domain` issue authorization exemplar |
| `IssueAppTest.editByManager`   | project manager can edit                                                                                                                                                | `packages/domain` issue authorization exemplar |
| `IssueAppTest.editByMember`    | project member can edit                                                                                                                                                 | `packages/domain` issue authorization exemplar |
| `IssueAppTest.editByAdmin`     | site admin can edit                                                                                                                                                     | `packages/domain` issue authorization exemplar |
| `IssueAppTest.editByNonmember` | nonmember cannot edit even when the project is switched to public; public visibility does not grant issue edit rights                                                   | `packages/domain` issue authorization exemplar |

## Batch Translation Rule

- The modern slice leaves an executable issue trace by adding a small domain authorization function plus a Red to Green test.
- No issue CRUD route, tRPC router, or page is started here.
- `IssueTest` remains cited as the broader later source for watchers, voters, assignees, and timeline semantics.

## Out Of Scope

- Issue creation
- Issue detail read
- Issue delete
- Watcher, voter, assignee, and timeline implementation
- Issue comments and API endpoints
