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

import { Route } from "./files";

function getHandlers() {
  return Route.options.server!.handlers as {
    GET: (input: { params: { repoId: string }; request: Request }) => Promise<Response>;
  };
}

describe("/api/repos/$repoId/files route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid explicit credentials without falling back to anonymous access", async () => {
    resolveServerRequestPrincipalMock.mockResolvedValueOnce({
      authMethod: "anonymous",
      hasInvalidCredentials: true,
      ipAddress: "127.0.0.1",
      isAuthenticated: false,
      isRateLimited: false,
      retryAfterSeconds: null,
      session: null,
      shouldClearSessionCookie: false,
      user: null,
    });

    const response = await getHandlers().GET({
      params: { repoId: "1001" },
      request: new Request("http://localhost/api/repos/1001/files?branch=main&path=README.md"),
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "Unauthorized",
    });
  });

  it("returns 429 when request-auth rate-limits repeated Basic attempts", async () => {
    resolveServerRequestPrincipalMock.mockResolvedValueOnce({
      authMethod: "anonymous",
      hasInvalidCredentials: false,
      ipAddress: "127.0.0.1",
      isAuthenticated: false,
      isRateLimited: true,
      retryAfterSeconds: 60,
      session: null,
      shouldClearSessionCookie: false,
      user: null,
    });

    const response = await getHandlers().GET({
      params: { repoId: "1001" },
      request: new Request("http://localhost/api/repos/1001/files?branch=main&path=README.md"),
    });

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
  });

  it("delegates validated file reads to the canonical repo caller", async () => {
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
      readRepositoryFileContent: vi.fn(async () => ({
        baseOid: "abc123",
        branch: "main",
        content: "hello",
        filePath: "README.md",
        repositoryId: "1001",
      })),
    });

    const response = await getHandlers().GET({
      params: { repoId: "1001" },
      request: new Request("http://localhost/api/repos/1001/files?branch=main&path=README.md"),
    });

    expect(createRepoCallerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        principal: expect.objectContaining({
          authMethod: "session",
        }),
      }),
    );
    expect(await response.json()).toEqual({
      baseOid: "abc123",
      branch: "main",
      content: "hello",
      filePath: "README.md",
      repositoryId: "1001",
    });
  });
});
