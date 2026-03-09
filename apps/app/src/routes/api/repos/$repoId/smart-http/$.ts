import { createFileRoute } from "@tanstack/react-router";
import { TRPCError } from "@trpc/server";
import { loadRepositoryAccessFacts } from "@yona/db";
import { handleSmartHttpRequest, requiresReceivePackAuth } from "@yona/vcs";
import { authorizeRepositoryRequest } from "@app/lib/repo-trpc";
import {
  createBasicAuthChallengeResponse,
  createRateLimitedTextResponse,
  resolveServerRequestPrincipal,
} from "@app/lib/server-request-auth";

const MAX_SMART_HTTP_RPC_BYTES = 100 * 1024 * 1024;

function getPathInfo(repoId: string, gitPath: string): string {
  const cleanedPath = gitPath.replace(/^\/+/, "");
  return `/${repoId}/${cleanedPath}`;
}

function isGetAnyFileRequest(request: Request, pathInfo: string): boolean {
  if (request.method.toUpperCase() !== "GET" || !pathInfo.endsWith("/info/refs")) {
    return false;
  }

  return !new URL(request.url).searchParams.get("service");
}

function isOversizedRpcRequest(request: Request): boolean {
  if (request.method.toUpperCase() !== "POST") {
    return false;
  }

  const contentLength = request.headers.get("content-length");
  if (!contentLength) {
    return false;
  }

  const parsedLength = Number.parseInt(contentLength, 10);
  return Number.isFinite(parsedLength) && parsedLength > MAX_SMART_HTTP_RPC_BYTES;
}

async function handleRouteRequest(input: {
  params: { _splat?: string; repoId: string };
  request: Request;
}): Promise<Response> {
  const gitPath = input.params._splat;
  if (!gitPath) {
    return new Response("Not Found", { status: 404 });
  }

  const pathInfo = getPathInfo(input.params.repoId, gitPath);
  if (isGetAnyFileRequest(input.request, pathInfo)) {
    return new Response("Unsupported service: getanyfile", { status: 403 });
  }

  const principal = await resolveServerRequestPrincipal(input.request);
  if (principal.isRateLimited) {
    return createRateLimitedTextResponse(principal.retryAfterSeconds ?? 60);
  }

  if (principal.hasInvalidCredentials) {
    return createBasicAuthChallengeResponse();
  }

  const permission = requiresReceivePackAuth(input.request, pathInfo) ? "write" : "read";
  const facts = await loadRepositoryAccessFacts(input.params.repoId, principal.user?.id ?? null);
  if (!facts || !facts.isGitRepository) {
    return new Response("Repository not found", { status: 404 });
  }

  if (isOversizedRpcRequest(input.request)) {
    return new Response("Request Entity Too Large", { status: 413 });
  }

  try {
    await authorizeRepositoryRequest(principal, input.params.repoId, permission);
  } catch (error) {
    if (error instanceof TRPCError) {
      if (error.code === "UNAUTHORIZED") {
        return createBasicAuthChallengeResponse();
      }

      if (error.code === "FORBIDDEN") {
        return new Response("Forbidden", { status: 403 });
      }

      if (error.code === "NOT_FOUND") {
        return new Response("Repository not found", { status: 404 });
      }
    }

    return new Response(error instanceof Error ? error.message : "Smart HTTP error", {
      status: 500,
    });
  }

  return handleSmartHttpRequest({
    authorization: {
      allowWrite: permission === "write",
      remoteAddress: principal.ipAddress,
      remoteUserName: principal.user?.loginId ?? principal.user?.name,
    },
    pathInfo,
    repositoryId: input.params.repoId,
    request: input.request,
  });
}

export const Route = createFileRoute("/api/repos/$repoId/smart-http/$")({
  server: {
    handlers: {
      GET: async ({ params, request }) =>
        handleRouteRequest({
          params: params as { _splat?: string; repoId: string },
          request,
        }),
      POST: async ({ params, request }) =>
        handleRouteRequest({
          params: params as { _splat?: string; repoId: string },
          request,
        }),
    },
  },
});
