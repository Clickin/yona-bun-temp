import { createFileRoute } from "@tanstack/react-router";

function createTokenRouteErrorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : "Token route failed.";
  const status =
    message === "Authentication required."
      ? 401
      : message === "CSRF validation failed."
        ? 403
        : 500;

  return Response.json(
    {
      error: message,
    },
    {
      status,
    },
  );
}

export const Route = createFileRoute("/api/me/token")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { createServerAuthCaller } = await import("@app/lib/auth-trpc.server");
          return Response.json(await createServerAuthCaller().readCurrentUserApiToken());
        } catch (error) {
          return createTokenRouteErrorResponse(error);
        }
      },
      POST: async () => {
        try {
          const { createServerAuthCaller } = await import("@app/lib/auth-trpc.server");
          return Response.json(await createServerAuthCaller().rotateCurrentUserApiToken());
        } catch (error) {
          return createTokenRouteErrorResponse(error);
        }
      },
    },
  },
});
