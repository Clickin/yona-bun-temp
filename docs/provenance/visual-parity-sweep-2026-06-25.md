# Playwright Visual Parity Sweep - 2026-06-25

Status: current audit evidence.

## Scope

- Local target: `http://127.0.0.1:18101/yona`
- Legacy source target: `http://192.168.45.10:9000`
- Legacy Playwright target: `http://127.0.0.1:19000`, a temporary localhost
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
  user's most recent visited project for `/user/issues/new`.
- Local route corpus: explicit legacy base pages, route-tree sample expansion, and discovered seeded
  project links. Each route is inspected in an isolated Playwright page so one navigation failure
  cannot cascade into later false failures.
- Legacy route corpus: explicit legacy base pages plus any project links
  discovered from `/projects`. Local-only route-tree samples are not forced
  onto the legacy sample, because the seeded local `pilot/yona` routes are not
  legacy homelab URLs.
- Render criterion: Playwright waits past transient `common.loading` / `불러오는 중` shells before
  judging final visible screen metrics.
- Diff criterion: when both targets render the same path, the sweep fails if
  legacy renders a normal page but local renders an error page. Legacy
  server-returned fragments such as `/notification?from=...` are classified as
  fragments for the legacy target, while local browser navigation must render
  the React shell.

## Commands

```sh
YONA_BASE_PATH=/yona \
YONA_BIND_ADDR=127.0.0.1:18101 \
YONA_DATABASE_URL=sqlite::memory: \
YONA_SCHEMA_POLICY=up \
YONA_SEED_PILOT=1 \
YONA_USE_EMBEDDED_ASSETS=1 \
./target/debug/yoram
```

```sh
pnpm --dir frontend build
YONA_EMBED_ASSET_ROOT="$PWD/frontend/dist" pnpm agent:cargo -- --outside-sandbox build -p yoram-server --bin yoram
YONA_LEGACY_BASE_URL=http://127.0.0.1:19000 YORAM_SWEEP_TARGET=both node scripts/visual-parity-sweep.mjs
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
- Legacy route/spec/anchor/render coverage smokes: 57 routed, 57 with spec evidence, 104/104
  curl-observed anchors with Rust evidence, 57/57 with rendered e2e signal evidence.
- Legacy Playwright visual sweep through the curl proxy: 32 checked, 32 passed, 0 failed,
  authenticated session confirmed.
- Local Playwright visual sweep: 107 checked, 107 passed, 0 failed, authenticated session confirmed.
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

The earlier 56-route local sweep was too narrow because it only covered hand-listed pages plus
links discovered from `/projects`. The current sweep also expands `frontend/src/routeTree.gen.ts`
with stable sample parameters, so route-only pages are included before a user smoke test reaches
them manually.

Asset note: the local browser sweep must run against a binary built with
`YONA_EMBED_ASSET_ROOT="$PWD/frontend/dist"`. A debug binary built without that variable embeds the
server test asset fixture and produces the same class of broken UI symptom reported in the Windows
smoke test.

## Failures

None in the stabilized 32-route legacy rendered-screen sweep, 107-route local rendered-screen sweep,
or same-path comparison.

The local sweep also fails if seeded fixture copy such as `browser-safe route tree` or an unbased
`localhost:3001/yo` clone URL becomes visible in rendered UI.

## Follow-Up

- Raw i18n key visibility is currently clear in the 107-route local sweep.
- `/sites/diagnostic` browser GET now serves the React shell even when the viewer is not a site
  admin; `/api/v1/site/diagnostics` remains the site-admin-only JSON data endpoint. This prevents
  raw JSON forbidden responses from becoming the user-visible page.
- `/changeVCS`, `/transfer`, and `/webhooks` now reach the React SPA on GET; the legacy direct
  mutation handlers still own POST/PUT/DELETE.
- Re-run the combined legacy/local Playwright sweep after each repair batch; current success
  criterion is legacy 32/32, local 107/107, and 0 comparison failures.
