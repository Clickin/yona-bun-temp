import { defineConfig } from "drizzle-kit";

const url = process.env.YONA_DB_URL ?? "mysql://root:root@127.0.0.1:3307/yona_auth";

export default defineConfig({
  dbCredentials: {
    url,
  },
  dialect: "mysql",
  out: "./drizzle/migrations",
  schema: "./drizzle/schema.ts",
  strict: true,
  verbose: true,
});
