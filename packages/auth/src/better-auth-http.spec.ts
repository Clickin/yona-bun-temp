import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetAuthRateLimitForTests } from "./rate-limit";

const { authHandlerMock, getBetterAuthMock } = vi.hoisted(() => {
  const handlerMock = vi.fn(async (request: Request) =>
    Response.json({
      forwardedTo: request.url,
    }),
  );

  return {
    authHandlerMock: handlerMock,
    getBetterAuthMock: vi.fn(async () => ({
      handler: handlerMock,
    })),
  };
});

vi.mock("./better-auth", () => ({
  getBetterAuth: getBetterAuthMock,
}));

import {
  handleBetterAuthPublicRequest,
  isSupportedBetterAuthCallbackProvider,
} from "./better-auth-http";

describe("better-auth public HTTP surface", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await resetAuthRateLimitForTests();
  });

  it("forwards supported callback routes to Better Auth", async () => {
    const request = new Request("https://yona.test/api/auth/callback/github?code=oauth-code", {
      headers: {
        "x-forwarded-for": "203.0.113.10",
      },
      method: "GET",
    });

    const response = await handleBetterAuthPublicRequest(request);

    expect(isSupportedBetterAuthCallbackProvider("github")).toBe(true);
    expect(authHandlerMock).toHaveBeenCalledWith(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      forwardedTo: "https://yona.test/api/auth/callback/github?code=oauth-code",
    });
  });

  it("returns 404 for raw Better Auth credential endpoints", async () => {
    const response = await handleBetterAuthPublicRequest(
      new Request("https://yona.test/api/auth/sign-in/email", {
        headers: {
          "x-forwarded-for": "203.0.113.11",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe("Not Found");
    expect(authHandlerMock).not.toHaveBeenCalled();
  });

  it("rate-limits repeated OAuth callback hits", async () => {
    const request = new Request("https://yona.test/api/auth/callback/google?code=oauth-code", {
      headers: {
        "x-forwarded-for": "198.51.100.42",
      },
      method: "GET",
    });

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const response = await handleBetterAuthPublicRequest(request);
      expect(response.status).toBe(200);
    }

    const response = await handleBetterAuthPublicRequest(request);

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(authHandlerMock).toHaveBeenCalledTimes(20);
  });
});
