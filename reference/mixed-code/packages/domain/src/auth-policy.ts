import type { AuthErrorCode, SessionProjection } from "@yona/contracts";

export interface PasswordSignInAccount {
  actorId: number;
  isConfirmed: boolean;
  isSiteAdmin?: boolean;
  loginId: string;
}

export type PasswordSignInDecision =
  | {
      ok: true;
      session: SessionProjection;
    }
  | {
      code: AuthErrorCode;
      ok: false;
      session: SessionProjection;
    };

export function buildAnonymousSession(): SessionProjection {
  return {
    actorId: null,
    loginId: null,
    isAnonymous: true,
    isConfirmed: false,
    isSiteAdmin: false,
  };
}

export function resolvePasswordSignIn(
  account: PasswordSignInAccount | null,
  passwordMatches: boolean,
): PasswordSignInDecision {
  if (!account || !passwordMatches) {
    return {
      ok: false,
      code: "auth.credentials-invalid",
      session: buildAnonymousSession(),
    };
  }

  if (!account.isConfirmed) {
    return {
      ok: false,
      code: "auth.account-not-confirmed",
      session: buildAnonymousSession(),
    };
  }

  return {
    ok: true,
    session: {
      actorId: account.actorId,
      loginId: account.loginId,
      isAnonymous: false,
      isConfirmed: true,
      isSiteAdmin: account.isSiteAdmin ?? false,
    },
  };
}
