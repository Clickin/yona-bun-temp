import fs from "node:fs";
import path from "node:path";
import {
  drizzle as drizzleMysql,
  drizzle as drizzlePg,
  drizzle as drizzleSqlite,
} from "drizzle-orm/bun-sql";
import { getTableName, sql } from "drizzle-orm";
import * as mysqlSchema from "../drizzle/mysql/schema";
import * as pgSchema from "../drizzle/pg/schema";
import * as sqliteSchema from "../drizzle/sqlite/schema";

type Dialect = "pg" | "mysql" | "sqlite";

function readArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value?.slice(prefix.length);
}

function expectedTableNames(schemaModule: Record<string, unknown>): string[] {
  const names = new Set<string>();
  for (const value of Object.values(schemaModule)) {
    try {
      const tableName = String(getTableName(value as never));
      if (tableName.length > 0) {
        names.add(tableName);
      }
    } catch {
      continue;
    }
  }
  return [...names].sort();
}

function getLatestMigrationSql(dialect: Dialect): string {
  const migrationsDir = path.join(process.cwd(), "drizzle", dialect, "migrations");
  const entries = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const latest = entries.at(-1);
  if (!latest) {
    throw new Error(`No migration folder found for ${dialect}`);
  }

  const migrationPath = path.join(migrationsDir, latest, "migration.sql");
  return fs.readFileSync(migrationPath, "utf8");
}

function normalizeMigrationSql(dialect: Dialect, rawSql: string): string {
  let sqlText = replaceAllText(rawSql, "DEFAULT 'NULL'", "DEFAULT NULL");
  sqlText = replaceAllText(sqlText, "DEFAULT (NULL)", "DEFAULT NULL");

  if (dialect === "pg") {
    sqlText = replaceAllText(sqlText, "current_timestamp()", "current_timestamp");
  }

  if (dialect === "sqlite") {
    sqlText = replaceAllText(sqlText, "DEFAULT NaN", "DEFAULT NULL");
  }

  return sqlText;
}

function splitStatements(sqlText: string): string[] {
  return sqlText
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

function replaceAllText(source: string, search: string, replacement: string): string {
  return source.split(search).join(replacement);
}

async function applyMigrationStatements(
  dialect: Dialect,
  execute: (statement: string) => Promise<unknown>,
): Promise<void> {
  const normalized = normalizeMigrationSql(dialect, getLatestMigrationSql(dialect));
  const statements = splitStatements(normalized);

  for (const statement of statements) {
    try {
      await execute(statement);
    } catch (error) {
      if (dialect === "pg") {
        const message = collectErrorText(error);
        if (
          message.includes("already exists") ||
          message.includes("no unique constraint matching given keys")
        ) {
          continue;
        }
      }
      throw error;
    }
  }
}

function collectErrorText(error: unknown): string {
  if (error instanceof Error) {
    const maybeCause = (error as { cause?: unknown }).cause;
    const causeText = maybeCause ? collectErrorText(maybeCause) : "";
    return `${error.message} ${causeText}`.trim();
  }
  return String(error);
}

function readTableNames(rows: unknown[] | undefined): string[] {
  if (!rows) {
    return [];
  }
  const names = rows
    .map((row) => {
      if (!row || typeof row !== "object") {
        return "";
      }
      const first = Object.values(row as Record<string, unknown>)[0];
      return String(first ?? "");
    })
    .filter((name) => name.length > 0);
  return [...new Set(names)].sort();
}

function toRows(result: unknown): unknown[] {
  if (Array.isArray(result)) {
    return result;
  }

  if (result && typeof result === "object") {
    const rows = (result as { rows?: unknown[] }).rows;
    if (Array.isArray(rows)) {
      return rows;
    }
  }

  return [];
}

async function runPg(url: string) {
  const db = drizzlePg(url);
  await applyMigrationStatements("pg", async (statement) => db.execute(sql.raw(statement)));

  const tableResult = await db.execute(
    sql.raw("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"),
  );
  const existingTables = readTableNames(toRows(tableResult));
  const expectedTables = expectedTableNames(pgSchema);
  const missingTables = expectedTables.filter((name) => !existingTables.includes(name));

  await db.execute(
    sql.raw("CREATE TABLE IF NOT EXISTS tc_probe (id bigint PRIMARY KEY, value text NOT NULL)"),
  );
  await db.execute(sql.raw("DELETE FROM tc_probe"));
  await db.execute(sql.raw("INSERT INTO tc_probe (id, value) VALUES (1, 'ok-pg')"));
  await db.execute(sql.raw("SELECT 1"));
  return {
    dialect: "pg",
    expectedTables: expectedTables.length,
    existingTables: existingTables.length,
    missingTables,
  };
}

async function runMySql(url: string) {
  const db = drizzleMysql(url);
  await applyMigrationStatements("mysql", async (statement) => db.execute(sql.raw(statement)));

  const tableResult = await db.execute(
    sql.raw("SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()"),
  );
  const existingTables = readTableNames(toRows(tableResult));
  const expectedTables = expectedTableNames(mysqlSchema);
  const missingTables = expectedTables.filter((name) => !existingTables.includes(name));

  await db.execute(
    sql.raw("CREATE TABLE IF NOT EXISTS tc_probe (id bigint PRIMARY KEY, value text NOT NULL)"),
  );
  await db.execute(sql.raw("DELETE FROM tc_probe"));
  await db.execute(sql.raw("INSERT INTO tc_probe (id, value) VALUES (1, 'ok-mysql')"));
  await db.execute(sql.raw("SELECT 1"));
  return {
    dialect: "mysql",
    expectedTables: expectedTables.length,
    existingTables: existingTables.length,
    missingTables,
  };
}

async function runSqlite() {
  const db = drizzleSqlite("sqlite::memory:");
  await applyMigrationStatements("sqlite", async (statement) => db.execute(sql.raw(statement)));

  const tableResult = await db.execute(
    sql.raw("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"),
  );
  const existingTables = readTableNames(toRows(tableResult));
  const expectedTables = expectedTableNames(sqliteSchema);
  const missingTables = expectedTables.filter((name) => !existingTables.includes(name));

  await db.execute(
    sql.raw("CREATE TABLE IF NOT EXISTS tc_probe (id integer PRIMARY KEY, value text NOT NULL)"),
  );
  await db.execute(sql.raw("DELETE FROM tc_probe"));
  await db.execute(sql.raw("INSERT INTO tc_probe (id, value) VALUES (1, 'ok-sqlite')"));
  await db.execute(sql.raw("SELECT 1"));
  return {
    dialect: "sqlite",
    expectedTables: expectedTables.length,
    existingTables: existingTables.length,
    missingTables,
  };
}

async function main() {
  const dialect = readArg("dialect") as Dialect | undefined;
  const url = readArg("url");

  if (!dialect) {
    throw new Error("Missing --dialect argument");
  }

  let result: {
    dialect: string;
    expectedTables: number;
    existingTables: number;
    missingTables: string[];
  };
  if (dialect === "pg") {
    if (!url) {
      throw new Error("Missing --url argument for pg");
    }
    result = await runPg(url);
  } else if (dialect === "mysql") {
    if (!url) {
      throw new Error("Missing --url argument for mysql");
    }
    result = await runMySql(url);
  } else {
    result = await runSqlite();
  }

  if (result.missingTables.length > 0) {
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(result, null, 2));
}

await main();
