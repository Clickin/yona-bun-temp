# Playwright Visual Parity Sweep - 2026-06-25

Status: current audit evidence.

## Scope

- Local target: `http://127.0.0.1:18101/yona`
- Legacy target: `http://192.168.45.10:9000`
- Browser: Playwright Chromium API using the system `msedge` channel, `1366x900`
- Local runtime: embedded assets, in-memory SQLite, `YONA_SEED_PILOT=1`
- Local authentication: REST bootstrap through `/api/auth/session` and `/api/v1/auth/register`

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
- Local Playwright visual sweep: 56 checked, 35 passed, 21 failed.
- Local discovered project route root: `/pilot/yona`.
- Legacy discovered project route root: `/admin/sample`.

## Local Failures

| Failure class | Paths |
| --- | --- |
| Raw i18n key visible | `/users/loginform`, `/users/signupform`, `/_help`, `/projectform`, `/search?keyword=yona&searchType=auto`, `/user/files`, `/pilot/yona/issue/1`, `/pilot/yona/issue/labelsform`, `/pilot/yona/issueform`, `/pilot/yona/postform`, `/pilot/yona/newMilestoneForm`, `/pilot/yona/branches` |
| Stylesheet not applied | `/sites/diagnostic` |
| Missing project header/menu | `/pilot/yona/newPullRequestForm`, `/pilot/yona/settingform` |
| Navigation failed | `/pilot/yona/webhooks`, `/pilot/yona/deleteform`, `/pilot/yona/transfer`, `/pilot/yona/newFork`, `/pilot/yona/statistics`, `/pilot/yona/changeVCS` |

## Follow-Up

- Treat the raw i18n key group as the first repair batch because it affects public/auth/project pages.
- Re-run the same local Playwright sweep after each repair batch; success criterion is 56/56 local pass before comparing visual screenshots against legacy.
- For project admin-only pages, run a seeded project-manager session rather than a generic registered user before deciding whether missing chrome is a route bug or an authorization-state difference.
