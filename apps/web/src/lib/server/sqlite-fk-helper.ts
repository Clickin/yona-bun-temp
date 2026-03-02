import { eq } from "drizzle-orm";
import { getDb } from "./db";

export interface FkRule<TTable, TColumn> {
  table: TTable;
  fkColumn: TColumn;
}

/**
 * Provides application-level Foreign Key action emulation for SQLite.
 * SQLite may lack strict native support for certain FK constraints during complex
 * schema alterations or when Pragmas are disabled/limited by the environment.
 *
 * Repositories must use this helper before executing Deletes or Updates
 * that span relational boundaries in the SQLite environment.
 */
export const SqliteFkHelper = {
  /**
   * Enforces RESTRICT actions. Throws an error if dependent child records exist.
   * @param parentId The ID of the parent record being deleted
   * @param restrictRules A list of tables and their foreign key columns to check
   */
  async enforceRestrict<T>(parentId: T, restrictRules: FkRule<any, any>[]): Promise<void> {
    const db = getDb();
    if (db.dbType !== "sqlite") return;

    for (const rule of restrictRules) {
      const dependents = await db
        .select({ id: rule.table.id })
        .from(rule.table)
        .where(eq(rule.fkColumn, parentId))
        .limit(1);

      if (dependents.length > 0) {
        throw new Error(
          `RESTRICT violation: Cannot delete record. Dependent records exist in table.`,
        );
      }
    }
  },

  /**
   * Enforces CASCADE actions. Manually deletes dependent child records.
   * @param parentId The ID of the parent record being deleted
   * @param cascadeRules A list of tables and their foreign key columns to cascade delete
   */
  async executeCascade<T>(parentId: T, cascadeRules: FkRule<any, any>[]): Promise<void> {
    const db = getDb();
    if (db.dbType !== "sqlite") return;

    for (const rule of cascadeRules) {
      await db.delete(rule.table).where(eq(rule.fkColumn, parentId));
    }
  },
} as const;
