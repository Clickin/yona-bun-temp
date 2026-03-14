# Search Provenance

## Scope

- This document freezes the bounded Phase 0B search exemplar only.
- Parity for this slice is API-level parity only.
- The scope boundary is query-driven internal search across the `global`, `organization`, and `project` scopes.
- In-scope result types are `user`, `project`, `issue`, `posting`, and `review_comment`.
- Deferred result types are `issue_comment`, `posting_comment`, and `milestone`.

## Legacy Sources

- `yona-original/test/models/SearchTests.java`
- `yona-original/test/models/SearchResultTests.java`
- `yona-original/test/utils/AccessControlTest.java`
- `yona-original/app/controllers/SearchApp.java`

## Extracted Intent

| Legacy source                                                                                                                        | Intent                                                                                                                                                           | Modern translation                                         |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `SearchApp.searchInAll`, `SearchApp.searchInAGroup`, `SearchApp.searchInAProject`                                                    | the bounded search surface is query-driven and exposed at `global`, `organization`, and `project` scope entry points                                             | app tRPC query plus thin route or `serverFunction` adapter |
| `SearchTests.findUsersByLoginId`, `findUsersByName`, `findUser_from_public_project`, `findUser_from_organization`                    | `user` search matches query text in internal search and narrows correctly by scope                                                                               | domain query plus DB helper                                |
| `SearchTests.anonymous_findProjects`, `groupMember_findProjects`, `projectMember_findProjects`, `projectAndGroupMember_findProjects` | `project` search stays permission filtered and visibility aware for anonymous, org-member, and project-member actors                                             | domain query plus DB helper                                |
| `SearchTests.*findIssues*`                                                                                                           | `issue` search keeps readable-result semantics across `public`, `protected`, and `private` projects, including author and assignee visibility on private content | domain query plus DB helper                                |
| `SearchTests.*findPosts*`                                                                                                            | `posting` search keeps the same readable-result semantics as project visibility changes across the three scopes                                                  | domain query plus DB helper                                |
| `SearchTests.*findReviews*`                                                                                                          | `review_comment` search remains permission filtered and visibility aware across the same three scopes                                                            | domain query plus DB helper                                |
| `SearchResultTests.makeSnipet`, `SearchResultTests.merge_overlap`                                                                    | snippet generation preserves keyword-centered excerpt behavior and overlap merge behavior for returned text fragments                                            | domain snippet helper or contract-level formatter test     |
| `AccessControlTest.isAllowed_notAMember`, `AccessControlTest.isAllowed_resource_to_group_member`                                     | search result inclusion must respect the same read boundary as project and issue visibility, especially for protected and private resources                      | shared ACL-backed filtering in domain query layer          |

## Phase 0B Freeze

- This is not full Search parity.
- This slice freezes only the minimal internal exemplar needed for later Red to Green work.
- `SearchTests.java` covers a broader legacy surface, but this document intentionally narrows the first executable target to `user`, `project`, `issue`, `posting`, and `review_comment`.
- `issue_comment`, `posting_comment`, and `milestone` stay deferred to Phase 5 even though legacy controller and model tests cover them, because the Phase 0B blocker boundary needs a smaller internal exemplar first.
- Search result inclusion remains permission filtered. Readers only see resources they can already read.
- This bounded exemplar exists to reconcile the remaining Phase 0B blocker boundary. It is not a claim that Phase 5 search parity is complete.

## Parity Boundary

- API-level parity means searchable coverage for the bounded type set, scope-aware filtering, permission filtering, and pagination contract stay aligned with legacy behavior.
- Ranking identity is out of scope for this slice.
- Tokenizer, stemming, stopword handling, and DB-specific search operator identity are out of scope for this slice.
- Dialect differences across PostgreSQL, MySQL or MariaDB, and SQLite are allowed as long as the bounded API surface keeps the same visibility and filtering semantics.
- AI-facing search surface is out of scope for this slice.
- `llms.txt`, AI datasource endpoints, and any AI-facing search endpoint remain deferred to Phase 6.

## Explicit Phase 5 Deferrals

- `issue_comment`, deferred because the Phase 0B exemplar narrows the first internal result set to five types.
- `posting_comment`, deferred because the Phase 0B exemplar narrows the first internal result set to five types.
- `milestone`, deferred because the Phase 0B exemplar narrows the first internal result set to five types.
- Type-specific result counts, deferred because `SPEC.md:1359` includes them in the broader search surface while the Phase 0B exemplar freezes only bounded query results and pagination semantics.
- Broader review-search-condition behavior beyond internal `review_comment` results, deferred because the Phase 0B exemplar keeps review-related search coverage at the minimal internal type boundary.
- Full three-dialect searchable-field coverage for the complete internal type set, deferred because Phase 0B allows a smaller bounded exemplar before Phase 5 hardens complete PostgreSQL, MySQL or MariaDB, and SQLite parity.

## Explicit Phase 6 Deferrals

- `llms.txt`, deferred because AGENTS fixed decisions place it in hardening scope.
- AI datasource endpoints, deferred because AGENTS fixed decisions place them in hardening scope.
- Other AI-facing or machine-facing search endpoints, deferred because the current batch is limited to internal user-facing search provenance.

## Batch Boundary Rule

- Phase 0B uses this document only to freeze the bounded internal search exemplar that was required for blocker reconciliation.
- Full internal search parity remains Phase 5 work under `SPEC.md:1359`, even after this provenance freeze lands.
- AI-facing search parity is outside this boundary and remains Phase 6 work.

## Current Green Evidence

- `packages/contracts/src/search.spec.ts` freezes the bounded scope, bounded type set, aggregate counts contract, and snippet helper provenance.
- `packages/db/src/search.spec.ts` verifies that permission filtering happens before ranking, counts, and pagination for the bounded type set.
- `packages/domain/src/search-service.spec.ts` verifies global forwarding, organization existence checks, and project read authorization reuse before search execution.
- `apps/app/src/lib/search-trpc.spec.ts` verifies the app-facing `tRPC` boundary for bounded search payloads plus `NOT_FOUND` and `UNAUTHORIZED` error mapping.
- `apps/app/src/lib/search.spec.ts` verifies the query-driven route-search normalization used by `apps/app/src/routes/search.tsx`.

## Intentional App-Layer Deviations

- The legacy controller exposed separate all, group, and project endpoints; the current app uses one query-driven `/search` route with a bounded `scope` selector and scope-specific query params, while preserving the same `global`, `organization`, and `project` entry semantics.
- The current app route exposes aggregate `returned` and `total` counts only. Type-specific result counts remain explicitly deferred to Phase 5, matching the bounded contract in `packages/contracts/src/search.ts`.
- The current app route keeps forward cursor plus page-size pagination only. It does not introduce previous-page cursors, boolean query operators, an AST, or any AI-facing payload surface.
- `review_comment` results are rendered as bounded internal search results without a deep-link to a PR thread. That is intentional for this slice because the bounded search contract carries `reviewCommentId` and project identity, not full PR-thread composition metadata.

## Out Of Scope

- Full Search parity across every legacy result type
- `issue_comment`
- `posting_comment`
- `milestone`
- PR search and review-search-condition behavior beyond `review_comment` internal results
- Score identity, tokenizer identity, stemming identity, stopword identity, and dialect-identical operator behavior
- AI-facing search endpoints or public machine-readable search surfaces
