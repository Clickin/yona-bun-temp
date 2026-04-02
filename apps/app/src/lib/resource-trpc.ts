import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { createDomainActor } from "@app/lib/server-request-auth";
import { getSessionCookieName, readCurrentSession } from "@yona/auth";
import {
  DomainConflictError,
  DomainNotFoundError,
  DomainPermissionError,
  DomainValidationError,
  type DomainActor,
} from "@yona/domain";

export interface AppResourceProcedureContext {
  deleteCookie(name: string, options: { path: string }): void;
  getCookie(name: string): string | undefined;
  setResponseStatus(code: number, statusText?: string): void;
}

const sessionCookieName = getSessionCookieName();

export const t = initTRPC.context<AppResourceProcedureContext>().create({
  transformer: superjson,
});

export function createDefaultAppResourceProcedureContext(): AppResourceProcedureContext {
  return {
    deleteCookie: () => {},
    getCookie: () => undefined,
    setResponseStatus: () => {},
  };
}

function clearSessionCookie(ctx: AppResourceProcedureContext): void {
  ctx.deleteCookie(sessionCookieName, {
    path: "/",
  });
}

export async function readDomainActor(ctx: AppResourceProcedureContext): Promise<DomainActor> {
  const currentSession = await readCurrentSession(ctx.getCookie(sessionCookieName));
  if (currentSession.clearCookie) {
    clearSessionCookie(ctx);
  }

  return createDomainActor({
    actorId: currentSession.projection.actorId,
    emailAddress: currentSession.projection.emailAddress,
    isAnonymous: currentSession.projection.isAnonymous,
    isSiteAdmin: currentSession.projection.isSiteAdmin,
    loginId: currentSession.projection.loginId,
    name: currentSession.projection.userLabel,
  });
}

export function rethrowDomainAsTrpc(error: unknown): never {
  if (error instanceof DomainConflictError) {
    throw new TRPCError({
      code: "CONFLICT",
      message: error.message,
    });
  }

  if (error instanceof DomainNotFoundError) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: error.message,
    });
  }

  if (error instanceof DomainPermissionError) {
    throw new TRPCError({
      code: error.requiresAuthentication ? "UNAUTHORIZED" : "FORBIDDEN",
      message: error.message,
    });
  }

  if (error instanceof DomainValidationError) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}
