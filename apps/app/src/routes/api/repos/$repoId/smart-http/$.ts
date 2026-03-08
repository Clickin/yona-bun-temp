import { createFileRoute } from "@tanstack/react-router";
import { TRPCError } from "@trpc/server";
import { handleSmartHttpRequest, requiresReceivePackAuth } from "@yona/vcs";
import { authorizeRepositoryRequest } from "@app/lib/repo-trpc";
import {
  createBasicAuthChallengeResponse,
  createRateLimitedTextResponse,
  resolveServerRequestPrincipal,
} from "@app/lib/server-request-auth";

function getPathInfo(repoId: string, gitPath: string): string {
  const cleanedPath = gitPath.replace(/^\/+/, "");
  return `/${repoId}/${cleanedPath}`;
}

export const Route = createFileRoute("/api/repos/$repoId/smart-http/$")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const gitPath = (params as { _splat?: string })._splat;
        if (!gitPath) {
          return new Response("Not Found", { status: 404 });
        }

        const principal = await resolveServerRequestPrincipal(request);
        if (principal.isRateLimited) {
          return createRateLimitedTextResponse(principal.retryAfterSeconds ?? 60);
        }

        if (principal.hasInvalidCredentials) {
          return createBasicAuthChallengeResponse();
        }

        const permission = requiresReceivePackAuth(request, getPathInfo(params.repoId, gitPath))
          ? "write"
          : "read";

        try {
          await authorizeRepositoryRequest(principal, params.repoId, permission);
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
          pathInfo: getPathInfo(params.repoId, gitPath),
          repositoryId: params.repoId,
          request,
        });
      },
      POST: async ({ params, request }) => {
        const gitPath = (params as { _splat?: string })._splat;
        if (!gitPath) {
          return new Response("Not Found", { status: 404 });
        }

        const principal = await resolveServerRequestPrincipal(request);
        if (principal.isRateLimited) {
          return createRateLimitedTextResponse(principal.retryAfterSeconds ?? 60);
        }

        if (principal.hasInvalidCredentials) {
          return createBasicAuthChallengeResponse();
        }

        const permission = requiresReceivePackAuth(request, getPathInfo(params.repoId, gitPath))
          ? "write"
          : "read";

        try {
          await authorizeRepositoryRequest(principal, params.repoId, permission);
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
          pathInfo: getPathInfo(params.repoId, gitPath),
          repositoryId: params.repoId,
          request,
        });
      },
    },
  },
});
