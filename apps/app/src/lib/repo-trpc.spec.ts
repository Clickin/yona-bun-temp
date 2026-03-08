import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  ensureYonaDataDirectoriesMock,
  getRepositoryRootMock,
  loadRepositoryAccessFactsMock,
  performInlineEditMutationMock,
  provisionRepositoryMock,
  readRepositoryFileMock,
  resolveRepositoryPathMock,
} = vi.hoisted(() => ({
  ensureYonaDataDirectoriesMock: vi.fn(),
  getRepositoryRootMock: vi.fn(() => "/repo-root"),
  loadRepositoryAccessFactsMock: vi.fn(),
  performInlineEditMutationMock: vi.fn(),
  provisionRepositoryMock: vi.fn(),
  readRepositoryFileMock: vi.fn(),
  resolveRepositoryPathMock: vi.fn(() => "/repo-root/1001.git"),
}));

vi.mock("@yona/db", () => ({
  loadRepositoryAccessFacts: loadRepositoryAccessFactsMock,
}));

vi.mock("@yona/vcs", async () => {
  const actual = await vi.importActual<typeof import("@yona/vcs")>("@yona/vcs");
  return {
    ...actual,
    ensureYonaDataDirectories: ensureYonaDataDirectoriesMock,
    getRepositoryRoot: getRepositoryRootMock,
    performInlineEditMutation: performInlineEditMutationMock,
    provisionRepository: provisionRepositoryMock,
    readRepositoryFile: readRepositoryFileMock,
    resolveRepositoryPath: resolveRepositoryPathMock,
  };
});

import type { ResolvedRequestPrincipal } from "@yona/auth";
import { createRepoCaller } from "./repo-trpc";

function authenticatedPrincipal(): ResolvedRequestPrincipal {
  return {
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
  };
}

function anonymousPrincipal(): ResolvedRequestPrincipal {
  return {
    authMethod: "anonymous",
    hasInvalidCredentials: false,
    ipAddress: "127.0.0.1",
    isAuthenticated: false,
    isRateLimited: false,
    retryAfterSeconds: null,
    session: null,
    shouldClearSessionCookie: false,
    user: null,
  };
}

describe("repo tRPC", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provisions repositories only after repo-admin authorization succeeds", async () => {
    loadRepositoryAccessFactsMock.mockResolvedValueOnce({
      isAnonymous: false,
      isCodeAccessibleMemberOnly: false,
      isOrganizationAdmin: false,
      isOrganizationMember: false,
      isProjectManager: true,
      isProjectMember: true,
      isSiteAdmin: false,
      projectId: 1001,
      projectScope: "private",
    });
    provisionRepositoryMock.mockResolvedValueOnce({
      created: true,
      repositoryId: "1001",
      repositoryPath: "/repo-root/1001.git",
    });

    const result = await createRepoCaller({
      principal: authenticatedPrincipal(),
    }).bootstrapRepository({
      repoId: "1001",
    });

    expect(provisionRepositoryMock).toHaveBeenCalledWith("1001");
    expect(result).toEqual({
      created: true,
      repositoryId: "1001",
      repositoryPath: "/repo-root/1001.git",
    });
  });

  it("denies anonymous reads for private repositories", async () => {
    loadRepositoryAccessFactsMock.mockResolvedValueOnce({
      isAnonymous: true,
      isCodeAccessibleMemberOnly: false,
      isOrganizationAdmin: false,
      isOrganizationMember: false,
      isProjectManager: false,
      isProjectMember: false,
      isSiteAdmin: false,
      projectId: 1001,
      projectScope: "private",
    });

    await expect(
      createRepoCaller({
        principal: anonymousPrincipal(),
      }).readRepositoryFileContent({
        branch: "main",
        filePath: "README.md",
        repoId: "1001",
      }),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("derives inline-edit mutation actors from the resolved principal only", async () => {
    loadRepositoryAccessFactsMock.mockResolvedValueOnce({
      isAnonymous: false,
      isCodeAccessibleMemberOnly: false,
      isOrganizationAdmin: false,
      isOrganizationMember: false,
      isProjectManager: false,
      isProjectMember: true,
      isSiteAdmin: false,
      projectId: 1001,
      projectScope: "private",
    });
    performInlineEditMutationMock.mockResolvedValueOnce({
      commit: {
        blobOid: "blob-1",
        newOid: "new-1",
        oldOid: "old-1",
        refName: "refs/heads/main",
        treeOid: "tree-1",
      },
      requestId: "req-1",
    });

    const result = await createRepoCaller({
      principal: authenticatedPrincipal(),
      requestId: "req-1",
    }).inlineEditRepository({
      branch: "main",
      content: "hello",
      filePath: "README.md",
      message: "Update README",
      repoId: "1001",
    });

    expect(performInlineEditMutationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: {
          canAdmin: false,
          canDirectWrite: true,
          email: "door@example.com",
          id: "7",
          ipAddress: "127.0.0.1",
          name: "Door TTS",
          role: "maintainer",
        },
        repoPath: "/repo-root/1001.git",
        requestId: "req-1",
      }),
    );
    expect(result).toEqual({
      branch: "main",
      commit: {
        blobOid: "blob-1",
        newOid: "new-1",
        oldOid: "old-1",
        refName: "refs/heads/main",
        treeOid: "tree-1",
      },
      filePath: "README.md",
      repositoryId: "1001",
      requestId: "req-1",
    });
  });
});
