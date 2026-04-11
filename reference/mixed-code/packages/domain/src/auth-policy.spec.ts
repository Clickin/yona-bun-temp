import { describe, expect, it } from "vitest";
import { resolvePasswordSignIn } from "./auth-policy";

describe("password sign-in policy", () => {
  it("collapses missing accounts and password mismatches into the same invalid-credentials outcome", () => {
    expect(resolvePasswordSignIn(null, false)).toEqual({
      ok: false,
      code: "auth.credentials-invalid",
      session: {
        actorId: null,
        loginId: null,
        isAnonymous: true,
        isConfirmed: false,
        isSiteAdmin: false,
      },
    });

    expect(
      resolvePasswordSignIn(
        {
          actorId: 3,
          loginId: "kjkmadness",
          isConfirmed: true,
        },
        false,
      ),
    ).toEqual({
      ok: false,
      code: "auth.credentials-invalid",
      session: {
        actorId: null,
        loginId: null,
        isAnonymous: true,
        isConfirmed: false,
        isSiteAdmin: false,
      },
    });
  });

  it("rejects not-confirmed accounts before creating an authenticated session", () => {
    expect(
      resolvePasswordSignIn(
        {
          actorId: 7,
          loginId: "fakeUser",
          isConfirmed: false,
        },
        true,
      ),
    ).toEqual({
      ok: false,
      code: "auth.account-not-confirmed",
      session: {
        actorId: null,
        loginId: null,
        isAnonymous: true,
        isConfirmed: false,
        isSiteAdmin: false,
      },
    });
  });

  it("returns a typed session projection for a valid confirmed user", () => {
    expect(
      resolvePasswordSignIn(
        {
          actorId: 11,
          loginId: "kjkmadness",
          isConfirmed: true,
          isSiteAdmin: true,
        },
        true,
      ),
    ).toEqual({
      ok: true,
      session: {
        actorId: 11,
        loginId: "kjkmadness",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
      },
    });
  });
});
