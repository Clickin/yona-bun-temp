import { createFileRoute } from "@tanstack/react-router";
import { inlineEditRepositoryInputSchema } from "@yona/contracts";
import { createRepoCaller } from "@app/lib/repo-trpc";
import { createJsonErrorResponse, createRateLimitedJsonResponse } from "@app/lib/repo-http";
import { resolveServerRequestPrincipal } from "@app/lib/server-request-auth";

export const Route = createFileRoute("/api/repos/$repoId/inline-edit")({
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

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const parsedBody = inlineEditRepositoryInputSchema.safeParse({
          ...(typeof body === "object" && body !== null ? body : {}),
          repoId: params.repoId,
        });
        if (!parsedBody.success) {
          return Response.json(
            {
              error: parsedBody.error.flatten(),
            },
            { status: 400 },
          );
        }

        try {
          return Response.json(
            await createRepoCaller({
              principal,
              requestId: request.headers.get("x-request-id") ?? undefined,
            }).inlineEditRepository(parsedBody.data),
          );
        } catch (error) {
          return createJsonErrorResponse(error, "Failed to perform inline edit.");
        }
      },
    },
  },
});
