import { beforeEach, describe, expect, it, vi } from "vitest";

interface MockUser {
  apiToken: null | string;
  emailAddress: string;
  id: number;
  isConfirmed: boolean;
  isSiteAdmin: boolean;
  loginId: string;
  name: string;
  passwordHash: null | string;
  passwordSalt: null | string;
}

function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase();
}

function cloneUser(user: MockUser | undefined): MockUser | null {
  return user ? { ...user } : null;
}

const ORIGINAL_ENV = { ...process.env };
const { dbMock, sendPasswordResetEmailMock } = vi.hoisted(() => {
  const state = {
    nextUserId: 1,
    users: new Map<number, MockUser>(),
  };

  return {
    dbMock: {
      __resetDbForTests() {
        state.nextUserId = 1;
        state.users = new Map();
      },
      async createPasswordAuthUser(input: {
        emailAddress: string;
        loginId: string;
        name: string;
        passwordHash: string;
        passwordSalt: string;
      }) {
        for (const user of state.users.values()) {
          if (
            user.loginId === normalizeIdentifier(input.loginId) ||
            user.emailAddress === normalizeIdentifier(input.emailAddress)
          ) {
            throw new Error("unique constraint violation");
          }
        }

        const user: MockUser = {
          apiToken: null,
          emailAddress: normalizeIdentifier(input.emailAddress),
          id: state.nextUserId,
          isConfirmed: true,
          isSiteAdmin: false,
          loginId: normalizeIdentifier(input.loginId),
          name: input.name.trim(),
          passwordHash: input.passwordHash,
          passwordSalt: input.passwordSalt,
        };

        state.nextUserId += 1;
        state.users.set(user.id, user);
        return cloneUser(user);
      },
      async findAuthUserByApiToken(token: string) {
        const normalizedToken = token.trim();
        for (const user of state.users.values()) {
          if (user.apiToken === normalizedToken) {
            return cloneUser(user);
          }
        }

        return null;
      },
      async findAuthUserById(userId: number) {
        return cloneUser(state.users.get(userId));
      },
      async findAuthUserByIdentifier(identifier: string) {
        const normalizedIdentifier = normalizeIdentifier(identifier);
        for (const user of state.users.values()) {
          if (user.loginId === normalizedIdentifier || user.emailAddress === normalizedIdentifier) {
            return cloneUser(user);
          }
        }

        return null;
      },
      async readUserApiToken(userId: number) {
        return state.users.get(userId)?.apiToken ?? null;
      },
      async updateAuthUserPassword(input: {
        passwordHash: string;
        passwordSalt: string;
        userId: number;
      }) {
        const user = state.users.get(input.userId);
        if (user) {
          user.passwordHash = input.passwordHash;
          user.passwordSalt = input.passwordSalt;
        }
      },
      async updateAuthUserProfile(input: { emailAddress: string; name: string; userId: number }) {
        const user = state.users.get(input.userId);
        if (user) {
          user.emailAddress = normalizeIdentifier(input.emailAddress);
          user.name = input.name.trim();
        }
      },
      async updateUserApiToken(userId: number, token: string) {
        const user = state.users.get(userId);
        if (user) {
          user.apiToken = token;
        }
      },
    },
    sendPasswordResetEmailMock: vi.fn(),
  };
});

vi.mock("@yona/db", async () => {
  const actual = await vi.importActual<typeof import("@yona/db")>("@yona/db");
  return {
    ...actual,
    ...dbMock,
  };
});

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
  getSessionByToken,
  getSessionCookieName,
  resetAuthRateLimitForTests,
  resetAuthStateForTests,
} from "@yona/auth";
import { createAuthCaller, type AuthProcedureContext } from "./auth-trpc";

