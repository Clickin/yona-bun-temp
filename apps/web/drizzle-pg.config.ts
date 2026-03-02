import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./drizzle/pg/schema.ts",
  out: "../../drizzle/pg/migrations",
});
