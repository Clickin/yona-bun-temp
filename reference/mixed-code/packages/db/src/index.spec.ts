import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockPostgres = vi.hoisted(() => vi.fn(() => ({ client: "postgres-client" })));
const mockMysql = vi.hoisted(() => vi.fn(() => ({ client: "mysql-client" })));
const mockSqlite = vi.hoisted(() => vi.fn(() => ({ client: "sqlite-client" })));

vi.mock("drizzle-orm/bun-sql", () => ({
  drizzle: Object.assign(vi.fn(), {
    postgres: mockPostgres,
    mysql: mockMysql,
    sqlite: mockSqlite,
  }),
}));

describe("db", () => {
  const ORIGINAL_URL = process.env.YONA_DB_URL;
  const ORIGINAL_DIALECT = process.env.YONA_DB_DIALECT;

  beforeEach(() => {
    vi.resetModules();
    mockPostgres.mockClear();
    mockMysql.mockClear();
    mockSqlite.mockClear();
    delete process.env.YONA_DB_URL;
    delete process.env.YONA_DB_DIALECT;
  });

  afterEach(() => {
    if (ORIGINAL_URL === undefined) {
      delete process.env.YONA_DB_URL;
    } else {
      process.env.YONA_DB_URL = ORIGINAL_URL;
    }

    if (ORIGINAL_DIALECT === undefined) {
      delete process.env.YONA_DB_DIALECT;
    } else {
      process.env.YONA_DB_DIALECT = ORIGINAL_DIALECT;
    }
  });

  it("defaults to sqlite and default file URL when env vars are missing", async () => {
    const { getDb } = await import("./index");

    const db = getDb();

    expect(db).toMatchObject({ client: "sqlite-client", dbType: "sqlite" });
    expect(mockSqlite).toHaveBeenCalledTimes(1);
    expect(mockSqlite).toHaveBeenCalledWith(
      "sqlite://./.yona-data/yona.db",
      expect.objectContaining({
        schema: expect.any(Object),
        relations: expect.any(Object),
      }),
    );
    expect(mockPostgres).not.toHaveBeenCalled();
    expect(mockMysql).not.toHaveBeenCalled();
  }, 15_000);

  it("initializes configured mysql drizzle once and reuses cached client", async () => {
    process.env.YONA_DB_DIALECT = "mysql";
    process.env.YONA_DB_URL = "mysql://user:pass@localhost:3306/yona";
    const { getDb } = await import("./index");

    const first = getDb();
    const second = getDb();

    expect(first).toBe(second);
    expect(first).toMatchObject({ client: "mysql-client", dbType: "mysql" });
    expect(mockMysql).toHaveBeenCalledTimes(1);
    expect(mockMysql).toHaveBeenCalledWith(
      "mysql://user:pass@localhost:3306/yona",
      expect.objectContaining({
        schema: expect.any(Object),
        relations: expect.any(Object),
        mode: "default",
      }),
    );
  }, 15_000);
});
