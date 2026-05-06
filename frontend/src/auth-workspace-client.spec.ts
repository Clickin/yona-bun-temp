import { describe, expect, it, vi } from "vitest";
import { readCurrentSession, readSessionBootstrap, uploadProfileAvatar } from "./auth-workspace-client";
import type { RuntimeConfig } from "./runtime-config";

const runtimeConfig: RuntimeConfig = {
  apiBaseUrl: "/yona/api",
  basePath: "/yona",
  rpcBaseUrl: "/yona/rpc",
};

describe("readSessionBootstrap", () => {
  it("calls the bootstrap route with credentials and reads csrf from the header", async () => {
    const fetchMock = vi.fn(async () => ({
      headers: new Headers({
        "x-csrf-token": "csrf-123",
      }),
      json: async () => ({
        session: null,
        user: null,
      }),
      ok: true,
      status: 200,
    }));

    const result = await readSessionBootstrap(runtimeConfig, fetchMock as unknown as typeof fetch);

    expect(fetchMock).toHaveBeenCalledWith("/yona/api/auth/session", {
      credentials: "include",
      method: "GET",
    });
    expect(result.csrfToken).toBe("csrf-123");
  });
});

describe("readCurrentSession", () => {
  it("reads the REST v1 session endpoint with same-origin credentials", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          defaultLandingPath: "/me",
          isAnonymous: true,
        }),
    }));

    const result = await readCurrentSession(runtimeConfig, fetchMock as unknown as typeof fetch);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      { credentials: string; headers: Headers; method: string },
    ];
    expect(requestUrl).toBe("/yona/api/v1/session");
    expect(requestInit.credentials).toBe("same-origin");
    expect(requestInit.headers.get("Accept")).toBe("application/json");
    expect(requestInit.method).toBe("GET");
    expect(result.isAnonymous).toBe(true);
    expect(result.defaultLandingPath).toBe("/me");
  });

  it("throws the REST error envelope for failed v1 requests", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 404,
      text: async () =>
        JSON.stringify({
          error: {
            code: "not_found",
            message: "REST endpoint not found.",
            status: 404,
          },
        }),
    }));

    await expect(
      readCurrentSession(runtimeConfig, fetchMock as unknown as typeof fetch),
    ).rejects.toMatchObject({
      code: "not_found",
      message: "REST endpoint not found.",
      status: 404,
    });
  });
});

describe("uploadProfileAvatar", () => {
  it("posts the cropped avatar blob to /files and returns the attachment id", async () => {
    const fetchMock = vi.fn(async () => ({
      json: async () => ({
        attachmentId: "avatar-attachment-1",
      }),
      ok: true,
      status: 200,
    }));
    const blob = new Blob(["avatar-bytes"], { type: "image/png" });

    const attachmentId = await uploadProfileAvatar(
      runtimeConfig,
      "avatar.png",
      blob,
      fetchMock as unknown as typeof fetch,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      { body: FormData; credentials: string; method: string },
    ];
    expect(requestUrl).toBe("/yona/files");
    expect(requestInit.credentials).toBe("include");
    expect(requestInit.method).toBe("POST");
    expect(requestInit.body).toBeInstanceOf(FormData);
    expect(attachmentId).toBe("avatar-attachment-1");
  });
});