interface TestAuthContext extends AuthProcedureContext {
  cookies: Map<string, string>;
  cookieOptions: Map<string, unknown>;
  requestHeaders: Map<string, string>;
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
  const cookieOptions = new Map<string, unknown>();
  const requestHeaders = new Map<string, string>([["user-agent", "vitest"]]);
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
    cookieOptions,
    deleteCookie(name) {
      cookies.delete(name);
      cookieOptions.delete(name);
    },
    getCookie(name) {
      return cookies.get(name);
    },
    getRequestHeader(name) {
      return requestHeaders.get(name);
    },
    getRequestIp() {
      return "127.0.0.1";
    },
    requestHeaders,
    responseHeaders,
    get responseStatus() {
      return responseStatus;
    },
    setResponseHeaderMock,
    setResponseStatusMock,
    setCookie(name, value, options) {
      cookies.set(name, value);
      cookieOptions.set(name, options);
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
    dbMock.__resetDbForTests();
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

  it("preserves secure cookie settings when Better Auth session initialization falls back", async () => {
    const context = createTestContext();
    const caller = createAuthCaller(context);
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: "production",
      YONA_PUBLIC_ORIGIN: "https://public.yona.test",
    };

    await createAppUser({
      emailAddress: "door@example.com",
      loginId: "door",
      name: "Door TTS",
      password: "strong-pass-123",
    });

    await expect(
      caller.signInWithPassword({
        identifier: "door",
        password: "strong-pass-123",
      }),
    ).resolves.toMatchObject({
      ok: true,
    });

    expect(context.cookieOptions.get(getSessionCookieName())).toMatchObject({
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: true,
    });
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

  it("reads and rotates the current user's API token with CSRF enforcement", async () => {
    const context = createTestContext();
    const caller = createAuthCaller(context);

    const creation = await createAppUser({
      emailAddress: "door@example.com",
      loginId: "door",
      name: "Door TTS",
      password: "strong-pass-123",
    });
    if (!creation.ok) {
      throw new Error("Expected test user to be created.");
    }

    await caller.signInWithPassword({
      identifier: "door",
      password: "strong-pass-123",
    });

    const currentToken = await caller.readCurrentUserApiToken();
    expect(currentToken.token).toEqual(expect.any(String));

    const sessionToken = context.cookies.get(getSessionCookieName());
    if (!sessionToken) {
      throw new Error("Expected signed-in session cookie.");
    }

    const session = await getSessionByToken(sessionToken);
    if (!session) {
      throw new Error("Expected active session record.");
    }

    context.requestHeaders.set("x-csrf-token", session.csrfToken);
    const rotatedToken = await caller.rotateCurrentUserApiToken();

    expect(rotatedToken.token).toEqual(expect.any(String));
    expect(rotatedToken.token).not.toBe(currentToken.token);
  });

  it("updates current user profile and changes password", async () => {
    const context = createTestContext();
    const caller = createAuthCaller(context);

    await createAppUser({
      emailAddress: "door@example.com",
      loginId: "door",
      name: "Door TTS",
      password: "strong-pass-123",
    });

    await caller.signInWithPassword({
      identifier: "door",
      password: "strong-pass-123",
    });

    const sessionToken = context.cookies.get(getSessionCookieName());
    if (!sessionToken) {
      throw new Error("Expected signed-in session cookie.");
    }

    const session = await getSessionByToken(sessionToken);
    if (!session) {
      throw new Error("Expected active session record.");
    }

    context.requestHeaders.set("x-csrf-token", session.csrfToken);

    await expect(
      caller.updateCurrentUserProfile({
        emailAddress: "doortts@example.com",
        name: "Door Updated",
      }),
    ).resolves.toMatchObject({
      emailAddress: "doortts@example.com",
      userLabel: "Door Updated",
    });

    await expect(
      caller.changeCurrentUserPassword({
        currentPassword: "strong-pass-123",
        newPassword: "strong-pass-456",
      }),
    ).resolves.toEqual({
      ok: true,
    });

    await expect(
      caller.signInWithPassword({
        identifier: "door",
        password: "strong-pass-456",
      }),
    ).resolves.toMatchObject({
      ok: true,
    });
  });

  it("rejects current user profile updates without a valid csrf token", async () => {
    const context = createTestContext();
    const caller = createAuthCaller(context);

    await createAppUser({
      emailAddress: "door@example.com",
      loginId: "door",
      name: "Door TTS",
      password: "strong-pass-123",
    });

    await caller.signInWithPassword({
      identifier: "door",
      password: "strong-pass-123",
    });

    await expect(
      caller.updateCurrentUserProfile({
        emailAddress: "doortts@example.com",
        name: "Door Updated",
      }),
    ).rejects.toThrow("CSRF validation failed.");

    expect(context.setResponseStatusMock).toHaveBeenCalledWith(403, "Forbidden");
  });

  it("rejects current user password changes without a valid csrf token", async () => {
    const context = createTestContext();
    const caller = createAuthCaller(context);

    await createAppUser({
      emailAddress: "door@example.com",
      loginId: "door",
      name: "Door TTS",
      password: "strong-pass-123",
    });

    await caller.signInWithPassword({
      identifier: "door",
      password: "strong-pass-123",
    });

    await expect(
      caller.changeCurrentUserPassword({
        currentPassword: "strong-pass-123",
        newPassword: "strong-pass-456",
      }),
    ).rejects.toThrow("CSRF validation failed.");

    expect(context.setResponseStatusMock).toHaveBeenCalledWith(403, "Forbidden");
  });
});
