# Differential Behavior Coverage — v1 Scope Gaps & Follow-up (2026-08-23, rev.3)

Status: current. 2026-08-23 결정으로 기존 deferred 분류는 폐지되었다 — 아래 모든
항목은 **1차 릴리즈 범위에 포함**되며, 상태는 `gap`(미구현)이다. 이 문서는 스윕이
의도적으로 커버하지 않는 행위, deviation으로 의도 제외된 표면, 그리고
mutation-enabled sweep이 발견한 런타임 divergence의 source of truth다.
Companion artifacts: `.agent/differential/behavior-coverage.json`,
`.agent/differential/report.json`, `docs/provenance/behavior-inventory.json`
(immutable B-id inventory).

## 0. Intentional deviations — deliberately removed surfaces (제외 확정)

이 섹션의 행위는 Yoram app runtime에서 **의도적으로 제공하지 않기로 결정된**
표면이다. 스윕이 이 영역의 divergence를 발견해도 패리티 gap이 아니라 deviation이며,
`scripts/differential/report.mjs`의 migrator-scope 규칙이 자동으로 known-gap으로
분류한다. 근거: SPEC.md §"Legacy API 접두사" 결정과
`docs/provenance/legacy-external-api.md`의 implemented/migrator 구분.

- `-_-api/v1/owners/:o/:p/exports` (B-0036) — export는 별도 migrator/export tool
  범위. app route로 추가하지 않는다.
- `-_-api/v1/owners/:o/:p/issues/imports` (B-0214 계열) — 게시글→이슈 변환 import도
  migrator 범위. 스윕은 P17/I18의 boundary probe로 상태 차이만 기록한다.
- `-_-api/v1/owners/:o/:p/projects POST`(bulk import-style 생성) — 동일 migrator
  범위. 일반 프로젝트 생성은 `/api/v1/owners/:o/projects`가 canonical이다.

주의: 위 목록 외의 `-_-api/v1/**` 행(hello, users, users/token, user/issues,
statistics, defultLoginPage, admin/users GET/PATCH, titleHeads, translation,
favorite 3종+토글, assignableUsers/findSharer/share/vote-weight/detectChange,
issues/comments CRUD compat)은 **app-owned implemented**로서 커버 대상이다.
S12–S16 경계 프로브와 I11–I13/I20·I23 프로브가 이들을 검증한다.


## 1. v1 범위 미구현 행위 (gap — 1차 릴리즈 포함 대상)

아래 행위는 1차 릴리즈 범위에 포함된다(2026-08-23 결정). 현재 Yoram이 구현하지
않아 스윕의 안전/도달 가능 범위 밖에 있을 뿐, deferred가 아니라 **열린 gap**이다.
구현되는 즉시 시나리오로 커버해야 한다.


### SVN (5) — v1 범위, Yoram SVN 백엔드 미구현 (gap)
- B-0021 `DELETE /svn/*path`, B-0170 `GET /svn/*path`, B-0294 `POST /svn/*path`,
  B-0314 `PUT /svn/*path`, B-0271 `POST /!svn-fake/sevice/`

### Import / migration / export (6) — v1 범위, 미구현 (gap)
- B-0025 `GET /_import`, B-0200 `POST /_import`, B-0286 `POST /sites/import`
- B-0159 `GET /sites/export` (Yoram exports endpoint returns 403 by design for
  non-migration contexts — v1에서 migrator/export 경로 구현 시 해소)
- B-0127~B-0134 family partially probed read-only in P15/P17; full migration
  surface is a v1 implementation item

### Destructive / irreversible on shared parity state (7)
- B-0001 `DELETE .../pullRequest/:id/deletefrombranch` (deletes the PR's source
  branch — seed branch feature/ui must survive)
- B-0002 `DELETE /:user/:project/code/:branch/` (same)
- B-0019 `DELETE /sites/project/delete/:projectId` (site-admin project purge;
  sample project is shared state)
- B-0225 `POST /:ownerName/:project/clone`, B-0226 `POST /fork` (heavyweight git
  copies; no cleanup path)
- B-0236 `POST /changeVCS` (irreversible VCS switch)
- B-0313 `PUT transfer` acceptance path — request-only probe covers the pair
  (P18); actual ownership transfer would orphan the sample project

### Email-token flows (5) — tokens unreachable without SMTP
- B-0175 `GET /user/email/confirm/:emailId/:token`
- B-0192 `GET /verify/:loginId/:verificationCode`
- B-0275/B-0285 `lostPassword` POST + `resetPassword` POST (single-use emailed
  token)
- B-0154 `GET /resetPassword` (token-parameterized render)

### Git smart-http protocol (2) — binary pack protocol, not HTTP-comparable
- B-0047-adjacent: B-0224 `POST $service<git-upload-pack|git-receive-pack>`,
  plus `info/refs` probe stays error-tolerant in P15

### Misc single-route leftovers
- B-0155 `GET /restricted` (rendered only after an auth denial state the harness
  cannot reach anonymously)
- B-0199 `POST /` (root catch-all form target with no stable semantic)
- B-0287/B-0288 `sites/mail` + `mailList` (mass mail send)
- B-0289 `setAttachmentToUserAvatar` (not trivially reversible)
- B-0295/B-0296 `threads/:id/close|open` (no inventory-discoverable thread id
  source in the parity seed)

B-0193(admin users state PATCH), B-0220(translation), B-0221(defultLoginPage),
B-0222(POST users), B-0223(users/token)는 migrator 제외가 아니라 app-owned
implemented 행으로 확인되어 deferred에서 제외했다. S12–S16 경계 프로브가 이들을
커버한다(2026-08-23).

## 2. Runtime divergences found by the first mutation sweep (follow-up)

53 needs-review violations in `.agent/differential/report.json` are genuine
parity findings from exercising mutations for the first time. Dominant clusters
(each needs its own investigation before classification):

1. **Milestone/post/webhook create→delete chains fail mid-chain** (P8/P9/P10):
   legacy create returns a redirect whose id extraction fails, so the paired
   delete hits a different entity than yoram's. Fix discovery, then re-run.
2. **Project label attach/detach + api-create** (P12/P17): legacy
   `ProjectApp` label routes respond differently from yoram REST
   (`/-_-api/v1/.../labels`); one suffix-tagged issue row remains yoram-only
   (db-issues projection flags it every run).
3. **Watch/unwatch + enroll/cancel + members add/remove** (P11/P13/P16): status
   pairs diverge (legacy 303 redirects vs yoram 200 JSON) — needs the lenient
   pairing treatment ProjectMutation used elsewhere.
4. **Throwaway-project sub-flows** (P18): copyLabels/members/setting/transfer
   diverge inside the throwaway; delete itself succeeded both sides.
5. **Compat API probes** (I13/I18/I22/I23, S10): mix of legacy token-gated 401s
   (documented divergence), yoram missing `/markdown` endpoint, and response-shape
   drift in favoriteProjects/favoriteOrganizations/titleHeads.

## 3. Harness debt (infra-classified, fix before next coverage raise)

- `LegacySession.request`: json support added 2026-08-23; multipart form is
  global for all legacy form POSTs (per-endpoint switch if any handler rejects).
- Id-resolution guards (`whenIds`) exist only in issues.mjs; project/userorg
  mutation chains need the same guard pattern to avoid `/null/` paths.
- `sendRaw`/`pairLenient` helpers are duplicated locally in project.mjs and
  userorg.mjs; promote to `ctx.helpers` when a third copy appears.
