import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
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

function toDomainActor(input: {
  actorId: null | number;
  isAnonymous: boolean;
  isSiteAdmin: boolean;
  loginId: null | string;
}): DomainActor {
  return {
    actorId: input.actorId,
    isAnonymous: input.isAnonymous,
    isSiteAdmin: input.isSiteAdmin,
    loginId: input.loginId,
  };
}

export async function readDomainActor(ctx: AppResourceProcedureContext): Promise<DomainActor> {
  const currentSession = await readCurrentSession(ctx.getCookie(sessionCookieName));
  if (currentSession.clearCookie) {
    clearSessionCookie(ctx);
  }

  return toDomainActor(currentSession.projection);
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
