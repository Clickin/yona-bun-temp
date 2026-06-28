# 2026-06-28 Exhaustive Page Rebuild Audit

Status: active audit ledger
Date: 2026-06-28
Directive: `docs/plans/2026-06-28-destructive-template-frontend-rebuild.md`

## Purpose

This ledger starts the full-site destructive React rebuild audit from the
legacy Scala HTML templates. Existing React tests, route components, and prior
`covered` labels are not treated as contracts. They are implementation evidence
only after the matching `yona-original/app/views/**` template and included
partials are checked again.

The immediate rule from the current parent decision is:

- Sidebar must be a React SPA root-layout surface.
- The old frontend `/sidebar` iframe/framed contract is retired.
- Tests must be rewritten from legacy Scala template anchors, not from previous
  React behavior.

## Inventory Counts

Legacy Scala templates under `yona-original/app/views/**`:

| legacy directory | template count |
| --- | ---: |
| `board/` | 6 |
| `code/` | 13 |
| `common/` | 35 |
| `error/` | 9 |
| `git/` | 17 |
| `help/` | 5 |
| `index/` | 16 |
| `issue/` | 30 |
| `migration/` | 2 |
| `milestone/` | 5 |
| `organization/` | 17 |
| `project/` | 26 |
| `reviewthread/` | 2 |
| `search/` | 10 |
| `site/` | 14 |
| `user/` | 17 |
| `welcome/` | 2 |

Current React route/component surface under `frontend/src/routes/**`:

| route group | active files |
| --- | ---: |
| `$owner/$projectName/**` | 49 |
| `organizations/**` | 11 |
| `user/**` | 10 |
| `me/**` | 6 |
| standalone public/auth/help/admin route dirs | 30+ |
| shared route view modules `-*.tsx` | 19 |

Large shared view modules that require template-first review before reuse:

| file | lines | owning legacy groups |
| --- | ---: | --- |
| `frontend/src/routes/-issue-views.tsx` | 6206 | `issue/**`, common comment/editor partials |
| `frontend/src/routes/-markdown-renderer.tsx` | 7416 | `common/markdown.scala.html`, editor/tasklist behavior |
| `frontend/src/routes/-project-views.tsx` | 4382 | `project/**`, project layout/menu/header |
| `frontend/src/routes/-pull-request-views.tsx` | 4312 | `git/**`, `reviewthread/**`, diff/comment partials |
| `frontend/src/routes/-syntax-highlighting.tsx` | 4027 | code/diff rendering support |
| `frontend/src/routes/-code-views.tsx` | 2906 | `code/**` |
| `frontend/src/routes/-board-views.tsx` | 2402 | `board/**` |
| `frontend/src/routes/-organization-views.tsx` | 1925 | `organization/**` |
| `frontend/src/routes/-milestone-views.tsx` | 1590 | `milestone/**` |
| `frontend/src/routes/-workspace-views.tsx` | 1391 | `user/**`, `index/**` |

## Audit Rule

For every page group below:

1. Identify the owning Scala template and included partials.
2. Archive the current independently-built JSX for that route group before
   replacing it.
3. Rebuild JSX from the Scala template DOM order, classes, IDs, names, visible
   copy, modal markup, and form controls.
4. Keep form submit and data loading inside typed REST/TanStack Query
   boundaries. Do not restore native Play form posts as active React behavior.
5. Rewrite tests to assert legacy template anchors and rendered behavior. Do
   not preserve tests that only encode previous React structure.
6. Record any missing behavior as `gap`, `deviation`, or `deferred` before
   claiming the group is closed.

## Reopened Route Groups

All prior P0-P7 `covered` claims are reopened for template-source review. The
status below means only that the audit has started; it does not certify parity.

