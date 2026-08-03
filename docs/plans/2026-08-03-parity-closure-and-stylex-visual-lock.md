# Parity Closure + DOM/CSS-Property-Based StyleX Visual Lock (2026-08-03)

Status: draft — handoff plan for a fresh agent context.

## PROMPT (fresh-context handoff block)

> You are working in the Yona-to-Rust conversion repo (`/Users/senghyunjo/github/yona-bun-temp`).
> Read `AGENTS.md` and `SPEC.md` first; `yona-original/` (Java/Play legacy) is the
> feature/UX source of truth; functional parity is the only goal — do not propose
> new structure or "improvements".
>
> Execute `docs/plans/2026-08-03-parity-closure-and-stylex-visual-lock.md` in order:
>
> 1. **Fix the pre-existing server contract test failures** (each was verified to
>    fail identically on clean HEAD; do not re-litigate — fix them):
>    - `issue_core_contract_creates_reads_updates_and_deletes_over_rest` — gravatar
>      assertion expects `d=identicon`; the implementation intentionally uses the
>      legacy ko.gravatar default image (pinned by the
>      `gravatar_uses_the_legacy_yona_default_avatar` unit test). Update the
>      assertion to the legacy default URL shape.
>    - `rest_project_issue_list_exposes_legacy_row_payload_fields` —
>      `dueDateOverdue` is asserted `false` against the hardcoded fixture date
>      2026-08-01, which is now in the past. Make the fixture date relative
>      (e.g. `now + 1 day`) and re-assert.
>    - `rest_label_routes_manage_labels_and_categories` — fixture label-name
>      mismatch ("LegacyFeature" vs "Bug"); align the fixture with the assertion.
>    - `rest_project_routes_cover_directory_views_and_mutations` — "legacy owner
>      user" assertion; fix per the legacy route contract.
>    - `assets_contract` (2) — messages JS content assertion and
>      `/yona/sites/mail` 401-vs-200; fix the stale assertions or the routing
>      regression, whichever the legacy contract demands.
>    - Do NOT chase the notification/webhook mail-timing flakes in this pass;
>      record them in the plan's follow-up section.
> 2. **Fix the pre-existing e2e failures** (same evidence basis):
>    - `stylex-project-issues-pagination.e2e.ts` runtime footer test — see
>      Workstream 3 (footer parity decision).
>    - `project-issues-empty.e2e.ts` — DOM class-order assertions
>      (`issue-label active label static` vs expected `label issue-label active
>      static`) and the suite hang; fix the component class composition to match
>      the legacy template order, and find/fix the hang.
>    - `project-issues-real-instance-parity.e2e.ts` — `[data-stylex-content-ready="true"]`
>      marker never appears; fix the marker emission (it is the StyleX
>      content-ready contract for the issues route).
> 3. **Footer/GNB 100% legacy parity** (Workstream 3 below): keep the legacy
>    footer (Yona authors / NAVER Corp / NAVER LABS / NAVER CLOUD PLATFORM) and
>    make the `개발팀에 문의하기` (feedback) GNB link always appear with the
>    legacy default URL `https://github.com/yona-projects/yona/issues`, mirroring
>    `yona-original/conf/application.conf.default:174`. Do NOT rebrand anything.
> 4. **StyleX visual lock, DOM/CSS-property-based** (Workstream 4 below): the
>    final StyleX verification gate MUST be deterministic DOM + computed-CSS +
>    geometry assertions (Playwright `getComputedStyle`/bounding boxes/DOM
>    identity), NOT screenshot diffing. Screenshots may remain only as
>    non-gating artifacts. Reuse the repo's existing metric-parity e2e pattern
>    (`playwright-css-parity` skill, `stylex-*` e2e specs).
> 5. **Fix the i18n defects** (Workstream 6 below):
>    (a) the login form's `user.login.invalid` raw-key display is ALREADY FIXED
>    (commit `e326e7ce3` — `t(error.message)` + e2e pin). Audit the REMAINING
>    `error.message` display sites (~27) and apply `t(error.message)` to every
>    user-visible error message, matching the `organizations/new.tsx` pattern;
>    (b) the frontend i18n must OWN its message dictionaries (committed message
>    files under the frontend), with `yona-original/conf/messages*` used only as
>    the one-time import source — remove the build-time `?raw` imports in
>    `frontend/src/i18n.tsx` and the server's `include_str!` of
>    `yona-original/conf/messages*` in `crates/server/src/routes/messages.rs`.
> 6. **Explicit rebranding is a separate, later phase** — after the parity lock
>    is green, write a dedicated plan for the Yoram footer/GNB identity. Do not
>    mix it into this pass.
>
> Verification gates: `pnpm agent:cargo-test -- --outside-sandbox -p yoram-server`
> (all suites; the four+two fixed suites must be green), the three e2e specs
> above via the managed Playwright runner (`PW_CHANNEL=chrome`,
> `YONA_DEV_BASE_PATH=/yona`), `pnpm --dir frontend build` + `tsc --noEmit`.
> Cargo/pnpm/Playwright invocations run outside the sandbox per AGENTS.md.
> Turn-commit hook must pass (the scala-html-goal history baseline is clean;
> route TSX changes need a complete audit row in `docs/provenance/frontend-scala-html-goal-violation-audit.md`).

