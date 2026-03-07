import * as arctic from "arctic";
import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import type { RequestEvent } from "@sveltejs/kit";
import { linkedAccount, n4user, userCredential } from "@drizzle/schema";
import { getDb } from "@yona/db";
import { appendAuthAuditLog } from "$lib/server/auth/audit";
import {
  getAnonymousCsrfCookieName,
  readRequestCsrfToken,
  validateCsrfToken,
} from "$lib/server/auth/csrf";
import {
  EmailNotConfiguredError,
  EmailProviderNotImplementedError,
  resolveEmailProvider,
} from "$lib/server/email";
import { hashPassword, verifyPassword } from "$lib/server/auth/password";
import { allowAuthRequest } from "$lib/server/auth/rate-limit";
import {
  getClientIp,
  hasValidSameOrigin,
  readAuthPayload,
} from "$lib/server/auth/request-validation";
import {
  createSession,
  deleteAllSessionsByUserId,
  deleteSessionByToken,
  getSessionCookieName,
} from "$lib/server/auth/session";
import { deleteSessionCookie, setSessionCookie } from "$lib/server/auth/session-helper";
import { generateResetToken } from "$lib/server/auth/tokens";

type AuthAppEnv = {
  Bindings: {
    event: RequestEvent;
  };
};

const GENERIC_REGISTER_ERROR = "Unable to register with the provided credentials";
const GENERIC_LOGIN_ERROR = "Invalid email or password";
const OAUTH_COOKIE_MAX_AGE_SECONDS = 10 * 60;
const OAUTH_GITHUB_SCOPES = ["read:user", "user:email"];
const OAUTH_GOOGLE_SCOPES = ["openid", "email", "profile"];
const GITHUB_PROVIDER_KEY = "github";
const GOOGLE_PROVIDER_KEY = "google";
const RESET_PASSWORD_WINDOW_MS = 60 * 60 * 1000;
const RESET_PASSWORD_MAX_PER_WINDOW = 3;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

const resetPasswordBuckets = new Map<string, number>();

interface GitHubProfile {
  avatar_url?: string;
  id?: number;
  login?: string;
  name?: string;
}

interface GitHubEmail {
  email?: string;
  primary?: boolean;
  verified?: boolean;
}

interface GoogleUserInfo {
  email?: string;
  name?: string;
  picture?: string;
  sub?: string;
}

function isSecureCookie(): boolean {
  return process.env.NODE_ENV === "production";
}

function clearOauthCookies(event: RequestEvent): void {
  event.cookies.delete("yona_oauth_github_state", { path: "/" });
  event.cookies.delete("yona_oauth_github_verifier", { path: "/" });
}

function clearGoogleOauthCookies(event: RequestEvent): void {
  event.cookies.delete("yona_oauth_google_state", { path: "/" });
  event.cookies.delete("yona_oauth_google_verifier", { path: "/" });
}

function getWindowHour(now: Date): number {
  return Math.floor(now.getTime() / RESET_PASSWORD_WINDOW_MS);
}

function cleanupResetPasswordBuckets(currentWindowHour: number): void {
  if (resetPasswordBuckets.size <= 2_000) {
    return;
  }

  for (const key of resetPasswordBuckets.keys()) {
    const parts = key.split(":");
    const windowHour = Number.parseInt(parts[parts.length - 1] ?? "", 10);
    if (!Number.isFinite(windowHour) || windowHour < currentWindowHour - 1) {
      resetPasswordBuckets.delete(key);
    }
  }
}

function allowResetPasswordRequest(ip: string, now = new Date()): boolean {
  const currentWindowHour = getWindowHour(now);
  cleanupResetPasswordBuckets(currentWindowHour);

  const key = `${ip}:${currentWindowHour}`;
  const count = resetPasswordBuckets.get(key) ?? 0;
  if (count >= RESET_PASSWORD_MAX_PER_WINDOW) {
    return false;
  }

  resetPasswordBuckets.set(key, count + 1);
  return true;
}

function isValidPassword(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= MIN_PASSWORD_LENGTH &&
    value.length <= MAX_PASSWORD_LENGTH
  );
}