| group | primary legacy templates | current React owner | audit status | next action |
| --- | --- | --- | --- | --- |
| P0 global shell/layout/navbar/sidebar/footer | `layout.scala.html`, `common/navbar.scala.html`, `common/usermenu.scala.html`, `sidebar.scala.html`, `common/footer.scala.html`, `common/scripts.scala.html` | `__root.tsx`, `app.css`, `sidebar/route.tsx` | reopened, first correction landed | Continue root shell by rendering from partial-sized components and removing old React-contract tests. |
| P1 auth/public/home/help | `index/partial_intro.scala.html`, `user/login.scala.html`, `user/signup.scala.html`, `site/lostPassword.scala.html`, `user/resetPassword.scala.html`, `help/*.scala.html`, `welcome/*.scala.html` | `-auth-views.tsx`, `-home-view.tsx`, `-help-views.tsx`, public route dirs | reopened, auth start landed | Continue with public home/help/secret/restart template ports. |
| P2 project shell/settings/members/webhooks | `projectLayout.scala.html`, `project/header.scala.html`, `projectMenu.scala.html`, `project/home.scala.html`, `project/setting.scala.html`, `project/members.scala.html`, `project/webhooks.scala.html`, `project/issuelabels.scala.html`, `project/delete.scala.html`, `project/transfer.scala.html`, `project/change_vcs.scala.html` | `$owner/$projectName/**`, `-project-views.tsx` | reopened | Archive project route group and rebuild header/menu/home/settings first. |
| P3 issues/editor/comments/attachments | `issue/list.scala.html`, `issue/create.scala.html`, `issue/edit.scala.html`, `issue/view.scala.html`, `issue/partial_*.scala.html`, common editor/comment/upload partials | issue routes, `-issue-views.tsx`, markdown/editor modules | reopened | Inventory included partial graph, then rebuild issue list and issue detail separately. |
| P4 boards/milestones/posts | `board/*.scala.html`, `milestone/*.scala.html`, board/milestone partials | board/post/milestone routes, `-board-views.tsx`, `-milestone-views.tsx` | reopened | Rebuild board list/detail/form, then milestone list/detail/form. |
| P5 code/git/pull-request/review | `code/*.scala.html`, `git/*.scala.html`, `reviewthread/*.scala.html`, diff/comment partials | code/git/PR routes, `-code-views.tsx`, `-pull-request-views.tsx`, syntax/diff helpers | reopened | Split code browser from PR/review; do not let syntax helper shape page DOM. |
| P6 organization/directory/workspace/profile/settings/notifications/search | `organization/**`, `organizationLayout.scala.html`, `index/all*`, `index/my*`, `index/notifications.scala.html`, `search/*.scala.html`, `user/view.scala.html`, `user/edit*.scala.html`, `user/userFiles.scala.html` | organization, directory, workspace, notification, search routes and shared modules | reopened | Rebuild directory/org shell first, then workspace/profile/settings/search. |
| P7 site-admin/error/restricted/migration/import | `site/*.scala.html`, `site/siteMngLayout.scala.html`, `error/*.scala.html`, `restricted.scala.html`, `migration/*.scala.html`, `project/importing.scala.html` | `sites/$pageName`, restricted/error/import/migration routes | reopened | Rebuild site-admin layout/sidebar and concrete admin pages from templates. |

## First High-Risk Findings

| finding | classification | action |
| --- | --- | --- |
| Prior tests encoded `/sidebar` iframe/framed React behavior instead of the current parent decision. | stale React-contract test | Rewritten in `auth-workspace-shell.spec.tsx` to read legacy Scala templates and assert SPA layout sidebar anchors. |
| Existing large shared `-*-views.tsx` modules mix many template groups in one file. | audit risk | Archive per route group before destructive replacement; do not use these modules as DOM/UX evidence. |
| Existing P0-P7 reports contain many `covered in current follow-up` rows that predate the destructive rebuild directive. | weak closure basis | Treat reports as route/evidence index only; each row must be rechecked against Scala templates. |
| Some legacy server-rendered fragments are now REST/API-return plus React render. | conversion boundary | Preserve React-rendered DOM parity, but do not reintroduce server HTML injection as runtime data. |

## Full Legacy Template Inventory

Every legacy Scala template is assigned to a rebuild packet below. `reopen`
means the template must still be inspected before its active React owner can be
treated as parity evidence.

The generated anchor inventory for the same 242 templates is:
`docs/provenance/ui-parity-reports/2026-06-28-legacy-template-anchor-inventory.md`.
It extracts IDs, classes, form names/actions, `data-*` attributes, message keys,
and included template/helper calls from each Scala file. Use it as the first
checklist when rewriting tests and JSX, then verify the rendered route against
the owning template and partials.

The generated static React owner coverage matrix is:
`docs/provenance/ui-parity-reports/2026-06-28-static-react-owner-coverage.md`.
It maps all 242 legacy templates to likely `frontend/src/routes/**` owner files
and checks anchor string overlap. The current static triage result is 134
`static-anchor-candidate`, 93 `partial-static-match`, 3
`needs-static-review`, 12 `no-static-anchors`, and 0 `needs-owner-map`. These
counts are queue triage only; rendered route verification is still required
before any template is closed.

The rendered verification queue derived from that matrix is:
`docs/provenance/ui-parity-reports/2026-06-28-rendered-verification-queue.md`.
It keeps all 242 templates in scope and splits them into 12 P0, 89 P1, 7 P2,
and 134 P3 rendered verification rows. The exhaustive rebuild audit is not
complete while any row in that queue lacks rendered route evidence against its
owning Scala template and partials.

The first P0 source pass is:
`docs/provenance/ui-parity-reports/2026-06-28-p0-rendered-audit-pass.md`.
It opens the 12 P0 rows and classifies them as source-match checks,
intentional framed-layout deviations, gap candidates, or thin-wrapper caller
checks. This is not P0 closure; each row still needs rendered route evidence or
an explicit `gap`, `deviation`, or `deferred` record.

The first P1 source pass is:
`docs/provenance/ui-parity-reports/2026-06-28-p1-source-audit-pass.md`.
It expands all 89 P1 rows into source-level risk buckets: 57 rendered
interaction checks, 18 caller-route checks, 11 dynamic selector checks, and 3
rendered selector checks. This is not P1 closure; it identifies the rendered
evidence each row still needs.

