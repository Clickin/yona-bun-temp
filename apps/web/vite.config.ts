import { paraglideVitePlugin } from "@inlang/paraglide-js";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import { sveltekit } from "@sveltejs/kit/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
    paraglideVitePlugin({ project: "./project.inlang", outdir: "./src/lib/paraglide" }),
  ],
  resolve: {
    alias: {
      "@app": fileURLToPath(new URL("../app/src", import.meta.url)),
      "@yona/core": fileURLToPath(new URL("../../packages/core/src/index.ts", import.meta.url)),
      "@yona/api": fileURLToPath(new URL("../../packages/api/src/index.ts", import.meta.url)),
      "@yona/infra": fileURLToPath(new URL("../../packages/infra/src/index.ts", import.meta.url)),
      "@yona/db": fileURLToPath(new URL("../../packages/db/src/index.ts", import.meta.url)),
      "@yona/vcs": fileURLToPath(new URL("../../packages/vcs/src/index.ts", import.meta.url)),
      "@web": fileURLToPath(new URL("./src", import.meta.url)),
      "@core": fileURLToPath(new URL("../../packages/core/src", import.meta.url)),
      "@api": fileURLToPath(new URL("../../packages/api/src", import.meta.url)),
      "@infra": fileURLToPath(new URL("../../packages/infra/src", import.meta.url)),
      "@drizzle": fileURLToPath(new URL("../../drizzle", import.meta.url)),
      bun: fileURLToPath(new URL("./src/lib/server/bun-shim.ts", import.meta.url)),
    },
  },
  ssr: {
    noExternal: ["@yona/core", "@yona/api", "@yona/infra", "@yona/db", "@yona/vcs"],
  },
  test: {
    expect: { requireAssertions: true },
    coverage: {
      provider: "v8",
      allowExternal: true,
      include: ["src/**/*.ts", "../../packages/infra/src/git/**/*.ts"],
      exclude: ["src/lib/server/git/*.ts"],
    },
    projects: [
      {
        extends: "./vite.config.ts",
        test: {
          name: "client",
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: "chromium", headless: true }],
          },
          include: ["src/**/*.svelte.{test,spec}.{js,ts}"],
          exclude: ["src/lib/server/**"],
        },
      },

      {
        extends: "./vite.config.ts",
        test: {
          name: "server",
          environment: "node",
          include: ["src/**/*.{test,spec}.{js,ts}"],
          exclude: ["src/**/*.svelte.{test,spec}.{js,ts}"],
        },
      },
    ],
  },
});


