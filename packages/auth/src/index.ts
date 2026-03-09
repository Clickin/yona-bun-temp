export type { CreateSessionInput, SessionRecord, SessionStore } from "./session-store";
export {
  InMemorySessionStore,
  inMemorySessionStore,
  resetInMemorySessionStoreForTests,
} from "./in-memory-session-store";
export {
  __resetSessionStoreForTests,
  createSession,
  deleteAllSessionsByUserId,
  deleteSessionByToken,
  getSessionByToken,
  getSessionCookieMaxAge,
  getSessionCookieName,
  getSessionCookieOptions,
  hashSessionToken,
  upsertSessionMetadata,
  type CreatedSession,
  type CreateRuntimeSessionInput,
  type SessionCookieOptionInput,
  type SessionCookieOptions,
} from "./session";
export {
  ensureAnonymousCsrfToken,
  generateCsrfToken,
  getAnonymousCsrfCookieName,
  readRequestCsrfToken,
  validateCsrfToken,
} from "./csrf";
export {
  hashCredentialPassword,
  hashPassword,
  verifyCredentialPassword,
  verifyPassword,
} from "./password";
export { generateResetToken, hashToken, verifyToken } from "./tokens";
export {
  getOrCreateUserApiToken,
  resolveRequestPrincipal,
  rotateUserApiToken,
  type RequestAuthMethod,
  type ResolvedRequestPrincipal,
} from "./request-auth";
export {
  createBetterAuthSessionForActor,
  deleteBetterAuthSessionByCookieValue,
  deleteBetterAuthSessionsByActorId,
  getBetterAuth,
  getBetterAuthSessionCookieOptions,
  readBetterAuthSessionFromCookie,
  resetBetterAuthStateForTests,
} from "./better-auth";
export {
  authenticatePasswordSignIn,
  buildAnonymousAppSession,
  buildAuthenticatedAppSession,
  buildSessionRoutePayload,
  createAppUser,
  findAppUserById,
  issueAppSession,
  issuePasswordResetToken,
  readCurrentSession,
  resetAuthStateForTests,
  resetPasswordByAdmin,
  resetPasswordWithToken,
  type CreateAppUserInput,
  type CreateAppUserResult,
  type IssuePasswordResetTokenResult,
  type IssuedAppSession,
  type PasswordSignInResult,
  type ResolvedCurrentSession,
} from "./app-service";
export {
  getClientIp,
  hasValidSameOrigin,
  readAuthPayload,
  type AuthPayload,
} from "./request-validation";
export {
  consumeAuthRateLimit,
  resetAuthRateLimitForTests,
  type AuthRateLimitDecision,
  type AuthRateLimitRoute,
} from "./rate-limit";
