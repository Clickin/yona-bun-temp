import type {
  AppSessionProjection,
  AuthErrorCode,
  AuthUserSummary,
  CompletePasswordResetInput,
  PasswordResetRequest,
  RegisterWithPasswordInput,
  SessionProjection,
  SessionRoutePayload,
} from "@yona/contracts";
import {
  completePasswordResetInputSchema,
  passwordResetRequestSchema,
  registerWithPasswordInputSchema,
  signInWithPasswordInputSchema,
} from "@yona/contracts";
import {
  createPasswordAuthUser,
  findAuthUserById,
  findAuthUserByIdentifier,
  updateAuthUserPassword,
} from "@yona/db";
import { buildAnonymousSession, resolvePasswordSignIn } from "@yona/domain";
import {
  createSession,
  deleteAllSessionsByUserId,
  deleteSessionByToken,
  getSessionByToken,
} from "./session";
import type { CreateRuntimeSessionInput, CreatedSession } from "./session";
import type { SessionRecord } from "./session-store";
import { generateResetToken, hashToken, verifyToken } from "./tokens";
import { hashPassword, verifyPassword } from "./password";

const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

interface PasswordResetState {
  expiresAt: Date;
  tokenHash: string;
}

interface AppAuthState {
  pendingMutation: Promise<void>;
  resetTokensByUserId: Map<number, PasswordResetState>;
}

export type PasswordSignInResult =
  | {
      code: AuthErrorCode;
      ok: false;
      session: SessionProjection;
    }
  | {
      ok: true;
      session: SessionProjection;
      user: AuthUserSummary;
    };

export type CreateAppUserResult =
  | {
      code: "auth.login-id-conflict";
      ok: false;
    }
  | {
      ok: true;
      user: AuthUserSummary;
    };

export type CreateAppUserInput = RegisterWithPasswordInput;

export interface IssuePasswordResetTokenResult {
  expiresAt: Date | null;
  ok: true;
  resetToken: string | null;
}

export interface ResolvedCurrentSession {
  clearCookie: boolean;
  projection: AppSessionProjection;
  sessionRecord: SessionRecord | null;
  token: string | null;
  user: AuthUserSummary | null;
}

export interface IssuedAppSession {
  projection: AppSessionProjection;
  session: CreatedSession;
}

function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase();
}

function getGlobalState(): AppAuthState {
  const globalObject = globalThis as typeof globalThis & {
    __YONA_APP_AUTH_STATE__?: AppAuthState;
  };

  if (!globalObject.__YONA_APP_AUTH_STATE__) {
    globalObject.__YONA_APP_AUTH_STATE__ = {
      pendingMutation: Promise.resolve(),
      resetTokensByUserId: new Map(),
    };
  }

  return globalObject.__YONA_APP_AUTH_STATE__;
}

function summarizeUser(user: {
  emailAddress: string;
  id: number;
  isConfirmed: boolean;
  isSiteAdmin: boolean;
  loginId: string;
  name: string;
}): AuthUserSummary {
  return {
    emailAddress: user.emailAddress,
    id: user.id,
    isConfirmed: user.isConfirmed,
    isSiteAdmin: user.isSiteAdmin,
    loginId: user.loginId,
    name: user.name,
  };
}

async function withSerializedMutation<T>(mutation: () => Promise<T>): Promise<T> {
  const state = getGlobalState();
  const previousMutation = state.pendingMutation;
  let resolveCurrentMutation!: () => void;
  const currentMutation = new Promise<void>((resolve) => {
    resolveCurrentMutation = resolve;
  });

  state.pendingMutation = currentMutation;
  await previousMutation;

  try {
    return await mutation();
  } finally {
    resolveCurrentMutation();
  }
}

function clearExpiredResetTokens(now: Date): void {
  const state = getGlobalState();
  for (const [userId, tokenState] of state.resetTokensByUserId.entries()) {
    if (tokenState.expiresAt.getTime() < now.getTime()) {
      state.resetTokensByUserId.delete(userId);
    }
  }
}

export function buildAnonymousAppSession(): AppSessionProjection {
  return {
    ...buildAnonymousSession(),
    emailAddress: null,
    userLabel: null,
  };
}

