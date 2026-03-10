import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import * as pgSchema from "@drizzle/pg/schema";
import { setupPostgresTestDatabase } from "./test-utils/database";
import {
  getExpectedTableNames,
  getMigrationSqlChain,
  normalizePgMigration,
  splitMigrationStatements,
} from "./test-helpers";

describe("PostgreSQL database", () => {
  let pool: Pool;
  let cleanup: () => Promise<void>;

  beforeAll(async () => {
    const setup = await setupPostgresTestDatabase();
    cleanup = setup.cleanup;

    const url = new URL(setup.url);
    pool = new Pool({
      host: url.hostname,
      port: Number(url.port),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.slice(1),
    });

    const migrationSql = normalizePgMigration(getMigrationSqlChain("pg"));
    const statements = splitMigrationStatements(migrationSql);
    for (const statement of statements) {
      try {
        await pool.query(statement);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (
          message.includes("already exists") ||
          message.includes("no unique constraint matching given keys")
        ) {
          continue;
        }
        throw error;
      }
    }
  }, 120_000);

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
    if (cleanup) {
      await cleanup();
    }
  });

  it("applies all schema tables from pg schema module", async () => {
    const expectedTables = getExpectedTableNames(pgSchema);
    const result = await pool.query<{ table_name: string }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);

    const existingTables = new Set(
      result.rows.map((row: { table_name: string }) => row.table_name),
    );
    const missingTables = expectedTables.filter((tableName) => !existingTables.has(tableName));

    expect(expectedTables.length).toBeGreaterThan(0);
    expect(missingTables).toEqual([]);
    expect(existingTables.has("sessions")).toBe(true);
  });

  it("can insert and read n4user", async () => {
    const loginId = `node-pg-${Date.now()}@example.com`;

    await pool.query(
      `INSERT INTO "n4user" ("login_id", "name", "email", "is_guest") VALUES ($1, $2, $3, $4)`,
      [loginId, "Node PG", loginId, false],
    );

    const users = await pool.query<{ loginId: string; name: string }>(
      `SELECT "login_id" AS "loginId", "name" FROM "n4user" WHERE "login_id" = $1 LIMIT 1`,
      [loginId],
    );

    expect(users.rows).toHaveLength(1);
    expect(users.rows[0]?.loginId).toBe(loginId);
    expect(users.rows[0]?.name).toBe("Node PG");
  });

  it("creates unique identifier indexes for organizations and owner-scoped projects", async () => {
    const indexes = await pool.query<{ indexdef: string; indexname: string }>(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname IN ('uq_organization_name', 'uq_project_owner_name')
      ORDER BY indexname
    `);

    expect(indexes.rows).toHaveLength(2);
    expect(indexes.rows[0]?.indexdef ?? indexes.rows[1]?.indexdef).toContain("UNIQUE INDEX");
  });

  it("rejects case-only duplicates for organization and project route identifiers", async () => {
    await pool.query(`INSERT INTO "organization" ("name", "descr") VALUES ($1, $2)`, [
      "labs",
      "primary org",
    ]);

    await expect(
      pool.query(`INSERT INTO "organization" ("name", "descr") VALUES ($1, $2)`, [
        "LABS",
        "duplicate org",
      ]),
    ).rejects.toThrow();

    await pool.query(
      `INSERT INTO "project" ("name", "owner", "overview", "project_scope", "vcs") VALUES ($1, $2, $3, $4, $5)`,
      ["project-yona", "labs", "original project", "public", "GIT"],
    );

    await expect(
      pool.query(
        `INSERT INTO "project" ("name", "owner", "overview", "project_scope", "vcs") VALUES ($1, $2, $3, $4, $5)`,
        ["PROJECT-YONA", "LABS", "duplicate project", "public", "GIT"],
      ),
    ).rejects.toThrow();
  });
});
