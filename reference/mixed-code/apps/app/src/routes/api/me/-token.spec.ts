import { beforeEach, describe, expect, it, vi } from "vitest";

const { createServerAuthCallerMock } = vi.hoisted(() => ({
  createServerAuthCallerMock: vi.fn(),
}));

vi.mock("@app/lib/auth-trpc.server", () => ({
  createServerAuthCaller: createServerAuthCallerMock,
}));

import { Route } from "./token";

function getHandlers() {
  return Route.options.server!.handlers as {
    GET: () => Promise<Response>;
    POST: () => Promise<Response>;
  };
}

describe("/api/me/token route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads the current user's token through the canonical auth caller", async () => {
    createServerAuthCallerMock.mockReturnValueOnce({
      readCurrentUserApiToken: vi.fn(async () => ({
        token: "current-user-token",
      })),
    });

    const response = await getHandlers().GET();

    expect(await response.json()).toEqual({
      token: "current-user-token",
    });
  });

  it("returns 401 when the current user is anonymous", async () => {
    createServerAuthCallerMock.mockReturnValueOnce({
      readCurrentUserApiToken: vi.fn(async () => {
        throw new Error("Authentication required.");
      }),
    });

    const response = await getHandlers().GET();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "Authentication required.",
    });
  });

  it("rotates the current user's token through the canonical auth caller", async () => {
    createServerAuthCallerMock.mockReturnValueOnce({
      rotateCurrentUserApiToken: vi.fn(async () => ({
        token: "rotated-user-token",
      })),
    });

    const response = await getHandlers().POST();

    expect(await response.json()).toEqual({
      token: "rotated-user-token",
    });
  });

  it("returns 403 when token rotation fails CSRF validation", async () => {
    createServerAuthCallerMock.mockReturnValueOnce({
      rotateCurrentUserApiToken: vi.fn(async () => {
        throw new Error("CSRF validation failed.");
      }),
    });

    const response = await getHandlers().POST();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "CSRF validation failed.",
    });
  });
});
