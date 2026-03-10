import { beforeAll, describe, expect, it } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import * as sqliteSchema from "@drizzle/sqlite/schema";
import { setupSQLiteTestDatabase } from "./test-utils/database";
import { applySqliteMigrations } from "./test-helpers";

function getDefaultValue(rows: any[], columnName: string) {
  return rows.find((row) => row.name === columnName)?.dflt_value ?? null;
}

describe("SQLite database", () => {
  let db: ReturnType<(typeof drizzle)["sqlite"]>;

  beforeAll(async () => {
    const setup = await setupSQLiteTestDatabase();
    db = (drizzle as any).sqlite(setup.url, { schema: sqliteSchema });

    await applySqliteMigrations(db);
  });

  it("should connect to SQLite successfully", async () => {
    const result = await db.$client`SELECT 1 as test`;
    expect(result).toEqual([
      {
        test: 1,
      },
    ]);
  });

  it("should have expected tables created after migrations", async () => {
    const result = await db.$client`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `;

    expect(result.length).toBeGreaterThan(0);

    const tableNames = result.map((row: any) => row.name);
    expect(tableNames).toContain("n4user");
    expect(tableNames).toContain("project");
    expect(tableNames).toContain("issue");
  });

  it("retains the legacy sessions table for in-place upgrades", async () => {
    const result = await db.$client`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
      AND name = 'sessions'
    `;

    expect(result).toHaveLength(1);
  });

  it("should have n4user table structure", async () => {
    const result = await db.$client`PRAGMA table_info(n4user)`;

    const columns = result.map((row: any) => row.name);
    expect(columns).toContain("id");
    expect(columns).toContain("login_id");
    expect(columns).toContain("name");
  });

  it("should be able to insert and select from n4user", async () => {
    const testUser = {
      createdDate: new Date(0),
      lastStateModifiedDate: new Date(0),
      loginId: "test@example.com",
      name: "Test User",
      email: "test@example.com",
      isGuest: false,
      token: null,
    };

    await db.insert(sqliteSchema.n4user).values(testUser);
    const users = await db.select().from(sqliteSchema.n4user).limit(1);

    expect(users.length).toBeGreaterThan(0);
    expect(users[0].loginId).toBe("test@example.com");
    expect(users[0].name).toBe("Test User");
  });

  it("keeps new auth timestamp defaults nullable instead of NaN", async () => {
    const linkedAccountColumns = await db.$client`PRAGMA table_info(linked_account)`;
    const userCredentialColumns = await db.$client`PRAGMA table_info(user_credential)`;
    const verificationColumns = await db.$client`PRAGMA table_info(verification)`;

    expect(getDefaultValue(linkedAccountColumns, "access_token_expires_at")).not.toBe("NaN");
    expect(getDefaultValue(linkedAccountColumns, "refresh_token_expires_at")).not.toBe("NaN");
    expect(getDefaultValue(linkedAccountColumns, "created_at")).not.toBe("NaN");
    expect(getDefaultValue(linkedAccountColumns, "updated_at")).not.toBe("NaN");
    expect(getDefaultValue(userCredentialColumns, "created_at")).not.toBe("NaN");
    expect(getDefaultValue(userCredentialColumns, "updated_at")).not.toBe("NaN");
    expect(getDefaultValue(verificationColumns, "created_at")).not.toBe("NaN");
    expect(getDefaultValue(verificationColumns, "updated_at")).not.toBe("NaN");
  });

  it("creates unique identifier indexes for organizations and owner-scoped projects", async () => {
    const organizationIndexes = await db.$client`PRAGMA index_list(organization)`;
    const projectIndexes = await db.$client`PRAGMA index_list(project)`;

    expect(
      organizationIndexes.some(
        (row: { name: string; unique: number }) =>
          row.name === "uq_organization_name" && row.unique === 1,
      ),
    ).toBe(true);
    expect(
      projectIndexes.some(
        (row: { name: string; unique: number }) =>
          row.name === "uq_project_owner_name" && row.unique === 1,
      ),
    ).toBe(true);
  });

  it("rejects case-only duplicates for organization and project route identifiers", async () => {
    await db.$client`
      INSERT INTO organization (name, descr)
      VALUES ('labs', 'primary org')
    `;

    await expect(
      db.$client`
        INSERT INTO organization (name, descr)
        VALUES ('LABS', 'duplicate org')
      `,
    ).rejects.toThrow();

    await db.$client`
      INSERT INTO project (name, owner, overview, project_scope, vcs)
      VALUES ('project-yona', 'labs', 'original project', 'public', 'GIT')
    `;

    await expect(
      db.$client`
        INSERT INTO project (name, owner, overview, project_scope, vcs)
        VALUES ('PROJECT-YONA', 'LABS', 'duplicate project', 'public', 'GIT')
      `,
    ).rejects.toThrow();
  });
});