The P2/P3 source pass is:
`docs/provenance/ui-parity-reports/2026-06-28-p2-p3-source-audit-pass.md`.
It expands the remaining 7 P2 rows and 134 P3 rows. Across the P0, P1, and
P2/P3 passes, all 242 legacy templates now have a source-pass follow-up row.
This still is not exhaustive audit completion: rendered route evidence, or a
precise `gap`, `deviation`, or `deferred` record, is required before any row
leaves the queue.

The rendered evidence execution manifest is:
`docs/provenance/ui-parity-reports/2026-06-28-rendered-evidence-execution-manifest.md`.
It maps all 242 source-pass rows to concrete route/evidence buckets and compares
them with `output/playwright/visual-sweep/latest.json` from
2026-06-28T07:48:07.381Z. The latest sweep can support route-open evidence for
240 rows; the 2 remaining rows are the intentionally retired framed layout
templates and now have a focused absence guard in
`frontend/src/auth-workspace-shell.spec.tsx` proving the iframe shell stays
absent from active React/CSS.
Selector, copy, form, and `data-*` assertions are still needed before closure,
and selector-only evidence is not final UI parity. Rendered evidence must also
cover size, position, and alignment or screenshot-diff parity. The first metric
guards now cover representative project settings and organization settings
shells; the rest of the route/template rows remain open until equivalent visual
layout evidence or an explicit `gap`, `deviation`, or `deferred` record exists.

### `board/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `board/create.scala.html` | P4 board | reopen: inspect Scala anchors before JSX reuse |
| `board/edit.scala.html` | P4 board | reopen: inspect Scala anchors before JSX reuse |
| `board/list.scala.html` | P4 board | reopen: inspect Scala anchors before JSX reuse |
| `board/partial_comments.scala.html` | P4 board | reopen: inspect Scala anchors before JSX reuse |
| `board/partial_list.scala.html` | P4 board | reopen: inspect Scala anchors before JSX reuse |
| `board/view.scala.html` | P4 board | reopen: inspect Scala anchors before JSX reuse |

### `code/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `code/branches.scala.html` | P5 code | reopen: inspect Scala anchors before JSX reuse |
| `code/compare.scala.html` | P5 code | reopen: inspect Scala anchors before JSX reuse |
| `code/compare_svn.scala.html` | P5 code | reopen: inspect Scala anchors before JSX reuse |
| `code/diff.scala.html` | P5 code | reopen: inspect Scala anchors before JSX reuse |
| `code/history.scala.html` | P5 code | reopen: inspect Scala anchors before JSX reuse |
| `code/nohead.scala.html` | P5 code | reopen: inspect Scala anchors before JSX reuse |
| `code/nohead_svn.scala.html` | P5 code | reopen: inspect Scala anchors before JSX reuse |
| `code/partial_branchrow.scala.html` | P5 code | reopen: inspect Scala anchors before JSX reuse |
| `code/partial_nonrange_codecomment_thread.scala.html` | P5 code | reopen: inspect Scala anchors before JSX reuse |
| `code/partial_view_file.scala.html` | P5 code | reopen: inspect Scala anchors before JSX reuse |
| `code/partial_view_folder.scala.html` | P5 code | reopen: inspect Scala anchors before JSX reuse |
| `code/svnDiff.scala.html` | P5 code | reopen: inspect Scala anchors before JSX reuse |
| `code/view.scala.html` | P5 code | reopen: inspect Scala anchors before JSX reuse |

