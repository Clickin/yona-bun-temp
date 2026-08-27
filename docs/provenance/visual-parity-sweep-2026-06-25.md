# Playwright Visual Parity Sweep - 2026-06-25

## 2026-08-27 RC full sweep

- System Chrome ran against the local legacy instance at
  `http://127.0.0.1:9000` and Yoram at `http://127.0.0.1:3101`, using
  authenticated fixture accounts. The sweep completed route inspection:
  legacy **587/624**, local **365/401**, with 37 legacy and 36 local failures.
  Local direct API checks recorded **7 passed / 6 failed**. This is evidence,
  not a parity completion claim.
- The legacy sample repository did not expose `refs/heads/main`; the sweep
  continued with the existing local `main` and `feature/ui` refs and recorded
  that fallback instead of aborting before route coverage.
- Current status deltas:

`/projects`, `/admin/sample/issues?format=xls`,
`/admin/sample/newPullRequestForm`, `/admin/sample/reviews?format=xls`,
`/admin/sample?tabId=dashboard`, `/admin/sample?tabId=history`,
`/admin/svnplayground/reviews?format=xls`, `/alice/sample`,
`/alice/sample/newPullRequestForm`, `/alice/sample/reviews?format=xls`,
`/alice/sample/watch`, `/sites/user/delete33`, `/sites/user/delete34`,
`/sites/user/delete35`, `/weblabs/portal/member/1/edit`,
`/weblabs/portal/member/33/edit`, `/weblabs/portal/newPullRequestForm`,
`/weblabs/portal/reviews?format=xls`.

## 2026-07-27 production-dist full sweep

- System Chrome, legacy `http://127.0.0.1:9000`, and a newly built frontend
  served by the Rust filesystem-asset runtime at `http://127.0.0.1:8090`.
- Canonical evidence: `output/playwright/visual-sweep/latest.json`,
  `scope: full`, legacy `248/273`, local `362/397`, with `35` local failures
  and `210` comparison diff failures still open. This is evidence, not a
  pixel-parity completion claim.
- There were no route-inspection, paint-settle, or cleanup timeouts. The prior
  stalls came from a misplaced Playwright timeout argument, over-broad success
  selectors, session resolution on every route, unbounded paint settlement,
  and duplicate context cleanup.
- Product fixes made unavailable projects render the legacy error shell
  immediately and repaired direct `/code/` and `/commits/` navigation.
- Latest status deltas:

`/admin/sample/code`, `/alice/sample/code`, `/alice/sample/watch`,
`/sites/user/delete33`, `/sites/user/delete34`, `/sites/user/delete35`,
`/weblabs/portal/member/1/edit`, `/weblabs/portal/member/33/edit`,
`/weblabs/portal/newPullRequestForm`,
`/admin/sample/pullRequest/1/changes/HEAD`, `/admin/sample/code/`,
`/admin/sample/code/main`, `/admin/sample/code/main/`,
`/admin/sample/code/main/README.md`, `/admin/sample/commits`,
`/admin/sample/commits/`, `/admin/sample/commits/main`,
`/admin/sample/commit/HEAD`, `/admin/sample/compare/main...main`,
`/admin/sample/branches`, `/admin/sample/search`,
`/admin/svnplayground/issue/1`, `/admin/svnplayground/issue/1/editform`,
`/admin/svnplayground/post/1`, `/admin/svnplayground/post/1/editform`,
`/admin/svnplayground/pullRequests`,
`/admin/svnplayground/closedPullRequests`,
`/admin/svnplayground/sentPullRequests`,
`/admin/svnplayground/pullRequest/1`,
`/admin/svnplayground/pullRequest/1/changes`,
`/admin/svnplayground/pullRequest/1/changes/HEAD`,
`/admin/svnplayground/pullRequest/1/editform`,
`/admin/svnplayground/newPullRequestForm`,
`/admin/svnplayground/code/main/README.md`,
`/admin/svnplayground/commits/main`, `/admin/svnplayground/commit/HEAD`,
`/admin/svnplayground/compare/main...main`,
`/admin/svnplayground/branches`, `/admin/svnplayground/search`,
`/admin/svnplayground/newFork`, `/alice/sample/issue/1`,
`/alice/sample/issue/1/editform`, `/alice/sample/post/1`,
`/alice/sample/post/1/editform`, `/alice/sample/pullRequest/1/changes/HEAD`,
`/alice/sample/code/`, `/alice/sample/code/main`,
`/alice/sample/code/main/`, `/alice/sample/code/main/README.md`,
`/alice/sample/commits`, `/alice/sample/commits/`,
`/alice/sample/commits/main`, `/alice/sample/commit/HEAD`,
`/alice/sample/compare/main...main`, `/alice/sample/branches`,
`/alice/sample/search`, `/weblabs/portal/issue/1`,
`/weblabs/portal/issue/1/editform`, `/weblabs/portal/post/1`,
`/weblabs/portal/post/1/editform`, `/weblabs/portal/pullRequest/1`,
`/weblabs/portal/pullRequest/1/changes`,
`/weblabs/portal/pullRequest/1/changes/HEAD`,
`/weblabs/portal/pullRequest/1/editform`, `/weblabs/portal/code/main`,
`/weblabs/portal/code/main/`, `/weblabs/portal/code/main/README.md`,
`/weblabs/portal/commits`, `/weblabs/portal/commits/`,
`/weblabs/portal/commits/main`, `/weblabs/portal/commits/main/`,
`/weblabs/portal/commit/HEAD`, `/weblabs/portal/compare/main...main`,
`/weblabs/portal/branches`, `/weblabs/portal/search`.

