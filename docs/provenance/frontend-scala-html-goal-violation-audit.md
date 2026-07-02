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
The precommit hook passes the staged audit diff to the guard, and route TSX
changes are blocked unless that diff adds at least one legacy `.scala.html`
source line. A memo-only touch without newly recorded legacy template evidence
does not satisfy the goal.
The guard also requires every changed `frontend/src/routes/**/*.tsx` file to be
named in a newly added audit table row that also names a legacy `.scala.html`
source and a focused `frontend/tests/*.e2e.ts` verification file. This is the
machine-checkable memo format for multi-day automated goal turns.

The mandatory workflow remains:

1. Start each frontend goal turn by reading `AGENTS.md`,
   `docs/plans/2026-06-30-scala-html-goal-workflow.md`, and this audit.
2. Pick exactly one route/screen state.
3. Record the legacy Scala HTML root and included partials before editing.
4. Change TSX implementation for the screen unless the turn is a pure audit.
5. Reject subagent work that skips steps 2-4.
6. Reject any subagent patch whose audit row cannot pass the route-file,
   `.scala.html`, and focused-E2E guard.

For multi-day unattended runs, use
`pnpm smoke:scala-html-goal-history -- --range <base>..HEAD` as the automated
post-run audit. It reuses the same guard evaluator against each commit in the
range and reports evidence-only, undocumented route, and weak audit-row commits.
Use `--fail-on-violation` when the audit should stop a checkpoint pipeline.
The mandatory `pnpm agent:turn-commit -- -m "<summary>"` hook also runs this
history audit for `HEAD~1..HEAD` after each successful commit, so a multi-day
agent loop gets an immediate per-commit Scala HTML goal check in addition to
the staged precommit guard.

## High Confidence Rebuild Candidates

