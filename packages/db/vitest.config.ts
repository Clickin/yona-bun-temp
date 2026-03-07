import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@drizzle/mysql/schema": fileURLToPath(
        new URL("../../drizzle/mysql/schema.ts", import.meta.url),
      ),
      "@drizzle/mysql/relations": fileURLToPath(
        new URL("../../drizzle/mysql/relations.ts", import.meta.url),
      ),
      "@drizzle/pg/schema": fileURLToPath(new URL("../../drizzle/pg/schema.ts", import.meta.url)),
      "@drizzle/pg/relations": fileURLToPath(
        new URL("../../drizzle/pg/relations.ts", import.meta.url),
      ),
      "@drizzle/sqlite/schema": fileURLToPath(
        new URL("../../drizzle/sqlite/schema.ts", import.meta.url),
      ),
      "@drizzle/sqlite/relations": fileURLToPath(
        new URL("../../drizzle/sqlite/relations.ts", import.meta.url),
      ),
    },
  },
});
