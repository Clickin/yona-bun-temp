import * as mysqlRelations from "@drizzle/mysql/relations";
import * as mysqlSchema from "@drizzle/mysql/schema";
import * as pgRelations from "@drizzle/pg/relations";
import * as pgSchema from "@drizzle/pg/schema";
import * as sqliteRelations from "@drizzle/sqlite/relations";
import * as sqliteSchema from "@drizzle/sqlite/schema";
import { drizzle } from "drizzle-orm/bun-sql";

const DIALECT_ENV = "YONA_DB_DIALECT";
const DATABASE_URL_ENV = "YONA_DB_URL";
const DEFAULT_DIALECT = "sqlite";
const DEFAULT_SQLITE_URL = "sqlite://./.yona-data/yona.db";

type Dialect = "postgres" | "mysql" | "sqlite";

let cachedDb: ReturnType<typeof createDatabase> | undefined;

function readEnv(name: string): string | undefined {
  const processEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env;

  if (processEnv && Object.prototype.hasOwnProperty.call(processEnv, name)) {
    return processEnv[name];
  }

  return (globalThis as { Bun?: { env?: Record<string, string | undefined> } }).Bun?.env?.[name];
}

function requireDialect(): Dialect {
  const value = readEnv(DIALECT_ENV);

  if (!value) {
    return DEFAULT_DIALECT;
  }

  if (value === "postgres" || value === "mysql" || value === "sqlite") {
    return value;
  }

  throw new Error(`Invalid ${DIALECT_ENV}: "${value}". Expected one of: postgres, mysql, sqlite.`);
}

function requireConnectionUrl(dialect: Dialect): string {
  const value = readEnv(DATABASE_URL_ENV);

  if (value) {
    return value;
  }

  if (dialect === "sqlite") {
    return DEFAULT_SQLITE_URL;
  }

  throw new Error(`${DATABASE_URL_ENV} is required when ${DIALECT_ENV} is "${dialect}".`);
}

function validateConnectionUrl(dialect: Dialect, url: string): void {
  if (dialect === "postgres") {
    if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
      return;
    }

    throw new Error(
      `Invalid ${DATABASE_URL_ENV} for ${DIALECT_ENV}="postgres": "${url}". Expected postgres:// or postgresql://.`,
    );
  }

  if (dialect === "mysql") {
    if (url.startsWith("mysql://") || url.startsWith("mysql2://")) {
      return;
    }

    throw new Error(
      `Invalid ${DATABASE_URL_ENV} for ${DIALECT_ENV}="mysql": "${url}". Expected mysql:// or mysql2://.`,
    );
  }

  if (
    url === ":memory:" ||
    url.startsWith("sqlite://") ||
    url.startsWith("sqlite:") ||
    url.startsWith("file://") ||
    url.startsWith("file:")
  ) {
    return;
  }

  throw new Error(
    `Invalid ${DATABASE_URL_ENV} for ${DIALECT_ENV}="sqlite": "${url}". Expected :memory:, sqlite://, sqlite:, file://, or file:.`,
  );
}

function createDatabase(dialect: Dialect, connectionUrl: string) {
  if (dialect === "postgres") {
    const db = (drizzle as any).postgres(connectionUrl, {
      schema: pgSchema,
      relations: pgRelations,
    });
    return Object.assign(db, { dbType: "postgres" as const });
  }

  if (dialect === "mysql") {
    const db = (drizzle as any).mysql(connectionUrl, {
      schema: mysqlSchema,
      relations: mysqlRelations,
      mode: "default",
    });
    return Object.assign(db, { dbType: "mysql" as const });
  }

  const db = (drizzle as any).sqlite(connectionUrl, {
    schema: sqliteSchema,
    relations: sqliteRelations,
  });
  return Object.assign(db, { dbType: "sqlite" as const });
}

export function getDb() {
  if (!cachedDb) {
    const dialect = requireDialect();
    const connectionUrl = requireConnectionUrl(dialect);
    validateConnectionUrl(dialect, connectionUrl);
    cachedDb = createDatabase(dialect, connectionUrl);
  }

  return cachedDb;
}

export type DatabaseType = ReturnType<typeof getDb>;

export function __resetDbForTests(): void {
  cachedDb = undefined;
}

export {
  createPasswordAuthUser,
  findAuthUserByApiToken,
  findAuthUserById,
  findAuthUserByIdentifier,
  readUserApiToken,
  updateAuthUserPassword,
  updateUserApiToken,
  type DbAuthUserRecord,
} from "./auth-users";
export { loadRepositoryAccessFacts, type RepositoryAccessFactsRecord } from "./repository-access";
export { getDbSchema, type RuntimeDbSchema } from "./runtime-schema";
