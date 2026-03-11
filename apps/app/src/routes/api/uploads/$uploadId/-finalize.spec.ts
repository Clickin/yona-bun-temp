import { beforeEach, describe, expect, it, vi } from "vitest";

const { finalizeUploadSessionMock, resolveServerRequestPrincipalMock } = vi.hoisted(() => ({
  finalizeUploadSessionMock: vi.fn(),
  resolveServerRequestPrincipalMock: vi.fn(),
}));

vi.mock("@app/lib/server-request-auth", async () => {
  const actual = await vi.importActual<typeof import("@app/lib/server-request-auth")>(
    "@app/lib/server-request-auth",
  );
  return {
    ...actual,
    resolveServerRequestPrincipal: resolveServerRequestPrincipalMock,
  };
});

vi.mock("@yona/domain", async () => {
  const actual = await vi.importActual<typeof import("@yona/domain")>("@yona/domain");
  return {
    ...actual,
    finalizeUploadSession: finalizeUploadSessionMock,
  };
});

import { Route } from "./finalize";

function getHandlers() {
  return Route.options.server!.handlers as unknown as {
    POST: (ctx: { params: { uploadId: string }; request: Request }) => Promise<Response>;
  };
}

describe("POST /api/uploads/$uploadId/finalize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveServerRequestPrincipalMock.mockResolvedValue({
      hasInvalidCredentials: false,
      isRateLimited: false,
      retryAfterSeconds: null,
      session: null,
      user: {
        id: 1,
        isSiteAdmin: false,
        loginId: "door",
      },
    });
  });

  it("finalizes temporary upload binding", async () => {
    finalizeUploadSessionMock.mockResolvedValue({
      assetId: 1,
      containerId: 1,
      containerType: "user_avatar",
      uploadId: "1",
    });

    const response = await getHandlers().POST({
      params: { uploadId: "1" },
      request: new Request("http://localhost/api/uploads/1/finalize", {
        body: JSON.stringify({
          resourceId: 1,
          resourceType: "user_avatar",
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      containerType: "user_avatar",
      uploadId: "1",
    });
  });

  it("returns 403 when a session-backed finalize request fails csrf validation", async () => {
    resolveServerRequestPrincipalMock.mockResolvedValueOnce({
      hasInvalidCredentials: false,
      isRateLimited: false,
      retryAfterSeconds: null,
      session: {
        csrfToken: "expected-csrf-token",
        expiresAt: new Date("2026-03-11T00:00:00.000Z"),
        userId: 1,
      },
      user: {
        id: 1,
        isSiteAdmin: false,
        loginId: "door",
      },
    });

    const response = await getHandlers().POST({
      params: { uploadId: "1" },
      request: new Request("http://localhost/api/uploads/1/finalize", {
        body: JSON.stringify({
          resourceId: 1,
          resourceType: "user_avatar",
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "CSRF validation failed.",
    });
    expect(finalizeUploadSessionMock).not.toHaveBeenCalled();
  });
});
