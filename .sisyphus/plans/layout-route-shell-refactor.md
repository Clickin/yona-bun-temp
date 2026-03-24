# Layout Route Shell Refactor

## Goal

Move the common app shell and locale switch out of `apps/app/src/routes/__root.tsx` into a TanStack Router pathless layout route, while keeping `__root.tsx` responsible for document, SSR locale, head metadata, and providers.

## Why

- TanStack Start and TanStack Router guidance treat `__root.tsx` as the document/root provider boundary.
- Shared UI chrome belongs in layout routes, especially pathless layout routes when no URL segment should be added.
- The current app shell and locale switch are global concerns that should be owned by a common layout rather than by the root document route.

## Scope

- In scope:
  - `apps/app/src/routes/__root.tsx`
  - new pathless layout route file(s) under `apps/app/src/routes`
  - route file ownership/naming needed to reparent shell-bearing UI routes under the new layout
  - route tests affected by route ownership changes
  - route tree regeneration
- Out of scope:
  - API route behavior
  - page-level redesigns
  - auth form internals except for route nesting/ownership if needed

## Official Pattern To Follow

- `__root.tsx` keeps `<html>`, `<head>`, `<HeadContent />`, `<Scripts />`, provider wiring, and root loaders.
- A pathless layout route such as `_app.tsx` owns common shell UI and renders `<Outlet />`.
- Auth-only pages can remain direct children of `__root` if they should not inherit the common app shell.

## Target Structure

### Keep under `__root`

- document/head/provider wiring
- locale loader and SSR locale propagation
- not-found page
- auth/public pages without the app shell:
  - `/login`
  - `/register`
  - `/forgot-password`
  - `/reset-password`
- debug/test page: `/protected`
- all `/api/*` routes

### Move under `_app` pathless layout

- `/`
- `/search`
- `/me`
- `/me/settings`
- `/users/$loginId`
- `/projects/new`
- `/organizations/new`
- `/organizations/$organizationName`
- `/organizations/$organizationName/settings`
- `/$owner/$projectName` and all current project children

## Implementation Steps

### Step 1 - Add pathless app layout

- Create `apps/app/src/routes/_app.tsx`.
- Move the current global navbar, locale switch, footer, and `<main className="app-page">` shell from `__root.tsx` into this layout route.
- Keep the locale switch implementation unchanged in behavior: preserve current route/search by replacing only `lang` in the current href.
- Use `<Outlet />` inside the shell body.

Success criteria:

- `_app.tsx` contains the current global shell UI.
- `__root.tsx` no longer renders the app shell.

### Step 2 - Slim down `__root.tsx`

- Keep root loader, i18n provider, `RootDocument`, and not-found rendering in `__root.tsx`.
- Replace the app-shell body with a plain `<Outlet />` beneath the provider/document boundary.

Success criteria:

- `__root.tsx` only owns root/document concerns.
- SSR locale/head behavior remains unchanged.

### Step 3 - Reparent UI routes under `_app`

- Rename/move current shell-bearing UI routes so the file-based router nests them under `_app`.
- Do not reparent auth pages, debug/test route, or API routes.
- Preserve each route's loader/beforeLoad/component implementation; only change route ownership/nesting.

Success criteria:

- Generated route tree shows shell-bearing UI routes under `_app`.
- Auth and API routes remain direct children of `__root`.

### Step 4 - Regenerate route tree and update tests

- Regenerate `apps/app/src/routeTree.gen.ts` using the repo’s existing generator command/path.
- Update route tests/specs only where file names, ids, or shell ownership changed.

Success criteria:

- Route tests refer to the new ownership/nesting correctly.

## Verification

- `lsp_diagnostics` on all changed route files: zero issues.
- `bun run --cwd apps/app test:unit -- src/router.spec.tsx`
- `bun run test`
- `bun run check`
- `bun run build`
- HTML fetch QA against key public pages to ensure the app shell still renders where expected and auth pages remain outside it.

## Risks

- File-route naming mistakes could unexpectedly change URLs or route ids.
- Over-reparenting could accidentally wrap auth or API routes in the common shell.
- Route tree generation drift could break tests if file names are inconsistent.

## Mitigations

- Keep auth/API/debug routes untouched.
- Move only the shared shell code, not page internals.
- Verify generated route tree after the rename step before broader testing.
