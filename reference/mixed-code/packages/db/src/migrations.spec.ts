import { describe, expect, it } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  SEARCH_DOCUMENT_TYPES,
  SEARCH_DOCUMENT_TABLE,
  SQLITE_SEARCH_DOCUMENT_BOOTSTRAP_MODE,
  SQLITE_SEARCH_DOCUMENT_FTS_TABLE,
  SQLITE_SEARCH_DOCUMENT_SYNC_MODE,
  SQLITE_SEARCH_DOCUMENT_SYNC_TRIGGERS,
} from "./search-projection";
import { getMigrationSqlChain } from "./test-helpers";

describe("Database migrations", () => {
  it("should have PostgreSQL migrations generated", () => {
    const pgMigrationsPath = path.join(process.cwd(), "..", "..", "drizzle", "pg", "migrations");
    const entries = fs.readdirSync(pgMigrationsPath);

    expect(entries.length).toBeGreaterThan(0);

    // Find the hash-based folder
    const hashFolder = entries.find((e: string) => e.length > 10 && e.includes("_"));
    expect(hashFolder).toBeDefined();

    if (hashFolder) {
      const hashFolderPath = path.join(pgMigrationsPath, hashFolder);
      const hashEntries = fs.readdirSync(hashFolderPath);
      expect(hashEntries.some((e: string) => e.endsWith("migration.sql"))).toBe(true);
      expect(hashEntries.some((e: string) => e.endsWith("snapshot.json"))).toBe(true);
    }
  });

  it("should have MySQL migrations generated", () => {
    const mysqlMigrationsPath = path.join(
      process.cwd(),
      "..",
      "..",
      "drizzle",
      "mysql",
      "migrations",
    );
    const entries = fs.readdirSync(mysqlMigrationsPath);

    expect(entries.length).toBeGreaterThan(0);

    const hashFolder = entries.find((e: string) => e.length > 10 && e.includes("_"));
    expect(hashFolder).toBeDefined();

    if (hashFolder) {
      const hashFolderPath = path.join(mysqlMigrationsPath, hashFolder);
      const hashEntries = fs.readdirSync(hashFolderPath);
      expect(hashEntries.some((e: string) => e.endsWith("migration.sql"))).toBe(true);
      expect(hashEntries.some((e: string) => e.endsWith("snapshot.json"))).toBe(true);
    }
  });

  it("should have SQLite migrations generated", () => {
    const sqliteMigrationsPath = path.join(
      process.cwd(),
      "..",
      "..",
      "drizzle",
      "sqlite",
      "migrations",
    );
    const entries = fs.readdirSync(sqliteMigrationsPath);

    expect(entries.length).toBeGreaterThan(0);

    const hashFolder = entries.find((e: string) => e.length > 10 && e.includes("_"));
    expect(hashFolder).toBeDefined();

    if (hashFolder) {
      const hashFolderPath = path.join(sqliteMigrationsPath, hashFolder);
      const hashEntries = fs.readdirSync(hashFolderPath);
      expect(hashEntries.some((e: string) => e.endsWith("migration.sql"))).toBe(true);
      expect(hashEntries.some((e: string) => e.endsWith("snapshot.json"))).toBe(true);
    }
  });

  it("adds bounded search projection storage and SQLite external-content backfill flow for all dialects", () => {
    const pgMigrationSql = getMigrationSqlChain("pg");
    const mysqlMigrationSql = getMigrationSqlChain("mysql");
    const sqliteMigrationSql = getMigrationSqlChain("sqlite");

    expect(pgMigrationSql).toContain(`CREATE TABLE "${SEARCH_DOCUMENT_TABLE}"`);
    expect(pgMigrationSql).toContain("tsvector GENERATED ALWAYS AS");
    expect(pgMigrationSql).toContain("USING gin");

    expect(mysqlMigrationSql).toContain(`CREATE TABLE \`${SEARCH_DOCUMENT_TABLE}\``);
    expect(mysqlMigrationSql).toContain("CREATE FULLTEXT INDEX");

    expect(SEARCH_DOCUMENT_TYPES).toEqual([
      "user",
      "project",
      "issue",
      "posting",
      "review_comment",
    ]);
    expect(sqliteMigrationSql).toContain(`CREATE TABLE "${SEARCH_DOCUMENT_TABLE}"`);
    expect(sqliteMigrationSql).toContain(
      `CREATE VIRTUAL TABLE "${SQLITE_SEARCH_DOCUMENT_FTS_TABLE}" USING fts5`,
    );
    expect(SQLITE_SEARCH_DOCUMENT_SYNC_MODE).toBe("external-content");
    expect(sqliteMigrationSql).toContain("content='search_document'");
    expect(SQLITE_SEARCH_DOCUMENT_BOOTSTRAP_MODE).toContain("backfill");
    expect(sqliteMigrationSql).toContain("VALUES ('rebuild')");
    for (const triggerName of SQLITE_SEARCH_DOCUMENT_SYNC_TRIGGERS) {
      expect(sqliteMigrationSql).toContain(`CREATE TRIGGER "${triggerName}"`);
    }
  });
});
