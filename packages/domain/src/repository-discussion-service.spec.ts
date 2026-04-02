import { describe, expect, it, vi } from "vitest";
import {
  createRepositoryCommitDiscussionComment,
  deleteRepositoryCommitDiscussionComment,
  listRepositoryCommitDiscussionThreads,
  updateRepositoryCommitDiscussionThreadState,
} from "./repository-discussion-service";
import { DomainNotFoundError, DomainPermissionError, DomainValidationError } from "./errors";

const authenticatedActor = {
  actorId: 7,
  isAnonymous: false,
  isSiteAdmin: false,
  loginId: "doortts",
  name: "Door TTS",
};

const mockFn = <T extends (...args: unknown[]) => unknown = (...args: unknown[]) => unknown>() =>
  vi.fn<T>();

function publicNonmemberFacts() {
  return {
    isAnonymous: false,
    isCodeAccessibleMemberOnly: false,
    isGitRepository: true,
    isOrganizationAdmin: false,
    isOrganizationMember: false,
    isProjectManager: false,
    isProjectMember: false,
    isSiteAdmin: false,
    projectId: 1001,
    projectScope: "public" as const,
  };
}

function discussionThread(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    authorLoginId: "doortts",
    authorName: "Door TTS",
    comments: [
      {
        authorLoginId: "doortts",
        authorName: "Door TTS",
        commentId: 9001,
        contents: "first discussion",
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
      },
    ],
    commitId: "commit-1001",
    createdAt: new Date("2026-04-01T00:00:00.000Z"),
    path: null,
    prevCommitId: null,
    range: null,
    state: "open" as const,
    threadId: 8001,
    threadType: "non_ranged" as const,
    ...overrides,
  };
}

