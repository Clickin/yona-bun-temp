# 06) Phase 계획

## Phase -1: refactor temp development

- 목적: REST pivot 이후 기존 임시 개발 내역을 새 canonical SPEC에 맞춰 재기준화한다.
- 신규 기능 phase를 시작하기 전에 완료해야 하는 선행 phase다.
- 구현 상태: `/api/v1` REST JSON + TanStack Query + typed frontend API client 기준으로 기존 application flows가 재기준화되었고, runtime ConnectRPC registration 및 frontend ConnectRPC dependencies는 제거되었다.
- `proto/`는 REST pivot 이전 message schema snapshot으로만 남기며 새 application API contract나 runtime surface로 취급하지 않는다.
- Phase 2/3에서 이미 구현된 issue, label, milestone, organization issue list, user issue list, code browser 흐름은 기능 의미를 유지하되 API/client 경계와 문서/provenance를 REST pivot 기준으로 다시 맞춘다.
- legacy direct form routes, file routes, Git/SVN transport routes, `/-_-api/v1/**` external compatibility routes는 application REST API와 분리해 보존/재구현 여부를 판단한다.
- 종료 조건:
  - `SPEC.md`, `docs/agents/*`, `README.md`, provenance 문서가 REST pivot과 충돌하지 않는다.
  - frontend server state가 TanStack Query provider/client/hook 경계로 이동한다.
  - implemented application flows가 `/api/v1/**` REST endpoint를 통해 동작한다.
  - frontend/server runtime RPC references가 제거되어 있다.
  - Phase 1~3의 기존 parity tests 또는 동등한 REST/route/Playwright tests가 통과한다.

## Phase 0: Rust Pivot 정리

- former Rust pilot 경로를 `repo root` canonical workspace로 승격
- root canonical 문서와 `docs/agents/*` mirror를 Rust 기준으로 재작성
- `docs/provenance/*` owner/target/current baseline을 Rust 기준으로 갱신
- historical 문서에 status banner와 Rust pivot 이후 설명 추가

## Phase 1: 신원과 핵심 소유권

- auth
- workspace
- organization
- project

## Phase 2: 이슈 추적

- Phase 2A complete: issue CRUD, comments, state mutation, watch/vote/assignee, mass update, Markdown rendering, and issue/comment attachment binding on Rust canonical stack.
- Phase 2B complete: project issue label/category management screens, REST CRUD, legacy direct label/category routes, and label CSS.
- Phase 2C complete: milestone management screens/REST CRUD, legacy direct mutation routes, state toggles, issue aggregation, Markdown description rendering, and milestone attachment binding.
- Phase 2E complete: core issue sharer read/comment ACL, REST share/unshare by login ID, and issue detail sharer sidebar controls.
- Phase 2F complete: organization issue listing body parity with visible-project aggregation, core filters, and organization shell route.
- Phase 2G complete: favorite issue toggle/detail projection and `/user/issues` personal aggregate list with assigned/authored/commented/mentioned/shared/favorite quick filters.
- Phase 2H complete: REST issue comment vote/unvote, legacy direct comment-vote POST route compatibility, comment voter projection, issue detail comment-row controls, and direct/inherited sharer ACL coverage.
- Phase 2J complete: issue detail assignee autocomplete/search over `/api/v1/owners/:owner/projects/:project/issues/:number/assignable-users`, with legacy visibility rules, current-assignee inclusion, and existing assignment mutation fallback.
- Phase 2K complete: issue create/edit assignee autocomplete/search over `/api/v1/owners/:owner/projects/:project/assignable-users`, with project-scoped visibility rules and unchanged create/update assignment mutation semantics.
- Phase 2L complete: issue sharable-user search over `/api/v1/owners/:owner/projects/:project/issues/:number/sharable-users`, direct sharer timeline/notification row side effects, and issue/comment `@user`/`@org`/`@owner/project` mention indexing, suggestions, and notification rows.
- Phase 2M complete: issue reference `#issue` autocomplete over `/api/v1/owners/:owner/projects/:project/issue-references`, with project read ACL, readable fork-origin issue search, exact-number-first ordering, and create/edit/detail/comment textarea insertion.
- Phase 2N complete: notification inbox/list over `/api/v1/notifications`, legacy `/notification` route body, notification mail queue staging/drain helper, and project-target issue sharer mutation by public project member expansion.
- Phase 6 label copy complete: `POST /api/v1/owners/:owner/projects/:project/labels/copy` and legacy direct `POST /:owner/:project/copyLabels` copy readable source project labels into an updatable target while reusing duplicate labels/categories.
- Remaining Phase 2 packets: notification read state/full SMTP batching and group sharer mutation if legacy evidence requires it. Legacy external `/-_-api/v1/**` compatibility is no longer an app Phase 2 packet; it belongs to a separate migrator/export/import deliverable.

## Phase 1 closeout follow-ups

