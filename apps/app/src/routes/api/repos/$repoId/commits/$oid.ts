import { createFileRoute } from "@tanstack/react-router";
import { createRepoCaller } from "@app/lib/repo-trpc";
import { createJsonErrorResponse, createRateLimitedJsonResponse } from "@app/lib/repo-http";
import { resolveServerRequestPrincipal } from "@app/lib/server-request-auth";

export const Route = createFileRoute("/api/repos/$repoId/commits/$oid")({
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

        try {
          return Response.json(
            await createRepoCaller({
              principal,
              requestId: request.headers.get("x-request-id") ?? undefined,
            }).readRepositoryCommitDetail({
              oid: params.oid,
              repoId: params.repoId,
            }),
          );
        } catch (error) {
          return createJsonErrorResponse(error, "Failed to read commit detail.");
        }
      },
    },
  },
});
