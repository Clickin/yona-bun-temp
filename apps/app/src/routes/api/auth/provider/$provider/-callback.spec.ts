import { beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@yona/auth/better-auth", () => ({
  getBetterAuth: getBetterAuthMock,
}));

import { Route } from "./callback";

function getCallbackHandler() {
  return (
    Route.options.server!.handlers as {
      GET: (input: { params: { provider: string }; request: Request }) => Promise<Response>;
    }
  ).GET;
}

describe("/api/auth/provider/$provider/callback route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards supported providers to the Better Auth callback route", async () => {
    const response = await getCallbackHandler()({
      params: {
        provider: "github",
      },
      request: new Request("https://yona.test/api/auth/provider/github/callback?code=oauth-code"),
    });

    expect(authHandlerMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      forwardedTo: "https://yona.test/api/auth/callback/github?code=oauth-code",
    });
  });

  it("rejects unsupported providers with 400", async () => {
    const response = await getCallbackHandler()({
      params: {
        provider: "gitlab",
      },
      request: new Request("https://yona.test/api/auth/provider/gitlab/callback"),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Unsupported OAuth provider.",
      provider: "gitlab",
    });
  });
});