| Priority | Route/screen | Current files | Legacy source of truth | Required action |
| --- | --- | --- | --- | --- |
| P0 | `/admin/sample/issues` issue list | `frontend/src/routes/$ownerName/$projectName/issues.tsx`, `frontend/tests/project-issues-empty.e2e.ts` | `issue/list.scala.html`, `issue/partial_searchform.scala.html`, `issue/partial_list_wrap.scala.html`, `issue/partial_list.scala.html`, `issue/partial_list_quicksearch.scala.html`, `issue/partial_massupdate.scala.html`, `common/showSubtasksCheckbox.scala.html`, `common/twoColumnModeCheckboxArea.scala.html` | Continue rebuilding the issue list route from the Scala templates. Current implementation history shows empty-list first, then many branch patches. 2026-07-02 focused issue-list route turns restored route-local assets, label multi-select, anonymous quick-search, mass-update project-wide option sources, and `partial_searchform.scala.html` author/assignee search options from the legacy `User.findIssueAuthorsByProjectIdAndMe` / `User.findIssueAssigneeByProjectIdAndMe` helper sources. Remaining work should re-audit the full route against `issue/list.scala.html` and included partials before downgrading this P0 candidate. |
| P0 | `/admin/sample/issue/11` issue detail | `frontend/src/routes/$ownerName/$projectName/issue/$issueNumber.tsx`, `frontend/tests/project-issue-detail.e2e.ts` | `issue/view.scala.html`, `issue/partial_comments.scala.html`, `issue/partial_comment.scala.html`, `issue/partial_event_timeline.scala.html`, `issue/partial_index_comments.scala.html`, `common/commentForm.scala.html`, `common/childComments.scala.html`, `common/commentDeleteModal.scala.html`, `common/editor.scala.html`, `help/markdown.scala.html` | Rebuild the issue detail route from the Scala templates. Current implementation history appears accretive rather than template-first. 2026-07-02 subagent audit confirmed unresolved legacy conflicts: `common.select2`, `common.calendar`, `common.commentDeleteModal`, `yobi.Comment`, `yobi.CommentForm`, inline `issue.View`, and `tplAttachedFile` runtime/template assets are missing or replaced by direct React output. The update-capable milestone right-pane branch, `partial_select_label.scala.html` project-label/select/edit-link branch, and right-pane New subtask `project.menuSetting.issue` branch were restored on 2026-07-02 and should not be treated as unresolved unless a fresh Scala diff shows otherwise. |

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
| 2026-07-02 | `/admin/sample/issues?filter=empty` issue list label stylesheet | `issue/list.scala.html`, `issue/partial_list_wrap.scala.html`, `issue/partial_searchform.scala.html`, `projectLayout`, `projectMenu` | `frontend/src/routes/$ownerName/$projectName/issues.tsx` now preserves the legacy `<link rel="stylesheet" href="/:owner/:project/issue/labels.css" type="text/css">` emitted by `issue/list.scala.html` before the issue list body, so issue label CSS remains loaded from the same legacy endpoint. | `frontend/tests/project-issues-empty.e2e.ts` asserts the label stylesheet link on the empty issue list screen in addition to the existing whole-screen issue list DOM comparison. |
| 2026-07-02 | `/admin/sample/issue/11` issue detail stylesheets | `issue/view.scala.html`, `issue/partial_comments.scala.html`, `common/commentForm.scala.html`, `projectLayout`, `projectMenu` | `frontend/src/routes/$ownerName/$projectName/issue/$issueNumber.tsx` now preserves the legacy `issue/view.scala.html` stylesheet links for issue labels, atwho, elevator, and videojs before the issue detail body. | `frontend/tests/project-issue-detail.e2e.ts` asserts the four legacy stylesheet links on the voter-state issue detail screen alongside the existing whole-screen detail DOM comparison. |
| 2026-07-02 | `/admin/sample/issues?filter=bulk` issue list sort filters | `issue/list.scala.html`, `issue/partial_list_wrap.scala.html`, `issue/partial_massupdate.scala.html`, `issue/partial_list.scala.html`, `projectLayout`, `projectMenu` | `frontend/src/routes/$ownerName/$projectName/issues.tsx` now renders the legacy `@makeFilterLink` custom attributes as `orderBy` and `orderDir` instead of lower-case React-only `orderby`/`orderdir`, matching `partial_list_wrap.scala.html`. | `frontend/tests/project-issues-empty.e2e.ts` updates the bulk-list whole-screen expected DOM and asserts the due-date and active updated sort anchors expose `orderBy`/`orderDir` with legacy values. |
| 2026-07-02 | `/admin/sample/issues` issue list milestone advanced search | `issue/list.scala.html`, `issue/partial_list_wrap.scala.html`, `issue/partial_searchform.scala.html`, `projectLayout`, `projectMenu` | `frontend/src/routes/$ownerName/$projectName/issues.tsx` now restores the legacy `milestoneId` advanced-search `<dl>` from `partial_searchform.scala.html`, sourcing open and closed milestone optgroups from the existing REST/TanStack milestone list queries and gating the search control on milestone existence rather than the project menu flag. | `frontend/tests/project-issues-empty.e2e.ts` adds the milestone search block to the canonical whole-screen issue list DOM, mocks open/closed milestone REST responses, and asserts the milestone select remains present even when the milestone project menu is disabled. |
| 2026-07-02 | `/admin/sample/issue/11` issue detail script assets | `issue/view.scala.html`, `common/markdown.scala.html`, `issue/partial_comments.scala.html`, `common/commentForm.scala.html`, `projectLayout`, `projectMenu` | `frontend/src/routes/$ownerName/$projectName/issue/$issueNumber.tsx` now preserves the legacy `common.markdown(project)` highlight/marked asset tags plus the `issue/view.scala.html` script asset block for atwho caret/mention, elevator, videojs, favico, assignee/sharer, detectChange, Sha1, tasklist, subcomment, comment attachment update, and receiver list support; script tags carry `defer` as the React Doctor performance-gate normalization while preserving the legacy sources. | `frontend/tests/project-issue-detail.e2e.ts` expands the issue detail asset assertion to cover the common markdown highlight stylesheet/scripts, four issue-detail stylesheet links, all thirteen issue-view script sources, and the normalized `defer` attributes on the voter-state detail screen. |
| 2026-07-02 | `/admin/sample/milestone/5?state=open` milestone detail asset/script block | `milestone/view.scala.html`, `common/markdown.scala.html`, `issue/partial_massupdate.scala.html`, `issue/partial_list.scala.html`, `projectLayout`, `projectMenu` | `frontend/src/routes/$ownerName/$projectName/milestone/$milestoneId.tsx` now preserves the legacy `common.markdown(project)` highlight/marked asset tags, the milestone detail issue label stylesheet link, and the `milestone.View` inline bootstrap block for title-prefix filtering, label URL wiring, milestone id wiring, and current-user mention highlighting. External script tags carry `defer` as the React Doctor performance-gate normalization while preserving legacy sources. | `frontend/tests/project-milestone-detail.e2e.ts` asserts the rendered highlight stylesheet, highlight/marked scripts, `/:owner/:project/issue/labels.css` stylesheet, and inline `milestone.View` bootstrap script values on the open-state milestone detail screen. |
| 2026-07-02 | Authenticated site-admin global shell affix | `layout.scala.html`, `common/usermenu.scala.html`, `common/scripts.scala.html` | `frontend/src/routes/-home-route-screen.tsx` now renders the legacy `.admin-logged-in-affix[data-spy="affix"][data-offset-top="30"]` before the GNB when the current session is an authenticated site admin, preserving the `user.siteAdminLoggedInAffix` and `user.siteAdminLoggedInAffix.maxim` message output. | `frontend/tests/authenticated-home-empty-notifications.e2e.ts` includes the affix in the whole-screen canonical shell comparison for the authenticated site-admin home screen. |
| 2026-07-02 | Authenticated custom navbar link in global user menu | `common/usermenu.scala.html`, `layout.scala.html`, `common/scripts.scala.html` | `frontend/src/routes/-home-route-screen.tsx` now renders `runtimeConfig.navbarCustomLinkName`/`navbarCustomLinkUrl` as the legacy `<li class="gnb-usermenu-item"><a class="user-item-btn loggged-in">` entry before My Issues when the configured link name is nonblank, matching the `Application.NAVBAR_CUSTOM_LINK_NAME` branch in `common/usermenu.scala.html`. | `frontend/tests/authenticated-home-empty-notifications.e2e.ts` injects a runtime custom navbar link and asserts the rendered link text, raw external href, class, and ordering before the My Issues shortcut. |
| 2026-07-02 | Root login dialog social-login-only branch | `common/loginDialog.scala.html`, `common/scripts.scala.html`, `layout.scala.html` | `frontend/src/routes/__root.tsx` now reads auth UI capabilities for the root login dialog and preserves the `UserApp.useSocialLoginOnly` branch from `common/loginDialog.scala.html`: local login fields, `.error`, submit button, and remember/reset/signup action row are omitted; `app.warn.support.social.login.only` and enabled OAuth provider buttons remain. | `frontend/tests/ui-kit.e2e.ts` mocks social-login-only capabilities on `/_UIKit` and asserts the warning, absent local-login controls, absent social divider, and rendered GitHub OAuth link. |
| 2026-07-02 | Root common dialog confirm button message | `common/scripts.scala.html`, `layout.scala.html`, `common/loginDialog.scala.html` | `frontend/src/routes/__root.tsx` now renders the root `#yobiDialog` confirm button through `button.confirm` from the legacy message catalog instead of hard-coded English, preserving the `@Messages("button.confirm")` behavior in `common/scripts.scala.html`. | `frontend/tests/ui-kit.e2e.ts` asserts the rendered `#yobiDialog .ybtn.ybtn-info[data-dismiss="modal"]` confirm button text and modal-dismiss attribute on `/_UIKit`. |
| 2026-07-02 | Root Select2 common script assets and locale branch | `common/select2.scala.html`, `layout.scala.html`, `help/UIKit.scala.html` | `frontend/src/routes/__root.tsx` now emits the legacy Select2 runtime scripts before the formatter templates: `select2.js`, `yobi.ui.Select2.js`, and exactly one `select2_locale_ko.js` or `select2_locale_ja.js` when the resolved legacy language is Korean or Japanese. External scripts carry `defer` as the React Doctor performance-gate normalization while preserving legacy source order. | `frontend/tests/ui-kit.e2e.ts` asserts the select2 CSS link from the legacy layout, script ordering before `tplSelect2FormatUser`, no locale script for default English, and the Korean/Japanese locale script branches under forced browser languages. |
| 2026-07-02 | `/admin/sample/issues` issue list root assets, label search, and anonymous quick-search branch | `issue/list.scala.html`, `issue/partial_searchform.scala.html`, `issue/partial_select_label.scala.html`, `issue/partial_list_quicksearch.scala.html`, `common/select2.scala.html`, `common/calendar.scala.html` | `frontend/src/routes/$ownerName/$projectName/issues.tsx` now emits the issue-list route-local `common.calendar()` scripts, `jquery.pageslide.js`, `yona.twoColumnMode.js`, `yona.showSubtask.js`, and inline `issue.List`/shortcut/title-prefix bootstrap from `issue/list.scala.html`; it fetches project labels through the typed REST/TanStack label query and renders the `partial_select_label.scala.html` `#labelIds` multi-select when labels exist; it hides current-user quick-search links and current-user search options when the session is anonymous. | `frontend/tests/project-issues-empty.e2e.ts` asserts the route-local issue-list asset block, `#labelIds` legacy select attributes and optgroup metadata, and the anonymous quick-search branch; the focused issue-list suite passes 19 tests. |
| 2026-07-02 | `/admin/sample/issue/11` issue detail updateable milestone right pane | `issue/view.scala.html`, `common/select2.scala.html`, `projectLayout`, `projectMenu` | `frontend/src/routes/$ownerName/$projectName/issue/$issueNumber.tsx` now replaces the previous anchor/empty-text milestone branch with the legacy `#milestone[name="milestone.id"]` select for update-capable issues, open and closed optgroups from REST/TanStack milestone queries, the `issue.noMilestone` option, the new-milestone button branch when the project has no milestones, and the read-only link/text branch from `issue/view.scala.html`. | `frontend/tests/project-issue-detail.e2e.ts` mocks open/closed milestone REST responses, updates the whole-screen issue detail DOM, and asserts the focused updateable milestone select DOM alongside existing read-only metadata coverage. |
| 2026-07-02 | `/admin/sample/issue/11` issue detail updateable label select | `issue/view.scala.html`, `issue/partial_select_label.scala.html`, `issue/partial_show_selected_label.scala.html`, `common/select2.scala.html` | `frontend/src/routes/$ownerName/$projectName/issue/$issueNumber.tsx` now feeds the update-capable `#labelIds[name="labelIds"]` select from the project-wide REST/TanStack label query like `IssueLabel.findByProject(project)`, marks only the issue's current label ids as selected, hides the whole label block when the project has no labels, and gates the `[Edit]` link on project manager/update capability to match `UserApp.currentUser().isManagerOf(project)` in `partial_select_label.scala.html`. | `frontend/tests/project-issue-detail.e2e.ts` expands the whole-screen issue detail DOM with an unselected project label option, keeps read-only selected-label coverage, and adds a focused non-manager updateable label-select case proving the edit link is omitted while the project-wide label options remain. |
| 2026-07-02 | `/admin/sample/issue/11` issue detail New subtask menu-setting branch | `issue/view.scala.html`, `issue/create.scala.html`, `projectLayout`, `projectMenu` | `frontend/src/routes/$ownerName/$projectName/issue/$issueNumber.tsx` now preserves the legacy split from `issue/view.scala.html`: the left `.board-actrow .project-btn-item.hide.show-in-mobile-inline` New subtask link remains unconditional, while the right-pane `.issue-info dd.project-btn-item` link is rendered only when `project.menuSetting.issue` is enabled. | `frontend/tests/project-issue-detail.e2e.ts` keeps the SPA transition coverage for the right-pane link when issue menu is enabled and adds a focused `menuSetting.issue=false` case proving the left action-row link remains while the right-pane link is omitted. |
| 2026-07-02 | `/admin/sample/issues` issue list mass-update project-wide option sources | `issue/list.scala.html`, `issue/partial_massupdate.scala.html`, `issue/partial_searchform.scala.html` | `frontend/src/routes/$ownerName/$projectName/issues.tsx` now feeds `partial_massupdate.scala.html` dropdowns from project-wide REST/TanStack sources: project assignable users for assignee rows, open milestones for milestone rows, and project labels for attach/detach label rows, while keeping current-row fallback only when those project-wide responses are empty. `frontend/src/api/issue-meta.ts` preserves optional `userId` from assignable-user responses so the rendered mass-update `data-value` can keep the legacy user-id shape when the backend supplies it. | `frontend/tests/project-issues-empty.e2e.ts` adds a project-wide-options state that renders a mass-update assignee, milestone, and label absent from the current issue rows; the focused issue-list suite passes 20 tests. |
| 2026-07-02 | `/admin/sample/issues` issue list mass-update row-derived milestone cleanup | `issue/list.scala.html`, `issue/partial_massupdate.scala.html` | `frontend/src/routes/$ownerName/$projectName/issues.tsx` no longer keeps the unused current-row-derived `uniqueMilestones` helper after the mass-update milestone dropdown moved to the `Milestone.findOpenMilestones(project.id)` equivalent project-wide REST/TanStack source. | `frontend/tests/project-issues-empty.e2e.ts` remains the focused verification for the issue-list mass-update dropdown source; the preceding focused run covered 20 tests. |
| 2026-07-02 | `/admin/sample/issues` issue list advanced search author/assignee sources | `issue/list.scala.html`, `issue/partial_searchform.scala.html` | `frontend/src/routes/$ownerName/$projectName/issues.tsx` now feeds the `#authorId` and `#assigneeId` advanced-search selects from a project issue search-user REST/TanStack lookup equivalent to `User.findIssueAuthorsByProjectIdAndMe` and `User.findIssueAssigneeByProjectIdAndMe`, keeping row-derived fallback only when the lookup response is empty; `crates/server/src/routes/issues.rs`, `crates/server/src/routes/issues/lookups.rs`, `crates/persistence/src/repo/issue_picker.rs`, and `frontend/src/api/issue-meta.ts` add the narrow REST/data boundary for that legacy helper source without reusing project-wide assignable-users. | `frontend/tests/project-issues-empty.e2e.ts` updates the whole-screen issue-list expected DOM so empty search selects include the current user from `partial_searchform.scala.html`, and asserts project-wide mass-update users do not leak into search selects; `crates/server/tests/issue_assignable_contract.rs` covers the new project issue search-user lookup. |

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
