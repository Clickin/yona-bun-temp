# Template-First UI Parity Reset

Status: current execution directive
Date: 2026-06-26

## Decision

The current React UI is not accepted as legacy Yona UI parity. The prior visual
sweeps proved route reachability, stylesheet loading, direct API conversion, and
absence of obvious browser failures; they did not prove pixel-level replacement
quality. User-visible feedback that the app looks like a toy compared with
legacy Yona is a valid parity defect, not an enhancement request.

The UI parity strategy is therefore reset to **template-first conversion**:

1. Preserve legacy Yona page structure, CSS class contract, labels, form order,
   modal markup, table/list density, and interaction affordances from
   `yona-original/app/views/**`.
2. Reuse legacy Bootstrap/Yobi CSS as the baseline instead of introducing a new
   design system.
3. Port Scala templates to JSX/TSX as close to 1:1 as practical, then extract
   shared React components only after the legacy DOM/class shape is preserved.
4. Treat Tailwind or a new utility-first design layer as out of scope until
   functional and UI parity are complete.

This is a conversion project. Visual or functional improvements may be proposed
only after legacy parity is complete.

## Supersedes

This directive supersedes the closure claim in
`docs/provenance/frontend-ui-parity-completion-audit.md`. That audit remains
useful as route/API coverage evidence, but it is no longer sufficient evidence
for UI parity.

## Template Hierarchy

Legacy Yona visible UI is organized around template shells and repeated partials.
React conversion must preserve these layers before route-specific details are
declared complete.

| Layer | Legacy templates | React target | Parity requirement |
| --- | --- | --- | --- |
| Global shell | `layout.scala.html`, `layout_framed.scala.html`, `common/navbar.scala.html`, `common/footer.scala.html`, `common/loginDialog.scala.html`, `common/scripts.scala.html`, `common/usermenu.scala.html` | root shell/shared layout components | Same linked asset order/effect, `.gnb-outer`, side navigation pin behavior, login dialog DOM/classes, footer, global search, user menu tabs, flash/toast/modal containers. |
| Project shell | `projectLayout.scala.html`, `project/header.scala.html`, `projectMenu.scala.html`, `project/partial_settingmenu.scala.html` | project route wrapper and shared project components | Same `.project-header-outer`, background/avatar/breadcrumb/favorite/private/protected markers, watcher/member controls, `.project-menu-outer`, menu order/count badges, admin cog. |
| Organization shell | `organizationLayout.scala.html`, `organization/header.scala.html`, `organization/menu.scala.html`, `organization/partial_settingmenu.scala.html` | organization route wrapper/components | Same organization header/menu/settings layout, member/admin controls, empty and protected states. |
| Site-admin shell | `siteLayout.scala.html`, `site/siteMngLayout.scala.html`, `site/*.scala.html`, `site/partial_pagination*.scala.html` | `/sites/$pageName` route/components | Same breadcrumb/sidebar/page-title layout, tables, filters, pagination, modal/confirm controls, mail/data/update state copy. |
| Auth/public shell | `index/index.scala.html`, `index/partial_intro.scala.html`, `user/login.scala.html`, `user/signup.scala.html`, `site/lostPassword.scala.html`, `user/resetPassword.scala.html` | public/auth route components | Same landing, auth forms, placeholders, OAuth button display, remember-me row, password links, first-run/admin setup state. |
| Issue surface | `issue/*.scala.html`, `common/comment*.scala.html`, `common/editor.scala.html`, `common/fileUploader.scala.html`, `common/tasklistBar.scala.html` | issue list/form/detail/comment/editor components | Same list filters, quick search, labels, assignee/milestone controls, textarea/editor toolbar, comments/timeline, child issue/subtask blocks, mass update. |
| Board/milestone surface | `board/*.scala.html`, `milestone/*.scala.html` | board and milestone route components | Same list/detail/form/comment surfaces, state tabs, delete modals, milestone progress/status blocks. |
| Code/VCS surface | `code/*.scala.html`, `git/*.scala.html`, diff partials | code browser, commits, branches, compare, PR/review components | Same repository action bars, clone info, branch selector, file/folder tables, diff rows, review thread/comment anchors, PR event timeline. |
| Search/notifications/workspace | `search/*.scala.html`, `index/notifications.scala.html`, `index/sidebar.scala.html`, `user/edit*.scala.html`, `user/view.scala.html`, `user/userFiles.scala.html` | search, notification, sidebar, profile/settings components | Same tabs, empty states, notification fragments as React-rendered rows, profile cards, settings tab menu, token/email/file list controls. |
| Error/restricted/help | `error/*.scala.html`, `restricted.scala.html`, `help/*.scala.html` | error/help/restricted route components | Same page classes, error copy/layout, help FAQ/table of contents, UIKit reference where in scope. |

## CSS Baseline Rule

