import { describe, expect, it, vi } from "vitest";
import { readSessionBootstrap } from "./auth-workspace-client";
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