export function buildAuthenticatedAppSession(user: AuthUserSummary): AppSessionProjection {
  return {
    actorId: user.id,
    emailAddress: user.emailAddress,
    isAnonymous: false,
    isConfirmed: user.isConfirmed,
    isSiteAdmin: user.isSiteAdmin,
    loginId: user.loginId,
    userLabel: user.name,
  };
}

function isDuplicateUserError(error: unknown): boolean {
  return error instanceof Error && /duplicate|unique|uq_/i.test(error.message);
}

export async function createAppUser(input: CreateAppUserInput): Promise<CreateAppUserResult> {
  return withSerializedMutation(async () => {
    const parsedInput = registerWithPasswordInputSchema.parse(input);
    const loginId = normalizeIdentifier(parsedInput.loginId);
    const emailAddress = normalizeIdentifier(parsedInput.emailAddress);

    const [existingByLoginId, existingByEmail] = await Promise.all([
      findAuthUserByIdentifier(loginId),
      findAuthUserByIdentifier(emailAddress),
    ]);

    if (existingByLoginId || existingByEmail) {
      return {
        code: "auth.login-id-conflict",
        ok: false,
      };
    }

    const passwordSalt = generateResetToken();
    const passwordHash = await hashPassword(parsedInput.password, passwordSalt);

    try {
      const user = await createPasswordAuthUser({
        emailAddress,
        loginId,
        name: parsedInput.name,
        passwordHash,
        passwordSalt,
      });

      return {
        ok: true,
        user: summarizeUser(user),
      };
    } catch (error) {
      if (isDuplicateUserError(error)) {
        return {
          code: "auth.login-id-conflict",
          ok: false,
        };
      }

      throw error;
    }
  });
}

export async function authenticatePasswordSignIn(
  identifier: string,
  password: string,
): Promise<PasswordSignInResult> {
  const parsedInput = signInWithPasswordInputSchema.parse({
    identifier,
    password,
  });
  const user = await findAuthUserByIdentifier(parsedInput.identifier);
  const passwordMatches =
    user === null || !user.passwordHash || !user.passwordSalt
      ? false
      : await verifyPassword(parsedInput.password, user.passwordHash, user.passwordSalt);

  const decision = resolvePasswordSignIn(
    user === null
      ? null
      : {
          actorId: user.id,
          isConfirmed: user.isConfirmed,
          isSiteAdmin: user.isSiteAdmin,
          loginId: user.loginId,
        },
    passwordMatches,
  );

  if (!decision.ok) {
    return decision;
  }

  if (user === null) {
    return {
      code: "auth.credentials-invalid",
      ok: false,
      session: buildAnonymousSession(),
    };
  }

  return {
    ok: true,
    session: decision.session,
    user: summarizeUser(user),
  };
}

export async function findAppUserById(userId: number): Promise<AuthUserSummary | null> {
  const user = await findAuthUserById(userId);
  return user ? summarizeUser(user) : null;
}

export async function issuePasswordResetToken(
  request: PasswordResetRequest,
  now = new Date(),
): Promise<IssuePasswordResetTokenResult> {
  return withSerializedMutation(async () => {
    const parsedRequest = passwordResetRequestSchema.parse(request);
    const user = await findAuthUserByIdentifier(parsedRequest.loginId);

    if (
      !user ||
      user.loginId !== normalizeIdentifier(parsedRequest.loginId) ||
      user.emailAddress !== normalizeIdentifier(parsedRequest.emailAddress)
    ) {
      return {
        expiresAt: null,
        ok: true,
        resetToken: null,
      };
    }

    const resetToken = generateResetToken();
    const expiresAt = new Date(now.getTime() + PASSWORD_RESET_TOKEN_TTL_MS);
    getGlobalState().resetTokensByUserId.set(user.id, {
      expiresAt,
      tokenHash: await hashToken(resetToken),
    });

    return {
      expiresAt,
      ok: true,
      resetToken,
    };
  });
}