- Public user profile route complete: `GET /api/v1/users/:loginId/profile` and `/:user` restore the legacy `UserApp.userInfo` single-segment profile shell with user card, Issues / Pull Requests / Projects tabs, visible member-project list, organization-name redirect, not-found handling, and viewer READ ACL filtering while keeping `/me` as the current-user workspace shortcut.
- User statistics counts complete: `GET /api/v1/users/:loginId/statistics` restores the legacy authenticated `UserApi.statistics` count fields for authored issues/postings, assigned issues, authored comments, and issue/comment votes without adding `/-_-api/v1/**` app-server compatibility.
- Project member management complete: `GET/POST/PATCH/DELETE /api/v1/owners/:owner/projects/:project/members` and `/:owner/:project/members` restore the legacy UPDATE-gated members page, add/member role/delete/self-leave flows, enrollment cleanup, member-accept notification/mail staging, owner guards, and `project/members.scala.html` class anchors.
- Project watchers page complete: `GET /api/v1/owners/:owner/projects/:project/watchers` and `/:owner/:project/watchers` list actual project watchers behind project READ ACL with legacy `project/watchers.scala.html` class anchors.
- Project delete confirmation complete: `DELETE /api/v1/owners/:owner/projects/:project` and `/:owner/:project/deleteform` restore the legacy UPDATE-gated delete confirmation shell, dependent project-row cleanup, bare Git repository removal, and `/` redirect semantics from `ProjectApp.deleteProject` / `project/delete.scala.html`.

## Phase 3: 저장소와 VCS

- Phase 3A complete: read-only Git code browser with existing repo detection, no-head state, branch selector, breadcrumbs, folder entries, and text file view.
- Phase 3B complete: legacy direct Git blob file surfaces for `rawcode`, `files`, and `image`, reusing code read ACL/menu visibility, safe repo path validation, MIME response shaping, and code view Raw/Open/image/download anchors.
- Phase 3C complete: legacy branch archive download at `/:owner/:project/code/:branch/download`, reusing code read ACL/menu visibility, Git revision validation, zip response shaping, and the code view Download anchor.
- Phase 3D complete: text file view renders legacy-style numbered code lines with dependency-free syntax token spans while preserving the `#showCode`/`.code-wrap` anchors.
- Phase 3E complete: commit history parity over `GET /api/v1/projects/:owner/:project/commits` and legacy file routes `/:owner/:project/commits`, `/:owner/:project/commits/:branch/`, and `/:owner/:project/commits/:branch/*path`, including branch selector, path breadcrumbs, 25-item pagination, commit links, and path-scoped "show code" links.
- Phase 3F complete: read-only commit detail/diff parity over `GET /api/v1/projects/:owner/:project/commit/:id` and legacy route `/:owner/:project/commit/:id`, including commit metadata, first-parent link metadata, branch/path list-back state, unified diff patches, missing-commit 404, and legacy `code/diff.scala.html` class/id anchors.
- Phase 3G complete: read-only compare parity over `GET /api/v1/projects/:owner/:project/compare/:revA..:revB` and legacy route `/:owner/:project/compare/:revA..:revB`, including both commit projections, missing-revision 404, unified diff patches, empty-diff state, and legacy `code/compare.scala.html` class/id anchors.
- Phase 3H complete: branch management parity over `GET /api/v1/projects/:owner/:project/branches`, `POST /api/v1/projects/:owner/:project/branches/default`, and `DELETE /api/v1/projects/:owner/:project/branches`, including legacy `branches.scala.html` table anchors, default branch first, branch-row latest PR links, non-default delete, project update permission, and real Git `HEAD` mutation.
- Phase 3I complete: Git commit discussion parity over `GET/POST/DELETE /api/v1/projects/:owner/:project/commit/:id/comments` and `POST /api/v1/projects/:owner/:project/commit/:id/threads/:threadId/open|close`, including non-ranged commit comments, replies, author/moderator delete, thread cards, thread state changes, comment counts, event rows, and notification-mail staging.
- Phase 3J complete: project creation provisions the legacy default Git repository at `YONA_DATA/repo/<project_id>.git`, stores `vcs = GIT`, and returns the existing no-head code-browser state for the empty bare repository.
- Remaining Phase 3 follow-ups: Smart HTTP, inline ranged code-comment UX, and SVN wrapper integration.

## Phase 4: 풀 리퀘스트와 리뷰

- Phase 4A complete: PR/Review read surface parity over `/api/v1` REST for project open/closed/sent PR lists, PR detail, PR changes, project reviews, and organization open/closed PR lists. Read ACL combines project READ with code-accessible-member-only visibility; missing Git repo/HEAD returns an empty changes diff instead of a synthetic diff. Frontend routes use typed PR REST query options and TanStack Query. Verification: `pull_request_read_contract`, frontend unit/check/build, and `pull-request-review-read-parity.e2e.ts`.
- Phase 4B complete: PR interaction surface parity over app runtime `/api/v1` REST for create/edit form-options, create/edit mutation, close/reopen, review/unreview, general PR review comment creation, and review thread open/close. Frontend create/edit routes replace placeholders with legacy class/id anchors and TanStack Query mutations. Verification: `pull_request_mutation_contract`, frontend unit/check/build, and `pull-request-interaction-parity.e2e.ts`.
- Phase 4C+ deferred: merge/conflict acceptance, ranged inline review comment edit/delete, reviewer assignment/threshold lifecycle, watch mutation if legacy evidence requires a separate PR watch surface, fork/clone, from branch delete/restore, Smart HTTP/VCS lifecycle, remaining merge/commit-changed/push webhook delivery, and legacy external `/-_-api/v1/**` compatibility for migrator scope.
- Progress checkpoint after Phase 5A baseline and Phase 4A read surface: full legacy parity ~42%, current first-priority conversion scope ~49%, mechanical SPEC row count ~33%.

