import { TRPCError } from "@trpc/server";

export function createRateLimitedJsonResponse(retryAfterSeconds: number): Response {
  return Response.json(
    {
      error: "Too many requests. Try again later.",
    },
    {
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
      status: 429,
    },
  );
}

export function createJsonErrorResponse(error: unknown, fallbackMessage: string): Response {
  if (error instanceof TRPCError) {
    const status =
      error.code === "BAD_REQUEST"
        ? 400
        : error.code === "UNAUTHORIZED"
          ? 401
          : error.code === "FORBIDDEN"
            ? 403
            : error.code === "NOT_FOUND"
              ? 404
              : error.code === "CONFLICT"
                ? 409
                : 500;

    return Response.json(
      {
        error: error.message || fallbackMessage,
      },
      {
        status,
      },
    );
  }

  const message = error instanceof Error ? error.message : fallbackMessage;
  if (
    message.includes("Invalid repository id") ||
    message.includes("Invalid file path") ||
    message.includes("Repository path escapes root")
  ) {
    return Response.json({ error: message }, { status: 400 });
  }

  if (message.includes("ENOENT") || message.includes("not found")) {
    return Response.json({ error: message }, { status: 404 });
  }

  return Response.json({ error: message }, { status: 500 });
}
