import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { makeSignature } from "better-auth/crypto";
import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { username } from "better-auth/plugins/username";
import { eq } from "drizzle-orm";
import { getSessionCookieMaxAge, getSessionCookieName, getSessionCookieOptions } from "./session";
import { hashCredentialPassword, verifyCredentialPassword } from "./password";

const DEFAULT_PUBLIC_ORIGIN = "http://localhost:3001";

interface SecondaryStorageRecord {
  expiresAt: number | null;
  value: string;
}

interface BetterAuthResolvedSession {
  actorUserId: number;
  session: {
    expiresAt: Date;
    token: string;
  };
  user: Record<string, unknown>;
}

class InMemoryBetterAuthSecondaryStorage {
  private readonly entries = new Map<string, SecondaryStorageRecord>();

  public async get(key: string): Promise<null | string> {
    this.cleanupExpired();
    const record = this.entries.get(key);
    if (!record) {
      return null;
    }

    return record.value;
  }

  public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiresAt =
      ttlSeconds === undefined ? null : Date.now() + Math.max(0, ttlSeconds) * 1_000;
    this.entries.set(key, {
      expiresAt,
      value,
    });
  }

  public async delete(key: string): Promise<void> {
    this.entries.delete(key);
  }

  public reset(): void {
    this.entries.clear();
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, record] of this.entries.entries()) {
      if (record.expiresAt !== null && record.expiresAt <= now) {
        this.entries.delete(key);
      }
    }
  }
}

const secondaryStorage = new InMemoryBetterAuthSecondaryStorage();

function readEnv(name: string): string | undefined {
  const processEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env;

  if (processEnv && Object.prototype.hasOwnProperty.call(processEnv, name)) {
    return processEnv[name];
  }

  return undefined;
}

function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeNullableText(value: null | string | undefined): null | string {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.toUpperCase() === "NULL") {
    return null;
  }

  return trimmed;
}

function normalizeNumericId(value: unknown): null | number {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}

function buildBaseUrl(): string {
  const configured = readEnv("YONA_PUBLIC_ORIGIN")?.trim();
  if (configured) {
    return configured;
  }

  return DEFAULT_PUBLIC_ORIGIN;
}

function readBetterAuthSecret(): string {
  const configured = readEnv("BETTER_AUTH_SECRET")?.trim();
  if (configured) {
    return configured;
  }

  throw new Error("BETTER_AUTH_SECRET is required to initialize Better Auth.");
}

function buildSocialProviders(): Record<string, { clientId: string; clientSecret: string }> {
  const providers: Record<string, { clientId: string; clientSecret: string }> = {};
  const githubClientId = readEnv("GITHUB_CLIENT_ID")?.trim();
  const githubClientSecret = readEnv("GITHUB_CLIENT_SECRET")?.trim();
  const googleClientId = readEnv("GOOGLE_CLIENT_ID")?.trim();
  const googleClientSecret = readEnv("GOOGLE_CLIENT_SECRET")?.trim();
  const isProduction = readEnv("NODE_ENV") === "production";

  if (githubClientId && githubClientSecret) {
    providers.github = {
      clientId: githubClientId,
      clientSecret: githubClientSecret,
    };
  } else if (!isProduction) {
    providers.github = {
      clientId: "dev-github-client-id",
      clientSecret: "dev-github-client-secret",
    };
  }

  if (googleClientId && googleClientSecret) {
    providers.google = {
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    };
  } else if (!isProduction) {
    providers.google = {
      clientId: "dev-google-client-id",
      clientSecret: "dev-google-client-secret",
    };
  }

  return providers;
}

function deriveLoginCandidate(email: string): string {
  const localPart = email.split("@")[0] ?? "user";
  const normalized = normalizeIdentifier(localPart).replace(/[^a-z0-9_]+/g, "_");
  const collapsed = normalized.replace(/^_+|_+$/g, "");
  return collapsed.length >= 3 ? collapsed : `user_${collapsed || "account"}`;
}

async function reserveUniqueLoginId(
  preferredLoginId: string,
  findAuthUserByIdentifier: (identifier: string) => Promise<unknown>,
): Promise<string> {
  const normalizedBase = normalizeIdentifier(preferredLoginId).replace(/[^a-z0-9_]+/g, "_");
  const base = normalizedBase.length >= 3 ? normalizedBase : `user_${normalizedBase || "account"}`;

  let candidate = base;
  for (let suffix = 1; suffix < 10_000; suffix += 1) {
    const existing = await findAuthUserByIdentifier(candidate);
    if (!existing) {
      return candidate;
    }

    candidate = `${base}_${suffix}`;
  }

  throw new Error(`Failed to reserve a unique login id for "${preferredLoginId}".`);
}

async function loadDbModule() {
  return import("@yona/db");
}

let cachedAuthPromise: Promise<any> | undefined;

