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

interface AppUserRecord extends AuthUserSummary {
  passwordHash: string;
  passwordSalt: string;
  resetTokenExpiresAt: Date | null;
  resetTokenHash: string | null;
}

interface AppAuthState {
  nextUserId: number;
  pendingMutation: Promise<void>;
  usersByEmailAddress: Map<string, number>;
  usersById: Map<number, AppUserRecord>;
  usersByLoginId: Map<string, number>;
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
      nextUserId: 1,
      pendingMutation: Promise.resolve(),
      usersByEmailAddress: new Map(),
      usersById: new Map(),
      usersByLoginId: new Map(),
    };
  }

  return globalObject.__YONA_APP_AUTH_STATE__;
}

function summarizeUser(user: AppUserRecord): AuthUserSummary {
  return {
    emailAddress: user.emailAddress,
    id: user.id,
    isConfirmed: user.isConfirmed,
    isSiteAdmin: user.isSiteAdmin,
    loginId: user.loginId,
    name: user.name,
  };
}

function linkUser(state: AppAuthState, user: AppUserRecord): void {
  state.usersById.set(user.id, user);
  state.usersByLoginId.set(normalizeIdentifier(user.loginId), user.id);
  state.usersByEmailAddress.set(normalizeIdentifier(user.emailAddress), user.id);
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

async function persistUser(
  state: AppAuthState,
  input: RegisterWithPasswordInput,
): Promise<AppUserRecord> {
  const passwordSalt = generateResetToken();
  const passwordHash = await hashPassword(input.password, passwordSalt);
  const user: AppUserRecord = {
    emailAddress: normalizeIdentifier(input.emailAddress),
    id: state.nextUserId,
    isConfirmed: true,
    isSiteAdmin: false,
    loginId: normalizeIdentifier(input.loginId),
    name: input.name.trim(),
    passwordHash,
    passwordSalt,
    resetTokenExpiresAt: null,
    resetTokenHash: null,
  };

  state.nextUserId += 1;
  linkUser(state, user);

  return user;
}

function findUserByIdentifier(identifier: string): AppUserRecord | null {
  const state = getGlobalState();
  const normalizedIdentifier = normalizeIdentifier(identifier);
  const userId =
    state.usersByLoginId.get(normalizedIdentifier) ??
    state.usersByEmailAddress.get(normalizedIdentifier);

  if (!userId) {
    return null;
  }

  return state.usersById.get(userId) ?? null;
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

export async function createAppUser(input: CreateAppUserInput): Promise<CreateAppUserResult> {
  return withSerializedMutation(async () => {
    const parsedInput = registerWithPasswordInputSchema.parse(input);
    const state = getGlobalState();
    const loginId = normalizeIdentifier(parsedInput.loginId);
    const emailAddress = normalizeIdentifier(parsedInput.emailAddress);

    if (state.usersByLoginId.has(loginId) || state.usersByEmailAddress.has(emailAddress)) {
      return {
        code: "auth.login-id-conflict",
        ok: false,
      };
    }

    const user = await persistUser(state, {
      ...input,
      ...parsedInput,
      emailAddress,
      loginId,
    });

    return {
      ok: true,
      user: summarizeUser(user),
    };
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
  const user = findUserByIdentifier(parsedInput.identifier);
  const passwordMatches =
    user === null
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
  const user = getGlobalState().usersById.get(userId);
  return user ? summarizeUser(user) : null;
}

export async function issuePasswordResetToken(
  request: PasswordResetRequest,
  now = new Date(),
): Promise<IssuePasswordResetTokenResult> {
  return withSerializedMutation(async () => {
    const parsedRequest = passwordResetRequestSchema.parse(request);
    const user = findUserByIdentifier(parsedRequest.loginId);

    if (!user || user.emailAddress !== normalizeIdentifier(parsedRequest.emailAddress)) {
      return {
        expiresAt: null,
        ok: true,
        resetToken: null,
      };
    }

    const resetToken = generateResetToken();
    const expiresAt = new Date(now.getTime() + PASSWORD_RESET_TOKEN_TTL_MS);
    user.resetTokenHash = await hashToken(resetToken);
    user.resetTokenExpiresAt = expiresAt;

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
    const user = getGlobalState().usersById.get(input.userId);
    if (!user) {
      return {
        ok: false,
      };
    }

    const temporaryPassword = generateResetToken().slice(0, 16);
    const passwordSalt = generateResetToken();
    user.passwordSalt = passwordSalt;
    user.passwordHash = await hashPassword(temporaryPassword, passwordSalt);
    user.resetTokenHash = null;
    user.resetTokenExpiresAt = null;

    await deleteAllSessionsByUserId(user.id);

    return {
      ok: true,
      temporaryPassword,
      user: summarizeUser(user),
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

    for (const user of getGlobalState().usersById.values()) {
      if (!user.resetTokenHash || !user.resetTokenExpiresAt) {
        continue;
      }

      if (user.resetTokenExpiresAt.getTime() < now.getTime()) {
        user.resetTokenHash = null;
        user.resetTokenExpiresAt = null;
        continue;
      }

      const tokenMatches = await verifyToken(parsedInput.token, user.resetTokenHash);
      if (!tokenMatches) {
        continue;
      }

      const passwordSalt = generateResetToken();
      user.passwordSalt = passwordSalt;
      user.passwordHash = await hashPassword(parsedInput.newPassword, passwordSalt);
      user.resetTokenHash = null;
      user.resetTokenExpiresAt = null;

      await deleteAllSessionsByUserId(user.id);

      return {
        ok: true,
        user: summarizeUser(user),
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
    nextUserId: 1,
    pendingMutation: Promise.resolve(),
    usersByEmailAddress: new Map(),
    usersById: new Map(),
    usersByLoginId: new Map(),
  };
}