Status: historical audit evidence. The current default legacy parity baseline is
`http://127.0.0.1:9000`.

## Scope

- Current default legacy source target for parity work: `http://127.0.0.1:9000`
- Local target used by this 2026-06-25 run: `http://127.0.0.1:18111/yona`
- Legacy source target used by this 2026-06-25 run: `http://192.168.45.10:9000`
- Legacy Playwright target used by this 2026-06-25 run: `http://127.0.0.1:19100`,
  a temporary localhost proxy that fetches upstream with host `curl`
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
YONA_LEGACY_PROXY_PORT=19100 pnpm smoke:legacy-curl-proxy
YONA_LEGACY_BASE_URL=http://127.0.0.1:19100 YORAM_SWEEP_TARGET=both node scripts/visual-parity-sweep.mjs
node scripts/audit-legacy-html-pages.mjs
```

## Legacy Access Note

This note is historical. Current parity work should target the localhost legacy
instance at `http://127.0.0.1:9000` directly unless a distinct browser origin
is required.

For this 2026-06-25 run, `curl` from this host could reach the homelab legacy
instance and the existing HTML anchor audit passed. However, Playwright through
both system Edge and Chrome channels failed to render the private-network URL
with `net::ERR_ADDRESS_UNREACHABLE`, even when launched outside the Codex
sandbox and with direct proxy/private-network feature flags. That run therefore
used `pnpm smoke:legacy-curl-proxy`, a localhost proxy that shells out to
`curl` for upstream fetches and lets Playwright render the legacy responses
from `127.0.0.1`.

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
- 2026-06-25T12:59:24Z legacy-only rerun through `pnpm smoke:legacy-curl-proxy`
  reconfirmed the same browser path: 77 checked, 73 passed, 4 failed,
  authenticated session confirmed, 49/49 imported legacy-audit pages covered,
  and no missing legacy audit coverage.
- Local Playwright visual sweep: 154 checked, 154 passed, 0 failed, authenticated session confirmed.
- Latest recorded local direct API fragment-conversion sweep: 13 checked, 13 passed, 0
  failed. The direct surfaces cover the workspace sidebar/menu, notification
  paging, Markdown preview source return, direct issue/project label helpers,
  legacy external assignable/sharer lookup helpers, and project mention-list
  autocomplete helper aliases for user mentions, issue mentions, and
  commit-diff mentions.
- 2026-06-25T12:53:45Z local rerun after legacy-audit corpus hardening:
  `YORAM_SWEEP_TARGET=local` against `http://127.0.0.1:18111/yona`
  passed 154/154 rendered pages, 13/13 direct API surfaces, and 49/49
  imported legacy-audit pages with no missing legacy audit coverage.
- 2026-06-25T06:57:15Z local rerun after the Markdown editor i18n fallback
  repair: `YORAM_SWEEP_TARGET=local` against
  `http://127.0.0.1:18111/yona` passed 152/152 rendered pages, 10/10 direct
  API surfaces, and 49/49 imported legacy-audit pages with no missing legacy
  audit coverage.
- Cross-target comparison failures: 0. The harness now catches the class of issue where legacy
  renders a normal page and local renders a not-found/forbidden/bad-request page.
- 2026-06-25T13:06:20Z combined rerun through
  `pnpm smoke:legacy-curl-proxy` plus local `http://127.0.0.1:18111/yona` recorded
  legacy 73/77 with the same four homelab-reference failures, local 154/154,
  direct API 13/13, imported legacy audit page coverage 49/49 on both targets,
  and 0 same-path comparison failures.
