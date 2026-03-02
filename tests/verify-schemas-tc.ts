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

async function main() {
  console.log("[Test] Starting Postgres container...");
  const pgContainer = await new PostgreSqlContainer().start();
  const pgUrl = pgContainer.getConnectionUri();
  console.log("[Test] Postgres available at:", pgUrl);

  console.log("[Test] Starting MySQL container...");
  const mysqlContainer = await new MySqlContainer().start();
  const mysqlUrl = mysqlContainer.getConnectionUri();
  console.log("[Test] MySQL available at:", mysqlUrl);

  try {
    // 1. PostgreSQL Verification
    console.log("[Test] Validating PostgreSQL Schema Migrations...");
    const pgClient = new SQL(pgUrl);
    const pgDb = drizzlePg(pgClient, { schema: pgSchema });
    await migrate(pgDb, { migrationsFolder: "./drizzle/pg/migrations" });
    console.log("✅ PostgreSQL Migrations applied successfully!");

    // 2. MySQL Verification
    console.log("[Test] Validating MySQL Schema Migrations...");
    const mysqlClient = new SQL(mysqlUrl);
    const mysqlDb = drizzleMysql(mysqlClient, { schema: mysqlSchema, mode: "default" });
    await migrate(mysqlDb, { migrationsFolder: "./drizzle/mysql/migrations" });
    console.log("✅ MySQL Migrations applied successfully!");

    // 3. SQLite Verification
    console.log("[Test] Validating SQLite Schema Migrations...");
    const sqliteClient = new SQL("sqlite::memory:");
    const sqliteDb = drizzleSqlite(sqliteClient, { schema: sqliteSchema });
    await migrate(sqliteDb, { migrationsFolder: "./drizzle/sqlite/migrations" });
    console.log("✅ SQLite Migrations applied successfully!");
  } catch (error) {
    console.error("❌ Schema Verification Failed:", error);
    process.exit(1);
  } finally {
    console.log("[Test] Tearing down containers...");
    await pgContainer.stop();
    await mysqlContainer.stop();
  }
}

main().then(() => {
  console.log("All schemas verified successfully!");
  process.exit(0);
});
