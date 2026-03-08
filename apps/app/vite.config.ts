import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";

export default defineConfig({
  resolve: {
    alias: {
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
  },
  server: {
    port: 3001,
  },
  plugins: [
    tsConfigPaths({
      ignoreConfigErrors: true,
      projects: ["./tsconfig.json"],
    }),
    tanstackStart({ srcDirectory: "src" }),
    viteReact(),
  ],
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts", "src/**/*.spec.tsx"],
  },
});