function isValidUserId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function parseAdminUserIds(raw: string | undefined): Set<number> {
  if (!raw) {
    return new Set();
  }

  const adminIds = raw
    .split(",")
    .map((entry) => Number.parseInt(entry.trim(), 10))
    .filter((value) => Number.isInteger(value) && value > 0);

  return new Set(adminIds);
}

function isSessionAdmin(userId: number): boolean {
  const adminUserIds = parseAdminUserIds(process.env.YONA_ADMIN_USER_IDS);
  return adminUserIds.has(userId);
}

function getAccessToken(tokens: unknown): string | null {
  if (typeof tokens !== "object" || tokens === null) {
    return null;
  }

  const accessor = (tokens as { accessToken?: () => string }).accessToken;
  if (typeof accessor === "function") {
    const token = accessor();
    return typeof token === "string" && token.length > 0 ? token : null;
  }

  const rawToken = (tokens as { accessToken?: unknown }).accessToken;
  if (typeof rawToken === "string" && rawToken.length > 0) {
    return rawToken;
  }

  return null;
}

async function fetchGitHubUser(
  accessToken: string,
): Promise<{ email: string; profile: GitHubProfile } | null> {
  const profileResponse = await fetch("https://api.github.com/user", {
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: "application/vnd.github+json",
    },
  });

  if (!profileResponse.ok) {
    return null;
  }

  const profile = (await profileResponse.json()) as GitHubProfile;
  const emailsResponse = await fetch("https://api.github.com/user/emails", {
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: "application/vnd.github+json",
    },
  });

  if (!emailsResponse.ok) {
    return null;
  }

  const emails = (await emailsResponse.json()) as GitHubEmail[];
  const selectedEmail =
    emails.find((entry) => entry.primary === true && entry.verified === true)?.email ??
    emails.find((entry) => entry.verified === true)?.email ??
    emails[0]?.email;

  if (!selectedEmail) {
    return null;
  }

  return {
    email: selectedEmail,
    profile,
  };
}

async function fetchGoogleUser(
  accessToken: string,
): Promise<{ email: string; profile: GoogleUserInfo } | null> {
  // OIDC userinfo endpoint for Google identity profile fields.
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  const profile = (await response.json()) as GoogleUserInfo;
  if (!profile.email) {
    return null;
  }

  return {
    email: profile.email,
    profile,
  };
}

async function findOrCreateCredential(
  userId: number,
  email: string,
  name: string,
): Promise<number> {
  const db = getDb();
  const [existingCredential] = await db
    .select({ id: userCredential.id })
    .from(userCredential)
    .where(eq(userCredential.userId, userId))
    .limit(1);

  if (existingCredential) {
    return existingCredential.id;
  }

  await db.insert(userCredential).values({
    active: true,
    email,
    emailValidated: true,
    loginId: email,
    name,
    userId,
  });

  const [createdCredential] = await db
    .select({ id: userCredential.id })
    .from(userCredential)
    .where(eq(userCredential.userId, userId))
    .limit(1);

  if (!createdCredential) {
    throw new Error("Failed to create user credential");
  }

  return createdCredential.id;
}

async function findOrCreateUser(email: string, displayName: string): Promise<number> {
  const db = getDb();
  const [existingUser] = await db
    .select({ id: n4user.id })
    .from(n4user)
    .where(eq(n4user.loginId, email))
    .limit(1);

  if (existingUser) {
    return existingUser.id;
  }

  await db.insert(n4user).values({
    createdDate: new Date(),
    email,
    isGuest: false,
    loginId: email,
    name: displayName,
  });

  const [createdUser] = await db
    .select({ id: n4user.id })
    .from(n4user)
    .where(eq(n4user.loginId, email))
    .limit(1);

  if (!createdUser) {
    throw new Error("Failed to create user");
  }

  return createdUser.id;
}

export const authApp = new Hono<AuthAppEnv>();

