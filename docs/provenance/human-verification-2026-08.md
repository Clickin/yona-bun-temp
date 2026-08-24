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

- 2026-08-25 re-audit after `d7eed9a53` found no new LLM-resolvable
  implementation or documentation gap. The differential result remains
  315/315 with I13 as the only product decision; remaining static warnings
  stay explicitly human-review items below.

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

### 2. Live OAuth provider round trip

Deterministic GitHub/Google exchange tests are implemented, but they cannot
prove a real provider account. A human with provider credentials must follow
the procedure in `docs/provenance/auth-deferred-oauth-ldap.md:8` and verify:

- browser authorization completes for the configured provider;
- `/api/v1/workspace` exposes the expected `connectedSocialProviders` value;
- the corresponding `linked_account` row persists with the provider key and
  correct local-user association;
- login, logout, and profile projection work for the same account.

This is explicitly outside the first-priority release blocker criteria.

### 3. Real LDAP directory behavior

Fixture-backed form-login and Smart HTTP/SVN BasicAuth tests pass, and a real
simple bind/search connector exists. A human must validate the deployment's
actual LDAP URL, bind credentials, base DN, filters, TLS/network policy, and
account mapping. Exercise form login plus one Smart HTTP or SVN BasicAuth
request, then verify local provisioning/update, password refresh, guest-prefix
classification, and the configured local fallback. Fixture tests are not
proof that the production directory is reachable or correctly configured.

### 4. Release-environment migration gate

The golden MariaDB adoption gate was verified on 2026-08-24 in the repository
fixture, including preflight, validate-only, adopt, before/after row/VCS/upload
identity, login, page rendering, comment mutation, and attachment bytes. A
release operator must still run `pnpm test:release-gate` in the target Docker,
MariaDB, filesystem, and binary environment and inspect failures rather than
accepting a fixture-only result.

### 5. Browser and visual release proof

A human must inspect the final System Chrome/WTR output against the legacy
instance at the supported desktop and mobile viewports. Confirm that any
remaining screenshot or geometry differences are the documented Yoram identity
or SPA ownership deviations, not an unreviewed layout regression. This check
requires the actual browser, fonts, assets, base path, and legacy server used
for release; a static source review cannot substitute for it.

### 6. External delivery and integration smoke

If enabled in the deployment, a human operator must verify real SMTP delivery
and configured webhook/SCM integration endpoints. Local outbox, mock OAuth, and
fixture-backed LDAP evidence only proves application behavior up to the
configured boundary; it does not prove credentials, DNS, certificates,
firewalls, provider rate limits, or recipient delivery.

### 7. Non-blocking static warnings

The turn hook passes with warnings, not errors. A human should decide whether
to retain the legacy Select2 offscreen input's `aria-hidden="true"` focusable
shape, and whether to schedule cleanup for pre-existing unused imports/helpers,
`this` aliases, and role-vs-semantic-element warnings reported by oxlint.
These are outside the parity-preserving fixes in this turn.

## Completion rule

The LLM-resolvable repository work is complete. Release closure still requires
the human dispositions above, especially I13. Until I13 is either fixture-
aligned and rerun or explicitly approved as an accepted divergence, the
strict differential gate remains blocked by design.