export async function resetPasswordByAdmin(input: {
  userId: number;
}): Promise<{ ok: false } | { ok: true; temporaryPassword: string; user: AuthUserSummary }> {
  return withSerializedMutation(async () => {
    const user = await findAppUserById(input.userId);
    if (!user) {
      return {
        ok: false,
      };
    }

    const temporaryPassword = generateResetToken().slice(0, 16);
    const passwordSalt = generateResetToken();
    const passwordHash = await hashPassword(temporaryPassword, passwordSalt);

    await updateAuthUserPassword({
      passwordHash,
      passwordSalt,
      userId: user.id,
    });
    getGlobalState().resetTokensByUserId.delete(user.id);
    await deleteAllSessionsByUserId(user.id);

    return {
      ok: true,
      temporaryPassword,
      user,
    };
  });
}

export async function resetPasswordWithToken(
  input: {
    newPassword: string;
    token: string;
  },
  now = new Date(),
): Promise<{ ok: false } | { ok: true; user: AuthUserSummary }> {
  return withSerializedMutation(async () => {
    const parsedInput: CompletePasswordResetInput = completePasswordResetInputSchema.parse(input);
    const state = getGlobalState();
    clearExpiredResetTokens(now);

    for (const [userId, tokenState] of state.resetTokensByUserId.entries()) {
      const tokenMatches = await verifyToken(parsedInput.token, tokenState.tokenHash);
      if (!tokenMatches) {
        continue;
      }

      const passwordSalt = generateResetToken();
      const passwordHash = await hashPassword(parsedInput.newPassword, passwordSalt);
      await updateAuthUserPassword({
        passwordHash,
        passwordSalt,
        userId,
      });
      state.resetTokensByUserId.delete(userId);
      await deleteAllSessionsByUserId(userId);

      const user = await findAppUserById(userId);
      if (!user) {
        return {
          ok: false,
        };
      }

      return {
        ok: true,
        user,
      };
    }

    return {
      ok: false,
    };
  });
}

export async function readCurrentSession(
  token: string | undefined,
): Promise<ResolvedCurrentSession> {
  if (!token) {
    return {
      clearCookie: false,
      projection: buildAnonymousAppSession(),
      sessionRecord: null,
      token: null,
      user: null,
    };
  }

  const sessionRecord = await getSessionByToken(token);
  if (!sessionRecord) {
    await deleteSessionByToken(token);
    return {
      clearCookie: true,
      projection: buildAnonymousAppSession(),
      sessionRecord: null,
      token,
      user: null,
    };
  }

  const user = await findAppUserById(sessionRecord.userId);
  if (!user) {
    await deleteSessionByToken(token);
    return {
      clearCookie: true,
      projection: buildAnonymousAppSession(),
      sessionRecord: null,
      token,
      user: null,
    };
  }

  return {
    clearCookie: false,
    projection: buildAuthenticatedAppSession(user),
    sessionRecord,
    token,
    user,
  };
}

export async function issueAppSession(
  userId: number,
  input: Omit<CreateRuntimeSessionInput, "userId"> = {},
): Promise<IssuedAppSession> {
  const session = await createSession({
    ...input,
    userId,
  });
  const user = await findAppUserById(userId);

  return {
    projection: user ? buildAuthenticatedAppSession(user) : buildAnonymousAppSession(),
    session,
  };
}

export async function buildSessionRoutePayload(
  token: string | undefined,
): Promise<{ clearCookie: boolean; payload: SessionRoutePayload }> {
  const currentSession = await readCurrentSession(token);

  if (!currentSession.sessionRecord || !currentSession.user) {
    return {
      clearCookie: currentSession.clearCookie,
      payload: {
        session: null,
        user: null,
      },
    };
  }

  return {
    clearCookie: currentSession.clearCookie,
    payload: {
      session: {
        csrfToken: currentSession.sessionRecord.csrfToken,
        expiresAt: currentSession.sessionRecord.expiresAt.toISOString(),
        projection: currentSession.projection,
        userId: currentSession.sessionRecord.userId,
      },
      user: currentSession.user,
    },
  };
}

export function resetAuthStateForTests(): void {
  const globalObject = globalThis as typeof globalThis & {
    __YONA_APP_AUTH_STATE__?: AppAuthState;
  };

  globalObject.__YONA_APP_AUTH_STATE__ = {
    pendingMutation: Promise.resolve(),
    resetTokensByUserId: new Map(),
  };
}
