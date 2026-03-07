import { describe, expect, it } from "vitest";
import { authErrorCodeSchema, passwordResetRequestSchema, sessionProjectionSchema } from "./auth";

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
});