- 2026-06-25T13:13:10Z combined rerun records the same legacy 73/77,
  local 154/154, direct API 13/13, and imported legacy-audit coverage 49/49 on
  both targets. `output/playwright/visual-sweep/latest.json` now includes
  `comparisonSummary`: 154 total local entries, 77 same-path comparisons,
  77 local-only legacy-missing entries, 0 diff failures, 0 local failures, and
  21 explicit status deltas. Those deltas are machine-readable instead of
  being hidden behind the 0 comparison-failure count; they are currently
  homelab-reference non-OK or sample-data status differences such as legacy
  404/500/400 responses where the local seeded route renders successfully.
- 2026-06-27T03:00:33Z combined rerun through the localhost curl proxy plus
  local `http://127.0.0.1:3101/yona` records legacy 93/96, local 174/174,
  direct API 13/13, imported legacy-audit coverage 67/67 on both targets, 96
  same-path comparisons, 78 local-only legacy-missing entries, 0 diff failures,
  0 local failures, and 22 explicit status deltas.

### Recorded Status Deltas

The 2026-06-27T03:00:33Z combined sweep recorded the following same-path HTTP
status differences. These are not counted as local UX failures because the Rust
target rendered successfully and the comparison found no not-found, forbidden,
bad-request, raw legacy key, or local failure state. They remain explicit
machine-readable deltas so a future sweep can distinguish reference-server or
sample-data variance from a Rust regression.

| Path | Legacy -> Rust status | Legacy ok | Rust ok | Classification |
| --- | --- | --- | --- | --- |
| `/admin/sample/issues?format=xls` | `0 -> 200` | `true` | `true` | legacy download/status variance |
| `/admin/sample/newPullRequestForm` | `400 -> 200` | `true` | `true` | sample-data status variance |
| `/admin/sample/reviews?format=xls` | `0 -> 200` | `true` | `true` | legacy download/status variance |
| `/admin/sample/post/1` | `404 -> 200` | `true` | `true` | sample-data status variance |
| `/admin/sample/post/1/editform` | `500 -> 200` | `false` | `true` | homelab legacy reference error |
| `/admin/sample/milestone/1` | `404 -> 200` | `true` | `true` | sample-data status variance |
| `/admin/sample/milestone/1/editform` | `404 -> 200` | `true` | `true` | sample-data status variance |
| `/admin/sample/pullRequest/1` | `404 -> 200` | `true` | `true` | sample-data status variance |
| `/admin/sample/pullRequest/1/changes` | `404 -> 200` | `true` | `true` | sample-data status variance |
| `/admin/sample/pullRequest/1/changes/HEAD` | `404 -> 200` | `true` | `true` | sample-data status variance |
| `/admin/sample/pullRequest/1/editform` | `404 -> 200` | `true` | `true` | sample-data status variance |
| `/admin/sample/code/main` | `404 -> 200` | `true` | `true` | sample-data status variance |
| `/admin/sample/code/main/` | `404 -> 200` | `true` | `true` | sample-data status variance |
| `/admin/sample/code/main/README.md` | `404 -> 200` | `true` | `true` | sample-data status variance |
| `/admin/sample/commits` | `404 -> 200` | `true` | `true` | sample-data status variance |
| `/admin/sample/commits/` | `404 -> 200` | `true` | `true` | sample-data status variance |
| `/admin/sample/commits/main` | `404 -> 200` | `true` | `true` | sample-data status variance |
| `/admin/sample/commits/main/` | `404 -> 200` | `true` | `true` | sample-data status variance |
| `/admin/sample/commit/HEAD` | `404 -> 200` | `true` | `true` | sample-data status variance |
| `/admin/sample/compare/main...main` | `500 -> 200` | `false` | `true` | homelab legacy reference error |
| `/admin/sample/branches` | `500 -> 200` | `false` | `true` | homelab legacy reference error |
| `/admin/sample/search` | `400 -> 200` | `true` | `true` | sample-data status variance |

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

None in the stabilized 154-route local rendered-screen sweep or same-path comparison.

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

- Raw i18n key visibility is currently clear in the 154-route local sweep.
- `/sites/diagnostic` browser GET now serves the React shell even when the viewer is not a site
  admin; `/api/v1/site/diagnostics` remains the site-admin-only JSON data endpoint. This prevents
  raw JSON forbidden responses from becoming the user-visible page.
- `/changeVCS`, `/transfer`, and `/webhooks` now reach the React SPA on GET; the legacy direct
  mutation handlers still own POST/PUT/DELETE.
- Re-run the combined legacy/local Playwright sweep after each repair batch; current success
  criterion is local 154/154 and 0 comparison failures. Legacy-reference failures must remain
  recorded with path/status/error details.
