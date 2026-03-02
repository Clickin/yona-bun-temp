import { describe, expect, it } from "vitest";
import { generateResetToken, hashToken, verifyToken } from "./tokens";

describe("token utilities", () => {
  it("generates URL-safe random reset tokens", () => {
    const token = generateResetToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThanOrEqual(43);
  });

  it("generates unique reset tokens across a batch", () => {
    const iterations = 256;
    const tokens = new Set<string>();

    for (let index = 0; index < iterations; index += 1) {
      tokens.add(generateResetToken());
    }

    expect(tokens.size).toBe(iterations);
  });

  it("hashes and verifies reset tokens", async () => {
    const token = generateResetToken();
    const hash = await hashToken(token);

    expect(hash).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(await verifyToken(token, hash)).toBe(true);
    expect(await verifyToken(`${token}x`, hash)).toBe(false);
  });
});
