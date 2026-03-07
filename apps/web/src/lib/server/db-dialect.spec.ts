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

describe("db dialect", () => {
  const ORIGINAL_URL = process.env.YONA_DB_URL;
  const ORIGINAL_DIALECT = process.env.YONA_DB_DIALECT;

  beforeEach(() => {
    vi.resetModules();
    mockPostgres.mockClear();
    mockMysql.mockClear();
    mockSqlite.mockClear();
    delete process.env.YONA_DB_DIALECT;
    delete process.env.YONA_DB_URL;
  });

  afterEach(() => {
    if (ORIGINAL_DIALECT === undefined) {
      delete process.env.YONA_DB_DIALECT;
    } else {
      process.env.YONA_DB_DIALECT = ORIGINAL_DIALECT;
    }

    if (ORIGINAL_URL === undefined) {
      delete process.env.YONA_DB_URL;
    } else {
      process.env.YONA_DB_URL = ORIGINAL_URL;
    }
  });

  it("defaults to sqlite dialect and default sqlite URL", async () => {
    const { getDb } = await import("./db");

    getDb();

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

  it("throws when YONA_DB_DIALECT is invalid", async () => {
    process.env.YONA_DB_DIALECT = "mssql";
    const { getDb } = await import("./db");

    expect(() => getDb()).toThrowError(/YONA_DB_DIALECT/);
  });

  it("throws when postgres dialect receives a mysql URL", async () => {
    process.env.YONA_DB_DIALECT = "postgres";
    process.env.YONA_DB_URL = "mysql://localhost:3306/yona";
    const { getDb } = await import("./db");

    expect(() => getDb()).toThrowError(/YONA_DB_URL/);
  });

  it("throws when mysql dialect receives a postgres URL", async () => {
    process.env.YONA_DB_DIALECT = "mysql";
    process.env.YONA_DB_URL = "postgres://localhost:5432/yona";
    const { getDb } = await import("./db");

    expect(() => getDb()).toThrowError(/YONA_DB_URL/);
  });

  it("throws when sqlite dialect receives a postgres URL", async () => {
    process.env.YONA_DB_DIALECT = "sqlite";
    process.env.YONA_DB_URL = "postgres://localhost:5432/yona";
    const { getDb } = await import("./db");

    expect(() => getDb()).toThrowError(/YONA_DB_URL/);
  });
});
