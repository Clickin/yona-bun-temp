import type { AuthUserSummary } from "@yona/contracts";
import {
  findAuthUserByApiToken,
  findAuthUserById,
  readUserApiToken,
  updateUserApiToken,
} from "@yona/db";
import { authenticatePasswordSignIn, readCurrentSession } from "./app-service";
import { consumeAuthRateLimit } from "./rate-limit";
import type { SessionRecord } from "./session-store";
import { generateResetToken, hashToken, signTokenWithSecret, verifyToken } from "./tokens";

const API_TOKEN_ENV = "YONA_API_TOKEN_SECRET";
const API_TOKEN_STATE_PREFIX = "v1";
const DEFAULT_DEVELOPMENT_API_TOKEN_SECRET = "yona-dev-api-token-secret";
const pendingApiTokenMutations = new Map<number, Promise<void>>();

export type RequestAuthMethod = "anonymous" | "api-token" | "basic" | "session";

export interface ResolvedRequestPrincipal {
  authMethod: RequestAuthMethod;
  hasInvalidCredentials: boolean;
  ipAddress: string;
  isAuthenticated: boolean;
  isRateLimited: boolean;
  retryAfterSeconds: null | number;
  session: SessionRecord | null;
  shouldClearSessionCookie: boolean;
  user: AuthUserSummary | null;
}

interface ResolveRequestPrincipalInput {
  cookieSessionToken?: string;
  headers: Headers;
  remoteAddress?: string;
}

interface ParsedBasicCredentials {
  identifier: string;
  password: string;
}

interface ParsedPresentedApiToken {
  rawToken: string;
  tokenId: string;
  userId: number;
}

interface StoredApiTokenState {
  tokenHash: string;
  tokenId: string;
}

interface ExplicitCredentialResult {
  authMethod: Exclude<RequestAuthMethod, "anonymous" | "session">;
  user: AuthUserSummary;
}

interface RateLimitedExplicitCredentialResult {
  kind: "rate-limited";
  retryAfterSeconds: number;
}

function isRateLimitedExplicitCredentialResult(
  value: ExplicitCredentialResult | RateLimitedExplicitCredentialResult,
): value is RateLimitedExplicitCredentialResult {
  return "kind" in value;
}

function buildAnonymousPrincipal(input: {
  hasInvalidCredentials?: boolean;
  ipAddress: string;
  isRateLimited?: boolean;
  retryAfterSeconds?: null | number;
  shouldClearSessionCookie?: boolean;
}): ResolvedRequestPrincipal {
  return {
    authMethod: "anonymous",
    hasInvalidCredentials: input.hasInvalidCredentials ?? false,
    ipAddress: input.ipAddress,
    isAuthenticated: false,
    isRateLimited: input.isRateLimited ?? false,
    retryAfterSeconds: input.retryAfterSeconds ?? null,
    session: null,
    shouldClearSessionCookie: input.shouldClearSessionCookie ?? false,
    user: null,
  };
}

function parseAuthorizationToken(headers: Headers): null | string {
  const authorization = headers.get("authorization")?.trim();
  if (!authorization || !authorization.toLowerCase().startsWith("token ")) {
    return null;
  }

  const token = authorization.slice("token ".length).trim();
  return token.length > 0 ? token : null;
}

function parseYonaToken(headers: Headers): null | string {
  const yonaToken = headers.get("yona-token")?.trim();
  return yonaToken && yonaToken.length > 0 ? yonaToken : null;
}

