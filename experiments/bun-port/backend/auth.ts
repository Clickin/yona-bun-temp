import { database, initializeDatabase } from "./database";
import { sql } from "@sqlbraid/sqlite";
import { verifyPassword } from "./password";

const SESSION_COOKIE = "bunPortSession";
const CSRF_COOKIE = "bunPortCsrf";
const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000;

interface AccountRow {
  id: string;
  home_project_id: string;
  account_state: "ACTIVE" | "LOCKED" | "DELETED";
  password_hash: string;
  password_salt: string | null;
}

interface SessionRow {
  user_id: string;
  home_project_id: string;
  account_state: "ACTIVE" | "LOCKED" | "DELETED";
  csrf_token: string;
  expires_at: number | bigint;
}

export interface SessionView {
  userId: string;
  projectId: string;
  csrfToken: string;
}

export class AuthError extends Error {
  constructor(
    readonly code: "LOGIN_REQUIRED" | "LOGIN_INVALID" | "USER_LOCKED" | "USER_DELETED",
    message: string,
  ) {
    super(message);
  }
}

export function cookieValue(request: Request, name: string): string | undefined {
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const equals = part.indexOf("=");
    if (equals < 0 || part.slice(0, equals).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(equals + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export async function signIn(
  loginId: string,
  password: string,
): Promise<{
  session: SessionView;
  sessionToken: string;
}> {
  await initializeDatabase();
  const identifier = loginId.trim().toLowerCase();
  if (identifier.length === 0 || password.length === 0) {
    throw new AuthError("LOGIN_REQUIRED", "Login ID or e-mail and password are required.");
  }

  const account = await database.maybeOne(sql.rows<AccountRow>`
    SELECT id, home_project_id, account_state, password_hash, password_salt
    FROM user_account
    WHERE lower(login_id) = ${identifier} OR lower(email) = ${identifier}
  `);
  if (!account) {
    const dummy = await database.maybeOne(sql.rows<{ password_hash: string }>`
      SELECT password_hash FROM user_account LIMIT 1
    `);
    if (dummy) await Bun.password.verify(password, dummy.password_hash);
    throw new AuthError("LOGIN_INVALID", "Your log in ID, E-mail or password is not valid.");
  }
  if (account.account_state === "DELETED") {
    throw new AuthError("USER_DELETED", "Deleted user account");
  }
  if (account.account_state === "LOCKED") {
    throw new AuthError("USER_LOCKED", "This user account is locked.");
  }

  const matched = await verifyPassword(password, account.password_hash, account.password_salt);
  if (!matched) {
    throw new AuthError("LOGIN_INVALID", "Your log in ID, E-mail or password is not valid.");
  }
  if (matched === "legacy-sha256") {
    const upgradedHash = await Bun.password.hash(password);
    await database.execute(sql.command`
      UPDATE user_account SET password_hash = ${upgradedHash}, password_salt = NULL
      WHERE id = ${account.id}
    `);
  }

  const sessionToken = crypto.randomUUID();
  const csrfToken = crypto.randomUUID();
  const expiresAt = Date.now() + SESSION_LIFETIME_MS;
  const tokenHash = new Bun.CryptoHasher("sha256").update(sessionToken).digest("hex");
  await database.execute(sql.command`
    INSERT INTO user_session (token_hash, user_id, csrf_token, expires_at)
    VALUES (${tokenHash}, ${account.id}, ${csrfToken}, ${expiresAt})
  `);
  return {
    session: { userId: account.id, projectId: account.home_project_id, csrfToken },
    sessionToken,
  };
}

export async function readSession(request: Request): Promise<SessionView | null> {
  await initializeDatabase();
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = new Bun.CryptoHasher("sha256").update(token).digest("hex");
  const session = await database.maybeOne(sql.rows<SessionRow>`
    SELECT s.user_id, s.csrf_token, s.expires_at, u.home_project_id, u.account_state
    FROM user_session s JOIN user_account u ON u.id = s.user_id
    WHERE s.token_hash = ${tokenHash}
  `);
  if (!session) return null;
  if (Number(session.expires_at) <= Date.now() || session.account_state !== "ACTIVE") {
    await database.execute(sql.command`DELETE FROM user_session WHERE token_hash = ${tokenHash}`);
    return null;
  }
  return {
    userId: session.user_id,
    projectId: session.home_project_id,
    csrfToken: session.csrf_token,
  };
}

export function isCsrfValid(request: Request, expected: string): boolean {
  return (
    request.headers.get("x-csrf-token") === expected &&
    cookieValue(request, CSRF_COOKIE) === expected
  );
}

export async function signOut(request: Request): Promise<void> {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return;
  const tokenHash = new Bun.CryptoHasher("sha256").update(token).digest("hex");
  await database.execute(sql.command`DELETE FROM user_session WHERE token_hash = ${tokenHash}`);
}

export function sessionCookies(
  request: Request,
  sessionToken: string,
  csrfToken: string,
): string[] {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return [
    `${SESSION_COOKIE}=${encodeURIComponent(sessionToken)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_LIFETIME_MS / 1000}${secure}`,
    `${CSRF_COOKIE}=${encodeURIComponent(csrfToken)}; Path=/; SameSite=Lax; Max-Age=${SESSION_LIFETIME_MS / 1000}${secure}`,
  ];
}

export function clearedSessionCookies(request: Request): string[] {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return [
    `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`,
    `${CSRF_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0${secure}`,
  ];
}
