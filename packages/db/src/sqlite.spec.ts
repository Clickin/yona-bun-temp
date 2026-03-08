import { beforeAll, describe, expect, it } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import * as sqliteSchema from "@drizzle/sqlite/schema";
import { setupSQLiteTestDatabase } from "./test-utils/database";
import { applySqliteMigrations } from "./test-helpers";

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
});
