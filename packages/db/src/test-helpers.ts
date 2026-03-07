import fs from "node:fs";
import path from "node:path";
import { getTableName } from "drizzle-orm";

type DbType = "pg" | "mysql" | "sqlite";

export function getMigrationsFolder(dbType: DbType): string {
  return path.join(process.cwd(), "..", "..", "drizzle", dbType, "migrations");
}

export function getMigrationSqlChain(dbType: DbType): string {
  const migrationsFolder = getMigrationsFolder(dbType);
  const entries = fs
    .readdirSync(migrationsFolder, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .toSorted();

  if (entries.length === 0) {
    throw new Error(`No migration folders found for ${dbType}`);
  }

  return entries
    .map((folder) => {
      const migrationPath = path.join(migrationsFolder, folder, "migration.sql");
      return fs.readFileSync(migrationPath, "utf8").trim();
    })
    .filter((sqlText) => sqlText.length > 0)
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

  return [...tableNames].toSorted();
}
