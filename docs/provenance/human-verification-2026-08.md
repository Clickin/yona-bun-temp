# Human Verification — 2026-08 Differential and Release Follow-up

Status: current. This document lists checks that require a product owner,
credentials, or a release environment. It is not an unimplemented-feature list.

## LLM processing completed

- Reconciled `docs/provenance/release-triage-2026-08.md` with the current
  differential artifact `sweep-mt6npd2a`.
- Reconciled `docs/provenance/differential-behavior-coverage-excluded.md` with
  the same artifact and removed stale harness/P9/U16/markdown claims.
- Updated `scripts/differential/report.mjs` so fixed P9, U16, and empty-query
  behavior descriptions are regression rules, not claims about the current
  implementation. Removed duplicate stale sharer/PATCH rules.
- Confirmed the focused implementation evidence for P9, U16, I13, and client
  markdown preview. No safe product patch remains for the current differential
  result.
- The requester reports that the live OAuth round trip is complete. The deterministic GitHub/Google callback, linked-account, session, and profile tests remain as regression coverage; OAuth is no longer a required human check.
- Corrected `docs/provenance/release-triage-2026-08.md` to identify the actual
  current HEAD (`189ec2479`). The later commit contains only confirmed unused
  frontend-code cleanup plus provenance updates, so the existing differential
  result remains behaviorally applicable.
- Re-audited the active Buffa-removal plan; its generated types, protobuf
  dependencies, and imports are already removed. Marked
  `docs/agents/buffa-removal-frontend.md` resolved instead of leaving a false
  open queue.
- Fixed the remaining frontend type/check issues: the milestone Markdown
  wrapper prop, legacy issue sort attributes, commit-link search defaults,
  and the stale rebrand assertion.
- Fixed the DOM-lane fixture read and deferred live-mirror skip handling.
  Frontend verification now reports **210 test files / 243 tests passed**;
  the live mirror at `192.168.45.20:9000` was unavailable, so the two
  mirror-dependent issue-detail checks were intentionally bypassed by the
  existing skip contract rather than treated as parity evidence.

- Reclassified the stale 2026-06-28 UI parity queues/source-pass ledgers as
  superseded; their open checkboxes are historical, not active LLM tasks.

- 2026-08-24 documentation re-audit marked the stale July template-first,
  frontend-closure orchestration, and Stage A closure-matrix documents as
  superseded. Their open rows and old TypeScript diagnostic snapshot are
  historical inventory, not current LLM work. The active frontend execution
  and evidence sources are now the DOM-Parity Fast Lane, the Scala-HTML goal
  audit, and this human-verification document.

- 2026-08-24 re-audit also retired the stale RC UX checklist status, the
  2026-06-27 coordination plan, the template-first `/goal` paste directive,
  the StyleX internal active-status markers, and the 2026-07-30 gap inventory.
  Current implementation evidence shows the previously listed Code Browser
  tags/blame/compare/archive gaps are implemented; no code patch was warranted.
- SVN protocol handlers intentionally return a `NOT_IMPLEMENTED` fallback when
  the external `svnlook`/SVN tooling is unavailable. This is a release
  environment prerequisite, not an unimplemented protocol slice; verify the
  required `svn`, `svnadmin`, and `svnlook` executables in the target
  environment.

- The persistence-repository and server-route module-diet plans were reconciled
  as completed execution summaries; their historical verification logs contain
  no active LLM work queue.

- The runtime-config DI inventory is now explicitly marked as a completed
  inventory: every queue row is `done`, and the remaining environment reads are
  documented startup/test-tool boundaries rather than an active LLM queue.

- The WTR migration plan is now marked complete: all 858 Playwright specs have
  WTR copies and the gate cutover is recorded. The documented full-suite state
  remains 2,449 passed / 637 failed / 1 skipped; human release review must
  distinguish the listed CSS pseudo-state, dev/dist geometry, retained-class,
  transient-navigation, and mirror-environment buckets from real regressions.

- Fresh-build focused WTR verification of 12 files reached **234 passing / 19
  failing**. Failures are dominated by the mocked `Loading...` usermenu shell
  and missing legacy image fixtures. The profile lane also exposes one
  connected-provider-logo fixture/data-path mismatch and a stale source
  assertion expecting the removed `ConnectedSocialProviderLogo` symbol; no
  test-only patch was retained because the Scala HTML goal guard requires a
  paired screen implementation change for frontend parity evidence.
