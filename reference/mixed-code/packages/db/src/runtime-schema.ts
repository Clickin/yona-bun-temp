import * as mysqlSchema from "@drizzle/mysql/schema";
import * as pgSchema from "@drizzle/pg/schema";
import * as sqliteSchema from "@drizzle/sqlite/schema";
import type { DatabaseType } from "./index";

export type RuntimeDbSchema = typeof mysqlSchema | typeof pgSchema | typeof sqliteSchema;

export function getDbSchema(db: DatabaseType): RuntimeDbSchema {
  if (db.dbType === "postgres") {
    return pgSchema;
  }

  if (db.dbType === "mysql") {
    return mysqlSchema;
  }

  return sqliteSchema;
}
