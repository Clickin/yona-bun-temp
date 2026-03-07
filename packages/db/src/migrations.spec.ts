import { describe, expect, it } from "vitest";
import * as fs from "fs";
import * as path from "path";

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
});
