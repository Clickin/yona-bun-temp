import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";

export default defineConfig({
  root: fileURLToPath(new URL("./", import.meta.url)),
  resolve: {
    alias: {
      "@yona/auth/better-auth": fileURLToPath(
        new URL("../../reference/mixed-code/packages/auth/src/better-auth.ts", import.meta.url),
      ),
      "@yona/contracts": fileURLToPath(
        new URL("../../reference/mixed-code/packages/contracts/src/index.ts", import.meta.url),
      ),
      "@yona/db": fileURLToPath(new URL("../../reference/mixed-code/packages/db/src/index.ts", import.meta.url)),
      "@yona/domain": fileURLToPath(new URL("../../reference/mixed-code/packages/domain/src/index.ts", import.meta.url)),
      "@yona/integrations": fileURLToPath(
        new URL("../../reference/mixed-code/packages/integrations/src/index.ts", import.meta.url),
      ),
      "@yona/vcs": fileURLToPath(new URL("../../reference/mixed-code/packages/vcs/src/index.ts", import.meta.url)),
      "@drizzle/mysql/relations": fileURLToPath(
        new URL("../../drizzle/mysql/relations.ts", import.meta.url),
      ),
      "@drizzle/mysql/schema": fileURLToPath(
        new URL("../../drizzle/mysql/schema.ts", import.meta.url),
      ),
      "@drizzle/pg/relations": fileURLToPath(
        new URL("../../drizzle/pg/relations.ts", import.meta.url),
      ),
      "@drizzle/pg/schema": fileURLToPath(new URL("../../drizzle/pg/schema.ts", import.meta.url)),
      "@drizzle/sqlite/relations": fileURLToPath(
        new URL("../../drizzle/sqlite/relations.ts", import.meta.url),
      ),
      "@drizzle/sqlite/schema": fileURLToPath(
        new URL("../../drizzle/sqlite/schema.ts", import.meta.url),
      ),
    },
    tsconfigPaths: true,
  },
  server: {
    port: 3001,
  },
  plugins: [tanstackStart({ srcDirectory: "src" }), viteReact()],
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts", "src/**/*.spec.tsx"],
  },
});
