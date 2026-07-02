# Frontend Scala HTML Goal Violation Audit

Status: current audit baseline
Date: 2026-07-02

## Purpose

This audit records where recent frontend work failed, or may have failed, the
`docs/plans/2026-06-30-scala-html-goal-workflow.md` rule that each goal slice
must rebuild a user-visible screen from legacy Scala HTML instead of preserving
or patching existing React DOM.

This file is a guardrail for future goal turns:

- Do not count metric-only, CSS-only, or provenance-only commits as Scala HTML
  rebuild work.
- If a current TSX screen conflicts with its legacy Scala HTML source, delete
  or replace the TSX screen implementation rather than patching around it.
- Subagent output that does not identify the legacy Scala HTML root, included
  partials, relevant LESS/JS/messages, and current TSX write scope must not be
  integrated.

## Enforcement Memo

The root `AGENTS.md` and `docs/agents/05-agent-execution-guidelines.md` now
explicitly forbid goal turns that only add E2E metrics, CSS, or provenance
without rebuilding the target TSX screen from `yona-original/app/views/**`.

`tools/scala-html-goal-guard.mjs` is wired into `tools/precommit-verify.mjs`.
It blocks commits that change frontend E2E files, `frontend/src/app.css`, or
UI parity reports without changing a TSX route implementation in the same
staged change. Intentional audit-only exceptions require the explicit
`YONA_ALLOW_SCALA_HTML_EVIDENCE_ONLY=1` environment marker.

It also blocks frontend route TSX commits that do not update this audit memo in
the same staged change. Each route/screen rebuild must leave a `Rebuilt From
This Audit` row or an explicit candidate/status update with the target
route/screen state, legacy Scala HTML root, included partials, TSX write scope,
and focused verification. Intentional non-goal route exceptions require the
explicit `YONA_ALLOW_SCALA_HTML_UNDOCUMENTED_ROUTE=1` environment marker.

The mandatory workflow remains:

1. Start each frontend goal turn by reading `AGENTS.md`,
   `docs/plans/2026-06-30-scala-html-goal-workflow.md`, and this audit.
2. Pick exactly one route/screen state.
3. Record the legacy Scala HTML root and included partials before editing.
4. Change TSX implementation for the screen unless the turn is a pure audit.
5. Reject subagent work that skips steps 2-4.

## High Confidence Rebuild Candidates

| Priority | Route/screen | Current files | Legacy source of truth | Required action |
| --- | --- | --- | --- | --- |
| P0 | `/admin/sample/issues` issue list | `frontend/src/routes/$ownerName/$projectName/issues.tsx`, `frontend/tests/project-issues-empty.e2e.ts` | `issue/list.scala.html`, `issue/partial_searchform.scala.html`, `issue/partial_list_wrap.scala.html`, `issue/partial_list.scala.html`, `issue/partial_list_quicksearch.scala.html`, `issue/partial_massupdate.scala.html`, `common/showSubtasksCheckbox.scala.html`, `common/twoColumnModeCheckboxArea.scala.html` | Rebuild the issue list route from the Scala templates. Current implementation history shows empty-list first, then many branch patches. |
| P0 | `/admin/sample/issue/11` issue detail | `frontend/src/routes/$ownerName/$projectName/issue/$issueNumber.tsx`, `frontend/tests/project-issue-detail.e2e.ts` | `issue/view.scala.html`, `issue/partial_comments.scala.html`, `issue/partial_comment.scala.html`, `issue/partial_event_timeline.scala.html`, `issue/partial_index_comments.scala.html`, `common/commentForm.scala.html`, `common/childComments.scala.html`, `common/commentDeleteModal.scala.html`, `common/editor.scala.html`, `help/markdown.scala.html` | Rebuild the issue detail route from the Scala templates. Current implementation history appears accretive rather than template-first. |

## Rebuild Or Re-verify Candidates

