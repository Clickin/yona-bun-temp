import { createFileRoute } from "@tanstack/react-router";
import { createRepoCaller } from "@app/lib/repo-trpc";
import { createJsonErrorResponse, createRateLimitedJsonResponse } from "@app/lib/repo-http";
import { resolveServerRequestPrincipal } from "@app/lib/server-request-auth";

export const Route = createFileRoute("/api/repos/$repoId/commits")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const principal = await resolveServerRequestPrincipal(request);
        if (principal.isRateLimited) {
          return createRateLimitedJsonResponse(principal.retryAfterSeconds ?? 60);
        }

        if (principal.hasInvalidCredentials) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(request.url);
        const branch = url.searchParams.get("branch")?.trim() || "HEAD";
        const limitRaw = Number.parseInt(url.searchParams.get("limit") ?? "20", 10);
        const limit = Number.isFinite(limitRaw) ? limitRaw : 20;

        try {
          return Response.json(
            await createRepoCaller({
              principal,
              requestId: request.headers.get("x-request-id") ?? undefined,
            }).listRepositoryCommits({
              branch,
              limit,
              repoId: params.repoId,
            }),
          );
        } catch (error) {
          return createJsonErrorResponse(error, "Failed to list repository commits.");
        }
      },
    },
  },
});
