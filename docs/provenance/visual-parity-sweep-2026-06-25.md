# Playwright Visual Parity Sweep - 2026-06-25

Status: current audit evidence.

## Scope

- Local target: `http://127.0.0.1:18101/yona`
- Legacy target: `http://192.168.45.10:9000`
- Browser: Playwright Chromium API using the system `msedge` channel, `1366x900`
- Local runtime: embedded assets, in-memory SQLite, `YONA_SEED_PILOT=1`
- Local authentication: REST bootstrap through `/api/auth/session` and `/api/v1/auth/register`
- Local route corpus: explicit legacy base pages, route-tree sample expansion, and discovered seeded
  project links. Each route is inspected in an isolated Playwright page so one navigation failure
  cannot cascade into later false failures.

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
YORAM_SWEEP_TARGET=local node scripts/visual-parity-sweep.mjs
node scripts/audit-legacy-html-pages.mjs
```

## Legacy Access Note

`curl` from this host can reach the legacy instance and the existing HTML anchor audit passed.
However, Playwright through both system Edge and Chrome channels failed to render the legacy
private-network URL with `net::ERR_ADDRESS_UNREACHABLE`, even when launched outside the Codex
sandbox and with direct proxy/private-network feature flags. The local Yoram browser sweep is
therefore recorded separately from the legacy HTML baseline until the browser channel can access
`192.168.45.10:9000` directly.

## Results

- Legacy HTML anchor audit: 57 checked, 57 passed, 0 failed.
- Local Playwright visual sweep: 107 checked, 87 passed, 20 failed.
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

## Local Failures

| Failure class | Paths |
| --- | --- |
| Direct admin diagnostic shell returned non-HTML/unstyled response | `/sites/diagnostic` |
| Raw i18n key visible | `/migration` (`error.forbidden.or.not.allowed`), `/organizations/pilot/closedPullrequests` and `/organizations/pilot/pullrequests` (`title.pullrequest`), `/pilot/yona/newFork` (`message.1`, `message.2`, `project.name.alert`), `/pilot/yona/post/1/editform` (`notification.send.mail`), `/verify/admin/invalid` (`user.verification`) |
| Navigation failed with HTTP response code failure | `/pilot/yona/changeVCS`, `/pilot/yona/transfer`, `/pilot/yona/webhooks` |
| Missing project header/menu | `/pilot/yona/deleteform`, `/pilot/yona/milestone/1`, `/pilot/yona/milestone/1/editform`, `/pilot/yona/newPullRequestForm`, `/pilot/yona/post/1`, `/pilot/yona/pullRequest/1`, `/pilot/yona/pullRequest/1/changes`, `/pilot/yona/pullRequest/1/changes/HEAD`, `/pilot/yona/pullRequest/1/editform`, `/pilot/yona/settingform` |

## Follow-Up

- Treat the raw i18n key group as the next repair batch because it is visible text, not fixture
  incompleteness.
- Split the missing project chrome group into two checks: routes that need seeded fixture records
  (`post/1`, `milestone/1`, `pullRequest/1`) and routes that should render project chrome even in
  an empty/error state (`settingform`, `newPullRequestForm`, `deleteform`).
- The direct admin pages need a real site-admin smoke fixture. `/sites/diagnostic` currently
  proves that non-HTML direct responses can still bypass the React shell.
- Re-run the same 107-route local Playwright sweep after each repair batch; success criterion is
  107/107 local pass before comparing visual screenshots against legacy.