authApp.post("/api/auth/register", async (c) => {
  const event = c.env.event;
  const ipAddress = getClientIp(event.request, event.getClientAddress());
  const userAgent = event.request.headers.get("user-agent") ?? "unknown";
  const requestCsrfToken = readRequestCsrfToken(event.request);
  const anonymousCsrfToken = event.cookies.get(getAnonymousCsrfCookieName());

  if (
    anonymousCsrfToken &&
    !validateCsrfToken(requestCsrfToken, { csrfToken: anonymousCsrfToken })
  ) {
    await appendAuthAuditLog({ action: "register", outcome: "denied", ip: ipAddress, userAgent });
    return c.json({ error: "Forbidden" }, 403);
  }

  if (!hasValidSameOrigin(event.request)) {
    await appendAuthAuditLog({ action: "register", outcome: "denied", ip: ipAddress, userAgent });
    return c.json({ error: "Forbidden" }, 403);
  }

  if (!allowAuthRequest({ route: "register", ip: ipAddress })) {
    await appendAuthAuditLog({ action: "register", outcome: "denied", ip: ipAddress, userAgent });
    return c.json({ error: "Too many requests" }, 429);
  }

  const { payload, error } = await readAuthPayload(event.request);
  if (!payload) {
    await appendAuthAuditLog({
      action: "register",
      outcome: "fail",
      ip: ipAddress,
      userAgent,
    });
    return c.json({ error: error ?? "Invalid request payload" }, 400);
  }

  const displayName = payload.name ?? payload.email.split("@")[0] ?? payload.email;

  try {
    const db = getDb();
    const [existingUser] = await db
      .select({ id: n4user.id })
      .from(n4user)
      .where(eq(n4user.loginId, payload.email))
      .limit(1);

    if (existingUser) {
      await appendAuthAuditLog({
        action: "register",
        outcome: "fail",
        ip: ipAddress,
        userAgent,
        targetEmail: payload.email,
      });
      return c.json({ error: GENERIC_REGISTER_ERROR }, 409);
    }

    const passwordSalt = generateResetToken();
    const passwordHash = await hashPassword(payload.password, passwordSalt);
    const createdDate = new Date();

    await db.insert(n4user).values({
      createdDate,
      email: payload.email,
      isGuest: false,
      loginId: payload.email,
      name: displayName,
      password: passwordHash,
      passwordSalt,
    });

    const [createdUser] = await db
      .select({
        email: n4user.email,
        id: n4user.id,
        loginId: n4user.loginId,
        name: n4user.name,
      })
      .from(n4user)
      .where(eq(n4user.loginId, payload.email))
      .limit(1);

    if (!createdUser) {
      throw new Error("Failed to load newly created user");
    }

    await db.insert(userCredential).values({
      active: true,
      email: payload.email,
      emailValidated: false,
      loginId: payload.email,
      name: displayName,
      userId: createdUser.id,
    });

    const session = await createSession({
      ipAddress,
      userAgent,
      userId: createdUser.id,
    });
    setSessionCookie(event, session.token);

    await appendAuthAuditLog({
      action: "register",
      outcome: "success",
      ip: ipAddress,
      userAgent,
      targetEmail: payload.email,
    });

    return c.json(
      {
        csrfToken: session.csrfToken,
        session: {
          expiresAt: session.expiresAt.toISOString(),
          userId: session.userId,
        },
        user: createdUser,
      },
      201,
    );
  } catch (routeError) {
    const isDuplicate =
      routeError instanceof Error && /duplicate|unique|uq_/i.test(routeError.message);

    await appendAuthAuditLog({
      action: "register",
      outcome: "fail",
      ip: ipAddress,
      userAgent,
      targetEmail: payload.email,
    });

    if (isDuplicate) {
      return c.json({ error: GENERIC_REGISTER_ERROR }, 409);
    }

    return c.json({ error: "Failed to register user" }, 500);
  }
});

