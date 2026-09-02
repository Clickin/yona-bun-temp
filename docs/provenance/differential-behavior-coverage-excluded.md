# Differential Behavior Coverage — Sweep-Excluded Behaviors & Follow-up (2026-08-24, rev.7)

Status: historical/interim evidence. 이 문서는 differential sweep이 자동
비교하지 **않는** 행위와 그 이유를 기록한다. **중요(rev.4 정정): 아래 §1 행위는 대부분 Yoram에 이미 구현되어
있다** — SVN은 `crates/server/src/svn_protocol/*` + `crates/vcs`(svn executable),
git smart-http는 `crates/server/src/smart_http.rs` + git executable, migration/
import는 migrator 도구(`crates/migration`, `crates/yona-migrate`)로 구현돼 있다.
미커버의 원인은 미구현이 아니라 **자동 비교 수단의 부재**(프로토콜 클라이언트,
SMTP 토큰 전달, 공유 시드 상태 보호)다. rev.3의 "미구현(gap)" 표기는 잘못된
것이며 이번 판에서 정정했다. Companion artifacts:
`.agent/differential/behavior-coverage.json`, `.agent/differential/report.json`,
`docs/provenance/behavior-inventory.json` (immutable B-id inventory).

2026-08-23 결정: 기존 deferred 분류는 폐지됐다. 위 행위는 전부 당시
1차 릴리즈 범위로 기록됐으며, 이 artifact는 최종 release 승인이 아니다.
남은 작업은 "기능 구현"이 아니라 **스윕 하네스가 해당 행위를 자동
비교할 수 있게 만드는 것**(예: svn/git 클라이언트 페어 세션, 메일 catch-box,
격리 프로젝트 생성-삭제 라이프사이클)이다.

## 0. Intentional deviations — interim delegated surfaces (최종 제외 아님)

아래는 미구현이 아니라 **SPEC.md 결정에 따라 app runtime이 아니라 migrator
딜리버러블이 소유하는** `-_-api/v1/**` 행이다. migrator 도구 자체는
`crates/migration` + `crates/yona-migrate`로 구현돼 있고 legacy Yona의 실제
`/-_-api/v1` 엔드포인트를 호출한다. 스윕이 이 영역 divergence를 발견하면
패리티 gap이 아니라 당시 ownership deviation으로 기록한다. `scripts/differential/report.mjs`의
migrator-scope 규칙이 `ACCEPTED_DIVERGENCE`로 자동 분류하더라도 이는
interim evidence일 뿐이며, user-visible legacy behavior를 최종 scope에서
제외하거나 일반적인 observable divergence를 승인하지 않는다.

- `-_-api/v1/owners/:o/:p/exports` (B-0036) — export는 migrator/export tool 소유.
  yoram은 `/api/v1/owners/{o}/projects/{p}/exports`를 별도로 서빙한다(P15 확인).
- `-_-api/v1/owners/:o/:p/issues/imports` (B-0214 계열) — 게시글→이슈 변환 import.
  스윕은 P17/I18 boundary probe로 상태 차이만 기록한다.
- `-_-api/v1/owners/:o/:p/projects POST` (bulk import-style 생성) — 일반 프로젝트
  생성은 `/api/v1/owners/:o/projects`가 canonical이다.


## 1. Previously sweep-excluded behaviors — now covered

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

### Email-token flows (5) — covered by SMTP-backed fixtures
- B-0175 is covered by `U23-email-validation-lifecycle`; Yoram's unsupported
  send path remains a recorded known gap.
- B-0275/B-0154 are covered by `S17-lost-password-flow` using per-side reset
  links; B-0285 is covered by `U24-signup-email-verification`.
- B-0192 is covered by `U24-signup-email-verification`: the fixture waits for
  both side-specific signup mails, opens both `/verify/:loginId/:code` links,
  and follows Yoram's SPA-owned REST verification mutation.

### Destructive on shared parity state — throwaway coverage
- B-0002 is covered by `P26-residual-branch-import-probes` as a missing-branch
  direct probe.
