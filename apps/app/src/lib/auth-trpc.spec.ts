import { beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };
const { sendPasswordResetEmailMock } = vi.hoisted(() => ({
  sendPasswordResetEmailMock: vi.fn(),
}));

vi.mock("@yona/integrations", async () => {
  const actual = await vi.importActual<typeof import("@yona/integrations")>("@yona/integrations");
  return {
    ...actual,
    sendPasswordResetEmail: sendPasswordResetEmailMock,
  };
});

import {
  __resetSessionStoreForTests,
  createAppUser,
  getSessionCookieName,
  resetAuthRateLimitForTests,
  resetAuthStateForTests,
} from "@yona/auth";
import { createAuthCaller, type AuthProcedureContext } from "./auth-trpc";

interface TestAuthContext extends AuthProcedureContext {
  cookies: Map<string, string>;
  responseHeaders: Map<string, string>;
  responseStatus: null | {
    code: number;
    text?: string;
  };
  setResponseHeaderMock: ReturnType<typeof vi.fn>;
  setResponseStatusMock: ReturnType<typeof vi.fn>;
}

function createTestContext(): TestAuthContext {
  const cookies = new Map<string, string>();
  const responseHeaders = new Map<string, string>();
  let responseStatus: TestAuthContext["responseStatus"] = null;
  const setResponseHeaderMock = vi.fn((name: string, value: string) => {
    responseHeaders.set(name, value);
  });
  const setResponseStatusMock = vi.fn((code: number, text?: string) => {
    responseStatus = { code, text };
  });

  return {
    cookies,
    deleteCookie(name) {
      cookies.delete(name);
    },
    getCookie(name) {
      return cookies.get(name);
    },
    getRequestHeader(name) {
      if (name === "user-agent") {
        return "vitest";
      }

      return undefined;
    },
    getRequestIp() {
      return "127.0.0.1";
    },
    responseHeaders,
    get responseStatus() {
      return responseStatus;
    },
    setResponseHeaderMock,
    setResponseStatusMock,
    setCookie(name, value) {
      cookies.set(name, value);
    },
    setResponseHeader(name, value) {
      setResponseHeaderMock(name, value);
    },
    setResponseStatus(code, text) {
      setResponseStatusMock(code, text);
    },
  };
}

describe("auth tRPC procedures", () => {
  beforeEach(async () => {
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: "test",
      YONA_PUBLIC_ORIGIN: "https://public.yona.test",
    };
    vi.clearAllMocks();
    resetAuthStateForTests();
    __resetSessionStoreForTests();
    await resetAuthRateLimitForTests();
  });

  it("creates, reads, and clears a session through the canonical auth caller", async () => {
    // Legacy provenance:
    // - yona-original/test/controllers/UserAppTest.java:login
    // - yona-original/test/controllers/UserAppTest.java:currentUserSession
    const context = createTestContext();
    const caller = createAuthCaller(context);

    await createAppUser({
      emailAddress: "door@example.com",
      loginId: "door",
      name: "Door TTS",
      password: "strong-pass-123",
    });

    const signIn = await caller.signInWithPassword({
      identifier: "door",
      password: "strong-pass-123",
    });

    expect(signIn).toMatchObject({
      ok: true,
      session: {
        isAnonymous: false,
        loginId: "door",
      },
    });
    expect(context.cookies.get(getSessionCookieName())).toEqual(expect.any(String));

    await expect(caller.readCurrentSession()).resolves.toMatchObject({
      isAnonymous: false,
      loginId: "door",
    });

    await expect(caller.signOut()).resolves.toEqual({
      ok: true,
      session: {
        actorId: null,
        emailAddress: null,
        isAnonymous: true,
        isConfirmed: false,
        isSiteAdmin: false,
        loginId: null,
        userLabel: null,
      },
    });
    expect(context.cookies.has(getSessionCookieName())).toBe(false);
  });

  it("does not create a session when credentials are invalid", async () => {
    // Legacy provenance:
    // - yona-original/test/controllers/UserAppTest.java:loginWrongPassword
    const context = createTestContext();
    const caller = createAuthCaller(context);

    await createAppUser({
      emailAddress: "door@example.com",
      loginId: "door",
      name: "Door TTS",
      password: "strong-pass-123",
    });

    await expect(
      caller.signInWithPassword({
        identifier: "door",
        password: "wrong-pass-123",
      }),
    ).resolves.toMatchObject({
      code: "auth.credentials-invalid",
      ok: false,
    });

    expect(context.cookies.has(getSessionCookieName())).toBe(false);
  });

  it("collapses stale session cookies to anonymous and clears the cookie", async () => {
    // Legacy provenance:
    // - yona-original/test/controllers/UserAppTest.java:currentUserSessionNoUser
    // - yona-original/test/controllers/UserAppTest.java:currentUserAnonymous
    const context = createTestContext();
    context.cookies.set(getSessionCookieName(), "stale-session-token");
    const caller = createAuthCaller(context);

    await expect(caller.readCurrentSession()).resolves.toEqual({
      actorId: null,
      emailAddress: null,
      isAnonymous: true,
      isConfirmed: false,
      isSiteAdmin: false,
      loginId: null,
      userLabel: null,
    });
    expect(context.cookies.has(getSessionCookieName())).toBe(false);
  });

  it("sends a reset email with the trusted public origin when password reset material is issued", async () => {
    // Legacy provenance:
    // - yona-original/test/controllers/PasswordResetAppTest.java:testRequestResetPassword_validLoginIdAndEmailAddress
    const caller = createAuthCaller(createTestContext());

    await createAppUser({
      emailAddress: "door@example.com",
      loginId: "door",
      name: "Door TTS",
      password: "strong-pass-123",
    });

    await expect(
      caller.requestPasswordReset({
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

  it("keeps forgot-password generic when the account does not match", async () => {
    const caller = createAuthCaller(createTestContext());

    await expect(
      caller.requestPasswordReset({
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
    const caller = createAuthCaller(createTestContext());

    await createAppUser({
      emailAddress: "door@example.com",
      loginId: "door",
      name: "Door TTS",
      password: "strong-pass-123",
    });
    sendPasswordResetEmailMock.mockRejectedValueOnce(new Error("smtp offline"));

    await expect(
      caller.requestPasswordReset({
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
    const context = createTestContext();
    const caller = createAuthCaller(context);

    await createAppUser({
      emailAddress: "door@example.com",
      loginId: "door",
      name: "Door TTS",
      password: "strong-pass-123",
    });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        caller.signInWithPassword({
          identifier: "door",
          password: "wrong-pass-123",
        }),
      ).resolves.toMatchObject({
        code: "auth.credentials-invalid",
        ok: false,
      });
    }

    await expect(
      caller.signInWithPassword({
        identifier: "door",
        password: "wrong-pass-123",
      }),
    ).resolves.toEqual({
      code: "auth.rate-limited",
      message: "Too many requests. Try again later.",
      ok: false,
      retryAfterSeconds: 60,
    });

    expect(context.setResponseStatusMock).toHaveBeenCalledWith(429, "Too Many Requests");
    expect(context.responseHeaders.get("Retry-After")).toBe("60");
  });
});