function parseBasicCredentials(headers: Headers): null | ParsedBasicCredentials {
  const authorization = headers.get("authorization")?.trim();
  if (!authorization || !authorization.toLowerCase().startsWith("basic ")) {
    return null;
  }

  const encodedCredentials = authorization.slice("basic ".length).trim();
  if (!encodedCredentials) {
    return null;
  }

  try {
    const decodedCredentials = Buffer.from(encodedCredentials, "base64").toString("latin1");
    const separatorIndex = decodedCredentials.indexOf(":");
    if (separatorIndex < 0) {
      return null;
    }

    return {
      identifier: decodedCredentials.slice(0, separatorIndex),
      password: decodedCredentials.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

function requireApiTokenSecret(): string {
  const secret = process.env[API_TOKEN_ENV]?.trim();
  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(`${API_TOKEN_ENV} is required in production.`);
  }

  return DEFAULT_DEVELOPMENT_API_TOKEN_SECRET;
}

function parsePresentedApiToken(token: string): null | ParsedPresentedApiToken {
  const normalizedToken = token.trim();
  const parts = normalizedToken.split(".");
  if (parts.length !== 4 || parts[0] !== API_TOKEN_STATE_PREFIX) {
    return null;
  }

  const userId = Number.parseInt(parts[1] ?? "", 10);
  const tokenId = parts[2]?.trim();
  const signature = parts[3]?.trim();
  if (!Number.isInteger(userId) || userId <= 0 || !tokenId || !signature) {
    return null;
  }

  return {
    rawToken: normalizedToken,
    tokenId,
    userId,
  };
}

function parseStoredApiTokenState(
  storedToken: null | string,
):
  | { kind: "legacy"; rawToken: string }
  | { kind: "missing" }
  | { kind: "v1"; state: StoredApiTokenState } {
  if (!storedToken) {
    return {
      kind: "missing",
    };
  }

  const normalizedToken = storedToken.trim();
  if (!normalizedToken || normalizedToken.toUpperCase() === "NULL") {
    return {
      kind: "missing",
    };
  }

  const parts = normalizedToken.split(":");
  if (parts.length === 3 && parts[0] === API_TOKEN_STATE_PREFIX && parts[1] && parts[2]) {
    return {
      kind: "v1",
      state: {
        tokenHash: parts[2],
        tokenId: parts[1],
      },
    };
  }

  return {
    kind: "legacy",
    rawToken: normalizedToken,
  };
}

function serializeStoredApiTokenState(state: StoredApiTokenState): string {
  return `${API_TOKEN_STATE_PREFIX}:${state.tokenId}:${state.tokenHash}`;
}

async function buildRawApiToken(userId: number, tokenId: string): Promise<string> {
  const signature = await signTokenWithSecret(`${userId}:${tokenId}`, requireApiTokenSecret());
  return `${API_TOKEN_STATE_PREFIX}.${userId}.${tokenId}.${signature}`;
}

async function persistFreshApiToken(userId: number): Promise<string> {
  const tokenId = generateResetToken();
  const token = await buildRawApiToken(userId, tokenId);
  await updateUserApiToken(
    userId,
    serializeStoredApiTokenState({
      tokenHash: await hashToken(token),
      tokenId,
    }),
  );
  return token;
}

async function readRawPersistedApiToken(userId: number): Promise<null | string> {
  const parsedStoredToken = parseStoredApiTokenState(await readUserApiToken(userId));
  if (parsedStoredToken.kind === "missing") {
    return null;
  }

  if (parsedStoredToken.kind === "legacy") {
    return parsedStoredToken.rawToken;
  }

  const rawToken = await buildRawApiToken(userId, parsedStoredToken.state.tokenId);
  const tokenMatches = await verifyToken(rawToken, parsedStoredToken.state.tokenHash);
  if (!tokenMatches) {
    throw new Error(`Stored API token state is invalid for user ${userId}.`);
  }

  return rawToken;
}

async function withSerializedApiTokenMutation<T>(
  userId: number,
  mutation: () => Promise<T>,
): Promise<T> {
  const previousMutation = pendingApiTokenMutations.get(userId) ?? Promise.resolve();
  let releaseCurrentMutation!: () => void;
  const currentMutation = new Promise<void>((resolve) => {
    releaseCurrentMutation = resolve;
  });

  pendingApiTokenMutations.set(userId, currentMutation);
  await previousMutation;

  try {
    return await mutation();
  } finally {
    releaseCurrentMutation();
    if (pendingApiTokenMutations.get(userId) === currentMutation) {
      pendingApiTokenMutations.delete(userId);
    }
  }
}

async function authenticateExplicitToken(
  token: string,
): Promise<ExplicitCredentialResult | "invalid"> {
  const normalizedToken = token.trim();
  if (!normalizedToken) {
    return "invalid";
  }

  const parsedToken = parsePresentedApiToken(normalizedToken);
  if (parsedToken) {
    const user = await findAuthUserById(parsedToken.userId);
    if (user) {
      const storedToken = parseStoredApiTokenState(await readUserApiToken(user.id));
      if (
        storedToken.kind === "v1" &&
        storedToken.state.tokenId === parsedToken.tokenId &&
        (await verifyToken(parsedToken.rawToken, storedToken.state.tokenHash))
      ) {
        return {
          authMethod: "api-token",
          user,
        };
      }
    }
  }

  const legacyUser = await findAuthUserByApiToken(normalizedToken);
  if (!legacyUser) {
    return "invalid";
  }

  return {
    authMethod: "api-token",
    user: legacyUser,
  };
}

async function authenticateBasicCredentials(
  credentials: ParsedBasicCredentials,
  ipAddress: string,
): Promise<ExplicitCredentialResult | "invalid" | RateLimitedExplicitCredentialResult> {
  const rateLimitDecision = await consumeAuthRateLimit({
    ip: ipAddress,
    route: "login",
  });
  if (!rateLimitDecision.ok) {
    return {
      kind: "rate-limited",
      retryAfterSeconds: rateLimitDecision.retryAfterSeconds,
    };
  }

  const signIn = await authenticatePasswordSignIn(credentials.identifier, credentials.password);
  if (!signIn.ok) {
    return "invalid";
  }

  return {
    authMethod: "basic",
    user: signIn.user,
  };
}

function buildAuthenticatedPrincipal(
  input: ExplicitCredentialResult & {
    ipAddress: string;
  },
): ResolvedRequestPrincipal {
  return {
    authMethod: input.authMethod,
    hasInvalidCredentials: false,
    ipAddress: input.ipAddress,
    isAuthenticated: true,
    isRateLimited: false,
    retryAfterSeconds: null,
    session: null,
    shouldClearSessionCookie: false,
    user: input.user,
  };
}

async function resolveExplicitPrincipal(
  headers: Headers,
  ipAddress: string,
): Promise<null | ResolvedRequestPrincipal> {
  const authorizationToken = parseAuthorizationToken(headers);
  const yonaToken = parseYonaToken(headers);
  const basicCredentials = parseBasicCredentials(headers);

  if (!authorizationToken && !yonaToken && !basicCredentials) {
    return null;
  }

  if (authorizationToken && yonaToken && authorizationToken !== yonaToken) {
    return buildAnonymousPrincipal({
      hasInvalidCredentials: true,
      ipAddress,
    });
  }

  const explicitResults: ExplicitCredentialResult[] = [];
  const token = authorizationToken ?? yonaToken;
  if (token) {
    const tokenResult = await authenticateExplicitToken(token);
    if (tokenResult === "invalid") {
      return buildAnonymousPrincipal({
        hasInvalidCredentials: true,
        ipAddress,
      });
    }

    explicitResults.push(tokenResult);
  }

  if (basicCredentials) {
    const basicResult = await authenticateBasicCredentials(basicCredentials, ipAddress);
    if (basicResult === "invalid") {
      return buildAnonymousPrincipal({
        hasInvalidCredentials: true,
        ipAddress,
      });
    }

    if (isRateLimitedExplicitCredentialResult(basicResult)) {
      return buildAnonymousPrincipal({
        ipAddress,
        isRateLimited: true,
        retryAfterSeconds: basicResult.retryAfterSeconds,
      });
    }

    explicitResults.push(basicResult);
  }

  const [primaryResult, ...remainingResults] = explicitResults;
  if (!primaryResult) {
    return null;
  }

  if (remainingResults.some((result) => result.user.id !== primaryResult.user.id)) {
    return buildAnonymousPrincipal({
      hasInvalidCredentials: true,
      ipAddress,
    });
  }

  return buildAuthenticatedPrincipal({
    authMethod: primaryResult.authMethod,
    ipAddress,
    user: primaryResult.user,
  });
}

export async function resolveRequestPrincipal(
  input: ResolveRequestPrincipalInput,
): Promise<ResolvedRequestPrincipal> {
  const ipAddress = input.remoteAddress?.trim() || "unknown";
  const explicitPrincipal = await resolveExplicitPrincipal(input.headers, ipAddress);
  if (explicitPrincipal) {
    return explicitPrincipal;
  }

  const currentSession = await readCurrentSession(input.cookieSessionToken);
  if (!currentSession.user || !currentSession.sessionRecord) {
    return buildAnonymousPrincipal({
      ipAddress,
      shouldClearSessionCookie: currentSession.clearCookie,
    });
  }

  return {
    authMethod: "session",
    hasInvalidCredentials: false,
    ipAddress,
    isAuthenticated: true,
    isRateLimited: false,
    retryAfterSeconds: null,
    session: currentSession.sessionRecord,
    shouldClearSessionCookie: currentSession.clearCookie,
    user: currentSession.user,
  };
}

export async function getOrCreateUserApiToken(userId: number): Promise<string> {
  return withSerializedApiTokenMutation(userId, async () => {
    const user = await findAuthUserById(userId);
    if (!user) {
      throw new Error(`Cannot issue an API token for unknown user ${userId}.`);
    }

    const existingToken = await readRawPersistedApiToken(userId);
    if (existingToken) {
      return existingToken;
    }

    return persistFreshApiToken(userId);
  });
}

export async function rotateUserApiToken(userId: number): Promise<string> {
  return withSerializedApiTokenMutation(userId, async () => {
    const user = await findAuthUserById(userId);
    if (!user) {
      throw new Error(`Cannot rotate an API token for unknown user ${userId}.`);
    }

    return persistFreshApiToken(userId);
  });
}
