import { migrate } from "drizzle-orm/bun-sql/migrator";
import { fileURLToPath } from "node:url";
import { dirname, join } from "path";
import { getDb } from "./index";

export async function runMigrations() {
  const db = getDb();
  const packageRoot = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));

  const migrationsFolder = join(packageRoot, "..", "..", "drizzle", db.dbType, "migrations");

  console.log(`[Migrator] Running startup migrations for ${db.dbType} from ${migrationsFolder}`);

  // Drizzle migration typings are restrictive, we bypass strictly to migrate natively
  await migrate(db as any, { migrationsFolder });

  console.log(`[Migrator] Migrations applied successfully.`);
}
