import fs from "node:fs";
import path from "node:path";
import { getTableName, sql } from "drizzle-orm";

type DbType = "pg" | "mysql" | "sqlite";

function sortStrings(values: Iterable<string>): string[] {
  const sorted: string[] = [];

  for (const value of values) {
    let index = 0;
    while (index < sorted.length && sorted[index] <= value) {
      index += 1;
    }
    sorted.splice(index, 0, value);
  }

  return sorted;
}

export function getMigrationsFolder(dbType: DbType): string {
  return path.join(process.cwd(), "..", "..", "drizzle", dbType, "migrations");
}

export function getMigrationSqlChain(dbType: DbType): string {
  const migrationsFolder = getMigrationsFolder(dbType);
  const entries = sortStrings(
    fs
      .readdirSync(migrationsFolder, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name),
  );

  const migrationPaths = entries
    .map((folder: string) => path.join(migrationsFolder, folder, "migration.sql"))
    .filter((migrationPath: string) => fs.existsSync(migrationPath));

  if (migrationPaths.length === 0) {
    throw new Error(`No migration folders found for ${dbType}`);
  }

  return migrationPaths
    .map((migrationPath: string) => fs.readFileSync(migrationPath, "utf8").trim())
    .filter((sqlText: string) => sqlText.length > 0)
    .join("\n--> statement-breakpoint\n");
}

export function normalizeMySqlMigration(sqlText: string): string {
  return sqlText
    .replaceAll("DEFAULT 'NULL'", "DEFAULT NULL")
    .replaceAll("DEFAULT (NULL)", "DEFAULT NULL");
}

export function normalizePgMigration(sqlText: string): string {
  return sqlText
    .replaceAll("DEFAULT 'NULL'", "DEFAULT NULL")
    .replaceAll("DEFAULT (NULL)", "DEFAULT NULL")
    .replaceAll("current_timestamp()", "current_timestamp");
}

export function splitMigrationStatements(sqlText: string): string[] {
  return sqlText
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0)
    .filter((statement) => statement.replace(/--.*$/gm, "").trim().length > 0);
}

export function getExpectedTableNames(schemaModule: Record<string, unknown>): string[] {
  const tableNames = new Set<string>();

  for (const value of Object.values(schemaModule)) {
    try {
      const tableName = String(getTableName(value as never));
      if (tableName.length > 0) {
        tableNames.add(tableName);
      }
    } catch {
      continue;
    }
  }

  return sortStrings(tableNames);
}

export async function applySqliteMigrations(db: {
  run(query: unknown): Promise<unknown>;
}): Promise<void> {
  const migrationSql = getMigrationSqlChain("sqlite");
  const statements = splitMigrationStatements(migrationSql);

  for (const statement of statements) {
    await db.run(sql.raw(statement));
  }
}
