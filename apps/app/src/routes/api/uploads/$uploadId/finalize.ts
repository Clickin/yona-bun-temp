import { createFileRoute } from "@tanstack/react-router";
import { resolveServerRequestPrincipal } from "@app/lib/server-request-auth";
import { validateCsrfToken } from "@yona/auth";
import { finalizeUploadSessionInputSchema } from "@yona/contracts";
import { finalizeUploadSession } from "@yona/domain";

function toDomainActor(principal: Awaited<ReturnType<typeof resolveServerRequestPrincipal>>) {
  return {
    actorId: principal.user?.id ?? null,
    isAnonymous: !principal.user,
    isSiteAdmin: Boolean(principal.user?.isSiteAdmin),
    loginId: principal.user?.loginId ?? null,
  };
}

function createFinalizeErrorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : "Finalize request failed.";
  const status =
    message === "Authentication required."
      ? 401
      : message === "CSRF validation failed."
        ? 403
        : message.toLowerCase().includes("not found")
          ? 404
          : message.toLowerCase().includes("permission")
            ? 403
            : 400;

  return Response.json(
    {
      error: message,
    },
    {
      status,
    },
  );
}

export const Route = createFileRoute("/api/uploads/$uploadId/finalize")({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        const principal = await resolveServerRequestPrincipal(request);
        if (principal.isRateLimited) {
          return Response.json(
            {
              error: "Too many requests. Try again later.",
            },
            {
              headers: {
                "Retry-After": String(principal.retryAfterSeconds ?? 60),
              },
              status: 429,
            },
          );
        }

        if (principal.hasInvalidCredentials) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        try {
          if (principal.session) {
            const csrfToken = request.headers.get("x-csrf-token")?.trim() ?? "";
            if (!validateCsrfToken(csrfToken, principal.session)) {
              throw new Error("CSRF validation failed.");
            }
          }

          const payload = await request.json();
          const parsedInput = finalizeUploadSessionInputSchema.parse({
            ...(typeof payload === "object" && payload !== null ? payload : {}),
            uploadId: params.uploadId,
          });

          const finalized = await finalizeUploadSession(toDomainActor(principal), parsedInput);
          return Response.json(finalized, { status: 200 });
        } catch (error) {
          return createFinalizeErrorResponse(error);
        }
      },
    },
  },
});
