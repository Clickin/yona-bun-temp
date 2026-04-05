import { beforeEach, describe, expect, it, vi } from "vitest";
import { DomainNotFoundError, DomainPermissionError, DomainValidationError } from "@yona/domain";

const {
  createPullRequestMock,
  createPullRequestReviewCommentMock,
  deletePullRequestReviewCommentMock,
  listPullRequestReviewCountsMock,
  listPullRequestReviewThreadsMock,
  listPullRequestsMock,
  mergePullRequestMock,
  previewPullRequestMergeMock,
  readCurrentSessionMock,
  readPullRequestDetailMock,
  updatePullRequestReviewThreadStateMock,
  updatePullRequestStateMock,
} = vi.hoisted(() => ({
  createPullRequestMock: vi.fn(),
  createPullRequestReviewCommentMock: vi.fn(),
  deletePullRequestReviewCommentMock: vi.fn(),
  listPullRequestReviewCountsMock: vi.fn(),
  listPullRequestReviewThreadsMock: vi.fn(),
  listPullRequestsMock: vi.fn(),
  mergePullRequestMock: vi.fn(),
  previewPullRequestMergeMock: vi.fn(),
  readCurrentSessionMock: vi.fn(),
  readPullRequestDetailMock: vi.fn(),
  updatePullRequestReviewThreadStateMock: vi.fn(),
  updatePullRequestStateMock: vi.fn(),
}));

vi.mock("@yona/domain", async () => {
  const actual = await vi.importActual<typeof import("@yona/domain")>("@yona/domain");
  return {
    ...actual,
    createPullRequest: createPullRequestMock,
    createPullRequestReviewComment: createPullRequestReviewCommentMock,
    deletePullRequestReviewComment: deletePullRequestReviewCommentMock,
    readPullRequestReviewCounts: listPullRequestReviewCountsMock,
    listPullRequestReviewThreads: listPullRequestReviewThreadsMock,
    listPullRequests: listPullRequestsMock,
    mergePullRequest: mergePullRequestMock,
    previewPullRequestMerge: previewPullRequestMergeMock,
    readPullRequestDetail: readPullRequestDetailMock,
    updatePullRequestReviewThreadState: updatePullRequestReviewThreadStateMock,
    updatePullRequestState: updatePullRequestStateMock,
  };
});

vi.mock("@yona/auth", async () => {
  const actual = await vi.importActual<typeof import("@yona/auth")>("@yona/auth");
  return {
    ...actual,
    readCurrentSession: readCurrentSessionMock,
  };
});

import { createPullRequestCaller } from "./pull-request-trpc";

function createContext(cookieValue?: string) {
  const cookies = new Map<string, string>();
  if (cookieValue) {
    cookies.set("yona-session", cookieValue);
  }

  return {
    deleteCookie: vi.fn(),
    getCookie: (name: string) => cookies.get(name),
    setResponseStatus: vi.fn(),
  };
}

function createAuthenticatedSession() {
  return {
    clearCookie: false,
    projection: {
      actorId: 2,
      emailAddress: "yobi@example.com",
      isAnonymous: false,
      isConfirmed: true,
      isSiteAdmin: false,
      loginId: "yobi",
      userLabel: "Yobi",
    },
    sessionRecord: {
      createdAt: new Date("2026-03-09T00:00:00.000Z"),
      expiresAt: new Date("2026-03-10T00:00:00.000Z"),
      id: "session-1",
      token: "session-token",
      userId: 2,
    },
    token: "session-token",
    user: {
      emailAddress: "yobi@example.com",
      id: 2,
      isConfirmed: true,
      isSiteAdmin: false,
      loginId: "yobi",
      name: "Yobi",
    },
  };
}

function createAnonymousSession() {
  return {
    clearCookie: false,
    projection: {
      actorId: null,
      emailAddress: null,
      isAnonymous: true,
      isConfirmed: false,
      isSiteAdmin: false,
      loginId: null,
      userLabel: null,
    },
    sessionRecord: null,
    token: null,
    user: null,
  };
}

