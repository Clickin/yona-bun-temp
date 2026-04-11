---
title: Pilot Frontend Build Parity
tags: []
keywords: []
importance: 60
recency: 1
maturity: draft
updateCount: 2
createdAt: '2026-04-06T14:18:29.365Z'
updatedAt: '2026-04-06T14:21:43.144Z'
---
## Raw Concept
**Task:**
Document how the pilot frontend build config plus baseline Vitest suites keep the pilot release aligned with the canonical app entry and router requirements.

**Changes:**
- Set base "./" in apps/app/vite.pilot.config.ts, register pilot shim aliases, and run tanstackRouterGenerator so the build emits src/pilot-routeTree.gen.ts with relative assets.
- Align apps/app/index.html to mount into #root and load ./src/main.tsx so the pilot artifact stays safe to serve from any base path.
- Add Vitest parity specs that render the pilot issue detail shell, toggle state through runPilotIssueStateToggle while mocking pilot services, and assert the shell surfaces pending, closed, and error states.
- Verify the frontend-baseline suite removes @tanstack/react-start dependencies/plugins, switches the router to src/pilot-routeTree.gen.ts, and avoids rollup externals or obsolete dependencies like @trpc/server and @yona/auth.

**Files:**
- apps/app/vite.pilot.config.ts
- apps/app/index.html
- apps/app/src/routes/-issue-detail-parity.spec.tsx
- apps/app/src/frontend-baseline.spec.ts

**Flow:**
Browser loads apps/app/index.html -> relative script ./src/main.tsx runs -> Vite pilot build uses tanstackRouterGenerator to produce src/pilot-routeTree.gen.ts -> getRouter renders the issue detail route -> Vitest parity specs boot the pilot session via runPilotIssueStateToggle (CSRF bootstrap -> updatePilotIssueState -> error observable) to exercise success/failure flows while the baseline spec ensures only @tanstack/router-plugin/vite and pilot assets remain.

**Timestamp:** 2026-04-06

## Narrative
### Structure
apps/app/vite.pilot.config.ts defines base "./", root path aliases, and tanstackRouterGenerator that outputs src/pilot-routeTree.gen.ts with pilot routes while apps/app/index.html loads ./src/main.tsx into the canonical #root container so the entire pilot bundle can be served from arbitrary base paths.

### Dependencies
Vitest parity suites create memory routers via getRouter with createMemoryHistory, mock @app/lib/{shell-data,auth,locale,pilot-connect,pilot-session,project,issue} to control CSRF tokens and issue payloads, and rely on @tanstack/router-plugin/vite plus the generated pilot route tree to render issue detail shells.

### Highlights
The frontend-baseline spec ensures @tanstack/react-start dependencies/plugins are absent, the active router points to ./pilot-routeTree.gen.ts, and legacy rollup externals along with @trpc/server and @yona/auth references are removed so the pilot build stays lean; -issue-detail-parity.spec.tsx renders the pilot issue shell (#1 Pilot issue, yobi, projectYobi, State: open, Close Issue) and toggles runPilotIssueStateToggle to cover success and failure observables.

## Facts
- **pilot_build_asset_urls**: vite.pilot.config.ts sets base "./" and registers pilot shim aliases so the pilot build produces relative asset URLs that work from single-file artifacts. [project]
- **pilot_html_entry**: apps/app/index.html mounts into <div id="root"></div> and loads ./src/main.tsx so the pilot entry point avoids absolute paths. [project]
- **pilot_baseline_dependencies**: frontend-baseline.spec.ts ensures @tanstack/react-start dependencies/plugins and rollupOptions are absent so the pilot build only depends on @tanstack/router-plugin/vite for route generation. [environment]
- **pilot_router_entry**: frontend-baseline.spec.ts verifies the active router swap to ./pilot-routeTree.gen.ts and that index.html only contains <div id="root"></div>, reinforcing canonical mounting. [project]
