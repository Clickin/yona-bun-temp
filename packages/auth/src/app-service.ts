import type {
  AppSessionProjection,
  AuthErrorCode,
  AuthUserSummary,
  ChangeCurrentUserPasswordInput,
  CompletePasswordResetInput,
  PasswordResetRequest,
  RegisterWithPasswordInput,
  SessionProjection,
  SessionRoutePayload,
  UpdateCurrentUserProfileInput,
} from "@yona/contracts";
import {
  changeCurrentUserPasswordInputSchema,
  completePasswordResetInputSchema,
  passwordResetRequestSchema,
  registerWithPasswordInputSchema,
  signInWithPasswordInputSchema,
  updateCurrentUserProfileInputSchema,
} from "@yona/contracts";
import { and, eq, like } from "drizzle-orm";
import {
  createPasswordAuthUser,
  ensureAuthUserCredentialId,
  findAuthUserByCredentialId,
  findAuthUserById,
  findAuthUserByIdentifier,
  updateAuthUserPassword,
  updateAuthUserProfile,
} from "@yona/db";
import { buildAnonymousSession, resolvePasswordSignIn } from "@yona/domain";
import {
  createSession,
  deleteAllSessionsByUserId,
  deleteSessionByToken,
  getSessionByToken,
  upsertSessionMetadata,
} from "./session";
import type { CreateRuntimeSessionInput, CreatedSession } from "./session";
import type { SessionRecord } from "./session-store";
import { generateResetToken } from "./tokens";
import {
  createBetterAuthSessionForActor,
  getBetterAuth,
  readBetterAuthSessionFromCookie,
  resetBetterAuthStateForTests,
} from "./better-auth";
import { hashCredentialPassword, verifyCredentialPassword, verifyPassword } from "./password";

const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

interface PasswordResetState {
  expiresAt: Date;
  tokenUserId: number;
}

interface AppAuthState {
  pendingMutation: Promise<void>;
  resetTokensByToken: Map<string, PasswordResetState>;
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
      resetTokensByToken: new Map(),
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
  for (const [token, tokenState] of state.resetTokensByToken.entries()) {
    if (tokenState.expiresAt.getTime() < now.getTime()) {
      state.resetTokensByToken.delete(token);
    }
  }
}

function clearFallbackResetTokensForUser(userId: number): void {
  const state = getGlobalState();
  for (const [token, tokenState] of state.resetTokensByToken.entries()) {
    if (tokenState.tokenUserId === userId) {
      state.resetTokensByToken.delete(token);
    }
  }
}