function createPullRequestDetail(state: "closed" | "open") {
  return {
    body: "Body",
    contributorLoginId: "yobi",
    contributorName: "Yobi",
    createdAt: null,
    fromBranch: "feature/pr-baseline",
    ownerName: "yobi",
    projectName: "yona",
    pullRequestNumber: 1,
    reviewSummary: {
      closedThreadCount: 0,
      openThreadCount: 1,
      reviewerCount: 0,
    },
    state,
    title: "Hello",
    toBranch: "main",
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
        commentId: 71,
        contents: "Comment #1 : 111",
        createdAt: null,
      },
    ],
    commitId: "commit-111",
    createdAt: null,
    lastCommentAt: null,
    participants: ["admin", "laziel"],
    path: "/app/controllers/IssueApp.java",
    replyCount: 1,
    projectName: "yona",
    state: "open",
    text: "Comment #1 : 111",
    threadId,
    ...overrides,
  };
}

function expectListPullRequestReviewThreads(caller: ReturnType<typeof createPullRequestCaller>) {
  const reviewThreadCaller = (caller as Record<string, unknown>).listPullRequestReviewThreads;

  expect(reviewThreadCaller).toBeTypeOf("function");

  return reviewThreadCaller as (input: Record<string, unknown>) => Promise<unknown>;
}

function expectReadPullRequestReviewCounts(caller: ReturnType<typeof createPullRequestCaller>) {
  const countCaller = (caller as Record<string, unknown>).readPullRequestReviewCounts;

  expect(countCaller).toBeTypeOf("function");

  return countCaller as (input: Record<string, unknown>) => Promise<unknown>;
}