### `common/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `common/attachmentFile.scala.html` | shared partials | reopen: inspect Scala anchors before JSX reuse |
| `common/branchItem.scala.html` | shared partials | reopen: inspect Scala anchors before JSX reuse |
| `common/calendar.scala.html` | shared partials | reopen: inspect Scala anchors before JSX reuse |
| `common/childComments.scala.html` | shared partials | reopen: inspect Scala anchors before JSX reuse |
| `common/childCommentsAnchorDiv.scala.html` | shared partials | reopen: inspect Scala anchors before JSX reuse |
| `common/child_commentForm.scala.html` | shared partials | reopen: inspect Scala anchors before JSX reuse |
| `common/commentAndVoterPairDisplay.scala.html` | shared partials | reopen: inspect Scala anchors before JSX reuse |
| `common/commentCount.scala.html` | shared partials | reopen: inspect Scala anchors before JSX reuse |
| `common/commentDeleteModal.scala.html` | shared partials | reopen: inspect Scala anchors before JSX reuse |
| `common/commentForm.scala.html` | shared partials | reopen: inspect Scala anchors before JSX reuse |
| `common/commentUpdateForm.scala.html` | shared partials | reopen: inspect Scala anchors before JSX reuse |
| `common/commitMsg.scala.html` | shared partials | reopen: inspect Scala anchors before JSX reuse |
| `common/debug.scala.html` | shared partials | reopen: inspect Scala anchors before JSX reuse |
| `common/editor.scala.html` | shared partials | reopen: inspect Scala anchors before JSX reuse |
| `common/fileUploader.scala.html` | shared partials | reopen: inspect Scala anchors before JSX reuse |
| `common/footer.scala.html` | P0 global shell | reopen: inspect Scala anchors before JSX reuse |
| `common/issueLabelColor.scala.html` | shared partials | reopen: inspect Scala anchors before JSX reuse |
| `common/loginDialog.scala.html` | P0 global shell | reopen: inspect Scala anchors before JSX reuse |
| `common/markdown.scala.html` | shared partials | reopen: inspect Scala anchors before JSX reuse |
| `common/mySeriesMenuTab.scala.html` | shared partials | reopen: inspect Scala anchors before JSX reuse |
| `common/navbar.scala.html` | P0 global shell | reopen: inspect Scala anchors before JSX reuse |
| `common/notificationMail.scala.html` | shared partials | reopen: inspect Scala anchors before JSX reuse |
| `common/partial_history.scala.html` | shared partials | reopen: inspect Scala anchors before JSX reuse |
| `common/reviewForm.scala.html` | shared partials | reopen: inspect Scala anchors before JSX reuse |
| `common/scripts.scala.html` | P0 global shell | reopen: inspect Scala anchors before JSX reuse |
| `common/select2.scala.html` | shared partials | reopen: inspect Scala anchors before JSX reuse |
| `common/sharerCount.scala.html` | shared partials | reopen: inspect Scala anchors before JSX reuse |
| `common/showSubtasksCheckbox.scala.html` | shared partials | reopen: inspect Scala anchors before JSX reuse |
| `common/tasklistBar.scala.html` | shared partials | reopen: inspect Scala anchors before JSX reuse |
| `common/twoColumnModeCheckboxArea.scala.html` | shared partials | reopen: inspect Scala anchors before JSX reuse |
| `common/uploadForm.scala.html` | shared partials | reopen: inspect Scala anchors before JSX reuse |
| `common/usermenu.scala.html` | P0 global shell | reopen: inspect Scala anchors before JSX reuse |
| `common/usermenu_tab_content_list.scala.html` | P0 global shell | reopen: inspect Scala anchors before JSX reuse |
| `common/uservoice.scala.html` | P0 global shell | reopen: inspect Scala anchors before JSX reuse |
| `common/voteCount.scala.html` | shared partials | reopen: inspect Scala anchors before JSX reuse |

### `error/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `error/badrequest.scala.html` | P7 error/security | reopen: inspect Scala anchors before JSX reuse |
| `error/badrequest_default.scala.html` | P7 error/security | reopen: inspect Scala anchors before JSX reuse |
| `error/forbidden.scala.html` | P7 error/security | reopen: inspect Scala anchors before JSX reuse |
| `error/forbidden_default.scala.html` | P7 error/security | reopen: inspect Scala anchors before JSX reuse |
| `error/forbidden_organization.scala.html` | P7 error/security | reopen: inspect Scala anchors before JSX reuse |
| `error/internalServerError_default.scala.html` | P7 error/security | reopen: inspect Scala anchors before JSX reuse |
| `error/notfound.scala.html` | P7 error/security | reopen: inspect Scala anchors before JSX reuse |
| `error/notfound_default.scala.html` | P7 error/security | reopen: inspect Scala anchors before JSX reuse |
| `error/requestTextEntityTooLarge.scala.html` | P7 error/security | reopen: inspect Scala anchors before JSX reuse |

### `git/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `git/clone.scala.html` | P5 git/pr | reopen: inspect Scala anchors before JSX reuse |
| `git/create.scala.html` | P5 git/pr | reopen: inspect Scala anchors before JSX reuse |
| `git/edit.scala.html` | P5 git/pr | reopen: inspect Scala anchors before JSX reuse |
| `git/fork.scala.html` | P5 git/pr | reopen: inspect Scala anchors before JSX reuse |
| `git/list.scala.html` | P5 git/pr | reopen: inspect Scala anchors before JSX reuse |
| `git/partial_branch.scala.html` | P5 git/pr | reopen: inspect Scala anchors before JSX reuse |
| `git/partial_forklist.scala.html` | P5 git/pr | reopen: inspect Scala anchors before JSX reuse |
| `git/partial_info.scala.html` | P5 git/pr | reopen: inspect Scala anchors before JSX reuse |
| `git/partial_list.scala.html` | P5 git/pr | reopen: inspect Scala anchors before JSX reuse |
| `git/partial_merge_result.scala.html` | P5 git/pr | reopen: inspect Scala anchors before JSX reuse |
| `git/partial_pull_request_event.scala.html` | P5 git/pr | reopen: inspect Scala anchors before JSX reuse |
| `git/partial_recently_pushed_branches.scala.html` | P5 git/pr | reopen: inspect Scala anchors before JSX reuse |
| `git/partial_reviewlist.scala.html` | P5 git/pr | reopen: inspect Scala anchors before JSX reuse |
| `git/partial_search.scala.html` | P5 git/pr | reopen: inspect Scala anchors before JSX reuse |
| `git/partial_state.scala.html` | P5 git/pr | reopen: inspect Scala anchors before JSX reuse |
| `git/view.scala.html` | P5 git/pr | reopen: inspect Scala anchors before JSX reuse |
| `git/viewChanges.scala.html` | P5 git/pr | reopen: inspect Scala anchors before JSX reuse |