The target CSS baseline is legacy Yona:

1. `yona-original/public/bootstrap/css/bootstrap.css`
2. `yona-original/public/bootstrap/css/bootstrap-responsive.css`
3. compiled legacy `yobi.css` behavior from
   `yona-original/app/assets/stylesheets/yobi.less` and imported LESS files
4. `usermenu.css`, `yobicon`, Select2/Pikaday/NProgress/Viewer styles where
   the legacy template loaded them

React components should use legacy classes such as `page-wrap-outer`,
`project-page-wrap`, `project-header-outer`, `project-menu-outer`, `ybtn`,
`frm-wrap`, `nm`, `n-alert`, `board-list-wrap`, `issue-list-wrap`, and
`markdown-wrap` instead of replacing them with a new visual vocabulary.

Inline style values and conditional classes present in templates are part of
the conversion target unless explicitly recorded as not-applicable.

## Conversion Method

Each route family follows this order:

1. Read the owning Scala template and all partials it calls.
2. Create a DOM/class/copy skeleton in React that mirrors the template before
   wiring new abstractions.
3. Map dynamic expressions to existing REST data/view models without changing
   visible order or labels.
4. Replace server-side HTML fragments with API-return plus React render only at
   the data boundary; the rendered DOM should still match the legacy fragment's
   visible shape.
5. Extract shared components only when at least two converted templates already
   share the same legacy markup.
6. Compare against legacy browser output before marking the route covered.

No worker may introduce Tailwind, new card-based layouts, new spacing scales, or
new design tokens to close a parity row.

## Subagent Model

Use four concurrent roles. The parent/main agent owns this document, queue
triage, final integration, and commits.

| Role | Mode | Primary scope | Output |
| --- | --- | --- | --- |
| Subagent A: Template Mapper | read-only explorer | Parse `yona-original/app/views/**`, identify template call graph, repeated partials, CSS classes, route/state variants. | Template inventory report with legacy paths, partial dependencies, DOM anchors, and packet ownership. |
| Subagent B: React Port Worker | bounded writer | Convert assigned route packet from template skeleton to React JSX using legacy classes and existing REST clients. | Focused TSX/CSS/test changes only in assigned files, plus report row updates. |
| Subagent C: Interaction Worker | bounded writer | Port dynamic states that static route render misses: validation, modal open/cancel/confirm, filter/search/pagination, uploads, comments, mutation-visible results. | Focused interaction wiring/tests for assigned packet. |
| Subagent D: Visual Verifier | read-only verifier | Compare legacy template/live legacy output with current React output for assigned packet. Must not implement. | Browser evidence, screenshots, selector/copy/layout diff rows, pass/fail verdict. |

The parent may also act as one of the four roles when useful, but one role must
remain verification-only for each packet.

## Packet Split

Packets are split by legacy template ownership and React write scope. A worker
may edit only its packet files unless the parent expands scope.

| Packet | Legacy template roots | Current React roots | Owner type | Verification target |
| --- | --- | --- | --- | --- |
| P0 global shell/assets | `layout*`, `common/navbar`, `common/footer`, `common/loginDialog`, `common/usermenu`, `common/scripts` | `frontend/src/routes/__root.tsx`, `frontend/src/routes/-shared.tsx`, global CSS/assets | mapper + worker + verifier | first viewport global shell, login dialog, side menu, asset/style count/effect |
| P1 auth/public/home | `index/**`, `user/login`, `user/signup`, `site/lostPassword`, `user/resetPassword`, `help/**` | `index`, `users/loginform`, `users/signupform`, `lostPassword`, `resetPassword`, `_help`, auth views | worker + verifier | anonymous and authenticated public states, OAuth buttons, first-run/no-admin |
| P2 project shell/settings | `projectLayout`, `project/header`, `projectMenu`, `project/home`, `project/create`, `project/setting`, `project/members`, `project/watchers`, `project/webhooks`, `project/delete`, `project/transfer`, `project/change_vcs` | `$owner/$projectName/**`, `projectform`, `_import`, project views | worker + verifier | project header/menu pixel shape, settings submenus, admin/member/watch/favorite controls |
| P3 issue/editor/comments | `issue/**`, `common/editor`, `common/comment*`, `common/fileUploader`, `common/tasklistBar` | issue routes/views, markdown/attachment textarea | worker + interaction + verifier | issue list/detail/form/editor/comment/mass update, modal and validation states |
| P4 board/milestone | `board/**`, `milestone/**` | board and milestone views/routes | worker + interaction + verifier | board/milestone list/detail/form/comment/delete/progress states |
| P5 code/git/pr/review | `code/**`, `git/**`, `reviewthread/**`, diff partials | code, commits, branches, compare, pull request, review views/routes | worker + interaction + verifier | repository browser, clone info, diff/PR/review thread, Git/SVN-visible UI |
| P6 organization/directory/workspace | `organization/**`, `organizationLayout`, `index/all*`, `user/view`, `user/edit*`, `user/userFiles`, `index/sidebar`, `index/notifications` | org routes, directory routes, profile/settings/files/notification routes | worker + interaction + verifier | org shell/member/settings, directory lists, profile/settings, user menu/sidebar |
| P7 site-admin/error/security | `site/**`, `siteLayout*`, `error/**`, `restricted` | `/sites/$pageName`, error/restricted routes | worker + verifier | site-admin sidebar/tables/forms/pagination/mail/data/update, error pages |

