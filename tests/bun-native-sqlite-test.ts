import { drizzle } from "drizzle-orm/bun-sql";
import { migrate } from "drizzle-orm/bun-sql/migrator";
import { SQL } from "bun";
import * as sqliteSchema from "../drizzle/sqlite/schema";

let passed = 0;
let failed = 0;

function logTest(name: string, success: boolean) {
  if (success) {
    console.log(`✓ ${name}`);
    passed++;
  } else {
    console.log(`✗ ${name}`);
    failed++;
  }
}

async function testSQLite(): Promise<boolean> {
  try {
    console.log("\n🔍 Testing SQLite...");
    const url = "sqlite::memory:";
    const client = new SQL(url);
    const db = drizzle(client, { schema: sqliteSchema });

    console.log("   Applying migrations...");
    // Apply migrations
    await migrate(db, { migrationsFolder: "drizzle/sqlite/migrations" });
    console.log("   Migrations applied");

    // Test basic query
    console.log("   Testing basic query...");
    const result = await db.execute`SELECT 1 as test`;
    const success = result.rows?.[0]?.test === 1;

    if (success) {
      console.log("   Basic query successful");
    }

    // Test table existence
    console.log("   Checking tables...");
    const tables = await db.execute`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
      ORDER BY name
      LIMIT 5
    `;

    const tableNames = tables.rows?.map((r: any) => r.name) || [];
    console.log(`   Found tables: ${tableNames.join(", ")}`);

    const hasN4user = tableNames.includes("n4user");
    const hasProject = tableNames.includes("project");
    const hasIssue = tableNames.includes("issue");

    logTest("Table n4user exists", hasN4user);
    logTest("Table project exists", hasProject);
    logTest("Table issue exists", hasIssue);

    // No cleanup needed for in-memory database

    return success && hasN4user && hasProject && hasIssue;
  } catch (error) {
    console.error(`   Error: ${error}`);
    return false;
  }
}

async function main() {
  console.log("🚀 Starting Bun Native SQLite Test\n");

  await testSQLite();

  console.log("\n" + "=".repeat(50));
  console.log(`Total: ${passed + failed} tests`);
  console.log(`✓ Passed: ${passed}`);
  console.log(`✗ Failed: ${failed}`);
  console.log("=".repeat(50));

  if (failed > 0) {
    process.exit(1);
  }
}

main();
