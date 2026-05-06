import { describe, expect, it, vi } from "vitest";
import {
  readAuthUiCapabilities,
  readCurrentSession,
  readSessionBootstrap,
  registerWithPassword,
  signInWithPassword,
  signOut,
  uploadProfileAvatar,
  verifyUser,
} from "./auth-workspace-client";
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

describe("REST auth wrappers", () => {
  it("reads auth capabilities from the v1 REST endpoint", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          emailVerificationEnabled: true,
          signupRequireConfirm: false,
          socialLoginOnly: false,
        }),
    }));

    const result = await readAuthUiCapabilities(runtimeConfig, fetchMock as unknown as typeof fetch);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      { credentials: string; headers: Headers; method: string },
    ];
    expect(requestUrl).toBe("/yona/api/v1/auth/capabilities");
    expect(requestInit.credentials).toBe("same-origin");
    expect(requestInit.method).toBe("GET");
    expect(result.emailVerificationEnabled).toBe(true);
  });

  it("posts sign-in payloads with csrf headers to the v1 REST endpoint", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ isAnonymous: false, loginId: "door" }),
    }));

    const result = await signInWithPassword(
      runtimeConfig,
      "csrf-123",
      {
        identifier: "door",
        password: "doorpass1",
        rememberMe: true,
      },
      fetchMock as unknown as typeof fetch,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      { body: string; credentials: string; headers: Headers; method: string },
    ];
    expect(requestUrl).toBe("/yona/api/v1/auth/sign-in");
    expect(requestInit.credentials).toBe("same-origin");
    expect(requestInit.headers.get("x-csrf-token")).toBe("csrf-123");
    expect(requestInit.headers.get("Content-Type")).toBe("application/json");
    expect(requestInit.method).toBe("POST");
    expect(JSON.parse(requestInit.body)).toEqual({
      identifier: "door",
      password: "doorpass1",
      rememberMe: true,
    });
    expect(result.loginId).toBe("door");
  });

  it("posts register and verify payloads to the v1 REST auth routes", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(async () => ({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ isAnonymous: true }),
      }))
      .mockImplementationOnce(async () => ({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ loginId: "door" }),
      }));

    await registerWithPassword(
      runtimeConfig,
      "csrf-456",
      {
        emailAddress: "door@example.com",
        loginId: "door",
        name: "Door",
        password: "doorpass1",
        retypedPassword: "doorpass1",
      },
      fetchMock as unknown as typeof fetch,
    );
    await verifyUser(
      runtimeConfig,
      {
        loginId: "door",
        verificationCode: "signup:token",
      },
      fetchMock as unknown as typeof fetch,
    );

    const [registerUrl, registerInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      { body: string; headers: Headers; method: string },
    ];
    expect(registerUrl).toBe("/yona/api/v1/auth/register");
    expect(registerInit.headers.get("x-csrf-token")).toBe("csrf-456");
    expect(registerInit.method).toBe("POST");

    const [verifyUrl, verifyInit] = fetchMock.mock.calls[1] as unknown as [
      string,
      { body: string; headers: Headers; method: string },
    ];
    expect(verifyUrl).toBe("/yona/api/v1/auth/verify");
    expect(verifyInit.method).toBe("POST");
    expect(JSON.parse(verifyInit.body)).toEqual({
      loginId: "door",
      verificationCode: "signup:token",
    });
  });

  it("posts sign-out to the v1 REST auth route without a JSON body", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ isAnonymous: true }),
    }));

    const result = await signOut(
      runtimeConfig,
      "csrf-789",
      fetchMock as unknown as typeof fetch,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      { body?: string; credentials: string; headers: Headers; method: string },
    ];
    expect(requestUrl).toBe("/yona/api/v1/auth/sign-out");
    expect(requestInit.credentials).toBe("same-origin");
    expect(requestInit.headers.get("x-csrf-token")).toBe("csrf-789");
    expect(requestInit.method).toBe("POST");
    expect(requestInit.body).toBeUndefined();
    expect(result.isAnonymous).toBe(true);
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
