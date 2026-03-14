import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mysql from "mysql2/promise";
import * as mysqlSchema from "@drizzle/mysql/schema";
import { SEARCH_DOCUMENT_TABLE } from "./search-projection";
import { setupMySQLTestDatabase } from "./test-utils/database";
import {
  getExpectedTableNames,
  getMigrationSqlChain,
  normalizeMySqlMigration,
  splitMigrationStatements,
} from "./test-helpers";

describe("MySQL database", () => {
  let connection: mysql.Connection;
  let cleanup: () => Promise<void>;

  beforeAll(async () => {
    const setup = await setupMySQLTestDatabase();
    cleanup = setup.cleanup;

    connection = await mysql.createConnection({ uri: setup.url, multipleStatements: true });

    const migrationSql = normalizeMySqlMigration(getMigrationSqlChain("mysql"));
    const statements = splitMigrationStatements(migrationSql);

    for (const statement of statements) {
      await connection.query(statement);
    }
  }, 120_000);

  afterAll(async () => {
    if (connection) {
      await connection.end();
    }
    if (cleanup) {
      await cleanup();
    }
  });

  it("applies all schema tables from mysql schema module", async () => {
    const expectedTables = getExpectedTableNames(mysqlSchema);
    const [rows] = await connection.query<(mysql.RowDataPacket & { table_name: string })[]>(`
      SELECT table_name AS table_name
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
    `);

    const existingTables = new Set(rows.map((row) => row.table_name));
    const missingTables = expectedTables.filter((tableName) => !existingTables.has(tableName));

    expect(expectedTables.length).toBeGreaterThan(0);
    expect(missingTables).toEqual([]);
    expect(existingTables.has("sessions")).toBe(true);
  });

  it("can insert and read n4user", async () => {
    const loginId = `node-mysql-${Date.now()}@example.com`;
    const [idRows] = await connection.query<(mysql.RowDataPacket & { next_id: number })[]>(
      "SELECT COALESCE(MAX(`id`), 0) + 1 AS next_id FROM `n4user`",
    );
    const nextId = idRows[0]?.next_id ?? 1;

    await connection.query(
      "INSERT INTO `n4user` (`id`, `login_id`, `name`, `email`, `is_guest`) VALUES (?, ?, ?, ?, ?)",
      [nextId, loginId, "Node MySQL", loginId, false],
    );

    const [users] = await connection.query<
      (mysql.RowDataPacket & { login_id: string; name: string })[]
    >("SELECT `login_id`, `name` FROM `n4user` WHERE `login_id` = ? LIMIT 1", [loginId]);

    expect(users).toHaveLength(1);
    expect(users[0]?.login_id).toBe(loginId);
    expect(users[0]?.name).toBe("Node MySQL");
  });

  it("creates unique identifier indexes for organizations and owner-scoped projects", async () => {
    const [organizationIndexes] = await connection.query<
      (mysql.RowDataPacket & { Key_name: string; Non_unique: number })[]
    >("SHOW INDEX FROM `organization` WHERE `Key_name` = 'uq_organization_name'");
    const [projectIndexes] = await connection.query<
      (mysql.RowDataPacket & { Key_name: string; Non_unique: number })[]
    >("SHOW INDEX FROM `project` WHERE `Key_name` = 'uq_project_owner_name'");

    expect(organizationIndexes.some((row) => row.Non_unique === 0)).toBe(true);
    expect(projectIndexes.some((row) => row.Non_unique === 0)).toBe(true);
  });

  it("rejects case-only duplicates for organization and project route identifiers", async () => {
    const [organizationIdRows] = await connection.query<
      (mysql.RowDataPacket & { next_id: number })[]
    >("SELECT COALESCE(MAX(`id`), 0) + 1 AS next_id FROM `organization`");
    const nextOrganizationId = organizationIdRows[0]?.next_id ?? 1;

    await connection.query("INSERT INTO `organization` (`id`, `name`, `descr`) VALUES (?, ?, ?)", [
      nextOrganizationId,
      "labs",
      "primary org",
    ]);

    await expect(
      connection.query("INSERT INTO `organization` (`id`, `name`, `descr`) VALUES (?, ?, ?)", [
        nextOrganizationId + 1,
        "LABS",
        "duplicate org",
      ]),
    ).rejects.toThrow();

    const [projectIdRows] = await connection.query<(mysql.RowDataPacket & { next_id: number })[]>(
      "SELECT COALESCE(MAX(`id`), 0) + 1 AS next_id FROM `project`",
    );
    const nextProjectId = projectIdRows[0]?.next_id ?? 1;

    await connection.query(
      "INSERT INTO `project` (`id`, `name`, `owner`, `overview`, `project_scope`, `vcs`) VALUES (?, ?, ?, ?, ?, ?)",
      [nextProjectId, "project-yona", "labs", "original project", "public", "GIT"],
    );

    await expect(
      connection.query(
        "INSERT INTO `project` (`id`, `name`, `owner`, `overview`, `project_scope`, `vcs`) VALUES (?, ?, ?, ?, ?, ?)",
        [nextProjectId + 1, "PROJECT-YONA", "LABS", "duplicate project", "public", "GIT"],
      ),
    ).rejects.toThrow();
  });

  it("creates the search projection table with a FULLTEXT index", async () => {
    const [createRows] = await connection.query<
      (mysql.RowDataPacket & { "Create Table": string; Table: string })[]
    >(`SHOW CREATE TABLE \`${SEARCH_DOCUMENT_TABLE}\``);
    const [indexRows] = await connection.query<
      (mysql.RowDataPacket & { Key_name: string; Index_type: string })[]
    >(
      `SHOW INDEX FROM \`${SEARCH_DOCUMENT_TABLE}\` WHERE \`Key_name\` = 'ft_search_document_text_49'`,
    );

    expect(createRows).toHaveLength(1);
    expect(createRows[0]?.["Create Table"] ?? "").toContain(
      "FULLTEXT KEY `ft_search_document_text_49`",
    );
    expect(indexRows.length).toBeGreaterThan(0);
    expect(indexRows.every((row) => row.Index_type === "FULLTEXT")).toBe(true);
  });
});