async function createBetterAuthInstance() {
  const { getDb, getDbSchema } = await loadDbModule();
  const db = getDb();
  const schema = getDbSchema(db) as Record<string, unknown>;
  const sessionCookieOptions = getSessionCookieOptions();

  return betterAuth({
    account: {
      accountLinking: {
        allowDifferentEmails: false,
        enabled: true,
        trustedProviders: ["google", "github", "email-password"],
      },
      fields: {
        accessToken: "accessToken",
        accessTokenExpiresAt: "accessTokenExpiresAt",
        accountId: "providerUserId",
        idToken: "idToken",
        password: "password",
        providerId: "providerKey",
        refreshToken: "refreshToken",
        refreshTokenExpiresAt: "refreshTokenExpiresAt",
        scope: "scope",
        updatedAt: "updatedAt",
        userId: "userCredentialId",
      },
      modelName: "linkedAccount",
    },
    advanced: {
      cookies: {
        session_token: {
          name: getSessionCookieName(),
        },
      },
      defaultCookieAttributes: {
        httpOnly: true,
        maxAge: getSessionCookieMaxAge(),
        path: "/",
        sameSite: "lax",
        secure: sessionCookieOptions.secure,
      },
      useSecureCookies: false,
    },
    basePath: "/api/auth",
    baseURL: buildBaseUrl(),
    database: drizzleAdapter(db as never, {
      provider: db.dbType === "postgres" ? "pg" : db.dbType === "mysql" ? "mysql" : "sqlite",
      schema,
    }),
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const dbModule = await loadDbModule();
            const runtimeDb = dbModule.getDb();
            const runtimeSchema = dbModule.getDbSchema(runtimeDb);
            const requestedUsername = normalizeNullableText(
              (user as { username?: string }).username,
            );
            const displayName =
              normalizeNullableText((user as { displayUsername?: string }).displayUsername) ??
              normalizeNullableText(user.name) ??
              requestedUsername ??
              deriveLoginCandidate(user.email);
            const existingByEmail = await dbModule.findAuthUserByIdentifier(user.email);
            if (
              existingByEmail &&
              typeof existingByEmail === "object" &&
              existingByEmail !== null
            ) {
              const existingLoginId =
                normalizeNullableText((existingByEmail as { loginId?: string }).loginId) ??
                requestedUsername ??
                deriveLoginCandidate(user.email);
              return {
                data: {
                  ...user,
                  active: true,
                  displayUsername: displayName,
                  emailVerified: true,
                  name: displayName,
                  username: existingLoginId,
                  userId: (existingByEmail as { id: number }).id,
                },
              };
            }

            const loginId = await reserveUniqueLoginId(
              requestedUsername ?? deriveLoginCandidate(user.email),
              dbModule.findAuthUserByIdentifier,
            );
            const now = new Date();

            await (runtimeDb as any).insert(runtimeSchema.n4user).values({
              createdDate: now,
              email: normalizeIdentifier(user.email),
              isGuest: false,
              loginId,
              name: displayName,
              password: null,
              passwordSalt: null,
              token: null,
            });

            const [actorRow] = await (runtimeDb as any)
              .select({
                id: runtimeSchema.n4user.id,
              })
              .from(runtimeSchema.n4user)
              .where(eq(runtimeSchema.n4user.loginId, loginId))
              .limit(1);

            if (!actorRow) {
              throw new Error("Failed to create n4user bridge for Better Auth.");
            }

            return {
              data: {
                ...user,
                active: true,
                displayUsername: displayName,
                emailVerified: true,
                name: displayName,
                username: loginId,
                userId: actorRow.id,
              },
            };
          },
        },
        update: {
          after: async (user) => {
            const actorUserId = normalizeNumericId((user as { userId?: unknown }).userId);
            if (!actorUserId) {
              return;
            }

            const dbModule = await loadDbModule();
            const runtimeDb = dbModule.getDb();
            const runtimeSchema = dbModule.getDbSchema(runtimeDb);
            const nextLoginId = normalizeNullableText((user as { username?: string }).username);
            const nextDisplayName =
              normalizeNullableText((user as { displayUsername?: string }).displayUsername) ??
              normalizeNullableText(user.name);

            await (runtimeDb as any)
              .update(runtimeSchema.n4user)
              .set({
                email: normalizeIdentifier(user.email),
                loginId: nextLoginId ?? undefined,
                name: nextDisplayName ?? undefined,
              })
              .where(eq(runtimeSchema.n4user.id, actorUserId));
          },
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      password: {
        hash: hashCredentialPassword,
        verify: async ({ hash, password }) => verifyCredentialPassword(password, hash),
      },
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ token, user }) => {
        const { buildPasswordResetUrl, sendPasswordResetEmail } =
          await import("@yona/integrations");
        await sendPasswordResetEmail({
          expiresAt: new Date(Date.now() + 60 * 60 * 1_000),
          loginId:
            normalizeNullableText((user as { username?: string }).username) ??
            deriveLoginCandidate(user.email),
          resetUrl: buildPasswordResetUrl(token),
          to: user.email,
        });
      },
    },
    plugins: [
      username({
        schema: {
          user: {
            fields: {
              displayUsername: "name",
              username: "loginId",
            },
          },
        },
      }),
      tanstackStartCookies(),
    ],
    rateLimit: {
      enabled: false,
    },
    secondaryStorage,
    secret: readBetterAuthSecret(),
    session: {
      cookieCache: {
        enabled: false,
      },
      expiresIn: getSessionCookieMaxAge(),
    },
    socialProviders: buildSocialProviders(),
    user: {
      additionalFields: {
        active: {
          defaultValue: true,
          input: false,
          required: false,
          returned: false,
          type: "boolean",
        },
        userId: {
          input: false,
          required: false,
          returned: true,
          type: "number",
        },
      },
      fields: {
        createdAt: "createdAt",
        emailVerified: "emailValidated",
        image: "image",
        updatedAt: "updatedAt",
      },
      modelName: "userCredential",
    },
    verification: {
      modelName: "verification",
      storeInDatabase: true,
    },
  });
}

