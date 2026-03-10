import { createFileRoute } from "@tanstack/react-router";
import { handleBetterAuthPublicRequest, isSupportedBetterAuthCallbackProvider } from "@yona/auth";

export const Route = createFileRoute("/api/auth/provider/$provider/callback")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        if (!isSupportedBetterAuthCallbackProvider(params.provider)) {
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

        const url = new URL(request.url);
        url.pathname = `/api/auth/callback/${params.provider}`;

        return handleBetterAuthPublicRequest(
          new Request(url, {
            body: request.body ?? null,
            duplex: request.body ? ("half" as RequestDuplex) : undefined,
            headers: request.headers,
            method: request.method,
          }),
        );
      },
    },
  },
});
