import { __resetSessionStoreForTests, createSession, getSessionByToken } from "@yona/auth";
import { beforeEach, describe, expect, it } from "vitest";
import {
  authenticatePasswordSignIn,
  createAppUser,
  issuePasswordResetToken,
  resetAuthStateForTests,
  resetPasswordWithToken,
} from "./auth-state";

describe("app auth state", () => {
  beforeEach(() => {
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
});
