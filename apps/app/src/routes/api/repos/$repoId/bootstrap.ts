import { createFileRoute } from "@tanstack/react-router";
import { createRepoCaller } from "@app/lib/repo-trpc";
import { createJsonErrorResponse, createRateLimitedJsonResponse } from "@app/lib/repo-http";
import { resolveServerRequestPrincipal } from "@app/lib/server-request-auth";

export const Route = createFileRoute("/api/repos/$repoId/bootstrap")({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        const principal = await resolveServerRequestPrincipal(request);
        if (principal.isRateLimited) {
          return createRateLimitedJsonResponse(principal.retryAfterSeconds ?? 60);
        }

        if (principal.hasInvalidCredentials) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        try {
          const result = await createRepoCaller({
            principal,
            requestId: request.headers.get("x-request-id") ?? undefined,
          }).bootstrapRepository({
            repoId: params.repoId,
          });
          return Response.json(result, {
            status: result.created ? 201 : 200,
          });
        } catch (error) {
          return createJsonErrorResponse(error, "Failed to provision repository.");
        }
      },
    },
  },
});