describe("pull request tRPC PR transition provenance: docs/provenance/phase-0b/pull-request-review.md", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readCurrentSessionMock.mockResolvedValue(createAuthenticatedSession());
  });

  it("lists, reads, creates, and updates pull requests", async () => {
    listPullRequestsMock.mockResolvedValue([
      {
        contributorLoginId: "yobi",
        contributorName: "Yobi",
        createdAt: null,
        fromBranch: "feature/pr-baseline",
        ownerName: "yobi",
        projectName: "yona",
        pullRequestNumber: 1,
        state: "open",
        title: "Hello",
        toBranch: "main",
      },
    ]);

    readPullRequestDetailMock.mockResolvedValue({
      body: "Body",
      contributorLoginId: "yobi",
      contributorName: "Yobi",
      createdAt: null,
      fromBranch: "feature/pr-baseline",
      ownerName: "yobi",
      projectName: "yona",
      pullRequestNumber: 1,
      reviewSummary: {
        closedThreadCount: 0,
        openThreadCount: 1,
        reviewerCount: 0,
      },
      state: "open",
      title: "Hello",
      toBranch: "main",
    });

    createPullRequestMock.mockResolvedValue({
      body: "Body",
      contributorLoginId: "yobi",
      contributorName: "Yobi",
      createdAt: null,
      fromBranch: "feature/pr-baseline",
      ownerName: "yobi",
      projectName: "yona",
      pullRequestNumber: 1,
      reviewSummary: {
        closedThreadCount: 0,
        openThreadCount: 1,
        reviewerCount: 0,
      },
      state: "open",
      title: "Hello",
      toBranch: "main",
    });

    updatePullRequestStateMock.mockResolvedValue({
      body: "Body",
      contributorLoginId: "yobi",
      contributorName: "Yobi",
      createdAt: null,
      fromBranch: "feature/pr-baseline",
      ownerName: "yobi",
      projectName: "yona",
      pullRequestNumber: 1,
      reviewSummary: {
        closedThreadCount: 0,
        openThreadCount: 1,
        reviewerCount: 0,
      },
      state: "closed",
      title: "Hello",
      toBranch: "main",
    });

    const caller = createPullRequestCaller(createContext("session-token"));

    await expect(
      caller.listPullRequests({ ownerName: "yobi", projectName: "yona" }),
    ).resolves.toHaveLength(1);
    await expect(
      caller.readPullRequestDetail({
        ownerName: "yobi",
        projectName: "yona",
        pullRequestNumber: 1,
      }),
    ).resolves.toMatchObject({ pullRequestNumber: 1 });
    await expect(
      caller.createPullRequest({
        body: "Body",
        fromBranch: "feature/pr-baseline",
        ownerName: "yobi",
        projectName: "yona",
        title: "Hello",
        toBranch: "main",
      }),
    ).resolves.toMatchObject({ pullRequestNumber: 1 });
    await expect(
      caller.updatePullRequestState({
        ownerName: "yobi",
        projectName: "yona",
        pullRequestNumber: 1,
        state: "closed",
      }),
    ).resolves.toMatchObject({ pullRequestNumber: 1 });
  });

  it("maps anonymous transition attempts to UNAUTHORIZED", async () => {
    readCurrentSessionMock.mockResolvedValue(createAnonymousSession());
    updatePullRequestStateMock.mockRejectedValueOnce(
      new DomainPermissionError("Authentication required.", {
        requiresAuthentication: true,
      }),
    );

    await expect(
      createPullRequestCaller(createContext()).updatePullRequestState({
        ownerName: "yobi",
        projectName: "yona",
        pullRequestNumber: 1,
        state: "closed",
      }),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("maps forbidden transition attempts to FORBIDDEN", async () => {
    updatePullRequestStateMock.mockRejectedValueOnce(
      new DomainPermissionError("Pull request transition is not allowed."),
    );

    await expect(
      createPullRequestCaller(createContext("session-token")).updatePullRequestState({
        ownerName: "yobi",
        projectName: "yona",
        pullRequestNumber: 1,
        state: "closed",
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("maps missing pull requests to NOT_FOUND", async () => {
    updatePullRequestStateMock.mockRejectedValueOnce(
      new DomainNotFoundError("Pull request not found."),
    );

    await expect(
      createPullRequestCaller(createContext("session-token")).updatePullRequestState({
        ownerName: "yobi",
        projectName: "yona",
        pullRequestNumber: 404,
        state: "closed",
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("maps already-open reopen attempts to BAD_REQUEST", async () => {
    updatePullRequestStateMock.mockRejectedValueOnce(
      new DomainValidationError("Pull request is already open."),
    );

    await expect(
      createPullRequestCaller(createContext("session-token")).updatePullRequestState({
        ownerName: "yobi",
        projectName: "yona",
        pullRequestNumber: 1,
        state: "open",
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("returns closed and reopened pull requests for authorized actors", async () => {
    updatePullRequestStateMock
      .mockResolvedValueOnce(createPullRequestDetail("closed"))
      .mockResolvedValueOnce(createPullRequestDetail("open"));

    const caller = createPullRequestCaller(createContext("session-token"));

    await expect(
      caller.updatePullRequestState({
        ownerName: "yobi",
        projectName: "yona",
        pullRequestNumber: 1,
        state: "closed",
      }),
    ).resolves.toMatchObject({
      pullRequestNumber: 1,
      state: "closed",
    });

    await expect(
      caller.updatePullRequestState({
        ownerName: "yobi",
        projectName: "yona",
        pullRequestNumber: 1,
        state: "open",
      }),
    ).resolves.toMatchObject({
      pullRequestNumber: 1,
      state: "open",
    });
  });

  it("maps 13.7 PR review-thread read access denial to UNAUTHORIZED and keeps 13.6 repository discussion out of this router", async () => {
    readCurrentSessionMock.mockResolvedValue(createAnonymousSession());
    listPullRequestReviewThreadsMock.mockRejectedValueOnce(
      new DomainPermissionError("Project read is not allowed.", {
        requiresAuthentication: true,
      }),
    );
    const listPullRequestReviewThreads = expectListPullRequestReviewThreads(
      createPullRequestCaller(createContext()),
    );

    await expect(
      listPullRequestReviewThreads({
        ownerName: "yobi",
        projectName: "yona",
        state: "open",
      }),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("forwards 13.7 PR review-thread read filters for legacy state, text, commit/path, author, and participant matching", async () => {
    listPullRequestReviewThreadsMock.mockResolvedValueOnce([
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
    ]);
    const listPullRequestReviewThreads = expectListPullRequestReviewThreads(
      createPullRequestCaller(createContext("session-token")),
    );

    await expect(
      listPullRequestReviewThreads({
        authorLoginId: "admin",
        filter: "controllers",
        ownerName: "yobi",
        participantLoginId: "doortts",
        projectName: "yona",
        state: "open",
      }),
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

    expect(listPullRequestReviewThreadsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 2,
        isAnonymous: false,
        isSiteAdmin: false,
        loginId: "yobi",
      }),
      {
        authorLoginId: "admin",
        filter: "controllers",
        ownerName: "yobi",
        participantLoginId: "doortts",
        projectName: "yona",
        state: "open",
      },
    );
  });

  it("forwards review-thread sort fields and exposes review count summaries", async () => {
    listPullRequestReviewThreadsMock.mockResolvedValueOnce([
      reviewThreadFixture("thread-open-comment", {
        participants: ["admin", "yobi"],
        replyCount: 2,
      }),
    ]);
    listPullRequestReviewCountsMock.mockResolvedValueOnce({
      all: 4,
      closed: 1,
      createdByYou: 2,
      involvingYou: 3,
      open: 3,
    });
    const caller = createPullRequestCaller(createContext("session-token"));
    const listReviewThreads = expectListPullRequestReviewThreads(caller);
    const readReviewCounts = expectReadPullRequestReviewCounts(caller);

    await expect(
      listReviewThreads({
        filter: "controllers",
        orderBy: "createdDate",
        orderDir: "asc",
        ownerName: "yobi",
        projectName: "yona",
        state: "open",
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        replyCount: 2,
        threadId: "thread-open-comment",
      }),
    ]);

    expect(listPullRequestReviewThreadsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 2,
        loginId: "yobi",
      }),
      {
        filter: "controllers",
        orderBy: "createdDate",
        orderDir: "asc",
        ownerName: "yobi",
        projectName: "yona",
        state: "open",
      },
    );

    await expect(
      readReviewCounts({
        authorLoginId: "admin",
        filter: "controllers",
        ownerName: "yobi",
        projectName: "yona",
        state: "open",
      }),
    ).resolves.toEqual({
      all: 4,
      closed: 1,
      createdByYou: 2,
      involvingYou: 3,
      open: 3,
    });

    expect(listPullRequestReviewCountsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 2,
        loginId: "yobi",
      }),
      {
        authorLoginId: "admin",
        filter: "controllers",
        ownerName: "yobi",
        projectName: "yona",
        state: "open",
      },
    );
  });

  it("forwards pullRequestNumber to scoped review count reads", async () => {
    listPullRequestReviewCountsMock.mockResolvedValueOnce({
      all: 1,
      closed: 0,
      createdByYou: 0,
      involvingYou: 1,
      open: 1,
    });
    const caller = createPullRequestCaller(createContext("session-token"));
    const readReviewCounts = expectReadPullRequestReviewCounts(caller);

    await expect(
      readReviewCounts({
        ownerName: "yobi",
        projectName: "yona",
        pullRequestNumber: 1,
        state: "open",
      }),
    ).resolves.toEqual({
      all: 1,
      closed: 0,
      createdByYou: 0,
      involvingYou: 1,
      open: 1,
    });

    expect(listPullRequestReviewCountsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 2,
        loginId: "yobi",
      }),
      expect.objectContaining({
        ownerName: "yobi",
        projectName: "yona",
        pullRequestNumber: 1,
        state: "open",
      }),
    );
  });

  it("creates and mutates PR-bound review threads through dedicated procedures", async () => {
    createPullRequestReviewCommentMock.mockResolvedValueOnce(
      reviewThreadFixture("thread-pr-review", {
        commitId: "abc123",
        threadId: "thread-pr-review",
      }),
    );
    updatePullRequestReviewThreadStateMock.mockResolvedValueOnce(
      reviewThreadFixture("thread-pr-review", {
        state: "closed",
        threadId: "thread-pr-review",
      }),
    );
    deletePullRequestReviewCommentMock.mockResolvedValueOnce({
      deletedCommentId: 71,
      threadDeleted: false,
      threadId: 12,
    });

    const caller = createPullRequestCaller(createContext("session-token")) as unknown as Record<
      string,
      (input: Record<string, unknown>) => Promise<unknown>
    >;

    await expect(
      caller.createPullRequestReviewComment({
        commitId: "abc123",
        contents: "Please rename this method.",
        ownerName: "yobi",
        projectName: "yona",
        pullRequestNumber: 1,
      }),
    ).resolves.toMatchObject({
      commitId: "abc123",
      threadId: "thread-pr-review",
    });

    await expect(
      caller.updatePullRequestReviewThreadState({
        ownerName: "yobi",
        projectName: "yona",
        pullRequestNumber: 1,
        state: "closed",
        threadId: 12,
      }),
    ).resolves.toMatchObject({
      state: "closed",
      threadId: "thread-pr-review",
    });

    await expect(
      caller.deletePullRequestReviewComment({
        commentId: 71,
        ownerName: "yobi",
        projectName: "yona",
        pullRequestNumber: 1,
      }),
    ).resolves.toEqual({
      deletedCommentId: 71,
      threadDeleted: false,
      threadId: 12,
    });
  });

  it("previews and executes pull-request merges through dedicated procedures", async () => {
    previewPullRequestMergeMock.mockResolvedValueOnce({
      blockedReason: null,
      conflictedFiles: [],
      mergeable: true,
    });
    mergePullRequestMock.mockResolvedValueOnce({
      conflicted: false,
      conflictedFiles: [],
      merged: true,
      mergedPullRequestState: "merged",
    });

    const caller = createPullRequestCaller(createContext("session-token")) as unknown as Record<
      string,
      (input: Record<string, unknown>) => Promise<unknown>
    >;

    await expect(
      caller.previewPullRequestMerge({
        ownerName: "yobi",
        projectName: "yona",
        pullRequestNumber: 1,
      }),
    ).resolves.toEqual({
      blockedReason: null,
      conflictedFiles: [],
      mergeable: true,
    });

    await expect(
      caller.mergePullRequest({
        ownerName: "yobi",
        projectName: "yona",
        pullRequestNumber: 1,
      }),
    ).resolves.toEqual({
      conflicted: false,
      conflictedFiles: [],
      merged: true,
      mergedPullRequestState: "merged",
    });
  });

  it("maps already-merging merge attempts to BAD_REQUEST", async () => {
    mergePullRequestMock.mockRejectedValueOnce(
      new DomainValidationError("Pull request is already merging."),
    );

    await expect(
      createPullRequestCaller(createContext("session-token")).mergePullRequest({
        ownerName: "yobi",
        projectName: "yona",
        pullRequestNumber: 1,
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("returns conflicted merge results without throwing", async () => {
    mergePullRequestMock.mockResolvedValueOnce({
      conflicted: true,
      conflictedFiles: ["src/conflicted.ts"],
      merged: false,
      mergedPullRequestState: "open",
    });

    await expect(
      createPullRequestCaller(createContext("session-token")).mergePullRequest({
        ownerName: "yobi",
        projectName: "yona",
        pullRequestNumber: 1,
      }),
    ).resolves.toEqual({
      conflicted: true,
      conflictedFiles: ["src/conflicted.ts"],
      merged: false,
      mergedPullRequestState: "open",
    });
  });

  it("surfaces merge db mismatch failures as INTERNAL_SERVER_ERROR", async () => {
    mergePullRequestMock.mockRejectedValueOnce(new Error("db mismatch"));

    await expect(
      createPullRequestCaller(createContext("session-token")).mergePullRequest({
        ownerName: "yobi",
        projectName: "yona",
        pullRequestNumber: 1,
      }),
    ).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
  });
});
