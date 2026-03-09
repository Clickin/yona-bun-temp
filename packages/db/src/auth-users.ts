import { and, eq, or } from "drizzle-orm";
import { getDb } from "./index";
import { getDbSchema } from "./runtime-schema";

const CREDENTIAL_PROVIDER_KEY = "credential";

export interface DbAuthUserRecord {
  apiToken: null | string;
  credentialPasswordHash: null | string;
  credentialUserId: null | number;
  emailAddress: string;
  id: number;
  isConfirmed: boolean;
  isSiteAdmin: boolean;
  legacyPasswordHash: null | string;
  legacyPasswordSalt: null | string;
  loginId: string;
  name: string;
  passwordHash: null | string;
  passwordSalt: null | string;
}

interface RawActorRow {
  createdDate: Date | null;
  email: null | string;
  id: number;
  loginId: null | string;
  name: null | string;
  token: null | string;
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

function normalizeOptionalDate(value: Date | null | string): Date | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeNullableNumber(value: null | number | string): null | number {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function fallbackEmailAddress(loginId: string): string {
  const normalizedLoginId = normalizeIdentifier(loginId);
  if (normalizedLoginId.includes("@")) {
    return normalizedLoginId;
  }

  return `${normalizedLoginId}@users.noreply.yona.invalid`;
}

function coalesceText(...values: Array<null | string>): null | string {
  for (const value of values) {
    const normalized = normalizeNullableText(value);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function mapDbAuthUser(row: {
  credentialEmail: null | string;
  credentialLoginId: null | string;
  credentialName: null | string;
  credentialPasswordHash: null | string;
  credentialUserId: null | number | string;
  emailAddress: null | string;
  emailValidated: boolean | null | number;
  id: number;
  isSiteAdmin: null | number;
  legacyPasswordHash: null | string;
  legacyPasswordSalt: null | string;
  loginId: null | string;
  name: null | string;
  token: null | string;
}): DbAuthUserRecord | null {
  const loginId = coalesceText(row.credentialLoginId, row.loginId);
  const name = coalesceText(row.credentialName, row.name);
  if (!loginId || !name) {
    return null;
  }

  const credentialPasswordHash = normalizeNullableText(row.credentialPasswordHash);
  const legacyPasswordHash = normalizeNullableText(row.legacyPasswordHash);
  const legacyPasswordSalt = normalizeNullableText(row.legacyPasswordSalt);
  const emailAddress = coalesceText(row.credentialEmail, row.emailAddress);

  return {
    apiToken: normalizeNullableText(row.token),
    credentialPasswordHash,
    credentialUserId: normalizeNullableNumber(row.credentialUserId),
    emailAddress: emailAddress ? normalizeIdentifier(emailAddress) : fallbackEmailAddress(loginId),
    id: row.id,
    isConfirmed:
      row.emailValidated === null || row.emailValidated === undefined
        ? true
        : Boolean(row.emailValidated),
    isSiteAdmin: row.isSiteAdmin !== null && row.isSiteAdmin !== undefined,
    legacyPasswordHash,
    legacyPasswordSalt,
    loginId: normalizeIdentifier(loginId),
    name,
    passwordHash: credentialPasswordHash ?? legacyPasswordHash,
    passwordSalt: credentialPasswordHash ? null : legacyPasswordSalt,
  };
}

async function selectSingleAuthUser(
  predicate: (schema: ReturnType<typeof getDbSchema>) => unknown,
  db = getDb(),
): Promise<DbAuthUserRecord | null> {
  const schema = getDbSchema(db);
  const [row] = await (db as any)
    .select({
      credentialEmail: schema.userCredential.email,
      credentialLoginId: schema.userCredential.loginId,
      credentialName: schema.userCredential.name,
      credentialPasswordHash: schema.linkedAccount.password,
      credentialUserId: schema.userCredential.id,
      emailAddress: schema.n4user.email,
      emailValidated: schema.userCredential.emailValidated,
      id: schema.n4user.id,
      isSiteAdmin: schema.siteAdmin.adminId,
      legacyPasswordHash: schema.n4user.password,
      legacyPasswordSalt: schema.n4user.passwordSalt,
      loginId: schema.n4user.loginId,
      name: schema.n4user.name,
      token: schema.n4user.token,
    })
    .from(schema.n4user)
    .leftJoin(schema.userCredential, eq(schema.userCredential.userId, schema.n4user.id))
    .leftJoin(
      schema.linkedAccount,
      and(
        eq(schema.linkedAccount.userCredentialId, schema.userCredential.id),
        eq(schema.linkedAccount.providerKey, CREDENTIAL_PROVIDER_KEY),
      ),
    )
    .leftJoin(schema.siteAdmin, eq(schema.siteAdmin.adminId, schema.n4user.id))
    .where(predicate(schema))
    .limit(1);

  return row ? mapDbAuthUser(row) : null;
}

async function readActorRowById(userId: number, db = getDb()): Promise<RawActorRow | null> {
  const schema = getDbSchema(db);
  const [row] = await (db as any)
    .select({
      createdDate: schema.n4user.createdDate,
      email: schema.n4user.email,
      id: schema.n4user.id,
      loginId: schema.n4user.loginId,
      name: schema.n4user.name,
      token: schema.n4user.token,
    })
    .from(schema.n4user)
    .where(eq(schema.n4user.id, userId))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    createdDate: normalizeOptionalDate(row.createdDate),
    email: normalizeNullableText(row.email),
    id: row.id,
    loginId: normalizeNullableText(row.loginId),
    name: normalizeNullableText(row.name),
    token: normalizeNullableText(row.token),
  };
}

async function readCredentialAccountRowByCredentialId(
  credentialUserId: number,
  db = getDb(),
): Promise<null | { id: number }> {
  const schema = getDbSchema(db);
  const [row] = await (db as any)
    .select({
      id: schema.linkedAccount.id,
    })
    .from(schema.linkedAccount)
    .where(
      and(
        eq(schema.linkedAccount.userCredentialId, credentialUserId),
        eq(schema.linkedAccount.providerKey, CREDENTIAL_PROVIDER_KEY),
      ),
    )
    .limit(1);

  return row ? { id: row.id } : null;
}

async function ensureUserCredentialRow(
  userId: number,
  db = getDb(),
): Promise<DbAuthUserRecord | null> {
  const existing = await findAuthUserById(userId, db);
  if (existing?.credentialUserId) {
    return existing;
  }

  const actor = await readActorRowById(userId, db);
  if (!actor) {
    return null;
  }

  const schema = getDbSchema(db);
  const loginId = actor.loginId ? normalizeIdentifier(actor.loginId) : null;
  const emailAddress = actor.email
    ? normalizeIdentifier(actor.email)
    : fallbackEmailAddress(loginId ?? actor.id.toString());
  const name = actor.name ?? loginId ?? `user-${actor.id}`;
  const now = new Date();

  await (db as any).insert(schema.userCredential).values({
    active: true,
    createdAt: now,
    email: emailAddress,
    emailValidated: true,
    image: null,
    loginId: loginId ?? `user-${actor.id}`,
    name,
    updatedAt: now,
    userId: actor.id,
  });

  return findAuthUserById(userId, db);
}

async function ensureCredentialAccountPassword(
  actorUserId: number,
  passwordHash: string,
  db = getDb(),
): Promise<void> {
  const schema = getDbSchema(db);
  const authUser = await ensureUserCredentialRow(actorUserId, db);
  if (!authUser?.credentialUserId) {
    throw new Error(`Auth credential bridge is missing for user ${actorUserId}.`);
  }

  const now = new Date();
  const existingCredentialAccount = await readCredentialAccountRowByCredentialId(
    authUser.credentialUserId,
    db,
  );
  if (existingCredentialAccount) {
    await (db as any)
      .update(schema.linkedAccount)
      .set({
        password: passwordHash,
        updatedAt: now,
      })
      .where(eq(schema.linkedAccount.id, existingCredentialAccount.id));
  } else {
    await (db as any).insert(schema.linkedAccount).values({
      accessToken: null,
      accessTokenExpiresAt: null,
      avatarUrl: null,
      createdAt: now,
      idToken: null,
      password: passwordHash,
      providerDisplayName: null,
      providerKey: CREDENTIAL_PROVIDER_KEY,
      providerUserId: String(authUser.credentialUserId),
      refreshToken: null,
      refreshTokenExpiresAt: null,
      scope: null,
      updatedAt: now,
      userCredentialId: authUser.credentialUserId,
    });
  }

  await (db as any)
    .update(schema.n4user)
    .set({
      password: null,
      passwordSalt: null,
    })
    .where(eq(schema.n4user.id, actorUserId));
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

export async function findAuthUserByCredentialId(
  credentialUserId: number,
  db = getDb(),
): Promise<DbAuthUserRecord | null> {
  return selectSingleAuthUser((schema) => eq(schema.userCredential.id, credentialUserId), db);
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
        eq(schema.userCredential.loginId, normalizedIdentifier),
        eq(schema.userCredential.email, normalizedIdentifier),
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
  const now = new Date();

  return (db as any).transaction(async (tx: any) => {
    await tx.insert(schema.n4user).values({
      createdDate: now,
      email: emailAddress,
      isGuest: false,
      loginId,
      name: displayName,
      password: null,
      passwordSalt: null,
      token: null,
    });

    const [actorRow] = await tx
      .select({
        id: schema.n4user.id,
      })
      .from(schema.n4user)
      .where(eq(schema.n4user.loginId, loginId))
      .limit(1);

    if (!actorRow) {
      throw new Error("Failed to load newly created root auth user.");
    }

    await tx.insert(schema.userCredential).values({
      active: true,
      createdAt: now,
      email: emailAddress,
      emailValidated: true,
      image: null,
      loginId,
      name: displayName,
      updatedAt: now,
      userId: actorRow.id,
    });

    const [credentialRow] = await tx
      .select({
        id: schema.userCredential.id,
      })
      .from(schema.userCredential)
      .where(eq(schema.userCredential.userId, actorRow.id))
      .limit(1);

    if (!credentialRow) {
      throw new Error("Failed to load newly created auth credential.");
    }

    await tx.insert(schema.linkedAccount).values({
      accessToken: null,
      accessTokenExpiresAt: null,
      avatarUrl: null,
      createdAt: now,
      idToken: null,
      password: input.passwordHash,
      providerDisplayName: null,
      providerKey: CREDENTIAL_PROVIDER_KEY,
      providerUserId: String(credentialRow.id),
      refreshToken: null,
      refreshTokenExpiresAt: null,
      scope: null,
      updatedAt: now,
      userCredentialId: credentialRow.id,
    });

    const createdUser = await findAuthUserById(actorRow.id, tx);
    if (!createdUser) {
      throw new Error("Failed to load newly created auth user.");
    }

    return createdUser;
  });
}

export async function ensureAuthUserCredentialId(
  userId: number,
  db = getDb(),
): Promise<null | number> {
  const authUser = await ensureUserCredentialRow(userId, db);
  return authUser?.credentialUserId ?? null;
}

export async function updateAuthUserPassword(
  input: {
    passwordHash: string;
    passwordSalt: null | string;
    userId: number;
  },
  db = getDb(),
): Promise<void> {
  await ensureCredentialAccountPassword(input.userId, input.passwordHash, db);
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
