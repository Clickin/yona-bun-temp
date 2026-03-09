import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/provider/$provider/callback")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        if (params.provider !== "github" && params.provider !== "google") {
          return Response.json(
            {
              error: "Unsupported OAuth provider.",
              provider: params.provider,
            },
            {
              status: 400,
            },
          );
        }

        const { getBetterAuth } = await import("@yona/auth/better-auth");
        const auth = await getBetterAuth();
        const url = new URL(request.url);
        url.pathname = `/api/auth/callback/${params.provider}`;

        return auth.handler(
          new Request(url, {
            headers: request.headers,
            method: request.method,
          }),
        );
      },
    },
  },
});
