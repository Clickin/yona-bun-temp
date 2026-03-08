import { getRequestIP } from "@tanstack/react-start/server";
import { getSessionCookieName, resolveRequestPrincipal } from "@yona/auth";

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
    return rawValue.length > 0 ? decodeURIComponent(rawValue) : undefined;
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
