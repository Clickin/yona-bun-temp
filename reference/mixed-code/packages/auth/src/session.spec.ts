import { describe, expect, it } from "vitest";
import {
  __resetSessionStoreForTests,
  createSession,
  deleteAllSessionsByUserId,
  deleteSessionByToken,
  getSessionByToken,
  getSessionCookieOptions,
  hashSessionToken,
} from "./session";

describe("session helpers", () => {
  it("hashes session tokens as URL-safe values", async () => {
    const rawToken = "session-token-for-testing";
    const hashed = await hashSessionToken(rawToken);

    expect(hashed).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(hashed).not.toBe(rawToken);
    expect(await hashSessionToken(rawToken)).toBe(hashed);
  });

  it("resolves cookie options from env-like inputs", () => {
    expect(
      getSessionCookieOptions({ cookieSecure: "false", maxAge: "120", nodeEnv: "production" }),
    ).toEqual({
      httpOnly: true,
      maxAge: 120,
      path: "/",
      sameSite: "lax",
      secure: false,
    });

    expect(
      getSessionCookieOptions({ cookieSecure: undefined, maxAge: "abc", nodeEnv: "production" }),
    ).toMatchObject({
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: true,
    });
  });

  it("creates, reads, and deletes runtime sessions via the in-memory store", async () => {
    __resetSessionStoreForTests();

    const createdSession = await createSession({ userId: 101 });

    await expect(getSessionByToken(createdSession.token)).resolves.toMatchObject({
      userId: 101,
      csrfToken: createdSession.csrfToken,
    });

    await deleteSessionByToken(createdSession.token);

    await expect(getSessionByToken(createdSession.token)).resolves.toBeNull();
  });

  it("clears every session for a user", async () => {
    __resetSessionStoreForTests();

    const firstSession = await createSession({ userId: 200 });
    const secondSession = await createSession({ userId: 200 });

    await deleteAllSessionsByUserId(200);

    await expect(getSessionByToken(firstSession.token)).resolves.toBeNull();
    await expect(getSessionByToken(secondSession.token)).resolves.toBeNull();
  });
});
