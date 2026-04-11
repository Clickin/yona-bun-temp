import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import * as sqliteSchema from "@drizzle/sqlite/schema";
import {
  SEARCH_DOCUMENT_TABLE,
  SQLITE_SEARCH_DOCUMENT_BOOTSTRAP_MODE,
  SQLITE_SEARCH_DOCUMENT_FTS_TABLE,
  SQLITE_SEARCH_DOCUMENT_SYNC_MODE,
  SQLITE_SEARCH_DOCUMENT_SYNC_TRIGGERS,
} from "./search-projection";
import { setupSQLiteTestDatabase } from "./test-utils/database";
import { applySqliteMigrations } from "./test-helpers";

function getDefaultValue(rows: any[], columnName: string) {
  return rows.find((row) => row.name === columnName)?.dflt_value ?? null;
}

describe("SQLite database", () => {
  let db: ReturnType<(typeof drizzle)["sqlite"]>;

  const closeDatabaseClient = async () => {
    const client = db.$client as {
      close?: () => Promise<void> | void;
      end?: () => Promise<void> | void;
    };
    if (typeof client.close === "function") {
      await client.close();
      return;
    }

    if (typeof client.end === "function") {
      await client.end();
    }
  };

  beforeAll(async () => {
    const setup = await setupSQLiteTestDatabase();
    db = (drizzle as any).sqlite(setup.url, { schema: sqliteSchema });

    await applySqliteMigrations(db);
  });

  afterAll(async () => {
    await closeDatabaseClient();
  });

  it("should connect to SQLite successfully", async () => {
    const result = await db.$client`SELECT 1 as test`;
    expect(result).toEqual([
      {
        test: 1,
      },
    ]);
  });

  it("should have expected tables created after migrations", async () => {
    const result = await db.$client`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `;

    expect(result.length).toBeGreaterThan(0);

    const tableNames = result.map((row: any) => row.name);
    expect(tableNames).toContain("n4user");
    expect(tableNames).toContain("project");
    expect(tableNames).toContain("issue");
  });

  it("retains the legacy sessions table for in-place upgrades", async () => {
    const result = await db.$client`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
      AND name = 'sessions'
    `;

    expect(result).toHaveLength(1);
  });

  it("should have n4user table structure", async () => {
    const result = await db.$client`PRAGMA table_info(n4user)`;

    const columns = result.map((row: any) => row.name);
    expect(columns).toContain("id");
    expect(columns).toContain("login_id");
    expect(columns).toContain("name");
  });

  it("should be able to insert and select from n4user", async () => {
    const testUser = {
      createdDate: new Date(0),
      lastStateModifiedDate: new Date(0),
      loginId: "test@example.com",
      name: "Test User",
      email: "test@example.com",
      isGuest: false,
      token: null,
    };

    await db.insert(sqliteSchema.n4user).values(testUser);
    const users = await db.select().from(sqliteSchema.n4user).limit(1);

    expect(users.length).toBeGreaterThan(0);
    expect(users[0].loginId).toBe("test@example.com");
    expect(users[0].name).toBe("Test User");
  });

  it("keeps new auth timestamp defaults nullable instead of NaN", async () => {
    const linkedAccountColumns = await db.$client`PRAGMA table_info(linked_account)`;
    const userCredentialColumns = await db.$client`PRAGMA table_info(user_credential)`;
    const verificationColumns = await db.$client`PRAGMA table_info(verification)`;

    expect(getDefaultValue(linkedAccountColumns, "access_token_expires_at")).not.toBe("NaN");
    expect(getDefaultValue(linkedAccountColumns, "refresh_token_expires_at")).not.toBe("NaN");
    expect(getDefaultValue(linkedAccountColumns, "created_at")).not.toBe("NaN");
    expect(getDefaultValue(linkedAccountColumns, "updated_at")).not.toBe("NaN");
    expect(getDefaultValue(userCredentialColumns, "created_at")).not.toBe("NaN");
    expect(getDefaultValue(userCredentialColumns, "updated_at")).not.toBe("NaN");
    expect(getDefaultValue(verificationColumns, "created_at")).not.toBe("NaN");
    expect(getDefaultValue(verificationColumns, "updated_at")).not.toBe("NaN");
  });

  it("creates unique identifier indexes for organizations and owner-scoped projects", async () => {
    const organizationIndexes = await db.$client`PRAGMA index_list(organization)`;
    const projectIndexes = await db.$client`PRAGMA index_list(project)`;

    expect(
      organizationIndexes.some(
        (row: { name: string; unique: number }) =>
          row.name === "uq_organization_name" && row.unique === 1,
      ),
    ).toBe(true);
    expect(
      projectIndexes.some(
        (row: { name: string; unique: number }) =>
          row.name === "uq_project_owner_name" && row.unique === 1,
      ),
    ).toBe(true);
  });

  it("rejects case-only duplicates for organization and project route identifiers", async () => {
    await db.$client`
      INSERT INTO organization (name, descr)
      VALUES ('labs', 'primary org')
    `;

    let organizationDuplicateError: unknown = null;
    try {
      await db.$client`
        INSERT INTO organization (name, descr)
        VALUES ('LABS', 'duplicate org')
      `;
    } catch (error) {
      organizationDuplicateError = error;
    }
    expect(organizationDuplicateError).not.toBeNull();

    await db.$client`
      INSERT INTO project (name, owner, overview, project_scope, vcs)
      VALUES ('project-yona', 'labs', 'original project', 'public', 'GIT')
    `;

    let projectDuplicateError: unknown = null;
    try {
      await db.$client`
        INSERT INTO project (name, owner, overview, project_scope, vcs)
        VALUES ('PROJECT-YONA', 'LABS', 'duplicate project', 'public', 'GIT')
      `;
    } catch (error) {
      projectDuplicateError = error;
    }
    expect(projectDuplicateError).not.toBeNull();
  });

  it("creates explicit FTS5 external-content sync infrastructure for the search projection", async () => {
    const ftsRows = await db.$client`
      SELECT sql
      FROM sqlite_master
      WHERE type = 'table'
        AND name = ${SQLITE_SEARCH_DOCUMENT_FTS_TABLE}
    `;
    const triggerRows = await db.$client`
      SELECT name
      FROM sqlite_master
      WHERE type = 'trigger'
        AND tbl_name = ${SEARCH_DOCUMENT_TABLE}
      ORDER BY name
    `;

    expect(ftsRows).toHaveLength(1);
    expect(SQLITE_SEARCH_DOCUMENT_SYNC_MODE).toBe("external-content");
    expect(String(ftsRows[0]?.sql ?? "")).toContain("USING fts5");
    expect(String(ftsRows[0]?.sql ?? "")).toContain("content='search_document'");
    expect(triggerRows.map((row: any) => row.name)).toEqual([
      ...SQLITE_SEARCH_DOCUMENT_SYNC_TRIGGERS,
    ]);
  });

  it("keeps the SQLite search projection FTS table in sync through triggers and backfill bootstrap", async () => {
    await db.insert(sqliteSchema.searchDocument).values({
      accessScope: "public",
      body: "searchable body",
      documentId: 101,
      documentText: "hello bounded projection",
      documentType: "issue",
      scopeKind: "project",
      title: "Hello projection",
    });

    const matches = await db.$client`
      SELECT rowid, title
      FROM search_document_fts
      WHERE search_document_fts MATCH 'hello'
    `;

    expect(SQLITE_SEARCH_DOCUMENT_BOOTSTRAP_MODE).toContain("backfill");
    expect(matches).toHaveLength(1);
    expect(matches[0]?.title).toBe("Hello projection");
  });
});
