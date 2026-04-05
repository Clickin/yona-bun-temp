import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createRepositoryCommitDiscussionCommentMock,
  deleteRepositoryCommitDiscussionCommentMock,
  ensureYonaDataDirectoriesMock,
  getRepositoryRootMock,
  listRepositoryCommitDiscussionThreadsMock,
  loadRepositoryAccessFactsMock,
  performInlineEditMutationMock,
  provisionRepositoryMock,
  readRepositoryCommitDiscussionCommentMock,
  readRepositoryCommitDiscussionThreadMock,
  readRepositoryFileMock,
  resolveRepositoryPathMock,
  runGitMock,
  updateRepositoryCommitDiscussionThreadStateMock,
} = vi.hoisted(() => ({
  createRepositoryCommitDiscussionCommentMock: vi.fn<(...args: unknown[]) => unknown>(),
  deleteRepositoryCommitDiscussionCommentMock: vi.fn<(...args: unknown[]) => unknown>(),
  ensureYonaDataDirectoriesMock: vi.fn<(...args: unknown[]) => unknown>(),
  getRepositoryRootMock: vi.fn<() => string>(() => "/repo-root"),
  listRepositoryCommitDiscussionThreadsMock: vi.fn<(...args: unknown[]) => unknown>(),
  loadRepositoryAccessFactsMock: vi.fn<(...args: unknown[]) => unknown>(),
  performInlineEditMutationMock: vi.fn<(...args: unknown[]) => unknown>(),
  provisionRepositoryMock: vi.fn<(...args: unknown[]) => unknown>(),
  readRepositoryCommitDiscussionCommentMock: vi.fn<(...args: unknown[]) => unknown>(),
  readRepositoryCommitDiscussionThreadMock: vi.fn<(...args: unknown[]) => unknown>(),
  readRepositoryFileMock: vi.fn<(...args: unknown[]) => unknown>(),
  resolveRepositoryPathMock: vi.fn<() => string>(() => "/repo-root/1001.git"),
  runGitMock: vi.fn<(...args: unknown[]) => unknown>(),
  updateRepositoryCommitDiscussionThreadStateMock: vi.fn<(...args: unknown[]) => unknown>(),
}));

vi.mock("@yona/db", async () => {
  const actual = await vi.importActual<typeof import("@yona/db")>("@yona/db");
  return {
    ...actual,
    createRepositoryCommitDiscussionComment: createRepositoryCommitDiscussionCommentMock,
    deleteRepositoryCommitDiscussionComment: deleteRepositoryCommitDiscussionCommentMock,
    listRepositoryCommitDiscussionThreads: listRepositoryCommitDiscussionThreadsMock,
    loadRepositoryAccessFacts: loadRepositoryAccessFactsMock,
    readRepositoryCommitDiscussionComment: readRepositoryCommitDiscussionCommentMock,
    readRepositoryCommitDiscussionThread: readRepositoryCommitDiscussionThreadMock,
    updateRepositoryCommitDiscussionThreadState: updateRepositoryCommitDiscussionThreadStateMock,
  };
});

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
    runGit: runGitMock,
  };
});

import type { ResolvedRequestPrincipal } from "@yona/auth";
import { GitCommandError } from "@yona/vcs";
import { createRepoCaller } from "./repo-trpc";

function expectCreateRepositoryCommitDiscussionComment(
  caller: ReturnType<typeof createRepoCaller>,
) {
  const procedure = (caller as Record<string, unknown>).createRepositoryCommitDiscussionComment;
  expect(procedure).toBeTypeOf("function");
  return procedure as (input: Record<string, unknown>) => Promise<unknown>;
}

function expectDeleteRepositoryCommitDiscussionComment(
  caller: ReturnType<typeof createRepoCaller>,
) {
  const procedure = (caller as Record<string, unknown>).deleteRepositoryCommitDiscussionComment;
  expect(procedure).toBeTypeOf("function");
  return procedure as (input: Record<string, unknown>) => Promise<unknown>;
}

