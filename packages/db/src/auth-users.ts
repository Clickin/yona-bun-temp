import { eq, or } from "drizzle-orm";
import { getDb } from "./index";
import { getDbSchema } from "./runtime-schema";

export interface DbAuthUserRecord {
  apiToken: null | string;
  emailAddress: string;
  id: number;
  isConfirmed: boolean;
  isSiteAdmin: boolean;
  loginId: string;
  name: string;
  passwordHash: null | string;
  passwordSalt: null | string;
}

function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeNullableText(value: null | string): null | string {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.toUpperCase() === "NULL") {
    return null;
  }

  return trimmed;
}

function fallbackEmailAddress(loginId: string): string {
  const normalizedLoginId = normalizeIdentifier(loginId);
  if (normalizedLoginId.includes("@")) {
    return normalizedLoginId;
  }

  return `${normalizedLoginId}@users.noreply.yona.invalid`;
}

function mapDbAuthUser(row: {
  emailAddress: null | string;
  id: number;
  isSiteAdmin: null | number;
  loginId: null | string;
  name: null | string;
  passwordHash: null | string;
  passwordSalt: null | string;
  token: null | string;
}): DbAuthUserRecord | null {
  const loginId = normalizeNullableText(row.loginId);
  const name = normalizeNullableText(row.name);
  if (!loginId || !name) {
    return null;
  }

  const emailAddress = normalizeNullableText(row.emailAddress);

  return {
    apiToken: normalizeNullableText(row.token),
    emailAddress: emailAddress ? normalizeIdentifier(emailAddress) : fallbackEmailAddress(loginId),
    id: row.id,
    isConfirmed: true,
    isSiteAdmin: row.isSiteAdmin !== null && row.isSiteAdmin !== undefined,
    loginId: normalizeIdentifier(loginId),
    name,
    passwordHash: normalizeNullableText(row.passwordHash),
    passwordSalt: normalizeNullableText(row.passwordSalt),
  };
}

async function selectSingleAuthUser(
  predicate: (schema: ReturnType<typeof getDbSchema>) => unknown,
  db = getDb(),
): Promise<DbAuthUserRecord | null> {
  const schema = getDbSchema(db);
  const [row] = await (db as any)
    .select({
      emailAddress: schema.n4user.email,
      id: schema.n4user.id,
      isSiteAdmin: schema.siteAdmin.adminId,
      loginId: schema.n4user.loginId,
      name: schema.n4user.name,
      passwordHash: schema.n4user.password,
      passwordSalt: schema.n4user.passwordSalt,
      token: schema.n4user.token,
    })
    .from(schema.n4user)
    .leftJoin(schema.siteAdmin, eq(schema.siteAdmin.adminId, schema.n4user.id))
    .where(predicate(schema))
    .limit(1);

  return row ? mapDbAuthUser(row) : null;
}

export async function findAuthUserByApiToken(
  token: string,
  db = getDb(),
): Promise<DbAuthUserRecord | null> {
  const normalizedToken = token.trim();
  if (!normalizedToken) {
    return null;
  }

  return selectSingleAuthUser((schema) => eq(schema.n4user.token, normalizedToken), db);
}

export async function findAuthUserById(
  userId: number,
  db = getDb(),
): Promise<DbAuthUserRecord | null> {
  return selectSingleAuthUser((schema) => eq(schema.n4user.id, userId), db);
}

export async function findAuthUserByIdentifier(
  identifier: string,
  db = getDb(),
): Promise<DbAuthUserRecord | null> {
  const normalizedIdentifier = normalizeIdentifier(identifier);
  if (!normalizedIdentifier) {
    return null;
  }

  return selectSingleAuthUser(
    (schema) =>
      or(
        eq(schema.n4user.loginId, normalizedIdentifier),
        eq(schema.n4user.email, normalizedIdentifier),
      ),
    db,
  );
}

export async function createPasswordAuthUser(
  input: {
    emailAddress: string;
    loginId: string;
    name: string;
    passwordHash: string;
    passwordSalt: string;
  },
  db = getDb(),
): Promise<DbAuthUserRecord> {
  const schema = getDbSchema(db);
  const loginId = normalizeIdentifier(input.loginId);
  const emailAddress = normalizeIdentifier(input.emailAddress);
  const displayName = input.name.trim();

  await (db as any).insert(schema.n4user).values({
    createdDate: new Date(),
    email: emailAddress,
    isGuest: false,
    loginId,
    name: displayName,
    password: input.passwordHash,
    passwordSalt: input.passwordSalt,
    token: null,
  });

  const createdUser = await findAuthUserByIdentifier(loginId, db);
  if (!createdUser) {
    throw new Error("Failed to load newly created auth user.");
  }

  await (db as any).insert(schema.userCredential).values({
    active: true,
    email: emailAddress,
    emailValidated: true,
    loginId,
    name: displayName,
    userId: createdUser.id,
  });

  return createdUser;
}

export async function updateAuthUserPassword(
  input: {
    passwordHash: string;
    passwordSalt: string;
    userId: number;
  },
  db = getDb(),
): Promise<void> {
  const schema = getDbSchema(db);
  await (db as any)
    .update(schema.n4user)
    .set({
      password: input.passwordHash,
      passwordSalt: input.passwordSalt,
    })
    .where(eq(schema.n4user.id, input.userId));
}

export async function readUserApiToken(userId: number, db = getDb()): Promise<null | string> {
  const schema = getDbSchema(db);
  const [row] = await (db as any)
    .select({
      token: schema.n4user.token,
    })
    .from(schema.n4user)
    .where(eq(schema.n4user.id, userId))
    .limit(1);

  return normalizeNullableText(row?.token ?? null);
}

export async function updateUserApiToken(
  userId: number,
  token: string,
  db = getDb(),
): Promise<void> {
  const schema = getDbSchema(db);
  await (db as any)
    .update(schema.n4user)
    .set({
      token,
    })
    .where(eq(schema.n4user.id, userId));
}