---

## 1. Verified current state (evidence, 2026-08-03)

All items below were reproduced against clean HEAD during the 2026-08-03 session;
none are regressions from the issue-list SQL/cache or fetch-lock work.

### 1.1 Server contract suite failures (pre-existing)

| Test | Failure | Root cause |
|---|---|---|
| `issue_core_contract_creates_reads_updates_and_deletes_over_rest` | gravatar URL has `d=https%3A%2F%2Fko.gravatar.com%2F...` but assertion expects `d=identicon` | stale assertion; impl intentionally uses the legacy ko.gravatar default (`gravatar_url` unit test pins it) |
| `rest_project_issue_list_exposes_legacy_row_payload_fields` | `dueDateOverdue` true vs expected false | fixture due date 2026-08-01 is now past (clock-dependent) |
| `rest_label_routes_manage_labels_and_categories` | label name "LegacyFeature" vs "Bug" | fixture/assertion mismatch |
| `rest_project_routes_cover_directory_views_and_mutations` | "legacy owner user" | assertion vs route contract |
| `assets_contract` ×2 | messages JS content; `/yona/sites/mail` 401 vs 200 | stale content assertion + route/auth expectation |
| `notification_contract` / `project_webhook_contract` | rotating mail-timing flakes (3 deterministic: `skips_due_mail_when_resource_no_longer_exists`, `review_comment_mail_replies_to_parent_thread_like_legacy`, `partitions_bcc_mail_by_recipient_limit`) | mail delivery timing; **follow-up only** |

### 1.2 e2e failures (pre-existing)

| Spec | Failure | Root cause |
|---|---|---|
| `stylex-project-issues-pagination.e2e.ts` (runtime footer test) | footer text "Copyright Yona authors & © NAVER Corp. & NAVER LABS ..." lacks "Yoram" | the app renders the legacy footer; the test expects the rebranded one — **decision in Workstream 3** |
| `project-issues-empty.e2e.ts` | class-order assertions (`issue-label active label static` vs `label issue-label active static`) + suite hang | component class composition order vs legacy template; unknown hang |
| `project-issues-real-instance-parity.e2e.ts` | `[data-stylex-content-ready="true"]` never appears | StyleX content-ready marker not emitted on the issues route |

### 1.3 Footer/GNB facts (legacy evidence)

- `yona-original/app/views/common/footer.scala.html` — `page-footer-outer > .page-footer > span.provider` with `Yona authors` (`.yona-author`), `NAVER Corp.`, `NAVER LABS` (`.naver-labs`), `NAVER CLOUD PLATFORM` (`.naver-cloud-platform`). The React footer in `frontend/src/routes/-home-route-screen.tsx` already matches this exactly.
- `yona-original/app/views/common/navbar.scala.html:41-45` — the GNB feedback item: `@if(appFeedbackUrl){ <li><a href="@appFeedbackUrl" target="_blank">@Messages("title.yobi.feedback")</a></li> }`.
- `yona-original/conf/application.conf.default:173-174` — `application.feedback.url="https://github.com/yona-projects/yona/issues"` (a real default; the menu is removable only by commenting the config).
- Rust side: `feedback_url` is `Option<String>` defaulting to None (`runtime_config.rs:48,372`); the React GNB hides the item when `feedbackUrl` is empty (`-home-route-screen.tsx:1907`). → the link is currently absent, which is a parity gap.

## 2. Principles

1. Functional/UX parity with `yona-original/` is the only goal. No new structure.
2. Legacy Scala HTML/LESS/JS/messages are the output source of truth; React/TanStack
   owns behavior (state/events/queries), never DOM-control JS ported verbatim.
