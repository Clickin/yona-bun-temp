# Differential Behavior Coverage — Sweep-Excluded Behaviors & Follow-up (2026-08-23, rev.5)

Status: current. 이 문서는 differential sweep이 자동 비교하지 **않는** 행위와 그
이유를 기록한다. **중요(rev.4 정정): 아래 §1 행위는 대부분 Yoram에 이미 구현되어
있다** — SVN은 `crates/server/src/svn_protocol/*` + `crates/vcs`(svn executable),
git smart-http는 `crates/server/src/smart_http.rs` + git executable, migration/
import는 migrator 도구(`crates/migration`, `crates/yona-migrate`)로 구현돼 있다.
미커버의 원인은 미구현이 아니라 **자동 비교 수단의 부재**(프로토콜 클라이언트,
SMTP 토큰 전달, 공유 시드 상태 보호)다. rev.3의 "미구현(gap)" 표기는 잘못된
것이며 이번 판에서 정정했다. Companion artifacts:
`.agent/differential/behavior-coverage.json`, `.agent/differential/report.json`,
`docs/provenance/behavior-inventory.json` (immutable B-id inventory).

2026-08-23 결정: 기존 deferred 분류는 폐지됐다. 위 행위는 전부 1차 릴리즈
범위이며, 남은 작업은 "기능 구현"이 아니라 **스윕 하네스가 해당 행위를 자동
비교할 수 있게 만드는 것**(예: svn/git 클라이언트 페어 세션, 메일 catch-box,
격리 프로젝트 생성-삭제 라이프사이클)이다.

## 0. Intentional deviations — deliberately delegated surfaces (제외 확정)

아래는 미구현이 아니라 **SPEC.md 결정에 따라 app runtime이 아니라 migrator
딜리버러블이 소유하는** `-_-api/v1/**` 행이다. migrator 도구 자체는
`crates/migration` + `crates/yona-migrate`로 구현돼 있고 legacy Yona의 실제
`/-_-api/v1` 엔드포인트를 호출한다. 스윕이 이 영역 divergence를 발견하면
패리티 gap이 아니라 deviation이며, `scripts/differential/report.mjs`의
migrator-scope 규칙이 known-gap으로 자동 분류한다.

- `-_-api/v1/owners/:o/:p/exports` (B-0036) — export는 migrator/export tool 소유.
  yoram은 `/api/v1/owners/{o}/projects/{p}/exports`를 별도로 서빙한다(P15 확인).
- `-_-api/v1/owners/:o/:p/issues/imports` (B-0214 계열) — 게시글→이슈 변환 import.
  스윕은 P17/I18 boundary probe로 상태 차이만 기록한다.
- `-_-api/v1/owners/:o/:p/projects POST` (bulk import-style 생성) — 일반 프로젝트
  생성은 `/api/v1/owners/:o/projects`가 canonical이다.

주의: 위 목록 외의 `-_-api/v1/**` 행(hello, users, users/token, user/issues,
statistics, defultLoginPage, admin/users GET/PATCH, titleHeads, translation,
favorite 3종+토글, assignableUsers/findSharer/share/vote-weight/detectChange,
issues/comments CRUD compat)은 app-owned implemented이며 S12–S16 경계 프로브와
I11–I13/I20·I23 프로브가 검증한다.

## 1. Sweep-excluded behaviors (구현됨 — 스윕 자동 비교 미포함)

### SVN protocol (5) — covered by `P22-svn-client-pair`
- B-0021/B-0170/B-0294/B-0314 (`/svn/*path`) and B-0271
  (`/!svn-fake/sevice/`) are driven through real `svn 1.14.5` checkout +
  commit sessions against both instances. Commit log message state matches;
  Yoram's missing `<author>` XML field is documented as a known divergence.

### Git smart-http (2) — covered by `R17-git-client-pair`
- Real `git clone --depth 50` + identical commit + push runs against both
  throwaway projects; post-push refs match after ignoring the optional HEAD
  symref line. No client execution errors in the final sweep.

### Migration / import / export pages — invalid-boundary probes covered
- B-0025/B-0200 are covered by `P26-residual-branch-import-probes`.
- B-0286 and B-0159 are covered by `U25-residual-site-user-probes`.
- Probes intentionally submit empty/invalid payloads; no import state is written.