### `help/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `help/UIKit.scala.html` | P1 help | reopen: inspect Scala anchors before JSX reuse |
| `help/experimental.scala.html` | P1 help | reopen: inspect Scala anchors before JSX reuse |
| `help/keymap.scala.html` | P1 help | reopen: inspect Scala anchors before JSX reuse |
| `help/markdown.scala.html` | P1 help | reopen: inspect Scala anchors before JSX reuse |
| `help/toc.scala.html` | P1 help | reopen: inspect Scala anchors before JSX reuse |

### `index/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `index/allOrganizationList.scala.html` | P1/P6 home workspace | reopen: inspect Scala anchors before JSX reuse |
| `index/allOrganizationList_partial.scala.html` | P1/P6 home workspace | reopen: inspect Scala anchors before JSX reuse |
| `index/allProjectList.scala.html` | P1/P6 home workspace | reopen: inspect Scala anchors before JSX reuse |
| `index/allProjectList_partial.scala.html` | P1/P6 home workspace | reopen: inspect Scala anchors before JSX reuse |
| `index/displayProjects.scala.html` | P1/P6 home workspace | reopen: inspect Scala anchors before JSX reuse |
| `index/index.scala.html` | P1/P6 home workspace | reopen: inspect Scala anchors before JSX reuse |
| `index/myOrganizationList.scala.html` | P1/P6 home workspace | reopen: inspect Scala anchors before JSX reuse |
| `index/myOrganizationList_partial.scala.html` | P1/P6 home workspace | reopen: inspect Scala anchors before JSX reuse |
| `index/myProjectList.scala.html` | P1/P6 home workspace | reopen: inspect Scala anchors before JSX reuse |
| `index/myProjectList_partial.scala.html` | P1/P6 home workspace | reopen: inspect Scala anchors before JSX reuse |
| `index/myRecentIssueList.scala.html` | P1/P6 home workspace | reopen: inspect Scala anchors before JSX reuse |
| `index/myRecentIssueList_partial.scala.html` | P1/P6 home workspace | reopen: inspect Scala anchors before JSX reuse |
| `index/notifications.scala.html` | P1/P6 home workspace | reopen: inspect Scala anchors before JSX reuse |
| `index/partial_intro.scala.html` | P1/P6 home workspace | reopen: inspect Scala anchors before JSX reuse |
| `index/partial_notifications.scala.html` | P1/P6 home workspace | reopen: inspect Scala anchors before JSX reuse |
| `index/sidebar.scala.html` | P1/P6 home workspace | reopen: inspect Scala anchors before JSX reuse |

### `issue/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `issue/create.scala.html` | P3 issue | reopen: inspect Scala anchors before JSX reuse |
| `issue/edit.scala.html` | P3 issue | reopen: inspect Scala anchors before JSX reuse |
| `issue/list.scala.html` | P3 issue | reopen: inspect Scala anchors before JSX reuse |
| `issue/my_list.scala.html` | P3 issue | reopen: inspect Scala anchors before JSX reuse |
| `issue/my_partial_list.scala.html` | P3 issue | reopen: inspect Scala anchors before JSX reuse |
| `issue/my_partial_list_quicksearch.scala.html` | P3 issue | reopen: inspect Scala anchors before JSX reuse |
| `issue/my_partial_search.scala.html` | P3 issue | reopen: inspect Scala anchors before JSX reuse |
| `issue/partial_assignee.scala.html` | P3 issue | reopen: inspect Scala anchors before JSX reuse |
| `issue/partial_comment.scala.html` | P3 issue | reopen: inspect Scala anchors before JSX reuse |
| `issue/partial_comments.scala.html` | P3 issue | reopen: inspect Scala anchors before JSX reuse |
| `issue/partial_event_timeline.scala.html` | P3 issue | reopen: inspect Scala anchors before JSX reuse |
| `issue/partial_index_comment.scala.html` | P3 issue | reopen: inspect Scala anchors before JSX reuse |
| `issue/partial_index_comments.scala.html` | P3 issue | reopen: inspect Scala anchors before JSX reuse |
| `issue/partial_index_event_timeline.scala.html` | P3 issue | reopen: inspect Scala anchors before JSX reuse |
| `issue/partial_list.scala.html` | P3 issue | reopen: inspect Scala anchors before JSX reuse |
| `issue/partial_list_draft.scala.html` | P3 issue | reopen: inspect Scala anchors before JSX reuse |
| `issue/partial_list_quicksearch.scala.html` | P3 issue | reopen: inspect Scala anchors before JSX reuse |
| `issue/partial_list_subtask.scala.html` | P3 issue | reopen: inspect Scala anchors before JSX reuse |
| `issue/partial_list_wrap.scala.html` | P3 issue | reopen: inspect Scala anchors before JSX reuse |
| `issue/partial_massupdate.scala.html` | P3 issue | reopen: inspect Scala anchors before JSX reuse |
| `issue/partial_searchform.scala.html` | P3 issue | reopen: inspect Scala anchors before JSX reuse |
| `issue/partial_select_label.scala.html` | P3 issue | reopen: inspect Scala anchors before JSX reuse |
| `issue/partial_select_subtask.scala.html` | P3 issue | reopen: inspect Scala anchors before JSX reuse |
| `issue/partial_show_selected_label.scala.html` | P3 issue | reopen: inspect Scala anchors before JSX reuse |
| `issue/partial_view_child.scala.html` | P3 issue | reopen: inspect Scala anchors before JSX reuse |
| `issue/partial_view_childIssueList.scala.html` | P3 issue | reopen: inspect Scala anchors before JSX reuse |
| `issue/partial_view_childIssueListOnly.scala.html` | P3 issue | reopen: inspect Scala anchors before JSX reuse |
| `issue/partial_voter_list.scala.html` | P3 issue | reopen: inspect Scala anchors before JSX reuse |
| `issue/partial_voters.scala.html` | P3 issue | reopen: inspect Scala anchors before JSX reuse |
| `issue/view.scala.html` | P3 issue | reopen: inspect Scala anchors before JSX reuse |

