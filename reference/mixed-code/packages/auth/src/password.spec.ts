import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password utilities", () => {
  it("produces non-deterministic bcrypt hashes that remain verifiable", async () => {
    const password = "correct horse battery staple";
    const salt = "user-123-salt";

    const firstHash = await hashPassword(password, salt);
    const secondHash = await hashPassword(password, salt);

    expect(firstHash).not.toBe(secondHash);
    expect(firstHash).toMatch(/^\$2[aby]\$/);
    expect(secondHash).toMatch(/^\$2[aby]\$/);
    expect(await verifyPassword(password, firstHash, salt)).toBe(true);
    expect(await verifyPassword(password, secondHash, salt)).toBe(true);
  });

  it("verifies valid password and rejects invalid password or salt", async () => {
    const salt = "session-bound-salt";
    const passwordHash = await hashPassword("sup3r-secret", salt);

    expect(await verifyPassword("sup3r-secret", passwordHash, salt)).toBe(true);
    expect(await verifyPassword("wrong-password", passwordHash, salt)).toBe(false);
    expect(await verifyPassword("sup3r-secret", passwordHash, "wrong-salt")).toBe(false);
  });
});
