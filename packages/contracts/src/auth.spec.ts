import { describe, expect, it } from "vitest";
import {
  appSessionProjectionSchema,
  authErrorCodeSchema,
  completePasswordResetInputSchema,
  passwordResetRequestSchema,
  registerWithPasswordInputSchema,
  sessionProjectionSchema,
  sessionRoutePayloadSchema,
  signInWithPasswordInputSchema,
} from "./auth";

describe("auth contracts", () => {
  it("accepts anonymous session projections without actor identity", () => {
    expect(
      sessionProjectionSchema.parse({
        actorId: null,
        loginId: null,
        isAnonymous: true,
        isConfirmed: false,
        isSiteAdmin: false,
      }),
    ).toEqual({
      actorId: null,
      loginId: null,
      isAnonymous: true,
      isConfirmed: false,
      isSiteAdmin: false,
    });
  });

  it("rejects authenticated session projections without actor identity", () => {
    const result = sessionProjectionSchema.safeParse({
      actorId: null,
      loginId: null,
      isAnonymous: false,
      isConfirmed: true,
      isSiteAdmin: false,
    });

    expect(result.success).toBe(false);
  });

  it("keeps the password-reset request shape from the legacy controller contract", () => {
    expect(
      passwordResetRequestSchema.parse({
        loginId: "doortts",
        emailAddress: "doortts@gmail.com",
      }),
    ).toEqual({
      loginId: "doortts",
      emailAddress: "doortts@gmail.com",
    });
  });

  it("allows the canonical auth error codes used by the first auth baseline", () => {
    expect(authErrorCodeSchema.parse("auth.credentials-invalid")).toBe("auth.credentials-invalid");
    expect(authErrorCodeSchema.parse("auth.account-not-confirmed")).toBe(
      "auth.account-not-confirmed",
    );
  });

  it("validates canonical auth mutation inputs from packages/contracts", () => {
    expect(
      signInWithPasswordInputSchema.parse({
        identifier: " door ",
        password: "strong-pass-123",
      }),
    ).toEqual({
      identifier: "door",
      password: "strong-pass-123",
    });

    expect(
      registerWithPasswordInputSchema.parse({
        emailAddress: "door@example.com",
        loginId: "door",
        name: "Door TTS",
        password: "strong-pass-123",
      }),
    ).toEqual({
      emailAddress: "door@example.com",
      loginId: "door",
      name: "Door TTS",
      password: "strong-pass-123",
    });

    expect(
      completePasswordResetInputSchema.parse({
        newPassword: "changed-pass-456",
        token: " reset-token ",
      }),
    ).toEqual({
      newPassword: "changed-pass-456",
      token: "reset-token",
    });
  });

  it("rejects authenticated app sessions that omit app-facing identity fields", () => {
    const result = appSessionProjectionSchema.safeParse({
      actorId: 7,
      emailAddress: null,
      isAnonymous: false,
      isConfirmed: true,
      isSiteAdmin: false,
      loginId: "door",
      userLabel: null,
    });

    expect(result.success).toBe(false);
  });

  it("keeps the canonical auth session route payload superjson-safe", () => {
    expect(
      sessionRoutePayloadSchema.parse({
        session: {
          csrfToken: "csrf-token",
          expiresAt: "2030-01-01T00:00:00.000Z",
          projection: {
            actorId: 7,
            emailAddress: "door@example.com",
            isAnonymous: false,
            isConfirmed: true,
            isSiteAdmin: false,
            loginId: "door",
            userLabel: "Door TTS",
          },
          userId: 7,
        },
        user: {
          emailAddress: "door@example.com",
          id: 7,
          isConfirmed: true,
          isSiteAdmin: false,
          loginId: "door",
          name: "Door TTS",
        },
      }),
    ).toMatchObject({
      session: {
        userId: 7,
      },
      user: {
        loginId: "door",
      },
    });
  });
});
