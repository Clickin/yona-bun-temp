import {
  deleteAllSessionsByUserId,
  generateResetToken,
  hashPassword,
  hashToken,
  verifyPassword,
  verifyToken,
} from "@yona/auth";
import type { AuthErrorCode, PasswordResetRequest, SessionProjection } from "@yona/contracts";
import { passwordResetRequestSchema } from "@yona/contracts";
import { buildAnonymousSession, resolvePasswordSignIn } from "@yona/domain";

const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

interface AppUserRecord {
  emailAddress: string;
  id: number;
  isConfirmed: boolean;
  isSiteAdmin: boolean;
  loginId: string;
  name: string;
  passwordHash: string;
  passwordSalt: string;
  resetTokenExpiresAt: Date | null;
  resetTokenHash: string | null;
}

interface AppAuthState {
  nextUserId: number;
  usersByEmailAddress: Map<string, number>;
  usersById: Map<number, AppUserRecord>;
  usersByLoginId: Map<string, number>;
}

export interface AppUserSummary {
  emailAddress: string;
  id: number;
  isConfirmed: boolean;
  isSiteAdmin: boolean;
  loginId: string;
  name: string;
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
      user: AppUserSummary;
    };

export type CreateAppUserResult =
  | {
      code: "auth.login-id-conflict";
      ok: false;
    }
  | {
      ok: true;
      user: AppUserSummary;
    };

export interface CreateAppUserInput {
  emailAddress: string;
  isConfirmed?: boolean;
  isSiteAdmin?: boolean;
  loginId: string;
  name: string;
  password: string;
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
      usersByEmailAddress: new Map(),
      usersById: new Map(),
      usersByLoginId: new Map(),
    };
  }

  return globalObject.__YONA_APP_AUTH_STATE__;
}

function summarizeUser(user: AppUserRecord): AppUserSummary {
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

async function persistUser(state: AppAuthState, input: CreateAppUserInput): Promise<AppUserRecord> {
  const passwordSalt = generateResetToken();
  const passwordHash = await hashPassword(input.password, passwordSalt);
  const user: AppUserRecord = {
    emailAddress: normalizeIdentifier(input.emailAddress),
    id: state.nextUserId,
    isConfirmed: input.isConfirmed ?? true,
    isSiteAdmin: input.isSiteAdmin ?? false,
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

export async function createAppUser(input: CreateAppUserInput): Promise<CreateAppUserResult> {
  const state = getGlobalState();
  const loginId = normalizeIdentifier(input.loginId);
  const emailAddress = normalizeIdentifier(input.emailAddress);

  if (state.usersByLoginId.has(loginId) || state.usersByEmailAddress.has(emailAddress)) {
    return {
      code: "auth.login-id-conflict",
      ok: false,
    };
  }

  const user = await persistUser(state, {
    ...input,
    emailAddress,
    loginId,
  });

  return {
    ok: true,
    user: summarizeUser(user),
  };
}

export async function authenticatePasswordSignIn(
  identifier: string,
  password: string,
): Promise<PasswordSignInResult> {
  const user = findUserByIdentifier(identifier);
  const passwordMatches =
    user === null ? false : await verifyPassword(password, user.passwordHash, user.passwordSalt);

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

export async function findAppUserById(userId: number): Promise<AppUserSummary | null> {
  const user = getGlobalState().usersById.get(userId);
  return user ? summarizeUser(user) : null;
}

export async function issuePasswordResetToken(
  request: PasswordResetRequest,
): Promise<{ ok: true; resetToken: string | null }> {
  const parsedRequest = passwordResetRequestSchema.parse(request);
  const user = findUserByIdentifier(parsedRequest.loginId);

  if (!user || user.emailAddress !== normalizeIdentifier(parsedRequest.emailAddress)) {
    return {
      ok: true,
      resetToken: null,
    };
  }

  const resetToken = generateResetToken();
  user.resetTokenHash = await hashToken(resetToken);
  user.resetTokenExpiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);

  return {
    ok: true,
    resetToken,
  };
}

export async function resetPasswordWithToken(input: {
  newPassword: string;
  token: string;
}): Promise<{ ok: false } | { ok: true; user: AppUserSummary }> {
  for (const user of getGlobalState().usersById.values()) {
    if (!user.resetTokenHash || !user.resetTokenExpiresAt) {
      continue;
    }

    if (user.resetTokenExpiresAt.getTime() < Date.now()) {
      user.resetTokenHash = null;
      user.resetTokenExpiresAt = null;
      continue;
    }

    const tokenMatches = await verifyToken(input.token, user.resetTokenHash);
    if (!tokenMatches) {
      continue;
    }

    const passwordSalt = generateResetToken();
    user.passwordSalt = passwordSalt;
    user.passwordHash = await hashPassword(input.newPassword, passwordSalt);
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
}

export function resetAuthStateForTests(): void {
  const globalObject = globalThis as typeof globalThis & {
    __YONA_APP_AUTH_STATE__?: AppAuthState;
  };

  globalObject.__YONA_APP_AUTH_STATE__ = {
    nextUserId: 1,
    usersByEmailAddress: new Map(),
    usersById: new Map(),
    usersByLoginId: new Map(),
  };
}