| Priority | Route/screen | Current files | Legacy source of truth | Required action |
| --- | --- | --- | --- | --- |
| P1 | Global common scripts/dialog/select2 shell | `frontend/src/routes/__root.tsx` | `layout.scala.html`, `common/scripts.scala.html`, `common/loginDialog.scala.html`, `common/select2.scala.html` | Rebuild or isolate the legacy partial-derived region; document intentional JS deviations. |
| P1 | Milestone detail | `frontend/src/routes/$ownerName/$projectName/milestone/$milestoneId.tsx`, `frontend/tests/project-milestone-detail.e2e.ts` | `milestone/view.scala.html`, issue list partials, project layout/menu | Re-run as a one-screen Scala HTML verification. Replace selector/metric-only proof with whole-screen DOM comparison; rebuild if mismatch appears. |
| P1 | `/:owner/:project/search` | `frontend/src/routes/$ownerName/$projectName/search.tsx`, `frontend/src/routes/-search-screen.tsx`, `frontend/tests/search-project.e2e.ts` | `search/result.scala.html`, `search/partial_search.scala.html`, result partials, `projectLayout`, `projectMenu` | Rebuild/verify as a project-scoped search screen. |
| P1 | `/organizations/:org/search` | `frontend/src/routes/organizations/$organizationName/search.tsx`, `frontend/src/routes/-search-screen.tsx`, `frontend/tests/search-organization.e2e.ts` | `search/result.scala.html`, `search/partial_search.scala.html`, result partials, `organizationLayout`, `organization/header.scala.html`, `organization/menu.scala.html` | Rebuild/verify as an organization-scoped search screen. |

## Process Violations That Should Not Count As Rebuilds

These recent commits changed tests, CSS, or provenance without a same-turn TSX
screen rebuild. They may be useful evidence after a proper rebuild, but they
must not be counted as successful Scala HTML goal implementation turns:

- `1bc93f32` organization settings layout metrics
- `bbb457cc` organization home layout metrics
- `3881fbb7` site admin update metrics
- `36486a71` site admin mass mail metrics
- `a274767b` site admin mail form metrics
- `3f3d3d16` site admin project list metrics
- `b3e4748e` site admin issue list metrics
- `a406e709` site admin post list metrics
- `afe2c825` site admin user list row metrics
- `8c9f00e5` site admin data layout metrics
- `bfa985d9` dashboard layout metric parity gate
- `68095b44` project home README layout metrics
- `a0f1abe5` project home history stream metrics
- `74c29d53` public profile legacy width

## Rebuilt From This Audit