function expectReadRepositoryCommitDiscussionCapabilities(
  caller: ReturnType<typeof createRepoCaller>,
) {
  const procedure = (caller as Record<string, unknown>).readRepositoryCommitDiscussionCapabilities;
  expect(procedure).toBeTypeOf("function");
  return procedure as (input: Record<string, unknown>) => Promise<unknown>;
}

function expectUpdateRepositoryCommitDiscussionThreadState(
  caller: ReturnType<typeof createRepoCaller>,
) {
  const procedure = (caller as Record<string, unknown>).updateRepositoryCommitDiscussionThreadState;
  expect(procedure).toBeTypeOf("function");
  return procedure as (input: Record<string, unknown>) => Promise<unknown>;
}

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
    runGitMock.mockResolvedValue({
      command: ["rev-parse"],
      cwd: "/repo-root/1001.git",
      exitCode: 0,
      stderr: "",
      stdout: "commit-verified\n",
    });
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

  it("creates top-level commit discussions for authenticated nonmembers on public repositories", async () => {
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
    createRepositoryCommitDiscussionCommentMock.mockResolvedValueOnce({
      authorLoginId: "door",
      authorName: "Door TTS",
      comments: [
        {
          authorLoginId: "door",
          authorName: "Door TTS",
          commentId: 9001,
          contents: "first discussion",
          createdAt: new Date("2026-03-20T00:00:00.000Z"),
        },
      ],
      commitId: "commit-1001",
      createdAt: new Date("2026-03-20T00:00:00.000Z"),
      path: null,
      prevCommitId: null,
      range: null,
      state: "open",
      threadId: 8001,
      threadType: "non_ranged",
    });

    const createComment = expectCreateRepositoryCommitDiscussionComment(
      createRepoCaller({
        principal: authenticatedPrincipal(),
      }),
    );

    const result = await createComment({
      contents: "first discussion",
      oid: "commit-1001",
      repoId: "1001",
    });

    expect(createRepositoryCommitDiscussionCommentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        authorId: 7,
        authorLoginId: "door",
        authorName: "Door TTS",
        commitId: "commit-1001",
        contents: "first discussion",
        projectId: 1001,
      }),
    );
    expect(result).toMatchObject({
      state: "open",
      threadId: 8001,
    });
  });

  it("reads commit-discussion capabilities without invoking mutation paths", async () => {
    loadRepositoryAccessFactsMock.mockResolvedValueOnce({
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

    const readCapabilities = expectReadRepositoryCommitDiscussionCapabilities(
      createRepoCaller({
        principal: authenticatedPrincipal(),
      }),
    );

    await expect(
      readCapabilities({
        repoId: "1001",
      }),
    ).resolves.toEqual({
      canCreate: true,
      canManage: false,
    });

    expect(createRepositoryCommitDiscussionCommentMock).not.toHaveBeenCalled();
    expect(deleteRepositoryCommitDiscussionCommentMock).not.toHaveBeenCalled();
    expect(updateRepositoryCommitDiscussionThreadStateMock).not.toHaveBeenCalled();
  });

  it("denies anonymous commit discussion creation even on public repositories", async () => {
    loadRepositoryAccessFactsMock.mockResolvedValue({
      isAnonymous: true,
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

    const createComment = expectCreateRepositoryCommitDiscussionComment(
      createRepoCaller({
        principal: anonymousPrincipal(),
      }),
    );

    await expect(
      createComment({
        contents: "anonymous attempt",
        oid: "commit-public",
        repoId: "1001",
      }),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });

    expect(createRepositoryCommitDiscussionCommentMock).not.toHaveBeenCalled();
  });

  it("maps missing commit discussions to NOT_FOUND before calling the domain layer", async () => {
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
    runGitMock.mockRejectedValueOnce(
      new GitCommandError({
        command: ["rev-parse", "--verify", "missing-commit^commit"],
        cwd: "/repo-root/1001.git",
        exitCode: 128,
        stderr: "fatal: ambiguous argument 'missing-commit^commit'",
        stdout: "",
      }),
    );

    await expect(
      createRepoCaller({
        principal: authenticatedPrincipal(),
      }).listRepositoryCommitDiscussionThreads({
        oid: "missing-commit",
        repoId: "1001",
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    expect(listRepositoryCommitDiscussionThreadsMock).not.toHaveBeenCalled();
  });

  it("lets a public nonmember close their own commit-discussion thread", async () => {
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
    readRepositoryCommitDiscussionThreadMock.mockResolvedValueOnce({
      authorId: 7,
      commitId: "commit-own-thread",
      projectId: 1001,
      state: "open",
      threadId: 8002,
    });
    updateRepositoryCommitDiscussionThreadStateMock.mockResolvedValueOnce({
      authorLoginId: "door",
      authorName: "Door TTS",
      comments: [
        {
          authorLoginId: "door",
          authorName: "Door TTS",
          commentId: 9002,
          contents: "stateful discussion",
          createdAt: new Date("2026-03-20T00:00:00.000Z"),
        },
      ],
      commitId: "commit-own-thread",
      createdAt: new Date("2026-03-20T00:00:00.000Z"),
      path: null,
      prevCommitId: null,
      range: null,
      state: "closed",
      threadId: 8002,
      threadType: "non_ranged",
    });

    const updateThreadState = expectUpdateRepositoryCommitDiscussionThreadState(
      createRepoCaller({
        principal: authenticatedPrincipal(),
      }),
    );

    const result = await updateThreadState({
      oid: "commit-own-thread",
      repoId: "1001",
      state: "closed",
      threadId: 8002,
    });

    expect(updateRepositoryCommitDiscussionThreadStateMock).toHaveBeenCalledWith({
      commitId: "commit-own-thread",
      projectId: 1001,
      state: "closed",
      threadId: 8002,
    });
    expect(result).toMatchObject({
      state: "closed",
      threadId: 8002,
    });
  });

  it("rejects public nonmember thread-state changes when the actor is not the thread author", async () => {
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
    readRepositoryCommitDiscussionThreadMock.mockResolvedValueOnce({
      authorId: 77,
      commitId: "commit-foreign-thread",
      projectId: 1001,
      state: "open",
      threadId: 8003,
    });

    const updateThreadState = expectUpdateRepositoryCommitDiscussionThreadState(
      createRepoCaller({
        principal: authenticatedPrincipal(),
      }),
    );

    await expect(
      updateThreadState({
        oid: "commit-foreign-thread",
        repoId: "1001",
        state: "closed",
        threadId: 8003,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    expect(updateRepositoryCommitDiscussionThreadStateMock).not.toHaveBeenCalled();
  });

  it("lets comment authors delete their own commit discussion comments", async () => {
    loadRepositoryAccessFactsMock.mockResolvedValueOnce({
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
    readRepositoryCommitDiscussionCommentMock.mockResolvedValueOnce({
      authorId: 7,
      commentId: 9003,
      commitId: "commit-delete",
      projectId: 1001,
      threadAuthorId: 99,
      threadId: 8004,
    });
    deleteRepositoryCommitDiscussionCommentMock.mockResolvedValueOnce({
      deletedCommentId: 9003,
      threadDeleted: true,
      threadId: 8004,
    });

    const deleteComment = expectDeleteRepositoryCommitDiscussionComment(
      createRepoCaller({
        principal: authenticatedPrincipal(),
      }),
    );

    const result = await deleteComment({
      commentId: 9003,
      oid: "commit-delete",
      repoId: "1001",
    });

    expect(deleteRepositoryCommitDiscussionCommentMock).toHaveBeenCalledWith({
      commentId: 9003,
      commitId: "commit-delete",
      projectId: 1001,
    });
    expect(result).toEqual({
      deletedCommentId: 9003,
      threadDeleted: true,
      threadId: 8004,
    });
  });
});
