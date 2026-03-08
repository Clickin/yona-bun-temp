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

const { dbMock } = vi.hoisted(() => {
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
      grantSiteAdminForTests(userId: number) {
        const user = state.users.get(userId);
        if (user) {
          user.isSiteAdmin = true;
        }
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
      async updateUserApiToken(userId: number, token: string) {
        const user = state.users.get(userId);
        if (user) {
          user.apiToken = token;
        }
      },
      readStoredApiTokenForTests(userId: number) {
        return state.users.get(userId)?.apiToken ?? null;
      },
    },
  };
});

vi.mock("@yona/db", () => dbMock);

import {
  __resetSessionStoreForTests,
  createAppUser,
  getOrCreateUserApiToken,
  issueAppSession,
  resetAuthRateLimitForTests,
  resetAuthStateForTests,
  resolveRequestPrincipal,
  rotateUserApiToken,
} from "./index";

const ORIGINAL_ENV = { ...process.env };

describe("request principal resolution", () => {
  beforeEach(async () => {
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: "test",
    };
    dbMock.__resetDbForTests();
    __resetSessionStoreForTests();
    resetAuthStateForTests();
    await resetAuthRateLimitForTests();
  });

  it("resolves the current user from a session cookie", async () => {
    const creation = await createAppUser({
      emailAddress: "door@example.com",
      loginId: "door",
      name: "Door TTS",
      password: "strong-pass-123",
    });
    if (!creation.ok) {
      throw new Error("Expected test user to be created.");
    }

    const issuedSession = await issueAppSession(creation.user.id);
    const principal = await resolveRequestPrincipal({
      cookieSessionToken: issuedSession.session.token,
      headers: new Headers(),
      remoteAddress: "127.0.0.1",
    });

    expect(principal).toMatchObject({
      authMethod: "session",
      hasInvalidCredentials: false,
      ipAddress: "127.0.0.1",
      isAuthenticated: true,
      user: {
        id: creation.user.id,
        loginId: "door",
      },
    });
  });

  it("authenticates with Authorization: token and Yona-Token", async () => {
    const creation = await createAppUser({
      emailAddress: "maintainer@example.com",
      loginId: "maintainer",
      name: "Maintainer",
      password: "strong-pass-123",
    });
    if (!creation.ok) {
      throw new Error("Expected test user to be created.");
    }

    const token = await getOrCreateUserApiToken(creation.user.id);

    await expect(
      resolveRequestPrincipal({
        headers: new Headers({
          Authorization: `token ${token}`,
        }),
        remoteAddress: "127.0.0.1",
      }),
    ).resolves.toMatchObject({
      authMethod: "api-token",
      isAuthenticated: true,
      user: {
        id: creation.user.id,
      },
    });

    await expect(
      resolveRequestPrincipal({
        headers: new Headers({
          "Yona-Token": token,
        }),
        remoteAddress: "127.0.0.1",
      }),
    ).resolves.toMatchObject({
      authMethod: "api-token",
      isAuthenticated: true,
      user: {
        id: creation.user.id,
      },
    });
  });

  it("prefers explicit token auth over an ambient session cookie", async () => {
    const first = await createAppUser({
      emailAddress: "one@example.com",
      loginId: "one",
      name: "One",
      password: "strong-pass-123",
    });
    const second = await createAppUser({
      emailAddress: "two@example.com",
      loginId: "two",
      name: "Two",
      password: "strong-pass-123",
    });
    if (!first.ok || !second.ok) {
      throw new Error("Expected test users to be created.");
    }

    const session = await issueAppSession(first.user.id);
    const token = await getOrCreateUserApiToken(second.user.id);
    const principal = await resolveRequestPrincipal({
      cookieSessionToken: session.session.token,
      headers: new Headers({
        Authorization: `token ${token}`,
      }),
      remoteAddress: "127.0.0.1",
    });

    expect(principal.authMethod).toBe("api-token");
    expect(principal.user?.id).toBe(second.user.id);
  });

  it("authenticates with Basic credentials against the persisted password", async () => {
    const creation = await createAppUser({
      emailAddress: "basic@example.com",
      loginId: "basic-user",
      name: "Basic User",
      password: "strong-pass-123",
    });
    if (!creation.ok) {
      throw new Error("Expected test user to be created.");
    }

    const encoded = Buffer.from("basic-user:strong-pass-123", "utf8").toString("base64");
    const principal = await resolveRequestPrincipal({
      headers: new Headers({
        Authorization: `Basic ${encoded}`,
      }),
      remoteAddress: "127.0.0.1",
    });

    expect(principal).toMatchObject({
      authMethod: "basic",
      isAuthenticated: true,
      isRateLimited: false,
      user: {
        id: creation.user.id,
        loginId: "basic-user",
      },
    });
  });

  it("rate-limits repeated Basic credential attempts on request-auth endpoints", async () => {
    const creation = await createAppUser({
      emailAddress: "limit@example.com",
      loginId: "limit-user",
      name: "Limit User",
      password: "strong-pass-123",
    });
    if (!creation.ok) {
      throw new Error("Expected test user to be created.");
    }

    const encoded = Buffer.from("limit-user:wrong-pass-123", "utf8").toString("base64");

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        resolveRequestPrincipal({
          headers: new Headers({
            Authorization: `Basic ${encoded}`,
          }),
          remoteAddress: "127.0.0.1",
        }),
      ).resolves.toMatchObject({
        hasInvalidCredentials: true,
        isAuthenticated: false,
        isRateLimited: false,
      });
    }

    await expect(
      resolveRequestPrincipal({
        headers: new Headers({
          Authorization: `Basic ${encoded}`,
        }),
        remoteAddress: "127.0.0.1",
      }),
    ).resolves.toMatchObject({
      hasInvalidCredentials: false,
      isAuthenticated: false,
      isRateLimited: true,
      retryAfterSeconds: 60,
    });
  });

  it("accepts matching token and Basic credentials for the same user", async () => {
    const creation = await createAppUser({
      emailAddress: "combo@example.com",
      loginId: "combo-user",
      name: "Combo User",
      password: "strong-pass-123",
    });
    if (!creation.ok) {
      throw new Error("Expected test user to be created.");
    }

    const token = await getOrCreateUserApiToken(creation.user.id);
    const encoded = Buffer.from("combo-user:strong-pass-123", "utf8").toString("base64");
    const principal = await resolveRequestPrincipal({
      headers: new Headers({
        Authorization: `Basic ${encoded}`,
        "Yona-Token": token,
      }),
      remoteAddress: "127.0.0.1",
    });

    expect(principal).toMatchObject({
      authMethod: "api-token",
      hasInvalidCredentials: false,
      isAuthenticated: true,
      isRateLimited: false,
      user: {
        id: creation.user.id,
      },
    });
  });

  it("rejects conflicting explicit credentials that resolve to different users", async () => {
    const first = await createAppUser({
      emailAddress: "first@example.com",
      loginId: "first-user",
      name: "First User",
      password: "strong-pass-123",
    });
    const second = await createAppUser({
      emailAddress: "second@example.com",
      loginId: "second-user",
      name: "Second User",
      password: "strong-pass-123",
    });
    if (!first.ok || !second.ok) {
      throw new Error("Expected test users to be created.");
    }

    const token = await getOrCreateUserApiToken(first.user.id);
    const encoded = Buffer.from("second-user:strong-pass-123", "utf8").toString("base64");
    const principal = await resolveRequestPrincipal({
      headers: new Headers({
        Authorization: `Basic ${encoded}`,
        "Yona-Token": token,
      }),
      remoteAddress: "127.0.0.1",
    });

    expect(principal).toMatchObject({
      authMethod: "anonymous",
      hasInvalidCredentials: true,
      isAuthenticated: false,
      isRateLimited: false,
      user: null,
    });
  });

  it("ignores spoofed x-yona headers as an authentication source", async () => {
    const principal = await resolveRequestPrincipal({
      headers: new Headers({
        "x-yona-can-admin": "true",
        "x-yona-can-direct-write": "true",
        "x-yona-role": "admin",
        "x-yona-user-email": "spoofed@example.com",
        "x-yona-user-id": "999",
        "x-yona-user-name": "Spoofed Admin",
      }),
      remoteAddress: "127.0.0.1",
    });

    expect(principal).toMatchObject({
      authMethod: "anonymous",
      hasInvalidCredentials: false,
      isAuthenticated: false,
      isRateLimited: false,
      user: null,
    });
  });

  it("marks invalid explicit credentials as invalid instead of silently falling back to anonymous", async () => {
    const principal = await resolveRequestPrincipal({
      headers: new Headers({
        Authorization: "token not-a-real-token",
      }),
      remoteAddress: "127.0.0.1",
    });

    expect(principal).toMatchObject({
      authMethod: "anonymous",
      hasInvalidCredentials: true,
      isAuthenticated: false,
      isRateLimited: false,
      user: null,
    });
  });

  it("rejects mismatched Authorization and Yona-Token credentials", async () => {
    const creation = await createAppUser({
      emailAddress: "tokens@example.com",
      loginId: "token-check",
      name: "Token Check",
      password: "strong-pass-123",
    });
    if (!creation.ok) {
      throw new Error("Expected test user to be created.");
    }

    const validToken = await getOrCreateUserApiToken(creation.user.id);
    const principal = await resolveRequestPrincipal({
      headers: new Headers({
        Authorization: `token ${validToken}`,
        "Yona-Token": "different-token",
      }),
      remoteAddress: "127.0.0.1",
    });

    expect(principal).toMatchObject({
      authMethod: "anonymous",
      hasInvalidCredentials: true,
      isAuthenticated: false,
      isRateLimited: false,
      user: null,
    });
  });

  it("creates and rotates a per-user API token", async () => {
    const creation = await createAppUser({
      emailAddress: "token@example.com",
      loginId: "token-user",
      name: "Token User",
      password: "strong-pass-123",
    });
    if (!creation.ok) {
      throw new Error("Expected test user to be created.");
    }

    const originalToken = await getOrCreateUserApiToken(creation.user.id);
    const rotatedToken = await rotateUserApiToken(creation.user.id);

    expect(rotatedToken).not.toBe(originalToken);
    await expect(
      resolveRequestPrincipal({
        headers: new Headers({
          Authorization: `token ${originalToken}`,
        }),
        remoteAddress: "127.0.0.1",
      }),
    ).resolves.toMatchObject({
      hasInvalidCredentials: true,
      isAuthenticated: false,
      isRateLimited: false,
    });
    await expect(
      resolveRequestPrincipal({
        headers: new Headers({
          Authorization: `token ${rotatedToken}`,
        }),
        remoteAddress: "127.0.0.1",
      }),
    ).resolves.toMatchObject({
      authMethod: "api-token",
      isAuthenticated: true,
      user: {
        id: creation.user.id,
      },
    });
  });

  it("hydrates the site-admin flag from the database", async () => {
    const creation = await createAppUser({
      emailAddress: "admin@example.com",
      loginId: "admin-user",
      name: "Admin User",
      password: "strong-pass-123",
    });
    if (!creation.ok) {
      throw new Error("Expected test user to be created.");
    }

    dbMock.grantSiteAdminForTests(creation.user.id);

    const token = await getOrCreateUserApiToken(creation.user.id);
    const principal = await resolveRequestPrincipal({
      headers: new Headers({
        Authorization: `token ${token}`,
      }),
      remoteAddress: "127.0.0.1",
    });

    expect(principal.user?.isSiteAdmin).toBe(true);
  });

  it("stores new API tokens as hashed state instead of raw bearer tokens", async () => {
    const creation = await createAppUser({
      emailAddress: "state@example.com",
      loginId: "state-user",
      name: "State User",
      password: "strong-pass-123",
    });
    if (!creation.ok) {
      throw new Error("Expected test user to be created.");
    }

    const token = await getOrCreateUserApiToken(creation.user.id);
    const storedToken = dbMock.readStoredApiTokenForTests(creation.user.id);

    expect(storedToken).toEqual(expect.stringMatching(/^v1:/));
    expect(storedToken).not.toBe(token);
  });

  it("serializes first-time API token issuance so concurrent reads return the same token", async () => {
    const creation = await createAppUser({
      emailAddress: "race@example.com",
      loginId: "race-user",
      name: "Race User",
      password: "strong-pass-123",
    });
    if (!creation.ok) {
      throw new Error("Expected test user to be created.");
    }

    const [firstToken, secondToken] = await Promise.all([
      getOrCreateUserApiToken(creation.user.id),
      getOrCreateUserApiToken(creation.user.id),
    ]);

    expect(firstToken).toBe(secondToken);
  });
});