| Date | Route/screen | Legacy source of truth | Implementation evidence | Verification |
| --- | --- | --- | --- | --- |
| 2026-07-02 | `/$user` missing-user not-found branch | `error/notfound_default.scala.html`, `common/usermenu.scala.html`, `layout.scala.html` | `frontend/src/routes/$user.tsx` now renders the not-found shell with the anonymous `#mySidenav` and `gnb-usermenu` structure from `common.usermenu()` instead of the earlier partial header-only branch. | `frontend/tests/user-public-profile.e2e.ts` whole-screen expected DOM includes the legacy side menu, error copy `user.notExists.name`, home button, and footer. |
| 2026-07-02 | Global unmatched route not-found | `error/notfound_default.scala.html`, `common/usermenu.scala.html`, `layout.scala.html` | `frontend/src/routes/__root.tsx` now wraps the fallback in `LegacyI18nProvider` and renders nav/user-menu/error/home labels through the same legacy message keys used by `Messages(...)` in the Scala template, while keeping the reset-password alias redirect separate. | `frontend/tests/not-found.e2e.ts` whole-screen DOM and desktop/mobile metric checks cover the default not-found shell and anonymous user menu. |
| 2026-07-02 | `/search` missing query bad request | `SearchApp.searchInAll`, `error/badrequest_default.scala.html`, `search/result.scala.html`, `search/partial_search.scala.html`, `siteLayout` | `frontend/src/routes/search.tsx` now preserves missing/invalid `keyword` or `searchType` as `routeInvalid`, skips the REST search request, and renders the legacy `badrequest_default` shell instead of inventing an empty search result screen. | `frontend/tests/search-global.e2e.ts` covers direct `/search`, asserts no `#searchInnerForm`, no REST search call, `.ico-404`, bad-request copy, and `ybtn-info` home action. |
| 2026-07-02 | `/:owner/:project/search` missing/invalid query bad request | `SearchApp.searchInAProject`, `error/badrequest_default.scala.html`, `search/result.scala.html`, `search/partial_search.scala.html`, `projectLayout`, `projectMenu` | `frontend/src/routes/$ownerName/$projectName/search.tsx` now preserves missing/invalid `keyword` or `searchType`, including legacy-forbidden `searchType=project`, as `routeInvalid`, skips the scoped REST search request, and renders the legacy `badrequest_default` shell instead of an empty project search result screen. | `frontend/tests/search-project.e2e.ts` covers direct `/admin/sample/search`, asserts no project header/menu, no `#searchInnerForm`, no scoped REST search call, `.ico-404`, bad-request copy, and `ybtn-info` home action. |
| 2026-07-02 | `/organizations/:org/search` missing/invalid query bad request | `SearchApp.searchInAGroup`, `error/badrequest_default.scala.html`, `search/result.scala.html`, `search/partial_search.scala.html`, `organizationLayout`, `organization/header.scala.html`, `organization/menu.scala.html` | `frontend/src/routes/organizations/$organizationName/search.tsx` now preserves missing/invalid `keyword` or `searchType` as `routeInvalid`, skips the organization REST search request, and renders the legacy `badrequest_default` shell instead of an empty organization search result screen. | `frontend/tests/search-organization.e2e.ts` covers direct `/organizations/weblabs/search`, asserts no organization header/menu, no `#searchInnerForm`, no scoped REST search call, `.ico-404`, bad-request copy, and `ybtn-info` home action. |
| 2026-07-02 | `/search?keyword=thread&searchType=post_comment` populated result row | `search/partial_search.scala.html`, `search/partial_post_comments.scala.html`, `search/partial_projects.scala.html`, `search/partial_posts.scala.html`, `search/partial_milestones.scala.html`, `search/partial_issue_comments.scala.html`, `search/partial_reviews.scala.html`, `siteLayout` | `frontend/src/routes/-search-screen.tsx` now renders legacy keyword highlighting as `<strong class="keyword">` for `.search-content-body` and `.title` output, and uses the `posting.noAuthor` message key for post-comment rows without an author instead of the issue no-author key. | `frontend/tests/search-global.e2e.ts` covers the post-comment no-author row from `partial_post_comments.scala.html` and updates global populated row DOM expectations for the legacy inline keyword highlight behavior. |

## Not Immediate Delete Targets

The audits did not find enough evidence to delete these groups wholesale:

- Organization home/settings/site admin routes whose TSX was introduced by
  earlier restore/rebuild commits, even though later metric-only turns were
  process violations.
- Boards/posts, code browser, commit history/detail, branches, PR list/forms,
  PR detail/changes, organization PR, and review list routes, which currently
  have TSX route changes plus legacy DOM-oriented tests/provenance.
- Login/signup/lost/reset/verify/secret screens, which need stronger
  same-turn evidence but did not show a high-confidence DOM mismatch in this
  audit.

## Subagent Acceptance Rule

When using subagents for frontend screen work, assign disjoint write scopes and
require the final answer to include:

- target route and user/session/data state;
- legacy Scala HTML root and all included partials;
- related legacy LESS/JS/messages;
- TSX files changed;
- E2E file changed;
- exact command used for focused Playwright verification.

If any item is missing, or if the patch only adjusts current DOM/CSS/tests
without a Scala HTML based TSX rebuild, discard the subagent result.
