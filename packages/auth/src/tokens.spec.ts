import { describe, expect, it } from "vitest";

import { generateResetToken, hashToken, verifyToken } from "./tokens";

describe("token helpers", () => {
  it("generates URL-safe reset tokens", () => {
    const token = generateResetToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThan(20);
  });

  it("hashes and verifies token values", async () => {
    const hashedToken = await hashToken("reset-token");

    expect(hashedToken).not.toBe("reset-token");
    expect(await verifyToken("reset-token", hashedToken)).toBe(true);
    expect(await verifyToken("other-token", hashedToken)).toBe(false);
  });
});