authApp.post("/api/auth/login", async (c) => {
  const event = c.env.event;
  const ipAddress = getClientIp(event.request, event.getClientAddress());
  const userAgent = event.request.headers.get("user-agent") ?? "unknown";
  const requestCsrfToken = readRequestCsrfToken(event.request);
  const anonymousCsrfToken = event.cookies.get(getAnonymousCsrfCookieName());

  if (
    anonymousCsrfToken &&
    !validateCsrfToken(requestCsrfToken, { csrfToken: anonymousCsrfToken })
  ) {
    await appendAuthAuditLog({ action: "login", outcome: "denied", ip: ipAddress, userAgent });
    return c.json({ error: "Forbidden" }, 403);
  }

  if (!hasValidSameOrigin(event.request)) {
    await appendAuthAuditLog({ action: "login", outcome: "denied", ip: ipAddress, userAgent });
    return c.json({ error: "Forbidden" }, 403);
  }

  if (!allowAuthRequest({ route: "login", ip: ipAddress })) {
    await appendAuthAuditLog({ action: "login", outcome: "denied", ip: ipAddress, userAgent });
    return c.json({ error: "Too many requests" }, 429);
  }

  const { payload, error } = await readAuthPayload(event.request);
  if (!payload) {
    await appendAuthAuditLog({ action: "login", outcome: "fail", ip: ipAddress, userAgent });
    return c.json({ error: error ?? GENERIC_LOGIN_ERROR }, 400);
  }

  try {
    const [foundUser] = await getDb()
      .select({
        email: n4user.email,
        id: n4user.id,
        loginId: n4user.loginId,
        name: n4user.name,
        password: n4user.password,
        passwordSalt: n4user.passwordSalt,
      })
      .from(n4user)
      .where(eq(n4user.loginId, payload.email))
      .limit(1);

    if (!foundUser || !foundUser.password || !foundUser.passwordSalt) {
      await appendAuthAuditLog({
        action: "login",
        outcome: "fail",
        ip: ipAddress,
        userAgent,
        targetEmail: payload.email,
      });
      return c.json({ error: GENERIC_LOGIN_ERROR }, 401);
    }

    const passwordMatches = await verifyPassword(
      payload.password,
      foundUser.password,
      foundUser.passwordSalt,
    );
    if (!passwordMatches) {
      await appendAuthAuditLog({
        action: "login",
        outcome: "fail",
        ip: ipAddress,
        userAgent,
        targetEmail: payload.email,
      });
      return c.json({ error: GENERIC_LOGIN_ERROR }, 401);
    }

    const session = await createSession({
      ipAddress,
      userAgent,
      userId: foundUser.id,
    });
    setSessionCookie(event, session.token);

    await appendAuthAuditLog({
      action: "login",
      outcome: "success",
      ip: ipAddress,
      userAgent,
      targetEmail: payload.email,
    });

    return c.json({
      csrfToken: session.csrfToken,
      session: {
        expiresAt: session.expiresAt.toISOString(),
        userId: session.userId,
      },
      user: {
        email: foundUser.email,
        id: foundUser.id,
        loginId: foundUser.loginId,
        name: foundUser.name,
      },
    });
  } catch {
    await appendAuthAuditLog({
      action: "login",
      outcome: "fail",
      ip: ipAddress,
      userAgent,
      targetEmail: payload.email,
    });
    return c.json({ error: "Failed to login" }, 500);
  }
});

authApp.post("/api/auth/logout", async (c) => {
  const event = c.env.event;
  const ipAddress = getClientIp(event.request, event.getClientAddress());
  const userAgent = event.request.headers.get("user-agent") ?? "unknown";
  const token = event.cookies.get(getSessionCookieName());

  if (!token) {
    await appendAuthAuditLog({ action: "logout", outcome: "success", ip: ipAddress, userAgent });
    return c.json({ ok: true });
  }

  try {
    await deleteSessionByToken(token);
    deleteSessionCookie(event);
    await appendAuthAuditLog({ action: "logout", outcome: "success", ip: ipAddress, userAgent });
    return c.json({ ok: true });
  } catch {
    await appendAuthAuditLog({ action: "logout", outcome: "fail", ip: ipAddress, userAgent });
    return c.json({ error: "Failed to logout" }, 500);
  }
});

authApp.get("/api/auth/session", async (c) => {
  const event = c.env.event;
  if (!event.locals.session) {
    return c.json({ session: null });
  }

  const [user] = await getDb()
    .select({
      email: n4user.email,
      id: n4user.id,
      loginId: n4user.loginId,
      name: n4user.name,
    })
    .from(n4user)
    .where(eq(n4user.id, event.locals.session.userId))
    .limit(1);

  if (!user) {
    return c.json({ session: null });
  }

  return c.json({
    session: {
      csrfToken: event.locals.session.csrfToken,
      expiresAt: event.locals.session.expiresAt.toISOString(),
      userId: event.locals.session.userId,
    },
    user,
  });
});

