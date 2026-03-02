import * as mysqlSchema from "@drizzle/mysql/schema";
import * as pgSchema from "@drizzle/pg/schema";
import * as sqliteSchema from "@drizzle/sqlite/schema";
import { drizzle } from "drizzle-orm/bun-sql";

const DATABASE_URL_ENV = "YONA_DB_URL";
let database: ReturnType<typeof createDatabase> | undefined;

function createDatabase(connectionString: string) {
  const url = new URL(connectionString);

  if (url.protocol.startsWith("postgres")) {
    const db = drizzle(connectionString, { schema: pgSchema });
    return Object.assign(db, { dbType: "postgres" as const });
  } else if (url.protocol.startsWith("mysql")) {
    const db = drizzle(connectionString, { schema: mysqlSchema });
    return Object.assign(db, { dbType: "mysql" as const });
  } else if (url.protocol.startsWith("sqlite") || url.protocol === "file:") {
    const db = drizzle(connectionString, { schema: sqliteSchema });
    return Object.assign(db, { dbType: "sqlite" as const });
  }

  throw new Error(`Unsupported database dialect: ${url.protocol}`);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required to initialize the database client.`);
  }

  return value;
}

export function getDb() {
  if (!database) {
    database = createDatabase(requireEnv(DATABASE_URL_ENV));
  }

  return database;
}

export type DatabaseType = ReturnType<typeof getDb>;
