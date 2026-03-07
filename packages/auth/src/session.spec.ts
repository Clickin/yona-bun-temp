import { beforeEach, describe, expect, it } from "vitest";

import {
  __resetSessionStoreForTests,
  createSession,
  deleteSessionByToken,
  getSessionByToken,
  getSessionCookieMaxAge,
  getSessionCookieName,
  getSessionCookieOptions,
} from "./session";

describe("session helpers", () => {
  beforeEach(() => {
    __resetSessionStoreForTests();
  });

  it("uses stable cookie defaults without process globals", () => {
    expect(getSessionCookieName()).toBe("yona_session");
    expect(getSessionCookieMaxAge()).toBe(60 * 60 * 24 * 30);
    expect(getSessionCookieOptions()).toEqual({
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
      secure: false,
    });
  });

  it("creates, reads, and deletes a session through the raw token", async () => {
    const createdSession = await createSession({
      userId: 42,
      now: new Date("2026-03-07T00:00:00.000Z"),
    });

    await expect(getSessionByToken(createdSession.token)).resolves.toEqual({
      userId: 42,
      csrfToken: createdSession.csrfToken,
      expiresAt: createdSession.expiresAt,
    });

    await deleteSessionByToken(createdSession.token);

    await expect(getSessionByToken(createdSession.token)).resolves.toBeNull();
  });
});
