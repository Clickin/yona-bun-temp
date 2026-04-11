---
children_hash: dd6c62ebfeb6479ed5ad364aff2b5e2dffcb3e6569e4147f28b71435a0b1172d
compression_ratio: 0.5538140020898642
condensation_order: 1
covers: [context.md, pilot_frontend_build_parity.md, pilot_issue_detail_parity.md]
covers_token_total: 1914
summary_level: d1
token_count: 1060
type: summary
---
## pilot_frontend Context Overview (`context.md`)
- **Purpose**: Keep the pilot frontend aligned with the canonical release via consistent build config, entry point, and parity suites.
- **Key integrations**: Vite pilot config (relative base + pilot route tree generation), index HTML that mounts `./src/main.tsx` into `#root`, and Vitest specs mocking pilot session services to validate `runPilotIssueStateToggle` success/failure flows.
- **Relationships**: The Vitest parity suites reference the generated route tree and pilot services, ensuring the pilot artifact mimics the canonical router/entry expectations described in the other entries.

## Pilot Build Parity Details (`pilot_frontend_build_parity.md`)
- **Task**: Align the pilot build + baseline Vitest suites with canonical app entry and router requirements.
- **Changes & Files**:
  - `apps/app/vite.pilot.config.ts`: sets `base "./"`, registers pilot shim aliases, and runs `tanstackRouterGenerator` to emit `src/pilot-routeTree.gen.ts` with relative assets.
  - `apps/app/index.html`: mounts into `<div id="root">` and loads `./src/main.tsx`, removing absolute paths.
  - Vitest specs (`-issue-detail-parity.spec.tsx`, `frontend-baseline.spec.ts`): render pilot issue shells, toggle state through `runPilotIssueStateToggle`, and assert pending/closed/error states while stripping TanStack Start/plugin dependencies and legacy rollup externals.
- **Flow**: Browser loads `index.html` → relative script runs → Vite build generates `pilot-routeTree.gen.ts` → `getRouter` renders issue detail → parity specs exercise state toggles and baseline spec ensures minimal dependency surface.
- **Highlights/Facts**: Ensures relative asset URLs, canonical mount entry, and minimal dependency set (only TanStack router plugin) plus router swap to the generated tree.

## Pilot Issue Detail Parity (`pilot_issue_detail_parity.md`)
- **Task**: Document how `-issue-detail-parity.spec.tsx` exercises `runPilotIssueStateToggle` success/failure paths while maintaining observable pilot session bootstrapping.
- **Changes & Files**:
  - Mocked pilot services (shell-data, auth, locale, etc.) render the pilot issue shell via `getRouter` + `createMemoryHistory`.
  - Bootstraps session with `readPilotSessionBootstrap` to obtain CSRF token, calls `updatePilotIssueState` within `runPilotIssueStateToggle`, and asserts both success (state closes) and failure (error observable persists).
  - Maintains baseline spec alignment by removing TanStack Start references and pointing routers to `src/pilot-routeTree.gen.ts`.
- **Flow**: Vitest spins up router, renders `/yobi/projectYobi/issues/1`, boots session (CSRF), toggles state, and observes success/error flows while baseline spec validates canonical entry/dependencies.
- **Highlights/Facts**: Success path closes the issue with expected payload; failure path surfaces `update failed` but retains pending/error states. HTML snapshot confirms pilot content (“#1 Pilot issue”, project metadata, “Close Issue”). Session bootstrap mock invoked once per toggle.

### Structural Summary
- **Build / Entry Integration Chain**: `apps/app/vite.pilot.config.ts` → `tanstackRouterGenerator` → `src/pilot-routeTree.gen.ts` → `apps/app/index.html` loading `./src/main.tsx` into `#root` (see `pilot_frontend_build_parity.md`), ensuring the pilot bundle is deployable from arbitrary base paths and matches canonical entry mounting (`context.md`).
- **Parity Test Surface**:
  - `-issue-detail-parity.spec.tsx` executes `runPilotIssueStateToggle` with mocked pilot services, asserting both success and failure observables while verifying rendered content matches production issue shells (`pilot_issue_detail_parity.md`).
  - `frontend-baseline.spec.ts` ensures the pilot build excludes TanStack Start dependencies and legacy rollup externals, points to `pilot-routeTree.gen.ts`, and maintains canonical mount expectations (`pilot_frontend_build_parity.md`).
- **Dependencies & Guarantees**: Vitest suites rely on generated route tree, mocked pilot session bootstrap, `getRouter` + memory history, and the stripped TanStack router plugin to mirror the canonical frontend surface (`context.md`, `pilot_frontend_build_parity.md`, `pilot_issue_detail_parity.md`).