describe("repository discussion service", () => {
  it("allows authenticated public nonmembers to create top-level commit discussions", async () => {
    const deps = {
      createRepositoryCommitDiscussionComment: mockFn().mockResolvedValue(discussionThread()),
      deleteRepositoryCommitDiscussionComment: mockFn(),
      listRepositoryCommitDiscussionThreads: mockFn(),
      loadRepositoryAccessFacts: mockFn().mockResolvedValue(publicNonmemberFacts()),
      readRepositoryCommitDiscussionComment: mockFn(),
      readRepositoryCommitDiscussionThread: mockFn(),
      updateRepositoryCommitDiscussionThreadState: mockFn(),
    };

    await expect(
      createRepositoryCommitDiscussionComment(
        authenticatedActor,
        {
          contents: "first discussion",
          oid: "commit-1001",
          repoId: "1001",
        },
        deps,
      ),
    ).resolves.toMatchObject({
      state: "open",
      threadId: 8001,
    });

    expect(deps.createRepositoryCommitDiscussionComment).toHaveBeenCalledWith(
      expect.objectContaining({
        authorId: 7,
        authorLoginId: "doortts",
        authorName: "Door TTS",
        commitId: "commit-1001",
        contents: "first discussion",
        projectId: 1001,
      }),
    );
  });

  it("rejects anonymous commit discussion creation before reading repository facts", async () => {
    const deps = {
      createRepositoryCommitDiscussionComment: mockFn(),
      deleteRepositoryCommitDiscussionComment: mockFn(),
      listRepositoryCommitDiscussionThreads: mockFn(),
      loadRepositoryAccessFacts: mockFn(),
      readRepositoryCommitDiscussionComment: mockFn(),
      readRepositoryCommitDiscussionThread: mockFn(),
      updateRepositoryCommitDiscussionThreadState: mockFn(),
    };

    await expect(
      createRepositoryCommitDiscussionComment(
        {
          actorId: null,
          isAnonymous: true,
          isSiteAdmin: false,
          loginId: null,
        },
        {
          contents: "anonymous attempt",
          oid: "commit-1001",
          repoId: "1001",
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(DomainPermissionError);

    expect(deps.loadRepositoryAccessFacts).not.toHaveBeenCalled();
  });

  it("rejects reply creation when range and threadId are both supplied", async () => {
    const deps = {
      createRepositoryCommitDiscussionComment: mockFn(),
      deleteRepositoryCommitDiscussionComment: mockFn(),
      listRepositoryCommitDiscussionThreads: mockFn(),
      loadRepositoryAccessFacts: mockFn().mockResolvedValue(publicNonmemberFacts()),
      readRepositoryCommitDiscussionComment: mockFn(),
      readRepositoryCommitDiscussionThread: mockFn(),
      updateRepositoryCommitDiscussionThreadState: mockFn(),
    };

    await expect(
      createRepositoryCommitDiscussionComment(
        authenticatedActor,
        {
          contents: "bad reply",
          oid: "commit-1001",
          range: {
            endColumn: 2,
            endLine: 4,
            endSide: "B",
            path: "src/main.ts",
            startColumn: 0,
            startLine: 4,
            startSide: "A",
          },
          repoId: "1001",
          threadId: 8001,
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(DomainValidationError);
  });

  it("allows a public nonmember thread author to close their own thread", async () => {
    const deps = {
      createRepositoryCommitDiscussionComment: mockFn(),
      deleteRepositoryCommitDiscussionComment: mockFn(),
      listRepositoryCommitDiscussionThreads: mockFn(),
      loadRepositoryAccessFacts: mockFn().mockResolvedValue(publicNonmemberFacts()),
      readRepositoryCommitDiscussionComment: mockFn(),
      readRepositoryCommitDiscussionThread: mockFn().mockResolvedValue({
        authorId: 7,
        commitId: "commit-own-thread",
        projectId: 1001,
        state: "open",
        threadId: 8002,
      }),
      updateRepositoryCommitDiscussionThreadState: mockFn().mockResolvedValue(
        discussionThread({ commitId: "commit-own-thread", state: "closed", threadId: 8002 }),
      ),
    };

    await expect(
      updateRepositoryCommitDiscussionThreadState(
        authenticatedActor,
        {
          oid: "commit-own-thread",
          repoId: "1001",
          state: "closed",
          threadId: 8002,
        },
        deps,
      ),
    ).resolves.toMatchObject({
      state: "closed",
      threadId: 8002,
    });
  });

  it("rejects thread state changes by unrelated public nonmembers", async () => {
    const deps = {
      createRepositoryCommitDiscussionComment: mockFn(),
      deleteRepositoryCommitDiscussionComment: mockFn(),
      listRepositoryCommitDiscussionThreads: mockFn(),
      loadRepositoryAccessFacts: mockFn().mockResolvedValue(publicNonmemberFacts()),
      readRepositoryCommitDiscussionComment: mockFn(),
      readRepositoryCommitDiscussionThread: mockFn().mockResolvedValue({
        authorId: 99,
        commitId: "commit-foreign-thread",
        projectId: 1001,
        state: "open",
        threadId: 8003,
      }),
      updateRepositoryCommitDiscussionThreadState: mockFn(),
    };

    await expect(
      updateRepositoryCommitDiscussionThreadState(
        authenticatedActor,
        {
          oid: "commit-foreign-thread",
          repoId: "1001",
          state: "closed",
          threadId: 8003,
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(DomainPermissionError);
  });

  it("lets comment authors delete their own commit discussion comments", async () => {
    const deps = {
      createRepositoryCommitDiscussionComment: mockFn(),
      deleteRepositoryCommitDiscussionComment: mockFn().mockResolvedValue({
        deletedCommentId: 9003,
        threadDeleted: true,
        threadId: 8004,
      }),
      listRepositoryCommitDiscussionThreads: mockFn(),
      loadRepositoryAccessFacts: mockFn().mockResolvedValue(publicNonmemberFacts()),
      readRepositoryCommitDiscussionComment: mockFn().mockResolvedValue({
        authorId: 7,
        commentId: 9003,
        commitId: "commit-delete",
        projectId: 1001,
        threadAuthorId: 99,
        threadId: 8004,
      }),
      readRepositoryCommitDiscussionThread: mockFn(),
      updateRepositoryCommitDiscussionThreadState: mockFn(),
    };

    await expect(
      deleteRepositoryCommitDiscussionComment(
        authenticatedActor,
        {
          commentId: 9003,
          oid: "commit-delete",
          repoId: "1001",
        },
        deps,
      ),
    ).resolves.toEqual({
      deletedCommentId: 9003,
      threadDeleted: true,
      threadId: 8004,
    });
  });

  it("returns not found when repository facts are missing", async () => {
    const deps = {
      createRepositoryCommitDiscussionComment: mockFn(),
      deleteRepositoryCommitDiscussionComment: mockFn(),
      listRepositoryCommitDiscussionThreads: mockFn(),
      loadRepositoryAccessFacts: mockFn().mockResolvedValue(null),
      readRepositoryCommitDiscussionComment: mockFn(),
      readRepositoryCommitDiscussionThread: mockFn(),
      updateRepositoryCommitDiscussionThreadState: mockFn(),
    };

    await expect(
      listRepositoryCommitDiscussionThreads(
        {
          actorId: null,
          isAnonymous: true,
          isSiteAdmin: false,
          loginId: null,
        },
        {
          oid: "missing",
          repoId: "1001",
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(DomainNotFoundError);
  });
});
