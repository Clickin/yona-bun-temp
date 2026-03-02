# Issues

- `bun run check` initially failed: `$lib/paraglide/runtime` and `$lib/paraglide/server` modules missing because `src/lib/paraglide/` was empty.
  - Fix: run Paraglide compile before `svelte-check`.
- `bun run test:unit -- --run` initially failed due to missing Playwright browser (Vitest browser-playwright provider).
  - Fix: `bunx playwright install chromium`.
- Playwright under Bun (without Node on PATH) did not discover tests (`No tests found`).
  - Fix: install Node.js so Playwright/Vitest-browser can run reliably.
