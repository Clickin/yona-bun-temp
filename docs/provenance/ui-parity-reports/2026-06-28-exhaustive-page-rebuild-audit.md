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

## Verification Baseline For This Audit Turn

Commands run before this ledger:

- `pnpm --dir frontend check`
- `pnpm --dir frontend test src/auth-workspace-shell.spec.tsx src/form-submit-boundary.spec.tsx`

The next audit turn should choose one reopened group, archive its current active
JSX, and replace it from the owning Scala template set before broadening to the
next group.
