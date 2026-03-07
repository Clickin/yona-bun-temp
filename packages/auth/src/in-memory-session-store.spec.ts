import { beforeEach, describe, expect, it } from "vitest";

import { InMemorySessionStore } from "./in-memory-session-store";

describe("in-memory session store", () => {
  let sessionStore: InMemorySessionStore;

  beforeEach(() => {
    sessionStore = new InMemorySessionStore();
  });

  it("stores and retrieves a session by token hash", async () => {
    const expiresAt = new Date("2099-03-07T00:10:00.000Z");

    await sessionStore.create({
      tokenHash: "token-hash",
      userId: 7,
      csrfToken: "csrf-token",
      expiresAt,
    });

    await expect(
      sessionStore.getByTokenHash("token-hash", new Date("2099-03-07T00:00:00.000Z")),
    ).resolves.toEqual({
      userId: 7,
      csrfToken: "csrf-token",
      expiresAt,
    });
  });

  it("evicts expired sessions during lookup", async () => {
    await sessionStore.create({
      tokenHash: "expired",
      userId: 8,
      csrfToken: "expired-csrf",
      expiresAt: new Date("2026-03-07T00:00:00.000Z"),
    });

    await expect(
      sessionStore.getByTokenHash("expired", new Date("2026-03-07T00:00:01.000Z")),
    ).resolves.toBeNull();
  });
});
