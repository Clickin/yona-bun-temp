import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@web/routes/api/repos/[repoId]/inline-edit/+server";
import {
  ensureYonaDataDirectories,
  getRepositoryRoot,
  readMutationActor,
  resolveRepositoryPath,
} from "@yona/infra";
import { AuthorizationError, ConflictError, performInlineEditMutation } from "@yona/infra";

vi.mock("@yona/infra", async () => {
  const actual = await vi.importActual<typeof import("@yona/infra")>("@yona/infra");

  return {
    ...actual,
    readMutationActor: vi.fn(),
    ensureYonaDataDirectories: vi.fn(),
    getRepositoryRoot: vi.fn(() => "/repo-root"),
    resolveRepositoryPath: vi.fn(() => "/repo-root/1001"),
    performInlineEditMutation: vi.fn(),
  };
});

function createRequest(body: unknown, headers: HeadersInit = {}): Request {
  return new Request("http://localhost/api/repos/1001/inline-edit", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/repos/[repoId]/inline-edit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when actor headers are missing", async () => {
    vi.mocked(readMutationActor).mockReturnValue(null);

    const response = await POST({
      params: { repoId: "1001" },
      request: createRequest({}),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid JSON body", async () => {
    vi.mocked(readMutationActor).mockReturnValue({
      id: "u-1",
      name: "Editor",
      email: "editor@example.com",
      role: "maintainer",
      canDirectWrite: true,
      canAdmin: false,
      ipAddress: "127.0.0.1",
    });

    const request = {
      headers: new Headers(),
      json: async () => {
        throw new Error("invalid json");
      },
    } as unknown as Request;

    const response = await POST({
      params: { repoId: "1001" },
      request,
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
  });

  it("returns 409 when mutation reports stale baseOid conflict", async () => {
    vi.mocked(readMutationActor).mockReturnValue({
      id: "u-1",
      name: "Editor",
      email: "editor@example.com",
      role: "maintainer",
      canDirectWrite: true,
      canAdmin: false,
      ipAddress: "127.0.0.1",
    });

    vi.mocked(performInlineEditMutation).mockRejectedValue(new ConflictError("old", "new"));

    const response = await POST({
      params: { repoId: "1001" },
      request: createRequest({
        branch: "main",
        filePath: "README.md",
        content: "updated\n",
        message: "inline edit",
        baseOid: "old",
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Conflict: branch moved since baseOid",
      expectedOid: "old",
      actualOid: "new",
    });
  });

  it("returns 403 when mutation denies protected branch write", async () => {
    vi.mocked(readMutationActor).mockReturnValue({
      id: "u-1",
      name: "Editor",
      email: "editor@example.com",
      role: "developer",
      canDirectWrite: false,
      canAdmin: false,
      ipAddress: "127.0.0.1",
    });

    vi.mocked(performInlineEditMutation).mockRejectedValue(
      new AuthorizationError("Direct write denied for protected branch: main"),
    );

    const response = await POST({
      params: { repoId: "1001" },
      request: createRequest({
        branch: "main",
        filePath: "README.md",
        content: "updated\n",
        message: "inline edit",
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(403);
  });

  it("returns commit payload on success", async () => {
    vi.mocked(readMutationActor).mockReturnValue({
      id: "u-1",
      name: "Editor",
      email: "editor@example.com",
      role: "maintainer",
      canDirectWrite: true,
      canAdmin: false,
      ipAddress: "127.0.0.1",
    });

    vi.mocked(performInlineEditMutation).mockResolvedValue({
      requestId: "req-1",
      commit: {
        refName: "refs/heads/main",
        oldOid: "old",
        newOid: "new",
        treeOid: "tree",
        blobOid: "blob",
      },
    });

    const response = await POST({
      params: { repoId: "1001" },
      request: createRequest(
        {
          branch: "main",
          filePath: "README.md",
          content: "updated\n",
          message: "inline edit",
          baseOid: "old",
        },
        { "x-request-id": "req-1" },
      ),
    } as Parameters<typeof POST>[0]);

    expect(ensureYonaDataDirectories).toHaveBeenCalledTimes(1);
    expect(getRepositoryRoot).toHaveBeenCalledTimes(1);
    expect(resolveRepositoryPath).toHaveBeenCalledWith("/repo-root", "1001");
    expect(performInlineEditMutation).toHaveBeenCalled();
    expect(response.status).toBe(200);
  });
});
