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

- obsolete pre-Rust residual path, not reference: `reference/mixed-code/frontend/src/lib/search-trpc.ts`, `reference/mixed-code/packages/domain/*search*`, `reference/mixed-code/packages/db/*search*`
- canonical implementation path: `repo root`
- canonical owner path: `frontend`, `crates/server`, `crates/search`, `crates/persistence`

## Current Frontend Status

- 2026-07-01 flat route rebuild started with the global `/search` branch from `search/result.scala.html` and `search/partial_search.scala.html`.
- Covered rendered state: anonymous global `/search?keyword=missing&searchType=project` site-layout branch with the legacy breadcrumb, category list, `#searchInnerForm`, result title HTML, and `<div class="empty-result"></div>` from `partial_projects.scala.html`.
- React target: `frontend/src/routes/search.tsx`.
- Whole-screen evidence: `frontend/tests/search-global.e2e.ts`.
- Remaining frontend gap: project-scoped `/:owner/:project/search` and organization-scoped `/organizations/:organizationName/search` routes still need their own template-first rebuilds with `projectLayout` and `organizationLayout` shell evidence, plus populated result-row coverage for each legacy `search/partial_*.scala.html` branch.

## Deferred Index Evidence Note

- `SPEC.md` FG-12 records global, project, and organization search as implemented for Phase 5C app runtime parity, with fixed `pageSize=20`, required `keyword`/`searchType`, legacy `auto` type order, legacy pagination shell, ACL-aware filtering, snippet behavior, and lightweight relevance ordering.
- `docs/agents/06-phase-plan.md` Phase 5C records the same implemented surface. DB-native FTS candidate retrieval is now implemented, and query search is intentionally bounded to the configured DB's built-in FTS/query solution.
- P3-C external search API boundary is not applicable: `yona-original/conf/routes` exposes search only through `GET /search`, `GET /organizations/:organizationName/search`, and `GET /:user/:project/search`, while the legacy `/-_-api/v1/**` route block contains no search endpoint and `yona-original/app/controllers/api/` contains no `SearchApi` controller.
- Therefore the current app behavior is intentionally the REST query-backed app search surface listed in this document. This note does not change runtime behavior, does not replace the lightweight scorer with a new search architecture, and does not introduce Elastic/OpenSearch.
- Legacy evidence currently listed for this boundary is `yona-original/app/controllers/SearchApp.java`, `yona-original/app/models/Search.java`, `yona-original/test/models/SearchTests.java`, `yona-original/test/models/SearchResultTests.java`, `yona-original/test/utils/AccessControlTest.java`, and the `yona-original/app/views/search/*.scala.html` partials referenced below.
- P3-B DB-native FTS slice started on 2026-06-21. The legacy UX and app response shape remain unchanged: result tabs, scope/type resolution, ACL filtering, snippets, pagination, and the current lightweight relevance plus legacy-order fallback stay authoritative.
- Runtime search now has a conservative native candidate abstraction in `crates/persistence/src/repo/search.rs`: SQLite uses persistent DB-native FTS5 external-content tables named `yona_search_fts_*` and rebuilds the matching table before candidate lookup so backfill, source-row updates, and source-row deletes cannot return stale native candidates. PostgreSQL assures built-in GIN `to_tsvector('simple', ...)` indexes before `to_tsvector`/`plainto_tsquery` candidate lookup, and MySQL assures FULLTEXT indexes before `MATCH ... AGAINST` candidate lookup. Any unsupported native path or database error falls back to the existing literal scan path.
- `crates/migration/src/lib.rs` treats the `yona_search_fts_*` SQLite FTS table/shadow-table family as runtime-owned auxiliary storage during schema inspection so persistent DB-native indexes do not appear as legacy schema drift.
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
| `search/partial_search.scala.html`, `SearchApp` invalid-query/project-type branches, `error/badrequest_default.scala.html` | legacy classes, tabs, badges, form ids, result title, empty result, pagination anchors, and common `error.badrequest` shell for invalid/missing query parameters, project-scoped `searchType=project`, and non-forbidden/non-not-found REST query failures stay visible without temporary `Search failed.` copy | Current flat-route global start: `frontend/src/routes/search.tsx`, `frontend/tests/search-global.e2e.ts`; remaining scoped routes need follow-up evidence. |

## Explicit Deferrals

- any async indexing discussion belongs only to a future non-app-runtime migration/tool scope with new legacy evidence; app query search stays DB-native
- ranking beyond the current lightweight title/body hit-count scorer and legacy-order tie-breaker unless it is implemented with the selected DB's built-in FTS/query support and preserves the fallback contract
- broader AI-facing or machine-facing search surfaces

이 항목들은 Phase 5C app runtime parity 밖의 `deferred` scope다.

## Bounded Future Split

- Search index design: DB-native candidate retrieval exists without external Elastic/OpenSearch dependency and without changing the legacy app search contract. SQLite has persistent FTS5 storage plus query-time rebuild orchestration; PostgreSQL and MySQL assure built-in text-search/FULLTEXT indexes before native candidate queries.
- Remaining runtime search tuning: only DB-native query/index changes are allowed, and only if they keep `/api/v1` response shape, legacy result UI, scopes, ACL filtering, and the current lightweight scorer contract as the fallback baseline.
- Legacy external compatibility: retired as not applicable because no legacy `/-_-api/v1/**` search endpoint exists. Keep app search on `/api/v1/**` only unless new legacy evidence is found.
