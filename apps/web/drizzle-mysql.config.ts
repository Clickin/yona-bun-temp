import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "mysql",
  schema: "./drizzle/mysql/schema.ts",
  out: "../../drizzle/mysql/migrations",
});
