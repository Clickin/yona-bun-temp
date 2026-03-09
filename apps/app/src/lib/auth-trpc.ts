import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import {
  type AuthErrorCode,
  currentUserApiTokenSchema,
  completePasswordResetInputSchema,
  completePasswordResetOutputSchema,
  readCurrentSessionOutputSchema,
  readCurrentUserApiTokenOutputSchema,
  registerWithPasswordInputSchema,
  registerWithPasswordOutputSchema,
  requestPasswordResetInputSchema,
  rotateCurrentUserApiTokenOutputSchema,
  requestPasswordResetOutputSchema,
  signInWithPasswordInputSchema,
  signInWithPasswordOutputSchema,
  signOutOutputSchema,
} from "@yona/contracts";
import {
  authenticatePasswordSignIn,
  buildAnonymousAppSession,
  consumeAuthRateLimit,
  createAppUser,
  deleteSessionByToken,
  getOrCreateUserApiToken,
  getSessionByToken,
  getSessionCookieName,
  getSessionCookieOptions,
  issueAppSession,
  issuePasswordResetToken,
  readCurrentSession,
  rotateUserApiToken,
  resetPasswordWithToken,
  validateCsrfToken,
  type SessionCookieOptions,
} from "@yona/auth";
import { getBetterAuthSessionCookieOptions } from "@yona/auth/better-auth";
import { buildPasswordResetUrl, sendPasswordResetEmail } from "@yona/integrations";

export interface AuthProcedureContext {
  deleteCookie(name: string, options: { path: string }): void;
  getCookie(name: string): string | undefined;
  getRequestHeader(name: string): string | undefined;
  getRequestIp(): string | undefined;
  setCookie(name: string, value: string, options: SessionCookieOptions): void;
  setResponseHeader(name: string, value: string): void;
  setResponseStatus(status: number, statusText?: string): void;
}

const sessionCookieName = getSessionCookieName();
const t = initTRPC.context<AuthProcedureContext>().create({
  transformer: superjson,
});

function createDefaultAuthProcedureContext(): AuthProcedureContext {
  return {
    deleteCookie: () => {},
    getCookie: () => undefined,
    getRequestHeader: () => undefined,
    getRequestIp: () => undefined,
    setCookie: () => {},
    setResponseHeader: () => {},
    setResponseStatus: () => {},
  };
}

function clearSessionCookie(ctx: AuthProcedureContext): void {
  ctx.deleteCookie(sessionCookieName, {
    path: "/",
  });
}

async function resolveSessionCookieOptions(): Promise<SessionCookieOptions> {
  try {
    return await getBetterAuthSessionCookieOptions();
  } catch {
    return getSessionCookieOptions();
  }
}

async function requireAuthenticatedCurrentSession(ctx: AuthProcedureContext) {
  const currentSession = await readCurrentSession(ctx.getCookie(sessionCookieName));
  if (currentSession.clearCookie) {
    clearSessionCookie(ctx);
  }

  if (!currentSession.user || !currentSession.sessionRecord) {
    ctx.setResponseStatus(401, "Unauthorized");
    throw new Error("Authentication required.");
  }

  return currentSession;
}

function authErrorMessage(code: AuthErrorCode): string {
  if (code === "auth.account-not-confirmed") {
    return "This account exists but is not confirmed yet.";
  }

  if (code === "auth.login-id-conflict") {
    return "That login ID or email address is already in use.";
  }

  if (code === "auth.rate-limited") {
    return "Too many requests. Try again later.";
  }

  return "Invalid login ID, email, or password.";
}

function logPasswordResetDeliveryFailure(error: unknown, loginId: string): void {
  console.error("[auth:forgot-password] Failed to deliver password reset email.", {
    error,
    loginId,
  });
}

async function getAuthRateLimitFailure(
  ctx: AuthProcedureContext,
  route: "forgot-password" | "login" | "register",
): Promise<null | {
  code: "auth.rate-limited";
  message: string;
  ok: false;
  retryAfterSeconds: number;
}> {
  const ipAddress = ctx.getRequestIp() ?? "unknown";
  const decision = await consumeAuthRateLimit({
    ip: ipAddress,
    route,
  });

  if (decision.ok) {
    return null;
  }

  ctx.setResponseStatus(429, "Too Many Requests");
  ctx.setResponseHeader("Retry-After", String(decision.retryAfterSeconds));

  return {
    code: "auth.rate-limited",
    message: authErrorMessage("auth.rate-limited"),
    ok: false,
    retryAfterSeconds: decision.retryAfterSeconds,
  };
}

