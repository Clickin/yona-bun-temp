import { beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

const {
  deleteCookieMock,
  deleteSessionByTokenMock,
  getCookieMock,
  getRequestHeaderMock,
  getRequestIPMock,
  getSessionByTokenMock,
  sendPasswordResetEmailMock,
  setCookieMock,
  setResponseHeaderMock,
  setResponseStatusMock,
} = vi.hoisted(() => ({
  deleteCookieMock: vi.fn(),
  deleteSessionByTokenMock: vi.fn(),
  getCookieMock: vi.fn(),
  getRequestHeaderMock: vi.fn(),
  getRequestIPMock: vi.fn(() => "127.0.0.1"),
  getSessionByTokenMock: vi.fn(),
  sendPasswordResetEmailMock: vi.fn(),
  setCookieMock: vi.fn(),
  setResponseHeaderMock: vi.fn(),
  setResponseStatusMock: vi.fn(),
}));

vi.mock("@tanstack/react-start/server", () => ({
  deleteCookie: deleteCookieMock,
  getCookie: getCookieMock,
  getRequestHeader: getRequestHeaderMock,
  getRequestIP: getRequestIPMock,
  setCookie: setCookieMock,
  setResponseHeader: setResponseHeaderMock,
  setResponseStatus: setResponseStatusMock,
}));

vi.mock("@yona/auth", async () => {
  const actual = await vi.importActual<typeof import("@yona/auth")>("@yona/auth");
  return {
    ...actual,
    createSession: vi.fn(async () => ({
      csrfToken: "csrf-token",
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
      token: "session-token",
      userId: 101,
    })),
    deleteSessionByToken: deleteSessionByTokenMock,
    getSessionByToken: getSessionByTokenMock,
  };
});

vi.mock("@yona/integrations", async () => {
  const actual = await vi.importActual<typeof import("@yona/integrations")>("@yona/integrations");
  return {
    ...actual,
    sendPasswordResetEmail: sendPasswordResetEmailMock,
  };
});

import { resetAuthRateLimitForTests } from "@yona/auth";
import { requestPasswordResetServer, signInWithPasswordServer } from "./auth.server";
import { createAppUser, resetAuthStateForTests } from "./auth-state";

describe("auth server", () => {
  beforeEach(async () => {
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: "test",
      YONA_PUBLIC_ORIGIN: "https://public.yona.test",
    };
    vi.clearAllMocks();
    resetAuthStateForTests();
    await resetAuthRateLimitForTests();
  });

  it("sends a reset email with the trusted public origin when password reset material is issued", async () => {
    await createAppUser({
      emailAddress: "door@example.com",
      loginId: "door",
      name: "Door TTS",
      password: "strong-pass-123",
    });

    await expect(
      requestPasswordResetServer({
        emailAddress: "door@example.com",
        loginId: "door",
      }),
    ).resolves.toEqual({
      ok: true,
    });

    expect(sendPasswordResetEmailMock).toHaveBeenCalledTimes(1);
    expect(sendPasswordResetEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        loginId: "door",
        resetUrl: expect.stringContaining("https://public.yona.test/reset-password?token="),
        to: "door@example.com",
      }),
    );
  });

  it("keeps the browser response generic when the account does not match", async () => {
    await expect(
      requestPasswordResetServer({
        emailAddress: "door@example.com",
        loginId: "door",
      }),
    ).resolves.toEqual({
      ok: true,
    });

    expect(sendPasswordResetEmailMock).not.toHaveBeenCalled();
  });

  it("keeps forgot-password generic when mail delivery fails for a real account", async () => {
    const consoleErrorMock = vi.spyOn(console, "error").mockImplementation(() => {});

    await createAppUser({
      emailAddress: "door@example.com",
      loginId: "door",
      name: "Door TTS",
      password: "strong-pass-123",
    });
    sendPasswordResetEmailMock.mockRejectedValueOnce(new Error("smtp offline"));

    await expect(
      requestPasswordResetServer({
        emailAddress: "door@example.com",
        loginId: "door",
      }),
    ).resolves.toEqual({
      ok: true,
    });

    expect(consoleErrorMock).toHaveBeenCalledWith(
      "[auth:forgot-password] Failed to deliver password reset email.",
      expect.objectContaining({
        error: expect.any(Error),
        loginId: "door",
      }),
    );
  });

  it("returns 429 with retry headers after too many login attempts", async () => {
    await createAppUser({
      emailAddress: "door@example.com",
      loginId: "door",
      name: "Door TTS",
      password: "strong-pass-123",
    });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        signInWithPasswordServer({
          identifier: "door",
          password: "wrong-pass-123",
        }),
      ).resolves.toMatchObject({
        code: "auth.credentials-invalid",
        ok: false,
      });
    }

    await expect(
      signInWithPasswordServer({
        identifier: "door",
        password: "wrong-pass-123",
      }),
    ).resolves.toEqual({
      code: "auth.rate-limited",
      message: "Too many requests. Try again later.",
      ok: false,
      retryAfterSeconds: 60,
    });

    expect(setResponseStatusMock).toHaveBeenCalledWith(429, "Too Many Requests");
    expect(setResponseHeaderMock).toHaveBeenCalledWith("Retry-After", "60");
  });
});
