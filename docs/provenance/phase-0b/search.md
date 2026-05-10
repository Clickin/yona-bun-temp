# Search Provenance

## Scope

- Phase 5C app runtime search parity
- `global`, `organization`, `project` scope
- in-scope result types: `issue`, `user`, `project`, `posting`, `milestone`, `issue_comment`, `posting_comment`, `review_comment`
- REST app contract only: `/api/v1/search`, `/api/v1/projects/:owner/:project/search`, `/api/v1/organizations/:organization/search`
- fixed `pageSize=20`, required `keyword` and `searchType`, `auto` type resolution in legacy order

## Legacy Sources

- `yona-original/test/models/SearchTests.java`
- `yona-original/test/models/SearchResultTests.java`
- `yona-original/test/utils/AccessControlTest.java`
- `yona-original/app/controllers/SearchApp.java`

## Current Baseline And Canonical Target

- current mixed-code reference: `reference/mixed-code/frontend/src/lib/search-trpc.ts`, `reference/mixed-code/packages/domain/*search*`, `reference/mixed-code/packages/db/*search*`
- canonical implementation path: `repo root`
- canonical owner path: `frontend`, `crates/server`, `crates/search`, `crates/persistence`

## Extracted Intent

| Legacy source | Intent | Rust translation target |
| --- | --- | --- |
| `SearchApp.searchInAll`, `searchInAGroup`, `searchInAProject` | search is query-driven and exposed at `global`, `organization`, `project` scopes | `/api/v1` REST handlers in `crates/server`, route/UI handling in `frontend` |
| `SearchTests.findUsersBy*` | `user` search matches query text and narrows by scope | `crates/search` query service + `crates/persistence` search repo |
| `SearchTests.*findProjects*` | `project` search is permission filtered and visibility aware | `crates/search` query service + `crates/persistence` search repo |
| `SearchTests.*findIssues*` | `issue` search preserves readable-result semantics across visibility states | `crates/search` query service + `crates/persistence` search repo |
| `SearchTests.*findPosts*` | `posting` search keeps readable-result semantics | `crates/search` query service + `crates/persistence` search repo |
| `search/partial_milestones.scala.html` | `milestone` search renders milestone result links and snippets | `crates/persistence` milestone projection + shared frontend search view |
| `search/partial_issue_comments.scala.html`, `partial_post_comments.scala.html` | comment search returns legacy anchor links into issue/post comments | `crates/persistence` comment projections + shared frontend search view |
| `SearchTests.*findReviews*` | `review_comment` search remains permission filtered across the same scopes | `crates/search` query service + `crates/persistence` search repo |
| `SearchResultTests.makeSnipet`, `merge_overlap` | snippet generation preserves keyword-centered excerpt behavior and overlap merge behavior | snippet helper test in `crates/search` |
| `AccessControlTest.*` | result inclusion must respect the same read boundary as project and issue visibility | ACL-backed filter reuse in `crates/search` and `crates/domain` |
| `search/partial_search.scala.html` | legacy classes, tabs, badges, form ids, result title, empty result, and pagination anchors stay visible | `frontend/src/routes/-search-views.tsx`, `frontend/tests/search-parity.e2e.ts` |

## Explicit Deferrals

- full-text index or external search engine
- async indexing
- ranking beyond legacy sort order
- broader AI-facing or machine-facing search surfaces
- legacy external `/-_-api/v1/**` search compatibility unless the separate migrator/export scope requires it

이 항목들은 Phase 5C app runtime parity 밖의 `deferred` scope다.
