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
- `yona-original/app/models/Search.java`

## Current Baseline And Canonical Target

- current mixed-code reference: `reference/mixed-code/frontend/src/lib/search-trpc.ts`, `reference/mixed-code/packages/domain/*search*`, `reference/mixed-code/packages/db/*search*`
- canonical implementation path: `repo root`
- canonical owner path: `frontend`, `crates/server`, `crates/search`, `crates/persistence`

## Deferred Index Evidence Note

- `SPEC.md` FG-12 records global, project, and organization search as implemented for Phase 5C app runtime parity, with fixed `pageSize=20`, required `keyword`/`searchType`, legacy `auto` type order, legacy pagination shell, ACL-aware filtering, snippet behavior, and lightweight relevance ordering.
- `docs/agents/06-phase-plan.md` Phase 5C records the same implemented surface and keeps full-text/index-backed search, async indexing, and index-backed ranking beyond the lightweight scorer as remaining search follow-ups.
- Therefore the current app behavior is intentionally the REST query-backed app search surface listed in this document. This note does not change runtime behavior and does not replace the lightweight scorer with a new search architecture.
- Legacy evidence currently listed for this boundary is `yona-original/app/controllers/SearchApp.java`, `yona-original/app/models/Search.java`, `yona-original/test/models/SearchTests.java`, `yona-original/test/models/SearchResultTests.java`, `yona-original/test/utils/AccessControlTest.java`, and the `yona-original/app/views/search/*.scala.html` partials referenced below.

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
| `Search.findUsers`, `findProjects`, `findIssues`, `findPosts`, `findMilestones`, `findIssueComments`, `findPostComments`, `findReviews` | legacy result lists use type-specific baseline order: users/projects by name ascending, milestones by due date descending, issues/posts/comments/reviews by created date descending | `crates/search` relevance score/rank helpers preserve lightweight relevance first and the legacy baseline order for ties; persistence/server wiring remains outside this slice |
| `AccessControlTest.*` | result inclusion must respect the same read boundary as project and issue visibility | ACL-backed filter reuse in `crates/search` and `crates/domain` |
| `search/partial_search.scala.html`, `SearchApp` invalid-query/project-type branches, `error/badrequest_default.scala.html` | legacy classes, tabs, badges, form ids, result title, empty result, pagination anchors, and common `error.badrequest` shell for invalid/missing query parameters, project-scoped `searchType=project`, and non-forbidden/non-not-found REST query failures stay visible without temporary `Search failed.` copy | `frontend/src/routes/-search-views.tsx`, `frontend/src/routes/-shared.tsx`, `frontend/tests/search-parity.e2e.ts` |

## Explicit Deferrals

- full-text index or external search engine
- async indexing
- ranking beyond the current lightweight title/body hit-count scorer and legacy-order tie-breaker
- broader AI-facing or machine-facing search surfaces
- legacy external `/-_-api/v1/**` search compatibility unless the separate migrator/export scope requires it

이 항목들은 Phase 5C app runtime parity 밖의 `deferred` scope다.

## Bounded Future Split

- Search index design evidence: after current parity scope, identify whether legacy Yona used DB query matching, Lucene/Elasticsearch, or another index path for each result type, and record the source paths before any implementation.
- Index-backed runtime slice: only after that evidence pass, add a bounded `crates/search` + `crates/persistence` implementation plan for index storage, update/delete indexing, backfill/rebuild, and ranking parity; keep `/api/v1` response shape, legacy result UI, scopes, ACL filtering, and the current lightweight scorer contract as the fallback baseline.
- Legacy external compatibility: keep `/-_-api/v1/**` search work separate and only attach it to migrator/export/import scope if that scope requires it.
