import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  completePasswordResetMock,
  readCurrentSessionMock,
  registerWithPasswordMock,
  requestPasswordResetMock,
  signInWithPasswordMock,
  signOutMock,
} = vi.hoisted(() => ({
  completePasswordResetMock: vi.fn(),
  readCurrentSessionMock: vi.fn(),
  registerWithPasswordMock: vi.fn(),
  requestPasswordResetMock: vi.fn(),
  signInWithPasswordMock: vi.fn(),
  signOutMock: vi.fn(),
}));

vi.mock("./auth", () => ({
  completePasswordReset: completePasswordResetMock,
  readCurrentSession: readCurrentSessionMock,
  registerWithPassword: registerWithPasswordMock,
  requestPasswordReset: requestPasswordResetMock,
  signInWithPassword: signInWithPasswordMock,
  signOut: signOutMock,
}));

import { createAppAuthCaller } from "./auth-client";

describe("app auth caller adapters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates readCurrentSession to the canonical app auth function", async () => {
    readCurrentSessionMock.mockResolvedValueOnce({
      actorId: null,
      emailAddress: null,
      isAnonymous: true,
      isConfirmed: false,
      isSiteAdmin: false,
      loginId: null,
      userLabel: null,
    });

    const caller = createAppAuthCaller();

    await expect(caller.readCurrentSession()).resolves.toMatchObject({
      isAnonymous: true,
    });

    expect(readCurrentSessionMock).toHaveBeenCalledTimes(1);
  });

  it("delegates each mutation to the canonical app auth function", async () => {
    signInWithPasswordMock.mockResolvedValueOnce({
      code: "auth.credentials-invalid",
      message: "Invalid login ID, email, or password.",
      ok: false,
    });
    registerWithPasswordMock.mockResolvedValueOnce({
      code: "auth.login-id-conflict",
      message: "That login ID or email address is already in use.",
      ok: false,
    });
    requestPasswordResetMock.mockResolvedValueOnce({
      ok: true,
    });
    completePasswordResetMock.mockResolvedValueOnce({
      message: "Reset token is invalid or has expired.",
      ok: false,
    });
    signOutMock.mockResolvedValueOnce({
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

    const caller = createAppAuthCaller();

    await caller.signInWithPassword({
      identifier: "door",
      password: "wrong-pass-123",
    });
    await caller.registerWithPassword({
      emailAddress: "door@example.com",
      loginId: "door",
      name: "Door TTS",
      password: "strong-pass-123",
    });
    await caller.requestPasswordReset({
      emailAddress: "door@example.com",
      loginId: "door",
    });
    await caller.completePasswordReset({
      newPassword: "changed-pass-456",
      token: "not-a-real-token",
    });
    await caller.signOut();

    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      data: {
        identifier: "door",
        password: "wrong-pass-123",
      },
    });
    expect(registerWithPasswordMock).toHaveBeenCalledWith({
      data: {
        emailAddress: "door@example.com",
        loginId: "door",
        name: "Door TTS",
        password: "strong-pass-123",
      },
    });
    expect(requestPasswordResetMock).toHaveBeenCalledWith({
      data: {
        emailAddress: "door@example.com",
        loginId: "door",
      },
    });
    expect(completePasswordResetMock).toHaveBeenCalledWith({
      data: {
        newPassword: "changed-pass-456",
        token: "not-a-real-token",
      },
    });
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });
});
