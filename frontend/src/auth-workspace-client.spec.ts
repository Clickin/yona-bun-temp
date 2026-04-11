import { describe, expect, it, vi } from "vitest";
import { readSessionBootstrap, uploadProfileAvatar } from "./auth-workspace-client";
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
