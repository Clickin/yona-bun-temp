# Playwright Visual Parity Sweep - 2026-06-25

Status: current audit evidence.

## Scope

- Local target: `http://127.0.0.1:18111/yona`
- Legacy source target: `http://192.168.45.10:9000`
- Legacy Playwright target: `http://127.0.0.1:19100`, a temporary localhost
  proxy that fetches upstream with host `curl`
- Browser: Playwright Chromium API using the system `msedge` channel, `1366x900`
- Local runtime: embedded assets, in-memory SQLite, `YONA_SEED_PILOT=1`
- Local authentication: REST bootstrap through `/api/auth/session`, first-admin registration
  through `/api/v1/auth/register`, and existing-admin fallback through `/api/v1/auth/sign-in`
- Local fixture alignment: the sweep ensures an `admin/sample` project exists
  after local admin bootstrap so direct issue shortcuts such as
  `/user/issues/new/mine` compare against the same project shape as the homelab
  legacy sample. It also records `admin/sample` as the local recent project,
  matching legacy `IssueApp.newDirectIssueForm`, which selects the current
  user's most recent visited project for `/user/issues/new`. The sweep also
  creates `admin/sample#1` when absent so legacy issue detail/edit screens are
  compared against a real issue instead of a local fixture gap.
- Local route corpus: explicit legacy base pages, the latest legacy HTML audit
  `discoveredPageLinks`, route-tree sample expansion, and discovered seeded
  project links. Each route is inspected in an isolated Playwright page so one
  navigation failure cannot cascade into later false failures.
- Legacy-link coverage criterion: every normalized path imported from the
  latest legacy HTML audit `discoveredPageLinks` must appear in the rendered
  Playwright result set for each target being swept. The result JSON records
  `legacyAuditPagesCovered` and `missingLegacyAuditPages`, and any missing
  imported legacy page fails the sweep instead of being left as an implicit
  corpus-construction assumption.
- Legacy route corpus: explicit legacy base pages, the latest legacy HTML audit
  `discoveredPageLinks`, plus any project links discovered from `/projects`.
  The discovery filter treats `/admin/sample` as a project route even though
  `/admin` is also a legacy user-profile root, so sample project pages are not
  silently skipped. Local-only route-tree samples are not forced onto the legacy
  sample, because the seeded local `pilot/yona` routes are not legacy homelab
  URLs.
- Render criterion: Playwright waits past transient `common.loading` / `불러오는 중` shells before
  judging final visible screen metrics.
- Diff criterion: when both targets render the same path, the sweep fails if
  legacy renders a normal page but local renders an error page. Legacy
  server-returned fragments such as `/notification?from=...` are classified as
  fragments for the legacy target, while local browser navigation must render
  the React shell. Error-page detection includes both body text and document
  title so legacy 404/500 pages are not misclassified as normal pages.
- Direct API criterion: the local sweep also checks legacy direct fragment
  surfaces that have been converted to React-owned data boundaries. It fails if
  `/user/usermenuTabContentList`, `/user/sidebar`, `/notification?from=...`,
  `POST /markdown/:owner/:project`, direct label helpers, legacy external
  assignable/sharer lookup helpers, or legacy project mention-list helper
  aliases return an HTML fragment instead of JSON, or if markdown preview
  returns a rendered HTML field instead of Markdown source.
- i18n criterion: React-owned views must keep using legacy `conf/messages*`
  keys as-is. The sweep fails when a rendered normal page exposes raw legacy
  message keys; new React-specific message keys are not a parity substitute.

## Commands

```sh
YONA_BASE_PATH=/yona \
YONA_BIND_ADDR=127.0.0.1:18111 \
YONA_DATABASE_URL=sqlite::memory: \
YONA_SCHEMA_POLICY=up \
YONA_SEED_PILOT=1 \
YONA_USE_EMBEDDED_ASSETS=1 \
./target/debug/yoram
```

