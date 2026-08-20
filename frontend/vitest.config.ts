// Vitest 4 project inheritance — the dom-parity lane shares the full vite
// plugin stack (tailwindcss, tanstackRouter routeTree generation, react,
// babel/reactCompiler, `@` alias, base path) with the unit lane. Both extend
// the root config produced by the real vite config function; the
// `../wtr-compat.ts` → dom-compat alias is project-local so the chrome/WTR
// lane and unit lane never see it.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import viteConfigFn from "./vite.config";

// ponytail: sync with tests/dom-compat.ts TEST_ORIGIN (app's own fallback
// origin constant — routes/users/loginform.tsx, routes/.../code.tsx).
const TEST_ORIGIN = "http://yoram.local";

function readChromeManifest(): string[] {
  try {
    const manifest = JSON.parse(
      readFileSync(new URL("./tests/e2e-lane-manifest.json", import.meta.url), "utf8"),
    ) as { chrome?: string[] };
    return manifest.chrome ?? [];
  } catch {
    // No manifest yet — the static classifier owns regeneration; without it
    // every wtr spec would run in the dom project.
    return [];
  }
}

export default defineConfig(async (configEnv) => {
  const viteConfig = await viteConfigFn(configEnv);
  const domCompat = fileURLToPath(new URL("./tests/dom-compat.ts", import.meta.url));
  const domSetup = fileURLToPath(new URL("./tests/dom-setup.ts", import.meta.url));

  return {
    ...viteConfig,
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: "unit",
          },
        },
        {
          extends: true,
          test: {
            name: "dom-parity",
            environment: "happy-dom",
            environmentOptions: {
              // key is `happyDOM`, not the environment name `happy-dom`
              happyDOM: {
                url: TEST_ORIGIN,
              },
            },
            include: ["tests/wtr/**/*.e2e.ts"],
            // Chrome-lane specs must never resolve in the dom project; the
            // manifest is the initial split, the DOM_UNSUPPORTED guard is
            // the authority that promotes files into it (B4).
            exclude: [...readChromeManifest()],
            testTimeout: 30_000,
            setupFiles: [domSetup],
            alias: [
              // All 858 e2e specs import exactly "../wtr-compat.ts"; only the
              // dom-parity project resolves it to the happy-dom facade.
              { find: "../wtr-compat.ts", replacement: domCompat },
            ],
          },
        },
      ],
    },
  };
});
