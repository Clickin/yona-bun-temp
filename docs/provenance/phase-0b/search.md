# Search Provenance

## Scope

- bounded internal search exemplar only
- `global`, `organization`, `project` scope
- in-scope result types: `user`, `project`, `issue`, `posting`, `review_comment`
- deferred result types: `issue_comment`, `posting_comment`, `milestone`

## Legacy Sources

- `yona-original/test/models/SearchTests.java`
- `yona-original/test/models/SearchResultTests.java`
- `yona-original/test/utils/AccessControlTest.java`
- `yona-original/app/controllers/SearchApp.java`

## Current Baseline And Canonical Target

- current mixed-code reference: `frontend/src/lib/search-trpc.ts`, `packages/domain/*search*`, `packages/db/*search*`
- canonical implementation path: `yona-rust/`
- canonical owner path: `yona-rust/frontend`, `yona-rust/crates/server`, `yona-rust/crates/search`, `yona-rust/crates/persistence`

## Extracted Intent

| Legacy source | Intent | Rust translation target |
| --- | --- | --- |
| `SearchApp.searchInAll`, `searchInAGroup`, `searchInAProject` | bounded search is query-driven and exposed at `global`, `organization`, `project` scopes | query contract in `yona-rust/proto`, route/UI handling in `yona-rust/frontend` |
| `SearchTests.findUsersBy*` | `user` search matches query text and narrows by scope | `yona-rust/crates/search` query service + `yona-rust/crates/persistence` search repo |
| `SearchTests.*findProjects*` | `project` search is permission filtered and visibility aware | `yona-rust/crates/search` query service + `yona-rust/crates/persistence` search repo |
| `SearchTests.*findIssues*` | `issue` search preserves readable-result semantics across visibility states | `yona-rust/crates/search` query service + `yona-rust/crates/persistence` search repo |
| `SearchTests.*findPosts*` | `posting` search keeps readable-result semantics | `yona-rust/crates/search` query service + `yona-rust/crates/persistence` search repo |
| `SearchTests.*findReviews*` | `review_comment` search remains permission filtered across the same scopes | `yona-rust/crates/search` query service + `yona-rust/crates/persistence` search repo |
| `SearchResultTests.makeSnipet`, `merge_overlap` | snippet generation preserves keyword-centered excerpt behavior and overlap merge behavior | snippet helper test in `yona-rust/crates/search` |
| `AccessControlTest.*` | result inclusion must respect the same read boundary as project and issue visibility | ACL-backed filter reuse in `yona-rust/crates/search` and `yona-rust/crates/domain` |

## Explicit Deferrals

- `issue_comment`
- `posting_comment`
- `milestone`
- type-specific result counts
- broader AI-facing or machine-facing search surfaces

이 항목들은 bounded exemplar 밖의 `deferred` scope다.
