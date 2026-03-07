import { describe, expect, it } from "vitest";
import { InMemorySessionStore } from "./in-memory-session-store";

describe("InMemorySessionStore", () => {
  it("stores and returns active sessions", async () => {
    const store = new InMemorySessionStore();
    const expiresAt = new Date("2100-01-01T00:00:00.000Z");

    await store.create({
      tokenHash: "token-1",
      userId: 1,
      csrfToken: "csrf-1",
      expiresAt,
    });

    await expect(store.getByTokenHash("token-1")).resolves.toEqual({
      userId: 1,
      csrfToken: "csrf-1",
      expiresAt,
    });
  });

  it("drops expired sessions and clears all sessions for a user", async () => {
    const store = new InMemorySessionStore();

    await store.create({
      tokenHash: "expired",
      userId: 2,
      csrfToken: "csrf-expired",
      expiresAt: new Date("2000-01-01T00:00:00.000Z"),
    });

    await store.create({
      tokenHash: "active-a",
      userId: 2,
      csrfToken: "csrf-a",
      expiresAt: new Date("2100-01-01T00:00:00.000Z"),
    });

    await store.create({
      tokenHash: "active-b",
      userId: 2,
      csrfToken: "csrf-b",
      expiresAt: new Date("2100-01-01T00:00:00.000Z"),
    });

    await expect(store.getByTokenHash("expired")).resolves.toBeNull();
    await expect(store.deleteAllByUserId(2)).resolves.toBe(2);
    await expect(store.getByTokenHash("active-a")).resolves.toBeNull();
    await expect(store.getByTokenHash("active-b")).resolves.toBeNull();
  });
});