## Verification Contract

A packet is not closed by route reachability. It closes only when the verifier
records all of the following:

- legacy source template path and current React file path
- desktop screenshot and mobile screenshot for legacy and current, or an
  explicit not-applicable reason for mobile when legacy is not responsive
- selector/class assertions for the packet's shell (`.gnb-outer`,
  `.project-header-outer`, `.project-menu-outer`, `.site-breadcrumb-outer`,
  etc.)
- visible copy/placeholder/title parity against legacy messages
- form validation and success/failure state where the template contains a form
- modal/dropdown/tab/filter/pagination state where the template contains one
- raw legacy key absence
- same base-path behavior under `/yona`
- status classification for legacy sample-data 404/500/400 differences

The verifier must compare against legacy output through the node curl proxy when
Playwright cannot directly reach the legacy host.

## Audit Queue Format

Every finding goes into the owning packet report using this row shape:

| field | required value |
| --- | --- |
| legacy template | exact `yona-original/app/views/...` path |
| legacy route/state | URL, user role, project visibility, data state, interaction state |
| current file | exact React/API/test path |
| defect class | `layout`, `css`, `copy`, `route`, `interaction`, `permission`, `data-boundary`, `asset`, or `test-gap` |
| status | `gap`, `deviation`, `weak evidence`, `covered`, `not-applicable`, `deferred`, `needs-parent-decision` |
| owner packet | P0-P7 |
| proposed write scope | exact files/modules a worker may touch |
| verification evidence | screenshot path, Playwright spec, curl/proxy artifact, or selector assertion |

Any `gap`, `deviation`, or `weak evidence` blocks UI parity closure.

## Immediate Next Steps

Update 2026-06-27:

- No `.webp` files are present in the repository or ignored output tree; no
  webp asset deletion was required.
- P1 auth/public/home now has a template-first reset report at
  `docs/provenance/ui-parity-reports/template-first-p1-auth-public-home.md`.
  The report records legacy login/signup/lost-reset/verify/secret/help/public
  home templates against the current React/API targets, preserves OAuth and
  first-run/no-admin browser evidence, and has no standalone
  `needs-parent-decision` row.
- `scripts/visual-parity-sweep.mjs` now supports focused path sweeps through
  `YORAM_SWEEP_PATHS` and records P2/P3 selector metrics/screenshots.
- P2/P3 focused sweep evidence is recorded in
  `docs/provenance/ui-parity-reports/template-first-p2-project-shell.md` and
  `docs/provenance/ui-parity-reports/template-first-p3-issues-editor-comments.md`.
- CSS parity follow-up restored full-width project shells, legacy
  `project-page-wrap`/`page-wrap` widths, Bootstrap 2 `row-fluid/span*`
  desktop grid behavior, and `cu-label`/`cu-desc` inline layout in
  `frontend/src/app.css`.
- P3 live `/admin/sample/issue/1` weak evidence was reclassified after the
  visual sweep began waiting for the local issue body selector; current
  evidence shows the sampled zero-comment detail route rendering after async
  data load.
- `scripts/visual-parity-sweep.mjs` now supports `YORAM_SWEEP_VIEWPORT=mobile`
  and writes mobile evidence to `output/playwright/visual-sweep/latest-mobile.json`
  plus `legacy-mobile-*` / `local-mobile-*` screenshots. P3 mobile screenshot
  evidence for issue list, user issue list, issue create/edit forms, and issue
  detail is recorded in
  `docs/provenance/ui-parity-reports/template-first-p3-issues-editor-comments.md`.
- P3 interaction-state proof is now recorded for focused issue list/detail/form
  routes: filter/search, pagination, mass update, editor preview, upload/drop,
  comment edit/delete, child comments, and sidebar metadata updates. P3 still
  requires an integrated packet closure audit against all P3 route/state rows
  before the whole packet can close.
- P0 root-shell verifier evidence is now recorded from
  `pnpm --dir frontend test:e2e -- root-shell-parity.e2e.ts` (`6 passed`):
  anonymous desktop shell, mobile login dialog, authenticated side menu, create
  dropdown hidden/open state, guest navbar restrictions, project search scope,
  `/yona` base-path anchors, and raw-key absence. P0 no longer has a standalone
  verifier-baseline blocker, though whole UI parity still requires the
  integrated browser sweep.
