import { join } from "node:path";
import { createFileRoute } from "@tanstack/react-router";
import { resolveServerRequestPrincipal } from "@app/lib/server-request-auth";
import { persistUploadStream } from "@app/lib/upload-blob";
import { createUploadSession } from "@yona/domain";
import { getYonaDataRoot } from "@yona/vcs";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function toDomainActor(principal: Awaited<ReturnType<typeof resolveServerRequestPrincipal>>) {
  return {
    actorId: principal.user?.id ?? null,
    isAnonymous: !principal.user,
    isSiteAdmin: Boolean(principal.user?.isSiteAdmin),
    loginId: principal.user?.loginId ?? null,
  };
}

function sanitizeUploadFileName(fileName: string): string {
  const sanitized = Array.from(fileName)
    .filter((char) => char !== "\u0000" && char !== "\r" && char !== "\n")
    .join("")
    .replace(/[\\/]/g, "_")
    .replace(/\.\./g, "_")
    .trim();

  return sanitized.length > 0 ? sanitized.slice(0, 255) : "upload";
}

function getSanitizedUploadFileName(request: Request): null | string {
  const value = request.headers.get("x-upload-filename")?.trim();
  if (!value) {
    return null;
  }

  return sanitizeUploadFileName(value);
}

function isMultipartRequest(request: Request): boolean {
  return (
    request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data") ?? false
  );
}

function isOversizedRequest(request: Request): boolean {
  const contentLength = request.headers.get("content-length");
  if (!contentLength) {
    return false;
  }

  const parsedLength = Number.parseInt(contentLength, 10);
  return Number.isFinite(parsedLength) && parsedLength > MAX_UPLOAD_BYTES;
}

function createUploadErrorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : "Upload request failed.";
  const status =
    message === "Authentication required."
      ? 401
      : message === "File too large."
        ? 413
        : message === "Raw upload body is required."
          ? 400
          : message === "Upload filename header is required."
            ? 400
            : message === "multipart/form-data is not supported on this endpoint."
              ? 415
              : message.includes("required") || message.includes("invalid")
                ? 400
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

export const Route = createFileRoute("/api/uploads")({
  server: {
    handlers: {
      POST: async ({ request }) => {
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
          if (isMultipartRequest(request)) {
            throw new Error("multipart/form-data is not supported on this endpoint.");
          }

          if (isOversizedRequest(request)) {
            throw new Error("File too large.");
          }

          const fileName = getSanitizedUploadFileName(request);
          if (!fileName) {
            throw new Error("Upload filename header is required.");
          }

          if (!request.body) {
            throw new Error("Raw upload body is required.");
          }

          const mimeType = request.headers.get("content-type")?.trim() || null;
          const uploadRoot = join(getYonaDataRoot(), "uploads");
          const { hash, size } = await persistUploadStream({
            maxBytes: MAX_UPLOAD_BYTES,
            stream: request.body,
            uploadRoot,
          });

          const upload = await createUploadSession(toDomainActor(principal), {
            fileName,
            hash,
            mimeType,
            size,
          });

          return Response.json(upload, { status: 201 });
        } catch (error) {
          return createUploadErrorResponse(error);
        }
      },
    },
  },
});
