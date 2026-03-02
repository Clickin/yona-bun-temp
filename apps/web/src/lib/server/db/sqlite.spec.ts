import { describe, expect, it, beforeAll } from "vitest";
import { drizzle } from "drizzle-orm/bun-sql";
import { migrate } from "drizzle-orm/bun-sql/migrator";
import { SQL } from "bun";
import * as sqliteSchema from "@drizzle/sqlite/schema";
import { setupSQLiteTestDatabase } from "../test-utils/database";

describe("SQLite database", () => {
  let db: ReturnType<typeof drizzle>;

  beforeAll(async () => {
    const setup = await setupSQLiteTestDatabase();
    const client = new SQL(setup.url);
    db = drizzle(client, { schema: sqliteSchema });

    // Apply migrations
    await migrate(db, { migrationsFolder: "drizzle/sqlite/migrations" });
  });

  // No cleanup needed for in-memory database - it's isolated per test run

  it("should connect to SQLite successfully", async () => {
    // Verify we can query the database
    const result = await db.execute(sql`SELECT 1 as test`);
    expect(result).toBeDefined();
  });

  it("should have expected tables created after migrations", async () => {
    // Check if key tables exist by querying sqlite_master
    const result = await db.execute(sql`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
      ORDER BY name
      LIMIT 5
    `);

    // Verify at least some tables exist
    expect(result.rows.length).toBeGreaterThan(0);

    // Check for specific tables that should exist
    const tableNames = result.rows.map((row: any) => row.name);
    expect(tableNames).toContain("n4user");
    expect(tableNames).toContain("project");
    expect(tableNames).toContain("issue");
  });

  it("should have n4user table structure", async () => {
    const result = await db.execute(sql`
      PRAGMA table_info(n4user)
    `);

    // Verify n4user table has expected columns
    const columns = result.rows.map((row: any) => row.name);
    expect(columns).toContain("id");
    expect(columns).toContain("loginId");
    expect(columns).toContain("name");
  });

  it("should be able to insert and select from n4user", async () => {
    const testUser = {
      loginId: "test@example.com",
      name: "Test User",
      email: "test@example.com",
      isGuest: false,
    };

    await db.insert(sqliteSchema.n4user).values(testUser);
    const users = await db.select().from(sqliteSchema.n4user).limit(1);

    expect(users.length).toBeGreaterThan(0);
    expect(users[0].loginId).toBe("test@example.com");
    expect(users[0].name).toBe("Test User");
  });
});