authApp.post("/api/auth/reset-password", async (c) => {
  const event = c.env.event;
  const ipAddress = getClientIp(event.request, event.getClientAddress());
  const userAgent = event.request.headers.get("user-agent") ?? "unknown";
  const session = event.locals.session;
  const requestCsrfToken = readRequestCsrfToken(event.request);

  if (!session) {
    await appendAuthAuditLog({
      action: "reset-password",
      outcome: "denied",
      ip: ipAddress,
      userAgent,
    });
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!validateCsrfToken(requestCsrfToken, session)) {
    await appendAuthAuditLog({
      action: "reset-password",
      outcome: "denied",
      ip: ipAddress,
      userAgent,
    });
    return c.json({ error: "Forbidden" }, 403);
  }

  if (!isSessionAdmin(session.userId)) {
    await appendAuthAuditLog({
      action: "reset-password",
      outcome: "denied",
      ip: ipAddress,
      userAgent,
    });
    return c.json({ error: "Forbidden" }, 403);
  }

  if (!allowResetPasswordRequest(ipAddress)) {
    await appendAuthAuditLog({
      action: "reset-password",
      outcome: "denied",
      ip: ipAddress,
      userAgent,
    });
    return c.json({ error: "Too many requests" }, 429);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    await appendAuthAuditLog({
      action: "reset-password",
      outcome: "fail",
      ip: ipAddress,
      userAgent,
    });
    return c.json({ error: "Invalid request payload" }, 400);
  }

  const userId = (body as { userId?: unknown })?.userId;
  const newPassword = (body as { newPassword?: unknown })?.newPassword;
  if (!isValidUserId(userId) || !isValidPassword(newPassword)) {
    await appendAuthAuditLog({
      action: "reset-password",
      outcome: "fail",
      ip: ipAddress,
      userAgent,
    });
    return c.json({ error: "Invalid request payload" }, 400);
  }

  try {
    const db = getDb();
    const [targetUser] = await db
      .select({
        email: n4user.email,
        loginId: n4user.loginId,
      })
      .from(n4user)
      .where(eq(n4user.id, userId))
      .limit(1);

    const passwordSalt = generateResetToken();
    const passwordHash = await hashPassword(newPassword, passwordSalt);

    await db
      .update(n4user)
      .set({
        password: passwordHash,
        passwordSalt,
      })
      .where(eq(n4user.id, userId));

    await deleteAllSessionsByUserId(userId);

    const recipientEmail = targetUser?.email ?? targetUser?.loginId;
    if (recipientEmail) {
      const emailProvider = resolveEmailProvider();
      await emailProvider.sendResetPasswordNotification({
        expiresAt: new Date(Date.now() + RESET_PASSWORD_WINDOW_MS),
        resetLink: new URL("/login", event.request.url).toString(),
        to: recipientEmail,
      });
    }

    await appendAuthAuditLog({
      action: "reset-password",
      outcome: "success",
      ip: ipAddress,
      targetUserId: userId,
      userAgent,
    });

    return c.json({ ok: true });
  } catch (routeError) {
    if (
      routeError instanceof EmailNotConfiguredError ||
      routeError instanceof EmailProviderNotImplementedError
    ) {
      await appendAuthAuditLog({
        action: "reset-password",
        outcome: "fail",
        ip: ipAddress,
        targetUserId: userId,
        userAgent,
      });
      return c.json({ error: "Email provider is not configured" }, 503);
    }

    await appendAuthAuditLog({
      action: "reset-password",
      outcome: "fail",
      ip: ipAddress,
      targetUserId: userId,
      userAgent,
    });
    return c.json({ error: "Failed to reset password" }, 500);
  }
});

