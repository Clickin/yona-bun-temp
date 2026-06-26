# Full UI Parity Subagent Phase

Status: current execution plan
Date: 2026-06-26

This phase is the goal directive for a full UI parity sweep that can be split
across subagents. The goal is still conversion parity, not UI improvement: a
legacy Yona administrator should be able to replace legacy Yona with Yoram and
normal users should not notice route, layout, copy, interaction, permission
state, form, modal, fragment-conversion, or Markdown rendering differences in
the supported app-runtime scope.

## Phase Objective

This document is the separate UI parity phase. It must run before broad RC
implementation resumes, and it exists to prevent ad-hoc smoke-test fixes from
masking uninspected legacy pages or states.

The required order is:

1. Build the full route/state inventory from legacy Yona evidence, generated
   audit outputs, and current Playwright/browser proof.
2. Split the inventory into subagent explorer packets with report-only output.
3. Consolidate every report into this phase's Audit Result Queue.
4. Assign worker subagents only for concrete queued rows with disjoint write
   scopes.
5. Close the parent integration gate only after the reports, browser-visible
   proof, contracts, and focused implementation checks are current.

## Current Reopen Directive

Recent Windows/browser smoke feedback showed that a nominally covered route can
still fail as a replacement UX when the rendered page is visibly unstyled, a
first-run administrator setup path is absent, legacy i18n keys leak as raw
copy, or a React-visible form bypasses the canonical REST JSON boundary.

The active directive is therefore:

1. Treat this document as the UI-parity goal directive before assigning any
   broad RC implementation work.
2. Reopen the owning packet first when a user-visible diff is discovered.
3. Record the diff as an Audit Result Queue row with legacy source, current
   source, browser-visible risk, and bounded owner scope.
4. Only then assign a worker subagent. The worker may close that row, but must
   not independently broaden scope or redesign legacy UX.
5. Keep forms consistent: React-visible signup, user, project, organization,
   issue, board, milestone, PR, search, and site-admin flows submit through
   REST JSON/API-return plus React render. Legacy form routes remain
   compatibility adapters unless this phase records an explicit parent
   decision.
6. Keep fragment conversion consistent: Java endpoints that returned HTML
   fragments are audited as API-return plus React-render conversions, not as a
   reason to add new server-rendered HTML fragments.

## Source of Truth

- Agent rules: `AGENTS.md`
- Canonical execution spec: `SPEC.md`
- Legacy UI/UX evidence: `yona-original/`
- Current RC checklist:
  `docs/plans/2026-06-24-rc-ux-diff-closure-checklist.md`
- Current visual sweep evidence: `output/playwright/visual-sweep/latest.json`
- Current HTML audit and coverage evidence: `.agent/legacy-html-page-audit/*`
- Current React Markdown boundary:
  `frontend/src/routes/-markdown-renderer.tsx` plus
  `frontend/src/markdown-render-boundary.spec.tsx`

## Phase Rule

- Parent owns this document, status updates, shared RC checklist updates, and
  final integration.
- Parent must keep this phase as a separate UI-parity gate. Do not mix it with
  RC feature improvement, performance work, or new capability planning.
- Parent must not assign a worker from an isolated smoke-test failure alone.
  The owning report row and Audit Result Queue row must exist first, unless the
  patch is only restoring the evidence path needed to complete that report.
- Subagents start as read-only explorers unless the parent assigns a disjoint
  write scope.
- Explorer subagents write findings only into the report path assigned by the
  parent; they do not edit implementation, canonical docs, or provenance.
- No subagent may replace React rendering with server-rendered HTML fragments.
- No subagent may introduce a second Markdown renderer or bypass
  `MarkdownRenderer`.
- No subagent may improve or redesign legacy UX; findings must be framed as
  parity gaps, expected legacy non-OK behavior, not-applicable scope, or
  already-covered evidence.
- Direct legacy form/fragment routes are compatibility evidence only. React
  screens must remain REST JSON/API-return plus React render.
- Existing visual sweep and curl HTML audit coverage are the baseline, not the
  finish line. Each packet must also check user-visible state transitions that
  route-entry sweeps can miss: form validation, modal open/confirm/cancel,
  permission-filtered controls, empty states, and mutation-visible results.
- A page is not covered by static DOM assertions alone when the defect class is
  layout or asset loading. CSS/application-shell presence, raw visible i18n
  keys, and first-screen usability must be checked with Playwright from the
  user's viewport.
- If an explorer reports a `gap` or `deviation`, the parent must either assign a
  worker with a disjoint write scope or reclassify the item in root canonical
  docs, provenance, and follow-up plan before this phase can close.
- This phase must finish as a complete UI parity inventory before broad
  implementation resumes. Ad-hoc smoke-test fixes may continue only when they
  close an already-recorded queue row.

## Execution Model

Gate A is documentation-only inventory. Parent prepares/maintains this phase
document, assigns explorer packets, and does not distribute implementation until
the corresponding report rows exist.

1. Explorer packets audit user-visible parity from legacy evidence and current
   React/browser evidence, then write one report under
   `docs/provenance/ui-parity-reports/`.
2. Parent consolidates explorer reports into the Audit Result Queue and selects
   concrete gap, deviation, or weak-evidence rows.

Gate A2 is a browser-visible re-sweep. It exists because a page can have
route/spec evidence while still being unusable to a real user because CSS is not
loaded, the app shell is visually collapsed, a React-only public entry flow is
missing, or legacy message keys such as `title.no.results` leak as visible copy.

Gate A2 must run before any RC claim that "all UI parity is done":

1. Build a route corpus from the active packet scope, legacy discovered links in
   `.agent/legacy-html-page-audit/*`, `frontend/src/routeTree.gen.ts`, and
   packet-specific interaction paths.
2. For each packet, use Playwright against the current app with the same base
   path mode intended for release. When direct access to the homelab legacy
   baseline is available, compare against `http://192.168.45.10:9000`; when it
   is not, use the existing localhost curl proxy and still render the legacy
   HTML in a browser.
3. Capture user-visible pass/fail using selector/copy/layout assertions, not
   screenshots alone. A screenshot can support a finding, but it cannot be the
   only proof for a covered row.
4. Record every failed page or state as `gap` unless the parent records an
   explicit `not-applicable`, `deferred`, or expected legacy non-OK decision.
5. Reopen the owning report when a previously closed packet fails this browser
   proof. The old report remains baseline evidence, not closure evidence.

Gate B is bounded implementation. Worker subagents are spawned only after Gate A
has produced concrete rows with disjoint owned files.

3. Worker prompts must name the exact row, owned files/modules, focused tests,
   and report rows they may update.
4. Parent reviews worker patches, updates root canonical/provenance/plan status,
   runs integration gates, and commits.

Explorer report file naming:

- `docs/provenance/ui-parity-reports/<packet>.md`
- Historical broad packets may stay in this document as baseline evidence, but
  active packets must have their own report before this phase closes.

Worker branch rule:

- A worker may edit only the owned scope in its assignment plus directly related
  tests/provenance rows named by the parent.
- Workers must not revert unrelated changes. Other agents may be changing the
  codebase at the same time.
- Parent does not edit a worker-owned file until the worker completes or is
  explicitly cancelled.

## Exhaustive Inventory Gate

The first pass of this phase is documentation, not implementation. Parent and
explorers must turn every legacy page or user-visible state into one of these
records before the phase can be treated as actionable:

- `covered`: React route/API render has selector/copy/interaction evidence.
- `gap`: legacy behavior is in app-runtime scope but missing or visibly wrong.
- `deviation`: current behavior intentionally or accidentally differs from
  legacy and needs a parent decision before implementation.
- `deferred`: out of current app-runtime scope, with canonical/deferred
  provenance.
- `not-applicable`: legacy behavior was server-side fragment, broken sample
  data, or operator-only behavior that is explicitly replaced by API-return plus
  React render or classified outside the replacement UX.
- `weak evidence`: implementation may be present, but browser-visible proof is
  not strong enough for RC.

Every inventory row must include:

- Legacy source: exact `yona-original/` template, controller route, JavaScript
  helper, message key, or live legacy path.
- Current source: exact React route/component, API/client/server module, test,
  screenshot, or generated audit artifact.
- User state: anonymous/authenticated/site-admin/project member/non-member,
  owner/admin, guest, private/public project, and empty/populated data as
  applicable.
- Interaction state: initial render, validation failure, successful mutation,
  modal open/cancel/confirm, upload/preview, pagination/filter/search, and
  permission-hidden controls when applicable.
- Boundary: REST JSON/API return plus React render, direct legacy compatibility
  route, or explicitly unsupported server-rendered HTML fragment.
- Proposed owner scope for any `gap`, `deviation`, or `weak evidence` row.

The inventory is complete only when every active packet has a report and every
report's row count is reflected in the Audit Result Queue or explicitly closed
as `covered` inside the report.

## Browser-Visible Round 2 Gate

Round 2 was the browser-visible UI parity gate after the completed explorer
reports and is now closed with the evidence rows below. It remains documented as
a separate phase before RC release because prior smoke tests missed first-screen
rendering failures.

Automatic `gap` findings:

- The page renders without the legacy stylesheet effect, such as unstyled
  top-left links, collapsed login dialog placement, missing Bootstrap modal
  behavior, or page content that is visibly detached from the legacy shell.
- A visible legacy i18n key is shown where legacy would resolve it, including
  examples such as `title.no.results`, `button.*`, `project.*`, or
  `user.*`.
- A legacy public/setup flow is absent, including the admin account/bootstrap
  creation state when the database has no administrator.
- A React screen depends on a Java server-rendered HTML fragment instead of
  API-return plus React render.
- A form that is React-visible posts through a non-REST/direct compatibility
  boundary without a documented parent decision.
- A page only passes at `/` but fails when served behind a subdirectory base
  path such as `/yona`.

Minimum Playwright assertions per route group:

- Viewports: at least one desktop viewport wide enough to expose the same
  first-screen layout a workstation user sees, plus one narrow/mobile viewport
  for shell/menu routes.
- Shell: `.gnb-outer`, side menu or project/org header/menu selectors when the
  legacy page has them, loaded stylesheet effect, document title, and absence of
  placeholder headings such as file-route placeholders.
- Copy: visible labels, placeholders, validation, empty states, and raw-key
  absence.
- Interaction: at least one tab/filter/modal/form state for every route family,
  plus mutation-visible state when the packet owns create/update/delete/toggle
  flows.
- Boundary: REST JSON/API return plus React render for React-visible flows,
  with direct legacy routes limited to compatibility/deep-link adapters.

Round 2 is closed only while every packet status below is
`covered in current follow-up` and no packet status is `pending`, `running`,
`gap`, `weak evidence`, or `needs-parent-decision`. If a later browser-visible
parity defect is found, reopen the owning packet and add a new Audit Result
Queue row before assigning implementation.

Round 2 remaining subagent split:

| Packet | Suggested subagent scope | Write scope before findings | Required proof |
| --- | --- | --- | --- |
| `round2-profile-list-mobile-proof` | `/me`, `/:user`, `/user/issues`, `/user/files`, profile tab/list empty and populated states on mobile | Covered in current follow-up | `frontend/tests/user-profile-parity.e2e.ts` now proves mobile profile/list shell, selected tabs, populated issue/project/file rows, raw-key absence, base-path links, and REST `/api/v1/user/issues` plus `/api/v1/workspace/files` requests. |
| `round2-project-issue-mobile-proof` | project home/settings and issue list/form/detail mobile shell states | Covered in current follow-up | `frontend/tests/legacy-rendered-page-audit.e2e.ts` now opens project home, `settingform`, issue list, issue form, and issue detail on a 390px viewport and asserts project header/menu, settings submenu, issue list/form/detail selectors, raw-key absence, and REST-backed React rendering under `/yona`. |
| `round2-code-pr-deep-mobile-proof` | commit detail/history, branches, compare, PR detail, and PR changes/review thread mobile states | Covered in current follow-up | Code/VCS side is covered by `frontend/tests/legacy-rendered-page-audit.e2e.ts`, which opens commit history, commit detail, compare, and branches on a 390px viewport and asserts project shell, code/diff/branch selectors, raw-key absence, and base-path REST-backed rendering. PR side is covered by `frontend/tests/pull-request-review-read-parity.e2e.ts`, which now opens PR detail, changes, and commit-specific changes deep links on a 390px viewport and asserts project shell, branch info, overview/changes tabs, review-card `#thread-7` anchors, selected commit state, raw-key absence, and REST-backed rendering under `/yona`. |
| `round2-site-admin-broad-mobile-proof` | `/sites/**` beyond diagnostic/userList, including projectList, issueList, mail, massMail, auth config, and admin setting pages | Covered in current follow-up | `frontend/tests/legacy-rendered-page-audit.e2e.ts` now opens `/sites/projectList`, `/sites/postList`, `/sites/issueList`, `/sites/mail`, `/sites/massmail`, `/sites/update`, and `/sites/data` on a 390px viewport, asserting global/user sidebars, site breadcrumb, site setting shell, page-specific legacy anchors, and absence of the file-route placeholder. `frontend/tests/site-admin-data-parity.e2e.ts` adds focused `/sites/data` export-click and import-file REST proof. |
| `round2-stale-copy-cleanup` | broad shell/code/PR E2Es that still assert legacy raw message keys instead of resolved legacy copy | Covered in current follow-up | Positive Playwright expectations now use resolved legacy copy for shell/auth titles, directory titles, error shells, issue action labels, issue state/weight labels, direct issue headings, watcher copy, milestone title placeholder, project member roles, site-admin sidebars/pagination/state tabs, and update messages. Remaining key-shaped strings in E2Es are negative raw-key assertions, fixture request/payload values, filenames, or domain data. |

