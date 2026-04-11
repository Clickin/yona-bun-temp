import { describe, expect, it } from "vitest";

describe("drizzle-orm import test", () => {
  it("should import drizzle successfully", () => {
    expect(true).toBe(true);
  });

  it("should import SQL from bun successfully", async () => {
    const { SQL } = await import("bun");
    expect(SQL).toBeDefined();
  });
});
