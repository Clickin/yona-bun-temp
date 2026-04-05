import { describe, expect, it, vi } from "vitest";
import * as pullRequestService from "./pull-request-service";
import {
  createPullRequest,
  createPullRequestReviewComment,
  deletePullRequestReviewComment,
  listPullRequests,
  mergePullRequest,
  previewPullRequestMerge,
  readPullRequestDetail,
  readPullRequestReviewCounts,
  updatePullRequestReviewThreadState,
  updatePullRequestState,
} from "./pull-request-service";
import { DomainNotFoundError, DomainPermissionError, DomainValidationError } from "./errors";

const mockFn = <T extends (...args: unknown[]) => unknown = (...args: unknown[]) => unknown>() =>
  vi.fn<T>();

const authenticatedActor = {
  actorId: 7,
  isAnonymous: false,
  isSiteAdmin: false,
  loginId: "doortts",
};

function createAuthorizedProjectAuthorization() {
  return {
    project: {
      id: 11,
      organizationName: null,
      ownerName: "yona",
      overview: null,
      projectName: "project-yona",
      projectScope: "public" as const,
    },
    viewer: {
      isOrganizationAdmin: false,
      isOrganizationMember: false,
      isProjectManager: true,
      isProjectMember: true,
    },
  };
}

function createReadOnlyProjectAuthorization() {
  return {
    ...createAuthorizedProjectAuthorization(),
    viewer: {
      isOrganizationAdmin: false,
      isOrganizationMember: false,
      isProjectManager: false,
      isProjectMember: false,
    },
  };
}

function createPullRequestDetail(state: "closed" | "open") {
  return {
    body: "Body",
    contributorLoginId: "doortts",
    contributorName: "Door TTS",
    createdAt: null,
    fromBranch: "feature/pr-baseline",
    ownerName: "yona",
    projectName: "project-yona",
    pullRequestNumber: 5,
    reviewSummary: {
      closedThreadCount: 0,
      openThreadCount: 1,
      reviewerCount: 0,
    },
    state,
    title: "Add PR baseline",
    toBranch: "main",
  };
}

function createPrivateProjectAuthorization() {
  return {
    ...createReadOnlyProjectAuthorization(),
    project: {
      ...createAuthorizedProjectAuthorization().project,
      projectScope: "private" as const,
    },
  };
}

function reviewThreadFixture(threadId: string, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    authorLoginId: "admin",
    authorName: "Admin",
    comments: [
      {
        authorLoginId: "admin",
        authorName: "Admin",
        commentId: 51,
        contents: "Comment #1 : 111",
        createdAt: null,
      },
      {
        authorLoginId: "laziel",
        authorName: "Laziel",
        commentId: 52,
        contents: "reply",
        createdAt: null,
      },
    ],
    commitId: "commit-111",
    createdAt: null,
    lastCommentAt: null,
    participants: ["admin", "laziel"],
    path: "/app/controllers/IssueApp.java",
    replyCount: 1,
    projectName: "project-yona",
    state: "open",
    text: "Comment #1 : 111",
    threadId,
    ...overrides,
  };
}

function createPullRequestRecord(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    fromBranch: "feature/demo-ready",
    fromProjectId: 11,
    id: 41,
    isConflict: false,
    isMerging: false,
    mergedCommitIdFrom: null,
    mergedCommitIdTo: null,
    pullRequestNumber: 5,
    state: "open",
    toBranch: "main",
    toProjectId: 11,
    ...overrides,
  };
}

function expectReadPullRequestReviewThreads() {
  const readPullRequestReviewThreads = (pullRequestService as Record<string, unknown>)
    .readPullRequestReviewThreads;

  expect(readPullRequestReviewThreads).toBeTypeOf("function");

  return readPullRequestReviewThreads as (
    actor: Parameters<typeof listPullRequests>[0],
    input: Record<string, unknown>,
    deps: Record<string, unknown>,
  ) => Promise<unknown>;
}