| Round 2 packet | Browser scope | Status | Required report update |
| --- | --- | --- | --- |
| `r2-auth-setup-public-shell` | `/`, first-run/no-admin setup state, `/users/loginform`, `/users/signupform`, `/lostPassword`, `/resetPassword`, `/verify/**`, login dialog, base-path asset loading | covered in current follow-up | Login dialog legacy modal positioning, direct `/users/loginform` failed-submit error copy, `/secret` title interpolation, lost/reset document titles, `/yona` base-path shell, and auth public-entry browser states are now covered by focused Playwright proof. |
| `r2-workspace-settings-directory` | `/me`, `/:user`, `/user/issues`, `/user/files`, `/user/editform/**`, `/projects`, `/projectform`, `/_import`, `/orgs`, `/organizations/new`, org settings/member/delete flows | covered in current follow-up | Desktop `/me`, profile/settings, user issue/files, `/projects`, `/projectform`, `/_import`, `/organizations/new`, direct `/orgs`, and org home/settings/members/delete interactions are covered; mobile proof covers workspace notification settings, direct `/orgs`, `/projects`, `/projectform`, `/_import`, `/me`, `/:user`, `/user/issues`, and `/user/files`. Current follow-up adds browser proof for workspace email add/delete/send-validation/set-main controls, token reset, and password-change REST mutations while preserving legacy settings selectors and direct legacy data-request URIs. |
| `r2-project-issue-board-milestone` | project home/admin/settings plus issue, board, and milestone list/form/detail/comment flows | covered in current follow-up | Board and milestone delete modal gaps plus issue assignee nested-form weak evidence are fixed and browser-proved where focused tests exist; mobile proof covers board list, milestone detail shell, project delete/admin confirmation, project home/settings, and issue list/form/detail shells. Current follow-up adds browser proof for project issue-list and milestone-detail mass-update REST payloads, and fixes the milestone detail filter/mass-update toolbar overlap that prevented real checkbox clicks. |
| `r2-code-pr-review-search-notification` | code browser, commits, branches, compare, PR list/form/detail/changes/reviews, search, notification page and incremental notification route | covered in current follow-up | Desktop code/PR/search/notification product UI gaps were not found; mobile proof now covers global search, `/notifications`, code list shell, commit history/detail/branches/compare, PR list shell, review list shell, PR detail, PR changes, and commit-specific PR changes deep links. Notification load-more browser proof now clicks `#notification-more`, asserts `/api/v1/notifications?from=20&size=20`, appends the next REST row, and removes the button when `hasMore=false`; notification row proof now clicks title link/avatar image without toggling and verifies row/message/`.more` expand-collapse behavior. Stale raw-copy expectations in the broad shell/issue/code-adjacent smoke paths are refreshed to resolved legacy copy, and raw-key scans now leave only negative assertions, fixture payloads, filenames, or domain data. |
| `r2-site-admin-security-db` | `/sites/**`, `/secret`, `/restart`, `/migration`, security probes, DB matrix/adopt smoke entry pages | covered in current follow-up | `/sites/diagnostic` direct auth status gap is fixed and diagnostic browser copy proof is refreshed; mobile proof now covers `/sites/diagnostic`, `/sites/userList`, `/sites/projectList`, `/sites/postList`, `/sites/issueList`, `/sites/mail`, `/sites/massmail`, `/sites/update`, and `/sites/data`; user-list stale-key expectations are refreshed to resolved legacy copy while preserving REST mutation proof. Current follow-up also refreshes project/post/issue/update site-admin E2Es from raw keys to resolved legacy copy. |

## Full UI Parity Matrix

| Packet | Scope | Initial owner mode | Output |
| --- | --- | --- | --- |
| `ui-parity-auth-public-entry` | `/`, `/users/loginform`, `/users/signupform`, `/lostPassword`, `/resetPassword`, `/verify/**`, `/_help`, auth aliases | explorer | Auth/help route, form, copy, redirect, error-state evidence and REST submit-boundary findings |
| `ui-parity-root-navigation-shell` | global nav, feedback/project-list gating, login dialog, authenticated user menu, sidebar, footer suppression | explorer | Shell state matrix across anonymous/authenticated/site-admin/guest and fragment-conversion findings |
| `ui-parity-user-workspace-profile` | `/me`, `/:user`, `/user/issues`, `/user/files`, profile issue/PR/project tabs | explorer | Workspace/profile/list empty/populated/permission-state findings |
| `ui-parity-user-account-settings` | `/user/editform/**`, `/me/settings/**`, avatar/password/notification/email/token settings | explorer | Settings form, validation, modal, upload, notification-toggle, and direct-anchor findings |
| `ui-parity-directory-organization` | `/projects`, `/projectform`, `/_import`, `/orgs`, `/organizations/new`, `/organizations/:org/**` | explorer | Directory, project/org creation, org home/settings/member/delete state findings |
| `ui-parity-project-home-admin` | `/:owner/:project`, project settings/members/watchers/webhooks/delete/transfer/fork/statistics/changeVCS | explorer | Project shell, admin form/modal, permission-state, and mutation-boundary findings |
| `ui-parity-issues` | project/user issue lists, issue create/edit/detail/comment/timeline/label settings | explorer | Issue filters, forms, sidebar controls, comments, child comments, autocomplete, and Markdown findings |
| `ui-parity-board-milestone` | board list/detail/create/edit/comment plus milestone list/detail/create/edit | explorer | Board/milestone route, form, attachment, comment, state-tab, progress, and empty-state findings |
| `ui-parity-code-vcs` | code browser, file rendering, commit history/detail, compare, branches, raw/download/image links | explorer | Code/VCS shell, branch selector, diff/comment, no-head/error-state, and direct-link findings |
| `ui-parity-pull-request-review` | PR lists/create/edit/detail/changes/reviews/review threads | explorer | PR branch selector, merge/conflict/review/comment/thread state findings |
| `ui-parity-search-notification` | global/project/org search, `/notifications`, `/notification?from=&limit=` | explorer | Search result-type/filter/pagination and notification stream/fragment-conversion findings |
| `ui-parity-site-admin-setup` | `/sites/**`, `/secret`, `/restart`, `/migration`, release/setup/import operator pages | explorer | Site-admin/setup/import/update/diagnostic state findings and deferred/operator-scope classifications |
| `ui-parity-fragment-security-db` | legacy fragment conversions, XSS/SQLi/pathological Markdown, visual sweep status deltas, DB/migration smoke evidence | explorer | Weak evidence links, guard gaps, or DB/security smoke gaps |

## Active Subagent Assignments

Parent-owned integration rule: this phase document and the Audit Result Queue
are updated by the parent after worker results are reviewed. Active worker
subagents receive disjoint implementation/test/provenance scopes and must not
edit this phase file directly.

| Packet | Agent | Status | Notes |
| --- | --- | --- | --- |
| `board-milestone-browser-proof-refinement` | `019f013d-5b62-7910-90d6-e4e55d98e7fa` (`Pauli`) | completed | Board post/comment and milestone attachment metadata, invalid milestone submit validation, and milestone close/reopen browser proof are covered by focused Playwright. No route implementation gap was found in this scope. |
| `pr-review-browser-proof-refinement` | `019f013d-8a6b-70f3-9ac6-b240e2f19962` (`Lagrange`) | completed | Recently pushed branch link/close and `/reviews` filter/sort/state/export browser proof are covered by focused Playwright. The worker found and fixed the `/reviews` in-app query-refetch gap. |
| `reopen-auth-root-shell` | `019f0110-a749-7152-8c27-2e6d20f97501` (`Epicurus`) | completed | Reopened signup-confirm admin-contact interpolation, login-dialog rememberMe mutability, and public/root raw-key browser proof rows. |
| `reopen-workspace-directory-org` | `019f0110-c007-7f20-b520-6c52835513dc` (`Sartre`) | completed | Reopened browser proof rows for directory pagination, project/import/org create validation/mutation, and workspace profile/avatar mutation depth. |
| `reopen-project-content` | `019f0110-dab4-79c3-9b49-88762e323a62` (`Beauvoir`) | completed | Reopened issue label settings permission, category typeahead/new-category choice, and edit-modal parity rows. |
| `reopen-code-pr-search-admin` | `019f0110-f697-7442-a786-4be9d65e5cb0` (`Mill`) | completed | Reopened commit watch/unwatch browser-click proof row; no additional PR/search/notification/site-admin/security/DB gaps found. |
| `reopen-account-project-pr-proof-audit` | `019f016c-7185-7781-9815-f0517be1a39b` (`Russell`), `019f016c-875f-7023-98d1-080532dabe82` (`McClintock`), `019f016c-9b28-7c40-8aff-dc27a202da19` (`Aquinas`) | completed | Reopened weak-evidence rows where report claims exceeded browser-visible proof: workspace password failure/raw-key/alias states, project transfer/webhook/member/settings/fork/raw-key proof depth, and PR create/edit validation/raw-key proof depth. |
| `ui-parity-public-auth-shell` | `019eff61-971c-7903-aca3-b7f9b3cdc76d` (`Dewey`) | completed | Historical broad packet; split into the narrower packets below for the next sweep |
| `ui-parity-directory-workspace-site-admin` | `019eff61-b850-7873-a81b-c6bae630a8a9` (`Locke`) | completed | Historical broad packet; split into workspace, organization, and site-admin packets below |
| `ui-parity-project-content` | `019eff61-dd1d-7233-b182-10898e1735ee` (`Averroes`) | completed | Historical broad packet; split into project admin, issue, board/milestone, code/VCS, and PR/review packets below |
| `ui-parity-fragment-security-db` | `019eff61-fd34-7df2-bdd5-12a76a596ecb` (`Kuhn`) | completed | Report file added; fragment conversion, security, visual sweep, DB/migration smoke rows have no gap/deviation/weak-evidence rows |
| `ui-parity-auth-public-entry` | `019eff8b-88b5-7d53-b04c-421676320d9f` (`Laplace`) | completed | Signup flash-to-index and reset/verify post-state follow-ups are covered; browser-proof checklist depth remains tracked in the auth report if reopened |
| `ui-parity-root-navigation-shell` | `019eff8b-a5cf-7343-8b07-4875c99d806a` (`Dirac`) | completed | Report file added; organization search-scope, project `hasGroup` scope, mounted base-path classification, and browser-visible shell state matrix are covered |
| `ui-parity-user-workspace-profile` | `019eff8b-cb85-7862-9cc5-4bb6a0632452` (`Arendt`) | completed | Report file added; daysAgo editability, public email, PR receiver, user-file location, selected-tab browser proof, and guest stream hiding have no gap/deviation/weak-evidence rows |
| `ui-parity-user-account-settings` | `019eff8b-ec3b-7d72-b5b4-4f4a9c183bf2` (`Herschel`) | completed | Report file added; profile/password/notification/email/token settings, avatar invalid/crop UX, and notification hash activation have no gap/deviation/weak-evidence rows |
| `ui-parity-directory-organization` | `019effaa-2dc0-7231-8af5-8804caf07703` (`Godel`) | completed | Report reconciled; queue rows below are covered or classified |
| `ui-parity-project-home-admin` | `019effaa-4c2c-7a91-8845-ea0edd3d5d48` (`Socrates`) | completed | Report reconciled; queue rows below are covered or classified |
| `ui-parity-issues` | `019effaa-67d8-7581-860a-b08920fd073e` (`Linnaeus`) | completed | Report reconciled; queue rows below are covered or classified |
| `ui-parity-board-milestone` | `019effaa-8a27-7321-aaec-e27b7371880f` (`Archimedes`) | completed | Report reconciled; queue rows below are covered or classified |
| `ui-parity-code-vcs` | `019effbc-a056-7cf2-8fa6-5d6de40e1198` (`Anscombe`) | completed | Report reconciled; queue rows below are covered or classified |
| `ui-parity-pull-request-review` | `019effbc-c970-7850-bfe3-ab7d8e897eb6` (`Wegener`) | completed | Report reconciled; `/reviews` row fidelity gap closed in current follow-up |
| `ui-parity-search-notification` | `019effbc-f514-74b2-8067-ecc811844244` (`Leibniz`) | completed | Report reconciled; summary now has no gap/deviation/weak-evidence rows |
| `ui-parity-site-admin-setup` | `019effbd-1fe5-7803-997a-af04e8b3ee4e` (`Descartes`) | completed | Report reconciled; summary now has no gap/weak-evidence rows |

## Audit Result Queue