```sh
pnpm --dir frontend build
YONA_EMBED_ASSET_ROOT="$PWD/frontend/dist" pnpm agent:cargo -- --outside-sandbox build -p yoram-server --bin yoram
YONA_LEGACY_BASE_URL=http://127.0.0.1:19100 YORAM_SWEEP_TARGET=both node scripts/visual-parity-sweep.mjs
node scripts/audit-legacy-html-pages.mjs
```

## Legacy Access Note

`curl` from this host can reach the legacy instance and the existing HTML anchor audit passed.
However, Playwright through both system Edge and Chrome channels failed to render the legacy
private-network URL with `net::ERR_ADDRESS_UNREACHABLE`, even when launched outside the Codex
sandbox and with direct proxy/private-network feature flags. A direct Node TCP proxy also failed
with `EHOSTUNREACH`, while host `curl` continued to return HTTP 200. The current browser evidence
therefore uses a temporary localhost proxy that shells out to `curl` for upstream fetches and lets
Playwright render the legacy responses from `127.0.0.1`.

## Results

- Legacy HTML anchor audit: 57 checked, 57 passed, 0 failed, 0 discovered links unaudited.
- The visual sweep now imports the latest legacy HTML audit's 49
  `discoveredPageLinks` into each target corpus and records the normalized list
  as `legacyAuditPages` in `output/playwright/visual-sweep/latest.json`.
  The sweep also records explicit coverage for that imported link set; the
  stabilized local run covers 49/49 with `missingLegacyAuditPages: []`.
- Legacy route/spec/anchor/render coverage smokes: 57 routed, 57 with spec evidence, 104/104
  curl-observed anchors with Rust evidence, 57/57 with rendered e2e signal evidence.
- Legacy Playwright visual sweep through the curl proxy: 77 checked, 73 passed, 4 failed,
  authenticated session confirmed. The remaining failures are legacy reference behavior:
  `/admin/sample/issue/1` timed out waiting for `networkidle`, while
  `/admin/sample/post/1/editform`, `/admin/sample/compare/main...main`, and
  `/admin/sample/branches` returned HTTP 500 from the homelab sample.
- Local Playwright visual sweep: 152 checked, 152 passed, 0 failed, authenticated session confirmed.
- Latest recorded local direct API fragment-conversion sweep: 10 checked, 10 passed, 0
  failed. The direct surfaces now cover the workspace sidebar/menu,
  notification paging, Markdown preview source return, direct issue/project
  label helpers, and legacy external assignable/sharer lookup helpers.
- Harness update after the latest recorded sweep: the next local direct API
  fragment-conversion rerun checks 13 surfaces by adding project mention-list
  autocomplete helper aliases for user mentions, issue mentions, and
  commit-diff mentions.
- 2026-06-25T06:57:15Z local rerun after the Markdown editor i18n fallback
  repair: `YORAM_SWEEP_TARGET=local` against
  `http://127.0.0.1:18111/yona` passed 152/152 rendered pages, 10/10 direct
  API surfaces, and 49/49 imported legacy-audit pages with no missing legacy
  audit coverage.
- Cross-target comparison failures: 0. The harness now catches the class of issue where legacy
  renders a normal page and local renders a not-found/forbidden/bad-request page.
- A rerun first exposed `/user/issues/new` as that exact class of failure:
  legacy rendered the normal `새 이슈 - admin/sample` form, while local rendered
  a not-found page because the sweep-created `admin/sample` project had not
  been recorded as recently visited. The harness now records that recent
  project during local bootstrap instead of changing app semantics, preserving
  legacy `newDirectIssueForm` behavior.
- Local discovered project route root: `/pilot/yona`.
- Legacy discovered project route root: `/admin/sample`.
- Legacy i18n keys are now loaded directly from `yona-original/conf/messages*` without a local
  React fallback dictionary. React conversion work must keep those legacy key names rather than
  inventing a new keyspace; visible keys such as `user.role.owner` now fail the sweep when they
  leak into a rendered normal page.
