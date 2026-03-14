import { existsSync, readdirSync, readFileSync } from "node:fs";
import { migrate } from "drizzle-orm/bun-sql/migrator";
import { fileURLToPath } from "node:url";
import { dirname, join } from "path";
import { getDb } from "./index";

export async function runMigrations() {
  const db = getDb();
  const packageRoot = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));

  const migrationsFolder = join(packageRoot, "..", "..", "drizzle", db.dbType, "migrations");

  console.log(`[Migrator] Running startup migrations for ${db.dbType} from ${migrationsFolder}`);

  if (db.dbType === "sqlite") {
    await runSqliteMigrations(db, migrationsFolder);
    console.log(`[Migrator] Migrations applied successfully.`);
    return;
  }

  // Drizzle migration typings are restrictive, we bypass strictly to migrate natively
  await migrate(db as any, { migrationsFolder });

  console.log(`[Migrator] Migrations applied successfully.`);
}

async function runSqliteMigrations(db: ReturnType<typeof getDb>, migrationsFolder: string) {
  const client = db["$client"] as {
    unsafe: (statement: string) => Promise<Array<Record<string, unknown>>>;
  };

  await client.unsafe(
    'CREATE TABLE IF NOT EXISTS "__yona_runtime_migrations" ("id" text PRIMARY KEY NOT NULL)',
  );

  const appliedRows = await client.unsafe('SELECT "id" FROM "__yona_runtime_migrations"');
  const applied = new Set(appliedRows.map((row) => String(row.id)));
  const migrationDirs = readdirSync(migrationsFolder, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const migrationDir of migrationDirs) {
    if (applied.has(migrationDir)) {
      continue;
    }

    const migrationFile = join(migrationsFolder, migrationDir, "migration.sql");
    if (!existsSync(migrationFile)) {
      await client.unsafe(
        `INSERT INTO "__yona_runtime_migrations" ("id") VALUES ('${migrationDir}')`,
      );
      continue;
    }

    const migrationSql = readFileSync(migrationFile, "utf8");
    const statements = migrationSql
      .split("--> statement-breakpoint")
      .map((statement) =>
        statement
          .split(/\r?\n/)
          .filter((line) => !line.trim().startsWith("--"))
          .join("\n")
          .trim(),
      )
      .filter((statement) => statement.length > 0);

    for (const statement of statements) {
      try {
        await client.unsafe(statement);
      } catch (error) {
        if (!isSkippableSqliteMigrationError(error)) {
          throw error;
        }
      }
    }

    await client.unsafe(
      `INSERT INTO "__yona_runtime_migrations" ("id") VALUES ('${migrationDir}')`,
    );
  }
}

function isSkippableSqliteMigrationError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("already exists") ||
    message.includes("duplicate column name") ||
    message.includes("duplicate index name")
  );
}
