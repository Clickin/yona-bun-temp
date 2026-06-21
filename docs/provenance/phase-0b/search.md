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
- P3-C external search API boundary is not applicable: `yona-original/conf/routes` exposes search only through `GET /search`, `GET /organizations/:organizationName/search`, and `GET /:user/:project/search`, while the legacy `/-_-api/v1/**` route block contains no search endpoint and `yona-original/app/controllers/api/` contains no `SearchApi` controller.
- Therefore the current app behavior is intentionally the REST query-backed app search surface listed in this document. This note does not change runtime behavior and does not replace the lightweight scorer with a new search architecture.
- Legacy evidence currently listed for this boundary is `yona-original/app/controllers/SearchApp.java`, `yona-original/app/models/Search.java`, `yona-original/test/models/SearchTests.java`, `yona-original/test/models/SearchResultTests.java`, `yona-original/test/utils/AccessControlTest.java`, and the `yona-original/app/views/search/*.scala.html` partials referenced below.
- P3-B DB-native FTS slice started on 2026-06-21. The legacy UX and app response shape remain unchanged: result tabs, scope/type resolution, ACL filtering, snippets, pagination, and the current lightweight relevance plus legacy-order fallback stay authoritative.
- Runtime search now has a conservative native candidate abstraction in `crates/persistence/src/repo/search.rs`: SQLite uses temporary FTS5 candidate tables, PostgreSQL attempts built-in `to_tsvector`/`plainto_tsquery`, and MySQL attempts `MATCH ... AGAINST` where the schema supports FULLTEXT indexes. Any unsupported native path or database error falls back to the existing literal scan path.
- Native FTS candidates participate in final inclusion together with the existing literal `keyword_matches` path. Literal matching remains in place so DB tokenization differences do not drop legacy `icontains`-style results, while DB-native matches can be returned when supported by the active dialect.

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

- persistent full-text index storage/backfill/update/delete orchestration beyond the current DB-native candidate slice
- async indexing only with future legacy/external evidence for that separate scope
- ranking beyond the current lightweight title/body hit-count scorer and legacy-order tie-breaker
- broader AI-facing or machine-facing search surfaces

이 항목들은 Phase 5C app runtime parity 밖의 `deferred` scope다.

## Bounded Future Split

- Search index design: partial DB-native candidate slice exists without external Elastic/OpenSearch dependency and without changing the legacy app search contract.
- Remaining index-backed runtime work: persistent DB-native index schema/backfill/update/delete orchestration can be added later only if it keeps `/api/v1` response shape, legacy result UI, scopes, ACL filtering, and the current lightweight scorer contract as the fallback baseline.
- Legacy external compatibility: retired as not applicable because no legacy `/-_-api/v1/**` search endpoint exists. Keep app search on `/api/v1/**` only unless new legacy evidence is found.
