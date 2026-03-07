import { migrate } from "drizzle-orm/bun-sql/migrator";
import { join } from "path";
import { getDb } from "./index";

export async function runMigrations() {
  const db = getDb();

  // Resolve migrations folder based on the current dialect
  // Path assumes running from workspace root or properly packaged SFX
  // where the original drizzle folder is preserved.
  const migrationsFolder = join(process.cwd(), "drizzle", db.dbType, "migrations");

  console.log(`[Migrator] Running startup migrations for ${db.dbType} from ${migrationsFolder}`);

  // Drizzle migration typings are restrictive, we bypass strictly to migrate natively
  await migrate(db as any, { migrationsFolder });

  console.log(`[Migrator] Migrations applied successfully.`);
}