- B-0019 is covered by `P24-site-project-purge`; B-0225/B-0226/B-0236 are
  covered by `P23-wave-d-project-destructive`, with generated projects deleted
  and absence checked.
- B-0001 is covered by `R18-throwaway-branch-thread-lifecycle`: the fixture
  creates a unique Git project, pushes `parity-source`, merges the PR, deletes
  only that source branch, verifies `git ls-remote` absence, and removes the
  project. Seeded `feature/ui` is never touched.

### Misc — covered probes
- B-0199 is covered by `P25-empty-root-post`.
- B-0287/B-0288 and B-0303 are covered by `U25-residual-site-user-probes`.
- B-0289 is covered by `U26-avatar-capture-restore` using a deterministic
  offline 1×1 PNG attachment, capture, restore, and attachment cleanup.
- B-0295/B-0296 are covered by `R18-throwaway-branch-thread-lifecycle`, which
  creates a review comment thread, discovers the legacy/Yoram thread ids,
  closes and reopens each thread, and cleans the throwaway PR/project.

## 2. Runtime divergences found by the mutation sweeps (2026-08-23 해소)

The 49 needs-review violations from the first mutation sweep are resolved.
Harness defects fixed in `scripts/differential/` (each verified by probe against
the live instances before the fix):

1. `run.mjs` `stepHelpers.sendRaw` dropped its fetch `headers` (cookies and
   content-type never sent) — root cause of the legacy anonymous-403 and yoram
   415 cascades; promoted to the canonical helper together with `pairLenient`.
2. Body-less yoram mutations (watch/unwatch/enroll/DELETE family) never carried
   the CSRF header; yoram validates CSRF on every session mutation while legacy
   ignores it — fixed in `YoramSession.request`.
3. `YoramSession` now merges session and CSRF cookies after sign-in and after
   every response; `LegacySession` preserves its cookie jar as well.
4. `LegacySession` supports the URL-encoded signup payload required by the
   legacy Play binder; U24 waits for both asynchronous signup mails before
   claiming verification.
5. Legacy PR creation submits the full `refs/heads/*` branch values expected
   by `PullRequest.fetchSourceBranchTo`; R18 falls back to the legacy reviews
   list when the changes page omits the thread markup.
6. Yoram's `/verify/:loginId/:verificationCode` remains SPA-owned; R18/U24
   fixtures translate the browser route to the existing `/api/v1` mutation
   after checking the linked page response.
7. `pairRequest`/`pairLenient` now treat agreed outcomes (including identical
   error statuses) as parity; only disagreement is reported.
The current artifact classified 127
`ACCEPTED_DIVERGENCE` rows and 8 `LEGACY_BUG` rows in
`.agent/differential/report.json` (`sweep-mt6npd2a`, 2026-08-24). The only
blocking row is B-0039/I13 `sharableUsers`; its implementation and focused
empty-query contract are present, but the two sweep fixtures expose different
users, public projects, avatar URLs, and observed ordering. This is a
human fixture/catalog decision, not an automatically safe product patch or
final accepted divergence;
`docs/provenance/human-verification-2026-08.md` records it.

## 3. Harness status

The historical report has no `HARNESS_ERROR`, `INFRA_ERROR`, or `UNVERIFIED`
classification. The historical issue-id, label-residue, SMTP-token, CDP, and
PR-seed items from the previous sweep were resolved or reclassified and are
not open work in that run. Step errors remain separately reported by the runner
and do not reduce the behavior-row count.

Historical artifact summary:

- behavior rows: 315/315 IDs (discovery count, not a product parity percentage);
- violations: 136 (`ACCEPTED_DIVERGENCE` 127, `LEGACY_BUG` 8,
  `PRODUCT_GAP` 1);
- blocking finding in this artifact: B-0039/I13 only;
- database projections compared after teardown: yes;
- step errors: 108, reported separately from findings.

This artifact does not authorize final parity or release closure. Final closure
requires all user-visible deferred/gap work to reach zero and no ordinary
accepted observable divergence to remain under `AGENTS.md` and `SPEC.md`.
