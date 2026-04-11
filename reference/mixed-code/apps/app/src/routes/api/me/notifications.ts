import { createFileRoute } from "@tanstack/react-router";

function createMeApiErrorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : "Me API route failed.";
  const status = message === "Authentication required." ? 401 : 500;

  return Response.json(
    {
      error: message,
    },
    {
      status,
    },
  );
}

export const Route = createFileRoute("/api/me/notifications")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { createServerMeCaller } = await import("@app/lib/me-trpc.server");
          return Response.json(await createServerMeCaller().readMyNotifications());
        } catch (error) {
          return createMeApiErrorResponse(error);
        }
      },
    },
  },
});