export async function getBetterAuth() {
  if (!cachedAuthPromise) {
    cachedAuthPromise = createBetterAuthInstance();
  }

  return cachedAuthPromise;
}

function buildCookieHeader(cookieValue: string, cookieName: string): Headers {
  return new Headers({
    cookie: `${cookieName}=${cookieValue}`,
  });
}

function resolveCookieOptions(attributes: Record<string, unknown> | undefined): {
  httpOnly: true;
  maxAge: number;
  path: string;
  sameSite: "lax";
  secure: boolean;
} {
  return {
    httpOnly: true,
    maxAge: typeof attributes?.maxAge === "number" ? attributes.maxAge : getSessionCookieMaxAge(),
    path: typeof attributes?.path === "string" ? attributes.path : "/",
    sameSite: "lax",
    secure: Boolean(attributes?.secure),
  };
}

async function resolveCredentialUserId(actorUserId: number): Promise<number> {
  const { ensureAuthUserCredentialId } = await loadDbModule();
  const credentialUserId = await ensureAuthUserCredentialId(actorUserId);
  if (!credentialUserId) {
    throw new Error(`Auth credential bridge is missing for user ${actorUserId}.`);
  }

  return credentialUserId;
}

export async function getBetterAuthSessionCookieOptions() {
  const auth = await getBetterAuth();
  const ctx = await auth.$context;
  return resolveCookieOptions(ctx.authCookies.sessionToken.attributes);
}

export async function createBetterAuthSessionForActor(
  actorUserId: number,
  input: {
    dontRememberMe?: boolean;
    ipAddress?: string;
    userAgent?: string;
  } = {},
): Promise<{ cookieValue: string; expiresAt: Date }> {
  const auth = await getBetterAuth();
  const ctx = await auth.$context;
  const credentialUserId = await resolveCredentialUserId(actorUserId);
  const session = await ctx.internalAdapter.createSession(
    String(credentialUserId),
    input.dontRememberMe,
  );
  const signedCookie = `${session.token}.${await makeSignature(session.token, ctx.secret)}`;

  return {
    cookieValue: signedCookie,
    expiresAt: new Date(session.expiresAt),
  };
}

export async function readBetterAuthSessionFromCookie(
  cookieValue: string | undefined,
): Promise<BetterAuthResolvedSession | null> {
  if (!cookieValue) {
    return null;
  }

  const auth = await getBetterAuth();
  const sessionCookieName = getSessionCookieName();
  const result = await auth.api.getSession({
    headers: buildCookieHeader(cookieValue, sessionCookieName),
  });

  if (!result) {
    return null;
  }

  const actorUserId = normalizeNumericId((result.user as { userId?: unknown }).userId);
  if (!actorUserId) {
    return null;
  }

  return {
    actorUserId,
    session: {
      expiresAt: new Date(result.session.expiresAt),
      token: result.session.token,
    },
    user: result.user as Record<string, unknown>,
  };
}

export async function deleteBetterAuthSessionByCookieValue(
  cookieValue: string | undefined,
): Promise<void> {
  const authSession = await readBetterAuthSessionFromCookie(cookieValue);
  if (!authSession) {
    return;
  }

  const auth = await getBetterAuth();
  const ctx = await auth.$context;
  await ctx.internalAdapter.deleteSession(authSession.session.token);
}

export async function deleteBetterAuthSessionsByActorId(actorUserId: number): Promise<void> {
  const auth = await getBetterAuth();
  const ctx = await auth.$context;
  const credentialUserId = await resolveCredentialUserId(actorUserId);
  await ctx.internalAdapter.deleteSessions(String(credentialUserId));
}

export function resetBetterAuthStateForTests(): void {
  cachedAuthPromise = undefined;
  secondaryStorage.reset();
}