| Item | Source packet | Status | Next owner scope |
| --- | --- | --- | --- |
| Signup confirmation description must interpolate the legacy obfuscated admin contact | `ui-parity-auth-public-entry` | `covered in current follow-up` | `/api/v1/auth/capabilities` projects reversed default-admin contact, `AppRuntimeContext` maps it, `RegisterPage` interpolates `title.signupConfirmDesc2`, and auth public E2E asserts `.obfuscate` text. |
| Login dialog remember-me checkbox must be user-toggleable and submit the chosen value | `ui-parity-root-navigation-shell` | `covered in current follow-up` | `LegacyLoginDialog` uses normal default-checked checkbox semantics; root-shell E2E unchecks it and asserts REST JSON `rememberMe: false`. |
| Public auth/root shell browser raw-key scans | `ui-parity-auth-public-entry`, `ui-parity-root-navigation-shell` | `covered in current follow-up` | Focused public-auth and root-shell Playwright suites now scan browser-visible `body.innerText()` for legacy raw message keys across their public/root state matrices. |
| Directory pagination and create/import/org browser interaction proof | `ui-parity-directory-organization` | `covered in current follow-up` | `frontend/tests/directory-create-import-proof.e2e.ts` now drives `/projects` and `/orgs` page-2 pagination under `/yona`, validates query-preserving prev/next links, and proves `/projectform`, `/_import`, and `/organizations/new` invalid-state blocking plus REST JSON mutation payloads and redirects. The proof found and fixed a mounted-base pagination gap in `frontend/src/routes/-directory-views.tsx`. |
| Workspace profile/avatar settings browser mutation depth | `ui-parity-user-account-settings` | `covered in current follow-up` | `frontend/tests/workspace-settings-parity.e2e.ts` now drives crop Cancel, crop Save upload, hidden `avatarAttachmentId`, profile submit redirect, reset visited projects, and selected notification toggle from the browser-visible settings UI while asserting the REST/file request boundaries. |
| Issue label settings update permission gate | `ui-parity-issues` | `covered in current follow-up` | The React labels form route now waits for project container data and renders the legacy forbidden shell when `viewerCanUpdate` is false; focused Playwright proof verifies read-only viewers do not see `#copyLabel` or `#frmNewLabel`. |
| Issue label category typeahead and new-category single/multiple choice | `ui-parity-issues` | `covered in current follow-up` | `IssueLabelCreateForm` now renders an existing-category typeahead and opens `#newCategoryOption` for new categories before POSTing the REST JSON `categoryIsExclusive` value; focused Playwright proof chooses Single and asserts the payload. |
| Issue label/category edit interactions must use legacy modal UX | `ui-parity-issues` | `covered in current follow-up` | Label/category edit buttons now open React-controlled legacy `#editLabel` and `#editCategory` modal shells, prefill values, submit PATCH REST JSON, and close on success/cancel; focused Playwright proof covers both modal flows. |
| Commit detail watch/unwatch needs real browser click proof | `ui-parity-code-vcs` | `covered in current follow-up` | `frontend/tests/project-code-comment-upload-parity.e2e.ts` now opens commit detail under `/yona`, clicks `#watch-button`, asserts POST/DELETE watch REST calls with CSRF and preserved branch/path query, and verifies `active ybtn-watching` toggles after success. No implementation gap was found. |
| `/admin/sample/postform?readme=true` legacy README preload/update semantics | `ui-parity-project-content` | `covered, committed 19b24182` | `frontend/src/routes/$owner/$projectName/postform/route.tsx`, `frontend/src/api/boards.ts`, `crates/server/src/routes/boards.rs`, focused board tests |
| Query-string discovered links can be lost from generated coverage evidence (`postform?readme=true`, `postform?issueTemplate=true`, `issues?format=xls`, `reviews?format=xls`) | `ui-parity-project-content` | `covered` | `f4f33829`; `scripts/audit-legacy-html-pages.mjs`, `scripts/visual-parity-sweep.mjs`, `tests/rc-ux-checklist-contract.test.mjs` |
| Sample-data status deltas such as `/admin/sample/newPullRequestForm`, `/admin/sample/post/1`, `/admin/sample/milestone/1`, `/admin/sample/pullRequest/1/**`, `/admin/sample/code/main/**`, `/admin/sample/commits/**`, `/admin/sample/search` | `ui-parity-project-content` | `covered by parent decision` | Documented as sample-data/reference-server status variance; local seeded-data success is acceptable when legacy homelab sample lacks the corresponding object/branch and route-specific functional tests cover normal UX |
| Legacy broken homelab endpoints returning 500 (`/admin/sample/branches`, `/admin/sample/compare/main...main`, `/admin/sample/post/1/editform`) | `ui-parity-project-content` | `covered` | Keep documented as expected legacy reference errors; do not mirror server failures |
| `/:user/:project/issue/:number/timeline` fragment endpoint closure | `ui-parity-fragment-security-db` | `covered` | Legacy `IssueApp.timeline` returned `partial_comments.scala.html`; Rust does not expose a server-rendered HTML fragment. `/api/v1/projects/:owner/:project/issues/:number` returns `comments` plus `timeline`, `frontend/src/app-view-models.ts` maps that API timeline, and the issue detail React shell renders the legacy comment/event anchors. Backend contract: `issue_core_contract_creates_reads_updates_and_deletes_over_rest`. |
| Project issue-list XHR/PJAX fragment mode | `ui-parity-fragment-security-db` | `not-applicable compatibility` | Normal app-runtime issue-list UX is React route plus `/api/v1/projects/:owner/:project/issues` JSON. Legacy `IssueApp.issues` XHR/PJAX HTML fragment mode is not retained as a frontend data source; XHR/PJAX headers against the REST list still return API JSON for React rendering. Backend contract: `issue_core_contract_creates_reads_updates_and_deletes_over_rest`. |
| Legacy MariaDB in-place adopt smoke proves startup/schema plus migrated profile data | `ui-parity-fragment-security-db` | `covered` | `3e2ebc84`; `scripts/smoke-legacy-mariadb-dump.mjs` now verifies migrated `/api/v1/users/:loginId/profile` data during adopt startup |
| XSS, SQLi, and pathological Markdown probe evidence | `ui-parity-fragment-security-db` | `covered by RC checklist evidence` | `docs/plans/2026-06-24-rc-ux-diff-closure-checklist.md` `rc-ux-security-stability` records hostile rendered-page XSS/search probes, Markdown renderer stability tests, React Markdown render-boundary checks, and SQLi literal-keyword backend coverage. Browser proof now includes `frontend/tests/legacy-rendered-page-audit.e2e.ts` rendering a >65KB SQL fenced block on the issue detail surface as plain source without syntax-token expansion. |
| SQLite, PostgreSQL, and MySQL/MariaDB DB matrix evidence | `ui-parity-fragment-security-db` | `covered by RC checklist evidence` | `docs/plans/2026-06-24-rc-ux-diff-closure-checklist.md` `rc-ux-db-migration-smoke` records env-backed and testcontainers DB matrix runs, including SQLite FTS5, PostgreSQL `to_tsvector`, and MariaDB `MATCH ... AGAINST` search paths |
| Round 2 login dialog and auth/setup document-title browser gaps | `r2-auth-setup-public-shell` | `covered in current follow-up` | `frontend/src/app.css` restores legacy Bootstrap/modal and `.loginDialog` positioning, `frontend/src/routes/secret/route.tsx` interpolates `app.welcome(siteName)` for `/secret`, `frontend/src/routes/lostPassword/route.tsx` uses legacy `site.resetPasswordEmail.title`, and `frontend/src/routes/resetPassword/route.tsx` uses legacy `title.resetPassword`. Browser proof: `root-shell-parity.e2e.ts` asserts fixed 460px desktop login modal positioning and `/secret` title, and `auth-public-entry-parity.e2e.ts` now asserts first-run `/secret` admin setup form shell, REST submit payload, restart redirect, and lost/reset titles. |
| Round 2 board and milestone delete modals | `r2-project-issue-board-milestone` | `covered in current follow-up` | `frontend/src/routes/-board-views.tsx` and `frontend/src/routes/-milestone-views.tsx` now open/close `#deleteConfirm` through React state instead of relying on missing Bootstrap JavaScript. Browser proof: `board-posting-parity.e2e.ts` covers board create/edit/delete modal flow and `milestone-delete-modal-parity.e2e.ts` covers milestone detail modal open/cancel under `/yona`. |
| Round 2 issue sidebar assignee nested form | `r2-project-issue-board-milestone` | `covered in current follow-up` | `frontend/src/routes/-issue-views.tsx` replaces the nested `IssueAssignForm` `<form>` inside legacy `#issueUpdateForm` with a non-form wrapper while preserving Enter-key assignment submit and `#assignee.bigdrop` selectors; focused issue shell specs remain green. |
| Round 2 `/sites/diagnostic` direct auth status | `r2-site-admin-security-db` | `covered in current follow-up` | `crates/server/src/routes/site_admin.rs` now returns REST auth errors for direct `/sites/diagnostic` instead of serving the SPA shell to unauthenticated/non-admin users. Proof: `site_admin_contract::site_admin_diagnostics_are_site_admin_only_and_report_legacy_error_list` passes, and `site-admin-diagnostic-parity.e2e.ts` now asserts resolved legacy copy instead of stale raw keys. |
| Round 2 organization directory/admin browser proof | `r2-workspace-settings-directory` | `covered in current follow-up` | `frontend/tests/organization-directory-admin-parity.e2e.ts` now proves direct `/orgs` visible legacy list shell plus organization home filter/create/leave modal, settings save redirect, member typeahead/add/role/delete modal, and deleteForm confirmation/redirect under `/yona`. `frontend/src/routes/-organization-views.tsx` also makes organization member/delete confirmation modals React-state-visible instead of relying on Bootstrap JavaScript. |
| Round 2 focused mobile browser proof | Round 2 packets | `covered in current follow-up` | Fresh mobile viewport proof now covers anonymous root login dialog (`root-shell-parity.e2e.ts`), workspace notification settings (`workspace-settings-parity.e2e.ts`), direct `/orgs` (`organization-directory-admin-parity.e2e.ts`), milestone detail shell (`milestone-delete-modal-parity.e2e.ts`), `/sites/diagnostic` (`site-admin-diagnostic-parity.e2e.ts`), global search and `/notifications` (`search-parity.e2e.ts`). Existing board list mobile proof remains in `board-posting-parity.e2e.ts`. |
| Round 2 directory/create/import mobile proof | `r2-workspace-settings-directory` | `covered in current follow-up` | `frontend/tests/legacy-rendered-page-audit.e2e.ts` now opens `/projects`, `/projectform`, and `/_import` on a 390px viewport and asserts legacy shell/form anchors such as `.site-breadcrumb-outer`, `#newProjectForm`, and `#importGit` under `/yona`. |
| Round 2 profile/list mobile proof | `r2-workspace-settings-directory` | `covered in current follow-up` | `frontend/tests/user-profile-parity.e2e.ts` now opens `/me`, `/:user`, `/user/issues`, and `/user/files` on a 390px viewport and asserts legacy profile, tab, issue-list, file-list, raw-key absence, base-path link, and REST JSON boundary evidence. |
| Round 2 workspace settings mutation browser proof | `r2-workspace-settings-directory` | `covered in current follow-up` | `frontend/tests/workspace-settings-parity.e2e.ts` now drives `/user/editform/emails`, `/user/editform/token`, and `/user/editform/password` through Playwright. It asserts legacy account/token breadcrumbs, settings tabs, email table copy, legacy `data-request-uri` values for direct compatibility anchors, and REST `/api/v1/workspace/emails`, `/api/v1/workspace/emails/:id/main`, `/api/v1/workspace/emails/:id/validation`, `/api/v1/workspace/emails/:id`, `/api/v1/workspace/api-token/reset`, and `/api/v1/workspace/password` mutation payloads under `/yona`. |
| Round 2 project/issue mobile shell proof | `r2-project-issue-board-milestone` | `covered in current follow-up` | `frontend/tests/legacy-rendered-page-audit.e2e.ts` now opens `/admin/sample`, `/admin/sample/settingform`, `/admin/sample/issues`, `/admin/sample/issueform`, and `/admin/sample/issue/1` on a 390px viewport and asserts project header/menu, settings submenu, issue list/form/detail shell selectors, raw-key absence, and base-path rendering. |
| Round 2 issue and milestone mass-update browser proof | `r2-project-issue-board-milestone` | `covered in current follow-up` | `frontend/tests/shell-routing-smoke.e2e.ts` now drives project issue-list `#check-all` plus the legacy `#state` mass-update dropdown and asserts the REST `/api/v1/projects/admin/projectYobi/issues/mass-update` payload. The same focused test drives milestone detail linked-issue checkbox selection plus `#state` mass update under `/yona` and asserts the REST payload after fixing `.milesion-wrap #issues .filter-wrap` height so the disabled toolbar no longer overlays issue checkboxes. |
| Round 2 code/PR/review mobile anchor proof | `r2-code-pr-review-search-notification` | `covered in current follow-up` | `frontend/tests/legacy-rendered-page-audit.e2e.ts` now opens `/admin/sample/code`, `/admin/sample/pullRequests`, and `/admin/sample/reviews` on a 390px viewport and asserts project header/menu/page-wrap anchors. PR detail/change deep routes are now covered by the separate focused PR mobile proof row. |
| Round 2 code/VCS deep mobile proof | `r2-code-pr-review-search-notification` | `covered in current follow-up` | `frontend/tests/legacy-rendered-page-audit.e2e.ts` now mocks REST code/VCS data and opens `/admin/sample/commits`, `/admin/sample/commit/abcdef1234567890abcdef1234567890abcdef12`, `/admin/sample/compare/1234567..abcdef1`, and `/admin/sample/branches` on a 390px viewport, asserting project shell, commit table, diff shell, branch table, raw-key absence, and base-path rendering. |
| Round 2 PR detail/changes mobile proof | `r2-code-pr-review-search-notification` | `covered in current follow-up` | `frontend/tests/pull-request-review-read-parity.e2e.ts` now opens `/admin/projectYobi/pullRequest/3`, `/admin/projectYobi/pullRequest/3/changes`, and `/admin/projectYobi/pullRequest/3/changes/abcdef123456#thread-7` on a 390px viewport with REST JSON mocks, asserting project header/menu, branch info, overview/changes tabs, timeline event copy, diff shell, review-card `#thread-7` href, selected commit state, base-path URLs, and absence of unresolved `pullRequest.*` copy. The same file also refreshed stale expectations from `Code review` / `Changes of all commits` to the resolved legacy copy `Overview` / `Changes` / `All commit changes`. |
| Round 2 project delete/admin mobile proof | `r2-project-issue-board-milestone` | `covered in current follow-up` | `frontend/tests/project-delete-parity.e2e.ts` now runs the project delete confirmation flow on a 390px viewport and proves the legacy delete shell plus REST delete request under `/yona`. |
| Round 2 site admin user-list mobile and copy drift | `r2-site-admin-security-db` | `covered in current follow-up` | `frontend/tests/site-admin-user-list-parity.e2e.ts` now proves `/sites/userList` mobile shell anchors, resolved legacy copy for user-list tabs/buttons/password reset, legacy DOM mutation URIs, and REST JSON mutations for site-admin/account-lock/guest/password/delete actions. |
| Round 2 broad site-admin mobile shell proof | `r2-site-admin-security-db` | `covered in current follow-up` | `frontend/tests/legacy-rendered-page-audit.e2e.ts` now opens `/sites/projectList`, `/sites/postList`, `/sites/issueList`, `/sites/mail`, `/sites/massmail`, `/sites/update`, and `/sites/data` on a 390px viewport and asserts root user sidebars, `.site-breadcrumb-outer`, `.site-setting-wrap`, page-specific legacy anchors such as `.project-list-wrap`, `.post-list-wrap`, `#mailForm`, `#mailtoAll`, `#write-email`, `.title_area`, and absence of the file-route placeholder. This complements the existing focused site-admin E2Es for project/post/issue/mail/update/data interaction and REST mutation coverage. |
| Round 2 stale search invalid-query expectation | `r2-code-pr-review-search-notification` | `covered in current follow-up` | `search-parity.e2e.ts` now supplies the project container mock needed for project-scoped invalid search-type requests to reach the legacy bad-request shell instead of accidentally proving a not-found route-shell state. |
| Round 2 stale legacy-copy expectation cleanup | Round 2 packets | `covered in current follow-up` | Positive E2E expectations now use resolved legacy copy instead of raw keys across shell auth/directory/error/issue/member/site-admin/update paths. Proof: `shell-routing-smoke.e2e.ts` focused auth/directory/org-admin/issue/direct-issue/watcher subsets, `project-members-parity.e2e.ts`, and focused site-admin project/post/issue/update E2Es pass; `rg` over E2E files leaves only negative raw-key assertions, fixture payload values, filenames, or domain data. |
| Round 2 browser-visible gate closure | Round 2 packets | `covered in current follow-up` | No known Round 2 browser-proof-only gap remains after mobile PR detail/changes proof, broad site-admin mobile proof, stale legacy-copy expectation cleanup, workspace settings mutation proof, and project issue/milestone mass-update browser proof. Any further parity work should come from newly discovered route-specific UX diffs, not an already-open Round 2 browser-visible gate row. |
| `/secret` and `/restart` paired visual diff coverage | `ui-parity-public-auth-shell` | `not-applicable for paired visual diff; UI state covered` | Legacy `/secret` and `/restart` are state-gated by `Global.onRequest` while `isSecretInvalid`; configured legacy has no normal comparable route, and visual sweep shows local 200 with `legacyOk: null`. UI selectors/copy remain covered by `welcome/secret.scala.html`, `welcome/restart.scala.html`, current `/secret`/`/restart` routes, and auth workspace contracts. |
| `/user/issues/new/mine` focused frontend spec thickness | `ui-parity-directory-workspace-site-admin` | `covered` | Route thinness is intentional: `frontend/src/routes/user/issues/new/mine/route.tsx` delegates `mine={true}` to the shared direct issue form, REST reads `/api/v1/user/issues/new-options?mine=true`, rendered E2E covers submit payload, route parity pins legacy selectors, and backend contract pins legacy target selection fallback order. |
| Root organization search-scope dropdown should not always render the group item | `ui-parity-root-navigation-shell` | `covered in current follow-up` | `frontend/src/routes/__root.tsx` now hides the org group search item unless `hideProjectListing`/guest mode plus known organization participation matches legacy; `frontend/src/auth-workspace-shell.spec.tsx` pins the guard |
| Root project search-scope dropdown needs legacy `project.hasGroup` evidence | `ui-parity-root-navigation-shell` | `covered in Wave 4` | Root header now reads the real project container on project-scoped pages and shows `search.scope.group` only when the container has `organizationName`, matching legacy `project.hasGroup`; organization-scoped hide-project-listing/guest behavior remains unchanged. Evidence: `frontend/src/routes/__root.tsx`, `frontend/src/auth-workspace-shell.spec.tsx`. |
| Root shell browser-visible state matrix | `ui-parity-root-navigation-shell` | `covered in current follow-up` | `frontend/tests/root-shell-parity.e2e.ts` now proves anonymous global nav, configured feedback link, login dialog open/submit/error/close, raw-key scans including `issue.*`, authenticated site-admin affix, user menu/sidebar tab content, guest project-list/org-create gating, standalone `/secret` root-footer suppression, `/restart`, `/_UIKit`, and project route group/global search-scope actions under mounted `/yona` base path. `frontend/src/routes/__root.tsx` strips the runtime base path before shell route-family classification. |
| Auth signup confirm/email-verification post state differs from legacy flash target | `ui-parity-auth-public-entry` | `covered in Wave 4` | Anonymous signup confirmation and verification post-states now redirect to legacy index targets (`/?signup=requested`, `/?verify=sent`), and the home route renders a `data-toggle="yobi-notify"` success message from the legacy flash keys `user.signup.requested` / `user.verification.mail.sent`. Evidence: `frontend/src/routes/users/signupform/route.tsx`, `frontend/src/routes/index.tsx`, `frontend/src/routes/-home-view.tsx`, `frontend/src/auth-workspace-shell.spec.tsx`, `frontend/src/route-parity.spec.tsx`. |
| Auth public-entry browser-proof checklist depth | `ui-parity-auth-public-entry` | `covered in current follow-up` | `frontend/tests/auth-public-entry-parity.e2e.ts` now proves browser-visible login submit through REST JSON with `rememberMe=false` and `redirectUrl`, first-run `/secret` admin setup through REST JSON with restart redirect, signup-confirm redirect and flash, auth aliases including `/reset-password?s=...` query preservation, social-login-only GitHub/Google controls, OAuth unsupported/denied alerts, lost/reset valid and invalid states, and verify success/invalid states. `frontend/vite.config.ts` no longer proxies the React-owned `/resetPassword` page path to the backend during dev, and the `/reset-password` alias preserves query strings through `RedirectPage`. Verification: `pnpm --dir frontend test:e2e -- auth-public-entry-parity.e2e.ts` passed 7 Playwright tests. |
| Auth reset invalid/valid post states and verify invalid status differ from legacy | `ui-parity-auth-public-entry` | `covered in current follow-up` | `frontend/src/routes/-auth-views.tsx` now renders invalid reset as the legacy bad-request wrapper with `site.resetPasswordEmail.wrongUrl` and renders invalid verify as plain `Invalid verification` instead of a SPA error shell; `frontend/src/routes/verify/$loginId/$verificationCode/route.tsx` keeps pending state until REST verification resolves. Valid reset remains REST redirect to the legacy login shell with `user.loginWithNewPassword`, which preserves visible post-state under the React REST boundary. Evidence: `frontend/src/wave1-auth-workspace-parity.spec.tsx`, `frontend/src/auth-workspace-shell.spec.tsx`, `docs/provenance/ui-parity-reports/ui-parity-auth-public-entry.md`. Browser deep-link HTTP 404 for invalid verify is not applicable to React fallback; REST verify already owns not-found status. |
| User profile `daysAgo` number input was read-only | `ui-parity-user-workspace-profile` | `covered in current follow-up` | `frontend/src/routes/-workspace-views.tsx` now renders editable uncontrolled `#daysAgoBtn` inputs for `/me` and `/:user`, and `frontend/src/workspace-profile-i18n.spec.tsx` pins absence of `readonly`. |
| Public profile email visibility when `application.show.user.email=true` | `ui-parity-user-workspace-profile` | `covered in current follow-up` | `crates/server/src/routes/users.rs` now keeps public profile email when `AppRuntimeConfig.show_user_email` is true and redacts only when false; `crates/server/tests/rest_contract.rs` and `frontend/src/wave1-auth-workspace-parity.spec.tsx` pin both visible and hidden states. |
| Workspace/public profile issue author/assignee and PR contributor/receiver user links | `ui-parity-user-workspace-profile` | `covered in current follow-up` | `WorkspaceIssueItem` and `WorkspacePullRequestItem` now carry actor login IDs, and `frontend/src/routes/-workspace-views.tsx` renders legacy `/:loginId` anchors for issue author/assignee cells plus PR contributor/receiver avatar links. Evidence: `crates/server/tests/auth_workspace_contract.rs` and `frontend/src/route-parity.spec.tsx`. |
| Workspace file location URL | `ui-parity-user-workspace-profile` | `covered in current follow-up` | `/user/files` now resolves non-user attachment rows through `read_attachment_location_path`, matching legacy `RouteUtil.getUrl(containerType, containerId)` for project, issue/comment, board/comment, milestone, PR/review-thread, and commit-thread resources. `crates/server/tests/assets_contract.rs::workspace_files_list_returns_current_users_legacy_attachment_rows` pins ISSUE_POST location href/label under a base path. |
| Public profile selected-tab browser query preservation | `ui-parity-user-workspace-profile` | `covered in current follow-up` | `frontend/tests/user-profile-parity.e2e.ts` now opens `/yona/door?daysAgo=7&selected=projects`, verifies the project tab is initially active, clicks the pull-request and issue tabs, and proves URL query plus `#daysAgoBtn` value remain preserved while only React active panes change. Evidence: `pnpm --dir frontend test:e2e -- user-profile-parity.e2e.ts` passed 3 Playwright tests. |
| Guest current-user profile stream visibility | `ui-parity-user-workspace-profile` | `covered in current follow-up` | Legacy `user/view.scala.html` wraps `.user-stream-box` in `@if(!UserApp.currentUser().isGuest)`. `WorkspacePage` now hides the stream/tabs controls when the `/me` profile projection is guest while preserving the guest badge and user card. Evidence: `frontend/src/routes/-workspace-views.tsx`, `frontend/src/wave1-auth-workspace-parity.spec.tsx`. Public-profile viewer-guest proof remains part of any future browser-proof expansion because current public profile projection does not expose viewer guest state. |
| Workspace settings avatar invalid/crop UX | `ui-parity-user-account-settings` | `covered in current follow-up` | Legacy evidence: `user/edit.scala.html` owns `#avatarFile`, `#avatarCropWrap`, Jcrop/canvas assets, and `yobi.user.Setting.js` rejects non-images with `Messages("user.avatar.onlyImage")`, opens the crop modal, updates preview, and draws to 128x128 canvas. React now translates invalid-avatar feedback through legacy messages, opens `#avatarCropWrap` without the hidden class once an image is selected, and keeps the legacy crop preview/save/cancel selectors. Evidence: `frontend/src/routes/-workspace-settings-view.tsx`, `frontend/src/workspace-settings-parity.spec.tsx`, and `frontend/tests/workspace-settings-parity.e2e.ts` for browser selectors. |
| Workspace notification settings hash tab activation | `ui-parity-user-account-settings` | `covered in current follow-up` | Legacy evidence: `user/edit_notifications.scala.html` renders `#notification-projects a[href="#projectId"][data-toggle=tab]`, and `yobi.user.Setting.js` calls `$('#notification-projects a[href="' + location.hash + '"]').tab("show")`. React now derives the active notification project from `routeHref`/`window.location.hash`, falling back to the first watched project only when no hash matches. Evidence: `frontend/src/routes/-workspace-settings-view.tsx`, `frontend/src/workspace-settings-parity.spec.tsx`, and `frontend/tests/workspace-settings-parity.e2e.ts`. |
| Project home dashboard milestone/PR list detail | `ui-parity-project-home-admin` | `covered in Wave 4, browser proof refreshed` | REST container dashboard projection now includes all open milestone rows, no-milestone open issue count, and recent open PR contributor/title/date rows. React project home renders the legacy milestone empty/new state, no-milestone count row, PR rows, and `project.dashboard.more` link. Evidence: `crates/server/src/routes/projects/home.rs`, `crates/persistence/src/repo/project_activity.rs`, `frontend/src/routes/-project-views.tsx`, `frontend/src/app-view-models.ts`, `frontend/src/project-home-tabs.spec.tsx`, `frontend/tests/project-home-parity.e2e.ts`, `crates/server/tests/org_project_contract.rs`, `docs/provenance/ui-parity-reports/ui-parity-project-home-admin.md`. |
| Project home right member block and leave modal | `ui-parity-project-home-admin` | `covered in Wave 2, browser proof refreshed` | `ProjectDetailPage` now renders legacy `.member-wrap`, `.project-members .member`, avatar/profile/name links, updater `#member-add-link`, and hidden `#alertLeave` modal; `#projectLeaveBtn` opens the modal and `#leaveBtn` owns the REST leave mutation. Browser proof now opens/cancels/confirms the leave modal and asserts the REST DELETE CSRF boundary. Evidence: `frontend/src/routes/-project-views.tsx`, `frontend/src/project-home-tabs.spec.tsx`, `frontend/tests/project-home-parity.e2e.ts`, `docs/provenance/ui-parity-reports/ui-parity-project-home-admin.md`. |
| Project settings general controls | `ui-parity-project-home-admin` | `covered in current follow-up` | Code-access radios are now mutable/submitted and persisted through REST/persistence `isCodeAccessibleMemberOnly`; Git settings now read branch JSON, render the legacy `#defaultBranceSettingPanel #project-default-branch[data-toggle=select2][data-format=branch]` selector, and call the existing default-branch REST mutation on change. Browser proof now toggles code access, reviewer count, default branch, overview, issue/review menu checkboxes, asserts PATCH/default-branch REST payloads and CSRF headers, refetches settings, and verifies the visible post-save menu/default-branch state. Evidence: `frontend/src/routes/-project-views.tsx`, `frontend/src/routes/$owner/$projectName/settingform/route.tsx`, `frontend/src/auth-workspace-client.ts`, `frontend/src/api/org-project.ts`, `frontend/src/project-settings-parity.spec.tsx`, `frontend/tests/project-settings-parity.e2e.ts`, `frontend/src/auth-workspace-client.spec.ts`, `crates/server/src/routes/projects.rs`, `crates/persistence/src/repo/project.rs`, `crates/server/tests/org_project_contract.rs`, `docs/provenance/ui-parity-reports/ui-parity-project-home-admin.md`. |
| Project settings browser proof refinement | `ui-parity-project-home-admin` | `covered in current follow-up` | `frontend/tests/project-settings-parity.e2e.ts` now covers menu/code-access/default branch submit, REST payloads, CSRF headers, refetch, and visible post-save state for `/:owner/:project/settingform`. |
| Issue create/edit browser proof refinement | `ui-parity-issues` | `covered in current follow-up` | `frontend/tests/issue-form-parity.e2e.ts` now proves project issue create/edit browser-visible forms under `/yona`: resolved title/due-date validation copy, legacy selectors, create open-milestone filtering, edit open/closed milestone optgroups, hidden edit fields, parent/label/due-date payloads, `referCommentId` propagation, REST POST/PUT boundaries, and detail redirects. The proof found and fixed the nested editform route gap by rendering the child route through the issue detail parent `<Outlet />`. |
| Issue detail action/sidebar/upload browser proof refinement | `ui-parity-issues` | `covered in current follow-up` | `frontend/tests/issue-detail-parity.e2e.ts` now proves issue detail favorite/watch/vote/share/delete modal actions, CSRF-backed REST paths, sidebar milestone/due-date mass-update payloads, label selector shell, and issue comment paste/drop image upload plus REST comment submit from browser-visible controls. |
| Board/milestone attachment and milestone action browser proof refinement | `ui-parity-board-milestone` | `covered in current follow-up` | `frontend/tests/board-posting-parity.e2e.ts` now proves board post/comment attachment metadata and visible `.attached-file` rows. `frontend/tests/milestone-delete-modal-parity.e2e.ts` now proves milestone attachment metadata/rows, invalid create submit field validation with no REST POST, and close/reopen REST JSON callbacks with returned open/closed visible state. |
| Code commit watch browser proof refinement | `ui-parity-code-vcs` | `covered in current follow-up` | `frontend/tests/project-code-comment-upload-parity.e2e.ts` now opens commit detail under the mounted `/yona` base path with branch/path query, clicks `#watch-button`, asserts `POST` then `DELETE /api/v1/projects/:owner/:project/commit/:id/watch` with CSRF, preserves the URL query, and verifies visible `active ybtn-watching` state transitions after each successful REST response. |
| Code no-head Git/SVN browser proof refinement | `ui-parity-code-vcs` | `covered in current follow-up` | `frontend/tests/project-code-comment-upload-parity.e2e.ts` now opens `/code` under `/yona` with `noHead=true` and update permission for both Git and Subversion container variants, asserting the legacy empty-repository warning, setup command guidance, and absence of visible `code.nohead` raw keys. SVN commit discussions remain separately deferred. |
| Project transfer unchecked-alert browser proof refinement | `ui-parity-project-home-admin` | `covered in current follow-up` | `frontend/tests/project-transfer-parity.e2e.ts` now clicks `#btnTransfer` while `#accept` is unchecked, asserts the legacy `project.transfer.alert` resolved copy, verifies `#alertTransfer` stays hidden and no REST POST occurs, then checks the box and proves the CSRF-backed transfer POST plus confirm modal. |
| Project webhooks validation and permission-state browser proof | `ui-parity-project-home-admin` | `covered in current follow-up` | `frontend/tests/project-webhooks-parity.e2e.ts` now browser-proves empty payload validation with zero REST POSTs, JSON webhook type auto-checks/disables `#gitPush`, create/delete use CSRF-backed REST boundaries with legacy payload fields, and non-updater REST 403 renders the legacy forbidden shell with create/delete controls absent. |
| Project members REST/permission browser proof | `ui-parity-project-home-admin` | `covered in current follow-up` | `frontend/tests/project-members-parity.e2e.ts` now browser-proves add-member, enrollment accept, role update, and delete visible mutations while asserting POST/PATCH/DELETE methods, CSRF headers, request paths/bodies, and the non-updater REST 403 legacy forbidden shell with management controls absent. |
| Project settings validation and permission browser proof | `ui-parity-project-home-admin` | `covered in current follow-up` | `frontend/tests/project-settings-parity.e2e.ts` now browser-proves invalid project-name validation with resolved legacy copy and zero REST PATCH, invalid logo-file validation with resolved legacy copy and zero REST PATCH, non-updater REST 403 forbidden shell with settings form absent, plus the existing menu/code-access/default-branch CSRF-backed save path. |
| Project fork existing-fork and validation browser proof | `ui-parity-project-home-admin` | `covered in current follow-up` | `frontend/tests/project-fork-parity.e2e.ts` now browser-proves the positive fork shell plus POST/CSRF payload, empty-name disabled submit with zero REST POSTs, and existing-fork notice/link with `canFork=false` disabled submit and zero REST POSTs. |
| Project admin/settings scoped raw-key browser absence | `ui-parity-project-home-admin` | `weak evidence` | Transfer now asserts no visible `project.transfer`, but the remaining focused project-admin E2Es do not consistently assert body-level absence of raw `project.*`/`button.*` keys. Needed owner scope: existing project admin focused E2E files only. |
| Workspace settings password failure, raw-key, and alias browser proof | `ui-parity-user-account-settings` | `covered in current follow-up` | `frontend/tests/workspace-settings-parity.e2e.ts` now proves wrong-current-password and mismatched-retype REST error states remain visible on `/user/editform/password`, body-level absence of raw settings keys across canonical tabs, and `/me/settings/**` aliases redirect to canonical `/user/editform/**` routes while preserving the notifications hash. The proof found and fixed the `/me` parent route swallowing settings aliases by rendering the child outlet for `/me/settings/**`, and `RedirectPage` now uses replace navigation with optional hash preservation. |
| PR create/edit validation and raw-key browser proof | `ui-parity-pull-request-review` | `covered in current follow-up` | `frontend/tests/pull-request-interaction-parity.e2e.ts` now browser-proves create/edit empty-title and empty-body validation, asserts resolved legacy copy, preserves the visible form URL, and verifies zero REST POST/PATCH mutations before valid input. `frontend/tests/pull-request-review-read-parity.e2e.ts` now adds body-level raw-key absence checks for PR list, closed/sent list, and `/reviews` route-entry surfaces, while existing detail/changes checks cover PR deep links. |
| PR pushed-branch and review-filter browser proof refinement | `ui-parity-pull-request-review` | `covered in current follow-up` | `frontend/tests/pull-request-interaction-parity.e2e.ts` now proves recently pushed branch PR-link navigation and close/delete REST mutation. `frontend/tests/pull-request-review-read-parity.e2e.ts` now proves `/reviews` all/participant filters, date sort, closed state tab, search submit, and Excel export href query preservation; `frontend/src/routes/$owner/$projectName/reviews/route.tsx` now subscribes to TanStack Router location changes so in-app query navigation refetches with the visible URL. |
| Notification row expand/collapse browser proof refinement | `ui-parity-search-notification` | `covered in current follow-up` | `frontend/tests/search-parity.e2e.ts` now proves the populated notification row browser behavior on a mobile viewport: `.message-wrap.nowrap` starts collapsed, title link and avatar image clicks do not toggle, row click expands, message click collapses, and `.more` expands an overflowing row while the route remains React REST JSON-rendered. |
| Project issue-list advanced filters and mass update | `ui-parity-issues` | `covered in Wave 2` | Project issue list now reads/sends legacy `filter`, `dueDate`, `orderBy`, `orderDir`, `commenterId`, and author/assignee/label/milestone params through the React route/client and REST issue list parser, repository filtering applies text/due-date/commenter/sort before pagination, and `ProjectIssueListPage` renders/wires `#mass-update-form`, `#check-all`, `#state`, `#assignee`, `#milestone`, `#attaching-label`, and `#detaching-label` to the existing REST mass-update endpoint. Evidence: `frontend/src/issue-list-filter.spec.tsx`, `frontend/src/auth-workspace-client.spec.ts`, frontend check. Parent cargo target: `pnpm agent:cargo-test -- --outside-sandbox issue_core_contract`. |
| Issue create/edit select and label-copy parity | `ui-parity-issues` | `covered in Wave 2` | Issue create now limits milestone choices to open milestones, edit groups open/closed milestones with legacy optgroups, and the label selector heading uses legacy `label` / `button.edit` message lookups instead of literal keys. Evidence: `frontend/src/route-parity.spec.tsx`, frontend check. |
| Issue detail metadata/timeline/upload/preview parity | `ui-parity-issues` | `covered in current follow-up` | Detail sidebar renders legacy `#issueUpdateForm` for assignee/milestone/due-date/labels and wires single-issue metadata changes through REST mass-update; editor previews render Markdown via the React Markdown boundary; paste/drop upload accepts image and non-image files and inserts image/link Markdown. Wave 5 adds additive REST timeline metadata for sender labels, target users, and resource href/label/title values where raw issue events support them, renders distinct sender/target/resource links in `IssueTimelineEvent`, and restores the visible legacy uploader shell/list/button for issue body and new-comment editors. Current follow-up adds Playwright browser proof for timeline event rows/raw-key absence and comment Markdown preview tab rendering. Evidence: `frontend/tests/issue-detail-parity.e2e.ts`, `crates/persistence/src/repo/comment_helpers.rs`, `crates/server/src/routes/issues.rs`, `frontend/src/routes/-issue-views.tsx`, `frontend/src/issue-detail-shell.spec.tsx`, `frontend/src/route-parity.spec.tsx`. |
| Board form label picker deviation | `ui-parity-board-milestone` | `covered in worker follow-up` | Legacy board create/edit templates do not render label selection; `frontend/src/routes/-board-views.tsx` removed `.board-label-picker` and `frontend/src/board-milestone-parity.spec.tsx` pins the absence. Edit submit preserves existing labels without exposing a non-legacy form control. |
| Board form/detail attachment/delete/label parity | `ui-parity-board-milestone` | `covered in Wave 4` | Covered: board create/edit file uploader shell, board detail `#deleteConfirm`, post/comment/child-comment attachment metadata rows, updateable board detail `#labelIds[data-toggle=select2]` shell, and React-visible board label mutation through canonical REST JSON `PATCH /api/v1/projects/:owner/:project/posts/:number/labels`. The legacy compatibility `/-_-api/v1/.../postlabel/:number` route remains evidence/direct compatibility, not the React data boundary. Evidence: `frontend/src/api/boards.ts`, `frontend/src/routes/-board-views.tsx`, `frontend/src/routes/$owner/$projectName/post/$postNumber/route.tsx`, `crates/server/src/routes/boards.rs`, `crates/server/tests/board_contract.rs`, `frontend/src/api-query.spec.ts`, `frontend/tests/board-posting-parity.e2e.ts`, `docs/provenance/ui-parity-reports/ui-parity-board-milestone.md`. |
| Milestone list/form/detail parity | `ui-parity-board-milestone` | `covered in current follow-up` | Covered: milestone inactive sort direction, list/detail client issue filtering, field-level `.error`/`.message` validation, file uploader shell, runtime `untilLabel`/`dueDateOverdue`, full milestone body/attachment projection, detail attachment metadata rendering, open/closed linked issue projection, legacy `issue.partial_list` row selectors in milestone detail, and milestone detail mass-update dropdown option/mutation wiring through the shared issue mass-update REST boundary. Evidence: `crates/server/src/routes/projects/milestones.rs`, `crates/server/src/api_types.rs`, `frontend/src/app-view-models.ts`, `frontend/src/routes/-milestone-views.tsx`, `frontend/src/routes/$owner/$projectName/milestone/$milestoneId/route.tsx`, `crates/server/tests/milestone_contract.rs`, `crates/server/tests/rest_contract.rs`, `frontend/src/board-milestone-parity.spec.tsx`, `docs/provenance/ui-parity-reports/ui-parity-board-milestone.md`. |
| Directory pagination and org created metadata | `ui-parity-directory-organization` | `covered in current follow-up` | `/projects` and `/orgs` now render legacy `.page-navigation-wrap` / `.page-nums` controls from React instead of empty `#pagination`, preserve filter query links while changing `pageNum`, and `/orgs` projects REST `createdLabel` through the organization directory row `created <strong title=...>` metadata. Evidence: `crates/server/src/routes/projects/organizations.rs`, `frontend/src/app-view-models.ts`, `frontend/src/routes/-directory-views.tsx`, `frontend/src/route-parity.spec.tsx`, `crates/server/tests/org_project_contract.rs`. |
| Project/import create client validation | `ui-parity-directory-organization` | `covered in worker follow-up` | `/projectform` now preserves legacy `yobi.project.New.js` client validation, `#project-name` focusout normalization, owner/protected coupling, SVN warning/Pull Request menu behavior, and code/PR/review checkbox coupling; `/_import` now blocks empty URL with `project.import.error.empty.url` before calling the REST import handler. Evidence: `frontend/src/routes/-project-views.tsx`, `frontend/src/project-create-parity.spec.tsx`, `frontend/src/project-import-parity.spec.tsx`. |
| Organization home CTA/filter/leave/delete-cancel interactions | `ui-parity-directory-organization` | `covered in current follow-up` | Organization home now links create-project directly to `/projectform?owner=:org`, filters visible project rows through React state from `#mylist-filter`, opens legacy `#alertLeave` before leave mutation, and clears member-delete modal state on close/No. Evidence: `frontend/src/routes/-organization-views.tsx` and `frontend/src/organization-home-parity.spec.tsx`. |
| Organization settings/member remaining interactions | `ui-parity-directory-organization` | `covered in worker follow-up` | Organization logo valid-image selection now uploads a temp attachment and immediately calls the organization update REST handler with `logoAttachmentId`, while invalid files still show `project.logo.alert`; member add now implements the legacy `#loginId` typeahead against `/-_-api/v1/users`, renders `info` suggestions, reuses complete-range cache, and selects the suggestion `loginId` before the existing REST add-member submit. Evidence: `frontend/src/routes/-organization-views.tsx`, `frontend/src/routes/organizations/$organizationName/members/route.tsx`, `frontend/src/api/users.ts`, `frontend/src/auth-workspace-client.ts`, `frontend/src/auth-workspace-client.spec.ts`, `frontend/src/organization-shell-i18n.spec.tsx`, `frontend/src/route-parity.spec.tsx`, backend `crates/server/tests/legacy_external_users_contract.rs`. |
| Code commit watch/unwatch button | `ui-parity-code-vcs` | `covered in current follow-up` | Legacy evidence: `diff.scala.html` renders `#watch-button`, passes `Commit.asResource(project)` to `WatchApp.watch/unwatch`, and `Commit.asResource` uses resource type `COMMIT` with id `project.id:commitId`; `Commit.getWatchers` includes author, project watchers, commenters, explicit commit watches, and explicit unwatch removal. Rust now projects `isWatching`, persists `COMMIT` watch/unwatch rows through `POST`/`DELETE /api/v1/projects/:owner/:project/commit/:id/watch`, resolves legacy direct `commit` resource ids, and wires the existing React `#watch-button` callback to `watchCommitRest`/`unwatchCommitRest`. Evidence: `crates/server/src/routes/code.rs`, `crates/persistence/src/repo/watch_helpers.rs`, `frontend/src/api/code-commits.ts`, `frontend/src/routes/$owner/$projectName/commit/$commitId/route.tsx`, `crates/server/tests/code_browser_contract.rs`, `frontend/src/api-query.spec.ts`, `frontend/src/route-parity.spec.tsx`, `frontend/src/code-views.spec.tsx`, and browser click proof in `frontend/tests/project-code-comment-upload-parity.e2e.ts`. |
| Code commit anonymous author fallback | `ui-parity-code-vcs` | `covered in Wave 3` | Legacy `diff.scala.html` renders `User.anonymous.name`, and `NullUser` populates that model field from `Messages.get("user.notExists.name")` (`User exists not` in default messages). React now uses that legacy message fallback and focused specs pin absence of visible `User.anonymous.name`. |
| Code branch action permission-state browser proof | `ui-parity-code-vcs` | `covered in Wave 3` | `frontend/src/code-views.spec.tsx` now pins admin/update-only/delete-only/read-only branch action visibility, default-branch hidden set-default/delete actions, and legacy data-request attributes against `partial_branchrow.scala.html` evidence. |
| Code commit diff partial selector exactness | `ui-parity-code-vcs` | `covered in Wave 3` | `frontend/src/code-views.spec.tsx` now pins `.codediff-wrap`, `.diff-body`, `.diff-file.diff-container`, `.diff-code.diff-table`, `add/remove/context/hunk` rows, `.linenum` gutters, `.diff-partial-codeline`, `.line-comment-trigger`, and `.btnPop` selectors against legacy `diff.scala.html` / `partial_diff` evidence. |
| Search scoped project chrome uses synthetic project detail | `ui-parity-search-notification` | `covered in Wave 3` | `SearchRoutePage` now fetches the real project container (`/api/v1/owners/:owner/projects/:project/container`), maps it through `toProjectContainerView`, and renders `ProjectHeader` / `ProjectMenu` from that state. Evidence: `frontend/src/routes/-search-views.tsx`, `frontend/tests/search-parity.e2e.ts`. |
| Search scoped organization chrome uses synthetic organization detail | `ui-parity-search-notification` | `covered in Wave 3` | `SearchRoutePage` now fetches the real organization container (`/api/v1/organizations/:organization/container`), maps it through `toOrganizationContainerView`, and renders `OrganizationHeader` / `OrganizationMenu` from that state. Evidence: `frontend/src/routes/-search-views.tsx`, `frontend/tests/search-parity.e2e.ts`. |
| Search missing keyword/searchType route state | `ui-parity-search-notification` | `covered in Wave 3` | The parent decision for this packet follows legacy `SearchApp`: missing keyword or missing/invalid `searchType` is a bad request. `readSearchRouteQuery()` now renders the legacy bad-request shell without a REST call, while REST already rejects missing input. Evidence: `frontend/src/routes/-search-views.tsx`, `frontend/tests/search-parity.e2e.ts`. |
| Search user/project/milestone result row visual shape | `ui-parity-search-notification` | `covered in Wave 5` | User rows remain covered from Wave 3. Project rows now use DTO/project-logo data and render the legacy fork-original metadata block when origin data exists; milestone rows now include legacy `until` text beside the due-date label. Evidence: `crates/persistence/src/repo/search.rs`, `crates/server/src/routes/search.rs`, `frontend/src/api/search.ts`, `frontend/src/routes/-search-views.tsx`, `crates/server/tests/search_contract.rs`, `frontend/src/search-i18n.spec.tsx`, `frontend/src/route-parity.spec.tsx`. |
| Search comment/review result row browser proof | `ui-parity-search-notification` | `covered in Wave 3` | Static render and Playwright proof now cover issue_comment/post_comment/review `Re)` titles, `#comment-id` fragments, number spans, snippets, project/author meta, and review pull-request comment links. Evidence: `frontend/src/search-i18n.spec.tsx`, `frontend/tests/search-parity.e2e.ts`. |
| Notification welcome guide persistence proof | `ui-parity-search-notification` | `covered in Wave 3` | Playwright now clicks `#toggleIntro`, verifies `.site-guide-outer.hide`, stores `localStorage["yobi-intro"]`, reloads, and toggles back on the authenticated `/notifications` route. Evidence: `frontend/tests/search-parity.e2e.ts`. |
| Notification load-more semantics | `ui-parity-search-notification` | `covered in current follow-up` | `/notifications` now preserves the legacy append-next-chunk behavior in React: the initial REST query reads `from=0&size=20`, `#notification-more` prevents anchor navigation, fetches `from=items.length&size=20`, appends `nextPage.items`, and updates `hasMore` instead of refetching prior rows by increasing `size` from zero. Evidence: `frontend/src/routes/notification/route.tsx`, `frontend/src/route-parity.spec.tsx`, `frontend/tests/search-parity.e2e.ts`, existing `frontend/src/auth-workspace-client.spec.ts` API query coverage. |
| Pull request contributor sent-by-me option | `ui-parity-pull-request-review` | `covered in Wave 3 follow-up` | PR list REST JSON now includes `currentUserId`, and React renders the legacy `pullRequest.sentByMe` option under `#contributors` when that user is also in contributors. Evidence: `frontend/src/routes/-pull-request-views.tsx`, `frontend/src/api/pull-requests.ts`, `crates/server/src/routes/pull_requests.rs`, `frontend/src/route-parity.spec.tsx`, `frontend/tests/pull-request-review-read-parity.e2e.ts`, `crates/server/tests/pull_request_read_contract.rs`. |
| Pull request create/edit selector id semantics | `ui-parity-pull-request-review` | `covered in Wave 3 follow-up` | Form DOM now preserves hidden `#pullRequestState`, merge-check alert `#status`, title input `#title`, and a body editor id outside those legacy selectors. Evidence: `frontend/src/routes/-pull-request-views.tsx`, `frontend/src/pull-request-list-form-review-i18n.spec.tsx`, `frontend/tests/pull-request-interaction-parity.e2e.ts`. |
| Pull request create/edit body validation | `ui-parity-pull-request-review` | `covered in Wave 3 follow-up` | React submit now surfaces `pullRequest.body.required` in the legacy visible validation flow before REST submission. Evidence: `frontend/src/routes/-pull-request-views.tsx`, `frontend/src/route-parity.spec.tsx`. |
| Pull request event timeline i18n | `ui-parity-pull-request-review` | `covered in Wave 3 follow-up` | PR timeline now interpolates sender and merged commit placeholders through legacy messages; render/e2e proof rejects raw `pullRequest.event.message*` keys. Evidence: `frontend/src/routes/-pull-request-views.tsx`, `frontend/src/route-parity.spec.tsx`, `frontend/tests/pull-request-review-read-parity.e2e.ts`. |
| Pull request interaction e2e copy drift | `ui-parity-pull-request-review` | `covered in Wave 3 follow-up` | Classified as stale test drift against legacy messages and updated to `This pull request can be merged safely.`, `Approve`, `Merge`, and reviewer shortage tooltip semantics. Evidence: `frontend/tests/pull-request-interaction-parity.e2e.ts`, `yona-original/conf/messages`. |
| Pull request browser proof for row/review variants | `ui-parity-pull-request-review` | `covered in current follow-up` | `/reviews` rows now restore legacy nowrap ellipsis under `.review-list-wrap .post-item .title-wrap`, and real REST `/reviews` includes non-PR commit review threads like legacy `ReviewSearchCondition`. Evidence: `frontend/src/app.css`, `crates/persistence/src/repo/pull_request_review.rs`, `crates/server/tests/pull_request_read_contract.rs`, `frontend/src/route-parity.spec.tsx`, `frontend/src/project-reviews-export.spec.tsx`, and `frontend/tests/pull-request-review-read-parity.e2e.ts` browser-computed CSS proof for nowrap/overflow/ellipsis. |
| Site-admin import repo-auth/project-name copy | `ui-parity-site-admin-setup` | `covered in current follow-up` | `/_import` now renders the legacy `#repoAuth .row-fluid` / `dl.span6` auth field layout, `project.import.auth.userid`, `project.import.auth.userpw`, `project.import.auth.userid.desc`, and `project.name.alert` placeholder while keeping React submit on the REST import boundary. Evidence: `frontend/src/routes/-project-views.tsx`, `frontend/src/project-import-parity.spec.tsx`. |
| Secret configured-state behavior | `ui-parity-site-admin-setup` | `covered in Wave 3` | Legacy `/secret` is entered only while the default secret is invalid and has no concrete route in configured runtime. `/api/v1/auth/capabilities` now exposes `secretSetupRequired`; direct GET `/secret` returns 404 after setup, REST setup retry returns 404, and React `/secret` renders `NotFoundPage` instead of the setup form when configured. Evidence: `crates/server/src/routes/auth.rs`, `frontend/src/routes/secret/route.tsx`, `crates/server/tests/auth_workspace_contract.rs`, `frontend/src/route-parity.spec.tsx`. |