### root layout and shared top-level partials

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `layout.scala.html` | P0/P7 layout | reopen: inspect Scala anchors before JSX reuse |
| `layout_framed.scala.html` | P0/P7 layout | reference-only for active SPA sidebar decision |
| `organizationLayout.scala.html` | P6 organization | reopen: inspect Scala anchors before JSX reuse |
| `partial_comment_form_on_thread.scala.html` | shared P5/P3 diff/comment | reopen: inspect Scala anchors before JSX reuse |
| `partial_comment_thread.scala.html` | shared P5/P3 diff/comment | reopen: inspect Scala anchors before JSX reuse |
| `partial_diff.scala.html` | shared P5/P3 diff/comment | reopen: inspect Scala anchors before JSX reuse |
| `partial_diff_comment_on_line.scala.html` | shared P5/P3 diff/comment | reopen: inspect Scala anchors before JSX reuse |
| `partial_diff_line.scala.html` | shared P5/P3 diff/comment | reopen: inspect Scala anchors before JSX reuse |
| `partial_filediff.scala.html` | shared P5/P3 diff/comment | reopen: inspect Scala anchors before JSX reuse |
| `partial_update_notification.scala.html` | P0 global shell | reopen: inspect Scala anchors before JSX reuse |
| `projectLayout.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `projectMenu.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `restricted.scala.html` | P7 error/security | reopen: inspect Scala anchors before JSX reuse |
| `sidebar.scala.html` | P0/P6 sidebar | reopen under SPA root-layout sidebar decision |
| `siteLayout.scala.html` | P0/P7 layout | reopen: inspect Scala anchors before JSX reuse |
| `siteLayout_framed.scala.html` | P0/P7 layout | reference-only unless a concrete app-runtime route still needs framed semantics |

### `migration/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `migration/home.scala.html` | P7 migration | reopen: inspect Scala anchors before JSX reuse |
| `migration/migrationPageLayout.scala.html` | P7 migration | reopen: inspect Scala anchors before JSX reuse |

### `milestone/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `milestone/create.scala.html` | P4 milestone | reopen: inspect Scala anchors before JSX reuse |
| `milestone/edit.scala.html` | P4 milestone | reopen: inspect Scala anchors before JSX reuse |
| `milestone/list.scala.html` | P4 milestone | reopen: inspect Scala anchors before JSX reuse |
| `milestone/partial_status.scala.html` | P4 milestone | reopen: inspect Scala anchors before JSX reuse |
| `milestone/view.scala.html` | P4 milestone | reopen: inspect Scala anchors before JSX reuse |

### `organization/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `organization/create.scala.html` | P6 organization | reopen: inspect Scala anchors before JSX reuse |
| `organization/deleteForm.scala.html` | P6 organization | reopen: inspect Scala anchors before JSX reuse |
| `organization/group_board_list.scala.html` | P6 organization | reopen: inspect Scala anchors before JSX reuse |
| `organization/group_board_list_partial.scala.html` | P6 organization | reopen: inspect Scala anchors before JSX reuse |
| `organization/group_issue_list.scala.html` | P6 organization | reopen: inspect Scala anchors before JSX reuse |
| `organization/group_issue_list_partial.scala.html` | P6 organization | reopen: inspect Scala anchors before JSX reuse |
| `organization/group_issue_list_quicksearch.scala.html` | P6 organization | reopen: inspect Scala anchors before JSX reuse |
| `organization/group_issue_search_partial.scala.html` | P6 organization | reopen: inspect Scala anchors before JSX reuse |
| `organization/group_pullrequest_list.scala.html` | P6 organization | reopen: inspect Scala anchors before JSX reuse |
| `organization/group_pullrequest_list_partial.scala.html` | P6 organization | reopen: inspect Scala anchors before JSX reuse |
| `organization/header.scala.html` | P6 organization | reopen: inspect Scala anchors before JSX reuse |
| `organization/list.scala.html` | P6 organization | reopen: inspect Scala anchors before JSX reuse |
| `organization/members.scala.html` | P6 organization | reopen: inspect Scala anchors before JSX reuse |
| `organization/menu.scala.html` | P6 organization | reopen: inspect Scala anchors before JSX reuse |
| `organization/partial_settingmenu.scala.html` | P6 organization | reopen: inspect Scala anchors before JSX reuse |
| `organization/setting.scala.html` | P6 organization | reopen: inspect Scala anchors before JSX reuse |
| `organization/view.scala.html` | P6 organization | reopen: inspect Scala anchors before JSX reuse |

