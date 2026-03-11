import { createFileRoute } from "@tanstack/react-router";
import { authorizeProjectAccess } from "@yona/domain";
import { readProjectAuthorization } from "@yona/db";
import { resolveServerRequestPrincipal } from "@app/lib/server-request-auth";

export const Route = createFileRoute("/api/projects/$owner/$projectName/repo-id")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const principal = await resolveServerRequestPrincipal(request);
        if (principal.isRateLimited) {
          return Response.json(
            {
              error: "Too many requests",
              retryAfter: principal.retryAfterSeconds ?? 60,
            },
            {
              headers: {
                "retry-after": String(principal.retryAfterSeconds ?? 60),
              },
              status: 429,
            },
          );
        }

        if (principal.hasInvalidCredentials) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const authorization = await readProjectAuthorization(
          params.owner,
          params.projectName,
          principal.user?.id ?? null,
        );
        if (!authorization) {
          return Response.json({ error: "Project not found" }, { status: 404 });
        }

        const decision = authorizeProjectAccess(
          {
            ...authorization.viewer,
            projectScope: authorization.project.projectScope,
          },
          "read",
        );
        if (!decision.allowed) {
          return Response.json(
            { error: principal.isAuthenticated ? "Forbidden" : "Unauthorized" },
            { status: principal.isAuthenticated ? 403 : 401 },
          );
        }

        return Response.json({
          repoId: String(authorization.project.id),
        });
      },
    },
  },
});