## Active Worker Assignments

| Work item | Agent | Status | Owned scope |
| --- | --- | --- | --- |
| README postform parity | `019eff66-0f58-7cb2-929b-1326fb4d8125` (`Harvey`) | completed, committed `19b24182` | Board postform route/API/server/tests |
| Query-string coverage evidence | `019eff66-28d2-74f2-a67b-7d34c6699949` (`Volta`) | completed, committed `f4f33829` | Audit/visual scripts and RC coverage contract |
| Issue timeline/PJAX fragment closure | `019eff66-f18b-7092-8944-04839467097c` (`Gibbs`) | completed, committed `19b24182` | Issue routes/contracts and fragment policy docs |
| Legacy MariaDB adopted-data smoke | `019eff67-24ae-77e3-9712-e71432bfd314` (`Mendel`) | completed, committed `3e2ebc84` | Legacy MariaDB dump smoke and release/checklist evidence |

## Parent Decisions

- Sample-data status deltas are not automatic parity failures when the legacy
  homelab sample lacks the required object/branch or returns a known reference
  error, and the Rust sample fixture renders the normal legacy UX with
  route-specific functional tests. These stay documented as status deltas rather
  than requiring Yoram to reproduce broken reference-instance data states.
- Project issue-list XHR/PJAX fragment mode is not a new React data source and
  is closed as not-applicable compatibility. Normal user-visible issue-list UX
  remains React route plus `/api/v1/projects/:owner/:project/issues` REST JSON
  list data; direct server-rendered PJAX fragments are not retained.