### `project/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `project/change_vcs.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/create.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/delete.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/header.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/home.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/importing.scala.html` | P7 import/P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/issuelabels.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/list.scala.html` | P6 directory/P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/members.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/partial_dashboard.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/partial_dashboard_issuesbyassignee.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/partial_dashboard_issuesbylabel.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/partial_dashboard_issuesbymilestone.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/partial_dashboard_pullrequests.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/partial_history.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/partial_issuelabels_editcategory.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/partial_issuelabels_editlabel.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/partial_issuelabels_list.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/partial_readme.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/partial_settingmenu.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/partial_webhooks_list.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/setting.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/statistics.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/transfer.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/watchers.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |
| `project/webhooks.scala.html` | P2 project | reopen: inspect Scala anchors before JSX reuse |

### `reviewthread/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `reviewthread/list.scala.html` | P5 review | reopen: inspect Scala anchors before JSX reuse |
| `reviewthread/partial_list.scala.html` | P5 review | reopen: inspect Scala anchors before JSX reuse |

### `search/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `search/partial_issue_comments.scala.html` | P6 search | reopen: inspect Scala anchors before JSX reuse |
| `search/partial_issues.scala.html` | P6 search | reopen: inspect Scala anchors before JSX reuse |
| `search/partial_milestones.scala.html` | P6 search | reopen: inspect Scala anchors before JSX reuse |
| `search/partial_post_comments.scala.html` | P6 search | reopen: inspect Scala anchors before JSX reuse |
| `search/partial_posts.scala.html` | P6 search | reopen: inspect Scala anchors before JSX reuse |
| `search/partial_projects.scala.html` | P6 search | reopen: inspect Scala anchors before JSX reuse |
| `search/partial_reviews.scala.html` | P6 search | reopen: inspect Scala anchors before JSX reuse |
| `search/partial_search.scala.html` | P6 search | reopen: inspect Scala anchors before JSX reuse |
| `search/partial_users.scala.html` | P6 search | reopen: inspect Scala anchors before JSX reuse |
| `search/result.scala.html` | P6 search | reopen: inspect Scala anchors before JSX reuse |

### `site/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `site/data.scala.html` | P7 site-admin | metric guard passed: `site-admin-data-parity.e2e.ts` asserts warning/export/import ordering, export anchor, file input/import submit alignment, and TanStack mutation boundary |
| `site/diagnostic.scala.html` | P7 site-admin | metric guard passed: `site-admin-diagnostic-parity.e2e.ts` asserts no-error/error branches, diagnostic pre-block alignment, and site-admin shell layout |
| `site/issueList.scala.html` | P7 site-admin | metric guard passed: `site-admin-issue-list-parity.e2e.ts` asserts state tabs, post-style row avatar/info/meta alignment, anchors, and pagination |
| `site/lostPassword.scala.html` | P1 auth | metric guard passed: `auth-public-entry-parity.e2e.ts` asserts reset title/tagline stack, centered form width, input alignment, full-width submit, footer order, resolved copy, and TanStack mutation boundary |
| `site/mail.scala.html` | P7 site-admin | metric guard passed: `site-admin-mail-parity.e2e.ts` asserts form-horizontal label/control alignment, textarea sizing, alerts, and TanStack mutation submit boundary |
| `site/massMail.scala.html` | P7 site-admin | metric guard passed: `site-admin-mail-parity.e2e.ts` asserts radio/control ordering, project selector input/button alignment, selected-project label, and TanStack mutation submit boundary |
| `site/partial_pagination.scala.html` | P7 site-admin | metric guard passed: `site-admin-project-list-parity.e2e.ts` asserts rendered pagination position/link shape on `/sites/projectList` |
| `site/partial_paginationForUserList.scala.html` | P7 site-admin | metric guard passed: `site-admin-user-list-parity.e2e.ts` asserts rendered pagination position/link shape on `/sites/userList` |
| `site/postList.scala.html` | P7 site-admin | metric guard passed: `site-admin-post-list-parity.e2e.ts` asserts post-style row avatar/info/meta alignment, anchors, and pagination |
| `site/projectList.scala.html` | P7 site-admin | metric guard passed: `site-admin-project-list-parity.e2e.ts` asserts title/filter alignment, listhead-to-row column alignment, delete modal hooks, and pagination |
| `site/setting.scala.html` | P7 site-admin | legacy-placeholder deviation recorded: Scala body is only `TODO` inside `siteMngLayout(message)` and legacy nav does not expose a setting page; React intentionally does not restore a visible `/sites/setting` TODO page |
| `site/siteMngLayout.scala.html` | P7 site-admin | metric guard passed: site-admin e2e suite asserts shared navbar, breadcrumb, left nav, content column, and footer ordering across user/project/post/issue/mail/data/update/diagnostic routes |
| `site/update.scala.html` | P7 site-admin | metric guard passed: `site-admin-update-parity.e2e.ts` asserts update/no-update/download branches, message ordering, and site-admin shell layout |
| `site/userList.scala.html` | P7 site-admin | metric guard passed: `site-admin-user-list-parity.e2e.ts` asserts title/search alignment, tabs, listhead/row/pagination ordering, and user action hooks |

