import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "@drizzle/schema";

const DATABASE_URL_ENV = "YONA_DB_URL";

let database: ReturnType<typeof createDatabase> | undefined;

function createDatabase(connectionString: string) {
  return drizzle({ connection: connectionString, mode: "default", schema });
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