- The 2026-06-26 continuation splits the historical four broad packets into
  narrower subagent packets because the existing route-entry visual sweep cannot
  prove every tab, modal, validation branch, permission-gated control, and
  mutation-visible state. The older packet results remain valid baseline
  evidence but no longer by themselves close the full UI parity goal directive.
- Browser parity should use the current localhost curl proxy for the homelab
  legacy instance when direct Playwright access to `192.168.45.10:9000` fails.
  This remains browser-rendered legacy HTML and is stronger than raw curl for
  user-visible checks.
- Signup, user, project, organization, issue, board, milestone, PR, search, and
  site-admin form submissions should stay consistent with the canonical
  app-runtime boundary: React-visible flows submit through REST JSON/API
  contracts and render with React. Legacy form routes are compatibility
  adapters or evidence, not the preferred app data path.
- Legacy i18n keys remain the scalar source. A visible raw key such as
  `title.no.results` is a parity failure unless the legacy page visibly showed
  that raw key in the same state.

## Subagent Report Contract

Each subagent report must include:

- Legacy evidence checked: exact `yona-original/` files, legacy routes, or live
  baseline paths.
- Rust/React evidence checked: exact files, tests, docs, and generated coverage
  artifacts.
- Result table with one row per finding:
  `path`, `legacy evidence`, `current evidence`, `status`, `proposed owner`.
