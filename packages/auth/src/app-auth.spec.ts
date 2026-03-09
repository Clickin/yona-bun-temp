import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RegisterWithPasswordInput } from "@yona/contracts";

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
    },
  };
});

vi.mock("@yona/db", () => dbMock);

import { __resetSessionStoreForTests, createSession, getSessionByToken } from "./session";
import {
  authenticatePasswordSignIn,
  createAppUser,
  issuePasswordResetToken,
  resetAuthStateForTests,
  resetPasswordByAdmin,
  resetPasswordWithToken,
} from "./app-service";

describe("app auth service", () => {
  beforeEach(() => {
    dbMock.__resetDbForTests();
    resetAuthStateForTests();
    __resetSessionStoreForTests();
  });

  it("does not seed a bootstrap admin account", async () => {
    await expect(authenticatePasswordSignIn("admin", "adminpass123")).resolves.toMatchObject({
      code: "auth.credentials-invalid",
      ok: false,
    });

    const creation = await createAppUser({
      emailAddress: "first-user@gmail.com",
      loginId: "first-user",
      name: "First User",
      password: "strong-pass-123",
    });

    expect(creation).toMatchObject({
      ok: true,
      user: {
        id: 1,
      },
    });
  });

  it("creates a new password account and authenticates with login id or email", async () => {
    const creation = await createAppUser({
      emailAddress: "doortts@gmail.com",
      loginId: "doortts",
      name: "Door TTS",
      password: "strong-pass-123",
    });

    expect(creation.ok).toBe(true);

    const loginIdSignIn = await authenticatePasswordSignIn("doortts", "strong-pass-123");
    const emailSignIn = await authenticatePasswordSignIn("doortts@gmail.com", "strong-pass-123");

    expect(loginIdSignIn).toMatchObject({
      ok: true,
      session: {
        isAnonymous: false,
        loginId: "doortts",
      },
    });
    expect(emailSignIn).toMatchObject({
      ok: true,
      session: {
        isAnonymous: false,
        loginId: "doortts",
      },
    });
  });

  it("rejects duplicate login ids and duplicate email addresses", async () => {
    await createAppUser({
      emailAddress: "doortts@gmail.com",
      loginId: "doortts",
      name: "Door TTS",
      password: "strong-pass-123",
    });

    await expect(
      createAppUser({
        emailAddress: "other@gmail.com",
        loginId: "doortts",
        name: "Other User",
        password: "strong-pass-123",
      }),
    ).resolves.toEqual({
      code: "auth.login-id-conflict",
      ok: false,
    });

    await expect(
      createAppUser({
        emailAddress: "doortts@gmail.com",
        loginId: "other-user",
        name: "Other User",
        password: "strong-pass-123",
      }),
    ).resolves.toEqual({
      code: "auth.login-id-conflict",
      ok: false,
    });
  });

  it("rejects unexpected bootstrap flags so the public create-user contract stays narrow", async () => {
    await expect(
      createAppUser({
        emailAddress: "door@example.com",
        isConfirmed: false,
        loginId: "door",
        name: "Door TTS",
        password: "strong-pass-123",
      } as RegisterWithPasswordInput & { isConfirmed: boolean }),
    ).rejects.toThrowError();
  });

  it("preserves uniqueness when concurrent registrations race", async () => {
    const [first, second] = await Promise.all([
      createAppUser({
        emailAddress: "door@example.com",
        loginId: "door",
        name: "Door One",
        password: "strong-pass-123",
      }),
      createAppUser({
        emailAddress: "door@example.com",
        loginId: "door",
        name: "Door Two",
        password: "strong-pass-123",
      }),
    ]);

    expect([first, second].filter((result) => result.ok)).toHaveLength(1);
    expect([first, second].filter((result) => !result.ok)).toEqual([
      {
        code: "auth.login-id-conflict",
        ok: false,
      },
    ]);
  });

  it("issues a reset token, rotates the password, and invalidates active sessions", async () => {
    const creation = await createAppUser({
      emailAddress: "doortts@gmail.com",
      loginId: "doortts",
      name: "Door TTS",
      password: "strong-pass-123",
    });

    if (!creation.ok) {
      throw new Error("Expected test user to be created.");
    }

    const session = await createSession({
      userId: creation.user.id,
    });

    expect(await getSessionByToken(session.token)).not.toBeNull();

    const resetRequest = await issuePasswordResetToken({
      emailAddress: "doortts@gmail.com",
      loginId: "doortts",
    });

    expect(resetRequest.resetToken).toEqual(expect.any(String));

    const reset = await resetPasswordWithToken({
      newPassword: "changed-pass-456",
      token: resetRequest.resetToken!,
    });

    expect(reset).toMatchObject({
      ok: true,
    });
    expect(await getSessionByToken(session.token)).toBeNull();

    await expect(authenticatePasswordSignIn("doortts", "strong-pass-123")).resolves.toMatchObject({
      code: "auth.credentials-invalid",
      ok: false,
    });
    await expect(authenticatePasswordSignIn("doortts", "changed-pass-456")).resolves.toMatchObject({
      ok: true,
      session: {
        isAnonymous: false,
      },
    });
  });

  it("fails a password reset when the token is invalid", async () => {
    // Legacy provenance:
    // - yona-original/test/models/PasswordResetTest.java:testResetPassword_wrongHash
    await createAppUser({
      emailAddress: "door@example.com",
      loginId: "door",
      name: "Door TTS",
      password: "strong-pass-123",
    });

    await expect(
      resetPasswordWithToken({
        newPassword: "changed-pass-456",
        token: "not-a-real-token",
      }),
    ).resolves.toEqual({
      ok: false,
    });
  });

  it("fails a password reset when the token is expired", async () => {
    // Legacy provenance:
    // - yona-original/test/models/PasswordResetTest.java:testIsValidResetHash_expiredHash
    const issuedAt = new Date("2030-01-01T00:00:00.000Z");
    const expiredAt = new Date(issuedAt.getTime() + 60 * 60 * 1000 + 5_000);

    await createAppUser({
      emailAddress: "door@example.com",
      loginId: "door",
      name: "Door TTS",
      password: "strong-pass-123",
    });

    const resetRequest = await issuePasswordResetToken(
      {
        emailAddress: "door@example.com",
        loginId: "door",
      },
      issuedAt,
    );

    await expect(
      resetPasswordWithToken(
        {
          newPassword: "changed-pass-456",
          token: resetRequest.resetToken!,
        },
        expiredAt,
      ),
    ).resolves.toEqual({
      ok: false,
    });
  });

  it("resets a password with an admin-generated temporary password and invalidates sessions", async () => {
    const creation = await createAppUser({
      emailAddress: "doortts@gmail.com",
      loginId: "doortts",
      name: "Door TTS",
      password: "strong-pass-123",
    });

    if (!creation.ok) {
      throw new Error("Expected test user to be created.");
    }

    const session = await createSession({
      userId: creation.user.id,
    });

    const adminReset = await resetPasswordByAdmin({
      userId: creation.user.id,
    });

    expect(adminReset).toMatchObject({
      ok: true,
      user: {
        id: creation.user.id,
      },
    });
    expect(await getSessionByToken(session.token)).toBeNull();

    if (!adminReset.ok) {
      throw new Error("Expected admin reset to succeed.");
    }

    await expect(authenticatePasswordSignIn("doortts", "strong-pass-123")).resolves.toMatchObject({
      code: "auth.credentials-invalid",
      ok: false,
    });
    await expect(
      authenticatePasswordSignIn("doortts", adminReset.temporaryPassword),
    ).resolves.toMatchObject({
      ok: true,
      session: {
        isAnonymous: false,
      },
    });
  });

  it("invalidates outstanding reset tokens when an admin rotates the password", async () => {
    const creation = await createAppUser({
      emailAddress: "doortts@gmail.com",
      loginId: "doortts",
      name: "Door TTS",
      password: "strong-pass-123",
    });

    if (!creation.ok) {
      throw new Error("Expected test user to be created.");
    }

    const resetRequest = await issuePasswordResetToken({
      emailAddress: "doortts@gmail.com",
      loginId: "doortts",
    });

    if (!resetRequest.resetToken) {
      throw new Error("Expected reset token to be issued.");
    }

    const adminReset = await resetPasswordByAdmin({
      userId: creation.user.id,
    });

    if (!adminReset.ok) {
      throw new Error("Expected admin reset to succeed.");
    }

    await expect(
      resetPasswordWithToken({
        newPassword: "changed-pass-456",
        token: resetRequest.resetToken,
      }),
    ).resolves.toEqual({
      ok: false,
    });

    await expect(
      authenticatePasswordSignIn("doortts", adminReset.temporaryPassword),
    ).resolves.toMatchObject({
      ok: true,
      session: {
        isAnonymous: false,
      },
    });
  });
});