export const authRouter = t.router({
  readCurrentSession: t.procedure.output(readCurrentSessionOutputSchema).query(async ({ ctx }) => {
    const currentSession = await readCurrentSession(ctx.getCookie(sessionCookieName));
    if (currentSession.clearCookie) {
      clearSessionCookie(ctx);
    }

    return currentSession.projection;
  }),
  readCurrentUserApiToken: t.procedure
    .output(readCurrentUserApiTokenOutputSchema)
    .query(async ({ ctx }) => {
      const currentSession = await requireAuthenticatedCurrentSession(ctx);
      return currentUserApiTokenSchema.parse({
        token: await getOrCreateUserApiToken(currentSession.user!.id),
      });
    }),
  signInWithPassword: t.procedure
    .input(signInWithPasswordInputSchema)
    .output(signInWithPasswordOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const rateLimitFailure = await getAuthRateLimitFailure(ctx, "login");
      if (rateLimitFailure) {
        return rateLimitFailure;
      }

      const result = await authenticatePasswordSignIn(input.identifier, input.password);
      if (!result.ok) {
        return {
          code: result.code,
          message: authErrorMessage(result.code),
          ok: false,
        };
      }

      const issuedSession = await issueAppSession(result.user.id, {
        ipAddress: ctx.getRequestIp(),
        userAgent: ctx.getRequestHeader("user-agent") ?? "unknown",
      });
      ctx.setCookie(
        sessionCookieName,
        issuedSession.session.token,
        await resolveSessionCookieOptions(),
      );

      return {
        ok: true,
        session: issuedSession.projection,
      };
    }),
  registerWithPassword: t.procedure
    .input(registerWithPasswordInputSchema)
    .output(registerWithPasswordOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const rateLimitFailure = await getAuthRateLimitFailure(ctx, "register");
      if (rateLimitFailure) {
        return rateLimitFailure;
      }

      const result = await createAppUser(input);
      if (!result.ok) {
        return {
          code: result.code,
          message: authErrorMessage(result.code),
          ok: false,
        };
      }

      const issuedSession = await issueAppSession(result.user.id, {
        ipAddress: ctx.getRequestIp(),
        userAgent: ctx.getRequestHeader("user-agent") ?? "unknown",
      });
      ctx.setCookie(
        sessionCookieName,
        issuedSession.session.token,
        await resolveSessionCookieOptions(),
      );

      return {
        ok: true,
        session: issuedSession.projection,
      };
    }),
  requestPasswordReset: t.procedure
    .input(requestPasswordResetInputSchema)
    .output(requestPasswordResetOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const rateLimitFailure = await getAuthRateLimitFailure(ctx, "forgot-password");
      if (rateLimitFailure) {
        return rateLimitFailure;
      }

      const resetRequest = await issuePasswordResetToken({
        emailAddress: input.emailAddress,
        loginId: input.loginId,
      });

      if (resetRequest.resetToken && resetRequest.expiresAt) {
        try {
          await sendPasswordResetEmail({
            expiresAt: resetRequest.expiresAt,
            loginId: input.loginId.trim(),
            resetUrl: buildPasswordResetUrl(resetRequest.resetToken),
            to: input.emailAddress.trim().toLowerCase(),
          });
        } catch (error) {
          logPasswordResetDeliveryFailure(error, input.loginId.trim());
        }
      }

      return {
        ok: true,
      };
    }),
  completePasswordReset: t.procedure
    .input(completePasswordResetInputSchema)
    .output(completePasswordResetOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const currentToken = ctx.getCookie(sessionCookieName);
      const currentSession =
        currentToken === undefined ? null : await getSessionByToken(currentToken);
      const result = await resetPasswordWithToken(input);

      if (!result.ok) {
        return {
          message: "Reset token is invalid or has expired.",
          ok: false,
        };
      }

      if (currentSession?.userId === result.user.id) {
        clearSessionCookie(ctx);
      }

      return {
        ok: true,
        session: buildAnonymousAppSession(),
      };
    }),
  signOut: t.procedure.output(signOutOutputSchema).mutation(async ({ ctx }) => {
    const token = ctx.getCookie(sessionCookieName);
    if (token) {
      await deleteSessionByToken(token);
    }

    clearSessionCookie(ctx);

    return {
      ok: true,
      session: buildAnonymousAppSession(),
    };
  }),
  rotateCurrentUserApiToken: t.procedure
    .output(rotateCurrentUserApiTokenOutputSchema)
    .mutation(async ({ ctx }) => {
      const currentSession = await requireAuthenticatedCurrentSession(ctx);
      const csrfToken = ctx.getRequestHeader("x-csrf-token")?.trim() ?? "";
      if (!validateCsrfToken(csrfToken, currentSession.sessionRecord!)) {
        ctx.setResponseStatus(403, "Forbidden");
        throw new Error("CSRF validation failed.");
      }

      return currentUserApiTokenSchema.parse({
        token: await rotateUserApiToken(currentSession.user!.id),
      });
    }),
});

export function createAuthCaller(overrides: Partial<AuthProcedureContext> = {}) {
  return authRouter.createCaller({
    ...createDefaultAuthProcedureContext(),
    ...overrides,
  });
}

export type AppAuthCaller = ReturnType<typeof createAuthCaller>;