- Status must be one of `covered`, `gap`, `deviation`, `deferred`,
  `not-applicable`, or `needs-parent-decision`.
- For any `gap` or `deviation`, include a bounded write-scope proposal that can
  be assigned to a worker without conflicting with other packets.
- A Playwright scenario table with this shape:
  `path`, `state`, `legacy selector/copy`, `Rust selector/copy`, `interaction`,
  `API/direct boundary`, `status`.
- Screenshots are optional supporting evidence, but selector/copy assertions are
  required for form, modal, permission, empty-state, and mutation-visible checks.
- A route inventory summary with counts for `covered`, `gap`, `deviation`,
  `deferred`, `not-applicable`, and `weak evidence`. Parent cannot close this
  phase from narrative-only reports.

## Parallelization Plan

Run the phase in two distinct gates. Gate A documents the complete UI parity
inventory first; Gate B distributes only the concrete queued rows produced by
that inventory. Gate A is not closed while any active packet lacks a report, or
while any report records `gap`, `deviation`, `weak evidence`, or
`needs-parent-decision` rows. Concrete implementation may continue only for
already recorded queue rows; newly discovered pages or states must return to
Gate A before implementation.

Current Gate A report status:

| Packet/report | Status | Evidence |
| --- | --- | --- |
| `ui-parity-user-workspace-profile` report file | closed 2026-06-26 | `docs/provenance/ui-parity-reports/ui-parity-user-workspace-profile.md` records 14 covered rows and no gap/deviation/weak-evidence/needs-parent-decision rows. |
| `ui-parity-user-account-settings` report file | closed 2026-06-26 | `docs/provenance/ui-parity-reports/ui-parity-user-account-settings.md` records 13 covered rows and no gap/deviation/weak-evidence/needs-parent-decision rows. |
| `ui-parity-fragment-security-db` report file | closed 2026-06-26 | `docs/provenance/ui-parity-reports/ui-parity-fragment-security-db.md` records 12 covered rows, 1 not-applicable row for issue-list PJAX fragment compatibility, and no gap/deviation/weak-evidence/needs-parent-decision rows. |
| `ui-parity-auth-public-entry` browser-proof depth | closed 2026-06-27 | `frontend/tests/auth-public-entry-parity.e2e.ts` passed 7 Playwright tests after adding first-run `/secret` admin setup form, REST payload, and restart redirect proof; the auth report still has no weak-evidence row. |

1. Keep `docs/provenance/ui-parity-reports/*` as the route-family inventory
   baseline. If a new legacy page or user-visible state is discovered, add a
   row to the owning report before assigning implementation.
2. Assign implementation by disjoint write scope, not by one giant route family.
   A worker receives one row group, the exact owned files/modules, and the
   focused test/provenance files it may update.