### `user/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `user/edit.scala.html` | P6 workspace/profile | reopen: inspect Scala anchors before JSX reuse |
| `user/edit_emails.scala.html` | P6 workspace/profile | reopen: inspect Scala anchors before JSX reuse |
| `user/edit_notifications.scala.html` | P6 workspace/profile | reopen: inspect Scala anchors before JSX reuse |
| `user/edit_password.scala.html` | P6 workspace/profile | reopen: inspect Scala anchors before JSX reuse |
| `user/edit_token.scala.html` | P6 workspace/profile | reopen: inspect Scala anchors before JSX reuse |
| `user/login.scala.html` | P1 auth | reopen: inspect Scala anchors before JSX reuse |
| `user/partial_edit_tabmenu.scala.html` | P6 workspace/profile | reopen: inspect Scala anchors before JSX reuse |
| `user/partial_issues.scala.html` | P6 workspace/profile | reopen: inspect Scala anchors before JSX reuse |
| `user/partial_milestones.scala.html` | P6 workspace/profile | reopen: inspect Scala anchors before JSX reuse |
| `user/partial_postings.scala.html` | P6 workspace/profile | reopen: inspect Scala anchors before JSX reuse |
| `user/partial_projectlist.scala.html` | P6 workspace/profile | reopen: inspect Scala anchors before JSX reuse |
| `user/partial_pullRequests.scala.html` | P6 workspace/profile | reopen: inspect Scala anchors before JSX reuse |
| `user/resetPassword.scala.html` | P1 auth | reopen: inspect Scala anchors before JSX reuse |
| `user/signup.scala.html` | P1 auth | reopen: inspect Scala anchors before JSX reuse |
| `user/userFiles.scala.html` | P6 workspace/profile | reopen: inspect Scala anchors before JSX reuse |
| `user/verified.scala.html` | P1 auth | reopen: inspect Scala anchors before JSX reuse |
| `user/view.scala.html` | P6 workspace/profile | reopen: inspect Scala anchors before JSX reuse |

### `welcome/`

| legacy template | packet | audit disposition |
| --- | --- | --- |
| `welcome/restart.scala.html` | P1/P7 setup | reopen: inspect Scala anchors before JSX reuse |
| `welcome/secret.scala.html` | P1/P7 setup | reopen: inspect Scala anchors before JSX reuse |

## Rebuild Execution Queue

The queue is ordered by blast radius and dependency shape, not by prior
completion claims.

| order | packet | reason | concrete first slice |
| ---: | --- | --- | --- |
| 1 | P0 global shell | Every page inherits this surface; tests already exposed stale React-contract assumptions. | Split `__root.tsx` into template-named partial components for navbar, usermenu/sidebar, footer, scripts bridge. |
| 2 | P1 auth/public/home/help | Bounded public routes, already partially archived and rebuilt. | Finish home/help/secret/restart from `index/partial_intro.scala.html`, `help/*.scala.html`, `welcome/*.scala.html`. |
| 3 | P2 project shell | Project header/menu wraps most project workflows. | Archive `$owner/$projectName` shell pieces and port `projectLayout`, `project/header`, `projectMenu`, `project/home`. |
| 4 | P6 directory/organization/workspace | Organization and workspace layouts affect search/navigation and user landing flows. | Port project/org directory pages and organization shell before workspace profile/settings. |
| 5 | P3 issue list/detail | Largest user workflow, many common partials. | Port issue list/search wrapper, then issue detail/comment/timeline partials. |
| 6 | P4 board/milestone | Shares comment/editor/list patterns with P3 but smaller. | Port board list/detail/form, then milestone list/detail/form. |
| 7 | P5 code/git/PR/review | Broadest UI and diff/code helpers; depends on project shell being stable. | Split code browser/history from PR/review before touching shared syntax/diff helpers. |
| 8 | P7 site-admin/error/migration | Large admin surface but route-isolated. | Port `siteMngLayout` and concrete admin list/form pages from `site/*.scala.html`. |

## Verification Baseline For This Audit Turn

Commands run before this ledger:

- `pnpm --dir frontend check`
- `pnpm --dir frontend test src/auth-workspace-shell.spec.tsx src/form-submit-boundary.spec.tsx`

The next audit turn should choose one reopened group, archive its current active
JSX, and replace it from the owning Scala template set before broadening to the
next group.
