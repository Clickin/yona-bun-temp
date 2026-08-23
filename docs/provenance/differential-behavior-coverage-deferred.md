# Differential Behavior Coverage — Deferred & Follow-up (2026-08-23)

Status: current. Source of truth for what the differential sweep deliberately does
NOT cover, and the runtime divergences surfaced by the first mutation-enabled
sweep. Companion artifacts: `.agent/differential/behavior-coverage.json`
(281/315 = 89.2% covered), `.agent/differential/report.json` (violations +
classifications), `docs/provenance/behavior-inventory.json` (immutable B-id
inventory).

## 1. Deferred behaviors (34 uncovered B-ids)

These are outside the sweep's safe/reachable envelope. Classification per
AGENTS.md: deferred scope; none may be counted as "covered" until Yoram
implements them or a safe harness strategy exists.

### SVN (5) — 2순위 deferred, Yoram has no SVN backend
- B-0021 `DELETE /svn/*path`, B-0170 `GET /svn/*path`, B-0294 `POST /svn/*path`,
  B-0314 `PUT /svn/*path`, B-0271 `POST /!svn-fake/sevice/`

### Import / migration / export (6) — 2순위 deferred
- B-0025 `GET /_import`, B-0200 `POST /_import`, B-0286 `POST /sites/import`
- B-0159 `GET /sites/export` (Yoram exports endpoint returns 403 by design for
  non-migration contexts)
- B-0127~B-0134 family partially probed read-only in P15/P17; full migration
  surface deferred

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

### Misc single-route leftovers (9)
- B-0155 `GET /restricted` (rendered only after an auth denial state the harness
  cannot reach anonymously)
- B-0193 `PATCH /-_-api/v1/admin/users/:user` (site-admin API user mutation;
  risky against the seeded admin)
- B-0199 `POST /` (root catch-all form target with no stable semantic)
- B-0220 `POST /-_-api/v1/translation`, B-0221 `defultLoginPage` (yoram route
  existence unconfirmed at write time)
- B-0222 `POST /-_-api/v1/users` (API user creation; overlaps signup lifecycle,
  left for token-API wave)
- B-0223 `POST /-_-api/v1/users/token` (creates a persistent admin API token)
- B-0287/B-0288 `sites/mail` + `mailList` (mass mail send)
- B-0289 `setAttachmentToUserAvatar` (not trivially reversible)
- B-0295/B-0296 `threads/:id/close|open` (no inventory-discoverable thread id
  source in the parity seed)

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
