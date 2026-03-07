import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password";

describe("password helpers", () => {
  it("hashes password input with the caller-provided salt", async () => {
    const passwordHash = await hashPassword("correct horse battery staple", "user-salt");

    expect(passwordHash).not.toBe("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", passwordHash, "user-salt")).toBe(
      true,
    );
    expect(await verifyPassword("correct horse battery staple", passwordHash, "other-salt")).toBe(
      false,
    );
  });
});
