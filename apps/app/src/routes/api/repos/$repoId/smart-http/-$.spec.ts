import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";

const {
  authorizeRepositoryRequestMock,
  handleSmartHttpRequestMock,
  loadRepositoryAccessFactsMock,
  requiresReceivePackAuthMock,
  resolveServerRequestPrincipalMock,
} = vi.hoisted(() => ({
  authorizeRepositoryRequestMock: vi.fn(),
  handleSmartHttpRequestMock: vi.fn(),
  loadRepositoryAccessFactsMock: vi.fn(),
  requiresReceivePackAuthMock: vi.fn(),
  resolveServerRequestPrincipalMock: vi.fn(),
}));

vi.mock("@app/lib/repo-trpc", () => ({
  authorizeRepositoryRequest: authorizeRepositoryRequestMock,
}));

vi.mock("@yona/db", async () => {
  const actual = await vi.importActual<typeof import("@yona/db")>("@yona/db");
  return {
    ...actual,
    loadRepositoryAccessFacts: loadRepositoryAccessFactsMock,
  };
});

vi.mock("@app/lib/server-request-auth", async () => {
  const actual = await vi.importActual<typeof import("@app/lib/server-request-auth")>(
    "@app/lib/server-request-auth",
  );
  return {
    ...actual,
    resolveServerRequestPrincipal: resolveServerRequestPrincipalMock,
  };
});

vi.mock("@yona/vcs", async () => {
  const actual = await vi.importActual<typeof import("@yona/vcs")>("@yona/vcs");
  return {
    ...actual,
    handleSmartHttpRequest: handleSmartHttpRequestMock,
    requiresReceivePackAuth: requiresReceivePackAuthMock,
  };
});

import { Route } from "./$";

function getHandlers() {
  return Route.options.server!.handlers as {
    GET: (input: {
      params: { _splat?: string; repoId: string };
      request: Request;
    }) => Promise<Response>;
    POST: (input: {
      params: { _splat?: string; repoId: string };
      request: Request;
    }) => Promise<Response>;
  };
}

describe("/api/repos/$repoId/smart-http/$ route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadRepositoryAccessFactsMock.mockResolvedValue({
      isAnonymous: false,
      isCodeAccessibleMemberOnly: false,
      isGitRepository: true,
      isOrganizationAdmin: false,
      isOrganizationMember: false,
      isProjectManager: false,
      isProjectMember: false,
      isSiteAdmin: false,
      projectId: 1001,
      projectScope: "public",
    });
  });

  it("returns a Basic challenge when explicit credentials are invalid", async () => {
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
      params: { _splat: "info/refs", repoId: "1001" },
      request: new Request(
        "http://localhost/api/repos/1001/smart-http/info/refs?service=git-upload-pack",
      ),
    });

    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe('Basic realm="Yona"');
  });

  it("returns 429 with Retry-After when Basic auth is rate-limited", async () => {
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
      params: { _splat: "info/refs", repoId: "1001" },
      request: new Request(
        "http://localhost/api/repos/1001/smart-http/info/refs?service=git-upload-pack",
      ),
    });

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
  });

  it("returns 403 for authenticated-but-forbidden smart-http requests", async () => {
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
    requiresReceivePackAuthMock.mockReturnValueOnce(true);
    authorizeRepositoryRequestMock.mockRejectedValueOnce(
      new TRPCError({
        code: "FORBIDDEN",
      }),
    );

    const response = await getHandlers().GET({
      params: { _splat: "git-receive-pack", repoId: "1001" },
      request: new Request("http://localhost/api/repos/1001/smart-http/git-receive-pack"),
    });

    expect(response.status).toBe(403);
    await expect(response.text()).resolves.toBe("Forbidden");
  });

  it("delegates allowed smart-http requests to the VCS backend with server-derived context", async () => {
    resolveServerRequestPrincipalMock.mockResolvedValueOnce({
      authMethod: "api-token",
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
    requiresReceivePackAuthMock.mockReturnValueOnce(false);
    authorizeRepositoryRequestMock.mockResolvedValueOnce({
      decision: { allowed: true, reason: "project-member-read" },
      facts: {},
    });
    handleSmartHttpRequestMock.mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const request = new Request(
      "http://localhost/api/repos/1001/smart-http/info/refs?service=git-upload-pack",
    );
    const response = await getHandlers().GET({
      params: { _splat: "info/refs", repoId: "1001" },
      request,
    });

    expect(handleSmartHttpRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        authorization: {
          allowWrite: false,
          remoteAddress: "127.0.0.1",
          remoteUserName: "door",
        },
        pathInfo: "/1001/info/refs",
        repositoryId: "1001",
        request,
      }),
    );
    expect(response.status).toBe(200);
  });

  it("rejects getanyfile-style info/refs requests before auth", async () => {
    const response = await getHandlers().GET({
      params: { _splat: "info/refs", repoId: "1001" },
      request: new Request("http://localhost/api/repos/1001/smart-http/info/refs"),
    });

    expect(response.status).toBe(403);
    await expect(response.text()).resolves.toBe("Unsupported service: getanyfile");
    expect(resolveServerRequestPrincipalMock).not.toHaveBeenCalled();
    expect(authorizeRepositoryRequestMock).not.toHaveBeenCalled();
    expect(handleSmartHttpRequestMock).not.toHaveBeenCalled();
  });

  it("returns 404 for non-git repositories before authz delegation", async () => {
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
    requiresReceivePackAuthMock.mockReturnValueOnce(false);
    loadRepositoryAccessFactsMock.mockResolvedValueOnce({
      isAnonymous: false,
      isCodeAccessibleMemberOnly: false,
      isGitRepository: false,
      isOrganizationAdmin: false,
      isOrganizationMember: false,
      isProjectManager: false,
      isProjectMember: false,
      isSiteAdmin: false,
      projectId: 1001,
      projectScope: "public",
    });

    const response = await getHandlers().GET({
      params: { _splat: "info/refs", repoId: "1001" },
      request: new Request(
        "http://localhost/api/repos/1001/smart-http/info/refs?service=git-upload-pack",
      ),
    });

    expect(response.status).toBe(404);
    expect(authorizeRepositoryRequestMock).not.toHaveBeenCalled();
    expect(handleSmartHttpRequestMock).not.toHaveBeenCalled();
  });

  it("returns 413 for oversized rpc bodies before invoking git-http-backend", async () => {
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
    requiresReceivePackAuthMock.mockReturnValueOnce(true);

    const response = await getHandlers().POST({
      params: { _splat: "git-receive-pack", repoId: "1001" },
      request: new Request("http://localhost/api/repos/1001/smart-http/git-receive-pack", {
        body: "ignored",
        headers: {
          "content-length": String(100 * 1024 * 1024 + 1),
        },
        method: "POST",
      }),
    });

    expect(response.status).toBe(413);
    expect(authorizeRepositoryRequestMock).not.toHaveBeenCalled();
    expect(handleSmartHttpRequestMock).not.toHaveBeenCalled();
  });
});