3. Within one batch, avoid overlapping files. If two gaps touch the same route
   helper/component/API module, keep them in the same worker assignment.
4. Parent integrates one completed worker at a time, updates this queue, then
   runs focused checks before assigning the next overlapping worker.
5. After each wave, rerun the lightweight route/spec gates and refresh the
   remaining queue statuses before starting the next wave.

## Worker Wave Plan

Wave 0 is already in progress for small, isolated follow-ups found by the
inventory reports. Later waves should be assigned only after the previous wave
has landed and the queue statuses are refreshed.

| Wave | Worker packet | Owned scope | Queue rows |
| --- | --- | --- | --- |
| reopen-1 | `ui-worker-auth-root-gap` | `crates/server/src/routes/auth.rs`, `crates/server/src/api_types.rs`, `frontend/src/app-runtime-context.tsx`, `frontend/src/routes/-auth-views.tsx`, `frontend/tests/auth-public-entry-parity.e2e.ts`, `frontend/tests/root-shell-parity.e2e.ts` | Closed in current follow-up: signup-confirm admin-contact interpolation, login-dialog rememberMe mutability, public/root raw-key browser scans |
| reopen-1 | `ui-worker-directory-proof` | focused Playwright specs first; `frontend/src/routes/-directory-views.tsx`, `frontend/src/routes/-project-views.tsx`, `frontend/src/routes/-organization-views.tsx` only if proof fails | Directory pagination, `/projectform`, `/_import`, `/organizations/new` browser validation/mutation proof |
| reopen-1 | `ui-worker-workspace-settings-proof` | `frontend/tests/workspace-settings-parity.e2e.ts`; `frontend/src/routes/-workspace-settings-view.tsx` only if proof fails | Workspace profile/avatar mutation browser depth |
| reopen-1 | `ui-worker-code-watch-proof` | `frontend/tests/project-code-comment-upload-parity.e2e.ts` or `frontend/tests/legacy-rendered-page-audit.e2e.ts`; commit route/view/API files only if proof fails | Commit detail watch/unwatch browser click proof |
| reopen-2 | `ui-worker-issue-label-settings` | `frontend/src/routes/$owner/$projectName/issue/labelsform/route.tsx`, `frontend/tests/issue-label-settings-parity.e2e.ts`, issue report/phase rows | Closed in current follow-up: update permission gate, category typeahead/new-category choice, and edit modal UX |
| 0 | `ui-worker-notification-load-more` | `frontend/src/routes/notification/route.tsx`, `frontend/src/route-parity.spec.tsx`, notification report/phase rows | Notification load-more semantics |
| 1 | `ui-worker-auth-post-state` | `frontend/src/routes/-auth-views.tsx`, auth route files, auth focused specs, auth report rows | Signup confirm/email verification, reset/verify invalid post states |
| 1 | `ui-worker-workspace-settings-proof` | focused Playwright/e2e specs plus `frontend/src/routes/-workspace-settings-view.tsx` only if a concrete diff appears | Closed in current follow-up: avatar invalid/crop UX and notification hash tab activation |
| 1 | `ui-worker-directory-validation-org-member` | `frontend/src/routes/-project-views.tsx`, `frontend/src/routes/-organization-views.tsx`, project/org focused specs | Completed in worker follow-up: Project/import client validation, organization logo auto-submit, and organization member typeahead |
| 2 | `ui-worker-project-admin-home` | `frontend/src/routes/-project-views.tsx`, project route/API projections if required, project focused specs | Project home dashboard, member block/leave modal, settings general controls |
| 2 | `ui-worker-issues-detail-list` | issue React route/view/client files, issue focused specs, issue provenance rows | Issue list filters/mass update, create/edit selector copy, detail metadata/timeline/upload/preview |
| 2 | `ui-worker-board-milestone` | `frontend/src/routes/-board-views.tsx`, `frontend/src/routes/-milestone-views.tsx`, board/milestone focused specs | Board label picker deviation, board attachment/delete/label parity, milestone list/form/detail parity |
| 3 | `ui-worker-code-vcs-proof` | `frontend/src/routes/-code-views.tsx`, code route files, focused Playwright/specs | Commit watch/unwatch, anonymous author decision, branch action proof, diff selector exactness |
| 3 | `ui-worker-pr-review` | `frontend/src/app.css`, `crates/persistence/src/repo/pull_request_review.rs`, PR review focused specs/contracts | Covered in current follow-up: restored legacy nowrap/ellipsis on `/reviews` rows and included legacy non-PR commit review threads in real REST `/reviews` data. Wave 3 already closed contributor sent-by-me, selector ID semantics, body validation, event timeline i18n, stale e2e copy, and mocked PR/commit href variants. |
| 3 | `ui-worker-search-chrome-results` | `frontend/src/routes/-search-views.tsx`, search DTO/repository projection if required, search focused specs | Scoped chrome, missing keyword state decision, user/project/milestone row shapes, comment/review proof |
| 4 | `ui-worker-site-admin-setup` | `crates/server/src/routes/auth.rs`, `frontend/src/routes/secret/route.tsx`, site-admin focused specs | `/secret` configured-state proof/fix closed in Wave 3 |

Worker assignment prompts must name the exact wave row and must include:

- The worker is not alone in the codebase and must not revert unrelated changes.
- The worker may edit only the owned scope plus explicitly named focused tests
  and report rows.
- The worker must keep legacy Yona UI/UX as source of truth and must not add
  improved UX.
- The worker must keep React-visible flows on REST JSON/API-return plus React
  render unless the row is a direct legacy compatibility route.
- The worker final response must list changed files, verification commands, and
  any row it could not close.

## Worker Split Rule

After an explorer report:

- Assign workers only for concrete `gap` rows, not for broad investigation.
- Give each worker a disjoint write set such as one route helper, one API module,
  one backend route group, one e2e file, or one provenance/checklist section.
- Tell every worker that other agents may edit the codebase and that they must
  not revert unrelated changes.
- Worker output must include changed file paths, verification commands, and
  any remaining `gap`/`deviation` row that could not be closed.

## Parent Integration Gate

Before this phase can close:

- Every packet has a subagent report.
- Every `gap` is implemented or explicitly reclassified into root canonical
  docs, provenance, and a follow-up plan with reason.
- `tests/rc-ux-checklist-contract.test.mjs` continues to bind RC rows to
  visual sweep paths, security evidence, REST submit boundaries, and Markdown
  renderer ownership.
- `scripts/visual-parity-comparison.spec.mjs`,
  `scripts/legacy-html-page-audit.spec.mjs`, and
  `scripts/legacy-route-coverage.spec.mjs` remain green.
- Focused frontend/Playwright/cargo checks are run for any implementation
  packet that changes code.
- The parent runs `pnpm test:dev-scripts` after documentation/guard updates.

## Parent Integration Evidence

- 2026-06-27 project settings validation/permission browser-proof refresh:
  `pnpm --dir frontend test:e2e -- project-settings-parity.e2e.ts` passed 2
  Playwright tests after adding invalid project-name validation proof with zero
  REST PATCHes, invalid logo-file validation proof with zero REST PATCHes, and
  non-updater REST 403 forbidden-shell proof with the settings form absent.
- 2026-06-27 project fork browser-proof refresh: `pnpm --dir frontend
  test:e2e -- project-fork-parity.e2e.ts` passed 2 Playwright tests after
  adding empty-name disabled-submit proof with zero REST POSTs and existing-fork
  notice/link proof with `canFork=false`, disabled submit, and zero REST POSTs.
- 2026-06-27 project webhooks browser-proof refresh: `pnpm --dir frontend
  test:e2e -- project-webhooks-parity.e2e.ts` passed 2 Playwright tests after
  adding empty-payload validation proof with zero REST POSTs, JSON webhook type
  auto-check/disabled `#gitPush` proof, CSRF-backed create/delete REST payload
  proof, and non-updater REST 403 forbidden-shell proof with create/delete
  controls absent.
- 2026-06-27 project members browser-proof refresh: `pnpm --dir frontend
  test:e2e -- project-members-parity.e2e.ts` passed 2 Playwright tests after
  adding POST/PATCH/DELETE method, CSRF, request body/path proof for add-member,
  enrollment accept, role update, and delete, plus non-updater REST 403
  forbidden-shell proof with management controls absent.
- 2026-06-27 PR validation/raw-key browser-proof refresh: `pnpm --dir frontend
  test:e2e -- pull-request-interaction-parity.e2e.ts -g "blocks empty PR
  create/edit submissions"` passed 1 Playwright test for create/edit
  validation with zero REST mutations, and `pnpm --dir frontend test:e2e --
  pull-request-review-read-parity.e2e.ts -g "renders project PR lists"` passed
  1 Playwright test after adding PR list/reviews raw-key absence assertions.
- 2026-06-27 workspace settings alias/password browser-proof refresh: `pnpm
  --dir frontend test:e2e -- workspace-settings-parity.e2e.ts` passed 9
  Playwright tests after adding `/me/settings/**` alias redirect/raw-key proof,
  fixing the `/me` parent outlet and redirect hash preservation, and adding
  wrong-current-password plus mismatched-retype visible REST error proof.
- 2026-06-27 project transfer browser-proof refresh: `pnpm --dir frontend
  test:e2e -- project-transfer-parity.e2e.ts` passed 1 Playwright test after
  adding unchecked transfer proof for the legacy alert copy, hidden modal,
  zero REST POSTs before agreement, and the existing CSRF-backed confirmed
  transfer POST.
- 2026-06-27 issue detail browser-proof refresh: `pnpm --dir frontend test:e2e
  -- issue-detail-parity.e2e.ts` passed 2 Playwright tests after adding
  focused proof for favorite/watch/vote/share/delete modal actions,
  `#issueUpdateForm` milestone/due-date mass-update payloads, label selector
  shell, and issue comment paste/drop image uploads with REST submit.
- 2026-06-27 issue form browser-proof refresh: `pnpm --dir frontend test:e2e
  -- issue-form-parity.e2e.ts` passed 2 Playwright tests after adding project
  issue create/edit validation, selector-state, REST payload, `referCommentId`,
  and redirect proof, and after fixing the nested issue editform route to render
  through the parent route outlet.
- 2026-06-27 workspace settings browser-depth refresh: `pnpm --dir frontend
  test:e2e -- workspace-settings-parity.e2e.ts` passed 7 Playwright tests after
  adding profile/avatar mutation-depth proof for crop Cancel, crop Save upload,
  hidden `avatarAttachmentId`, `PATCH /api/v1/workspace/profile` and `/me`
  redirect, reset visited projects, and selected notification toggle mutation.
- 2026-06-27 reopen wave integration refresh: `pnpm --dir frontend test:e2e
  -- auth-public-entry-parity.e2e.ts root-shell-parity.e2e.ts
  directory-create-import-proof.e2e.ts project-code-comment-upload-parity.e2e.ts
  issue-label-settings-parity.e2e.ts` passed 27 Playwright tests, covering the
  auth/root gap closures, directory/create/import/org proof, commit watch proof,
  and issue-label settings permission/typeahead/modal proof in one mounted-base
  browser run.
- 2026-06-27 parent gate refresh: `node --test
  tests/ui-parity-gate-a-contract.test.mjs
  tests/rc-ux-checklist-contract.test.mjs` passed 11 tests, and
  `pnpm test:dev-scripts` passed 72 tests after documenting the separate
  inventory-before-worker UI parity phase objective and pinning that operating
  model in the Gate A contract test.
- 2026-06-27 auth/setup browser proof refresh: `pnpm --dir frontend test:e2e
  -- auth-public-entry-parity.e2e.ts` passed 7 Playwright tests after adding
  first-run `/secret` admin setup form, REST submit payload, and restart
  redirect proof.
- 2026-06-27 Markdown browser stability refresh: `pnpm --dir frontend
  test:e2e -- --grep "renders pathological long SQL fenced blocks"
  legacy-rendered-page-audit.e2e.ts` ran the broad legacy-rendered page audit
  suite and passed 49 Playwright tests after adding browser-visible issue
  detail proof for a >65KB SQL fenced block rendered as plain source without
  syntax-token expansion.
- 2026-06-27 notification load-more browser proof refresh: `pnpm --dir frontend
  test:e2e -- search-parity.e2e.ts` passed 10 Playwright tests after adding
  `#notification-more` click proof for REST `from=20&size=20`, stable
  `/notifications` URL, row append, and final button removal.
- 2026-06-27 directory/create/import browser proof refresh: `pnpm --dir
  frontend test:e2e -- directory-create-import-proof.e2e.ts` passed 4
  Playwright tests after adding mounted-base `/projects` and `/orgs`
  pagination click proof plus `/projectform`, `/_import`, and
  `/organizations/new` validation/REST mutation proof.
- 2026-06-27 issue label settings browser proof refresh: `pnpm --dir frontend
  test:e2e -- project-code-comment-upload-parity.e2e.ts
  issue-label-settings-parity.e2e.ts` passed 9 Playwright tests after adding
  read-only forbidden proof, existing-category typeahead proof, new-category
  Single/Multiple choice proof, legacy `#editLabel`/`#editCategory` modal proof,
  and commit watch/unwatch browser-click proof.
- 2026-06-26 parent gate refresh: `node --test
  tests/rc-ux-checklist-contract.test.mjs` passed 6 tests after the phase status
  cleanup.
- 2026-06-26 parent gate refresh: `node --test
  scripts/visual-parity-comparison.spec.mjs
  scripts/legacy-html-page-audit.spec.mjs
  scripts/legacy-route-coverage.spec.mjs` passed 8 tests after the phase status
  cleanup.
- 2026-06-26 parent gate refresh: `pnpm test:dev-scripts` passed 67 tests after
  the phase status cleanup, covering the RC checklist contract, visual
  comparison, legacy HTML page audit, legacy route coverage, REST/HTML boundary
  guards, and cargo harness contracts.
- 2026-06-26 parent gate refresh: `pnpm test:dev-scripts` passed 67 tests after
  the `/reviews` row-fidelity closure and report-summary reconciliation. Later
  Gate A re-audit found missing active packet report files, so this evidence
  remains historical test proof rather than current inventory-closure proof.