3. **The StyleX visual lock is DOM/CSS-property-based**: deterministic assertions
   on computed style, geometry (bounding boxes), DOM identity/class order —
   never screenshot diffing. Screenshots are auxiliary artifacts only.
4. Every gap/deviation must be recorded (root canonical docs, provenance,
   plan follow-up) if reclassified.

## 3. Workstream 1 — server contract parity fixes

- Fix the five failing tests per the PROMPT table (assertion/fixture alignment,
  relative dates, legacy default gravatar shape).
- Run: `pnpm agent:cargo-test -- --outside-sandbox -p yoram-server --test issue_core_contract --test rest_contract --test assets_contract`.
- Do not modify the `gravatar_url` implementation (legacy intent is pinned).

## 4. Workstream 2 — e2e parity fixes

- `project-issues-empty.e2e.ts`: restore legacy class order in the issue-label
  composition (find the component that emits `issue-label active label static`;
  the legacy template order is `label issue-label active static` — verify against
  `yona-original/app/views/issue/partial_list.scala.html` and the label partial);
  diagnose and fix the suite hang.
- `project-issues-real-instance-parity.e2e.ts`: make the issues route emit
  `[data-stylex-content-ready="true"]` when its content query settles (check how
  other routes emit the marker; the issues route is the gap).
- Run the three specs via the managed runner.

## 5. Workstream 3 — footer/GNB 100% legacy parity (no rebranding)

1. **Feedback link revival**: make the GNB `개발팀에 문의하기` item appear with
   the legacy default URL `https://github.com/yona-projects/yona/issues` when no
   explicit `YONA_FEEDBACK_URL` is configured:
   - server: default `feedback_url` in `runtime_config.rs` (StartupConfig default)
     to the legacy URL (mirror `application.conf.default:174`), keeping
     `YONA_FEEDBACK_URL`/toml override;
   - frontend: the existing conditional render (`feedbackUrl ? <Link>...`) then
     always shows; keep `title.yobi.feedback` copy.
   - Contract: extend `rest_contract`/a focused e2e to assert the item and its
     href when unconfigured.
2. **Footer**: keep the current legacy composition (already 100% — verify
   class/id/text/order against `footer.scala.html`).
3. **Fix the pagination e2e runtime footer test**: it must assert the legacy
   footer text (Yona authors / NAVER Corp / NAVER LABS / NAVER CLOUD PLATFORM),
   not "Yoram". The source-level "intentional Yoram footer diff" assertions stay
   only if they document the deferred rebrand; otherwise move them into the
   rebrand phase.
4. Record in provenance: footer/feedback at 100% legacy parity as of this commit;
   rebranding is deferred to its own phase.

## 6. Workstream 4 — StyleX visual lock, DOM/CSS-property-based

Replace the screenshot-gated final StyleX verification with a deterministic
property-based gate:

1. **Mechanics** (reuse the repo's existing metric-parity e2e pattern — see
   `playwright-css-parity` skill and `stylex-*` specs):
   - DOM identity: expected element/class/id/attribute presence and **order**
     (class attribute token order must match the legacy template composition).
   - Computed CSS: `getComputedStyle` assertions on the properties the legacy
     frozen cascade establishes (the specific selectors/rules per screen come
     from `yona-original/app/assets/stylesheets/yobi.less` + Bootstrap).
   - Geometry: bounding-box comparisons (desktop + mobile breakpoints) against
     legacy-derived expected values.
   - Source ownership: each visible declaration must trace to a StyleX owner or
     a documented frozen-rule transfer (per the stylex migration ledger).
2. **Scope**: the final visual-lock profile (`test:e2e:stylex-fast` full set +
     the fallback-off run) — every `stylex-*` spec must be property-based.
   Screenshots: keep only as non-gating diagnostics (`--update-snapshots` never
   gates CI).
3. **Gate**: the fast profile is NOT the completion record; the fallback-off
   global run + production build + StyleX verifier + property-based suite is.
4. Document the retired screenshot thresholds in the stylex migration ledger.

## 7. Workstream 6 — i18n defects (reported from MariaDB login testing, 2026-08-03)

### 6.1 Server error message keys displayed raw (login form)

Evidence:
- Server returns the message KEY, not the translation:
  `crates/server/src/routes/auth.rs:415` → `ConnectError::unauthenticated(LEGACY_LOGIN_INVALID_MESSAGE)`
  with `LEGACY_LOGIN_INVALID_MESSAGE = "user.login.invalid"` (`state.rs:275`); the
  REST contract intentionally returns keys (`auth_workspace_contract.rs:2222,2298`
  assert `"user.login.invalid"` in the JSON body).
