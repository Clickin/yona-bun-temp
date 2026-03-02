import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockDrizzle = vi.hoisted(() => vi.fn(() => ({ client: "db-client" })));

vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: mockDrizzle,
}));

describe("db", () => {
  const ORIGINAL_ENV = process.env.YONA_DB_URL;

  beforeEach(() => {
    vi.resetModules();
    mockDrizzle.mockClear();
    delete process.env.YONA_DB_URL;
  });

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) {
      delete process.env.YONA_DB_URL;
    } else {
      process.env.YONA_DB_URL = ORIGINAL_ENV;
    }
  });

  it("throws when YONA_DB_URL is missing", async () => {
    const { getDb } = await import("./db");

    expect(() => getDb()).toThrowError(
      "YONA_DB_URL is required to initialize the database client.",
    );
    expect(mockDrizzle).not.toHaveBeenCalled();
  });

  it("initializes drizzle once and reuses cached client", async () => {
    process.env.YONA_DB_URL = "mysql://user:pass@localhost:3306/yona";
    const { getDb } = await import("./db");

    const first = getDb();
    const second = getDb();

    expect(first).toBe(second);
    expect(mockDrizzle).toHaveBeenCalledTimes(1);
    expect(mockDrizzle).toHaveBeenCalledWith(
      expect.objectContaining({
        connection: "mysql://user:pass@localhost:3306/yona",
        mode: "default",
      }),
    );
  });
});