- Production build passes. Its existing warnings are retained for human
  review: the frozen `:selected` pseudo-class, unresolved legacy asset URLs,
  and the large generated chunk.

- 2026-08-24 follow-up re-audit at `8f3c8bf20` found no new
  LLM-resolvable implementation or documentation queue. The remaining active
  plans are the approved Scala-HTML frontend workflow, DOM-Parity Fast Lane,
  differential verification plan, and RC/deferred release boundaries.

## Required human decisions and environment checks

### 1. I13 / B-0039 sharable-user catalog decision — release blocker

Current artifact: `.agent/differential/report.json`, run
`sweep-mt6npd2a` (2026-08-24). Coverage is 315/315; this is the only
`PRODUCT_GAP` row.

The legacy pair returns `carol`, `alice`, `admin`, and public projects such as
`admin/svnplayground` and `alice/sample`. The Yoram pair returns the same
implemented candidate categories but has a different persisted catalog,
including `bob`, a sweep throwaway user, `pilot/yona`, `admin/sample`, and other
sweep-created projects. Avatar URLs and the observed no-`ORDER BY` ordering also
differ.

The implementation already matches the legacy filter intent:

- legacy: `yona-original/app/controllers/IssueApi.java:828-850`;
- Yoram: `crates/persistence/src/repo/issue_picker.rs:353-409`;
- focused empty-query contract:
  `crates/server/tests/issue_sharer_contract.rs:269-357`.

A human must choose one disposition:

1. **Align parity fixtures/catalog (recommended):** reconcile the users,
   public projects, avatar inputs, and ordering assumptions, then rerun the
   dual-app sweep.
2. **Approve the fixture-dependent difference:** classify B-0039 as an
   accepted divergence and record the product-owner rationale.
3. **Request a product change:** only after a controlled fixture with identical
   catalogs proves that the candidate filter or ordering is wrong.

Do not change candidate filtering based on the current mismatched catalogs.


### 2. Real LDAP directory behavior

Fixture-backed form-login and Smart HTTP/SVN BasicAuth tests pass, and a real
simple bind/search connector exists. A human must validate the deployment's
actual LDAP URL, bind credentials, base DN, filters, TLS/network policy, and
account mapping. Exercise form login plus one Smart HTTP or SVN BasicAuth
request, then verify local provisioning/update, password refresh, guest-prefix
classification, and the configured local fallback. Fixture tests are not
proof that the production directory is reachable or correctly configured.

### 3. Release-environment migration gate

The golden MariaDB adoption gate was verified on 2026-08-24 in the repository
fixture, including preflight, validate-only, adopt, before/after row/VCS/upload
identity, login, page rendering, comment mutation, and attachment bytes. A
release operator must still run `pnpm test:release-gate` in the target Docker,
MariaDB, filesystem, and binary environment and inspect failures rather than
accepting a fixture-only result.

### 4. Browser and visual release proof

A human must inspect the final System Chrome/WTR output against the legacy
instance at the supported desktop and mobile viewports. Confirm that any
remaining screenshot or geometry differences are the documented Yoram identity
or SPA ownership deviations, not an unreviewed layout regression. This check
requires the actual browser, fonts, assets, base path, and legacy server used
for release; a static source review cannot substitute for it.

### 5. External delivery and integration smoke

If enabled in the deployment, a human operator must verify real SMTP delivery
and configured webhook/SCM integration endpoints. The repository's outbox and
fixture-backed integration tests are machine-verifiable; they prove application
behavior up to the configured boundary, not credentials, DNS, certificates,
firewalls, provider rate limits, or recipient delivery.

### 6. SVN release environment

The SVN protocol contract is covered by executable-backed tests when
`svn`, `svnadmin`, and `svnlook` are available. A release operator must verify
those executables in the target environment; their absence intentionally
produces the documented `NOT_IMPLEMENTED` fallback.

### 7. Non-blocking static warnings

The turn hook passes with warnings, not errors. A human should decide whether
to retain the legacy Select2 offscreen input's `aria-hidden="true"` focusable
shape, and whether to schedule cleanup for the remaining `this` aliases and
role-vs-semantic-element warnings reported by oxlint. Unused imports/helpers
found in the previous audit were removed in the current cleanup.
These are outside the parity-preserving fixes in this turn.

## Completion rule

The LLM-resolvable repository work is complete. Release closure still requires
the human dispositions above, especially I13. Until I13 is either fixture-
aligned and rerun or explicitly approved as an accepted divergence, the
strict differential gate remains blocked by design.
