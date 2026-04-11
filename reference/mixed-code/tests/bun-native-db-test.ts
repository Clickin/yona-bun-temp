import { MySqlContainer } from "@testcontainers/mysql";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { SQL } from "bun";
import {
  drizzle as drizzleMysql,
  drizzle as drizzlePg,
  drizzle as drizzleSqlite,
} from "drizzle-orm/bun-sql";
import { migrate } from "drizzle-orm/bun-sql/migrator";
import * as mysqlSchema from "../drizzle/mysql/schema";
import * as pgSchema from "../drizzle/pg/schema";
import * as sqliteSchema from "../drizzle/sqlite/schema";

interface TestResult {
  name: string;
  database: string;
  success: boolean;
  error?: string;
  duration: number;
}

async function testPostgres(): Promise<TestResult> {
  const startTime = Date.now();
  try {
    console.log("\n🔍 Testing PostgreSQL...");
    const container = await new PostgreSqlContainer().start();
    const url = container.getConnectionUri();
    console.log(`   Connected to: ${url}`);

    const client = new SQL(url);
    const db = drizzlePg(client, { schema: pgSchema });

    console.log("   Applying migrations...");
    await migrate(db, { migrationsFolder: "drizzle/pg/migrations" });
    console.log("   ✅ Migrations applied");

    console.log("   Testing basic query...");
    const result = await db.execute`SELECT 1 as test`;
    const success = result.rows?.[0]?.test === 1;

    if (success) {
      console.log("   ✅ Basic query successful");
    }

    // Test table existence
    console.log("   Checking tables...");
    const tables = await db.execute`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      LIMIT 5
    `;
    const tableNames = tables.rows?.map((r: any) => r.table_name) || [];
    console.log(`   Found tables: ${tableNames.join(", ")}`);

    const hasN4user = tableNames.includes("n4user");
    const hasProject = tableNames.includes("project");

    await container.stop();
    client.close();

    return {
      name: "PostgreSQL",
      database: "postgresql",
      success: success && hasN4user && hasProject,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      name: "PostgreSQL",
      database: "postgresql",
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
    };
  }
}

async function testMySQL(): Promise<TestResult> {
  const startTime = Date.now();
  try {
    console.log("\n🔍 Testing MySQL...");
    const container = await new MySqlContainer().start();
    const url = container.getConnectionUri();
    console.log(`   Connected to: ${url}`);

    const client = new SQL(url);
    const db = drizzleMysql(client, { schema: mysqlSchema, mode: "default" });

    console.log("   Applying migrations...");
    await migrate(db, { migrationsFolder: "drizzle/mysql/migrations" });
    console.log("   ✅ Migrations applied");

    console.log("   Testing basic query...");
    const result = await db.execute`SELECT 1 as test`;
    const success = result.rows?.[0]?.test === 1;

    if (success) {
      console.log("   ✅ Basic query successful");
    }

    // Test table existence
    console.log("   Checking tables...");
    const tables = await db.execute`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      LIMIT 5
    `;
    const tableNames = tables.rows?.map((r: any) => r.table_name) || [];
    console.log(`   Found tables: ${tableNames.join(", ")}`);

    const hasN4user = tableNames.includes("n4user");
    const hasProject = tableNames.includes("project");

    await container.stop();
    client.close();

    return {
      name: "MySQL",
      database: "mysql",
      success: success && hasN4user && hasProject,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      name: "MySQL",
      database: "mysql",
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
    };
  }
}

async function testSQLite(): Promise<TestResult> {
  const startTime = Date.now();
  try {
    console.log("\n🔍 Testing SQLite (in-memory)...");
    const url = "sqlite::memory:";
    const client = new SQL(url);
    const db = drizzleSqlite(client, { schema: sqliteSchema });

    console.log("   Applying migrations...");
    await migrate(db, { migrationsFolder: "drizzle/sqlite/migrations" });
    console.log("   ✅ Migrations applied");

    console.log("   Testing basic query...");
    const result = await db.execute`SELECT 1 as test`;
    const success = result.rows?.[0]?.test === 1;

    if (success) {
      console.log("   ✅ Basic query successful");
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

    client.close();

    return {
      name: "SQLite",
      database: "sqlite",
      success: success && hasN4user && hasProject,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      name: "SQLite",
      database: "sqlite",
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
    };
  }
}

async function runParallelTests() {
  console.log("🚀 Starting Parallel Database Tests");
  console.log("Running PostgreSQL, MySQL, and SQLite tests concurrently...\n");

  const results = await Promise.all([testPostgres(), testMySQL(), testSQLite()]);

  return results;
}

function displayResults(results: TestResult[]) {
  console.log("\n" + "=".repeat(70));
  console.log("TEST RESULTS");
  console.log("=".repeat(70));

  const passed = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  for (const result of results) {
    if (result.success) {
      console.log(`✓ ${result.name}: PASSED (${result.duration}ms)`);
    } else {
      console.log(`✗ ${result.name}: FAILED (${result.duration}ms)`);
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
    }
  }

  console.log("=".repeat(70));
  console.log(`Total: ${results.length} tests`);
  console.log(`✓ Passed: ${passed.length}`);
  console.log(`✗ Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log("\nDocker is required for PostgreSQL and MySQL tests.");
    console.log("Start Docker Desktop and try again.");
    process.exit(1);
  }
}

async function main() {
  try {
    const results = await runParallelTests();
    displayResults(results);

    console.log("\n✅ All tests completed!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Fatal error during test execution:", error);
    process.exit(1);
  }
}

main();