## Phase 5: 검색, 보드, 알림, 연동

- Phase 5B complete: Board/Posting core parity over `/api/v1/**`, including project post list/detail/create/edit/delete, comments, labels, notice pinning, DB-backed README rendering, watch toggle, notification target resolution for posting resources, organization board aggregation, and dedicated `board-posting-parity.e2e.ts`.
- Phase 5C complete: Search app surface parity over `/api/v1/**`, including global, project, and organization search; legacy search tabs/classes; fixed page size 20; `auto` search type resolution; counts, snippets, highlighting metadata, pagination, project-scope project-type rejection, and ACL-aware result filtering for issue/user/project/post/milestone/issue-comment/post-comment/review result types.
- Phase 5D partial: Project webhook CRUD parity over `/api/v1/**`, including UPDATE-gated `/:owner/:project/webhooks`, legacy `webhook-editor-wrap` / form/list anchors, payload URL/secret/type/gitPush persistence, and create/delete mutations. Delivery slices now fan out issue create/comment plus PR create/review/unreview/review-comment events to non-JSON webhooks with the legacy text payload, token secret header, and test/dev webhook outbox capture. Push JSON, PR merge/commit-changed delivery, HTTPS production delivery hardening, optional signature compatibility, and delivery history/retry remain follow-ups.
- Phase 5E partial: Project transfer request/accept parity over `/api/v1/**` plus the legacy accept link. `/:owner/:project/transfer` preserves the legacy checkbox/modal shell, transfer requests persist `project_transfer` rows, send transfer request mail via the existing outbound mail integration, `/project/transfer/:id/:key` accepts for the destination user/org admin/site admin, moves owner/name, preserves previous owner/name lookup aliases, and updates sender/destination project membership. Repository owner/name path move is not required because Rust Git storage is ID-based at `YONA_DATA/repo/<project_id>.git`; Smart HTTP clone URL/update behavior remains a VCS lifecycle follow-up.
- Phase 5F complete: Project statistics route parity mounts `/:owner/:project/statistics`, reads the normal project container, and preserves the legacy `project/statistics.scala.html` under-construction shell with `.page-wrap-outer`, `.project-page-wrap`, and `Under Construction`. Computed statistics are not added because legacy Yona did not render them.
- Remaining board follow-ups: Git-backed README commit/sync, issue template edit, online code file edit, and legacy external `/-_-api/v1/**` compatibility for migrator scope.
- Remaining search follow-ups: full-text/index-backed search, ranking beyond legacy sort, async indexing, and legacy external `/-_-api/v1/**` search compatibility only if the separate migrator/export scope requires it.
- notifications
- integrations follow-ups: push JSON webhook payload delivery, PR merge/commit-changed delivery, HTTPS production delivery hardening, optional signature compatibility if external evidence requires it, and delivery history/retry behavior

## Phase 6: 관리자 기능과 하드닝

- Phase 6A partial: Site-admin management parity over `/sites/userList`, `/sites/projectList`, `/sites/postList`, `/sites/issueList`, `/sites/mail`, `/sites/massmail`, `/sites/diagnostic`, `/api/v1/site/users`, `/api/v1/site/projects`, `/api/v1/site/posts`, `/api/v1/site/issues`, `/api/v1/site/mail`, `/api/v1/site/mail/test`, `/api/v1/site/mail-list`, and `/api/v1/site/diagnostics`, including site-admin-only access, legacy user state buckets, user/project query search, 30-item pagination, site-admin role toggle, account lock/unlock, guest-mode toggle, site-manager password reset, user deletion with the only-manager guard, project deletion, read-only site-wide posting list, read-only site-wide issue list with `open`/`closed` tabs, mail configuration error projection, SMTP test-mail delivery via the existing outbound mail integration, mass-mail recipient lookup/mailto shell, and legacy diagnostics no-error/error-list shell. Update check and data import/export remain deferred follow-up scope.
- migration tooling
- deployment hardening
- remaining deferred scope review

## Phase Gate 규칙

- phase 종료 기준은 UI completeness가 아니라 legacy parity와 provenance completeness다.
- 같은 Phase에 남은 `gap`은 phase 종료 blocker다.
- phase를 종료하려면 해당 기능을 구현하거나, 이후 Phase/deferred로 재분류하고 root canonical 문서, provenance, phase plan에 사유를 남긴다.
- 누락 기능은 재분류된 phase의 follow-up item으로 남겨야 한다.
