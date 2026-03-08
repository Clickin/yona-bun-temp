import { beforeEach, describe, expect, it, vi } from "vitest";

const readSessionRoutePayloadMock = vi.fn();

vi.mock("@app/lib/auth-trpc.server", () => ({
  readSessionRoutePayloadServer: readSessionRoutePayloadMock,
}));

import { Route } from "./session";

function getSessionHandler() {
  return Route.options.server!.handlers as {
    GET: () => Promise<Response>;
  };
}

describe("/api/auth/session route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the typed session payload from the canonical auth route reader", async () => {
    // Legacy provenance:
    // - yona-original/test/controllers/UserAppTest.java:currentUserSession
    readSessionRoutePayloadMock.mockResolvedValueOnce({
      session: {
        csrfToken: "csrf-token",
        expiresAt: "2030-01-01T00:00:00.000Z",
        projection: {
          actorId: 7,
          emailAddress: "door@example.com",
          isAnonymous: false,
          isConfirmed: true,
          isSiteAdmin: false,
          loginId: "door",
          userLabel: "Door TTS",
        },
        userId: 7,
      },
      user: {
        emailAddress: "door@example.com",
        id: 7,
        isConfirmed: true,
        isSiteAdmin: false,
        loginId: "door",
        name: "Door TTS",
      },
    });

    const response = await getSessionHandler().GET();

    expect(await response.json()).toEqual({
      session: {
        csrfToken: "csrf-token",
        expiresAt: "2030-01-01T00:00:00.000Z",
        projection: {
          actorId: 7,
          emailAddress: "door@example.com",
          isAnonymous: false,
          isConfirmed: true,
          isSiteAdmin: false,
          loginId: "door",
          userLabel: "Door TTS",
        },
        userId: 7,
      },
      user: {
        emailAddress: "door@example.com",
        id: 7,
        isConfirmed: true,
        isSiteAdmin: false,
        loginId: "door",
        name: "Door TTS",
      },
    });
  });

  it("returns null session payloads for anonymous callers", async () => {
    // Legacy provenance:
    // - yona-original/test/controllers/UserAppTest.java:currentUserAnonymous
    readSessionRoutePayloadMock.mockResolvedValueOnce({
      session: null,
      user: null,
    });

    const response = await getSessionHandler().GET();

    expect(await response.json()).toEqual({
      session: null,
      user: null,
    });
  });
});
