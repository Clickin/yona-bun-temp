# Learnings

- Bun is available; `bun install` generates `bun.lock` (text) in this repo.
- `bun run build` succeeds even when `bun run check` fails (Paraglide runtime types missing).
- Minimal branding assets copied into `static/`: `favicon.ico`, `images/yona_logo.png`, `stylesheets/yobicon/**` (preserving `fonts/` relative paths).
- Bun friendliness:
  - `package.json` `test` script should not call `npm run ...` (breaks in env without npm).
  - `playwright.config.ts` `webServer.command` should use `bun run build && bun run preview`.
- For base-safe static links, use `%sveltekit.assets%/...` in `src/app.html` and `$app/paths` `base` for runtime image `src` in Svelte components.
- Playwright/Vitest browser projects effectively require a real Node.js runtime on PATH; running Playwright purely under Bun led to `No tests found`.

- Root plan acceptance criteria checkboxes are treated as tasks: mark them only after running the corresponding command(s).