- `/admin/sample/newPullRequestForm` now preserves the project pull-request page shell when the
  form-options endpoint reports the legacy `pullRequest.error.newPullRequestForm` condition,
  matching the legacy rendered page instead of replacing it with a generic bad-request screen.

The earlier 56-route local sweep was too narrow because it only covered hand-listed pages plus
links discovered from `/projects`. The current sweep also expands `frontend/src/routeTree.gen.ts`
with stable sample parameters, so route-only pages are included before a user smoke test reaches
them manually.

The project discovery sweep now also applies detail/edit/code/compare suffixes to discovered
legacy project roots such as `/admin/sample`, instead of checking those screens only on the
local `pilot/yona` route-tree sample.

The sweep also consumes `.agent/legacy-html-page-audit/latest.json` when present. This keeps the
rendered-screen corpus coupled to the HTML-link audit: any newly discovered legacy page link is
automatically browser-swept on both the legacy and local targets before a manual smoke test reaches
it.

Asset note: the local browser sweep must run against a binary built with
`YONA_EMBED_ASSET_ROOT="$PWD/frontend/dist"` or with a current `frontend/dist` present before
`cargo build`. Older debug binaries built without either condition embed the server test asset
fixture and produce the same class of broken UI symptom reported in the Windows smoke test.

2026-06-25 i18n rerun note: after tightening the visible i18n rule to keep
legacy key names while requiring page chrome to render translated values, the
local embedded sweep passed 152/152 and direct API fragment conversion passed
4/4. The detector excludes user-authored Markdown/help examples from raw-key
matching, but still scans document titles and page chrome for unresolved legacy
message keys.

2026-06-25 visible-attribute rerun note: the sweep now includes page-chrome
`title`, `placeholder`, `aria-label`, `data-content`, and `data-original-title`
attributes in the raw legacy-key scan. The first attribute-aware run exposed
vote tooltip and board form placeholder leaks; after replacing those with
legacy message lookup output, the embedded local sweep passed 152/152 and direct
API fragment conversion passed 4/4.

## Failures

None in the stabilized 152-route local rendered-screen sweep or same-path comparison.

The latest combined run records four legacy-reference failures, but they are not Yoram blockers
because the Rust target renders the corresponding same-path comparison without local errors and
the failures originate from the homelab legacy server itself. Running `YORAM_SWEEP_TARGET=legacy`
continues to fail on legacy failures so legacy-only audits do not mask reference-server regressions.

The local sweep also fails if seeded fixture copy such as `browser-safe route tree` or an unbased
`localhost:3001/yo` clone URL becomes visible in rendered UI.

2026-06-25 harness hardening note: target bootstrap failures are now recorded as
machine-readable target results instead of aborting before `latest.json` is written. A closed-port
run,
`YONA_LEGACY_BASE_URL=http://127.0.0.1:65534 YORAM_SWEEP_TARGET=legacy node scripts/visual-parity-sweep.mjs`,
exited non-zero and wrote `legacy.status: "unreachable"` with the Playwright
`net::ERR_CONNECTION_REFUSED` target error. Browser launch failures are also recorded as
`status: "failed"`, so missing Playwright/Edge setup cannot masquerade as a passed visual sweep.

## Follow-Up

- Raw i18n key visibility is currently clear in the 152-route local sweep.
- `/sites/diagnostic` browser GET now serves the React shell even when the viewer is not a site
  admin; `/api/v1/site/diagnostics` remains the site-admin-only JSON data endpoint. This prevents
  raw JSON forbidden responses from becoming the user-visible page.
- `/changeVCS`, `/transfer`, and `/webhooks` now reach the React SPA on GET; the legacy direct
  mutation handlers still own POST/PUT/DELETE.
- Re-run the combined legacy/local Playwright sweep after each repair batch; current success
  criterion is local 152/152 and 0 comparison failures. Legacy-reference failures must remain
  recorded with path/status/error details.
