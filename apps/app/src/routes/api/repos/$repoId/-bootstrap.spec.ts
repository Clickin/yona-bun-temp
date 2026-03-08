import { beforeEach, describe, expect, it, vi } from "vitest";

const { createRepoCallerMock, resolveServerRequestPrincipalMock } = vi.hoisted(() => ({
  createRepoCallerMock: vi.fn(),
  resolveServerRequestPrincipalMock: vi.fn(),
}));

vi.mock("@app/lib/repo-trpc", () => ({
  createRepoCaller: createRepoCallerMock,
}));

vi.mock("@app/lib/server-request-auth", () => ({
  resolveServerRequestPrincipal: resolveServerRequestPrincipalMock,
}));

import { Route } from "./bootstrap";

function getHandlers() {
  return Route.options.server!.handlers as {
    POST: (input: { params: { repoId: string }; request: Request }) => Promise<Response>;
  };
}

describe("/api/repos/$repoId/bootstrap route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 201 when bootstrap provisions a new repository", async () => {
    resolveServerRequestPrincipalMock.mockResolvedValueOnce({
      authMethod: "session",
      hasInvalidCredentials: false,
      ipAddress: "127.0.0.1",
      isAuthenticated: true,
      isRateLimited: false,
      retryAfterSeconds: null,
      session: null,
      shouldClearSessionCookie: false,
      user: {
        emailAddress: "door@example.com",
        id: 7,
        isConfirmed: true,
        isSiteAdmin: false,
        loginId: "door",
        name: "Door TTS",
      },
    });
    createRepoCallerMock.mockReturnValueOnce({
      bootstrapRepository: vi.fn(async () => ({
        created: true,
        repositoryId: "1001",
        repositoryPath: "/repo-root/1001.git",
      })),
    });

    const response = await getHandlers().POST({
      params: { repoId: "1001" },
      request: new Request("http://localhost/api/repos/1001/bootstrap", {
        method: "POST",
      }),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      created: true,
      repositoryId: "1001",
      repositoryPath: "/repo-root/1001.git",
    });
  });

  it("returns 200 when bootstrap is an idempotent no-op", async () => {
    resolveServerRequestPrincipalMock.mockResolvedValueOnce({
      authMethod: "session",
      hasInvalidCredentials: false,
      ipAddress: "127.0.0.1",
      isAuthenticated: true,
      isRateLimited: false,
      retryAfterSeconds: null,
      session: null,
      shouldClearSessionCookie: false,
      user: {
        emailAddress: "door@example.com",
        id: 7,
        isConfirmed: true,
        isSiteAdmin: false,
        loginId: "door",
        name: "Door TTS",
      },
    });
    createRepoCallerMock.mockReturnValueOnce({
      bootstrapRepository: vi.fn(async () => ({
        created: false,
        repositoryId: "1001",
        repositoryPath: "/repo-root/1001.git",
      })),
    });

    const response = await getHandlers().POST({
      params: { repoId: "1001" },
      request: new Request("http://localhost/api/repos/1001/bootstrap", {
        method: "POST",
      }),
    });

    expect(response.status).toBe(200);
  });
});
