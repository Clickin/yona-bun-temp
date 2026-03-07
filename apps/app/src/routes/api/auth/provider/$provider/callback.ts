import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/provider/$provider/callback")({
  server: {
    handlers: {
      GET: async ({ params }) => {
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

        return Response.json(
          {
            error:
              "OAuth callback contract is reserved in apps/app, but provider exchange is still pending migration.",
            provider: params.provider,
          },
          {
            status: 501,
          },
        );
      },
    },
  },
});