async function deletePersistedResetTokensForUser(userId: number): Promise<void> {
  try {
    const dbModule = await import("@yona/db");
    const findPersistedAuthUserById = (
      dbModule as { findAuthUserById?: (targetUserId: number) => Promise<any> }
    ).findAuthUserById;
    const getRuntimeDb = (dbModule as { getDb?: () => any }).getDb;
    const getRuntimeDbSchema = (dbModule as { getDbSchema?: (db: any) => any }).getDbSchema;

    if (!findPersistedAuthUserById || !getRuntimeDb || !getRuntimeDbSchema) {
      return;
    }

    const authUser = await findPersistedAuthUserById(userId);
    const credentialUserId =
      authUser && typeof authUser === "object" && "credentialUserId" in authUser
        ? (authUser.credentialUserId as null | number)
        : null;

    if (!credentialUserId) {
      return;
    }

    const db = getRuntimeDb();
    const schema = getRuntimeDbSchema(db);

    await (db as any)
      .delete(schema.verification)
      .where(
        and(
          eq(schema.verification.value, String(credentialUserId)),
          like(schema.verification.identifier, "reset-password:%"),
        ),
      );
  } catch {
    // Verification persistence can be unavailable in isolated unit tests.
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

async function verifyEffectivePassword(
  user: Awaited<ReturnType<typeof findAuthUserByIdentifier>>,
  password: string,
) {
  if (!user) {
    return false;
  }

  const effectivePasswordHash = user.credentialPasswordHash ?? user.passwordHash ?? null;
  if (effectivePasswordHash && !user.passwordSalt) {
    return verifyCredentialPassword(password, effectivePasswordHash);
  }

  if (user.credentialPasswordHash) {
    return verifyCredentialPassword(password, user.credentialPasswordHash);
  }

  if (user.legacyPasswordHash && user.legacyPasswordSalt) {
    const matches = await verifyPassword(
      password,
      user.legacyPasswordHash,
      user.legacyPasswordSalt,
    );
    if (matches) {
      await updateAuthUserPassword({
        passwordHash: await hashCredentialPassword(password),
        passwordSalt: null,
        userId: user.id,
      });
    }

    return matches;
  }

  if (user.passwordHash && user.passwordSalt) {
    return verifyPassword(password, user.passwordHash, user.passwordSalt);
  }

  return false;
}

async function issueFallbackResetToken(
  actorUserId: number,
  now: Date,
): Promise<IssuePasswordResetTokenResult> {
  const resetToken = generateResetToken();
  const expiresAt = new Date(now.getTime() + PASSWORD_RESET_TOKEN_TTL_MS);
  getGlobalState().resetTokensByToken.set(resetToken, {
    expiresAt,
    tokenUserId: actorUserId,
  });

  return {
    expiresAt,
    ok: true,
    resetToken,
  };
}

async function readFallbackCurrentSession(token: string): Promise<ResolvedCurrentSession> {
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

    try {
      const user = await createPasswordAuthUser({
        emailAddress,
        loginId,
        name: parsedInput.name,
        passwordHash: await hashCredentialPassword(parsedInput.password),
        passwordSalt: "",
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
  const passwordMatches = await verifyEffectivePassword(user, parsedInput.password);

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

export async function updateCurrentUserProfile(
  userId: number,
  input: UpdateCurrentUserProfileInput,
): Promise<{ ok: false; code: "auth.login-id-conflict" } | { ok: true; user: AuthUserSummary }> {
  return withSerializedMutation(async () => {
    const parsedInput = updateCurrentUserProfileInputSchema.parse(input);
    const nextEmailAddress = normalizeIdentifier(parsedInput.emailAddress);
    const conflictingUser = await findAuthUserByIdentifier(nextEmailAddress);
    if (conflictingUser && conflictingUser.id !== userId) {
      return {
        code: "auth.login-id-conflict",
        ok: false,
      };
    }

    await updateAuthUserProfile({
      emailAddress: nextEmailAddress,
      name: parsedInput.name,
      userId,
    });

    const updatedUser = await findAppUserById(userId);
    if (!updatedUser) {
      throw new Error("User profile update target was not found.");
    }

    return {
      ok: true,
      user: updatedUser,
    };
  });
}

export async function changeCurrentUserPassword(
  userId: number,
  input: ChangeCurrentUserPasswordInput,
): Promise<{ ok: false; code: "auth.credentials-invalid" } | { ok: true }> {
  return withSerializedMutation(async () => {
    const parsedInput = changeCurrentUserPasswordInputSchema.parse(input);
    const user = await findAuthUserById(userId);
    const currentPasswordMatches = await verifyEffectivePassword(user, parsedInput.currentPassword);
    if (!currentPasswordMatches) {
      return {
        code: "auth.credentials-invalid",
        ok: false,
      };
    }

    await updateAuthUserPassword({
      passwordHash: await hashCredentialPassword(parsedInput.newPassword),
      passwordSalt: null,
      userId,
    });
    await deleteAllSessionsByUserId(userId);

    return {
      ok: true,
    };
  });
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

    try {
      const auth = await getBetterAuth();
      const ctx = await auth.$context;
      const credentialUserId = user.credentialUserId ?? (await ensureAuthUserCredentialId(user.id));
      if (!credentialUserId) {
        return issueFallbackResetToken(user.id, now);
      }

      const resetToken = generateResetToken();
      const expiresAt = new Date(now.getTime() + PASSWORD_RESET_TOKEN_TTL_MS);
      await ctx.internalAdapter.createVerificationValue({
        expiresAt,
        identifier: `reset-password:${resetToken}`,
        value: String(credentialUserId),
      });

      return {
        expiresAt,
        ok: true,
        resetToken,
      };
    } catch {
      return issueFallbackResetToken(user.id, now);
    }
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
    clearFallbackResetTokensForUser(user.id);
    await deletePersistedResetTokensForUser(user.id);
    await updateAuthUserPassword({
      passwordHash: await hashCredentialPassword(temporaryPassword),
      passwordSalt: null,
      userId: user.id,
    });
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
    clearExpiredResetTokens(now);

    try {
      const auth = await getBetterAuth();
      const ctx = await auth.$context;
      const verification = await ctx.internalAdapter.findVerificationValue(
        `reset-password:${parsedInput.token}`,
      );

      if (!verification || verification.expiresAt < now) {
        return {
          ok: false,
        };
      }

      const credentialUserId = Number.parseInt(verification.value, 10);
      if (!Number.isInteger(credentialUserId) || credentialUserId <= 0) {
        return {
          ok: false,
        };
      }

      const user = await findAuthUserByCredentialId(credentialUserId);
      if (!user) {
        return {
          ok: false,
        };
      }

      await auth.api.resetPassword({
        body: {
          newPassword: parsedInput.newPassword,
          token: parsedInput.token,
        },
      });
      await deleteAllSessionsByUserId(user.id);

      return {
        ok: true,
        user: summarizeUser(user),
      };
    } catch {
      const fallbackReset = getGlobalState().resetTokensByToken.get(parsedInput.token);
      if (!fallbackReset || fallbackReset.expiresAt < now) {
        return {
          ok: false,
        };
      }

      await updateAuthUserPassword({
        passwordHash: await hashCredentialPassword(parsedInput.newPassword),
        passwordSalt: null,
        userId: fallbackReset.tokenUserId,
      });
      getGlobalState().resetTokensByToken.delete(parsedInput.token);
      await deleteAllSessionsByUserId(fallbackReset.tokenUserId);

      const user = await findAppUserById(fallbackReset.tokenUserId);
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

  try {
    const authSession = await readBetterAuthSessionFromCookie(token);
    if (!authSession) {
      await deleteSessionByToken(token);
      return {
        clearCookie: true,
        projection: buildAnonymousAppSession(),
        sessionRecord: null,
        token,
        user: null,
      };
    }

    const user = await findAppUserById(authSession.actorUserId);
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

    const sessionRecord = await upsertSessionMetadata({
      expiresAt: authSession.session.expiresAt,
      token,
      userId: user.id,
    });

    return {
      clearCookie: false,
      projection: buildAuthenticatedAppSession(user),
      sessionRecord,
      token,
      user,
    };
  } catch {
    return readFallbackCurrentSession(token);
  }
}

export async function issueAppSession(
  userId: number,
  input: Omit<CreateRuntimeSessionInput, "userId"> = {},
): Promise<IssuedAppSession> {
  const user = await findAppUserById(userId);

  try {
    const betterAuthSession = await createBetterAuthSessionForActor(userId, {
      dontRememberMe: false,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });
    const sessionRecord = await upsertSessionMetadata({
      expiresAt: betterAuthSession.expiresAt,
      token: betterAuthSession.cookieValue,
      userId,
    });

    return {
      projection: user ? buildAuthenticatedAppSession(user) : buildAnonymousAppSession(),
      session: {
        csrfToken: sessionRecord.csrfToken,
        expiresAt: sessionRecord.expiresAt,
        token: betterAuthSession.cookieValue,
        userId,
      },
    };
  } catch {
    const session = await createSession({
      ...input,
      userId,
    });

    return {
      projection: user ? buildAuthenticatedAppSession(user) : buildAnonymousAppSession(),
      session,
    };
  }
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
    resetTokensByToken: new Map(),
  };
  resetBetterAuthStateForTests();
}