- `frontend/src/routes/users/loginform.tsx:108` displays it raw:
  `setSubmitError(error instanceof Error ? error.message : t("user.login.failed"))`
  → the browser shows the literal `user.login.invalid`.
- The established correct pattern already exists in
  `frontend/src/routes/organizations/new.tsx:264` and
  `.../settingform.tsx:109`: `t(error.message)` — `lookupLegacyMessage` returns
  the key unchanged when unknown (legacy `Messages()` semantics), so known keys
  translate and concrete server strings pass through.

Fix:
1. **DONE (2026-08-03)**: `loginform.tsx` → `setSubmitError(error instanceof Error ? t(error.message) : t("user.login.failed"))`; verified in-browser on the release build — wrong-password login now shows the translated copy (en: "Your log in ID, E-mail or password is not valid."), not the raw key.
2. Audit all remaining `error.message` display sites (grep
   `error.message` under `frontend/src` — ~27 sites besides the login form), apply
   `t(error.message)` to every user-visible error message (mutation `onError`
   handlers, `window.alert` failures). Keep raw only where the message is a
   debug/developer surface.
3. e2e/contract pin: extend `auth-aliases.e2e.ts` (or the login e2e) to assert
   the invalid-login error shows the TRANSLATED copy (ko-KR), not the key;
   `auth_workspace_contract` already pins the key in the API response.

### 6.2 i18n must own the message dictionaries (stop referencing yona-original)

Evidence:
- `frontend/src/i18n.tsx:2-6` bundles the legacy files at build time:
  `import legacyMessagesEn from "../../yona-original/conf/messages?raw"` (×5).
- `crates/server/src/routes/messages.rs:4-8` `include_str!`s the same five files
  and serves `/messages.js` (the legacy global `Messages()`), and
  `assets_contract.rs:1105` pins the served content.

Design (per user direction): the Rust frontend owns its message keys; the
legacy files are the one-time import source only.

Fix:
1. Generate committed dictionaries into the frontend (e.g.
   `frontend/src/i18n/messages/{en-US,ja-JP,ko-KR,ru-RU,uz-UZ}.ts` — a one-time
   import from `yona-original/conf/messages*`, kept verbatim, with the rebrand
   value overrides applied as today). `frontend/src/i18n.tsx` imports its own
   files; no `yona-original` paths remain in frontend build inputs.
2. Server `/messages.js`: keep the route for legacy-compat parity, but source it
   from the same owned dictionaries (generate a JS artifact in the crate or
   serve from a shared owned source) instead of `include_str!` on
   `yona-original/conf/`. Alternatively, document why the legacy include stays
   (it is a legacy-compat route; the owned-dictionary rule applies to the
   application i18n).
3. `assets_contract.rs:1105` assertion stays (the served content must remain
   the legacy messages — the legacy JS consumers depend on it); only the SOURCE
   of that content changes.
4. Record in provenance: message-key ownership moved to the frontend crate;
   yona-original/conf/messages becomes import-source-only (frozen, unmodified).

## 8. Workstream 5 — explicit rebranding (deferred, separate phase)

After the parity lock is green: a dedicated plan replaces the legacy
footer/GNB identity (Yoram product identity per the approved rebrand —
`docs/provenance/frontend-yoram-rebrand-2026-07-13.md`) with its own tests,
including the feedback link destination decision. Nothing in this pass rebrands.

## 9. Follow-up (recorded, not in this pass)

- notification/webhook mail-timing flakes (3 deterministic + rotating set).
- release-binary embedded-asset hygiene: stale chunks from earlier builds were
  served (orphaned, unreferenced); make the embed step clean the asset tree.
- base-path runtime-injection test (deferred per prior decision).

## 10. Verification gates (this pass)

1. `pnpm agent:cargo-test -- --outside-sandbox -p yoram-server --test issue_core_contract --test rest_contract --test assets_contract` — green.
2. e2e: `stylex-project-issues-pagination`, `project-issues-empty`,
   `project-issues-real-instance-parity` — green via managed runner.
3. Login invalid-account flow: translated `user.login.invalid` copy (ko-KR),
   never the raw key; `pnpm --dir frontend build` + `tsc --noEmit` clean.
4. Turn-commit hook passes; scala-html-goal history audit clean (baseline
   `186433797..HEAD`); route TSX changes carry a complete audit row.
