import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/session")({
  server: {
    handlers: {
      GET: async () => {
        const { readSessionRoutePayloadServer } = await import("@app/lib/auth-trpc.server");
        return Response.json(await readSessionRoutePayloadServer());
      },
    },
  },
});