- 2026-06-26 parent Gate A refresh: `ui-parity-root-navigation-shell.md` was
  added as the missing root-shell report.
- 2026-06-26 auth public-entry browser proof refresh: `pnpm --dir frontend
  test:e2e -- auth-public-entry-parity.e2e.ts` passed 6 Playwright tests after
  adding login submit, signup confirmation, alias, social-login-only/OAuth
  alert, lost/reset password, and verify route coverage.
- 2026-06-26 Gate A report closure refresh: the missing
  `ui-parity-user-workspace-profile`,
  `ui-parity-user-account-settings`, and `ui-parity-fragment-security-db`
  reports were added. Their current summaries record 14, 13, and 13 total rows
  respectively and contain no `gap`, `deviation`,
  `weak evidence`, or `needs-parent-decision` rows; the only non-covered row is
  the existing `not-applicable` issue-list PJAX fragment compatibility decision.
- 2026-06-26 root-shell browser proof refresh: `pnpm --dir frontend test:e2e
  -- root-shell-parity.e2e.ts` passed 5 Playwright tests after adding
  anonymous/authenticated/site-admin/guest shell coverage, login dialog
  open/submit/error/close proof, standalone footer suppression proof, and
  mounted-base-path project search-scope proof.
- 2026-06-26 parent frontend boundary refresh: `pnpm --dir frontend test` passed
  908 tests and `pnpm --dir frontend build` passed after closing stale native
  form-submit markers, stale `issue.selectAll` message-key usage, organization
  member typeahead `dangerouslySetInnerHTML`, and legacy users-search
  `response.text()` parsing.
- 2026-06-26 user workspace browser proof refresh: `pnpm --dir frontend test:e2e
  -- user-profile-parity.e2e.ts` passed 3 Playwright tests after adding
  selected-tab click coverage for `/yona/door?daysAgo=7&selected=projects`.
- 2026-06-26 board/milestone frontend refresh: `pnpm --dir frontend test`
  passed 908 tests and `pnpm --dir frontend build` passed after closing the
  milestone detail mass-update dropdown option/mutation follow-up.

## Initial Delegation Prompts

### `ui-parity-auth-public-entry`

Audit public/auth UI parity only. Do not edit files. Legacy evidence:
`yona-original/app/views/user/login.scala.html`, `signup.scala.html`,
`resetPassword.scala.html`, `verified.scala.html`,
`yona-original/app/views/site/lostPassword.scala.html`, and
`yona-original/conf/routes`. Current evidence:
`frontend/src/routes/-auth-views.tsx`, `/users/loginform`,
`/users/signupform`, `/lostPassword`, `/resetPassword`,
`/verify/$loginId/$verificationCode`, `/login`, `/register`,
`/forgot-password`, and auth API wrappers. Check anonymous `/`, local login,
`rememberMe`, `redirectUrl`, OAuth configured/unsupported/denied states,
social-login-only mode, signup confirm/email-verification states, lost/reset
password valid/invalid token states, and verify success/invalid pages. Confirm
React submits stay REST JSON while legacy POST routes remain compatibility
adapters.

### `ui-parity-root-navigation-shell`

Audit root navigation/shell UI parity only. Do not edit files. Legacy evidence:
`common/navbar.scala.html`, `common/usermenu.scala.html`,
`common/loginDialog.scala.html`, and `common/footer.scala.html`. Current
evidence: `frontend/src/routes/__root.tsx`, root shell tests, visual sweep, and
direct `/user/sidebar` / `/user/usermenuTabContentList` API boundaries. Check
anonymous/authenticated/site-admin/guest states, `hideProjectListing`,
feedback URL on/off, global/project/org search scope form, `#mySidenav`,
favorite/project/recent-history tabs, create dropdown, site-admin affix, login
dialog, and footer suppression on standalone pages.

### `ui-parity-user-workspace-profile`

Audit user workspace/public profile UI parity only. Do not edit files. Legacy
evidence: `user/view.scala.html`, `partial_issues.scala.html`,
`partial_pullRequests.scala.html`, `partial_projectlist.scala.html`, and
`userFiles.scala.html`. Current evidence: `frontend/src/routes/-workspace-views.tsx`,
`frontend/src/routes/me/route.tsx`, `/$user`, `/user/issues`, and `/user/files`.
Check `/me`, `/:user`, missing user, org-name redirect, `daysAgo`/`selected`
tabs, issue/PR/project empty and populated states, guest/site-admin/blocked
badges, connected providers, `YONA_SHOW_USER_EMAIL=false`, watch/unwatch and
leave anchors, and REST profile/workspace APIs.

### `ui-parity-user-account-settings`

Audit user account settings UI parity only. Do not edit files. Legacy evidence:
`user/edit.scala.html`, `edit_password.scala.html`,
`edit_notifications.scala.html`, `edit_emails.scala.html`,
`edit_token.scala.html`, and `partial_edit_tabmenu.scala.html`. Current
evidence: `frontend/src/routes/-workspace-settings-view.tsx`,
`/user/editform/**`, and `/me/settings/**`. Check profile form, avatar upload
and invalid image state, reset visited list, password change/reset-email link,
watched-project notification tabs/toggles, add/delete/set-main/send-validation
email, token display/select/reset, and direct legacy anchors such as
`/user/email/**` and `/noti/toggle/**`.

### `ui-parity-directory-organization`

Audit directory and organization UI parity only. Do not edit files. Legacy
evidence: `project/list.scala.html`, `project/create.scala.html`,
`organization/list.scala.html`, `organization/create.scala.html`,
`organization/view.scala.html`, `organization/header.scala.html`,
`organization/menu.scala.html`, `organization/members.scala.html`,
`organization/setting.scala.html`, and `organization/deleteForm.scala.html`.
Current evidence: `frontend/src/routes/-directory-views.tsx`,
`frontend/src/routes/-organization-views.tsx`, `/projects`, `/projectform`,
`/_import`, `/orgs`, `/organizations/new`, and `/organizations/$organizationName/**`.
Check search/pagination/empty states, project/org create validation, org home
project list, create-project CTA, enroll/cancel/leave, settings logo upload,
members add/typeahead/role/delete/enrollment accept, and deleteForm confirm
state.

### `ui-parity-project-home-admin`

Audit project home/admin UI parity only. Do not edit files. Legacy evidence:
`project/home.scala.html`, `partial_history.scala.html`,
`partial_dashboard*.scala.html`, `setting.scala.html`, `members.scala.html`,
`watchers.scala.html`, `webhooks.scala.html`, `transfer.scala.html`,
`change_vcs.scala.html`, `delete.scala.html`, `statistics.scala.html`, and
`projectMenu.scala.html`. Current evidence: `frontend/src/routes/-project-views.tsx`
and `/:owner/:project` plus admin subroutes. Check home `tabId` states,
README/Git fallback/DB README, history/dashboard blocks, project header/menu,
member add/edit/delete/leave, watcher list, webhook form/list/delete,
settings menu persistence, transfer/changeVCS/delete checkbox alerts, fork, and
statistics `Under Construction`.

### `ui-parity-issues`

Audit issue UI parity only. Do not edit files. Legacy evidence:
`issue/list.scala.html`, `create.scala.html`, `edit.scala.html`,
`view.scala.html`, `partial_*`, `common/commentForm.scala.html`, and
`common/childComments.scala.html`. Current evidence: `frontend/src/routes/-issue-views.tsx`,
project issue routes, and user issue routes. Check project/user issue filters,
state tabs, two-column/subtask toggles, mass-update controls, create/edit
fields, hidden `authorId`, due date, assignee/milestone/label/parent selectors,
detail sidebar watch/vote/favorite/share/delete, comments edit/delete/vote,
child comments, timeline rows, sharer panel, `@`/`#` autocomplete,
paste/drop attachments, Markdown preview/source rendering, and REST submit
boundaries.

### `ui-parity-board-milestone`

Audit board and milestone UI parity only. Do not edit files. Legacy evidence:
`board/list.scala.html`, `board/create.scala.html`, `board/edit.scala.html`,
`board/view.scala.html`, `board/partial_comments.scala.html`,
`milestone/list.scala.html`, `milestone/view.scala.html`,
`milestone/create.scala.html`, `milestone/edit.scala.html`, and
`milestone/partial_status.scala.html`. Current evidence:
`frontend/src/routes/-board-views.tsx` and `frontend/src/routes/-milestone-views.tsx`.
Check board list search/sort/label/page, org board aggregate list, create/edit
notice/readmefy/labels/attachments, detail history/watch/labels/comments/child
comments, milestone open/closed/all tabs, sort, empty state, progress/counts,
create/edit validation, detail actions, attachments, and linked issue tabs.

### `ui-parity-code-vcs`

Audit code browser/VCS UI parity only. Do not edit files. Legacy evidence:
`code/view.scala.html`, `code/history.scala.html`, `code/branches.scala.html`,
`code/diff.scala.html`, `code/compare.scala.html`, and code/commit/branch routes.
Current evidence: `frontend/src/routes/-code-views.tsx`, code/commit/compare
routes, `frontend/src/api/code-commits.ts`, and `frontend/src/api/code-branches.ts`.
Check `/code` default branch, no-head Git/SVN state, `#branches`,
`#breadcrumbs`, folder/file rows, `#showCode`, Markdown file rendering,
raw/file/image/download links, commits/path history, commit diff/comment
forms, inline diff comments, compare, branches table, default branch badge, and
set-default/delete enabled/disabled states.

### `ui-parity-pull-request-review`

Audit pull request and review UI parity only. Do not edit files. Legacy
evidence: `git/list.scala.html`, `git/create.scala.html`, `git/edit.scala.html`,
`git/view.scala.html`, `git/viewChanges.scala.html`, and
`reviewthread/list.scala.html`. Current evidence:
`frontend/src/routes/-pull-request-views.tsx`, pull-request routes, and
`frontend/src/api/pull-requests.ts`. Check PR list tabs/search/contributor
filter/empty state, pushed-branch prompt, branch selectors, merge-result block,
edit disabled controls, detail branch info, watch/close/reopen/edit/delete,
reviewer block, review/unreview, accept/conflict/source-branch states,
overview/changes tabs, general comments, commit dropdown, inline comments,
review cards, and review-thread filters/export.

### `ui-parity-search-notification`

Audit search and notification UI parity only. Do not edit files. Legacy
evidence: `search/result.scala.html`, `search/partial_search.scala.html`,
search type partials, `index/notifications.scala.html`,
`index/partial_notifications.scala.html`, and `common/mySeriesMenuTab.scala.html`.
Current evidence: `frontend/src/routes/-search-views.tsx`,
`frontend/src/routes/search/route.tsx`, project/org search routes,
`frontend/src/routes/notifications/route.tsx`, `frontend/src/routes/notification/route.tsx`,
and related API wrappers. Check global/project/org search scopes, bad-request
branches, `#searchInnerForm`, category badges, every result type, snippets,
ACL-filtered private absence, empty state, pagination, notification welcome
guide, `#toggleIntro`, my-series tabs, stream row expand/collapse, empty state,
load-more, and `/notification?from=&limit=` JSON fragment-conversion boundary.

### `ui-parity-site-admin-setup`

Audit site-admin, setup, import, and operator-adjacent UI parity only. Do not
edit files. Legacy evidence: `site/siteMngLayout.scala.html`, site admin view
templates, `welcome/secret.scala.html`, `welcome/restart.scala.html`,
`migration/home.scala.html`, import views, and `conf/routes`. Current evidence:
`frontend/src/routes/sites/$pageName/route.tsx`, `secret/route.tsx`,
`restart/route.tsx`, `migration/route.tsx`, `frontend/src/routes/[_]import/route.tsx`,
and `frontend/src/api/site-admin.ts`. Check non-admin forbidden/admin state,
site sidebar active/update badge, user/project/post/issue lists, mail/mass-mail,
data export/import, update, diagnostic, `/secret` setup-required versus
configured state, `/restart`, `/_import`, and `/migration` deferred/operator
scope classification.

### Historical `ui-parity-public-auth-shell`

Audit public/auth/shell UI parity only. Do not edit files. Compare
`docs/plans/2026-06-24-rc-ux-diff-closure-checklist.md`,
`output/playwright/visual-sweep/latest.json`, `.agent/legacy-html-page-audit/*`,
`SPEC.md` FG-01, and the corresponding frontend tests/routes. Check `/`,
`/users/loginform`, `/users/signupform`, `/lostPassword`, `/_help`, `/secret`,
`/restart`, logged-in `/`, `/user/sidebar?path=%2Fadmin%2Fsample%2Fissue%2F1&hash=comment-7`,
and `/user/usermenuTabContentList`. Report only missing/weak evidence or
confirm coverage.

### Historical `ui-parity-directory-workspace-site-admin`

Audit directory, workspace, and site-admin UI parity only. Do not edit files.
Check `/projects`, `/projectform`, `/_import`, `/orgs`, `/organizations/new`,
`/admin`, `/user/issues`, `/user/issues/new/mine`, `/user/files`,
`/user/editform/**`, and `/sites/**` pages. Use current visual sweep, HTML
audit coverage, RC checklist, frontend tests, and backend contract evidence.
Return missing/weak evidence with proposed disjoint owner files.

### Historical `ui-parity-project-content`

Audit project content UI parity only. Do not edit files. Check
`/admin/sample/**` project home/code/commits/branches, issues, board,
milestones, pull requests/reviews, and project-admin pages. Pay special
attention to Markdown surfaces, direct legacy links, modal shells, filters,
empty/error states, and expected legacy non-2xx behavior. Return missing/weak
evidence with proposed disjoint owner files.

### `ui-parity-fragment-security-db`

Audit fragment conversion, security/stability, and DB/migration smoke evidence
only. Do not edit files. Check that legacy HTML fragment endpoints are
represented as API-return plus React render, XSS/SQLi/pathological Markdown
probes are tied to user-visible pages, Markdown uses ReactMarkdown through the
Yona compatibility renderer, and DB matrix/migration smoke evidence is strong
enough for in-place replacement. Return missing/weak evidence with proposed
owner files.