authApp.get("/api/auth/github", async (c) => {
  const event = c.env.event;
  const { github } = await import("$lib/server/auth/oauth-providers");
  const state = arctic.generateState();
  const codeVerifier = arctic.generateCodeVerifier();
  const authorizationUrl = (
    github.createAuthorizationURL as unknown as (
      state: string,
      codeVerifier: string,
      scopes: string[],
    ) => URL
  )(state, codeVerifier, OAUTH_GITHUB_SCOPES);

  event.cookies.set("yona_oauth_github_state", state, {
    httpOnly: true,
    maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: isSecureCookie(),
  });

  event.cookies.set("yona_oauth_github_verifier", codeVerifier, {
    httpOnly: true,
    maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: isSecureCookie(),
  });

  return new Response(null, {
    headers: {
      location: authorizationUrl.toString(),
    },
    status: 302,
  });
});

authApp.get("/api/auth/callback/github", async (c) => {
  const event = c.env.event;
  const { github } = await import("$lib/server/auth/oauth-providers");
  const state = new URL(event.request.url).searchParams.get("state");
  const code = new URL(event.request.url).searchParams.get("code");
  const storedState = event.cookies.get("yona_oauth_github_state");
  const codeVerifier = event.cookies.get("yona_oauth_github_verifier");

  if (!state || !code || !storedState || !codeVerifier || state !== storedState) {
    clearOauthCookies(event);
    return c.json({ error: "Invalid OAuth callback" }, 400);
  }

  try {
    const tokens = await (
      github.validateAuthorizationCode as unknown as (
        authorizationCode: string,
        codeVerifier: string,
      ) => unknown
    )(code, codeVerifier);
    const accessToken = getAccessToken(tokens);

    if (!accessToken) {
      clearOauthCookies(event);
      return c.json({ error: "Failed to exchange OAuth code" }, 400);
    }

    const githubUser = await fetchGitHubUser(accessToken);
    if (!githubUser || !githubUser.profile.id) {
      clearOauthCookies(event);
      return c.json({ error: "Failed to load GitHub user" }, 400);
    }

    const providerUserId = String(githubUser.profile.id);
    const displayName = githubUser.profile.name ?? githubUser.profile.login ?? githubUser.email;
    const avatarUrl = githubUser.profile.avatar_url ?? null;

    const db = getDb();
    const [existingLinkedAccount] = await db
      .select({
        id: linkedAccount.id,
        userCredentialId: linkedAccount.userCredentialId,
      })
      .from(linkedAccount)
      .where(
        and(
          eq(linkedAccount.providerKey, GITHUB_PROVIDER_KEY),
          eq(linkedAccount.providerUserId, providerUserId),
        ),
      )
      .limit(1);

    let credentialId: number;

    if (existingLinkedAccount?.userCredentialId) {
      credentialId = existingLinkedAccount.userCredentialId;
      await db
        .update(linkedAccount)
        .set({ avatarUrl, providerDisplayName: displayName })
        .where(eq(linkedAccount.id, existingLinkedAccount.id));
    } else {
      const userId = await findOrCreateUser(githubUser.email, displayName);
      credentialId = await findOrCreateCredential(userId, githubUser.email, displayName);

      await db.insert(linkedAccount).values({
        avatarUrl,
        providerDisplayName: displayName,
        providerKey: GITHUB_PROVIDER_KEY,
        providerUserId,
        userCredentialId: credentialId,
      });
    }

    const [credential] = await db
      .select({ userId: userCredential.userId })
      .from(userCredential)
      .where(eq(userCredential.id, credentialId))
      .limit(1);

    if (!credential?.userId) {
      clearOauthCookies(event);
      return c.json({ error: "Failed to resolve account" }, 500);
    }

    const session = await createSession({
      ipAddress: event.getClientAddress(),
      userAgent: event.request.headers.get("user-agent") ?? "unknown",
      userId: credential.userId,
    });

    setSessionCookie(event, session.token);
    clearOauthCookies(event);

    return new Response(null, {
      headers: {
        location: "/",
      },
      status: 302,
    });
  } catch {
    clearOauthCookies(event);
    return c.json({ error: "Failed to authenticate with GitHub" }, 500);
  }
});