- Integrated desktop browser sweep was rerun through the node curl proxy and a
  fresh local runtime DB:
  `YONA_LEGACY_BASE_URL=http://127.0.0.1:19100 YORAM_BASE_URL=http://127.0.0.1:3101/yona YORAM_SWEEP_TARGET=both node scripts/visual-parity-sweep.mjs`.
  Artifact: `output/playwright/visual-sweep/latest.json`, checked at
  `2026-06-26T17:14:26.291Z`. Result: legacy `93/96`, local `174/174`, local
  direct API surfaces `13/13`, comparison `diffFailures 0`, `localFailures 0`,
  with `22` status deltas from legacy sample/homelab data states or non-HTML
  export boundaries such as legacy 404/500/400/0 versus local rendered pages.
  The sweep now ignores only Vite dev
  `ERR_ABORTED` module-load noise for framed `/sidebar` pages while preserving
  real request failures.
- Vite dev proxy parity was refreshed in `frontend/vite.config.ts` so the
  sweep's direct compatibility/API surfaces reach the backend from the mounted
  frontend origin: `-_-api`, `markdown`, `notification` JSON, user-menu/sidebar,
  and project compatibility routes for labels/mention lists are proxied while
  `/notification` browser navigation with `Accept: text/html` remains SPA
  fallback.
- The `22` integrated status deltas are now packet-owned and classified in
  `docs/provenance/ui-parity-reports/README.md#integrated-status-delta-classification`.
  P3 issue export and P5 review export are `covered` because `format=xls`
  routes are implemented and covered by backend/frontend evidence. P5
  `/admin/sample/search` is `covered` as a SPA HTTP 200 plus legacy bad-request
  shell boundary. P4 and the remaining P5 repository/PR/code route deltas are
  `not-applicable` to visual closure because the legacy homelab seed rendered
  404/500/400 or absent data rather than a comparable template document.
- P4 board/milestone/post now has a template-first reset report at
  `docs/provenance/ui-parity-reports/template-first-p4-board-milestone-post.md`.
  The report preserves existing board/milestone implementation and interaction
  evidence, and classifies the four integrated sample route deltas as
  `not-applicable` non-comparable legacy homelab seed states.
- P5 code/git/PR/review now has a template-first reset report at
  `docs/provenance/ui-parity-reports/template-first-p5-code-git-pr-review.md`.
  The report preserves existing code browser, Git/SVN no-head, commit/diff,
  branch, compare, pull request, and review-thread implementation evidence, and
  classifies the seventeen integrated repository/PR/search/export sample route
  deltas as `covered` or `not-applicable` according to their route boundary.
- P6 organization/directory/workspace now has a template-first reset report at
  `docs/provenance/ui-parity-reports/template-first-p6-organization-directory-workspace.md`.
  The report records organization shell/admin, directory, workspace/profile,
  user files/settings, notification stream, and scoped search chrome evidence,
  and has no standalone `needs-parent-decision` row.
- P7 site-admin/error/security now has a template-first reset report at
  `docs/provenance/ui-parity-reports/template-first-p7-site-admin-error-security.md`.
  With this file, P0-P7 all have template-first packet reports and no packet
  retains integrated status-delta `needs-parent-decision` rows.
- Final closure audit pass checked the current report set with
  `rg -n "\| (gap|deviation|weak evidence|needs-parent-decision) \| [1-9]"`
  across `docs/provenance/ui-parity-reports`,
  `docs/plans/2026-06-26-template-first-ui-parity-reset.md`, and `SPEC.md`.
  Result: no non-zero `gap`, `deviation`, `weak evidence`, or
  `needs-parent-decision` summary rows were found. The only remaining
  integrated sweep status deltas are the classified `covered`/`not-applicable`
  rows in
  `docs/provenance/ui-parity-reports/README.md#integrated-status-delta-classification`.
- 2026-06-28 checkpoint: `tests/ui-parity-gate-a-contract.test.mjs` now guards
  the P0-P7 template-first close condition, including report existence,
  zero row-level blockers, non-empty legacy/current/evidence columns, per-report
  summary counts matching finding rows, and the parent completion-audit totals
  matching the packet summaries. Future work reopens this plan only when new
  legacy evidence or a browser-visible parity defect creates a concrete packet
  row.

## Closure Rule

UI parity is complete only when:

- every legacy template in the app-runtime scope is represented in a packet
  inventory;
- every packet report has zero `gap`, `deviation`, and `weak evidence` rows;
- verifier evidence exists for the relevant desktop/mobile route states;
- visual output uses the legacy CSS/class contract, not a replacement design
  system;
- the parent reruns the integrated browser sweep against embedded Yoram and
  node-proxied legacy Yona.

Until then, “UI parity closed” must not be claimed.
