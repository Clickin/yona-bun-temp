import {
  deleteCookie,
  getCookie,
  getRequestHeader,
  getRequestIP,
  setCookie,
} from "@tanstack/react-start/server";
import {
  createSession,
  deleteSessionByToken,
  getSessionByToken,
  getSessionCookieName,
  getSessionCookieOptions,
} from "@yona/auth";
import type { SessionRecord } from "@yona/auth";
import type { AuthErrorCode } from "@yona/contracts";
import {
  authenticatePasswordSignIn,
  createAppUser,
  findAppUserById,
  issuePasswordResetToken,
  resetPasswordWithToken,
} from "./auth-state";
import {
  buildAnonymousAppSession,
  buildAuthenticatedAppSession,
  type AppSessionProjection,
  type SessionRoutePayload,
} from "./auth-shared";

const sessionCookieName = getSessionCookieName();

function clearSessionCookie(): void {
  deleteCookie(sessionCookieName, {
    path: "/",
  });
}

async function readSessionRecordFromCookie(token: string | undefined): Promise<{
  clearCookie: boolean;
  sessionRecord: SessionRecord | null;
  token: string | null;
}> {
  if (!token) {
    return {
      clearCookie: false,
      sessionRecord: null,
      token: null,
    };
  }

  const sessionRecord = await getSessionByToken(token);
  if (!sessionRecord) {
    await deleteSessionByToken(token);
    return {
      clearCookie: true,
      sessionRecord: null,
      token,
    };
  }

  return {
    clearCookie: false,
    sessionRecord,
    token,
  };
}

async function resolveCurrentSessionPayload(): Promise<{
  clearCookie: boolean;
  projection: AppSessionProjection;
  sessionRecord: SessionRecord | null;
  token: string | null;
  user: null | {
    emailAddress: string;
    id: number;
    isConfirmed: boolean;
    isSiteAdmin: boolean;
    loginId: string;
    name: string;
  };
}> {
  const token = getCookie(sessionCookieName);
  const sessionResolution = await readSessionRecordFromCookie(token);

  if (!sessionResolution.sessionRecord) {
    return {
      clearCookie: sessionResolution.clearCookie,
      projection: buildAnonymousAppSession(),
      sessionRecord: null,
      token: sessionResolution.token,
      user: null,
    };
  }

  const user = await findAppUserById(sessionResolution.sessionRecord.userId);
  if (!user) {
    if (sessionResolution.token) {
      await deleteSessionByToken(sessionResolution.token);
    }

    return {
      clearCookie: true,
      projection: buildAnonymousAppSession(),
      sessionRecord: null,
      token: sessionResolution.token,
      user: null,
    };
  }

  return {
    clearCookie: sessionResolution.clearCookie,
    projection: buildAuthenticatedAppSession(user),
    sessionRecord: sessionResolution.sessionRecord,
    token: sessionResolution.token,
    user,
  };
}

async function issueSessionCookie(userId: number): Promise<AppSessionProjection> {
  const session = await createSession({
    ipAddress: getRequestIP({ xForwardedFor: true }),
    userAgent: getRequestHeader("user-agent") ?? "unknown",
    userId,
  });

  setCookie(sessionCookieName, session.token, getSessionCookieOptions());

  const user = await findAppUserById(userId);
  if (!user) {
    return buildAnonymousAppSession();
  }

  return buildAuthenticatedAppSession(user);
}

function authErrorMessage(code: AuthErrorCode): string {
  if (code === "auth.account-not-confirmed") {
    return "This account exists but is not confirmed yet.";
  }

  if (code === "auth.login-id-conflict") {
    return "That login ID or email address is already in use.";
  }

  return "Invalid login ID, email, or password.";
}

export async function readCurrentSessionServer(): Promise<AppSessionProjection> {
  const payload = await resolveCurrentSessionPayload();
  if (payload.clearCookie) {
    clearSessionCookie();
  }

  return payload.projection;
}

export async function signInWithPasswordServer(data: {
  identifier: string;
  password: string;
}): Promise<
  | {
      code: AuthErrorCode;
      message: string;
      ok: false;
    }
  | {
      ok: true;
      session: AppSessionProjection;
    }
> {
  const result = await authenticatePasswordSignIn(data.identifier, data.password);

  if (!result.ok) {
    return {
      code: result.code,
      message: authErrorMessage(result.code),
      ok: false,
    };
  }

  return {
    ok: true,
    session: await issueSessionCookie(result.user.id),
  };
}

export async function registerWithPasswordServer(data: {
  emailAddress: string;
  loginId: string;
  name: string;
  password: string;
}): Promise<
  | {
      code: "auth.login-id-conflict";
      message: string;
      ok: false;
    }
  | {
      ok: true;
      session: AppSessionProjection;
    }
> {
  const result = await createAppUser(data);

  if (!result.ok) {
    return {
      code: result.code,
      message: authErrorMessage(result.code),
      ok: false,
    };
  }

  return {
    ok: true,
    session: await issueSessionCookie(result.user.id),
  };
}

export async function requestPasswordResetServer(data: {
  emailAddress: string;
  loginId: string;
}): Promise<{ ok: true }> {
  await issuePasswordResetToken({
    emailAddress: data.emailAddress,
    loginId: data.loginId,
  });

  return {
    ok: true,
  };
}

export async function completePasswordResetServer(data: {
  newPassword: string;
  token: string;
}): Promise<
  | {
      message: string;
      ok: false;
    }
  | {
      ok: true;
      session: AppSessionProjection;
    }
> {
  const currentToken = getCookie(sessionCookieName);
  const currentSession = currentToken === undefined ? null : await getSessionByToken(currentToken);
  const result = await resetPasswordWithToken(data);

  if (!result.ok) {
    return {
      message: "Reset token is invalid or has expired.",
      ok: false,
    };
  }

  if (currentSession?.userId === result.user.id) {
    clearSessionCookie();
  }

  return {
    ok: true,
    session: buildAnonymousAppSession(),
  };
}

export async function signOutServer(): Promise<{
  ok: true;
  session: AppSessionProjection;
}> {
  const token = getCookie(sessionCookieName);
  if (token) {
    await deleteSessionByToken(token);
  }

  clearSessionCookie();

  return {
    ok: true,
    session: buildAnonymousAppSession(),
  };
}

export async function readSessionRoutePayloadServer(): Promise<SessionRoutePayload> {
  const payload = await resolveCurrentSessionPayload();
  if (payload.clearCookie) {
    clearSessionCookie();
  }

  if (!payload.sessionRecord || !payload.user) {
    return {
      session: null,
      user: null,
    };
  }

  return {
    session: {
      csrfToken: payload.sessionRecord.csrfToken,
      expiresAt: payload.sessionRecord.expiresAt.toISOString(),
      projection: payload.projection,
      userId: payload.sessionRecord.userId,
    },
    user: payload.user,
  };
}
