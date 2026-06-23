# Legacy HTML Page Audit

> Status: current verification baseline for curl-based legacy SSR page checks.
> This is not a claim that every Yona page has passed 1:1 UI parity.

Last updated: 2026-06-23

## Scope

The homelab legacy instance at `http://192.168.45.10:9000` is reachable with
host `curl`, but Playwright-launched Chrome and Edge still return
`net::ERR_ADDRESS_UNREACHABLE` even when the tool invocation runs outside the
Codex sandbox. The host is addressed by IP, so this is not a browser DNS
resolution failure. Because legacy Yona is server-rendered Play templates, curl
HTML is a valid first-pass source for legacy page anchors while browser routing
is blocked.

`pnpm smoke:legacy-html-pages` logs in with `admin` / `admin` by default and
checks representative public, authenticated workspace, user, search, and
site-admin pages for HTTP 200 plus legacy DOM/message-key anchors. The output is
written to `.agent/legacy-html-page-audit/latest.json`, which is intentionally
ignored by git.

The same smoke now also records internal `href` page discovery from each
audited HTML response. It filters assets, API endpoints, logout/oauth links,
template placeholders, and obvious state-changing action URLs, then writes
`discoveredPageLinks` and `unauditedDiscoveredPageLinks` to the latest JSON.
The smoke exits non-zero if any discovered page link remains unaudited.

`pnpm smoke:legacy-route-coverage` reads that latest legacy audit output and
checks whether each audited legacy URL has a corresponding Rust TanStack Router
`fullPath` in `frontend/src/routeTree.gen.ts`. Its output is written to
`.agent/legacy-html-page-audit/route-coverage.json`.

`pnpm smoke:legacy-parity-spec-coverage` reads route coverage and checks that
each audited route has at least one existing frontend parity spec evidence
match. This is a coverage guard for the verification ledger, not a browser DOM
diff.

`pnpm smoke:legacy-anchor-coverage` reads the latest legacy HTML audit
`checkedAnchors` and verifies that each anchor has Rust frontend source/spec
evidence. This is still static evidence, but it ties the curl-observed legacy
HTML anchors to committed Rust UI code.

The HTML audit also records `checkedStructuralTokens` and
`missingStructuralTokens` fields for `id`, `name`, or class-token matches. Text
or message-key anchors are excluded from `checkedStructuralTokens`; any missing
structural token now fails the smoke.

`pnpm smoke:legacy-e2e-render-coverage` reads route coverage and scans existing
Playwright e2e tests for literal `page.goto(...)` navigations that render the
same Rust route. This does not replace a fresh browser diff, but it separates
pages already covered by rendered e2e flows from pages that still need one; it
exits non-zero while any audited URL lacks rendered e2e evidence.

Latest local run against the homelab instance on 2026-06-23:
`57` URL checks passed, with `3` expected legacy non-200 observations retained
as source behavior:

- `/admin/sample/newPullRequestForm` returned `400`
- `/admin/sample/commits` returned `404`
- `/admin/sample/branches` returned `500`

That same run discovered `49` unique internal page links from the audited SSR
HTML after filtering assets, API/action URLs, `/sites/export` download, and the
legacy `/info` broken help link. `0` discovered page links remain unaudited.

The same `57` audited URLs route-map to Rust frontend routes with
`pnpm smoke:legacy-route-coverage`: `57` routed, `0` missing. Query-bearing and
sample-data URLs are normalized to their TanStack `fullPath`, for example
`/search?keyword=...` to `/search`, `/sites/userList` to `/sites/$pageName`,
`/admin` to `/$user`, `/admin/sample/issues` to
`/$owner/$projectName/issues`, and `/admin/sample/issue/1` to
`/$owner/$projectName/issue/$issueNumber`.

The same `57` routed URLs have frontend parity spec evidence with
`pnpm smoke:legacy-parity-spec-coverage`: `57` with spec evidence, `0` missing.
This pass found a missing explicit alias assertion for `/user/issues/new/mine`;
`frontend/src/route-parity.spec.tsx` now pins that route to
`DirectIssueCreateFormRouteComponent mine={true}`.

The latest `pnpm smoke:legacy-anchor-coverage` run checks `104` curl-observed
legacy anchors across those pages: `104` with Rust evidence, `0` missing. This
pass found that the logged-in root page's legacy `admin-logged-in-affix` anchor
was absent from Rust source; `frontend/src/routes/__root.tsx` now renders that
site-admin user-menu affix for site admins.

The latest `pnpm smoke:legacy-e2e-render-coverage` run finds rendered
Playwright e2e navigation evidence for all `57` audited legacy URLs:
`57` with rendered e2e evidence, `0` missing. The final 18 route checks are covered
by `frontend/tests/legacy-rendered-page-audit.e2e.ts`, which renders each page
and checks the curl-observed legacy anchors against the Rust DOM. Where the
legacy anchor represents an actual DOM structure token, that e2e file also
checks selector presence through `id`, `name`, or class lookup. It also checks
the legacy authenticated sidebar shell (`#mySidenav`,
`#usermenu-tab-content-list`, and the three user-menu tab panes), because that
surface is now a React-rendered root shell rather than a server-returned HTML
fragment. Direct legacy Java endpoints that returned HTML fragments are treated
as compatibility references only for the converted app path: the Rust/React
implementation must expose data through API returns and render the equivalent
legacy UX in React.

Security regression coverage is part of the converted-page smoke surface:
`frontend/tests/search-parity.e2e.ts` renders hostile search result text and
asserts that script/image payloads remain inert text, while
`crates/server/tests/search_contract.rs` checks that SQL metacharacters in a
search keyword do not widen results.

That rendered pass also found a dev-only proxy mismatch: Vite was proxying
`/lostPassword` GET requests to the backend, so direct React route rendering of
the legacy forgot-password page failed under the managed e2e frontend. The Vite
dev proxy no longer captures `lostPassword`, leaving the browser route to render
through the React fallback while backend direct-route tests still cover the
server endpoint.

## Current Coverage

The initial curl baseline covers:

- Public entry/auth/help pages: `/`, `/users/loginform`, `/users/signupform`,
  `/lostPassword`, `/_help`
- Authenticated shell and directories: `/`, `/projects`, `/projectform`,
  `/_import`, `/orgs`, `/organizations/new`
- Search/notification/user pages: `/search`, `/notifications`, `/notification`,
  `/user/issues`, `/user/files`, `/user/editform/**`
- Site-admin pages: `/sites/userList`, `/sites/projectList`, `/sites/postList`,
  `/sites/issueList`, `/sites/mail`, `/sites/massmail`, `/sites/update`,
  `/sites/diagnostic`, `/sites/data`
- Discovered sample project pages from `/projects`, currently `/admin/sample/**`
  for home, issue list/detail/label settings/create, board list/create,
  milestone list/create, pull-request list/create/review, code, member, watcher,
  settings, webhook, delete, transfer, fork, statistics, and change-VCS
  surfaces.
- Discovered user profile page: `/admin`.

## Remaining Work Before Claiming All-Page Parity

- Compare richer DOM structure/content beyond the current anchor smoke where
  the anchor-level check is too weak to catch visual or copy drift.
- Extend discovery beyond the first project when the homelab instance contains
  multiple projects or organizations with distinct route states.
- Revisit Playwright/browser execution if Chromium local-network routing becomes
  available; browser diff remains stronger evidence for interactive UI parity.