### Email-token flows (5) — four covered, one safely deferred
- B-0175 is covered by `U23-email-validation-lifecycle` when the legacy
  confirmation mail is available; Yoram's unsupported send path is recorded.
- B-0275/B-0154 are covered by `S17-lost-password-flow` using per-side SMTP
  reset links; B-0285 is covered by `U24-signup-email-verification` for the
  throwaway credential.
- B-0192 remains uncovered: neither instance emitted a deterministic signup
  verification mail in the final run; U24 records the skip rather than
  claiming `UserApp.verifyUser`.

### Destructive on shared parity state — throwaway coverage
- B-0002 is covered by `P26-residual-branch-import-probes` as a missing-branch
  direct probe.
- B-0019 is covered by `P24-site-project-purge`; B-0225/B-0226/B-0236 are
  covered by `P23-wave-d-project-destructive`, with generated projects deleted
  and absence checked.
- B-0001 remains uncovered: deleting `feature/ui` would mutate the protected
  seeded PR branch; the harness deliberately skips it.

### Misc — covered probes and explicit skips
- B-0199 is covered by `P25-empty-root-post`.
- B-0287/B-0288 and B-0303 are covered by `U25-residual-site-user-probes`.
- B-0289 remains uncovered: no valid image attachment/current-avatar pair was
  available for a reversible capture-set-restore.
- B-0295/B-0296 remain uncovered: no deterministic notification thread id was
  discoverable without manufacturing an unverified notification chain.

## 2. Runtime divergences found by the mutation sweeps (2026-08-23 해소)

The 49 needs-review violations from the first mutation sweep are resolved.
Harness defects fixed in `scripts/differential/` (each verified by probe against
the live instances before the fix):

1. `run.mjs` `stepHelpers.sendRaw` dropped its fetch `headers` (cookies and
   content-type never sent) — root cause of the legacy anonymous-403 and yoram
   415 cascades; promoted to the canonical helper together with `pairLenient`.
2. Body-less yoram mutations (watch/unwatch/enroll/DELETE family) never carried
   the CSRF header; yoram validates CSRF on every session mutation while legacy
   ignores it — the single largest 403 cluster (~25 violations).
3. `LegacySession.request` replaced the cookie jar on every Set-Cookie, so a
   flash-only response wiped PLAY_SESSION mid-scenario; now merges.
4. Legacy payload ground-truth (probed, not guessed): milestone create/edit
   requires `{title, contents, state, dueDate:""}` (Play binds java Date via
   request locale — ISO strings fail binding); board post requires the hidden
   `issueTemplate` field (NPE at BoardApp.newPost otherwise); post comments bind
   `contents`, not `body`; project-label attach/detach binds urlencoded only;
   issue-label category create requires `project.id`.
5. Webhook id discovery matches the `data-webhook-id` row carrying this run's
   payload-url suffix instead of max-id (earlier sweeps left rows behind).
6. `pairRequest`/`pairLenient` now treat agreed outcomes (including identical
   error statuses) as parity; only disagreement is reported.

Remaining classified divergences live in `report.mjs` CLASSIFICATION_RULES with
per-rule reasons (markdown render gap, review-point authorization, commit
pseudo-ref shape, org/favorites/user-email compat surface, SPA-shell auth pages,
OAuth deferral, label-category rename/delete divergence, comment PATCH
optimistic-lock drift, trailing-slash attachment route).

## 3. Harness debt (remaining)

- `issues.mjs` issue chains still report infra id-resolution failures when the
  shared seed issue number does not resolve (`/issue/null/delete` family);
  same `whenIds` treatment as the label/category chains is the follow-up.
- db-labels projection stays unfiltered by run tag (labels treated as seed
  data); sweep-created label rows therefore remain classified known-gap diffs.

Final Wave 2 artifact evidence: `.agent/differential/report.json` and
`behavior-coverage.json` report 310/315 unique behaviors, `needs-review = 0`,
17 SMTP `.eml` files were captured, and the five uncovered IDs are explicitly
documented above (B-0001, B-0192, B-0289, B-0295, B-0296).