function expectReadPullRequestReviewCounts() {
  const readReviewCounts = (pullRequestService as Record<string, unknown>)
    .readPullRequestReviewCounts;

  expect(readReviewCounts).toBeTypeOf("function");

  return readReviewCounts as (
    actor: Parameters<typeof listPullRequests>[0],
    input: Record<string, unknown>,
    deps: Record<string, unknown>,
  ) => Promise<unknown>;
}

describe("pull request service PR transition provenance: docs/provenance/phase-0b/pull-request-review.md", () => {
  it("lists, reads, creates, and updates pull requests", async () => {
    const deps = {
      createPullRequestRecord: mockFn().mockResolvedValue(5),
      listPullRequestReviewThreadsByProject: mockFn(),
      listPullRequestsByProject: mockFn().mockResolvedValue([
        {
          contributorLoginId: "doortts",
          contributorName: "Door TTS",
          createdAt: null,
          fromBranch: "feature/pr-baseline",
          ownerName: "yona",
          projectName: "project-yona",
          pullRequestNumber: 5,
          state: "open",
          title: "Add PR baseline",
          toBranch: "main",
        },
      ]),
      readProjectAuthorization: mockFn().mockResolvedValue(createAuthorizedProjectAuthorization()),
      readPullRequestByProjectAndNumber: mockFn()
        .mockResolvedValueOnce(createPullRequestDetail("open"))
        .mockResolvedValueOnce(createPullRequestDetail("open"))
        .mockResolvedValueOnce(createPullRequestDetail("open"))
        .mockResolvedValueOnce(createPullRequestDetail("closed")),
      updatePullRequestStateByProjectAndNumber: mockFn().mockResolvedValue(undefined),
    };

    await expect(
      listPullRequests(
        authenticatedActor,
        { ownerName: "yona", projectName: "project-yona" },
        deps,
      ),
    ).resolves.toHaveLength(1);

    await expect(
      readPullRequestDetail(
        authenticatedActor,
        { ownerName: "yona", projectName: "project-yona", pullRequestNumber: 5 },
        deps,
      ),
    ).resolves.toMatchObject({ pullRequestNumber: 5 });

    await expect(
      createPullRequest(
        authenticatedActor,
        {
          body: "Body",
          fromBranch: "feature/pr-baseline",
          ownerName: "yona",
          projectName: "project-yona",
          title: "Add PR baseline",
          toBranch: "main",
        },
        deps,
      ),
    ).resolves.toMatchObject({ pullRequestNumber: 5 });

    await expect(
      updatePullRequestState(
        authenticatedActor,
        { ownerName: "yona", projectName: "project-yona", pullRequestNumber: 5, state: "closed" },
        deps,
      ),
    ).resolves.toMatchObject({ pullRequestNumber: 5 });
  });

  it("rejects anonymous transition attempts before reading authorization", async () => {
    const deps = {
      createPullRequestRecord: mockFn(),
      listPullRequestReviewThreadsByProject: mockFn(),
      listPullRequestsByProject: mockFn(),
      readProjectAuthorization: mockFn(),
      readPullRequestByProjectAndNumber: mockFn(),
      updatePullRequestStateByProjectAndNumber: mockFn(),
    };

    await expect(
      updatePullRequestState(
        {
          actorId: null,
          isAnonymous: true,
          isSiteAdmin: false,
          loginId: null,
        },
        {
          ownerName: "yona",
          projectName: "project-yona",
          pullRequestNumber: 5,
          state: "closed",
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(DomainPermissionError);

    expect(deps.readProjectAuthorization).not.toHaveBeenCalled();
  });

  it("returns not found when the pull request does not exist during close", async () => {
    const deps = {
      createPullRequestRecord: mockFn(),
      listPullRequestReviewThreadsByProject: mockFn(),
      listPullRequestsByProject: mockFn(),
      readProjectAuthorization: mockFn().mockResolvedValue(createAuthorizedProjectAuthorization()),
      readPullRequestByProjectAndNumber: mockFn().mockResolvedValue(null),
      updatePullRequestStateByProjectAndNumber: mockFn().mockResolvedValue(undefined),
    };

    await expect(
      updatePullRequestState(
        authenticatedActor,
        {
          ownerName: "yona",
          projectName: "project-yona",
          pullRequestNumber: 404,
          state: "closed",
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(DomainNotFoundError);
  });

  it("rejects close when the actor lacks transition permission", async () => {
    const deps = {
      createPullRequestRecord: mockFn(),
      listPullRequestReviewThreadsByProject: mockFn(),
      listPullRequestsByProject: mockFn(),
      readProjectAuthorization: mockFn().mockResolvedValue(createReadOnlyProjectAuthorization()),
      readPullRequestByProjectAndNumber: mockFn(),
      updatePullRequestStateByProjectAndNumber: mockFn(),
    };

    await expect(
      updatePullRequestState(
        authenticatedActor,
        {
          ownerName: "yona",
          projectName: "project-yona",
          pullRequestNumber: 5,
          state: "closed",
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(DomainPermissionError);

    expect(deps.updatePullRequestStateByProjectAndNumber).not.toHaveBeenCalled();
  });

  it("closes and reopens pull requests for authorized actors", async () => {
    const deps = {
      createPullRequestRecord: mockFn(),
      listPullRequestReviewThreadsByProject: mockFn(),
      listPullRequestsByProject: mockFn(),
      readProjectAuthorization: mockFn().mockResolvedValue(createAuthorizedProjectAuthorization()),
      readPullRequestByProjectAndNumber: mockFn()
        .mockResolvedValueOnce(createPullRequestDetail("open"))
        .mockResolvedValueOnce(createPullRequestDetail("closed"))
        .mockResolvedValueOnce(createPullRequestDetail("closed"))
        .mockResolvedValueOnce(createPullRequestDetail("open")),
      updatePullRequestStateByProjectAndNumber: mockFn().mockResolvedValue(undefined),
    };

    await expect(
      updatePullRequestState(
        authenticatedActor,
        {
          ownerName: "yona",
          projectName: "project-yona",
          pullRequestNumber: 5,
          state: "closed",
        },
        deps,
      ),
    ).resolves.toMatchObject({ pullRequestNumber: 5, state: "closed" });

    await expect(
      updatePullRequestState(
        authenticatedActor,
        {
          ownerName: "yona",
          projectName: "project-yona",
          pullRequestNumber: 5,
          state: "open",
        },
        deps,
      ),
    ).resolves.toMatchObject({ pullRequestNumber: 5, state: "open" });

    expect(deps.updatePullRequestStateByProjectAndNumber).toHaveBeenNthCalledWith(1, {
      projectId: 11,
      pullRequestNumber: 5,
      state: "closed",
    });
    expect(deps.updatePullRequestStateByProjectAndNumber).toHaveBeenNthCalledWith(2, {
      projectId: 11,
      pullRequestNumber: 5,
      state: "open",
    });
  });

  it("rejects reopen when the pull request is already open", async () => {
    const deps = {
      createPullRequestRecord: mockFn(),
      listPullRequestReviewThreadsByProject: mockFn(),
      listPullRequestsByProject: mockFn(),
      readProjectAuthorization: mockFn().mockResolvedValue(createAuthorizedProjectAuthorization()),
      readPullRequestByProjectAndNumber: mockFn().mockResolvedValue(
        createPullRequestDetail("open"),
      ),
      updatePullRequestStateByProjectAndNumber: mockFn().mockResolvedValue(undefined),
    };

    await expect(
      updatePullRequestState(
        authenticatedActor,
        {
          ownerName: "yona",
          projectName: "project-yona",
          pullRequestNumber: 5,
          state: "open",
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(DomainValidationError);

    expect(deps.updatePullRequestStateByProjectAndNumber).not.toHaveBeenCalled();
  });

  it("rejects merged transition input before authorization or persistence", async () => {
    const deps = {
      createPullRequestRecord: mockFn(),
      listPullRequestReviewThreadsByProject: mockFn(),
      listPullRequestsByProject: mockFn(),
      readProjectAuthorization: mockFn(),
      readPullRequestByProjectAndNumber: mockFn(),
      updatePullRequestStateByProjectAndNumber: mockFn(),
    };

    await expect(
      updatePullRequestState(
        authenticatedActor,
        {
          ownerName: "yona",
          projectName: "project-yona",
          pullRequestNumber: 5,
          state: "merged" as "closed",
        },
        deps,
      ),
    ).rejects.toThrow();

    expect(deps.readProjectAuthorization).not.toHaveBeenCalled();
    expect(deps.updatePullRequestStateByProjectAndNumber).not.toHaveBeenCalled();
  });

  it("keeps 13.7 PR review-thread reads project-authorized and leaves 13.6 repository discussion outside this slice", async () => {
    const anonymousActor = {
      actorId: null,
      isAnonymous: true,
      isSiteAdmin: false,
      loginId: null,
    };
    const deps = {
      listPullRequestReviewThreadsByProject: mockFn(),
      readProjectAuthorization: mockFn().mockResolvedValue(createPrivateProjectAuthorization()),
    };
    const readPullRequestReviewThreads = expectReadPullRequestReviewThreads();

    await expect(
      readPullRequestReviewThreads(
        anonymousActor,
        {
          ownerName: "yona",
          projectName: "project-yona",
          state: "open",
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(DomainPermissionError);

    expect(deps.listPullRequestReviewThreadsByProject).not.toHaveBeenCalled();
  });

  it("filters 13.7 PR review-thread reads by legacy state, text, commit/path, author, and participant dimensions", async () => {
    const deps = {
      listPullRequestReviewThreadsByProject: mockFn().mockResolvedValue([
        reviewThreadFixture("thread-open-comment", {
          authorLoginId: "admin",
          commitId: "commit-111",
          participants: ["admin", "laziel"],
          path: "/app/controllers/IssueApp.java",
          state: "open",
          text: "Comment #1 : 111",
        }),
        reviewThreadFixture("thread-open-controllers", {
          authorLoginId: "admin",
          commitId: "controllers",
          participants: ["admin", "doortts"],
          path: "/app/controllers/BoardApp.java",
          state: "open",
          text: "Comment #2 : /app/controllers/BoardApp.java",
        }),
        reviewThreadFixture("thread-closed-nonparticipant", {
          authorLoginId: "laziel",
          commitId: "commit-300",
          participants: ["laziel"],
          path: "/docs/README.md",
          state: "closed",
          text: "Comment #3",
        }),
      ]),
      readProjectAuthorization: mockFn().mockResolvedValue(createAuthorizedProjectAuthorization()),
    };
    const readPullRequestReviewThreads = expectReadPullRequestReviewThreads();

    await expect(
      readPullRequestReviewThreads(
        authenticatedActor,
        {
          authorLoginId: "admin",
          filter: "controllers",
          ownerName: "yona",
          participantLoginId: "doortts",
          projectName: "project-yona",
          state: "open",
        },
        deps,
      ),
    ).resolves.toEqual([
      expect.objectContaining({
        authorLoginId: "admin",
        commitId: "controllers",
        participants: ["admin", "doortts"],
        path: "/app/controllers/BoardApp.java",
        state: "open",
        threadId: "thread-open-controllers",
      }),
    ]);

    await expect(
      readPullRequestReviewThreads(
        authenticatedActor,
        {
          filter: "111",
          ownerName: "yona",
          projectName: "project-yona",
          state: "open",
        },
        deps,
      ),
    ).resolves.toEqual([
      expect.objectContaining({
        text: "Comment #1 : 111",
        threadId: "thread-open-comment",
      }),
    ]);
  });

  it("forwards review-thread sort fields and derives count summaries for the authenticated user", async () => {
    const deps = {
      listPullRequestReviewThreadsByProject: mockFn().mockResolvedValue([
        reviewThreadFixture("thread-open-comment", {
          authorLoginId: "admin",
          commitId: "commit-111",
          participants: ["admin", "doortts"],
          path: "/app/controllers/IssueApp.java",
          replyCount: 2,
          state: "open",
          text: "Comment #1 : 111",
        }),
      ]),
      readProjectAuthorization: mockFn().mockResolvedValue(createAuthorizedProjectAuthorization()),
      readPullRequestReviewCountsByProject: mockFn().mockResolvedValue({
        all: 2,
        closed: 0,
        createdByYou: 1,
        involvingYou: 2,
        open: 1,
      }),
    };
    const readPullRequestReviewThreads = expectReadPullRequestReviewThreads();

    await expect(
      readPullRequestReviewThreads(
        authenticatedActor,
        {
          filter: "111",
          orderBy: "createdDate",
          orderDir: "asc",
          ownerName: "yona",
          projectName: "project-yona",
          state: "open",
        },
        deps,
      ),
    ).resolves.toEqual([
      expect.objectContaining({
        replyCount: 2,
        text: "Comment #1 : 111",
        threadId: "thread-open-comment",
      }),
    ]);

    expect(deps.listPullRequestReviewThreadsByProject).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: "111",
        orderBy: "createdDate",
        orderDir: "asc",
        projectId: 11,
        projectName: "project-yona",
        state: "open",
      }),
    );

    await expect(
      readPullRequestReviewCounts(
        authenticatedActor,
        {
          authorLoginId: "admin",
          filter: "111",
          ownerName: "yona",
          projectName: "project-yona",
          state: "open",
        },
        deps,
      ),
    ).resolves.toEqual({
      all: 2,
      closed: 0,
      createdByYou: 1,
      involvingYou: 2,
      open: 1,
    });

    expect(deps.readPullRequestReviewCountsByProject).toHaveBeenCalledWith(
      expect.objectContaining({
        authorLoginId: "admin",
        currentLoginId: "doortts",
        filter: "111",
        projectId: 11,
        state: "open",
      }),
    );
  });

  it("resolves pullRequestId before reading scoped review counts", async () => {
    const deps = {
      readProjectAuthorization: mockFn().mockResolvedValue(createAuthorizedProjectAuthorization()),
      readPullRequestRecordByProjectAndNumber:
        mockFn().mockResolvedValue(createPullRequestRecord({ id: 41 })),
      readPullRequestReviewCountsByProject: mockFn().mockResolvedValue({
        all: 1,
        closed: 0,
        createdByYou: 0,
        involvingYou: 1,
        open: 1,
      }),
    };

    await expect(
      readPullRequestReviewCounts(
        authenticatedActor,
        {
          ownerName: "yona",
          projectName: "project-yona",
          pullRequestNumber: 5,
          state: "open",
        },
        deps as never,
      ),
    ).resolves.toEqual({
      all: 1,
      closed: 0,
      createdByYou: 0,
      involvingYou: 1,
      open: 1,
    });

    expect(deps.readPullRequestRecordByProjectAndNumber).toHaveBeenCalledWith(11, 5);
    expect(deps.readPullRequestReviewCountsByProject).toHaveBeenCalledWith(
      expect.objectContaining({
        currentLoginId: "doortts",
        projectId: 11,
        pullRequestId: 41,
        state: "open",
      }),
    );
  });

  it("rejects review counts for anonymous actors before reading authorization", async () => {
    const deps = {
      readProjectAuthorization: mockFn(),
      readPullRequestReviewCountsByProject: mockFn(),
    };
    const readReviewCounts = expectReadPullRequestReviewCounts();

    await expect(
      readReviewCounts(
        {
          actorId: null,
          isAnonymous: true,
          isSiteAdmin: false,
          loginId: null,
        },
        {
          ownerName: "yona",
          projectName: "project-yona",
          state: "open",
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(DomainPermissionError);

    expect(deps.readProjectAuthorization).not.toHaveBeenCalled();
    expect(deps.readPullRequestReviewCountsByProject).not.toHaveBeenCalled();
  });

  it("creates PR-bound review comments for project members and separates them from 13.6 commit discussions", async () => {
    const deps = {
      createPullRequestReviewComment: mockFn().mockResolvedValue(
        reviewThreadFixture("41", {
          commitId: "abc123",
          threadId: "41",
        }),
      ),
      readProjectAuthorization: mockFn().mockResolvedValue(createAuthorizedProjectAuthorization()),
      readPullRequestRecordByProjectAndNumber:
        mockFn().mockResolvedValue(createPullRequestRecord()),
    };

    await expect(
      createPullRequestReviewComment(
        authenticatedActor,
        {
          commitId: "abc123",
          contents: "Please rename this method.",
          ownerName: "yona",
          projectName: "project-yona",
          pullRequestNumber: 5,
        },
        deps as never,
      ),
    ).resolves.toMatchObject({
      commitId: "abc123",
      threadId: "41",
    });

    expect(deps.createPullRequestReviewComment).toHaveBeenCalledWith(
      expect.objectContaining({
        authorId: 7,
        authorLoginId: "doortts",
        contents: "Please rename this method.",
        projectId: 11,
        pullRequestId: 41,
      }),
      "project-yona",
    );
  });

  it("deletes the last PR review comment and reports thread cleanup", async () => {
    const deps = {
      deletePullRequestReviewComment: mockFn().mockResolvedValue({
        deletedCommentId: 77,
        threadDeleted: true,
        threadId: 41,
      }),
      readProjectAuthorization: mockFn().mockResolvedValue(createReadOnlyProjectAuthorization()),
      readPullRequestRecordByProjectAndNumber:
        mockFn().mockResolvedValue(createPullRequestRecord()),
      readPullRequestReviewComment: mockFn().mockResolvedValue({
        authorId: 7,
        commentId: 77,
        projectId: 11,
        pullRequestId: 41,
        threadAuthorId: 99,
        threadId: 41,
      }),
    };

    await expect(
      deletePullRequestReviewComment(
        authenticatedActor,
        {
          commentId: 77,
          ownerName: "yona",
          projectName: "project-yona",
          pullRequestNumber: 5,
        },
        deps as never,
      ),
    ).resolves.toEqual({
      deletedCommentId: 77,
      threadDeleted: true,
      threadId: 41,
    });
  });

  it("allows PR thread authors to close their own review threads", async () => {
    const deps = {
      readProjectAuthorization: mockFn().mockResolvedValue(createReadOnlyProjectAuthorization()),
      readPullRequestRecordByProjectAndNumber:
        mockFn().mockResolvedValue(createPullRequestRecord()),
      readPullRequestReviewThread: mockFn().mockResolvedValue({
        authorId: 7,
        projectId: 11,
        pullRequestId: 41,
        state: "open",
        threadId: 41,
      }),
      updatePullRequestReviewThreadState: mockFn().mockResolvedValue(
        reviewThreadFixture("41", { state: "closed" }),
      ),
    };

    await expect(
      updatePullRequestReviewThreadState(
        authenticatedActor,
        {
          ownerName: "yona",
          projectName: "project-yona",
          pullRequestNumber: 5,
          state: "closed",
          threadId: 41,
        },
        deps as never,
      ),
    ).resolves.toMatchObject({
      state: "closed",
      threadId: "41",
    });
  });

  it("previews merge conflicts without mutating PR state and rejects unsupported cross-project PRs", async () => {
    const baseDeps = {
      getRefOid: mockFn().mockResolvedValue("oid-1"),
      getRepositoryRoot: mockFn().mockReturnValue("/repo-root"),
      previewPullRequestMerge: mockFn().mockResolvedValue({
        conflictedFiles: ["src/conflicted.ts"],
        mergeTreeOid: "a".repeat(40),
        mergeable: false,
        sourceHeadOid: "source-oid",
        targetHeadOid: "target-oid",
      }),
      readProjectAuthorization: mockFn().mockResolvedValue(createAuthorizedProjectAuthorization()),
      readPullRequestRecordByProjectAndNumber:
        mockFn().mockResolvedValue(createPullRequestRecord()),
      resolveRepositoryPath: mockFn().mockReturnValue("/repo-root/11"),
    };

    await expect(
      previewPullRequestMerge(
        authenticatedActor,
        {
          ownerName: "yona",
          projectName: "project-yona",
          pullRequestNumber: 5,
        },
        baseDeps as never,
      ),
    ).resolves.toEqual({
      blockedReason: "merge-conflict",
      conflictedFiles: ["src/conflicted.ts"],
      mergeable: false,
    });

    await expect(
      previewPullRequestMerge(
        authenticatedActor,
        {
          ownerName: "yona",
          projectName: "project-yona",
          pullRequestNumber: 5,
        },
        {
          ...baseDeps,
          readPullRequestRecordByProjectAndNumber: mockFn().mockResolvedValue(
            createPullRequestRecord({ fromProjectId: 99 }),
          ),
        } as never,
      ),
    ).rejects.toBeInstanceOf(DomainValidationError);
  });

  it("rejects merge when the lease cannot be acquired", async () => {
    const deps = {
      acquirePullRequestMergeLeaseByProjectAndNumber: mockFn().mockResolvedValue(false),
      readProjectAuthorization: mockFn().mockResolvedValue(createAuthorizedProjectAuthorization()),
      readPullRequestRecordByProjectAndNumber:
        mockFn().mockResolvedValue(createPullRequestRecord()),
    };

    await expect(
      mergePullRequest(
        authenticatedActor,
        {
          ownerName: "yona",
          projectName: "project-yona",
          pullRequestNumber: 5,
        },
        deps as never,
      ),
    ).rejects.toThrow("Pull request is already merging.");
  });

  it("releases the merge lease when branch checks fail before git merge", async () => {
    const releaseLease = mockFn().mockResolvedValue(undefined);
    const deps = {
      acquirePullRequestMergeLeaseByProjectAndNumber: mockFn().mockResolvedValue(true),
      getRefOid: mockFn().mockRejectedValue(new Error("missing ref")),
      getRepositoryRoot: mockFn().mockReturnValue("/repo-root"),
      readProjectAuthorization: mockFn().mockResolvedValue(createAuthorizedProjectAuthorization()),
      readPullRequestRecordByProjectAndNumber:
        mockFn().mockResolvedValue(createPullRequestRecord()),
      releasePullRequestMergeLeaseByProjectAndNumber: releaseLease,
      resolveRepositoryPath: mockFn().mockReturnValue("/repo-root/11"),
    };

    await expect(
      mergePullRequest(
        authenticatedActor,
        {
          ownerName: "yona",
          projectName: "project-yona",
          pullRequestNumber: 5,
        },
        deps as never,
      ),
    ).rejects.toBeInstanceOf(DomainValidationError);

    expect(releaseLease).toHaveBeenCalledWith({
      projectId: 11,
      pullRequestNumber: 5,
    });
  });

  it("releases the merge lease when git merge reports a conflict", async () => {
    const releaseLease = mockFn().mockResolvedValue(undefined);
    const deps = {
      acquirePullRequestMergeLeaseByProjectAndNumber: mockFn().mockResolvedValue(true),
      getRefOid: mockFn().mockResolvedValue("oid-1"),
      getRepositoryRoot: mockFn().mockReturnValue("/repo-root"),
      performPullRequestMerge: mockFn().mockResolvedValue({
        conflicted: true,
        conflictedFiles: ["src/conflicted.ts"],
        mergeCommitOid: null,
        requestId: "req-2",
        sourceHeadOid: "source-oid",
        targetHeadOid: "target-oid",
      }),
      readProjectAuthorization: mockFn().mockResolvedValue(createAuthorizedProjectAuthorization()),
      readPullRequestRecordByProjectAndNumber:
        mockFn().mockResolvedValue(createPullRequestRecord()),
      releasePullRequestMergeLeaseByProjectAndNumber: releaseLease,
      resolveRepositoryPath: mockFn().mockReturnValue("/repo-root/11"),
      updatePullRequestMergeStateByProjectAndNumber: mockFn(),
    };

    await expect(
      mergePullRequest(
        authenticatedActor,
        {
          ownerName: "yona",
          projectName: "project-yona",
          pullRequestNumber: 5,
        },
        deps as never,
      ),
    ).resolves.toEqual({
      conflicted: true,
      conflictedFiles: ["src/conflicted.ts"],
      merged: false,
      mergedPullRequestState: "open",
    });

    expect(releaseLease).toHaveBeenCalledWith({
      projectId: 11,
      pullRequestNumber: 5,
    });
    expect(deps.updatePullRequestMergeStateByProjectAndNumber).not.toHaveBeenCalled();
  });

  it("keeps merge authorization separate from project write auth and records git/db mismatch after a successful merge", async () => {
    const auditHook = mockFn().mockResolvedValue(undefined);
    const performMerge = mockFn().mockResolvedValue({
      conflicted: false,
      conflictedFiles: [],
      mergeCommitOid: "f".repeat(40),
      requestId: "req-1",
      sourceHeadOid: "source-oid",
      targetHeadOid: "target-oid",
    });

    await expect(
      mergePullRequest(
        authenticatedActor,
        {
          ownerName: "yona",
          projectName: "project-yona",
          pullRequestNumber: 5,
        },
        {
          acquirePullRequestMergeLeaseByProjectAndNumber: mockFn().mockResolvedValue(true),
          appendPullRequestMergeAuditLog: auditHook,
          getGitAuditLogPath: mockFn().mockReturnValue("/audit/git.jsonl"),
          getRefOid: mockFn().mockResolvedValue("oid-1"),
          getRepositoryRoot: mockFn().mockReturnValue("/repo-root"),
          performPullRequestMerge: performMerge,
          readProjectAuthorization: mockFn().mockResolvedValue(
            createAuthorizedProjectAuthorization(),
          ),
          readPullRequestRecordByProjectAndNumber:
            mockFn().mockResolvedValue(createPullRequestRecord()),
          releasePullRequestMergeLeaseByProjectAndNumber: mockFn(),
          resolveRepositoryPath: mockFn().mockReturnValue("/repo-root/11"),
          updatePullRequestMergeStateByProjectAndNumber: mockFn().mockRejectedValue(
            new Error("db mismatch"),
          ),
        } as never,
      ),
    ).rejects.toThrow("db mismatch");

    expect(performMerge).toHaveBeenCalled();
    expect(auditHook).toHaveBeenCalledWith(
      "/audit/git.jsonl",
      expect.objectContaining({
        action: "pull-request-merge-db-mismatch",
        repositoryId: "11",
      }),
    );

    await expect(
      mergePullRequest(
        authenticatedActor,
        {
          ownerName: "yona",
          projectName: "project-yona",
          pullRequestNumber: 5,
        },
        {
          acquirePullRequestMergeLeaseByProjectAndNumber: mockFn(),
          getRefOid: mockFn(),
          getRepositoryRoot: mockFn(),
          performPullRequestMerge: mockFn(),
          readProjectAuthorization: mockFn().mockResolvedValue(
            createReadOnlyProjectAuthorization(),
          ),
          readPullRequestRecordByProjectAndNumber:
            mockFn().mockResolvedValue(createPullRequestRecord()),
          releasePullRequestMergeLeaseByProjectAndNumber: mockFn(),
          resolveRepositoryPath: mockFn(),
          updatePullRequestMergeStateByProjectAndNumber: mockFn(),
        } as never,
      ),
    ).rejects.toBeInstanceOf(DomainPermissionError);
  });
});
