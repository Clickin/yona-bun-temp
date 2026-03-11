import { createFileRoute } from "@tanstack/react-router";
import { resolveServerRequestPrincipal, toDomainActor } from "@app/lib/server-request-auth";
import { validateCsrfToken } from "@yona/auth";
import { finalizeUploadSessionInputSchema } from "@yona/contracts";
import {
  DomainConflictError,
  DomainNotFoundError,
  DomainPermissionError,
  DomainValidationError,
  finalizeUploadSession,
} from "@yona/domain";
import { ZodError } from "zod";

function createFinalizeErrorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : "Finalize request failed.";

  if (error instanceof DomainPermissionError) {
    return Response.json({ error: message }, { status: error.requiresAuthentication ? 401 : 403 });
  }

  if (error instanceof DomainConflictError) {
    return Response.json({ error: message }, { status: 409 });
  }

  if (error instanceof DomainNotFoundError) {
    return Response.json({ error: message }, { status: 404 });
  }

  if (
    error instanceof DomainValidationError ||
    error instanceof SyntaxError ||
    error instanceof ZodError
  ) {
    return Response.json({ error: "Invalid request payload." }, { status: 400 });
  }

  if (message === "Authentication required.") {
    return Response.json({ error: message }, { status: 401 });
  }

  if (message === "CSRF validation failed.") {
    return Response.json({ error: message }, { status: 403 });
  }

  return Response.json({ error: "Finalize request failed." }, { status: 500 });
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
