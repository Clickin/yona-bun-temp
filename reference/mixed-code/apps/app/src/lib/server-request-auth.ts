import { getRequestIP } from "@tanstack/react-start/server";
import {
  getSessionCookieName,
  resolveRequestPrincipal,
  type ResolvedRequestPrincipal,
} from "@yona/auth";
import type { DomainActor } from "@yona/domain";

export interface DomainActorInput {
  actorId: null | number;
  isAnonymous: boolean;
  isSiteAdmin: boolean;
  loginId: null | string;
  name: null | string;
}

function readCookieValue(headers: Headers, name: string): string | undefined {
  const cookieHeader = headers.get("cookie");
  if (!cookieHeader) {
    return undefined;
  }

  for (const cookie of cookieHeader.split(";")) {
    const [rawName, ...rawValueParts] = cookie.split("=");
    if (rawName?.trim() !== name) {
      continue;
    }

    const rawValue = rawValueParts.join("=").trim();
    if (rawValue.length === 0) {
      return undefined;
    }

    try {
      return decodeURIComponent(rawValue);
    } catch {
      return undefined;
    }
  }

  return undefined;
}

export function readTrustedRequestIp(): string {
  try {
    return getRequestIP() ?? "unknown";
  } catch {
    return "unknown";
  }
}

export async function resolveServerRequestPrincipal(request: Request) {
  return resolveRequestPrincipal({
    cookieSessionToken: readCookieValue(request.headers, getSessionCookieName()),
    headers: request.headers,
    remoteAddress: readTrustedRequestIp(),
  });
}

export function createDomainActor(input: DomainActorInput): DomainActor {
  return {
    actorId: input.actorId,
    isAnonymous: input.isAnonymous,
    isSiteAdmin: input.isSiteAdmin,
    loginId: input.loginId,
    name: input.name,
  };
}

export function toDomainActor(principal: Pick<ResolvedRequestPrincipal, "user">): DomainActor {
  return createDomainActor({
    actorId: principal.user?.id ?? null,
    isAnonymous: !principal.user,
    isSiteAdmin: Boolean(principal.user?.isSiteAdmin),
    loginId: principal.user?.loginId ?? null,
    name: principal.user?.name ?? null,
  });
}

export function createBasicAuthChallengeResponse(message = "Unauthorized"): Response {
  return new Response(message, {
    headers: {
      "WWW-Authenticate": 'Basic realm="Yona"',
    },
    status: 401,
  });
}

export function createRateLimitedTextResponse(retryAfterSeconds: number): Response {
  return new Response("Too many requests. Try again later.", {
    headers: {
      "Retry-After": String(retryAfterSeconds),
    },
    status: 429,
  });
}
