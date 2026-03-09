import { createFileRoute } from "@tanstack/react-router";

async function handleAuthRequest(request: Request): Promise<Response> {
  const { getBetterAuth } = await import("@yona/auth/better-auth");
  const auth = await getBetterAuth();
  return auth.handler(request);
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => handleAuthRequest(request),
      POST: async ({ request }) => handleAuthRequest(request),
    },
  },
});