authApp.get("/api/auth/google", async (c) => {
  const event = c.env.event;
  const { google } = await import("$lib/server/auth/oauth-providers");
  const state = arctic.generateState();
  const codeVerifier = arctic.generateCodeVerifier();
  const authorizationUrl = (
    google.createAuthorizationURL as unknown as (
      state: string,
      codeVerifier: string,
      scopes: string[],
    ) => URL
  )(state, codeVerifier, OAUTH_GOOGLE_SCOPES);

  event.cookies.set("yona_oauth_google_state", state, {
    httpOnly: true,
    maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: isSecureCookie(),
  });

  event.cookies.set("yona_oauth_google_verifier", codeVerifier, {
    httpOnly: true,
    maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: isSecureCookie(),
  });

  return new Response(null, {
    headers: {
      location: authorizationUrl.toString(),
    },
    status: 302,
  });
});

authApp.get("/api/auth/callback/google", async (c) => {
  const event = c.env.event;
  const { google } = await import("$lib/server/auth/oauth-providers");
  const state = new URL(event.request.url).searchParams.get("state");
  const code = new URL(event.request.url).searchParams.get("code");
  const storedState = event.cookies.get("yona_oauth_google_state");
  const codeVerifier = event.cookies.get("yona_oauth_google_verifier");

  if (!state || !code || !storedState || !codeVerifier || state !== storedState) {
    clearGoogleOauthCookies(event);
    return c.json({ error: "Invalid OAuth callback" }, 400);
  }

  try {
    const tokens = await (
      google.validateAuthorizationCode as unknown as (
        authorizationCode: string,
        codeVerifier: string,
      ) => unknown
    )(code, codeVerifier);
    const accessToken = getAccessToken(tokens);

    if (!accessToken) {
      clearGoogleOauthCookies(event);
      return c.json({ error: "Failed to exchange OAuth code" }, 400);
    }

    const googleUser = await fetchGoogleUser(accessToken);
    if (!googleUser || !googleUser.profile.sub) {
      clearGoogleOauthCookies(event);
      return c.json({ error: "Failed to load Google user" }, 400);
    }

    const providerUserId = googleUser.profile.sub;
    const displayName = googleUser.profile.name ?? googleUser.email;
    const avatarUrl = googleUser.profile.picture ?? null;

    const db = getDb();
    const [existingLinkedAccount] = await db
      .select({
        id: linkedAccount.id,
        userCredentialId: linkedAccount.userCredentialId,
      })
      .from(linkedAccount)
      .where(
        and(
          eq(linkedAccount.providerKey, GOOGLE_PROVIDER_KEY),
          eq(linkedAccount.providerUserId, providerUserId),
        ),
      )
      .limit(1);

    let credentialId: number;

    if (existingLinkedAccount?.userCredentialId) {
      credentialId = existingLinkedAccount.userCredentialId;
      await db
        .update(linkedAccount)
        .set({ avatarUrl, providerDisplayName: displayName })
        .where(eq(linkedAccount.id, existingLinkedAccount.id));
    } else {
      const userId = await findOrCreateUser(googleUser.email, displayName);
      credentialId = await findOrCreateCredential(userId, googleUser.email, displayName);

      await db.insert(linkedAccount).values({
        avatarUrl,
        providerDisplayName: displayName,
        providerKey: GOOGLE_PROVIDER_KEY,
        providerUserId,
        userCredentialId: credentialId,
      });
    }

    const [credential] = await db
      .select({ userId: userCredential.userId })
      .from(userCredential)
      .where(eq(userCredential.id, credentialId))
      .limit(1);

    if (!credential?.userId) {
      clearGoogleOauthCookies(event);
      return c.json({ error: "Failed to resolve account" }, 500);
    }

    const session = await createSession({
      ipAddress: event.getClientAddress(),
      userAgent: event.request.headers.get("user-agent") ?? "unknown",
      userId: credential.userId,
    });

    setSessionCookie(event, session.token);
    clearGoogleOauthCookies(event);

    return new Response(null, {
      headers: {
        location: "/",
      },
      status: 302,
    });
  } catch {
    clearGoogleOauthCookies(event);
    return c.json({ error: "Failed to authenticate with Google" }, 500);
  }
});
