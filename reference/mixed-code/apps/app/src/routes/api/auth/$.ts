import { createFileRoute } from "@tanstack/react-router";
import { handleBetterAuthPublicRequest } from "@yona/auth";

async function handleAuthRequest(request: Request): Promise<Response> {
  return handleBetterAuthPublicRequest(request);
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => handleAuthRequest(request),
      POST: async ({ request }) => handleAuthRequest(request),
    },
  },
});
