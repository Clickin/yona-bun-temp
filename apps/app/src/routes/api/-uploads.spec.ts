import { beforeEach, describe, expect, it, vi } from "vitest";

const { createUploadSessionMock, persistUploadStreamMock, resolveServerRequestPrincipalMock } =
  vi.hoisted(() => ({
    createUploadSessionMock: vi.fn(),
    persistUploadStreamMock: vi.fn(),
    resolveServerRequestPrincipalMock: vi.fn(),
  }));

vi.mock("@app/lib/upload-blob", () => ({
  persistUploadStream: persistUploadStreamMock,
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
    createUploadSession: createUploadSessionMock,
  };
});

import { Route } from "./uploads";

function getHandlers() {
  return Route.options.server!.handlers as unknown as {
    POST: (ctx: { request: Request }) => Promise<Response>;
  };
}

describe("POST /api/uploads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    persistUploadStreamMock.mockResolvedValue({ hash: "hash", size: 4 });
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

  it("creates an upload session from a raw streamed request body", async () => {
    createUploadSessionMock.mockResolvedValue({
      assetId: 1,
      fileName: "avatar.png",
      hash: "hash",
      mimeType: "image/png",
      ownerLoginId: "door",
      size: 4,
      uploadId: "1",
    });

    const response = await getHandlers().POST({
      request: new Request("http://localhost/api/uploads", {
        body: new Uint8Array([1, 2, 3, 4]),
        headers: {
          "Content-Type": "image/png",
          "X-Upload-Filename": "avatar.png",
        },
        method: "POST",
      }),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      uploadId: "1",
    });
    expect(persistUploadStreamMock).toHaveBeenCalledTimes(1);
    expect(createUploadSessionMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        fileName: "avatar.png",
        mimeType: "image/png",
        size: 4,
      }),
    );
  });

  it("sanitizes the filename header before creating the upload session", async () => {
    createUploadSessionMock.mockResolvedValue({
      assetId: 1,
      fileName: "__avatar.png",
      hash: "hash",
      mimeType: "image/png",
      ownerLoginId: "door",
      size: 4,
      uploadId: "1",
    });

    const response = await getHandlers().POST({
      request: new Request("http://localhost/api/uploads", {
        body: new Uint8Array([1, 2, 3, 4]),
        headers: {
          "Content-Type": "image/png",
          "X-Upload-Filename": "../avatar.png",
        },
        method: "POST",
      }),
    });

    expect(response.status).toBe(201);
    expect(createUploadSessionMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        fileName: "__avatar.png",
      }),
    );
  });

  it("rejects multipart requests on the upload endpoint", async () => {
    const form = new FormData();
    form.set("file", new File([new Uint8Array([1, 2, 3, 4])], "avatar.png", { type: "image/png" }));

    const response = await getHandlers().POST({
      request: new Request("http://localhost/api/uploads", {
        body: form,
        method: "POST",
      }),
    });

    expect(response.status).toBe(415);
    await expect(response.json()).resolves.toEqual({
      error: "multipart/form-data is not supported on this endpoint.",
    });
    expect(persistUploadStreamMock).not.toHaveBeenCalled();
  });

  it("rejects requests without a filename header", async () => {
    const response = await getHandlers().POST({
      request: new Request("http://localhost/api/uploads", {
        body: new Uint8Array([1, 2, 3, 4]),
        headers: {
          "Content-Type": "application/octet-stream",
        },
        method: "POST",
      }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Upload filename header is required.",
    });
  });

  it("rejects requests whose declared content length exceeds the hard limit", async () => {
    const response = await getHandlers().POST({
      request: new Request("http://localhost/api/uploads", {
        body: new Uint8Array([1, 2, 3, 4]),
        headers: {
          "Content-Length": String(25 * 1024 * 1024 + 1),
          "Content-Type": "application/octet-stream",
          "X-Upload-Filename": "large.bin",
        },
        method: "POST",
      }),
    });

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({
      error: "File too large.",
    });
    expect(persistUploadStreamMock).not.toHaveBeenCalled();
  });

  it("returns 413 when the streamed body exceeds the hard limit during persistence", async () => {
    persistUploadStreamMock.mockRejectedValueOnce(new Error("File too large."));

    const response = await getHandlers().POST({
      request: new Request("http://localhost/api/uploads", {
        body: new Uint8Array([1, 2, 3, 4]),
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Upload-Filename": "large.bin",
        },
        method: "POST",
      }),
    });

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({
      error: "File too large.",
    });
  });
});
