import { describe, expect, it, afterEach, beforeAll } from "vitest";
import { drizzle } from "drizzle-orm/bun-sql";
import { migrate } from "drizzle-orm/bun-sql/migrator";
import { SQL } from "bun";
import * as mysqlSchema from "@drizzle/mysql/schema";
import { setupMySQLTestDatabase } from "../test-utils/database";

describe("MySQL database", () => {
  let db: ReturnType<typeof drizzle>;
  let cleanup: () => Promise<void>;

  beforeAll(async () => {
    const setup = await setupMySQLTestDatabase();
    const client = new SQL(setup.url);
    db = drizzle(client, { schema: mysqlSchema, mode: "default" });
    cleanup = setup.cleanup;

    // Apply migrations
    await migrate(db, { migrationsFolder: "drizzle/mysql/migrations" });
  });

  afterEach(async () => {
    // Clean up container after all tests
    await cleanup();
  });

  it("should connect to MySQL successfully", async () => {
    // Verify we can query the database
    const result = await db.execute(sql`SELECT 1 as test`);
    expect(result).toBeDefined();
  });

  it("should have expected tables created after migrations", async () => {
    // Check if key tables exist by attempting to query them
    const result = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      ORDER BY table_name
      LIMIT 5
    `);

    // Verify at least some tables exist
    expect(result.rows.length).toBeGreaterThan(0);

    // Check for specific tables that should exist
    const tableNames = result.rows.map((row: any) => row.table_name);
    expect(tableNames).toContain("n4user");
    expect(tableNames).toContain("project");
    expect(tableNames).toContain("issue");
  });

  it("should have n4user table structure", async () => {
    const result = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'n4user'
      ORDER BY ordinal_position
      LIMIT 3
    `);

    // Verify n4user table has expected columns
    const columns = result.rows.map((row: any) => row.column_name);
    expect(columns).toContain("id");
    expect(columns).toContain("login_id");
    expect(columns).toContain("name");
  });

  it("should be able to insert and select from n4user", async () => {
    const testUser = {
      loginId: "test@example.com",
      name: "Test User",
      email: "test@example.com",
      isGuest: false,
    };

    await db.insert(mysqlSchema.n4user).values(testUser);
    const users = await db.select().from(mysqlSchema.n4user).limit(1);

    expect(users.length).toBeGreaterThan(0);
    expect(users[0].loginId).toBe("test@example.com");
    expect(users[0].name).toBe("Test User");
  });
});
