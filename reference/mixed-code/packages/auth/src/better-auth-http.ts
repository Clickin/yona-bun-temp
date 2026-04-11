import { getBetterAuth } from "./better-auth";
import { getClientIp } from "./request-validation";
import { consumeAuthRateLimit } from "./rate-limit";

const BETTER_AUTH_BASE_PATH = "/api/auth";
const SUPPORTED_CALLBACK_PROVIDERS = new Set(["github", "google"]);

export type BetterAuthCallbackProvider = "github" | "google";

function getBetterAuthPublicPath(request: Request): null | string {
  const pathname = new URL(request.url).pathname;
  if (!pathname.startsWith(BETTER_AUTH_BASE_PATH)) {
    return null;
  }

  const relativePath = pathname.slice(BETTER_AUTH_BASE_PATH.length);
  return relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
}

function isCallbackPath(pathname: string): pathname is `/callback/${string}` {
  return pathname.startsWith("/callback/");
}

export function isSupportedBetterAuthCallbackProvider(
  provider: string,
): provider is BetterAuthCallbackProvider {
  return SUPPORTED_CALLBACK_PROVIDERS.has(provider);
}

function createRateLimitedResponse(retryAfterSeconds: number): Response {
  return new Response("Too Many Requests", {
    headers: {
      "Retry-After": String(retryAfterSeconds),
    },
    status: 429,
  });
}

export async function handleBetterAuthPublicRequest(
  request: Request,
  fallbackIp?: string,
): Promise<Response> {
  const publicPath = getBetterAuthPublicPath(request);
  if (!publicPath || !isCallbackPath(publicPath)) {
    return new Response("Not Found", { status: 404 });
  }

  const provider = publicPath.slice("/callback/".length);
  if (!isSupportedBetterAuthCallbackProvider(provider)) {
    return new Response("Not Found", { status: 404 });
  }

  const rateLimitDecision = await consumeAuthRateLimit({
    ip: getClientIp(request, fallbackIp),
    route: "oauth-callback",
  });
  if (!rateLimitDecision.ok) {
    return createRateLimitedResponse(rateLimitDecision.retryAfterSeconds);
  }

  const auth = await getBetterAuth();
  return auth.handler(request);
}
